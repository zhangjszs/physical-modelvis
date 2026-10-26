/**
 * 互感现象 rig — 原/副两个线圈 + I₁(t)/E₂(t) 读数 (#159 F-A3 / #161)
 *
 * 单一真源：原边电流 I₁(t) 读 charts.primary_current_vs_time(s/A)，
 * 副边电动势 E₂(t) 读 charts.secondary_emf_vs_time(s/V)，按引擎周期 T 取模插值；
 * M / E₂ 幅值读 maxValues。替代误用 ampereForceRig。
 */
import * as THREE from 'three';
import { chartsOf, type SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeLine, makeTextSprite } from '../primitives';
import { interpSeries } from '../../../rendering/renderingUtils';
import { num, setLabel, STAGE_CENTER_X } from './params';

const CENTER_Y = 1.5;
const PRIMARY_X = STAGE_CENTER_X - 1.0;
const SECONDARY_X = STAGE_CENTER_X + 1.0;

export interface MutualInductanceHandles {
    group: THREE.Group;
    primaryRings: THREE.Line[];
    secondaryRings: THREE.Line[];
    secondaryGlow: THREE.Mesh;
    label: THREE.Sprite;
    infoLabel: THREE.Sprite;
    period: number;
}

function makeRings(centerX: number, radius: number, count: number, color: number): THREE.Line[] {
    const out: THREE.Line[] = [];
    for (let i = 0; i < count; i++) {
        const seg = 36;
        const pts: THREE.Vector3[] = [];
        for (let k = 0; k <= seg; k++) {
            const a = (k / seg) * Math.PI * 2;
            pts.push(new THREE.Vector3(0, Math.cos(a) * radius, Math.sin(a) * radius));
        }
        const ring = makeLine(pts, color, 0.9);
        ring.position.set(centerX + (i - (count - 1) / 2) * 0.14, CENTER_Y, 0);
        out.push(ring);
    }
    return out;
}

export function mutualInductanceReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    timeS: number
): { i1A: number; e2V: number; mH: number; e2AmpV: number; periodS: number } {
    const c = result ? chartsOf(result, 'mutual-inductance') : undefined;
    const mv = result?.diagnostics?.maxValues ?? {};
    const periodS = num(mv['T_period_s'], 1 / Math.max(num(params['frequency'], 50), 1e-9));
    const phase = periodS > 0 ? ((timeS % periodS) + periodS) % periodS : 0;
    return {
        i1A: interpSeries(c?.primary_current_vs_time, phase),
        e2V: interpSeries(c?.secondary_emf_vs_time, phase),
        mH: num(mv['M_H'], NaN),
        e2AmpV: num(mv['E2_amplitude_V'], NaN),
        periodS
    };
}

export const mutualInductanceRig: SceneRig = {
    worldScale: 1,
    clampToGround: false,
    ownParticles: true,

    framing(): SceneFraming {
        const target: [number, number, number] = [STAGE_CENTER_X, CENTER_Y, 0];
        const distance = 8.0;
        return {
            target,
            position: [target[0] + distance * 0.1, target[1] + distance * 0.2, distance * 0.95],
            distance
        };
    },

    buildEquipment(_scene, params, result) {
        const group = new THREE.Group();
        const primaryRings = makeRings(PRIMARY_X, 0.4, 6, 0xb87333);
        const secondaryRings = makeRings(SECONDARY_X, 0.5, 7, 0x94a3b8);
        for (const r of primaryRings) group.add(r);
        for (const r of secondaryRings) group.add(r);

        const secondaryGlow = new THREE.Mesh(
            new THREE.CylinderGeometry(0.46, 0.46, 0.94, 24, 1, true),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.06, side: THREE.DoubleSide })
        );
        secondaryGlow.rotation.z = Math.PI / 2;
        secondaryGlow.position.set(SECONDARY_X, CENTER_Y, 0);
        group.add(secondaryGlow);

        const label = makeTextSprite('', '#b45309', 24, { x: 3.6, y: 0.44 });
        label.position.set(STAGE_CENTER_X, CENTER_Y + 1.0, 0.2);
        group.add(label);
        const infoLabel = makeTextSprite('', '#1e293b', 22, { x: 3.8, y: 0.4 });
        infoLabel.position.set(STAGE_CENTER_X, CENTER_Y + 1.55, 0.2);
        group.add(infoLabel);

        const handles: MutualInductanceHandles = {
            group,
            primaryRings,
            secondaryRings,
            secondaryGlow,
            label,
            infoLabel,
            period: 0.02
        };
        applyReadouts(handles, params, result, 0);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        applyReadouts(handles as MutualInductanceHandles, params, result, 0);
    },

    onAnimate(handles, ctx) {
        applyReadouts(handles as MutualInductanceHandles, ctx.params, ctx.result, ctx.time);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(STAGE_CENTER_X + pos.x, CENTER_Y + pos.y, 0);
    },

    getOrigin() {
        return new THREE.Vector3(PRIMARY_X, CENTER_Y, 0);
    }
};

function applyReadouts(
    h: MutualInductanceHandles,
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    timeS: number
): void {
    const r = mutualInductanceReadouts(params, result, timeS);
    h.period = r.periodS;
    setLabel(h.label, `原边 I₁ = ${r.i1A.toFixed(3)} A   |   副边 E₂ = ${r.e2V.toFixed(2)} V`, '#b45309');
    const mText = Number.isFinite(r.mH) ? `M = ${(r.mH * 1000).toFixed(1)} mH` : 'M —';
    const ampText = Number.isFinite(r.e2AmpV) ? `E₂幅值 = ${r.e2AmpV.toFixed(2)} V` : '';
    setLabel(
        h.infoLabel,
        `${mText} | ${ampText} | T = ${(r.periodS * 1000).toFixed(0)} ms | 读数源自引擎 charts`,
        '#1e293b'
    );
    const mat = h.secondaryGlow.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.05 + Math.min(Math.abs(r.e2V) / 14, 1) * 0.22;
}

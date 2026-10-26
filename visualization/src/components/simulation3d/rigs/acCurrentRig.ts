/**
 * 交变电流与变压器 rig — 磁中旋转线圈 + 变压器 + e(t)/u₂(t) 读数 (#159 F-A3 / #161)
 *
 * 单一真源：原边电动势 e(t) 读 charts.x_t(ms/V)，副边电压 u₂(t) 读 charts.y_t(ms/V)，
 * 按引擎周期 T 取模插值；峰值 / 匝比读 maxValues。替代误用 circuitRig（直流欧姆定律）。
 */
import * as THREE from 'three';
import { chartsOf, type SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeBox, makeLine, makeTextSprite } from '../primitives';
import { interpSeries } from '../../../rendering/renderingUtils';
import { num, setLabel, STAGE_CENTER_X } from './params';

const CENTER_Y = 1.6;

export interface AcCurrentHandles {
    group: THREE.Group;
    coil: THREE.Group;
    core: THREE.Mesh;
    label: THREE.Sprite;
    infoLabel: THREE.Sprite;
    period: number;
    lastTime: number;
}

export function acCurrentReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    timeS: number
): { eV: number; u2V: number; peakEmf: number; secondaryPeak: number; turnsRatio: number; periodS: number } {
    const c = result ? chartsOf(result, 'ac-current') : undefined;
    const mv = result?.diagnostics?.maxValues ?? {};
    const periodS = num(mv['period'], 1 / Math.max(num(params['freq'], 50), 1e-9));
    const phaseMs = periodS > 0 ? (((timeS % periodS) + periodS) % periodS) * 1000 : 0;
    return {
        eV: interpSeries(c?.x_t, phaseMs),
        u2V: interpSeries(c?.y_t, phaseMs),
        peakEmf: num(mv['peakEmf'], num(params['Em'], 311)),
        secondaryPeak: num(mv['secondaryPeak'], NaN),
        turnsRatio: num(mv['turnsRatio'], num(params['nRatio'], 0.1)),
        periodS
    };
}

export const acCurrentRig: SceneRig = {
    worldScale: 1,
    clampToGround: false,
    ownParticles: true,

    framing(): SceneFraming {
        const target: [number, number, number] = [STAGE_CENTER_X, CENTER_Y, 0];
        const distance = 8.4;
        return {
            target,
            position: [target[0] + distance * 0.1, target[1] + distance * 0.22, distance * 0.95],
            distance
        };
    },

    buildEquipment(_scene, params, result) {
        const group = new THREE.Group();

        // 磁极 (左右)
        const poleL = makeBox(0.4, 1.0, 0.8, 0xef4444, 0.4, 0.2);
        poleL.position.set(STAGE_CENTER_X - 1.2, CENTER_Y + 0.5, 0);
        const poleR = makeBox(0.4, 1.0, 0.8, 0x3b82f6, 0.4, 0.2);
        poleR.position.set(STAGE_CENTER_X + 1.2, CENTER_Y + 0.5, 0);
        group.add(poleL, poleR);

        // 旋转线圈 (矩形框)
        const coil = new THREE.Group();
        const w = 1.1;
        const h = 0.7;
        const corners = [
            new THREE.Vector3(-w / 2, -h / 2, 0),
            new THREE.Vector3(w / 2, -h / 2, 0),
            new THREE.Vector3(w / 2, h / 2, 0),
            new THREE.Vector3(-w / 2, h / 2, 0),
            new THREE.Vector3(-w / 2, -h / 2, 0)
        ];
        coil.add(makeLine(corners, 0xb87333, 0.95));
        coil.position.set(STAGE_CENTER_X, CENTER_Y + 0.5, 0);
        group.add(coil);

        // 变压器铁芯 (右后方)
        const core = makeBox(0.6, 0.5, 0.4, 0x64748b, 0.5, 0.6);
        core.position.set(STAGE_CENTER_X + 2.1, CENTER_Y + 0.1, 0);
        group.add(core);

        const label = makeTextSprite('', '#b45309', 24, { x: 3.6, y: 0.44 });
        label.position.set(STAGE_CENTER_X, CENTER_Y + 1.35, 0.2);
        group.add(label);
        const infoLabel = makeTextSprite('', '#1e293b', 22, { x: 3.8, y: 0.4 });
        infoLabel.position.set(STAGE_CENTER_X, CENTER_Y + 1.9, 0.2);
        group.add(infoLabel);

        const handles: AcCurrentHandles = { group, coil, core, label, infoLabel, period: 0.02, lastTime: 0 };
        applyReadouts(handles, params, result, 0);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        applyReadouts(handles as AcCurrentHandles, params, result, 0);
    },

    onAnimate(handles, ctx) {
        const h = handles as AcCurrentHandles;
        h.lastTime = ctx.time;
        const r = acCurrentReadouts(ctx.params, ctx.result, ctx.time);
        // 线圈以引擎周期匀速旋转 (ω = 2π/T)
        h.coil.rotation.x = ((ctx.time % r.periodS) / Math.max(r.periodS, 1e-9)) * Math.PI * 2;
        applyReadouts(h, ctx.params, ctx.result, ctx.time);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(STAGE_CENTER_X + pos.x, CENTER_Y + 0.5 + pos.y, 0);
    },

    getOrigin() {
        return new THREE.Vector3(STAGE_CENTER_X, CENTER_Y + 0.5, 0);
    }
};

function applyReadouts(
    h: AcCurrentHandles,
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    timeS: number
): void {
    const r = acCurrentReadouts(params, result, timeS);
    h.period = r.periodS;
    setLabel(h.label, `原边 e = ${r.eV.toFixed(1)} V   |   副边 u₂ = ${r.u2V.toFixed(2)} V`, '#b45309');
    const ampText = Number.isFinite(r.secondaryPeak) ? `U₂峰值 = ${r.secondaryPeak.toFixed(2)} V` : '';
    setLabel(
        h.infoLabel,
        `Eₘ = ${r.peakEmf.toFixed(0)} V | 匝比 n₁:n₂ = ${(1 / Math.max(r.turnsRatio, 1e-9)).toFixed(0)}:1 | ${ampText} | f ≈ ${(1 / r.periodS).toFixed(0)} Hz | 读数源自引擎`,
        '#1e293b'
    );
}

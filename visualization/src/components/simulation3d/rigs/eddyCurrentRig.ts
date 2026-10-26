/**
 * 涡流现象 rig — 金属板 + 磁极 + 涡流环 + P/δ 读数 (#159 F-A3 / #161)
 *
 * 单一真源：涡流功率 P 读 maxValues.eddyPower_W，趋肤深度 δ 读 maxValues.skinDepth_mm，
 * B/f 读 maxValues；温升读引擎轨迹 trajectories[0] 的 position.y (见 M3 批次 4)。
 * 替代误用 ampereForceRig。
 */
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeBox, makeLine, makeTextSprite } from '../primitives';
import { num, setLabel, STAGE_CENTER_X } from './params';

const CENTER_Y = 1.5;

export interface EddyCurrentHandles {
    group: THREE.Group;
    plate: THREE.Mesh;
    eddyRings: THREE.Line[];
    label: THREE.Sprite;
    infoLabel: THREE.Sprite;
    tempBase: number;
}

function makeEddyRing(radius: number): THREE.Line {
    const seg = 40;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    return makeLine(pts, 0x38bdf8, 0.6);
}

export function eddyCurrentReadouts(
    result: SimulationResult | null | undefined,
    timeS: number
): { powerW: number; skinDepthMm: number; frequencyHz: number; fieldT: number; tempC: number } {
    const mv = result?.diagnostics?.maxValues ?? {};
    // 温升轨迹：取最近时刻点的 position.y
    const traj = result?.trajectories?.[0];
    let tempC = 0;
    if (traj && traj.length > 1) {
        let best = traj[0]!;
        for (const p of traj) {
            if (Math.abs(p.t - timeS) < Math.abs(best.t - timeS)) best = p;
        }
        tempC = best.position.y;
    }
    return {
        powerW: num(mv['eddyPower_W'], NaN),
        skinDepthMm: num(mv['skinDepth_mm'], NaN),
        frequencyHz: num(mv['frequency_Hz'], NaN),
        fieldT: num(mv['magneticField_T'], NaN),
        tempC
    };
}

export const eddyCurrentRig: SceneRig = {
    worldScale: 1,
    clampToGround: false,
    ownParticles: true,

    framing(): SceneFraming {
        const target: [number, number, number] = [STAGE_CENTER_X, CENTER_Y, 0];
        const distance = 7.6;
        return {
            target,
            position: [target[0] + distance * 0.12, target[1] + distance * 0.24, distance * 0.94],
            distance
        };
    },

    buildEquipment(_scene, _params, result) {
        const group = new THREE.Group();

        // 金属板 (受涡流加热)
        const plate = makeBox(2.0, 0.08, 1.0, 0xb0b8c4, 0.35, 0.5);
        plate.position.set(STAGE_CENTER_X, CENTER_Y, 0);
        group.add(plate);

        // 上下磁极 (N/S)
        const north = makeBox(0.5, 0.22, 0.5, 0xef4444, 0.4, 0.2);
        north.position.set(STAGE_CENTER_X, CENTER_Y + 0.62, 0);
        const south = makeBox(0.5, 0.22, 0.5, 0x3b82f6, 0.4, 0.2);
        south.position.set(STAGE_CENTER_X, CENTER_Y - 0.62, 0);
        group.add(north, south);

        // 涡流环 (板面内的同心环，示意涡旋电流)
        const eddyRings: THREE.Line[] = [];
        for (const rad of [0.24, 0.42, 0.6, 0.78]) {
            const ring = makeEddyRing(rad);
            ring.position.set(STAGE_CENTER_X, CENTER_Y, 0.06);
            group.add(ring);
            eddyRings.push(ring);
        }

        const label = makeTextSprite('', '#b91c1c', 24, { x: 3.6, y: 0.44 });
        label.position.set(STAGE_CENTER_X, CENTER_Y + 1.15, 0.2);
        group.add(label);
        const infoLabel = makeTextSprite('', '#1e293b', 22, { x: 3.8, y: 0.4 });
        infoLabel.position.set(STAGE_CENTER_X, CENTER_Y + 1.7, 0.2);
        group.add(infoLabel);

        const handles: EddyCurrentHandles = { group, plate, eddyRings, label, infoLabel, tempBase: 25 };
        applyReadouts(handles, result, 0);
        return { group, handles };
    },

    updateEquipment(handles, _params, result) {
        applyReadouts(handles as EddyCurrentHandles, result, 0);
    },

    onAnimate(handles, ctx) {
        applyReadouts(handles as EddyCurrentHandles, ctx.result, ctx.time);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(STAGE_CENTER_X + pos.x, CENTER_Y + pos.y, 0);
    },

    getOrigin() {
        return new THREE.Vector3(STAGE_CENTER_X, CENTER_Y, 0);
    }
};

function applyReadouts(h: EddyCurrentHandles, result: SimulationResult | null | undefined, timeS: number): void {
    const r = eddyCurrentReadouts(result, timeS);
    const pText = Number.isFinite(r.powerW) ? `涡流功率 P = ${(r.powerW * 1000).toFixed(1)} mW` : 'P —';
    const dText = Number.isFinite(r.skinDepthMm) ? `δ = ${r.skinDepthMm.toFixed(2)} mm` : 'δ —';
    setLabel(h.label, `${pText}   |   ${dText}`, '#b91c1c');
    const fText = Number.isFinite(r.frequencyHz) ? `${r.frequencyHz.toFixed(0)} Hz` : '—';
    const bText = Number.isFinite(r.fieldT) ? `${r.fieldT.toFixed(2)} T` : '—';
    setLabel(h.infoLabel, `f = ${fText} | B = ${bText} | 板温 ≈ ${r.tempC.toFixed(1)} ℃ | 读数源自引擎`, '#1e293b');

    // 板温着色 + 涡流环随功率脉动
    const heat = Math.min(Math.max((r.tempC - 25) / 40, 0), 1);
    const mat = h.plate.material as THREE.MeshStandardMaterial;
    mat.emissive = new THREE.Color(0xef4444).multiplyScalar(heat * 0.35);
    const amp = Number.isFinite(r.powerW) ? Math.min(r.powerW * 2, 0.8) : 0.1;
    const pulse = 0.5 + 0.5 * Math.sin(timeS * 8);
    for (const ring of h.eddyRings) {
        const m = ring.material as THREE.LineBasicMaterial;
        m.opacity = 0.25 + amp * 0.6 * pulse;
    }
}

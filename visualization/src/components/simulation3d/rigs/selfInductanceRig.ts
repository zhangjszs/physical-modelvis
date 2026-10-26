/**
 * 自感现象 rig — 线圈 + 电源/电阻 + I(t)/ε_L(t) 读数 (#159 F-A3 / #161)
 *
 * 单一真源：电流 I(t) 读 charts.current_vs_time(s/A)，自感电动势 ε_L(t) 读
 * charts.voltage_vs_time(s/V)；τ / I∞ / 最大电压读 maxValues。替代误用 ampereForceRig。
 */
import * as THREE from 'three';
import { chartsOf, type SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeBox, makeLine, makeTextSprite } from '../primitives';
import { interpSeries } from '../../../rendering/renderingUtils';
import { num, setLabel, STAGE_CENTER_X } from './params';

const CENTER_Y = 1.5;
const RING_COUNT = 7;
const COIL_R = 0.36;
const COIL_LEN = 1.0;

export interface SelfInductanceHandles {
    group: THREE.Group;
    rings: THREE.Line[];
    glow: THREE.Mesh;
    currentLabel: THREE.Sprite;
    infoLabel: THREE.Sprite;
}

function makeRing(): THREE.Line {
    const seg = 36;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        pts.push(new THREE.Vector3(0, Math.cos(a) * COIL_R, Math.sin(a) * COIL_R));
    }
    return makeLine(pts, 0xb87333, 0.9);
}

/** 读数单一真源 (导出供契约测试)：断电衰减过程 I(t)/ε_L(t) */
export function selfInductanceReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    timeS: number
): { currentA: number; emfV: number; tauS: number; i0A: number } {
    const c = result ? chartsOf(result, 'self-inductance') : undefined;
    const mv = result?.diagnostics?.maxValues ?? {};
    return {
        currentA: interpSeries(c?.current_vs_time, timeS),
        emfV: interpSeries(c?.voltage_vs_time, timeS),
        tauS: num(mv['tau_s'], num(params['inductance'], 0.5) / Math.max(num(params['resistance'], 10), 1e-9)),
        i0A: num(mv['I0_A'], num(mv['Iss_A'], num(params['emf'], 12) / Math.max(num(params['resistance'], 10), 1e-9)))
    };
}

export const selfInductanceRig: SceneRig = {
    worldScale: 1,
    clampToGround: false,
    ownParticles: true,

    framing(): SceneFraming {
        const target: [number, number, number] = [STAGE_CENTER_X, CENTER_Y, 0];
        const distance = 7.6;
        return {
            target,
            position: [target[0] + distance * 0.12, target[1] + distance * 0.22, distance * 0.94],
            distance
        };
    },

    buildEquipment(_scene, params, result) {
        const group = new THREE.Group();
        const rings: THREE.Line[] = [];
        for (let i = 0; i < RING_COUNT; i++) {
            const ring = makeRing();
            ring.position.set(STAGE_CENTER_X + (i / (RING_COUNT - 1) - 0.5) * COIL_LEN, CENTER_Y, 0);
            group.add(ring);
            rings.push(ring);
        }
        // 线圈“磁场发光”示意 (强度随 |I|)
        const glow = new THREE.Mesh(
            new THREE.CylinderGeometry(COIL_R * 0.92, COIL_R * 0.92, COIL_LEN, 24, 1, true),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.06, side: THREE.DoubleSide })
        );
        glow.rotation.z = Math.PI / 2;
        glow.position.set(STAGE_CENTER_X, CENTER_Y, 0);
        group.add(glow);

        // 电池 + 电阻 (示意)
        const battery = makeBox(0.5, 0.3, 0.3, 0xf59e0b, 0.5, 0.2);
        battery.position.set(STAGE_CENTER_X - 1.9, CENTER_Y - 0.15, 0);
        const resistor = makeBox(0.6, 0.24, 0.24, 0x64748b, 0.5, 0.2);
        resistor.position.set(STAGE_CENTER_X + 1.9, CENTER_Y - 0.15, 0);
        group.add(battery, resistor);

        const currentLabel = makeTextSprite('', '#0369a1', 24, { x: 3.2, y: 0.42 });
        currentLabel.position.set(STAGE_CENTER_X, CENTER_Y + 0.95, 0.2);
        group.add(currentLabel);
        const infoLabel = makeTextSprite('', '#1e293b', 22, { x: 3.8, y: 0.4 });
        infoLabel.position.set(STAGE_CENTER_X, CENTER_Y + 1.5, 0.2);
        group.add(infoLabel);

        const handles: SelfInductanceHandles = { group, rings, glow, currentLabel, infoLabel };
        applyReadouts(handles, params, result, 0);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        applyReadouts(handles as SelfInductanceHandles, params, result, 0);
    },

    onAnimate(handles, ctx) {
        applyReadouts(handles as SelfInductanceHandles, ctx.params, ctx.result, ctx.time);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(STAGE_CENTER_X + pos.x, CENTER_Y + pos.y, 0);
    },

    getOrigin() {
        return new THREE.Vector3(STAGE_CENTER_X, CENTER_Y, 0);
    }
};

function applyReadouts(
    h: SelfInductanceHandles,
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    timeS: number
): void {
    const r = selfInductanceReadouts(params, result, timeS);
    setLabel(
        h.currentLabel,
        `电流 I = ${r.currentA.toFixed(3)} A   |   自感电动势 ε_L = ${r.emfV.toFixed(2)} V`,
        '#0369a1'
    );
    setLabel(
        h.infoLabel,
        `断电自感衰减 | τ = L/R = ${r.tauS.toFixed(3)} s | I₀ = ${r.i0A.toFixed(2)} A | 读数源自引擎 charts`,
        '#1e293b'
    );
    const mat = h.glow.material as THREE.MeshBasicMaterial;
    const frac = Math.min(Math.abs(r.currentA) / Math.max(r.i0A, 1e-9), 1);
    mat.opacity = 0.05 + frac * 0.22;
}

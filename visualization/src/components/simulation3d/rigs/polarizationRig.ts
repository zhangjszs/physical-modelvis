/**
 * 偏振光马吕斯定律 rig — 偏振片堆 + 光束 + 马吕斯曲线 (#159 F-A3 / #161)
 *
 * 单一真源：最终透射强度比读 maxValues.Ifinal，透射率读 maxValues.transmission；
 * 马吕斯曲线读 charts.malus_curve(θ/相对强度)。偏振片角度为输入回显 (读 param)。
 * 替代误用 opticsRig（折射 n1/n2）。
 */
import * as THREE from 'three';
import { chartsOf, type SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeCylinder, makeLine, makeTextSprite } from '../primitives';
import { num, setLabel, STAGE_CENTER_X } from './params';

const CENTER_Y = 1.6;
const PLATE_R = 0.5;

export interface PolarizationHandles {
    group: THREE.Group;
    plates: THREE.Mesh[];
    beam: THREE.Line;
    curve: THREE.Line | null;
    label: THREE.Sprite;
    infoLabel: THREE.Sprite;
}

export function polarizationReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined
): { ifinal: number; transmission: number; n: number } {
    const mv = result?.diagnostics?.maxValues ?? {};
    return {
        ifinal: num(mv['Ifinal'], NaN),
        transmission: num(mv['transmission'], NaN),
        n: Math.round(num(params['nPolarizers'], 2))
    };
}

/** 偏振片角度 (度): angle0..angleN, 缺省按 0/45/90 级联 */
function plateAngle(params: Record<string, number>, i: number): number {
    return num(params['angle' + i], num(params['angle0'], 0) + i * 45);
}

export const polarizationRig: SceneRig = {
    worldScale: 1,
    clampToGround: false,
    ownParticles: true,

    framing(): SceneFraming {
        const target: [number, number, number] = [STAGE_CENTER_X, CENTER_Y, 0];
        const distance = 7.8;
        return {
            target,
            position: [target[0] + distance * 0.1, target[1] + distance * 0.2, distance * 0.95],
            distance
        };
    },

    buildEquipment(_scene, params, result) {
        const group = new THREE.Group();
        const n = Math.max(1, Math.min(Math.round(num(params['nPolarizers'], 2)), 3));
        const plates: THREE.Mesh[] = [];
        const gap = 0.9;
        const startX = STAGE_CENTER_X - ((n - 1) * gap) / 2;
        for (let i = 0; i < n; i++) {
            const plate = makeCylinder(PLATE_R, 0.04, 0x93c5fd, 0.25, 0.1);
            plate.rotation.z = Math.PI / 2; // 圆盘法线沿 x
            plate.rotation.x = (plateAngle(params, i) * Math.PI) / 180;
            plate.position.set(startX + i * gap, CENTER_Y, 0);
            group.add(plate);
            plates.push(plate);
        }

        const beam = makeLine(
            [
                new THREE.Vector3(STAGE_CENTER_X - 2.2, CENTER_Y, 0),
                new THREE.Vector3(STAGE_CENTER_X + 2.2, CENTER_Y, 0)
            ],
            0xfacc15,
            0.95
        );
        group.add(beam);

        // 马吕斯曲线 (引擎 malus_curve): θ→x, I/I₀→y
        const curveSrc = result ? chartsOf(result, 'polarization')?.malus_curve : undefined;
        let curve: THREE.Line | null = null;
        if (curveSrc && curveSrc.points.length >= 2) {
            const pts = curveSrc.points;
            const xMin = pts[0]!.x;
            const xMax = pts[pts.length - 1]!.x;
            const spanX = Math.max(xMax - xMin, 1e-6);
            const world = pts.map(pt => {
                const wx = STAGE_CENTER_X + ((pt.x - xMin) / spanX - 0.5) * 3.6;
                const wy = CENTER_Y + 1.05 + Math.max(0, Math.min(pt.y, 1.2)) * 0.5;
                return new THREE.Vector3(wx, wy, 0);
            });
            curve = makeLine(world, 0x7c3aed, 0.9);
            group.add(curve);
        }

        const label = makeTextSprite('', '#7c3aed', 24, { x: 1.1, y: 0.4 });
        label.position.set(STAGE_CENTER_X, CENTER_Y + 0.72, 0.2);
        group.add(label);
        const infoLabel = makeTextSprite('', '#1e293b', 22, { x: 1.1, y: 0.4 });
        infoLabel.position.set(STAGE_CENTER_X, CENTER_Y + 1.72, 0.2);
        group.add(infoLabel);

        const handles: PolarizationHandles = { group, plates, beam, curve, label, infoLabel };
        applyReadouts(handles, params, result);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        applyReadouts(handles as PolarizationHandles, params, result);
    },

    onAnimate() {
        /* 静态偏振光路 */
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(STAGE_CENTER_X + pos.x, CENTER_Y + pos.y, 0);
    },

    getOrigin() {
        return new THREE.Vector3(STAGE_CENTER_X - 2.2, CENTER_Y, 0);
    }
};

function applyReadouts(
    h: PolarizationHandles,
    params: Record<string, number>,
    result: SimulationResult | null | undefined
): void {
    const r = polarizationReadouts(params, result);
    const iText = Number.isFinite(r.ifinal) ? `I/I₀ = ${r.ifinal.toFixed(3)}` : 'I/I₀ —';
    setLabel(h.label, `最终透射光强 ${iText}（马吕斯定律 cos²θ）`, '#7c3aed');
    const tText = Number.isFinite(r.transmission) ? `透射率 ${(r.transmission * 100).toFixed(1)}%` : '';
    const angles = Array.from({ length: r.n }, (_, i) => `${plateAngle(params, i).toFixed(0)}°`).join(' → ');
    setLabel(h.infoLabel, `偏振片 ${r.n} 片: ${angles} | ${tText} | 曲线为引擎 malus_curve`, '#1e293b');
    // 光束亮度随最终强度
    const mat = h.beam.material as THREE.LineBasicMaterial;
    mat.opacity = 0.25 + Math.min(Math.max(Number.isFinite(r.ifinal) ? r.ifinal : 0, 0), 1) * 0.7;
}

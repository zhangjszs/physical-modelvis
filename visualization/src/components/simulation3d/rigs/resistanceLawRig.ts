/**
 * 电阻定律 3D rig — 四线对比实验板 + 鳄鱼滑动测量夹 + 标尺与电阻读数
 * 探究导体电阻与材料、长度、横截面积的关系 R = ρ·L/S
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createResistanceBoard, updateResistanceBoard, ResistanceBoardHandles } from '../equipment/resistanceBoard';
import { num } from './params';

const WORLD_SCALE = 0.16;

const RESISTIVITY_MAP: Record<number, { name: string; rho: number }> = {
    0: { name: '铜 Cu', rho: 1.7e-8 },
    1: { name: '铁 Fe', rho: 1.0e-7 },
    2: { name: '镍铬 Nichrome', rho: 1.0e-6 }
};

export const resistanceLawRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const { group, handles } = createResistanceBoard(3.2, 1.4);
        scene.add(group);

        const L = num(params['length'], 1);
        const dMm = num(params['diameter'], 1);
        const matIdx = Math.round(num(params['material'], 0));
        const rho = (RESISTIVITY_MAP[matIdx] ?? RESISTIVITY_MAP[0]!).rho;
        const radiusM = (dMm * 1e-3) / 2;
        const area = Math.PI * radiusM * radiusM;
        const R = area > 0 ? (rho * L) / area : 0;

        // 归一化滑夹位置 (0~1)
        const ratio = THREE.MathUtils.clamp(L / 2, 0.05, 0.95);
        updateResistanceBoard(handles, ratio, R, 3.2);

        return {
            group,
            handles: handles as unknown as Record<string, unknown>
        };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as ResistanceBoardHandles;
        const L = num(params['length'], 1);
        const dMm = num(params['diameter'], 1);
        const matIdx = Math.round(num(params['material'], 0));
        const rho = (RESISTIVITY_MAP[matIdx] ?? RESISTIVITY_MAP[0]!).rho;
        const radiusM = (dMm * 1e-3) / 2;
        const area = Math.PI * radiusM * radiusM;
        const R = area > 0 ? (rho * L) / area : 0;

        const ratio = THREE.MathUtils.clamp(L / 2, 0.05, 0.95);
        updateResistanceBoard(h, ratio, R, 3.2);
    },

    getVisualPosition(_pos, params) {
        const L = num(params['length'], 1);
        const ratio = THREE.MathUtils.clamp(L / 2, 0.05, 0.95);
        const xPos = -1.3 + ratio * 2.6;
        return new THREE.Vector3(xPos, 0.12, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.12, 0);
    }
};

/**
 * 单摆 rig — 细线 + 摆球 + 支架
 * 用于 simple-pendulum（测周期、测 g）
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createPendulum } from '../equipment/pendulum';

const WORLD_SCALE = 0.16;

export const pendulumRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const L = params['L'] ?? params['length'] ?? 1.5;
        const { group: pendGroup, handles: pendHandles } = createPendulum(L * WORLD_SCALE);
        scene.add(pendGroup);

        const group = new THREE.Group();
        return { group, handles: { pendHandles } };
    },

    updateEquipment(_handles, _params) {
    },

    getVisualPosition(pos, _params) {
        // 单摆圆弧运动 → 投影到水平
        return new THREE.Vector3(pos.x * WORLD_SCALE, 2.4 - Math.abs(pos.y) * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        const L = _params['L'] ?? _params['length'] ?? 1.5;
        return new THREE.Vector3(0, 2.4 - L * WORLD_SCALE, 0);
    }
};

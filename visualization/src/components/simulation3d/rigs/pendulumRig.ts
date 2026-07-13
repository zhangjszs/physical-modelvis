/**
 * 单摆 rig — 细线 + 摆球 + 支架
 * 用于 simple-pendulum（测周期、测 g）
 * 参数响应：摆长 length → 摆线长度与摆球位置实时变化
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createPendulum } from '../equipment/pendulum';
import { num } from './params';

const WORLD_SCALE = 0.16;
const PIVOT_Y = 2.4;

export const pendulumRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const L = num(params.length, num(params.L, 1.5)) * WORLD_SCALE;
        const { group: pendGroup, handles: pendHandles } = createPendulum(L);
        scene.add(pendGroup);

        const group = new THREE.Group();
        return { group, handles: { pendHandles } };
    },

    updateEquipment(handles, params) {
        const ph = handles.pendHandles as { string: THREE.Line; bob: THREE.Mesh } | undefined;
        if (!ph) return;
        const L = num(params.length, num(params.L, 1.5)) * WORLD_SCALE;
        const top = new THREE.Vector3(0, PIVOT_Y, 0);
        const bottom = new THREE.Vector3(0, PIVOT_Y - L, 0);
        ph.string.geometry.setFromPoints([top, bottom]);
        ph.bob.position.copy(bottom);
    },

    getVisualPosition(pos, _params) {
        // 单摆圆弧运动 → 投影到水平
        return new THREE.Vector3(pos.x * WORLD_SCALE, 2.4 - Math.abs(pos.y) * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        const L = num(_params.length, num(_params.L, 1.5));
        return new THREE.Vector3(0, 2.4 - L * WORLD_SCALE, 0);
    }
};

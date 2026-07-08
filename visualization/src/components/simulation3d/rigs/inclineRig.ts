/**
 * 斜面 rig — 可调角度斜面 + 小车 + 角度尺
 * 用于 inclined-plane、galileo-incline
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createInclinedPlane, updateInclinedPlane, InclinedPlaneHandles } from '../equipment/inclinedPlane';
import { makeCylinder } from '../primitives';

const WORLD_SCALE = 0.16;

interface InclineHandles {
    planeHandles: InclinedPlaneHandles;
    cart: THREE.Mesh;
}

export const inclineRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const theta = params['theta'] ?? params['angle'] ?? 30;

        const { group: planeGroup, handles: planeHandles } = createInclinedPlane(theta);
        planeGroup.position.set(0, 0, 0);
        scene.add(planeGroup);

        // 小车（小球替代）
        const cart = makeCylinder(0.14, 0.2, 0x3b82f6, 0.3, 0.25);
        cart.rotation.z = Math.PI / 2;
        scene.add(cart);

        const group = new THREE.Group();
        return { group, handles: { planeHandles, cart } };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as InclineHandles;
        const theta = params['theta'] ?? params['angle'] ?? 30;
        updateInclinedPlane(h.planeHandles, theta);
    },

    getVisualPosition(pos, params) {
        const theta = params['theta'] ?? params['angle'] ?? 30;
        const rad = (theta * Math.PI) / 180;
        const origin = this.getOrigin(params);
        // 沿斜面方向的位移
        return new THREE.Vector3(
            origin.x + pos.x * Math.cos(rad) * WORLD_SCALE,
            origin.y - pos.x * Math.sin(rad) * WORLD_SCALE,
            0
        );
    },

    getOrigin(params) {
        const theta = params['theta'] ?? params['angle'] ?? 30;
        const rad = (theta * Math.PI) / 180;
        const panelLen = 3.2;
        // 斜面顶端作为起点
        return new THREE.Vector3(
            panelLen * 0.5 * (1 - Math.cos(rad)),
            Math.max(0.5, panelLen * 0.5 * Math.sin(rad)),
            0
        );
    }
};

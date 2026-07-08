/**
 * 牛顿第一定律 rig — 气垫导轨/低摩擦面 + 匀速运动滑块
 * 演示阻力越小 → 越接近匀速直线运动
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createAirTrack } from '../equipment/airTrack';
import { makeBox } from '../primitives';

const WORLD_SCALE = 0.16;

export const newtonFirstLawRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 气垫导轨（近似无摩擦）
        const { group: trackGroup } = createAirTrack(3.0);
        trackGroup.position.set(0, 0, 0);
        scene.add(trackGroup);

        // 滑块
        const glider = makeBox(0.2, 0.08, 0.16, 0x3b82f6, 0.3, 0.2);
        glider.position.set(-1.2, 0.5, 0);
        scene.add(glider);

        const group = new THREE.Group();
        return { group, handles: { trackGroup, glider } };
    },

    updateEquipment(_handles, _params) {},

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.5, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(-1.2, 0.5, 0);
    }
};

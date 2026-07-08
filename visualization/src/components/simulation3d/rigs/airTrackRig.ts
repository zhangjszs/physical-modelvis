/**
 * 气垫导轨 rig — 导轨 + 滑块 + 光电门
 * 用于 air-track（测速度、加速度、验证牛顿第二定律）
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createAirTrack } from '../equipment/airTrack';
import { createPhotogate } from '../equipment/photogate';
import { makeBox } from '../primitives';

const WORLD_SCALE = 0.16;

interface AirTrackHandles {
    trackGroup: THREE.Group;
    glider: THREE.Mesh;
    photogates: THREE.Group[];
}

export const airTrackRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const x1 = params['x1'] ?? 0.3;
        const x2 = params['x2'] ?? 0.8;

        // 气垫导轨
        const { group: trackGroup } = createAirTrack(3.0);
        trackGroup.position.set(0, 0, 0);
        scene.add(trackGroup);

        // 滑块
        const glider = makeBox(0.2, 0.08, 0.16, 0x3b82f6, 0.3, 0.2);
        glider.position.set(-1.2, 0.5, 0);
        scene.add(glider);

        // 光电门
        const pg1 = createPhotogate();
        pg1.group.position.set(-1.2 + x1 * 3, 0, 0);
        scene.add(pg1.group);

        const pg2 = createPhotogate();
        pg2.group.position.set(-1.2 + x2 * 3, 0, 0);
        scene.add(pg2.group);

        const group = new THREE.Group();
        return { group, handles: { trackGroup, glider, photogates: [pg1.group, pg2.group] } };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as AirTrackHandles;
        const x1 = params['x1'] ?? 0.3;
        const x2 = params['x2'] ?? 0.8;
        h.photogates[0]!.position.set(-1.2 + x1 * 3, 0, 0);
        h.photogates[1]!.position.set(-1.2 + x2 * 3, 0, 0);
    },

    getVisualPosition(pos, _params) {
        // 滑块沿导轨水平运动
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.5, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(-1.2, 0.5, 0);
    }
};

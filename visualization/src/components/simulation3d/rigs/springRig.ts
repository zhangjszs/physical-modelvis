/**
 * 弹簧振子 rig — 水平弹簧 + 滑块 + 光滑面
 * 演示简谐振动
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder } from '../primitives';

const WORLD_SCALE = 0.16;

export const springRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 固定墙壁
        const wall = makeBox(0.15, 0.8, 0.8, 0x94a3b8, 0.5, 0.1);
        wall.position.set(-0.8, 0.4, 0);
        scene.add(wall);

        // 弹簧
        const spring = makeCylinder(0.05, 0.6, 0x94a3b8, 0.5, 0.2);
        spring.rotation.z = Math.PI / 2;
        spring.position.set(-0.4, 0.25, 0);
        scene.add(spring);

        // 滑块
        const block = makeBox(0.25, 0.25, 0.25, 0x3b82f6, 0.3, 0.15);
        block.position.set(0, 0.125, 0);
        scene.add(block);

        // 地面
        const floor = makeBox(3.0, 0.04, 0.8, 0xe2e8f0, 0.8, 0);
        floor.position.set(0, 0.02, 0);
        scene.add(floor);

        const group = new THREE.Group();
        return { group, handles: { wall, spring, block, floor } };
    },

    updateEquipment(_handles, _params) {},

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.25, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.25, 0);
    }
};

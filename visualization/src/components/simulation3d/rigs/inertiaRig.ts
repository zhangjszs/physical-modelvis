/**
 * 惯性实验 rig — 小车 + 车上木块
 * 演示加速/减速时木块倾倒（惯性）
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createBench } from '../equipment/bench';
import { makeBox } from '../primitives';

const WORLD_SCALE = 0.16;

interface InertiaHandles {
    bench: THREE.Group;
    cart: THREE.Mesh;
    block: THREE.Mesh;
}

export const inertiaRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 长木板/桌面
        const { group: bench } = createBench(3.0, 0.05);
        bench.position.set(0, 0, 0);
        scene.add(bench);

        // 小车
        const cart = makeBox(0.4, 0.12, 0.3, 0x3b82f6, 0.35, 0.1);
        cart.position.set(0, 0.11, 0);
        scene.add(cart);

        // 车上木块
        const block = makeBox(0.15, 0.3, 0.15, 0xb45309, 0.6, 0.05);
        block.position.set(0, 0.32, 0);
        scene.add(block);

        const group = new THREE.Group();
        return { group, handles: { bench, cart, block } };
    },

    updateEquipment(handles, _params) {
        const h = handles as unknown as InertiaHandles;
        // 木块随小车位置同步（静止时）
        h.block.position.x = h.cart.position.x;
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.11, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.11, 0);
    }
};

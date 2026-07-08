/**
 * 牛顿第二定律 rig — 长木板 + 小车 + 滑轮 + 钩码牵引
 * 探究 a 与 F、m 的关系
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createBench } from '../equipment/bench';
import { createPulley } from '../equipment/pulley';
import { createWeight } from '../equipment/weight';
import { makeBox } from '../primitives';

const WORLD_SCALE = 0.16;

interface NSLHandles {
    bench: THREE.Group;
    cart: THREE.Mesh;
    pulley: THREE.Group;
    string: THREE.Line;
    weightGroup: THREE.Group;
}

export const newtonSecondLawRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 长木板
        const { group: bench } = createBench(3.5, 0.1);
        bench.position.set(0, 0, 0);
        scene.add(bench);

        // 小车
        const cart = makeBox(0.3, 0.14, 0.2, 0x3b82f6, 0.3, 0.15);
        cart.position.set(-1.0, 0.22, 0);
        scene.add(cart);

        // 滑轮（木板右端）
        const { group: pulley } = createPulley();
        pulley.position.set(1.7, 0.1, 0);
        scene.add(pulley);

        // 细线（小车 → 滑轮 → 钩码）
        const string = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-1.0, 0.22, 0),
                new THREE.Vector3(1.7, 0.1, 0),
                new THREE.Vector3(1.7, -0.5, 0)
            ]),
            new THREE.LineBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.6 })
        );
        scene.add(string);

        // 钩码（牵引重物）
        const { group: weightGroup } = createWeight(0.05, 0x64748b);
        weightGroup.position.set(1.7, -0.5, 0);
        scene.add(weightGroup);

        const group = new THREE.Group();
        return { group, handles: { bench, cart, pulley, string, weightGroup } };
    },

    updateEquipment(handles, _params) {
        const h = handles as unknown as NSLHandles;
        // 细线随小车位置更新
        h.string.geometry.dispose();
        h.string.geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(h.cart.position.x, 0.22, 0),
            new THREE.Vector3(1.7, 0.1, 0),
            new THREE.Vector3(1.7, h.weightGroup.position.y, 0)
        ]);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.22, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.22, 0);
    }
};

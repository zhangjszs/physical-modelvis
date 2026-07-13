/**
 * 弹簧振子 rig — 水平弹簧 + 滑块 + 光滑面
 * 演示简谐振动
 * 参数响应：质量 m → 滑块大小；振幅 A → 滑块偏离平衡位置 + 弹簧拉伸示意
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder } from '../primitives';
import { num } from './params';

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

    updateEquipment(handles, params) {
        const block = handles.block as THREE.Mesh;
        const spring = handles.spring as THREE.Mesh;
        const m = num(params.m, 1);
        const A = num(params.A, 0.5);
        // 质量 → 滑块大小（半径 ∝ 质量立方根）
        const s = THREE.MathUtils.clamp(Math.cbrt(m), 0.5, 2.2);
        block.scale.setScalar(s);
        // 振幅 → 滑块偏离平衡位置 + 弹簧拉伸示意
        const off = THREE.MathUtils.clamp(A, 0, 3) * 0.2;
        block.position.x = off;
        spring.scale.x = 1 + A * 0.3;
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.25, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.25, 0);
    }
};

/**
 * 碰撞 rig — 两个小球对碰（弹性/非弹性）
 * 用于 collision、momentum
 * 参数响应：质量 m1/m2 → 球体大小（半径 ∝ 质量立方根）
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeSphere, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

export const collisionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 碰撞台面
        const table = makeBox(4.0, 0.04, 1.0, 0xe2e8f0, 0.8, 0);
        table.position.set(0, 0.02, 0);
        scene.add(table);

        // 标签
        const label = makeTextSprite('光滑水平面', '#94a3b8', 22, { x: 0.8, y: 0.2 });
        label.position.set(0, 0.2, 0);
        scene.add(label);

        // 两个小球（初始位置分居两侧，质量变化时改变大小）
        const ball1 = makeSphere(0.2, 0xef4444, { emissive: 0xdc2626, emissiveIntensity: 0.15 });
        ball1.position.set(-2, 0.2, 0);
        scene.add(ball1);

        const ball2 = makeSphere(0.2, 0x3b82f6, { emissive: 0x1d4ed8, emissiveIntensity: 0.15 });
        ball2.position.set(2, 0.2, 0);
        scene.add(ball2);

        return { group: new THREE.Group(), handles: { ball1, ball2 } };
    },

    updateEquipment(handles, params) {
        const b1 = handles.ball1 as THREE.Mesh;
        const b2 = handles.ball2 as THREE.Mesh;
        const m1 = num(params.m1, 1);
        const m2 = num(params.m2, 1);
        // 质量 → 球体大小（半径 ∝ 质量立方根）
        b1.scale.setScalar(THREE.MathUtils.clamp(Math.cbrt(m1), 0.4, 2.6));
        b2.scale.setScalar(THREE.MathUtils.clamp(Math.cbrt(m2), 0.4, 2.6));
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.2, pos.y * WORLD_SCALE * 0.5);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.2, 0);
    }
};

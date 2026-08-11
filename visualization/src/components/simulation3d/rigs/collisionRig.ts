/**
 * 碰撞 rig — 台面 + 运动双球
 * 用于 collision、momentum、projectile-collision
 * 双球由 Stage 按引擎两条轨迹渲染 (碰撞/动量/平抛碰撞均为双体输出),
 * 此处不再放静态装饰球 — 静态球与运动轨迹不在同一世界尺度, 会误导画面。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeTextSprite } from '../primitives';

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

        return { group: new THREE.Group(), handles: { table } };
    },

    updateEquipment(_handles, _params) {},

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.2, pos.y * WORLD_SCALE * 0.5);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.2, 0);
    }
};

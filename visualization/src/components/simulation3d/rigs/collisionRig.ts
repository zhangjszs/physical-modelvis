/**
 * 碰撞 rig — 两个小球对碰（弹性/非弹性）
 * 用于 collision、momentum
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

        return { group: new THREE.Group(), handles: {} };
    },

    updateEquipment(_handles, _params) {},

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.2, pos.y * WORLD_SCALE * 0.5);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.2, 0);
    }
};

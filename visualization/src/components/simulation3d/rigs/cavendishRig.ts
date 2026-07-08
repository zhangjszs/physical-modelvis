/**
 * 卡文迪什扭秤 rig — T 形架 + 石英丝 + 大小铅球 + 激光反射
 * 用于 cavendish（万有引力常量测量）
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeSphere, makeLine, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const cavendishRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 石英丝（竖直细线）
        const wire = makeLine(
            [new THREE.Vector3(0, 2.0, 0), new THREE.Vector3(0, 1.0, 0)],
            0x94a3b8,
            0.6
        );
        scene.add(wire);

        // T 形架横杆
        const beam = makeBox(1.2, 0.04, 0.04, 0x475569, 0.4, 0.3);
        beam.position.set(0, 1.0, 0);
        scene.add(beam);

        // 小铅球（T 形架两端）
        const smallBall1 = makeSphere(0.08, 0x64748b, {});
        smallBall1.position.set(-0.6, 1.0, 0);
        scene.add(smallBall1);

        const smallBall2 = makeSphere(0.08, 0x64748b, {});
        smallBall2.position.set(0.6, 1.0, 0);
        scene.add(smallBall2);

        // 大铅球（外侧，引力源）
        const bigBall1 = makeSphere(0.15, 0x334155, {});
        bigBall1.position.set(-0.9, 1.0, 0.3);
        scene.add(bigBall1);

        const bigBall2 = makeSphere(0.15, 0x334155, {});
        bigBall2.position.set(0.9, 1.0, 0.3);
        scene.add(bigBall2);

        // 激光反射光束
        const laser = makeLine(
            [new THREE.Vector3(-2.0, 1.5, 0), new THREE.Vector3(0, 1.0, 0), new THREE.Vector3(2.0, 1.5, 0)],
            0xef4444,
            0.5
        );
        scene.add(laser);

        const label = makeTextSprite('卡文迪什扭秤', '#475569', 26, { x: 0.9, y: 0.22 });
        label.position.set(0, 2.2, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: {} };
    },

    updateEquipment(_handles, _params) {
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.0 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.0, 0);
    }
};

/**
 * 安培力 / 电流磁场 rig — 蹄形磁铁 + 通电导线
 * 用于 ampere-force、current-magnetic、em-induction
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const ampereForceRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 蹄形磁铁（N 极）
        const nPole = makeBox(0.15, 0.8, 0.3, 0xdc2626, 0.3, 0.2);
        nPole.position.set(-0.3, 1.0, 0);
        scene.add(nPole);

        // S 极
        const sPole = makeBox(0.15, 0.8, 0.3, 0x3b82f6, 0.3, 0.2);
        sPole.position.set(0.3, 1.0, 0);
        scene.add(sPole);

        // 磁铁底部连接
        const magnetBase = makeBox(0.6, 0.12, 0.3, 0x475569, 0.4, 0.2);
        magnetBase.position.set(0, 0.55, 0);
        scene.add(magnetBase);

        // 通电导线（水平，在两极间）
        const wire = makeCylinder(0.015, 0.5, 0xf59e0b, 0.3, 0.3);
        wire.rotation.z = Math.PI / 2;
        wire.position.set(0, 1.0, 0);
        scene.add(wire);

        // 电流方向箭头
        const currentArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-0.4, 1.0, 0),
            0.2,
            0x16a34a,
            0.05,
            0.03
        );
        scene.add(currentArrow);

        // 安培力方向箭头
        const forceArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 1.0, 0),
            0.3,
            0xef4444,
            0.06,
            0.04
        );
        scene.add(forceArrow);

        const labelN = makeTextSprite('N', '#dc2626', 22, { x: 0.25, y: 0.16 });
        labelN.position.set(-0.3, 1.5, 0);
        scene.add(labelN);

        const labelS = makeTextSprite('S', '#3b82f6', 22, { x: 0.25, y: 0.16 });
        labelS.position.set(0.3, 1.5, 0);
        scene.add(labelS);

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

/**
 * 传动装置 rig — 皮带/齿轮/摩擦轮传动
 * 用于 transmission-belt
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const transmissionBeltRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 主动轮
        const wheel1 = makeCylinder(0.25, 0.08, 0x3b82f6, 0.3, 0.25);
        wheel1.rotation.z = Math.PI / 2;
        wheel1.position.set(-0.6, 1.0, 0);
        scene.add(wheel1);

        // 从动轮
        const wheel2 = makeCylinder(0.4, 0.08, 0xdc2626, 0.3, 0.25);
        wheel2.rotation.z = Math.PI / 2;
        wheel2.position.set(0.8, 1.0, 0);
        scene.add(wheel2);

        // 皮带（连接两轮的线段）
        const belt = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-0.6, 1.25, 0),
                new THREE.Vector3(0.8, 1.4, 0),
                new THREE.Vector3(0.8, 0.6, 0),
                new THREE.Vector3(-0.6, 0.75, 0),
                new THREE.Vector3(-0.6, 1.25, 0)
            ]),
            new THREE.LineBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.5 })
        );
        scene.add(belt);

        const label = makeTextSprite('皮带传动', '#475569', 24, { x: 0.7, y: 0.2 });
        label.position.set(0.1, 1.8, 0);
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

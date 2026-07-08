/**
 * 振动 rig — 受迫振动/共振/双摆
 * 用于 forced-vibration-freq、resonance-curve、double-pendulum-sync
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createPendulum } from '../equipment/pendulum';
import { makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const vibrationRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 单摆
        const { group: pendGroup } = createPendulum(1.2);
        pendGroup.position.set(0, 0, 0);
        scene.add(pendGroup);

        // 驱动力箭头
        const driveArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 1.5, 0),
            0.3,
            0xef4444,
            0.06,
            0.04
        );
        scene.add(driveArrow);

        const label = makeTextSprite('受迫振动', '#475569', 24, { x: 0.7, y: 0.2 });
        label.position.set(0, 2.6, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: {} };
    },

    updateEquipment(_handles, _params) {},

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 2.0 - Math.abs(pos.y) * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 2.0, 0);
    }
};

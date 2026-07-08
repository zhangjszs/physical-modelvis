/**
 * 平行板电容器 rig — 两块平行极板 + 电场线
 * 用于 capacitor-charge、parallel-plate-capacitor
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const capacitorRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 上极板（正极）
        const plateTop = makeBox(1.2, 0.04, 0.6, 0xdc2626, 0.3, 0.3);
        plateTop.position.set(0, 1.8, 0);
        scene.add(plateTop);

        // 下极板（负极）
        const plateBottom = makeBox(1.2, 0.04, 0.6, 0x3b82f6, 0.3, 0.3);
        plateBottom.position.set(0, 1.0, 0);
        scene.add(plateBottom);

        // 电场线箭头
        for (let i = 0; i < 5; i++) {
            const arrow = new THREE.ArrowHelper(
                new THREE.Vector3(0, -1, 0),
                new THREE.Vector3(-0.4 + i * 0.2, 1.5, 0),
                0.2,
                0x3b82f6,
                0.05,
                0.03
            );
            scene.add(arrow);
        }

        // 支架
        const stand = makeBox(0.04, 1.0, 0.04, 0x64748b, 0.4, 0.3);
        stand.position.set(-0.6, 1.4, 0);
        scene.add(stand);

        const labelPos = makeTextSprite('+', '#dc2626', 28, { x: 0.3, y: 0.2 });
        labelPos.position.set(0.7, 1.8, 0);
        scene.add(labelPos);

        const labelNeg = makeTextSprite('−', '#3b82f6', 28, { x: 0.3, y: 0.2 });
        labelNeg.position.set(0.7, 1.0, 0);
        scene.add(labelNeg);

        return { group: new THREE.Group(), handles: {} };
    },

    updateEquipment(_handles, _params) {
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.4 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.4, 0);
    }
};

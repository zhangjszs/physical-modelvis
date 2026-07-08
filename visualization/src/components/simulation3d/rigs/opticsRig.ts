/**
 * 光学 rig — 折射/全反射/偏振/全息
 * 用于 refraction、total-internal-reflection、polarization-malus、hologram
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeLine, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const opticsRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 介质分界面
        const interfaceLine = makeLine(
            [new THREE.Vector3(-2, 1.0, 0), new THREE.Vector3(2, 1.0, 0)],
            0x94a3b8,
            0.5
        );
        scene.add(interfaceLine);

        // 法线
        const normal = makeLine(
            [new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(0, 1.7, 0)],
            0xcbd5e1,
            0.3
        );
        scene.add(normal);

        // 入射光线
        const incidentRay = makeLine(
            [new THREE.Vector3(-1.5, 1.6, 0), new THREE.Vector3(0, 1.0, 0)],
            0xef4444,
            0.7
        );
        scene.add(incidentRay);

        // 折射光线
        const refractedRay = makeLine(
            [new THREE.Vector3(0, 1.0, 0), new THREE.Vector3(1.2, 0.5, 0)],
            0x3b82f6,
            0.7
        );
        scene.add(refractedRay);

        // 角度标注
        const label = makeTextSprite('入射角 θ₁ → 折射角 θ₂', '#475569', 22, { x: 1.2, y: 0.18 });
        label.position.set(0, 2.0, 0);
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

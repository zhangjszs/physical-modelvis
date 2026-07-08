/**
 * 原子核物理 rig — α散射/衰变/裂变/射线探测
 * 用于 alpha-scattering、decay-statistics、fission-chain、
 * radioactive、geiger-counter
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeSphere, makeCylinder, makeLine, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const nuclearRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 原子核（金箔/铀核）
        const nucleus = makeSphere(0.15, 0xfbbf24, { emissive: 0xb45309, emissiveIntensity: 0.2 });
        nucleus.position.set(0, 1.5, 0);
        scene.add(nucleus);

        // α粒子入射轨迹
        const incident = makeLine(
            [new THREE.Vector3(-2.0, 1.8, 0), new THREE.Vector3(-0.3, 1.55, 0)],
            0xef4444,
            0.6
        );
        scene.add(incident);

        // α粒子散射轨迹（大角度偏转）
        const scattered = makeLine(
            [new THREE.Vector3(-0.3, 1.55, 0), new THREE.Vector3(1.5, 2.0, 0)],
            0xef4444,
            0.6
        );
        scene.add(scattered);

        // 放射源标记
        const source = makeCylinder(0.06, 0.04, 0x334155, 0.3, 0.3);
        source.position.set(-2.0, 1.8, 0);
        scene.add(source);

        const label = makeTextSprite('α 粒子散射', '#475569', 24, { x: 0.8, y: 0.2 });
        label.position.set(0, 2.5, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: {} };
    },

    updateEquipment(_handles, _params) {
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.5 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.5, 0);
    }
};

/**
 * 量子物理 rig — 光电效应/玻尔模型/原子光谱
 * 用于 photoelectric、bohr、bohr-orbit
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeSphere, makeLine, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const quantumRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 原子核
        const nucleus = makeSphere(0.12, 0xdc2626, { emissive: 0x7f1d1d, emissiveIntensity: 0.2 });
        nucleus.position.set(0, 1.5, 0);
        scene.add(nucleus);

        // 电子轨道
        const orbitPoints = Array.from({ length: 48 }, (_, i) => {
            const a = (i / 47) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(a) * 0.8, 1.5 + Math.sin(a) * 0.5, 0);
        });
        const orbit = makeLine(orbitPoints, 0x94a3b8, 0.4);
        scene.add(orbit);

        // 电子
        const electron = makeSphere(0.06, 0x3b82f6, { emissive: 0x1d4ed8, emissiveIntensity: 0.3 });
        electron.position.set(0.8, 1.5, 0);
        scene.add(electron);

        // 光子（能量箭头）
        const photon = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0.8, 0),
            0.4,
            0xfbbf24,
            0.08,
            0.05
        );
        scene.add(photon);

        const label = makeTextSprite('hν', '#fbbf24', 24, { x: 0.3, y: 0.18 });
        label.position.set(0.3, 0.8, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: {} };
    },

    updateEquipment(_handles, _params) {},

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.5 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.5, 0);
    }
};

/**
 * 光学折射定律 rig — 360°光学分度盘 + 半圆形高透玻璃砖 + 激光入射与折射光束
 * 验证斯涅尔折射定律 n₁·sinθ₁ = n₂·sinθ₂
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createOpticalDisk, updateOpticalDisk, OpticalDiskHandles } from '../equipment/opticalDisk';
import { setLabel, num } from './params';

const WORLD_SCALE = 0.16;
const CENTER_Y = 1.4;

interface OpticsHandles {
    diskHandles: OpticalDiskHandles;
}

export const opticsRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: false,

    buildEquipment(scene, params) {
        const { group, handles: diskHandles } = createOpticalDisk(1.6, CENTER_Y);
        scene.add(group);

        const theta1 = num(params['angle'] ?? params['theta1'], 30);
        const n1 = num(params['n1'], 1.0);
        const n2 = num(params['n2'], 1.5);
        const relN = n1 > 0 ? n2 / n1 : 1.5;

        updateOpticalDisk(diskHandles, theta1, relN, CENTER_Y, 1.6);

        const sinTheta2 = Math.sin((theta1 * Math.PI) / 180) / relN;
        const theta2Deg = sinTheta2 <= 1 ? (Math.asin(sinTheta2) * 180) / Math.PI : 90;
        setLabel(
            diskHandles.angleLabel,
            `θ₁ = ${theta1.toFixed(1)}° → θ₂ = ${theta2Deg.toFixed(1)}° (n₁=${n1.toFixed(2)}, n₂=${n2.toFixed(2)})`,
            '#0f172a'
        );

        return {
            group,
            handles: { diskHandles }
        };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as OpticsHandles;
        const theta1 = num(params['angle'] ?? params['theta1'], 30);
        const n1 = num(params['n1'], 1.0);
        const n2 = num(params['n2'], 1.5);
        const relN = n1 > 0 ? n2 / n1 : 1.5;

        updateOpticalDisk(h.diskHandles, theta1, relN, CENTER_Y, 1.6);

        const sinTheta2 = Math.sin((theta1 * Math.PI) / 180) / relN;
        const theta2Deg = sinTheta2 <= 1 ? (Math.asin(sinTheta2) * 180) / Math.PI : 90;
        setLabel(
            h.diskHandles.angleLabel,
            `θ₁ = ${theta1.toFixed(1)}° → θ₂ = ${theta2Deg.toFixed(1)}° (n₁=${n1.toFixed(2)}, n₂=${n2.toFixed(2)})`,
            '#0f172a'
        );
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, CENTER_Y + pos.y * WORLD_SCALE, 0.05);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, CENTER_Y, 0.05);
    }
};

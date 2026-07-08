/**
 * 天体轨道 rig — 中心天体 + 环绕轨道
 * 用于 orbital、moon-earth-test
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeSphere, makeLine, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const orbitalRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 中心天体（地球）
        const center = makeSphere(0.3, 0x3b82f6, { emissive: 0x1d4ed8, emissiveIntensity: 0.15 });
        center.position.set(0, 1.5, 0);
        scene.add(center);

        // 椭圆轨道
        const orbitPoints = Array.from({ length: 64 }, (_, i) => {
            const a = (i / 63) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(a) * 2.0, 1.5 + Math.sin(a) * 1.2, 0);
        });
        const orbit = makeLine(orbitPoints, 0x94a3b8, 0.4);
        scene.add(orbit);

        const label = makeTextSprite('椭圆轨道', '#475569', 24, { x: 0.7, y: 0.2 });
        label.position.set(0, 0.5, 0);
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

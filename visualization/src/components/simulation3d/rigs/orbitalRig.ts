/**
 * 天体轨道 rig — 中心天体 + 环绕轨道
 * 用于 orbital、moon-earth-test
 * 参数响应：轨道高度 altitude → 轨道大小；速度系数 velocityFactor → 椭圆偏心率
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeSphere, makeLine, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;
const N = 64;
const CENTER_Y = 1.5;
const R_EARTH = 6371; // km
const GEO_ALT = 36000; // km

export const orbitalRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 中心天体（地球）
        const center = makeSphere(0.3, 0x3b82f6, { emissive: 0x1d4ed8, emissiveIntensity: 0.15 });
        center.position.set(0, CENTER_Y, 0);
        scene.add(center);

        // 椭圆轨道
        const orbitPoints = Array.from({ length: N }, (_, i) => {
            const a = (i / (N - 1)) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(a) * 2.0, CENTER_Y + Math.sin(a) * 1.2, 0);
        });
        const orbit = makeLine(orbitPoints, 0x94a3b8, 0.4);
        scene.add(orbit);

        const label = makeTextSprite('椭圆轨道', '#475569', 24, { x: 0.7, y: 0.2 });
        label.position.set(0, 0.5, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: { center, orbit } };
    },

    updateEquipment(handles, params) {
        const orbit = handles.orbit as THREE.Line;
        const hKm = num(params.altitude, 400);
        const vf = num(params.velocityFactor, 1.0);
        const rOrbit = R_EARTH + hKm;
        // 缩放到世界：GEO 轨道半径 → 2.0 world
        const a = (rOrbit / (R_EARTH + GEO_ALT)) * 2.0;
        // 速度偏离圆轨道 → 椭圆偏心率
        const e = Math.min(0.85, Math.abs(1 - vf));
        const b = a * Math.sqrt(1 - e * e);
        const pts = Array.from({ length: N }, (_, i) => {
            const t = (i / (N - 1)) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(t) * a, CENTER_Y + Math.sin(t) * b, 0);
        });
        orbit.geometry.setFromPoints(pts);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, CENTER_Y + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, CENTER_Y, 0);
    }
};

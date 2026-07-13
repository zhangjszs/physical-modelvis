/**
 * 圆周运动 rig — 水平面圆周运动 + 向心力箭头
 * 用于 circular-motion、vertical-circle、centrifugal
 * 参数响应：半径 radius → 轨道大小；质量/角速度 → 向心力箭头长度 (F=m·r·ω²)
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeLine, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;
const N = 64;
const CENTER_Y = 1.0;

export const circularMotionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 圆形轨迹
        const trackPoints = Array.from({ length: N }, (_, i) => {
            const a = (i / (N - 1)) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(a) * 1.2, CENTER_Y + Math.sin(a) * 1.2, 0);
        });
        const track = makeLine(trackPoints, 0x94a3b8, 0.4);
        scene.add(track);

        // 圆心
        const center = makeCylinder(0.03, 0.02, 0xdc2626, 0.4, 0.3);
        center.position.set(0, CENTER_Y, 0);
        scene.add(center);

        // 向心力箭头
        const forceArrow = new THREE.ArrowHelper(
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(1.2, CENTER_Y, 0),
            0.5,
            0xef4444,
            0.1,
            0.07
        );
        scene.add(forceArrow);

        const label = makeTextSprite('向心力', '#dc2626', 22, { x: 0.5, y: 0.18 });
        label.position.set(0, 0.5, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: { track, forceArrow } };
    },

    updateEquipment(handles, params) {
        const track = handles.track as THREE.Line;
        const forceArrow = handles.forceArrow as THREE.ArrowHelper;
        const rPhys = num(params.radius, 1.0);
        const r = rPhys * WORLD_SCALE;
        const pts = Array.from({ length: N }, (_, i) => {
            const a = (i / (N - 1)) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(a) * r, CENTER_Y + Math.sin(a) * r, 0);
        });
        track.geometry.setFromPoints(pts);
        // 向心力 F = m·r·ω² → 箭头长度
        const m = num(params.mass, 0.2);
        const omega = num(params.omega, 3.0);
        const F = m * rPhys * omega * omega;
        const len = THREE.MathUtils.clamp(F * 0.04, 0.1, 1.6);
        forceArrow.position.set(r, CENTER_Y, 0);
        forceArrow.setLength(len, len * 0.25, len * 0.18);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0, 0);
    }
};

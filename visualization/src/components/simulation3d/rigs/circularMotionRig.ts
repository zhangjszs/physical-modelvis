/**
 * 圆周运动 rig — 水平面圆周运动 + 向心力箭头
 * 用于 circular-motion、vertical-circle、centrifugal
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeLine, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const circularMotionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 圆形轨迹
        const trackPoints = Array.from({ length: 64 }, (_, i) => {
            const a = (i / 63) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(a) * 1.2, 1.0 + Math.sin(a) * 1.2, 0);
        });
        const track = makeLine(trackPoints, 0x94a3b8, 0.4);
        scene.add(track);

        // 圆心
        const center = makeCylinder(0.03, 0.02, 0xdc2626, 0.4, 0.3);
        center.position.set(0, 1.0, 0);
        scene.add(center);

        // 向心力箭头
        const forceArrow = new THREE.ArrowHelper(
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(1.2, 1.0, 0),
            0.5,
            0xef4444,
            0.1,
            0.07
        );
        scene.add(forceArrow);

        const label = makeTextSprite('向心力', '#dc2626', 22, { x: 0.5, y: 0.18 });
        label.position.set(0, 0.5, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: {} };
    },

    updateEquipment(_handles, _params) {
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0, 0);
    }
};

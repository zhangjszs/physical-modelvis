/**
 * 曲线运动 rig — 曲线轨道 + 小球 + 切线方向箭头
 * 用于 curve-velocity-direction、curve-condition
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeLine, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const curveMotionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 曲线轨道（圆形近似）
        const trackPoints = Array.from({ length: 64 }, (_, i) => {
            const a = (i / 63) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(a) * 1.5, Math.sin(a) * 1.5 + 2, 0);
        });
        const track = makeLine(trackPoints, 0x94a3b8, 0.5);
        scene.add(track);

        // 圆心标记
        const center = makeCylinder(0.04, 0.02, 0x475569, 0.4, 0.3);
        center.position.set(0, 2, 0);
        scene.add(center);

        const label = makeTextSprite('曲线轨道', '#475569', 26, { x: 0.7, y: 0.22 });
        label.position.set(0, 3.7, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: {} };
    },

    updateEquipment(_handles, _params) {},

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0, 0);
    }
};

/**
 * 匀变速直线运动 rig — 精密水平直线导轨 + 双光电门 + 标尺
 * 用于 uniform-accelerated
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createLinearTrack, updateLinearTrack, LinearTrackHandles } from '../equipment/linearTrack';
import { makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.18;
const TRACK_Y = 0.17; // 导轨表面高度

interface LinearRigHandles {
    trackHandles: LinearTrackHandles;
    infoLabel: THREE.Sprite;
}

export const linearTrackRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: BALL_RADIUS,
    clampToGround: true,

    buildEquipment(scene, params) {
        const { group, handles: trackHandles } = createLinearTrack(6.0, 0.32, 0.14, [1.0, 4.0]);
        group.position.set(0, 0, 0);
        scene.add(group);

        const v0 = num(params['v0'], 0);
        const a = num(params['a'], 2);
        const infoLabel = makeTextSprite(`v₀=${v0.toFixed(1)}m/s, a=${a.toFixed(1)}m/s²`, '#2563eb', 24, {
            x: 1.1,
            y: 0.22
        });
        infoLabel.position.set(0, 0.65, 0.35);
        scene.add(infoLabel);

        return {
            group,
            handles: { trackHandles, infoLabel }
        };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as LinearRigHandles;
        const v0 = num(params['v0'], 0);
        const a = num(params['a'], 2);
        setLabel(h.infoLabel, `v₀=${v0.toFixed(1)}m/s, a=${a.toFixed(1)}m/s²`, '#2563eb');
        updateLinearTrack(h.trackHandles, [1.0, 4.0]);
    },

    getVisualPosition(pos, _params) {
        // 小车/滑块平稳贴合在导轨上表面滑行
        return new THREE.Vector3(-2.4 + pos.x * WORLD_SCALE, TRACK_Y + BALL_RADIUS, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(-2.4, TRACK_Y + BALL_RADIUS, 0);
    }
};

/**
 * 碰撞与动量守恒 rig — 精密低摩擦碰撞导轨 + 双光电门测速 + 动量守恒标牌
 * 用于 collision、momentum、projectile-collision
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createLinearTrack, LinearTrackHandles } from '../equipment/linearTrack';
import { makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.18;
const TRACK_Y = 0.17;

interface CollisionHandles {
    trackHandles: LinearTrackHandles;
    infoLabel: THREE.Sprite;
}

export const collisionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: BALL_RADIUS,
    clampToGround: true,

    buildEquipment(scene, params) {
        // 1. 碰撞实验精密导轨 (带两端防撞与标尺)
        const { group, handles: trackHandles } = createLinearTrack(5.6, 0.32, 0.14, [1.6, 4.0]);
        group.position.set(0, 0, 0);
        scene.add(group);

        // 2. 动量守恒标牌
        const m1 = num(params['m1'], 1);
        const m2 = num(params['m2'], 1);
        const v1 = num(params['v1'], 2);
        const v2 = num(params['v2'], 0);
        const pTotal = m1 * v1 + m2 * v2;

        const infoLabel = makeTextSprite(
            `总动量 P = m₁v₁ + m₂v₂ = ${pTotal.toFixed(2)} kg·m/s | 碰撞动量守恒`,
            '#059669',
            24,
            { x: 1.5, y: 0.22 }
        );
        infoLabel.position.set(0, 0.65, 0.35);
        scene.add(infoLabel);

        return {
            group,
            handles: { trackHandles, infoLabel }
        };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as CollisionHandles;
        const m1 = num(params['m1'], 1);
        const m2 = num(params['m2'], 1);
        const v1 = num(params['v1'], 2);
        const v2 = num(params['v2'], 0);
        const pTotal = m1 * v1 + m2 * v2;

        setLabel(h.infoLabel, `总动量 P = m₁v₁ + m₂v₂ = ${pTotal.toFixed(2)} kg·m/s | 碰撞动量守恒`, '#059669');
    },

    getVisualPosition(pos, _params) {
        // 双球严格沿导轨中心线对心正碰
        return new THREE.Vector3(pos.x * WORLD_SCALE, TRACK_Y + BALL_RADIUS, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, TRACK_Y + BALL_RADIUS, 0);
    }
};

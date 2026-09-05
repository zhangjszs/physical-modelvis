/**
 * 气垫导轨测速度 rig — 真实三角截面气轨 + 双可调光电门 + 标尺
 * 用于 air-track（测速度、测量遮光时间 Δt）
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createAirTrack } from '../equipment/airTrack';
import { createPhotogate } from '../equipment/photogate';
import { makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.16;
const TRACK_TOP_Y = 0.38; // 气轨顶部导轨棱高度

interface AirTrackHandles {
    trackGroup: THREE.Group;
    photogate1: THREE.Group;
    photogate2: THREE.Group;
    infoLabel: THREE.Sprite;
}

export const airTrackRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: BALL_RADIUS,
    clampToGround: true,

    buildEquipment(scene, params) {
        const x1 = num(params['x1'], 0.3);
        const x2 = num(params['x2'], 0.8);
        const v0 = num(params['v0'], 0.5);

        // 1. 气垫导轨
        const { group: trackGroup } = createAirTrack(3.6);
        trackGroup.position.set(0, 0, 0);
        scene.add(trackGroup);

        // 2. 双光电门 (随 x1, x2 动态布置)
        const pg1 = createPhotogate();
        pg1.group.position.set(-1.2 + x1 * 1.8, TRACK_TOP_Y - 0.05, 0);
        scene.add(pg1.group);

        const pg2 = createPhotogate();
        pg2.group.position.set(-1.2 + x2 * 1.8, TRACK_TOP_Y - 0.05, 0);
        scene.add(pg2.group);

        // 3. 测量说明标牌
        const infoLabel = makeTextSprite(
            `v₀ = ${v0.toFixed(2)} m/s | x₁=${x1.toFixed(2)}m, x₂=${x2.toFixed(2)}m`,
            '#0284c7',
            24,
            { x: 1.2, y: 0.22 }
        );
        infoLabel.position.set(0, TRACK_TOP_Y + 0.45, 0.35);
        scene.add(infoLabel);

        const group = new THREE.Group();
        return {
            group,
            handles: {
                trackGroup,
                photogate1: pg1.group,
                photogate2: pg2.group,
                infoLabel
            }
        };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as AirTrackHandles;
        const x1 = num(params['x1'], 0.3);
        const x2 = num(params['x2'], 0.8);
        const v0 = num(params['v0'], 0.5);

        h.photogate1.position.set(-1.2 + x1 * 1.8, TRACK_TOP_Y - 0.05, 0);
        h.photogate2.position.set(-1.2 + x2 * 1.8, TRACK_TOP_Y - 0.05, 0);

        setLabel(h.infoLabel, `v₀ = ${v0.toFixed(2)} m/s | x₁=${x1.toFixed(2)}m, x₂=${x2.toFixed(2)}m`, '#0284c7');
    },

    getVisualPosition(pos, _params) {
        // 滑块沿导轨气膜无摩擦平稳滑动
        return new THREE.Vector3(-1.2 + pos.x * WORLD_SCALE, TRACK_TOP_Y + BALL_RADIUS, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(-1.2, TRACK_TOP_Y + BALL_RADIUS, 0);
    }
};

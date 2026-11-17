/**
 * 碰撞与动量守恒 rig — 精密低摩擦碰撞导轨 + 双光电门测速 + 动量守恒标牌
 * 用于 collision、momentum、projectile-collision
 */
import * as THREE from 'three';
import { PHYSICS_CONSTANTS, type SimulationResult } from 'physics-core';
import { SceneRig } from '../EquipmentStage';
import { createLinearTrack, LinearTrackHandles } from '../equipment/linearTrack';
import { makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.18;
const TRACK_Y = 0.17;

export interface CollisionHandles {
    trackHandles: LinearTrackHandles;
    infoLabel: THREE.Sprite;
}

/** 格式化碰撞与平抛碰撞 3D 标牌文本 (有引擎结果时优先读取带符号水平位移 OM_signed / ON_signed) */
function formatCollisionBanner(params: Record<string, number>, result?: SimulationResult | null): string {
    const mv = result?.diagnostics?.maxValues;
    if (
        mv &&
        typeof mv['OP'] === 'number' &&
        typeof mv['OM_signed'] === 'number' &&
        typeof mv['ON_signed'] === 'number'
    ) {
        const pBefore =
            typeof mv['pBefore'] === 'number' ? mv['pBefore'] : num(params['m1'], 0.1) * num(params['v1Initial'], 2);
        return `动量 P=${pBefore.toFixed(2)} kg·m/s | OP=${mv['OP'].toFixed(2)}m · OM(Δx₁)=${mv['OM_signed'].toFixed(2)}m · ON(Δx₂)=${mv['ON_signed'].toFixed(2)}m`;
    }
    if ('v1Initial' in params && 'tableHeight' in params) {
        const m1 = num(params['m1'], 0.1);
        const m2 = num(params['m2'], 0.1);
        const v1 = num(params['v1Initial'], 2);
        const h = num(params['tableHeight'], 0.8);
        const e = num(params['restitution'], 1);
        const g = num(params['gravity'], PHYSICS_CONSTANTS.g.value);
        const tFall = Math.sqrt((2 * h) / Math.max(1e-6, g));
        const op = v1 * tFall;
        const omSigned = ((m1 - e * m2) / Math.max(1e-6, m1 + m2)) * v1 * tFall;
        const onSigned = (((1 + e) * m1) / Math.max(1e-6, m1 + m2)) * v1 * tFall;
        const pBefore = m1 * v1;
        return `动量 P=${pBefore.toFixed(2)} kg·m/s | OP=${op.toFixed(2)}m · OM(Δx₁)=${omSigned.toFixed(2)}m · ON(Δx₂)=${onSigned.toFixed(2)}m`;
    }
    const m1 = num(params['m1'], 1);
    const m2 = num(params['m2'], 1);
    const v1 = num(params['v1'], 2);
    const v2 = num(params['v2'], 0);
    const pTotal = m1 * v1 + m2 * v2;
    return `总动量 P = m₁v₁ + m₂v₂ = ${pTotal.toFixed(2)} kg·m/s | 碰撞动量守恒`;
}

export const collisionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: BALL_RADIUS,
    clampToGround: true,

    buildEquipment(scene, params, result) {
        // 1. 碰撞实验精密导轨 (带两端防撞与标尺)
        const { group, handles: trackHandles } = createLinearTrack(5.6, 0.32, 0.14, [1.6, 4.0]);
        group.position.set(0, 0, 0);
        scene.add(group);

        // 2. 动量守恒标牌
        const infoLabel = makeTextSprite(formatCollisionBanner(params, result), '#059669', 24, { x: 1.5, y: 0.22 });
        infoLabel.position.set(0, 0.65, 0.35);
        scene.add(infoLabel);

        return {
            group,
            handles: { trackHandles, infoLabel }
        };
    },

    updateEquipment(handles, params, result) {
        const h = handles as CollisionHandles;
        setLabel(h.infoLabel, formatCollisionBanner(params, result), '#059669');
    },

    getVisualPosition(pos, _params) {
        // 双球严格沿导轨中心线对心正碰
        return new THREE.Vector3(pos.x * WORLD_SCALE, TRACK_Y + BALL_RADIUS, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, TRACK_Y + BALL_RADIUS, 0);
    }
};

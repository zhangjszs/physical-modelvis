/**
 * 气垫导轨测速度 rig — 真实三角截面气轨 + 双可调光电门 + 滑块(含挡光片) + 标牌
 * 用于 air-track（测速度、测量遮光时间 Δt）
 *
 * 口径统一 (#159 逐节审计·问题二·严重):
 *   旧实现把滑块放在 `-1.2 + pos.x × 0.16` (WORLD_SCALE), 把光电门放在
 *   `-1.2 + x₁ × 1.8` —— 两者比例系数差 **11.25 倍**, 滑块全程到不了任何一扇门,
 *   「遮光计时测速度」这个实验在 3D 里彻底失效。
 *   现在统一用「导轨世界长度 ÷ 导轨物理长度」这一条换算:
 *       worldX(m) = -TRACK_WORLD_LENGTH/2 + m × (TRACK_WORLD_LENGTH / trackLength)
 *   滑块与光电门共用, 与 2D 板的 `pixelsPerMeter = trackScreenW / trackLength` 同源。
 */
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import { SceneRig } from '../EquipmentStage';
import { createAirTrack } from '../equipment/airTrack';
import { createPhotogate } from '../equipment/photogate';
import { makeBox, makeTextSprite } from '../primitives';
import { computePhotogateMeasurements } from '../../../utils/photogate';
import { findFrameIndex, interpolateFrame } from '../../../utils/frameUtils';
import { num, setLabel } from './params';

/** 导轨的世界长度 (与 createAirTrack(3.6) 一致) */
const TRACK_WORLD_LENGTH = 3.6;
/** 导轨上表面高度 (createAirTrack: 主体 0.12 厚, 中心 y=0.4) */
const TRACK_TOP_Y = 0.46;
const GLIDER_HEIGHT = 0.14;
const GLIDER_WIDTH = 0.32;
/** 挡光片世界宽度 (与挡光片物理宽度的换算共用同一比例) */
const FLAG_COLOR = 0xef4444;

interface AirTrackHandles {
    trackGroup: THREE.Group;
    photogate1: THREE.Group;
    photogate2: THREE.Group;
    gateBeams: THREE.Mesh[];
    gliderGroup: THREE.Group;
    flagMesh: THREE.Mesh;
    infoLabel: THREE.Sprite;
}

/** 米 → 世界单位 的换算比例 (导轨世界长度 / 导轨物理长度) */
export function airTrackUnitsPerMeter(params: Record<string, number>): number {
    const trackLength = Math.max(0.1, num(params['trackLength'], 1.5));
    return TRACK_WORLD_LENGTH / trackLength;
}

/** 物理位置 (m) → 3D 世界 x */
export function airTrackWorldX(meters: number, params: Record<string, number>): number {
    return -TRACK_WORLD_LENGTH / 2 + meters * airTrackUnitsPerMeter(params);
}

export const airTrackRig: SceneRig = {
    worldScale: 1,
    // 滑块由 rig 自绘 (含挡光片), 舞台不再叠加默认小球
    ownParticles: true,
    clampToGround: false,

    /** 自定义取景: 导轨摆在 x≈0 (舞台中心在 3.6), 通用取景会看偏 */
    framing() {
        const target: [number, number, number] = [0, TRACK_TOP_Y, 0];
        const distance = 4.6;
        return {
            target,
            position: [target[0] + distance * 0.3, target[1] + distance * 0.34, distance * 0.9],
            distance
        };
    },

    buildEquipment(scene, params) {
        // 1. 气垫导轨
        const { group: trackGroup } = createAirTrack(TRACK_WORLD_LENGTH);
        trackGroup.position.set(0, 0, 0);
        scene.add(trackGroup);

        // 2. 双光电门 (位置与滑块共用同一米→世界换算)
        const pg1 = createPhotogate();
        scene.add(pg1.group);
        const pg2 = createPhotogate();
        scene.add(pg2.group);

        // 3. 滑块 + 挡光片 (rig 自绘质点)
        const gliderGroup = new THREE.Group();
        const body = makeBox(GLIDER_WIDTH, GLIDER_HEIGHT, 0.2, 0x2563eb, 0.4, 0.3);
        body.position.y = GLIDER_HEIGHT / 2;
        gliderGroup.add(body);
        const flagMesh = makeBox(0.02, 0.16, 0.02, FLAG_COLOR, 0.4, 0.2);
        flagMesh.position.set(0, GLIDER_HEIGHT + 0.08, 0);
        gliderGroup.add(flagMesh);
        scene.add(gliderGroup);

        // 4. 测量说明标牌
        const infoLabel = makeTextSprite('', '#0284c7', 26, { x: 2.6, y: 0.22 });
        infoLabel.position.set(0, TRACK_TOP_Y + 0.55, 0.35);
        scene.add(infoLabel);

        const group = new THREE.Group();
        const handles: AirTrackHandles = {
            trackGroup,
            photogate1: pg1.group,
            photogate2: pg2.group,
            gateBeams: [pg1.handles.beam, pg2.handles.beam],
            gliderGroup,
            flagMesh,
            infoLabel
        };

        updateAirTrack(handles, params, null, 0);

        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        updateAirTrack(handles as AirTrackHandles, params, result ?? null, Number.NaN);
    },

    getVisualPosition(pos, params) {
        return new THREE.Vector3(airTrackWorldX(pos.x, params), TRACK_TOP_Y, 0);
    },

    getOrigin(params) {
        return new THREE.Vector3(airTrackWorldX(0, params), TRACK_TOP_Y, 0);
    },

    /** 每帧: 滑块跟随引擎位置; 光电门被挡光时点亮光束; 标牌显示遮光时间与测速 */
    onAnimate(handles, { time, params, result }) {
        if (!result) return;
        const h = handles as AirTrackHandles;
        const traj = result.trajectories[0] ?? [];
        if (traj.length === 0) return;
        const idx = findFrameIndex(result.trajectories, time);
        const p0 = traj[idx];
        const p1 = traj[Math.min(idx + 1, traj.length - 1)];
        if (!p0) return;
        const frame = p1 ? interpolateFrame(p0, p1, time) : p0;
        h.gliderGroup.position.set(airTrackWorldX(frame.position.x, params), TRACK_TOP_Y, 0);
        updateAirTrack(h, params, result, time);
    }
};

/**
 * 标牌与光电门状态更新。
 *
 * 遮光时间/测速值来自引擎轨迹 (`computePhotogateMeasurements`) —— 与 2D 板
 * 使用的是**同一个**纯函数与同一份引擎数据, 两视图口径一致。
 */
function updateAirTrack(
    h: AirTrackHandles,
    params: Record<string, number>,
    result: SimulationResult | null,
    currentTime: number
): void {
    const x1 = num(params['x1'], 0.3);
    const x2 = num(params['x2'], 0.8);
    const v0 = num(params['v0'], 0.5);
    const flagWidth = num(params['flagWidth'], 0.02);

    h.photogate1.position.set(airTrackWorldX(x1, params), TRACK_TOP_Y, 0);
    h.photogate2.position.set(airTrackWorldX(x2, params), TRACK_TOP_Y, 0);

    // 挡光片世界宽度 = 物理宽度 × (导轨世界长度 / 导轨物理长度) —— 与滑块同口径
    const flagWorldWidth = Math.max(0.01, flagWidth * airTrackUnitsPerMeter(params));
    h.flagMesh.scale.x = flagWorldWidth / 0.02;

    const traj = result?.trajectories?.[0] ?? [];
    const measurements = computePhotogateMeasurements(traj, { gatePositions: [x1, x2], flagWidth });
    const blocked = new Set<number>();
    for (const m of measurements) {
        if (
            m.valid &&
            Number.isFinite(currentTime) &&
            currentTime >= m.blockStartTime &&
            currentTime <= m.blockEndTime
        ) {
            blocked.add(m.gateIndex);
        }
    }
    h.gateBeams.forEach((beam, index) => {
        const material = beam.material;
        if (material instanceof THREE.MeshStandardMaterial) {
            material.color.set(blocked.has(index) ? 0x22c55e : 0xef4444);
        }
    });

    const parts = [`v₀=${v0.toFixed(2)}m/s`, `x₁=${x1.toFixed(2)}m`, `x₂=${x2.toFixed(2)}m`];
    measurements.forEach((m, i) => {
        if (m.valid) {
            parts.push(`G${i + 1}: Δt=${(m.deltaT * 1000).toFixed(0)}ms v=${m.speed.toFixed(3)}`);
        } else {
            parts.push(`G${i + 1}: 未通过`);
        }
    });
    setLabel(h.infoLabel, parts.join(' | '), '#0284c7');
}

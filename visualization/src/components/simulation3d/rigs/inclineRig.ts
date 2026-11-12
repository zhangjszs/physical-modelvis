/**
 * inclined-plane: 引擎笛卡尔坐标 → 斜面切向坐标, 面板覆盖本次完整有向轨迹。
 *
 * 口径修正 (#159 逐节审计·问题二·一般):
 *   旧实现把引擎位置直接当笛卡尔坐标平移 (`origin + pos × WORLD_SCALE`),
 *   而斜面是**倾斜**的 —— 物块在屏幕上的落点与斜面差一个 θ 角的旋转,
 *   物块因此悬空/陷进板面。同时斜面长度写死 (WORLD_SCALE 0.16 × 物理米),
 *   L=6 m 的斜面只有 0.96 世界单位, 尺度与器材不成比例。
 *   现在: 物块位置先投影到斜面切向 (along = x·cosθ − y·sinθ), 再按
 *   「斜面长度 → 固定世界长度」换算, 与面板几何同源。
 */
import * as THREE from 'three';
import type { SimulationResult, Vector2D } from 'physics-core';
import type { SceneRig } from '../EquipmentStage';
import {
    createInclinedPlane,
    updateInclinedPlane,
    inclinedPlaneGeometry,
    INCLINED_PLANE_THICKNESS,
    type InclinedPlaneGeometry,
    type InclinedPlaneHandles
} from '../equipment/inclinedPlane';
import { makeTextSprite } from '../primitives';
import { findFrameIndex } from '../../../utils/frameUtils';
import { num, setLabel } from './params';

/** 斜面在世界里的长度 (世界单位) —— 斜面长度 L 映射到这个长度 */
const INCLINE_WORLD_LENGTH = 2.8;
const BALL_RADIUS = 0.18;
const NORMAL_OFFSET = INCLINED_PLANE_THICKNESS / 2 + BALL_RADIUS;
// 结果不可变；弱缓存仅保存数值几何，不保留 mesh，也不在每个轨迹点/动画帧重扫采样。
const geometryCache = new WeakMap<SimulationResult, InclinedPlaneGeometry>();

interface InclineRigHandles {
    planeHandles: InclinedPlaneHandles;
    infoLabel: THREE.Sprite;
    acceleration: number | null;
}

/** 引擎斜面长度 (m): 优先读引擎 maxValues.inclineLength, 回退到场景参数 */
function inclineLengthMeters(params: Record<string, number>, result?: SimulationResult | null): number {
    const mv = result?.diagnostics?.maxValues;
    const engine = mv ? mv['inclineLength'] : undefined;
    if (typeof engine === 'number' && engine > 0) return engine;
    return Math.max(0.1, num(params['inclineLength'], 6));
}

/** 米 → 世界单位 的换算比例 */
function scaleFor(params: Record<string, number>, result?: SimulationResult | null): number {
    return INCLINE_WORLD_LENGTH / inclineLengthMeters(params, result);
}

/**
 * 斜面 rig 的米→世界单位换算比例 (导出供契约测试使用)。
 *
 * 斜面长度 L (物理米) 映射到固定的 INCLINE_WORLD_LENGTH 世界单位, 因此比例
 * 随 L 变化 —— 这正是「器材尺度与物理量级匹配」的含义 (旧版固定 0.16,
 * L=6 m 的斜面只有 0.96 世界单位)。
 */
export function inclineUnitsPerMeter(params: Record<string, number>, result?: SimulationResult | null): number {
    return scaleFor(params, result);
}

/** 引擎位置 → 沿斜面向下的位移 (m) */
function alongMeters(pos: { x: number; y: number }, angleRad: number): number {
    return pos.x * Math.cos(angleRad) - pos.y * Math.sin(angleRad);
}

function geometryFor(params: Record<string, number>, result?: SimulationResult | null) {
    const cached = result && geometryCache.get(result);
    if (cached) return cached;
    // 参数面板有防抖重算窗口：新参数不能旋转旧结果的板与坐标系。
    const resultTheta = result?.explanation.formulas.find(usage => usage.variables['θ'])?.variables['θ']?.value;
    const theta = resultTheta ?? num(params['theta'] ?? params['angle'], 30);
    const rad = (theta * Math.PI) / 180;
    const scale = scaleFor(params, result);
    let min = 0;
    let max = 0;
    for (const point of result?.trajectories[0] ?? []) {
        const along = alongMeters(point.position, rad) * scale;
        min = Math.min(min, along);
        max = Math.max(max, along);
    }
    const geometry = inclinedPlaneGeometry(theta, min, max);
    if (result && resultTheta !== undefined) geometryCache.set(result, geometry);
    return geometry;
}

/** 标牌挂在斜面顶端上方, 不压住板面 */
function labelHeightFor(geometry: InclinedPlaneGeometry): number {
    return geometry.centerY + (geometry.length / 2) * Math.sin(geometry.angleRad) + 0.45;
}

function updateAcceleration(handles: InclineRigHandles, angleRad: number, acceleration?: Vector2D) {
    const along = acceleration ? acceleration.x * Math.cos(angleRad) - acceleration.y * Math.sin(angleRad) : null;
    handles.acceleration = along;
    setLabel(handles.infoLabel, `a = ${along === null ? '—' : along.toFixed(2)} m/s²`, '#2563eb');
}

export const inclineRig: SceneRig = {
    worldScale: 1,
    ballRadius: BALL_RADIUS,

    /** 自定义取景: 斜面板摆在 x≈0 (舞台中心在 3.6), 通用取景会看偏 */
    framing(params, result) {
        const geometry = geometryFor(params, result);
        const target: [number, number, number] = [0, geometry.centerY, 0];
        const distance = 4.4;
        return {
            target,
            position: [target[0] + distance * 0.34, target[1] + distance * 0.3, distance * 0.9],
            distance
        };
    },

    buildEquipment(_scene, params, result) {
        const geometry = geometryFor(params, result);
        const { group, handles: planeHandles } = createInclinedPlane(geometry);
        const infoLabel = makeTextSprite('', '#2563eb', 30, { x: 1.9, y: 0.25 });
        infoLabel.position.set(0, labelHeightFor(geometry), 0.6);
        group.add(infoLabel);
        const handles: InclineRigHandles = { planeHandles, infoLabel, acceleration: null };
        updateAcceleration(handles, geometry.angleRad, result?.trajectories[0]?.[0]?.acceleration);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        const h = handles as InclineRigHandles;
        const geometry = geometryFor(params, result);
        updateInclinedPlane(h.planeHandles, geometry);
        h.infoLabel.position.set(0, labelHeightFor(geometry), 0.6);
        updateAcceleration(h, geometry.angleRad, result?.trajectories[0]?.[0]?.acceleration);
    },

    getVisualPosition(pos, params, result) {
        const { origin, angleRad } = geometryFor(params, result);
        const scale = scaleFor(params, result);
        const alongWorld = alongMeters(pos, angleRad) * scale;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        // 沿切向平移 + 沿法向抬离板面 (物块坐在斜面上表面)
        return new THREE.Vector3(
            origin.x + alongWorld * cos + sin * NORMAL_OFFSET,
            origin.y - alongWorld * sin + cos * NORMAL_OFFSET,
            0
        );
    },

    getOrigin(params, result) {
        // 轨迹起点 (斜面顶端) 的 3D 位置
        const first = result?.trajectories?.[0]?.[0]?.position;
        if (first) return this.getVisualPosition(first, params, result);
        const { origin, angleRad } = geometryFor(params, result);
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        return new THREE.Vector3(origin.x + sin * NORMAL_OFFSET, origin.y + cos * NORMAL_OFFSET, 0);
    },

    onAnimate(handles, { time, params, result }) {
        if (!result) return;
        const h = handles as InclineRigHandles;
        const acceleration = result.trajectories[0]?.[findFrameIndex(result.trajectories, time)]?.acceleration;
        if (!acceleration) return;
        const angleRad = geometryFor(params, result).angleRad;
        const along = acceleration.x * Math.cos(angleRad) - acceleration.y * Math.sin(angleRad);
        if (along !== h.acceleration) updateAcceleration(h, angleRad, acceleration);
    }
};

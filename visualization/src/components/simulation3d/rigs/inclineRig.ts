/** inclined-plane：引擎笛卡尔 XY 等比映射，展示板覆盖本次完整有向轨迹。 */
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

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.18;
const NORMAL_OFFSET = INCLINED_PLANE_THICKNESS / 2 + BALL_RADIUS;
// 结果不可变；弱缓存仅保存数值几何，不保留 mesh，也不在每个轨迹点/动画帧重扫采样。
const geometryCache = new WeakMap<SimulationResult, InclinedPlaneGeometry>();

interface InclineRigHandles {
    planeHandles: InclinedPlaneHandles;
    infoLabel: THREE.Sprite;
    acceleration: number | null;
}

function geometryFor(params: Record<string, number>, result?: SimulationResult | null) {
    const cached = result && geometryCache.get(result);
    if (cached) return cached;
    // 参数面板有防抖重算窗口：新参数不能旋转旧结果的板与坐标系。
    const resultTheta = result?.explanation.formulas.find(usage => usage.variables['θ'])?.variables['θ']?.value;
    const theta = resultTheta ?? num(params['theta'] ?? params['angle'], 30);
    const rad = (theta * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    let min = 0;
    let max = 0;
    for (const point of result?.trajectories[0] ?? []) {
        const along = (point.position.x * cos - point.position.y * sin) * WORLD_SCALE;
        min = Math.min(min, along);
        max = Math.max(max, along);
    }
    const geometry = inclinedPlaneGeometry(theta, min, max);
    if (result && resultTheta !== undefined) geometryCache.set(result, geometry);
    return geometry;
}

function updateAcceleration(handles: InclineRigHandles, angleRad: number, acceleration?: Vector2D) {
    const along = acceleration ? acceleration.x * Math.cos(angleRad) - acceleration.y * Math.sin(angleRad) : null;
    handles.acceleration = along;
    setLabel(handles.infoLabel, `a = ${along === null ? '—' : along.toFixed(2)} m/s²`, '#2563eb');
}

export const inclineRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: BALL_RADIUS,

    buildEquipment(_scene, params, result) {
        const geometry = geometryFor(params, result);
        const { group, handles: planeHandles } = createInclinedPlane(geometry);
        const infoLabel = makeTextSprite('', '#2563eb', 24, { x: 2.3, y: 0.3 });
        infoLabel.position.set(0, geometry.centerY + 0.8, 0.6);
        group.add(infoLabel);
        const handles: InclineRigHandles = { planeHandles, infoLabel, acceleration: null };
        updateAcceleration(handles, geometry.angleRad, result?.trajectories[0]?.[0]?.acceleration);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        const h = handles as InclineRigHandles;
        const geometry = geometryFor(params, result);
        updateInclinedPlane(h.planeHandles, geometry);
        h.infoLabel.position.set(0, geometry.centerY + 0.8, 0.6);
        updateAcceleration(h, geometry.angleRad, result?.trajectories[0]?.[0]?.acceleration);
    },

    getVisualPosition(pos, params, result) {
        const { origin, angleRad } = geometryFor(params, result);
        return new THREE.Vector3(
            origin.x + pos.x * WORLD_SCALE + Math.sin(angleRad) * NORMAL_OFFSET,
            origin.y + pos.y * WORLD_SCALE + Math.cos(angleRad) * NORMAL_OFFSET,
            0
        );
    },

    getOrigin(params, result) {
        return this.getVisualPosition({ x: 0, y: 0 }, params, result);
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

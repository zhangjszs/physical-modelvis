/**
 * 带电粒子在匀强电场中的偏转 rig — 平行偏转极板 + 电子枪发射口 + 荧光接收屏
 *
 * 口径修正 (#159 逐节审计 · 问题一·物理 / 问题二·视觉 · 阻断):
 *   1. 标牌读的是场景里**不存在的**参数 `params['U'] ?? params['voltage']` (回退 100 V)
 *      与 `params['v0']` (回退 20 m/s, 真实 v₀x = 5 m/s) —— 标牌与引擎毫无关系;
 *   2. 比例写死 WORLD_SCALE = 0.16, 极板长 2.8 世界单位 = 17.5 m 物理长度,
 *      与真实轨迹尺度对不上;
 *   3. 极板 +/− 极性写死 (+ 在上板), 与引擎的 E = (0, Ey) 方向相反;
 *   4. 场线箭头写死向下, Ey < 0 时与引擎相反;
 *   5. 相机沿用通用自动取景 (舞台中心 x≈3.6), 器材在 x≈0 → 画面偏左、标牌出框。
 *
 * 现在:
 *   - 比例由**引擎轨迹跨度**推导 (水平跨度 → 极板长度; 竖直偏移 → 板间距);
 *   - 板间距随偏转量自适应 (粒子永远落在板间), 极性与场方向绑定;
 *   - 标牌读引擎 q/m/a/v/x/y 与 maxValues, 不再回退到不存在的参数;
 *   - 显式 framing 把器材摆到画面中心。
 */
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import type { SceneRig } from '../EquipmentStage';
import {
    createDeflectionPlates,
    updateDeflectionPlateGeometry,
    updateDeflectionPolarity,
    type DeflectionPlatesHandles
} from '../equipment/deflectionPlates';
import { makeLabelSprite, setSpriteGlyphHeight } from '../primitives';
import { num, setLabel } from './params';

/** 极板世界长度 (世界单位) */
const PLATE_LENGTH = 2.8;
/** 极板世界宽度 */
const PLATE_WIDTH = 1.1;
/** 场区中心的世界高度 */
const FIELD_CENTER_Y = 1.5;
/** 粒子球半径 (相对极板尺寸要小 —— 粒子只是「带电小球」) */
const PARTICLE_RADIUS = 0.1;
/** 板间半间距上限 / 下限 (世界单位) */
const HALF_GAP_MAX = 0.9;
const HALF_GAP_MIN = 0.45;
/** 读数标牌字高 (世界单位) */
const LABEL_GLYPH_HEIGHT = 0.085;

/** 复用的临时向量 (零内存分配) */
const _up = new THREE.Vector3(0, 1, 0);

export interface ElectricFieldHandles {
    plateHandles: DeflectionPlatesHandles;
    fieldArrows: THREE.ArrowHelper[];
    conditionLabel: THREE.Sprite;
    stateLabel: THREE.Sprite;
}

/** 3D 标牌读数 — 单一真源: 引擎轨迹 + 引擎 maxValues */
export interface ElectricFieldRigReadouts {
    source: 'engine' | 'fallback';
    /** 当前物理时刻 (s) */
    t: number;
    /** 电荷量 (C) */
    q: number;
    /** 质量 (kg) */
    m: number;
    /** 电场强度 y 分量 (N/C) */
    Ey: number;
    /** 比荷 q/m (C/kg) */
    chargeToMass: number;
    /** 加速度 a = qE/m (m/s²) */
    a: number;
    /** 水平位移 (m) */
    x: number;
    /** 竖直位移 (m) */
    y: number;
    /** 速率 (m/s) */
    v: number;
    /** 引擎给出的最大速率 (m/s) */
    maxSpeed: number;
    /** 引擎给出的最大位移 (m) */
    maxDistance: number;
}

/**
 * 3D 标牌读数 — 与 2D 板书各自导出一份 (渲染层不跨层共享)。
 *
 * 无引擎结果时按解析式兜底, 保证「未运行仿真」时标牌也有意义。
 */
export function electricFieldRigReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    currentTime: number
): ElectricFieldRigReadouts {
    const q = (params['charge'] ?? 2) * 1e-8;
    const m = (params['mass'] ?? 2) * 1e-7;
    const Ey = params['Ey'] ?? 10;
    const v0x = params['v0x'] ?? 4;
    const v0y = params['v0y'] ?? 0;
    const a = (q * Ey) / m;

    const traj = result?.trajectories?.[0] ?? [];
    let maxX = 0;
    let maxY = 0;
    for (const p of traj) {
        maxX = Math.max(maxX, Math.abs(p.position.x));
        maxY = Math.max(maxY, Math.abs(p.position.y));
    }

    const frame = traj.length > 0 ? frameAt(traj, currentTime) : null;
    const source: 'engine' | 'fallback' = frame ? 'engine' : 'fallback';
    const x = frame ? frame.position.x : v0x * currentTime;
    const y = frame ? frame.position.y : v0y * currentTime + 0.5 * a * currentTime * currentTime;
    const vx = frame ? frame.velocity.x : v0x;
    const vy = frame ? frame.velocity.y : v0y + a * currentTime;

    const mv = result?.diagnostics?.maxValues;
    return {
        source,
        t: currentTime,
        q,
        m,
        Ey,
        chargeToMass: q / m,
        a,
        x,
        y,
        v: Math.hypot(vx, vy),
        maxSpeed: typeof mv?.maxSpeed === 'number' ? mv.maxSpeed : Math.hypot(vx, vy),
        maxDistance: typeof mv?.maxDistance === 'number' ? mv.maxDistance : Math.hypot(x, y)
    };
}

/** 引擎轨迹上按时间线性插值取一帧 (避免每帧二分 + 插值两段开销) */
function frameAt(
    traj: NonNullable<SimulationResult['trajectories']>[number],
    t: number
): { position: { x: number; y: number }; velocity: { x: number; y: number } } | null {
    if (traj.length === 0) return null;
    let lo = 0;
    let hi = traj.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (traj[mid]!.t < t) lo = mid + 1;
        else hi = mid;
    }
    const p1 = traj[lo]!;
    const p0 = traj[Math.max(0, lo - 1)]!;
    const alpha = p0.t === p1.t ? 0 : (t - p0.t) / (p1.t - p0.t);
    return {
        position: {
            x: p0.position.x + alpha * (p1.position.x - p0.position.x),
            y: p0.position.y + alpha * (p1.position.y - p0.position.y)
        },
        velocity: {
            x: p0.velocity.x + alpha * (p1.velocity.x - p0.velocity.x),
            y: p0.velocity.y + alpha * (p1.velocity.y - p0.velocity.y)
        }
    };
}

/** 引擎轨迹的水平跨度与竖直偏移 (m) */
function trajectorySpan(
    params: Record<string, number>,
    result?: SimulationResult | null
): { maxX: number; maxY: number } {
    const traj = result?.trajectories?.[0] ?? [];
    let maxX = 0;
    let maxY = 0;
    for (const p of traj) {
        maxX = Math.max(maxX, Math.abs(p.position.x));
        maxY = Math.max(maxY, Math.abs(p.position.y));
    }
    if (maxX === 0 && maxY === 0) {
        // 无引擎结果: 用参数粗估 (v₀x·t, ½at²)
        const q = (params['charge'] ?? 2) * 1e-8;
        const m = (params['mass'] ?? 2) * 1e-7;
        const a = (q * (params['Ey'] ?? 10)) / m;
        const t = params['duration'] ?? 1.5;
        maxX = Math.abs((params['v0x'] ?? 4) * t);
        maxY = Math.abs(0.5 * a * t * t);
    }
    return { maxX, maxY };
}

/** 3D 布局: 米→世界单位比例 + 板间距 (全部由引擎轨迹推导) */
interface EFieldLayout {
    /** 米 → 世界单位 */
    scale: number;
    /** 板间半间距 (世界单位) */
    halfGap: number;
    /** 板间距 (世界单位) */
    plateDistance: number;
}

function layoutFor(params: Record<string, number>, result?: SimulationResult | null): EFieldLayout {
    const { maxX, maxY } = trajectorySpan(params, result);
    let scale = PLATE_LENGTH / Math.max(maxX, 0.5);
    const need = Math.max(maxY, 0.2) * scale;
    // 偏转量超出板间上限时收紧比例 (宁可轨迹短一点, 也不能穿出极板)
    if (need > HALF_GAP_MAX) scale = HALF_GAP_MAX / Math.max(maxY, 0.2);
    const deflectWorld = Math.max(maxY, 0.2) * scale;
    const halfGap = Math.min(HALF_GAP_MAX, Math.max(HALF_GAP_MIN, deflectWorld * 1.3));
    return { scale, halfGap, plateDistance: halfGap * 2 };
}

/** 3D rig 的米→世界单位换算比例 (导出供契约测试使用) */
export function electricFieldUnitsPerMeter(params: Record<string, number>, result?: SimulationResult | null): number {
    return layoutFor(params, result).scale;
}

function conditionText(read: ElectricFieldRigReadouts): string {
    const qSign = read.q >= 0 ? '+' : '−';
    return (
        `q = ${qSign}${(Math.abs(read.q) * 1e8).toFixed(2)}×10⁻⁸ C   ` +
        `q/m = ${read.chargeToMass.toFixed(3)} C/kg   a = ${read.a.toFixed(2)} m/s²`
    );
}

function stateText(read: ElectricFieldRigReadouts): string {
    return (
        `E = ${read.Ey.toFixed(1)} N/C   t = ${read.t.toFixed(2)} s   ` +
        `x = ${read.x.toFixed(2)} m   y = ${read.y.toFixed(3)} m   v = ${read.v.toFixed(2)} m/s`
    );
}

export const electricFieldRig: SceneRig = {
    worldScale: 1,
    ballRadius: PARTICLE_RADIUS,
    clampToGround: false,

    /** 显式取景: 器材摆在 x≈0 (舞台中心在 3.6), 通用自动取景会看偏 */
    framing() {
        // 器材 (电子枪 -1.95 ~ 荧光屏 +2.05) 摆在 x≈0, 舞台中心在 3.6 → 必须显式取景
        const target: [number, number, number] = [0.05, FIELD_CENTER_Y, 0];
        const distance = 6.2;
        return {
            target,
            position: [target[0] + distance * 0.24, target[1] + distance * 0.28, distance * 0.93],
            distance
        };
    },

    buildEquipment(scene, params, result) {
        const layout = layoutFor(params, result);
        const { group, handles: plateHandles } = createDeflectionPlates(
            PLATE_LENGTH,
            PLATE_WIDTH,
            layout.plateDistance,
            FIELD_CENTER_Y
        );
        scene.add(group);

        // 极板间电场线箭头 (方向 = E 方向, 长度随板间距)
        const fieldArrows: THREE.ArrowHelper[] = [];
        for (let i = -2; i <= 2; i++) {
            const arrow = new THREE.ArrowHelper(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(i * 0.5, FIELD_CENTER_Y, 0),
                0.5,
                0x3b82f6,
                0.12,
                0.08
            );
            group.add(arrow);
            fieldArrows.push(arrow);
        }

        const conditionLabel = makeLabelSprite('', '#2563eb', 26, LABEL_GLYPH_HEIGHT);
        conditionLabel.position.set(0, FIELD_CENTER_Y + layout.halfGap + 0.42, 0.6);
        group.add(conditionLabel);

        const stateLabel = makeLabelSprite('', '#0f766e', 24, LABEL_GLYPH_HEIGHT);
        stateLabel.position.set(0, FIELD_CENTER_Y - layout.halfGap - 0.42, 0.6);
        group.add(stateLabel);

        // 器材自带的「偏转电压 U」标牌在本场景没有对应参数 (无 U), 隐藏避免误导
        plateHandles.voltageLabel.visible = false;

        const handles: ElectricFieldHandles = { plateHandles, fieldArrows, conditionLabel, stateLabel };
        applyLayout(handles, layout, params, result, 0);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        const h = handles as ElectricFieldHandles;
        const layout = layoutFor(params, result);
        applyLayout(h, layout, params, result, 0);
    },

    getVisualPosition(pos, params, result) {
        const { scale } = layoutFor(params, result);
        // 电子从电子枪注入 (极板左端), 在电场中发生竖直偏转
        return new THREE.Vector3(-PLATE_LENGTH / 2 + pos.x * scale, FIELD_CENTER_Y + pos.y * scale, 0);
    },

    getOrigin(_params, _result) {
        // 轨迹起点 (电子枪出口 = 极板左端中点)
        return new THREE.Vector3(-PLATE_LENGTH / 2, FIELD_CENTER_Y, 0);
    },

    onAnimate(handles, ctx) {
        const h = handles as ElectricFieldHandles;
        const read = electricFieldRigReadouts(ctx.params, ctx.result, ctx.time);
        setLabelOnce(h.conditionLabel, conditionText(read), '#2563eb');
        setLabelOnce(h.stateLabel, stateText(read), '#0f766e');
    }
};

/** 文本不变时不重绘贴图 (每帧调用, 避免无谓的 canvas 重绘) */
function setLabelOnce(sprite: THREE.Sprite, text: string, color: string): void {
    if (sprite.userData.text === text) return;
    setLabel(sprite, text, color);
    // 固定字高 (世界单位) —— 文本长度变化时标牌等比变宽, 不撑破版面
    setSpriteGlyphHeight(sprite, LABEL_GLYPH_HEIGHT);
}

/** 应用布局: 板间距 / 极性 / 场线箭头方向 / 标牌 */
function applyLayout(
    handles: ElectricFieldHandles,
    layout: EFieldLayout,
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    time: number
): void {
    updateDeflectionPlateGeometry(handles.plateHandles, layout.plateDistance);
    const Ey = num(params['Ey'], 10);
    // E = (0, Ey): Ey>0 → 场线向上 → 下板为正极
    updateDeflectionPolarity(handles.plateHandles, Ey < 0);
    const arrowLen = Math.max(0.2, layout.halfGap * 1.2);
    handles.fieldArrows.forEach(arrow => {
        const dir = Ey >= 0 ? 1 : -1;
        arrow.setDirection(_up.set(0, dir, 0));
        arrow.position.set(arrow.position.x, FIELD_CENTER_Y - (dir * arrowLen) / 2, 0);
        arrow.setLength(arrowLen, 0.12, 0.08);
    });
    const read = electricFieldRigReadouts(params, result ?? null, time);
    setLabelOnce(handles.conditionLabel, conditionText(read), '#2563eb');
    setLabelOnce(handles.stateLabel, stateText(read), '#0f766e');
}

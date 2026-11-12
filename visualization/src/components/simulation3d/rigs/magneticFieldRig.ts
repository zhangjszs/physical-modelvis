/**
 * 带电粒子在匀强磁场中的回旋 rig — 圆形磁腔 + 出纸面符号 + 洛伦兹力矢量
 *
 * 口径修正 (#159 逐节审计 · 问题一·物理 / 问题二·视觉 · 阻断):
 *   1. 符号方向反了: 引擎 `uniform-magnetic-field` 只读 `fieldStrength` (恒 +z,
 *      即**垂直纸面向外 ⊙**), 旧 rig 却满屏画 ⊗ (向里) —— 画的场与算的场相反;
 *   2. 标牌读 `params['v'] ?? params['v0']` (场景里都不存在) → 回退 1.0×10⁶ m/s,
 *      真实 v₀ = 1000 m/s, 错 1000 倍;
 *   3. 比例写死 0.16, 默认回旋半径 1.04 mm → 轨道世界半径 1.7×10⁻⁴ 单位,
 *      而默认球半径 0.22 (轨道的 1300 倍) → 只看得到一颗静止大球;
 *   4. 相机沿用通用自动取景 (舞台中心 x≈3.6), 磁腔在 x≈0 → 画面偏左、标牌出框。
 *
 * 现在: 轨道比例由引擎 `maxValues.cyclotronRadius` 推导 (轨道占磁腔 2/3),
 * 圆心对齐引擎圆心, 符号画成 ⊙, 标牌读引擎 R/T/v/角度。
 */
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import type { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeLabelSprite, setSpriteGlyphHeight } from '../primitives';
import { setLabel } from './params';

/** 磁腔半径 (世界单位) */
const CHAMBER_RADIUS = 1.6;
/**
 * 磁腔中心的世界高度 —— 必须让磁腔整体抬到地面之上:
 * 腔体半径 1.6, 中心放 1.5 时腔底会插进地面 (y=0), 底部读数标牌也会被地面遮掉。
 */
export const MAGNETIC_FIELD_CENTER_Y = 2.0;
/** 轨道半径占磁腔的比例 */
const ORBIT_RATIO = 0.66;
/** 粒子球半径 */
const PARTICLE_RADIUS = 0.09;
/** ⊙ 符号网格间距 (世界单位) */
const SYMBOL_GAP = 0.38;
/** 读数标牌字高 (世界单位) */
const LABEL_GLYPH_HEIGHT = 0.085;

export interface MFieldHandles {
    chamber: THREE.Mesh;
    boundary: THREE.Line;
    /** 引擎回旋半径还原出的轨道圆 (虚线) */
    orbit: THREE.Line;
    symbols: THREE.Group;
    lorentzArrow: THREE.ArrowHelper;
    collimator: THREE.Mesh;
    conditionLabel: THREE.Sprite;
    stateLabel: THREE.Sprite;
}

/** 3D 标牌读数 — 单一真源: 引擎轨迹 + 引擎 maxValues */
export interface MagneticFieldRigReadouts {
    source: 'engine' | 'fallback';
    /** 当前物理时刻 (s) */
    t: number;
    /** 电荷量 (C) */
    q: number;
    /** 质量 (kg) */
    m: number;
    /** 磁感应强度 (T) */
    B: number;
    /** 回旋半径 (m) */
    radius: number;
    /** 回旋周期 (s) */
    period: number;
    /** 累计回旋角 (rad, 顺时针为正) */
    angle: number;
    /** 速率 (m/s) */
    v: number;
    /** 水平位置 (m) */
    x: number;
    /** 竖直位置 (m) */
    y: number;
    /** 洛伦兹力大小 (N) */
    force: number;
}

/**
 * 3D 标牌读数 — 与 2D 板书各自导出一份 (渲染层不跨层共享)。
 */
export function magneticFieldRigReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    currentTime: number
): MagneticFieldRigReadouts {
    const q = (params['charge'] ?? 2) * 1e-6;
    const m = (params['mass'] ?? 2) * 1e-8;
    const B = params['Bz'] ?? 0.5;
    const v0x = params['v0x'] ?? 25;
    const v0y = params['v0y'] ?? 0;
    const v0 = Math.hypot(v0x, v0y);

    const mv = result?.diagnostics?.maxValues;
    const engineR = typeof mv?.cyclotronRadius === 'number' ? mv.cyclotronRadius : 0;
    const engineT = typeof mv?.cyclotronPeriod === 'number' ? mv.cyclotronPeriod : 0;
    const radius = engineR > 0 ? engineR : v0 > 0 ? (m * v0) / (Math.abs(q) * Math.abs(B)) : 0;
    const period = engineT > 0 ? engineT : Math.abs(q * B) > 0 ? (2 * Math.PI * m) / (Math.abs(q) * Math.abs(B)) : 0;

    const sign = q * B > 0 ? 1 : -1;
    const angle = radius > 0 ? ((v0 * currentTime) / radius) * sign : 0;

    const traj = result?.trajectories?.[0] ?? [];
    let x = 0;
    let y = 0;
    let v = v0;
    let source: 'engine' | 'fallback' = 'fallback';
    if (traj.length > 0) {
        const frame = frameAt(traj, currentTime);
        if (frame) {
            source = 'engine';
            x = frame.position.x;
            y = frame.position.y;
            v = Math.hypot(frame.velocity.x, frame.velocity.y);
        }
    }

    return {
        source,
        t: currentTime,
        q,
        m,
        B,
        radius,
        period,
        angle,
        v,
        x,
        y,
        force: Math.abs(q) * v * Math.abs(B)
    };
}

/** 引擎轨迹上按时间线性插值取一帧 */
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

/** 引擎圆心 (与 `uniform-magnetic-field` 同口径: 正电荷 + B 出纸面 → 圆心在速度右侧) */
function engineCenter(params: Record<string, number>): { x: number; y: number; sign: number } {
    const q = (params['charge'] ?? 2) * 1e-6;
    const B = params['Bz'] ?? 0.5;
    const v0x = params['v0x'] ?? 25;
    const v0y = params['v0y'] ?? 0;
    const v0 = Math.hypot(v0x, v0y) || 1;
    const sign = q * B > 0 ? 1 : -1;
    return { x: (sign * v0y) / v0, y: (-sign * v0x) / v0, sign };
}

/** 3D 布局: 米→世界单位比例 + 引擎圆心 (引擎坐标系) */
interface MFieldLayout {
    /** 米 → 世界单位 */
    scale: number;
    /** 引擎圆心 x (m) */
    engineCenterX: number;
    /** 引擎圆心 y (m) */
    engineCenterY: number;
}

function layoutFor(params: Record<string, number>, result?: SimulationResult | null): MFieldLayout {
    const mv = result?.diagnostics?.maxValues;
    const engineR = typeof mv?.cyclotronRadius === 'number' ? mv.cyclotronRadius : 0;
    const q = (params['charge'] ?? 2) * 1e-6;
    const m = (params['mass'] ?? 2) * 1e-8;
    const B = params['Bz'] ?? 0.5;
    const v0 = Math.hypot(params['v0x'] ?? 25, params['v0y'] ?? 0);
    const R = engineR > 0 ? engineR : v0 > 0 ? (m * v0) / (Math.abs(q) * Math.abs(B)) : 0;
    const scale = R > 0 ? (CHAMBER_RADIUS * ORBIT_RATIO) / R : 1;
    const dir = engineCenter(params);
    return { scale, engineCenterX: dir.x * R, engineCenterY: dir.y * R };
}

/** 引擎坐标 → 世界坐标 (轨道圆心对齐磁腔中心) */
function worldFromEngine(pos: { x: number; y: number }, layout: MFieldLayout): THREE.Vector3 {
    return new THREE.Vector3(
        (pos.x - layout.engineCenterX) * layout.scale,
        MAGNETIC_FIELD_CENTER_Y + (pos.y - layout.engineCenterY) * layout.scale,
        0
    );
}

/** 轨道圆的世界半径 (由引擎回旋半径推导) */
function orbitRadiusWorld(params: Record<string, number>, result?: SimulationResult | null): number {
    const mv = result?.diagnostics?.maxValues;
    const engineR = typeof mv?.cyclotronRadius === 'number' ? mv.cyclotronRadius : 0;
    return engineR > 0 ? engineR * layoutFor(params, result).scale : 0;
}

/** 3D rig 的米→世界单位换算比例 (导出供契约测试使用) */
export function magneticFieldUnitsPerMeter(params: Record<string, number>, result?: SimulationResult | null): number {
    return layoutFor(params, result).scale;
}

function conditionText(read: MagneticFieldRigReadouts): string {
    const qSign = read.q >= 0 ? '+' : '−';
    return `q = ${qSign}${(Math.abs(read.q) * 1e6).toFixed(2)}×10⁻⁶ C   ` + `B = ${read.B.toFixed(2)} T (⊙ 出纸面)`;
}

function stateText(read: MagneticFieldRigReadouts): string {
    return (
        `R = ${read.radius.toFixed(3)} m   T = ${read.period.toFixed(4)} s   ` +
        `转过 ${((read.angle * 180) / Math.PI).toFixed(0)}°   v = ${read.v.toFixed(1)} m/s`
    );
}

/**
 * 造一个 ⊙ 符号 (圆圈 + 中心实心点) —— 垂直纸面向外的磁场。
 * 用几何而不是字符贴图: ⊙ 的字形在不同字体下可能缺失, 几何一定画得出来。
 */
function makeOutOfPageSymbol(radius: number): THREE.Group {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.78, radius, 24),
        new THREE.MeshBasicMaterial({ color: 0x059669, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    const dot = new THREE.Mesh(
        new THREE.CircleGeometry(radius * 0.3, 16),
        new THREE.MeshBasicMaterial({ color: 0x059669, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    group.add(ring, dot);
    return group;
}

const _fieldCenter = new THREE.Vector3(0, MAGNETIC_FIELD_CENTER_Y, 0);
const _lorentzDir = new THREE.Vector3();

export const magneticFieldRig: SceneRig = {
    worldScale: 1,
    ballRadius: PARTICLE_RADIUS,
    clampToGround: false,

    /** 显式取景: 磁腔摆在 x≈0 (舞台中心在 3.6), 通用自动取景会看偏 */
    framing() {
        // 目标略上移 + 拉远: 上下两条读数标牌都留在视口内 (顶部避开工具条)
        const target: [number, number, number] = [0, MAGNETIC_FIELD_CENTER_Y + 0.15, 0];
        const distance = 7.0;
        return {
            target,
            position: [target[0] + distance * 0.26, target[1] + distance * 0.28, distance * 0.92],
            distance
        };
    },

    buildEquipment(scene, params, result) {
        const group = new THREE.Group();

        // 1. 圆形匀强磁场腔 (浅绿色半透明圆柱)
        const chamber = new THREE.Mesh(
            new THREE.CylinderGeometry(CHAMBER_RADIUS, CHAMBER_RADIUS, 0.6, 48),
            new THREE.MeshStandardMaterial({
                color: 0x10b981,
                transparent: true,
                opacity: 0.12,
                roughness: 0.3,
                // 不写深度: 半透明腔壁若写深度, 腔内的轨迹线会被整段遮掉
                depthWrite: false
            })
        );
        chamber.rotation.x = Math.PI / 2;
        chamber.position.set(0, MAGNETIC_FIELD_CENTER_Y, 0);
        chamber.renderOrder = -1;
        group.add(chamber);

        // 2. 磁腔边界线
        const pts: THREE.Vector3[] = [];
        const N = 64;
        for (let i = 0; i <= N; i++) {
            const a = (i / N) * Math.PI * 2;
            pts.push(
                new THREE.Vector3(
                    Math.cos(a) * CHAMBER_RADIUS,
                    MAGNETIC_FIELD_CENTER_Y + Math.sin(a) * CHAMBER_RADIUS,
                    0.05
                )
            );
        }
        const boundary = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0x059669 })
        );
        group.add(boundary);

        // 3. 轨道圆 (由引擎 maxValues.cyclotronRadius 还原, 虚线)
        const orbitPts: THREE.Vector3[] = [];
        const ORBIT_SEG = 72;
        const orbitRadius = orbitRadiusWorld(params, result);
        for (let i = 0; i <= ORBIT_SEG; i++) {
            const a = (i / ORBIT_SEG) * Math.PI * 2;
            orbitPts.push(
                new THREE.Vector3(Math.cos(a) * orbitRadius, MAGNETIC_FIELD_CENTER_Y + Math.sin(a) * orbitRadius, 0.06)
            );
        }
        const orbit = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(orbitPts),
            new THREE.LineDashedMaterial({
                color: 0x0f766e,
                dashSize: 0.12,
                gapSize: 0.08,
                transparent: true,
                opacity: 0.85
            })
        );
        orbit.computeLineDistances();
        orbit.userData.orbitRadius = orbitRadius;
        group.add(orbit);

        // 4. ⊙ 出纸面符号网格 (引擎 B 恒为 +z)
        const symbols = new THREE.Group();
        const half = CHAMBER_RADIUS - 0.16;
        for (let gx = -half; gx <= half + 1e-9; gx += SYMBOL_GAP) {
            for (let gy = -half; gy <= half + 1e-9; gy += SYMBOL_GAP) {
                if (gx * gx + gy * gy > (half - 0.08) ** 2) continue;
                const sym = makeOutOfPageSymbol(0.075);
                sym.position.set(gx, MAGNETIC_FIELD_CENTER_Y + gy, 0.12);
                symbols.add(sym);
            }
        }
        group.add(symbols);

        // 4. 洛伦兹力动态矢量 (指向轨道圆心)
        const lorentzArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, MAGNETIC_FIELD_CENTER_Y, 0),
            0.6,
            0xef4444,
            0.12,
            0.08
        );
        group.add(lorentzArrow);

        // 5. 入射准直管 (摆在粒子起点外侧: 引擎 (0,0) = 轨道圆顶部)
        const layout = layoutFor(params, result);
        const entry = worldFromEngine({ x: 0, y: 0 }, layout);
        const collimator = makeCylinder(0.07, 1.0, 0x334155, 0.4, 0.6);
        collimator.rotation.z = Math.PI / 2;
        collimator.position.set(entry.x - 0.8, entry.y, 0);
        group.add(collimator);

        // 6. 读数标牌
        const conditionLabel = makeLabelSprite('', '#047857', 26, LABEL_GLYPH_HEIGHT);
        conditionLabel.position.set(0, MAGNETIC_FIELD_CENTER_Y + CHAMBER_RADIUS + 0.3, 0.6);
        group.add(conditionLabel);

        const stateLabel = makeLabelSprite('', '#0f766e', 24, LABEL_GLYPH_HEIGHT);
        stateLabel.position.set(0, MAGNETIC_FIELD_CENTER_Y - CHAMBER_RADIUS - 0.28, 0.6);
        group.add(stateLabel);

        scene.add(group);

        const handles: MFieldHandles = {
            chamber,
            boundary,
            orbit,
            symbols,
            lorentzArrow,
            collimator,
            conditionLabel,
            stateLabel
        };
        applyLabels(handles, params, result, 0);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        const h = handles as MFieldHandles;
        const layout = layoutFor(params, result);
        // 轨道圆半径随引擎回旋半径变化 → 重建折线
        const radius = orbitRadiusWorld(params, result);
        if (Math.abs(radius - h.orbit.userData.orbitRadius) > 1e-6) {
            const pts: THREE.Vector3[] = [];
            const SEG = 72;
            for (let i = 0; i <= SEG; i++) {
                const a = (i / SEG) * Math.PI * 2;
                pts.push(new THREE.Vector3(Math.cos(a) * radius, MAGNETIC_FIELD_CENTER_Y + Math.sin(a) * radius, 0.06));
            }
            h.orbit.geometry.dispose();
            h.orbit.geometry = new THREE.BufferGeometry().setFromPoints(pts);
            h.orbit.computeLineDistances();
            h.orbit.userData.orbitRadius = radius;
        }
        // 准直管跟着粒子起点走 (引擎 (0,0) = 轨道圆顶部)
        const entry = worldFromEngine({ x: 0, y: 0 }, layout);
        h.collimator.position.set(entry.x - 0.8, entry.y, 0);
        applyLabels(h, params, result, 0);
    },

    getVisualPosition(pos, params, result) {
        return worldFromEngine(pos, layoutFor(params, result));
    },

    getOrigin(params, result) {
        return worldFromEngine({ x: 0, y: 0 }, layoutFor(params, result));
    },

    onAnimate(handles, ctx) {
        const h = handles as MFieldHandles;
        // 洛伦兹力指向轨道圆心 (世界磁腔中心 = 引擎圆心, 复用模块级临时向量)
        _lorentzDir.subVectors(_fieldCenter, ctx.ballPos);
        const len = _lorentzDir.length();
        if (len > 1e-6) {
            _lorentzDir.divideScalar(len);
            h.lorentzArrow.position.copy(ctx.ballPos);
            h.lorentzArrow.setDirection(_lorentzDir);
            h.lorentzArrow.setLength(Math.min(0.5, len * 0.4), 0.12, 0.08);
        }
        const read = magneticFieldRigReadouts(ctx.params, ctx.result, ctx.time);
        setLabelOnce(h.conditionLabel, conditionText(read), '#047857');
        setLabelOnce(h.stateLabel, stateText(read), '#0f766e');
    }
};

/** 文本不变时不重绘贴图 */
function setLabelOnce(sprite: THREE.Sprite, text: string, color: string): void {
    if (sprite.userData.text === text) return;
    setLabel(sprite, text, color);
    // 固定字高 (世界单位) —— 文本长度变化时标牌等比变宽, 不撑破版面
    setSpriteGlyphHeight(sprite, LABEL_GLYPH_HEIGHT);
}

function applyLabels(
    handles: MFieldHandles,
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    time: number
): void {
    const read = magneticFieldRigReadouts(params, result ?? null, time);
    setLabelOnce(handles.conditionLabel, conditionText(read), '#047857');
    setLabelOnce(handles.stateLabel, stateText(read), '#0f766e');
}

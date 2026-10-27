/**
 * 电磁复合场与速度选择器 rig — 正交电磁场腔室 (竖直电场 + 垂直纸面向外的磁场) + 速度选择狭缝
 *
 * 口径修正 (#159 逐节审计 · 问题一·物理 · 阻断):
 *   旧 rig 把引擎的 +y 映射到世界 −y (手性翻转), 再用 ⊗ (垂直纸面向里) 抵消 ——
 *   单看 3D 画面自洽，但与 **2D 板书** (不翻转、画的是引擎坐标系) 口径相反:
 *     - 2D 的 E 箭头对 Ey>0 画成「向下」，引擎 E = (0, Ey) 在板上是**向上**;
 *     - 2D 的磁场符号画 ⊗ (入纸面)，引擎 B = +z 是**出纸面 ⊙**。
 *   两处方向都反 ⇒ 板书画的场预测的偏转方向与引擎轨迹**相反**。
 *
 *   现在统一口径: 2D / 3D 都直接用引擎坐标系 (+y 向上), 磁场符号一律 ⊙ (出纸面),
 *   与 `uniform-magnetic-field` / `em-combined-field` 两个引擎一致。
 *
 * 物理对应关系:
 *   - 场景把电场放在 y 轴 (Ey), 引擎只在 |E.x| < 1e-12 时走速度选择路径,
 *     即速度选择器要求 **E ⊥ v**; 装置用上下极板产生竖直电场, 与之自洽。
 *   - 引擎取 Bz = +B (垂直纸面向外 ⊙)。正电荷 v=+x 时洛伦兹力指向 −y,
 *     与引擎 `a = (q/m)(E + v×B)` 完全一致。
 *   - 复合场中粒子走**摆线**: 漂移速度 v_d = E×B/B² = E/B, 回旋 ω = qB/m,
 *     相对漂移速度 v₀ − v_d 决定摆幅 |v−v_d|/ω。
 *   - 标牌显示**真实**的 v选择 = E/B 与入射速度 v₀ 的比较结果;
 *     早期版本读取了场景里并不存在的参数名 ('Ey'/'E' 落回默认值),
 *     于是标牌显示 1.00e+6 m/s —— 比真实值大 1000 倍且超过光速。
 *
 * 比例尺: 由**引擎轨迹**推导 —— 水平跨度铺满极板长度, 竖直偏移决定板间距,
 * 粒子永远落在板间。旧版写死 0.32 单位/米, 粒子只走了一半就停在腔室中部。
 */
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import { SceneRig, SceneFraming } from '../EquipmentStage';
import {
    createDeflectionPlates,
    updateDeflectionPlateGeometry,
    updateDeflectionPolarity,
    type DeflectionPlatesHandles
} from '../equipment/deflectionPlates';
import { makeBox, makeLabelSprite, setSpriteGlyphHeight } from '../primitives';
import { num, setLabel, STAGE_CENTER_X } from './params';

/** 极板世界长度 */
const PLATE_LENGTH = 2.6;
/** 极板世界宽度 */
const PLATE_WIDTH = 1.0;
/** 场区中心的世界高度 */
const FIELD_CENTER_Y = 1.5;
/** 粒子球半径 */
const PARTICLE_RADIUS = 0.06;
/** 板间半间距下限 / 上限 (世界单位) */
const HALF_GAP_MIN = 0.4;
const HALF_GAP_MAX = 0.85;
/** 速度选择狭缝半缝宽 (世界单位) */
const SLIT_HALF_GAP = 0.12;
/** 读数标牌字高 (世界单位) */
const LABEL_GLYPH_HEIGHT = 0.085;

export interface CombinedHandles {
    platesGroup: THREE.Group;
    platesHandles: DeflectionPlatesHandles;
    exitSlit: THREE.Group;
    fieldArrows: THREE.ArrowHelper[];
    fieldLabel: THREE.Sprite;
    verdictLabel: THREE.Sprite;
}

/** 场景真实参数 (E 沿 y 轴) —— 只读场景声明过的参数名 */
export function resolveFields(params: Record<string, number>): { E: number; B: number; v0: number } {
    return {
        E: num(params['Ey'], 22),
        B: num(params['Bz'], 0.5),
        v0: num(params['v0x'], 20)
    };
}

/** 速率格式化: 大数量级取整数, 小数量级保留有效位, 避免出现 "0 m/s" */
function fmtSpeed(v: number): string {
    const a = Math.abs(v);
    if (!Number.isFinite(v)) return '—';
    if (a >= 100) return v.toFixed(0);
    if (a >= 1) return v.toFixed(2);
    return v.toExponential(2);
}

/** 场参数标牌 */
export function fieldText(E: number, B: number): string {
    const dir = E >= 0 ? '向上' : '向下';
    return `E = ${E.toFixed(1)} N/C (${dir})  |  B = ${B.toFixed(3)} T (⊙ 垂直纸面向外)`;
}

/** 速度选择判定标牌: v₀ 是否等于 E/B */
export function verdictText(E: number, B: number, v0: number): { text: string; color: string } {
    const vSelect = Math.abs(B) > 1e-12 ? Math.abs(E / B) : 0;
    const matched = vSelect > 0 && Math.abs(v0 - vSelect) <= vSelect * 0.01;
    const head = `v选择 = E/B = ${fmtSpeed(vSelect)} m/s`;
    if (matched) {
        return { text: `${head}  |  v₀ = ${fmtSpeed(v0)} m/s → 无偏转通过`, color: '#059669' };
    }
    return { text: `${head}  |  v₀ = ${fmtSpeed(v0)} m/s ≠ E/B → 发生偏转`, color: '#b45309' };
}

/** 3D 标牌读数 — 单一真源: 引擎轨迹 + 引擎 maxValues */
export interface EmCombinedRigReadouts {
    source: 'engine' | 'fallback';
    /** 当前物理时刻 (s) */
    t: number;
    /** 水平位置 (m) */
    x: number;
    /** 竖直位置 (m) */
    y: number;
    /** 速率 (m/s) */
    v: number;
    /** 电场强度 y 分量 (N/C) */
    E: number;
    /** 磁感应强度 (T) */
    B: number;
    /** 速度选择速度 v = E/B (m/s) */
    vSelect: number;
    /** 入射速度 (m/s) */
    v0: number;
    /** 是否被速度选择器选中 (v₀ ≈ E/B) */
    selected: boolean;
    /** 引擎给出的漂移/最大速率 (m/s) */
    maxSpeed: number;
}

export function emCombinedRigReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    currentTime: number
): EmCombinedRigReadouts {
    const { E, B, v0 } = resolveFields(params);
    const vSelect = Math.abs(B) > 1e-12 ? Math.abs(E / B) : 0;
    const mv = result?.diagnostics?.maxValues;
    const engineVSelect = typeof mv?.velocitySelectorSpeed === 'number' ? mv.velocitySelectorSpeed : vSelect;

    const traj = result?.trajectories?.[0] ?? [];
    let x = v0 * currentTime;
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
        x,
        y,
        v,
        E,
        B,
        vSelect: engineVSelect,
        v0,
        selected: vSelect > 0 && Math.abs(v0 - vSelect) <= vSelect * 0.01,
        maxSpeed: typeof mv?.maxSpeed === 'number' ? mv.maxSpeed : v
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
        const { E, B, v0 } = resolveFields(params);
        const q = (params['charge'] ?? 2) * 1e-6;
        const m = (params['mass'] ?? 2) * 1e-8;
        const t = params['duration'] ?? 0.1;
        maxX = Math.abs(v0 * t);
        maxY = Math.abs(0.5 * ((q * (E - v0 * B)) / m) * t * t);
    }
    return { maxX, maxY };
}

/** 3D 布局: 米→世界单位比例 + 板间距 (由引擎轨迹推导) */
interface CombinedLayout {
    scale: number;
    halfGap: number;
    plateDistance: number;
}

function layoutFor(params: Record<string, number>, result?: SimulationResult | null): CombinedLayout {
    const { maxX, maxY } = trajectorySpan(params, result);
    const scale = PLATE_LENGTH / Math.max(maxX, 0.5);
    const deflectWorld = Math.max(maxY, 0.05) * scale;
    const halfGap = Math.min(HALF_GAP_MAX, Math.max(HALF_GAP_MIN, deflectWorld * 1.25));
    return { scale, halfGap, plateDistance: halfGap * 2 };
}

/** 3D rig 的米→世界单位换算比例 (导出供契约测试使用) */
export function emCombinedUnitsPerMeter(params: Record<string, number>, result?: SimulationResult | null): number {
    return layoutFor(params, result).scale;
}

/**
 * 磁场方向标记 ⊙ (垂直纸面向外) —— 几何绘制而非文字精灵。
 *
 * 文字精灵的画布 384×128 远大于单个字符, 透明区域会写入深度, 把精灵背后的
 * 粒子轨迹线"挖空"。故 ⊙ 用圆环 + 中心实心点绘制, 尺寸也更好控。
 */
function makeFieldOutMark(size = 0.17): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color: 0x059669, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(size / 2, size * 0.09, 8, 24), material);
    group.add(ring);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(size * 0.17, 12, 12), material);
    group.add(dot);
    return group;
}

/** 文本不变时不重绘贴图 */
function setLabelOnce(sprite: THREE.Sprite, text: string, color: string): void {
    if (sprite.userData.text === text) return;
    setLabel(sprite, text, color);
    setSpriteGlyphHeight(sprite, LABEL_GLYPH_HEIGHT);
}

export const emCombinedRig: SceneRig = {
    worldScale: 1,
    /** 电子只是示意粒子: 0.06 世界单位, 不能用默认的 0.22 把枪口整个糊住 */
    ballRadius: PARTICLE_RADIUS,
    clampToGround: false,

    buildEquipment(scene, params, result) {
        const group = new THREE.Group();
        const layout = layoutFor(params, result);

        // 1. 正交电场偏转板 (上 − / 下 + → 引擎 Ey > 0 时电场向上)
        const { group: platesGroup, handles: platesHandles } = createDeflectionPlates(
            PLATE_LENGTH,
            PLATE_WIDTH,
            layout.plateDistance,
            FIELD_CENTER_Y
        );
        platesGroup.position.x = STAGE_CENTER_X;
        // 速度选择器没有「偏转电压」这回事, 隐藏极板组件自带的电压标牌
        platesHandles.voltageLabel.visible = false;
        group.add(platesGroup);

        // 2. 出射速度选择狭缝 (右端仅允许直行通过)
        const exitSlit = new THREE.Group();
        const slitUpper = makeBox(0.04, 0.45, 0.9, 0x1e293b, 0.5, 0.3);
        slitUpper.position.set(STAGE_CENTER_X + PLATE_LENGTH / 2 + 0.1, FIELD_CENTER_Y + 0.32, 0);
        exitSlit.add(slitUpper);

        const slitLower = makeBox(0.04, 0.45, 0.9, 0x1e293b, 0.5, 0.3);
        slitLower.position.set(STAGE_CENTER_X + PLATE_LENGTH / 2 + 0.1, FIELD_CENTER_Y - 0.32, 0);
        exitSlit.add(slitLower);
        group.add(exitSlit);

        // 3. 磁场方向 ⊙ (垂直纸面向外, 与引擎 Bz = +B 一致)
        //    z 放在极板前脸之外: 相机俯视时上极板会挡住腔室中线, 符号必须画在腔室前壁上
        const symbols = new THREE.Group();
        [-0.8, -0.4, 0, 0.4, 0.8].forEach(x => {
            const mark = makeFieldOutMark();
            mark.position.set(STAGE_CENTER_X + x, FIELD_CENTER_Y, PLATE_WIDTH / 2 + 0.08);
            symbols.add(mark);
        });
        group.add(symbols);

        // 4. 电场线箭头 (方向 = E 方向, 与引擎 fieldVector 一致)
        const fieldArrows: THREE.ArrowHelper[] = [];
        for (let i = -1; i <= 1; i++) {
            const arrow = new THREE.ArrowHelper(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(STAGE_CENTER_X + i * 0.8, FIELD_CENTER_Y, -PLATE_WIDTH / 2),
                0.4,
                0xf59e0b,
                0.1,
                0.07
            );
            group.add(arrow);
            fieldArrows.push(arrow);
        }

        // 5. 场参数 + 速度选择判定标牌
        const { E, B, v0 } = resolveFields(params);
        const verdict = verdictText(E, B, v0);

        // 标牌放在极板前脸 (z = PLATE_WIDTH/2 = 0.5) 之外 —— 俯视机位下
        // 贴在板面高度的标牌会被上极板前沿切掉半行字 (旧版 z = 0.2 → 文字被遮)。
        // 不加白色背板: 背板 (90% 不透明的平面) 会被 Three 的透明排序画到标牌
        // 之后, 把标牌右半边洗成一片白 (实测「发生偏转」四个字几乎看不见)。
        const fieldLabel = makeLabelSprite(fieldText(E, B), '#0f172a', 22, LABEL_GLYPH_HEIGHT);
        fieldLabel.position.set(STAGE_CENTER_X, FIELD_CENTER_Y + layout.halfGap + 0.52, 0.6);
        group.add(fieldLabel);

        const verdictLabel = makeLabelSprite(verdict.text, verdict.color, 22, LABEL_GLYPH_HEIGHT);
        verdictLabel.position.set(STAGE_CENTER_X, FIELD_CENTER_Y + layout.halfGap + 0.28, 0.6);
        group.add(verdictLabel);

        scene.add(group);

        const handles: CombinedHandles = {
            platesGroup,
            platesHandles,
            exitSlit,
            fieldArrows,
            fieldLabel,
            verdictLabel
        };
        applyLayout(handles, layout, params, result, 0);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        const h = handles as CombinedHandles;
        const layout = layoutFor(params, result);
        applyLayout(h, layout, params, result, 0);
    },

    /**
     * 物理坐标 → 3D 坐标 (与 2D 板书同一手性: 引擎 +y → 世界 +y)。
     */
    getVisualPosition(pos, params, result) {
        const { scale } = layoutFor(params, result);
        return new THREE.Vector3(STAGE_CENTER_X - PLATE_LENGTH / 2 + pos.x * scale, FIELD_CENTER_Y + pos.y * scale, 0);
    },

    getOrigin(_params, result) {
        const { scale } = layoutFor({}, result);
        void scale;
        return new THREE.Vector3(STAGE_CENTER_X - PLATE_LENGTH / 2, FIELD_CENTER_Y, 0);
    },

    framing(_params, _result): SceneFraming {
        // 装置横向占 x ∈ [STAGE_CENTER_X−1.3, STAGE_CENTER_X+1.5], 标牌在顶部;
        // 取景需覆盖整个腔室, 否则荧光屏与狭缝会被画面裁掉
        const distance = 5.6;
        const target: [number, number, number] = [STAGE_CENTER_X + 0.1, FIELD_CENTER_Y + 0.2, 0];
        return {
            target,
            position: [target[0] + distance * 0.18, target[1] + distance * 0.22, distance * 0.95],
            distance
        };
    }
};

/** 应用布局: 板间距 / 极性 / 场线方向 / 标牌 */
function applyLayout(
    handles: CombinedHandles,
    layout: CombinedLayout,
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    time: number
): void {
    updateDeflectionPlateGeometry(handles.platesHandles, layout.plateDistance);
    const { E } = resolveFields(params);
    // 引擎 Ey > 0 → 电场向上 → 下极板为正极 (+)
    updateDeflectionPolarity(handles.platesHandles, false);

    // 场线箭头: 方向随 Ey, 长度随板间距
    const arrowLen = Math.max(0.2, layout.halfGap * 1.2);
    const dir = E >= 0 ? 1 : -1;
    handles.fieldArrows.forEach(arrow => {
        arrow.setDirection(_up.set(0, dir, 0));
        arrow.position.set(arrow.position.x, FIELD_CENTER_Y - (dir * arrowLen) / 2, arrow.position.z);
        arrow.setLength(arrowLen, 0.1, 0.07);
    });

    // 狭缝跟随板间距的一半 (窄缝: 只放行几乎不偏转的粒子)
    const slitHalf = Math.min(SLIT_HALF_GAP * 2, layout.halfGap * 0.5);
    const upper = handles.exitSlit.children[0] as THREE.Mesh | undefined;
    const lower = handles.exitSlit.children[1] as THREE.Mesh | undefined;
    if (upper && lower) {
        upper.position.y = FIELD_CENTER_Y + slitHalf + 0.22;
        lower.position.y = FIELD_CENTER_Y - slitHalf - 0.22;
    }

    const read = emCombinedRigReadouts(params, result ?? null, time);
    setLabelOnce(handles.fieldLabel, fieldText(read.E, read.B), '#0f172a');
    const verdict = verdictText(read.E, read.B, read.v0);
    setLabelOnce(handles.verdictLabel, verdict.text, verdict.color);
}

const _up = new THREE.Vector3(0, 1, 0);

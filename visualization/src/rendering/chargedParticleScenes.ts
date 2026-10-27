/**
 * 带电粒子场景板书 — 匀强电场偏转 / 匀强磁场回旋
 *
 * 背景 (#159 逐节审计 · 高中核心 24 节):
 *   `electric-field` / `magnetic-field` 原先落在 SimulationCanvas 的
 *   `SCENES_2D_CUSTOM_BG` —— 只画一层**满屏背景装饰**:
 *     - 电场: 满屏向上的竖直箭头 (方向写死, Ey<0 时与引擎相反);
 *     - 磁场: 满屏 ⊗ 符号 (垂直纸面向里), 而引擎的 B 恒为 +z = 出纸面 ⊙。
 *   真正的物体/轨迹/读数仍由通用默认渲染器按 autoFit 画 —— 于是:
 *     - 电场默认参数下轨迹横纵跨度同为 1.9×10¹⁰ m, autoFit 把水平分量压成一条竖线;
 *     - 磁场默认参数下轨道半径 1 mm, 屏幕上是一颗静止大球, 看不到任何回旋。
 *
 * 本模块给出两节**专属整屏板书**:
 *   - 极板 + 电子枪 + 场线箭头 + 抛物线轨迹 + 速度/受力矢量 + 读数 HUD;
 *   - 圆形磁腔 + ⊙ 出纸面符号 + 轨道圆 + 轨迹 + 洛伦兹力矢量 + 读数 HUD。
 *
 * 单一真源: 位置/速度/加速度/轨迹全部读引擎结果 (`getFrame` + `trajectories`),
 * 比例尺由引擎轨迹的最大跨度推导 —— 改引擎公式画面自动跟随。
 */
import type { SimulationResult } from 'physics-core';
import { getThemeTokens } from '../utils/themeTokens';
import {
    COLORS,
    clamp,
    drawArrow,
    drawEmptyState,
    drawHud,
    drawInfoBar,
    drawSubtitle,
    drawTitle,
    getFrame,
    mutedColor,
    roundRectPath,
    textColor
} from './renderingUtils';

export interface ChargedParticleSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

/** 读数来源标记: engine = 读引擎结果; fallback = 无引擎结果时的解析式兜底 */
export type ReadoutSource = 'engine' | 'fallback';

// ============================================================================
// 匀强电场
// ============================================================================

export interface ElectricFieldReadouts {
    source: ReadoutSource;
    /** 当前物理时刻 (s) */
    t: number;
    /** 水平位移 (m) */
    x: number;
    /** 竖直位移 (m) */
    y: number;
    /** 水平速度 (m/s) */
    vx: number;
    /** 竖直速度 (m/s) */
    vy: number;
    /** 速率 (m/s) */
    v: number;
    /** 加速度 a = qE/m (m/s²) */
    a: number;
    /** 电荷量 (C) */
    q: number;
    /** 质量 (kg) */
    m: number;
    /** 电场强度 y 分量 (N/C) */
    Ey: number;
    /** 轨迹最大水平跨度 (m) */
    maxX: number;
    /** 轨迹最大竖直偏移绝对值 (m) */
    maxDeflection: number;
    /** 引擎给出的最大速率 (m/s) */
    maxSpeed: number;
    /** 引擎给出的最大位移 (m) */
    maxDistance: number;
}

/**
 * 匀强电场板书读数 — 单一真源: 引擎轨迹。
 *
 * 没有引擎结果时按解析式兜底 (x = v₀x·t, y = v₀y·t + ½at²), 供「未运行仿真」的空态使用。
 */
export function electricFieldReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    currentTime: number
): ElectricFieldReadouts {
    const q = (params['charge'] ?? 2) * 1e-8;
    const m = (params['mass'] ?? 2) * 1e-7;
    const Ey = params['Ey'] ?? 10;
    const v0x = params['v0x'] ?? 4;
    const v0y = params['v0y'] ?? 0;
    const a = (q * Ey) / m;

    const traj = result?.trajectories?.[0] ?? [];
    let maxX = 0;
    let maxDeflection = 0;
    for (const p of traj) {
        maxX = Math.max(maxX, Math.abs(p.position.x));
        maxDeflection = Math.max(maxDeflection, Math.abs(p.position.y));
    }

    const frame = getFrame(result ?? null, currentTime);
    const source: ReadoutSource = frame ? 'engine' : 'fallback';
    const x = frame ? frame.position.x : v0x * currentTime;
    const y = frame ? frame.position.y : v0y * currentTime + 0.5 * a * currentTime * currentTime;
    const vx = frame ? frame.velocity.x : v0x;
    const vy = frame ? frame.velocity.y : v0y + a * currentTime;

    const mv = result?.diagnostics?.maxValues;
    return {
        source,
        t: currentTime,
        x,
        y,
        vx,
        vy,
        v: Math.hypot(vx, vy),
        a,
        q,
        m,
        Ey,
        maxX: maxX > 0 ? maxX : Math.abs(v0x * currentTime),
        maxDeflection: maxDeflection > 0 ? maxDeflection : Math.abs(y),
        maxSpeed: typeof mv?.maxSpeed === 'number' ? mv.maxSpeed : Math.hypot(vx, vy),
        maxDistance: typeof mv?.maxDistance === 'number' ? mv.maxDistance : Math.hypot(x, y)
    };
}

export function drawElectricFieldScene(opts: ChargedParticleSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const read = electricFieldReadouts(params, simulationResult, currentTime);
    const tokens = getThemeTokens(isDark);

    // —— 布局 ——
    const plotLeft = 104;
    const plotRight = width - 64;
    const plotTop = 84;
    const plotBottom = height - 92;
    const axisY = (plotTop + plotBottom) / 2;

    // 极板半间距: 保证偏转量始终落在板间 (物理量 → 像素的比例由引擎轨迹推导)
    const halfGapM = Math.max(0.5, read.maxDeflection * 1.3);
    const spanX = Math.max(0.5, read.maxX);
    const scale = Math.min((plotRight - plotLeft) / spanX, (plotBottom - plotTop) / (2 * halfGapM));
    const halfGapPx = halfGapM * scale;

    const xPx = (x: number): number => plotLeft + x * scale;
    const yPx = (y: number): number => axisY - y * scale;

    // —— 标题 ——
    drawTitle(ctx, '带电粒子在匀强电场中的偏转 (类平抛实验)', width, isDark, { size: 17, y: 26 });
    drawSubtitle(
        ctx,
        `q = ${(read.q * 1e8).toFixed(2)}×10⁻⁸ C   m = ${(read.m * 1e7).toFixed(2)}×10⁻⁷ kg   E = ${read.Ey.toFixed(1)} N/C`,
        width / 2,
        46,
        isDark
    );

    // —— 极板 (E = (0, Ey): Ey>0 时 E 向上 → 上板 − / 下板 +) ——
    const eUp = read.Ey >= 0;
    const drawPlate = (py: number, sign: '+' | '−', color: string) => {
        ctx.fillStyle = isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.22)';
        roundRectPath(ctx, plotLeft - 26, py - 7, plotRight - plotLeft + 52, 14, 4);
        ctx.fill();
        ctx.strokeStyle = mutedColor(isDark);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // 极性徽标放在极板**右端** (左端被左上角 HUD 压住), 实心圆 + 白色符号
        const bx = plotRight + 40;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(bx, py, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sign, bx, py + 1);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
    };
    drawPlate(axisY - halfGapPx, eUp ? '−' : '+', COLORS.BLUE);
    drawPlate(axisY + halfGapPx, eUp ? '+' : '−', COLORS.RED);

    // —— 场线箭头 (方向 = E 方向, 与引擎 fieldVector 一致) ——
    const arrowColor = tokens.canvasEFieldAccent;
    const arrowCount = 9;
    for (let i = 0; i < arrowCount; i++) {
        const ax = plotLeft + ((i + 0.5) / arrowCount) * (plotRight - plotLeft);
        const from = eUp ? axisY + halfGapPx - 16 : axisY - halfGapPx + 16;
        const to = eUp ? axisY - halfGapPx + 16 : axisY + halfGapPx - 16;
        ctx.strokeStyle = arrowColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(ax, from);
        ctx.lineTo(ax, to);
        ctx.stroke();
        const dir = eUp ? -1 : 1;
        ctx.fillStyle = arrowColor;
        ctx.beginPath();
        ctx.moveTo(ax, to);
        ctx.lineTo(ax - 6, to - dir * 12);
        ctx.lineTo(ax + 6, to - dir * 12);
        ctx.closePath();
        ctx.fill();
    }

    // —— 电子枪发射口 ——
    ctx.fillStyle = isDark ? '#334155' : '#475569';
    roundRectPath(ctx, plotLeft - 84, axisY - 13, 56, 26, 6);
    ctx.fill();
    ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
    roundRectPath(ctx, plotLeft - 36, axisY - 7, 12, 14, 3);
    ctx.fill();
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('电子枪', plotLeft - 56, axisY - 22);
    ctx.textAlign = 'left';

    // —— 水平标尺 (米) ——
    const rulerY = plotBottom + 26;
    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(plotLeft, rulerY);
    ctx.lineTo(plotRight, rulerY);
    ctx.stroke();
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const stepM = spanX > 20 ? 5 : spanX > 8 ? 2 : 1;
    for (let m = 0; m <= spanX + 1e-9; m += stepM) {
        const mx = xPx(m);
        ctx.beginPath();
        ctx.moveTo(mx, rulerY);
        ctx.lineTo(mx, rulerY + 6);
        ctx.stroke();
        ctx.fillStyle = mutedColor(isDark);
        ctx.fillText(`${m.toFixed(0)}m`, mx, rulerY + 18);
    }
    ctx.textAlign = 'left';

    // —— 轨迹 (引擎结果) ——
    const traj = simulationResult?.trajectories?.[0] ?? [];
    if (traj.length > 1) {
        ctx.strokeStyle = COLORS.ORANGE;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let i = 0; i < traj.length; i++) {
            const p = traj[i]!;
            const px = xPx(p.position.x);
            const py = yPx(p.position.y);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    // —— 当前质点 + 速度矢量 + 受力矢量 ——
    const cx = xPx(read.x);
    const cy = yPx(read.y);
    const velLen = 46;
    const velLenM = Math.hypot(read.vx, read.vy);
    if (velLenM > 1e-9) {
        drawArrow(ctx, cx, cy, cx + (read.vx / velLenM) * velLen, cy - (read.vy / velLenM) * velLen, COLORS.CYAN, 'v');
    }
    // 受力 F = qE: 方向与 q·E 同号
    const fSign = Math.sign(read.q * read.Ey) || 1;
    drawArrow(ctx, cx, cy, cx, cy - fSign * 40, COLORS.RED, 'F=qE');

    ctx.fillStyle = COLORS.ORANGE;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // —— HUD 读数 ——
    drawHud(ctx, isDark, [
        { label: 't', value: `${read.t.toFixed(2)} s` },
        { label: 'x', value: `${read.x.toFixed(2)} m` },
        { label: 'y', value: `${read.y.toFixed(3)} m` },
        { label: 'v', value: `${read.v.toFixed(2)} m/s` },
        { label: 'a=qE/m', value: `${read.a.toFixed(3)} m/s²` }
    ]);

    // —— 信息条 ——
    const ratio = spanX > 0 ? (Math.abs(read.maxDeflection) / spanX) * 100 : 0;
    drawInfoBar(
        ctx,
        width,
        height,
        `类平抛 y = ½(qE/m)(x/v₀x)²   a = qE/m = ${read.a.toFixed(2)} m/s²   ` +
            `偏转/水平 = ${ratio.toFixed(1)}%   v_max = ${read.maxSpeed.toFixed(2)} m/s`,
        isDark
    );

    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

/** 板书里用到的物理量文本 (供契约测试比对读数口径) */
export function electricFieldReadoutText(read: ElectricFieldReadouts): string {
    return `a=${read.a.toFixed(3)}m/s^2 v=${read.v.toFixed(2)}m/s x=${read.x.toFixed(2)}m y=${read.y.toFixed(3)}m`;
}

// ============================================================================
// 匀强磁场
// ============================================================================

export interface MagneticFieldReadouts {
    source: ReadoutSource;
    /** 当前物理时刻 (s) */
    t: number;
    /** 水平位置 (m) */
    x: number;
    /** 竖直位置 (m) */
    y: number;
    /** 速率 (m/s) */
    v: number;
    /** 水平速度 (m/s) */
    vx: number;
    /** 竖直速度 (m/s) */
    vy: number;
    /** 累计回旋角 (rad, 顺时针为正 —— 屏幕观感) */
    angle: number;
    /** 回旋半径 (m) */
    radius: number;
    /** 回旋周期 (s) */
    period: number;
    /** 圆心 (引擎坐标, m) */
    center: { x: number; y: number };
    /** 电荷量 (C) */
    q: number;
    /** 质量 (kg) */
    m: number;
    /** 磁感应强度 (T) */
    B: number;
    /** 洛伦兹力大小 (N) */
    force: number;
}

/**
 * 匀强磁场板书读数 — 单一真源: 引擎轨迹 + 引擎 maxValues。
 *
 * 圆心由「起点 + R·(v 的右法向)」解析还原 (与引擎 `uniform-magnetic-field` 同口径:
 * 正电荷 + B 出纸面 → 圆心在速度右侧)。
 */
export function magneticFieldReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    currentTime: number
): MagneticFieldReadouts {
    const q = (params['charge'] ?? 2) * 1e-6;
    const m = (params['mass'] ?? 2) * 1e-8;
    const B = params['Bz'] ?? 0.5;
    const v0x = params['v0x'] ?? 25;
    const v0y = params['v0y'] ?? 0;
    const v0 = Math.hypot(v0x, v0y);

    const mv = result?.diagnostics?.maxValues;
    const engineR = typeof mv?.cyclotronRadius === 'number' ? mv.cyclotronRadius : 0;
    const engineT = typeof mv?.cyclotronPeriod === 'number' ? mv.cyclotronPeriod : 0;
    const R = engineR > 0 ? engineR : v0 > 0 && Math.abs(q * B) > 0 ? (m * v0) / (Math.abs(q) * B) : 0;
    const period = engineT > 0 ? engineT : Math.abs(q * B) > 0 ? (2 * Math.PI * m) / (Math.abs(q) * B) : 0;

    // 圆心: 速度右法向 (正电荷 + B 出纸面 → 圆心在 (v_y, −v_x) 方向)
    const sign = q * B > 0 ? 1 : -1;
    const center = {
        x: ((sign * v0y) / (v0 || 1)) * R,
        y: ((-sign * v0x) / (v0 || 1)) * R
    };

    const frame = getFrame(result ?? null, currentTime);
    const source: ReadoutSource = frame ? 'engine' : 'fallback';
    // 无引擎结果时按引擎同口径的圆周运动兜底: 绕圆心旋转 -sign·ω·t
    const omega = R > 0 ? v0 / R : 0;
    const ang = -sign * omega * currentTime;
    const dx0 = 0 - center.x;
    const dy0 = 0 - center.y;
    const fallbackX = center.x + dx0 * Math.cos(ang) - dy0 * Math.sin(ang);
    const fallbackY = center.y + dx0 * Math.sin(ang) + dy0 * Math.cos(ang);
    const x = frame ? frame.position.x : fallbackX;
    const y = frame ? frame.position.y : fallbackY;
    const vx = frame ? frame.velocity.x : v0x;
    const vy = frame ? frame.velocity.y : v0y;

    // 回旋角: 走过的弧长 / 半径 (顺时针为正, 与屏幕观感一致)
    const angle = R > 0 ? ((v0 * currentTime) / R) * sign : 0;

    return {
        source,
        t: currentTime,
        x,
        y,
        v: Math.hypot(vx, vy),
        vx,
        vy,
        angle,
        radius: R,
        period,
        center,
        q,
        m,
        B,
        force: Math.abs(q) * v0 * Math.abs(B)
    };
}

export function drawMagneticFieldScene(opts: ChargedParticleSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const read = magneticFieldReadouts(params, simulationResult, currentTime);
    const tokens = getThemeTokens(isDark);

    // —— 布局: 圆形磁腔居中 ——
    const chamberTop = 74;
    const chamberBottom = height - 62;
    const chamberR = Math.min(width * 0.3, (chamberBottom - chamberTop) / 2 - 8);
    const cx = width * 0.5;
    const cy = (chamberTop + chamberBottom) / 2;
    // 引擎坐标 → 屏幕: 圆心对齐磁腔中心, 轨道半径占磁腔 80%
    const scale = read.radius > 0 ? (chamberR * 0.8) / read.radius : 1;
    const xPx = (x: number): number => cx + (x - read.center.x) * scale;
    const yPx = (y: number): number => cy - (y - read.center.y) * scale;

    drawTitle(ctx, '带电粒子在匀强磁场中的匀速圆周运动', width, isDark, { size: 17, y: 26 });
    drawSubtitle(
        ctx,
        `q = ${(read.q * 1e6).toFixed(2)}×10⁻⁶ C   m = ${(read.m * 1e8).toFixed(2)}×10⁻⁸ kg   ` +
            `B = ${read.B.toFixed(2)} T (⊙ 出纸面)`,
        width / 2,
        46,
        isDark
    );

    // —— 磁腔 ——
    ctx.fillStyle = isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.12)';
    ctx.beginPath();
    ctx.arc(cx, cy, chamberR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = tokens.canvasBFieldLine;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // —— ⊙ 出纸面符号 (引擎 B 恒为 +z = 出纸面) ——
    const symGap = 34;
    const symR = 8;
    for (let gx = cx - chamberR + symGap / 2; gx <= cx + chamberR; gx += symGap) {
        for (let gy = cy - chamberR + symGap / 2; gy <= cy + chamberR; gy += symGap) {
            if ((gx - cx) ** 2 + (gy - cy) ** 2 > (chamberR - 8) ** 2) continue;
            ctx.strokeStyle = tokens.canvasBFieldLine;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(gx, gy, symR, 0, Math.PI * 2);
            ctx.stroke();
            // 中心实心点 = 出纸面 (⊗ 才是入纸面, 与引擎的 +z 相反)
            ctx.fillStyle = tokens.canvasBFieldLine;
            ctx.beginPath();
            ctx.arc(gx, gy, 2.6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // —— 轨道圆 (由引擎回旋半径还原) ——
    if (read.radius > 0) {
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = tokens.canvasBFieldCircle;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(cx, cy, read.radius * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // —— 准直管 (入射口: 粒子起点在轨道圆顶部, 管子伸到腔外) ——
    const entryX = xPx(0);
    const entryY = yPx(0);
    ctx.strokeStyle = isDark ? '#334155' : '#475569';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(entryX - 74, entryY);
    ctx.lineTo(entryX - 16, entryY);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // —— 轨迹 (引擎结果) ——
    const traj = simulationResult?.trajectories?.[0] ?? [];
    if (traj.length > 1) {
        ctx.strokeStyle = COLORS.ORANGE;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let i = 0; i < traj.length; i++) {
            const p = traj[i]!;
            const px = xPx(p.position.x);
            const py = yPx(p.position.y);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    // —— 当前质点 + 速度矢量 + 洛伦兹力 (指向圆心) ——
    const px = xPx(read.x);
    const py = yPx(read.y);
    const vLen = 40;
    const vMag = Math.hypot(read.vx, read.vy);
    if (vMag > 1e-9) {
        drawArrow(ctx, px, py, px + (read.vx / vMag) * vLen, py - (read.vy / vMag) * vLen, COLORS.CYAN, 'v');
    }
    // 洛伦兹力方向: 由圆心指向质点的反方向 (指向圆心)
    const toCenterX = cx - px;
    const toCenterY = cy - py;
    const tcLen = Math.hypot(toCenterX, toCenterY);
    if (tcLen > 1e-6) {
        drawArrow(ctx, px, py, px + (toCenterX / tcLen) * 36, py + (toCenterY / tcLen) * 36, COLORS.RED, 'F=qvB');
    }
    // 半径指示 (质点 → 圆心)
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = COLORS.ORANGE;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // —— 圆心标记 + 半径标注 ——
    ctx.fillStyle = COLORS.GREEN;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = textColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('圆心', cx, cy + 16);
    ctx.fillText(`R = ${read.radius.toFixed(3)} m`, cx, cy + chamberR + 16);
    ctx.textAlign = 'left';

    // —— HUD 读数 ——
    drawHud(ctx, isDark, [
        { label: 't', value: `${read.t.toFixed(3)} s` },
        { label: '回旋角', value: `${((read.angle * 180) / Math.PI).toFixed(0)}°` },
        { label: 'R', value: `${read.radius.toFixed(3)} m` },
        { label: 'T', value: `${read.period.toFixed(4)} s` },
        { label: 'v', value: `${read.v.toFixed(1)} m/s` },
        { label: 'f=qvB', value: `${read.force.toExponential(2)} N` }
    ]);

    drawInfoBar(
        ctx,
        width,
        height,
        `洛伦兹力提供向心力: R = mv/(qB) = ${read.radius.toFixed(3)} m, ` +
            `T = 2πm/(qB) = ${read.period.toFixed(4)} s, 洛伦兹力不做功 → 速率不变`,
        isDark
    );

    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

/** 板书里用到的物理量文本 (供契约测试比对读数口径) */
export function magneticFieldReadoutText(read: MagneticFieldReadouts): string {
    return `R=${read.radius.toFixed(4)}m T=${read.period.toFixed(4)}s v=${read.v.toFixed(2)}m/s`;
}

/** 夹取辅助 (供其他板书复用, 保持 clamp 语义一致) */
export const clampReadout = (v: number, lo: number, hi: number): number => clamp(v, lo, hi);

// ============================================================================
// 电磁复合场 (速度选择器)
// ============================================================================

export interface EmCombinedReadouts {
    source: ReadoutSource;
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
    /** 引擎给出的最大速率 (m/s) */
    maxSpeed: number;
}

/**
 * 电磁复合场板书读数 — 单一真源: 引擎轨迹 + 引擎 maxValues。
 *
 * 物理: 复合场中粒子走摆线 —— 漂移速度 v_d = E×B/B² = E/B, 回旋角频率 ω = qB/m,
 * 相对漂移速度 v₀ − v_d 决定摆幅。v₀ = E/B 时摆幅为零 (直线通过)。
 */
export function emCombinedReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    currentTime: number
): EmCombinedReadouts {
    const E = params['Ey'] ?? 22;
    const B = params['Bz'] ?? 0.5;
    const v0 = params['v0x'] ?? 20;
    const vSelect = Math.abs(B) > 1e-12 ? Math.abs(E / B) : 0;

    const mv = result?.diagnostics?.maxValues;
    const engineVSelect = typeof mv?.velocitySelectorSpeed === 'number' ? mv.velocitySelectorSpeed : vSelect;

    const traj = result?.trajectories?.[0] ?? [];
    let x = v0 * currentTime;
    let y = 0;
    let v = v0;
    let source: ReadoutSource = 'fallback';
    if (traj.length > 0) {
        const frame = getFrame(result ?? null, currentTime);
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

export function drawEMCombinedScene(opts: ChargedParticleSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const read = emCombinedReadouts(params, simulationResult, currentTime);
    const tokens = getThemeTokens(isDark);

    // —— 布局 ——
    const plotLeft = 112;
    const plotRight = width - 96;
    const plotTop = 84;
    const plotBottom = height - 92;
    const axisY = (plotTop + plotBottom) / 2;

    const traj = simulationResult?.trajectories?.[0] ?? [];
    let maxX = 0;
    let maxY = 0;
    for (const p of traj) {
        maxX = Math.max(maxX, Math.abs(p.position.x));
        maxY = Math.max(maxY, Math.abs(p.position.y));
    }
    if (maxX === 0) maxX = Math.abs(read.v0 * read.t);
    if (maxY === 0) maxY = 0.2;

    const halfGapM = Math.max(0.4, maxY * 1.3);
    const scale = Math.min((plotRight - plotLeft) / Math.max(maxX, 0.5), (plotBottom - plotTop) / (2 * halfGapM));
    const halfGapPx = halfGapM * scale;
    const xPx = (x: number): number => plotLeft + x * scale;
    const yPx = (y: number): number => axisY - y * scale;

    drawTitle(ctx, '电磁复合场中的带电粒子运动 (速度选择器)', width, isDark, { size: 17, y: 26 });
    drawSubtitle(
        ctx,
        `E = ${read.E.toFixed(1)} N/C (${read.E >= 0 ? '向上' : '向下'})   B = ${read.B.toFixed(2)} T (⊙ 出纸面)   ` +
            `v₀ = ${read.v0.toFixed(1)} m/s`,
        width / 2,
        46,
        isDark
    );

    // —— ⊙ 出纸面符号 (引擎 B 恒为 +z) ——
    const symGap = 40;
    for (let gx = plotLeft; gx <= plotRight; gx += symGap) {
        for (let gy = plotTop; gy <= plotBottom; gy += symGap) {
            // 只在两极板之间画 ⊙ (板外没有磁场)
            if (gy < axisY - halfGapPx + 8 || gy > axisY + halfGapPx - 8) continue;
            ctx.strokeStyle = tokens.canvasBFieldLine;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.arc(gx, gy, 7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = tokens.canvasBFieldLine;
            ctx.beginPath();
            ctx.arc(gx, gy, 2.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // —— 极板 (E = (0, Ey): Ey>0 → 电场向上 → 下板 + / 上板 −) ——
    const eUp = read.E >= 0;
    const drawPlate = (py: number, sign: '+' | '−', color: string) => {
        ctx.fillStyle = isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.22)';
        roundRectPath(ctx, plotLeft - 26, py - 7, plotRight - plotLeft + 52, 14, 4);
        ctx.fill();
        ctx.strokeStyle = mutedColor(isDark);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        const bx = plotRight + 42;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(bx, py, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sign, bx, py + 1);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
    };
    drawPlate(axisY - halfGapPx, eUp ? '−' : '+', COLORS.BLUE);
    drawPlate(axisY + halfGapPx, eUp ? '+' : '−', COLORS.RED);

    // —— 电场线箭头 (方向 = E 方向) ——
    const arrowColor = tokens.canvasEFieldAccent;
    const arrowCount = 7;
    for (let i = 0; i < arrowCount; i++) {
        const ax = plotLeft + ((i + 0.5) / arrowCount) * (plotRight - plotLeft);
        const from = eUp ? axisY + halfGapPx - 16 : axisY - halfGapPx + 16;
        const to = eUp ? axisY - halfGapPx + 16 : axisY + halfGapPx - 16;
        ctx.strokeStyle = arrowColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(ax, from);
        ctx.lineTo(ax, to);
        ctx.stroke();
        const dir = eUp ? -1 : 1;
        ctx.fillStyle = arrowColor;
        ctx.beginPath();
        ctx.moveTo(ax, to);
        ctx.lineTo(ax - 6, to - dir * 12);
        ctx.lineTo(ax + 6, to - dir * 12);
        ctx.closePath();
        ctx.fill();
    }

    // —— 电子枪发射口 ——
    ctx.fillStyle = isDark ? '#334155' : '#475569';
    roundRectPath(ctx, plotLeft - 92, axisY - 13, 64, 26, 6);
    ctx.fill();
    ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
    roundRectPath(ctx, plotLeft - 36, axisY - 7, 12, 14, 3);
    ctx.fill();
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('电子枪', plotLeft - 60, axisY - 22);
    ctx.textAlign = 'left';

    // —— 出射速度选择狭缝 (只放行几乎不偏转的粒子) ——
    const slitX = plotRight + 26;
    const slitHalf = Math.min(10, halfGapPx * 0.22);
    ctx.fillStyle = isDark ? '#1e293b' : '#334155';
    ctx.fillRect(slitX - 5, axisY - halfGapPx - 12, 10, halfGapPx + 12 - slitHalf);
    ctx.fillRect(slitX - 5, axisY + slitHalf, 10, halfGapPx + 12 - slitHalf);

    // —— 轨迹 (引擎结果) ——
    if (traj.length > 1) {
        ctx.strokeStyle = COLORS.ORANGE;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let i = 0; i < traj.length; i++) {
            const p = traj[i]!;
            const px = xPx(p.position.x);
            const py = yPx(p.position.y);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    // —— 当前质点 + 速度矢量 + 合力矢量 ——
    const cx = xPx(read.x);
    const cy = yPx(read.y);
    const vLen = 44;
    const vMag = Math.hypot(read.v0, 0) || 1;
    const frame = getFrame(simulationResult ?? null, currentTime);
    const vx = frame ? frame.velocity.x : read.v0;
    const vy = frame ? frame.velocity.y : 0;
    const speed = Math.hypot(vx, vy);
    if (speed > 1e-9) {
        drawArrow(ctx, cx, cy, cx + (vx / speed) * vLen, cy - (vy / speed) * vLen, COLORS.CYAN, 'v');
    }
    void vMag;

    ctx.fillStyle = COLORS.ORANGE;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // —— HUD 读数 ——
    drawHud(ctx, isDark, [
        { label: 't', value: `${read.t.toFixed(3)} s` },
        { label: 'x', value: `${read.x.toFixed(2)} m` },
        { label: 'y', value: `${read.y.toFixed(3)} m` },
        { label: 'v', value: `${read.v.toFixed(1)} m/s` },
        { label: 'v选择', value: `${read.vSelect.toFixed(1)} m/s` },
        { label: '判定', value: read.selected ? '被选中·直线' : '被偏转' }
    ]);

    drawInfoBar(
        ctx,
        width,
        height,
        read.selected
            ? `v₀ = E/B = ${read.vSelect.toFixed(1)} m/s → 电场力与洛伦兹力平衡, 直线通过`
            : `v₀ = ${read.v0.toFixed(1)} m/s ≠ E/B = ${read.vSelect.toFixed(1)} m/s → ` +
                  `漂移 v_d = E/B, 摆线摆幅 |v₀−v_d|·m/(qB) = ${((Math.abs(read.v0 - read.vSelect) * (params['mass'] ?? 2) * 1e-8) / Math.abs((params['charge'] ?? 2) * 1e-6 * read.B)).toFixed(3)} m`,
        isDark
    );

    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

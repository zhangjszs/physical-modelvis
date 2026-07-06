/**
 * 选必一 第二章「机械振动」场景渲染模块
 *
 * 包含 3 个可视化场景：
 *   1. drawDoublePendulumSyncScene — 双单摆步调比较 (同相/反相/不同摆长)
 *   2. drawForcedVibrationScene   — 受迫振动 (弹簧振子 + 旋转矢量 + A-f 曲线)
 *   3. drawResonanceCurveScene     — 共振曲线 (A-f 多阻尼对比 + Q 因数标注)
 *
 * 设计原则 (沿用 chapter3Scenes.ts):
 *   - 纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 *   - 每个场景函数负责完整渲染 (背景 + 动态元素 + HUD)
 *   - 共享工具函数在本文件内复用
 *   - 与 SimulationCanvas 中 drawCollisionScene / drawSpringScene 风格一致
 *
 * 重要物理说明:
 *   - double-pendulum 模型实为「双单摆步调比较」: 两个独立单摆 L1/L2 固定在同一横梁,
 *     theta_i(t) = A_i * cos(omega_i * t + phi_i), omega_i = sqrt(g/L_i).
 *     与混沌双摆 (耦合运动方程链) 不同, 这里解析解足以驱动渲染.
 *   - 因此「rodLength1/rodLength2」对应本模型的 length1/length2 参数.
 */

import type { SimulationResult, TrajectoryPoint } from 'physics-core';
import { findFrameIndex, interpolateFrame } from '../utils/frameUtils';

// ========== 共享类型 ==========

export interface Chapter2SceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

// ========== 共享工具函数 ==========

/** 圆角矩形路径 */
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

/** 颜色加深/变亮 */
function shadeColor(hex: string, amount: number): string {
    const h = hex.replace('#', '');
    const full =
        h.length === 3
            ? h
                  .split('')
                  .map(c => c + c)
                  .join('')
            : h;
    const r = Math.max(0, Math.min(255, parseInt(full.slice(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(full.slice(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(full.slice(4, 6), 16) + amount));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/** 从轨迹中获取当前帧 (插值后) */
function getCurrentFrame(
    simulationResult: SimulationResult | null,
    currentTime: number,
    trajectoryIndex = 0
): TrajectoryPoint | null {
    if (!simulationResult) return null;
    const traj = simulationResult.trajectories[trajectoryIndex];
    if (!traj || traj.length === 0) return null;
    const idx = findFrameIndex([traj], currentTime);
    const p0 = traj[idx]!;
    const p1 = traj[Math.min(idx + 1, traj.length - 1)]!;
    return interpolateFrame(p0, p1, currentTime);
}

/** 绘制"点击运行仿真"提示 */
function drawEmptyState(ctx: CanvasRenderingContext2D, width: number, height: number, isDark: boolean): void {
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('点击「运行仿真」开始', width / 2, height / 2);
    ctx.textBaseline = 'alphabetic';
}

/** 绘制左上角状态 HUD */
function drawHud(ctx: CanvasRenderingContext2D, isDark: boolean, rows: Array<{ label: string; value: string }>): void {
    if (rows.length === 0) return;
    const padding = 10;
    const lineH = 18;
    const boxH = rows.length * lineH + padding * 2;
    const boxW = 190;

    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.85)';
    roundRectPath(ctx, 8, 10, boxW, boxH, 6);
    ctx.fill();

    rows.forEach((row, i) => {
        const y = 10 + padding + i * lineH;
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${row.label} = ${row.value}`, 16, y);
    });
    ctx.textBaseline = 'alphabetic';
}

/** 绘制底部信息条 */
function drawInfoBar(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    text: string,
    isDark: boolean
): void {
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, width / 2 - tw / 2 - 8, height - 34, tw + 16, 22, 4);
    ctx.fill();
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.fillText(text, width / 2, height - 18);
}

/** 3D 风格方块 */
function draw3DBlock(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    baseColor: string,
    isDark: boolean,
    label?: string
): void {
    const x = cx - w / 2,
        y = cy - h / 2;
    ctx.fillStyle = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.12)';
    roundRectPath(ctx, x + 3, y + 3, w, h, 4);
    ctx.fill();
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, baseColor);
    grad.addColorStop(1, shadeColor(baseColor, -30));
    ctx.fillStyle = grad;
    roundRectPath(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRectPath(ctx, x + 3, y + 3, w - 6, h * 0.3, 3);
    ctx.fill();
    if (label) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, cy);
    }
}

/** 精致弹簧绘制 (水平) */
function drawSpringCoil(
    ctx: CanvasRenderingContext2D,
    x1: number,
    x2: number,
    cy: number,
    coils: number,
    amplitude: number,
    isDark: boolean,
    colorMain: string
): void {
    const len = Math.max(20, x2 - x1);
    const effectiveAmplitude = Math.max(5, Math.min(amplitude, len / coils / 2.2));
    ctx.strokeStyle = isDark ? 'rgba(34,211,238,0.15)' : 'rgba(8,145,178,0.12)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x1, cy);
    for (let i = 0; i <= coils; i++) {
        const px = x1 + (len * i) / coils;
        const py = cy + (i === 0 || i === coils ? 0 : i % 2 === 0 ? -effectiveAmplitude : effectiveAmplitude);
        ctx.lineTo(px, py);
    }
    ctx.stroke();

    const springGrad = ctx.createLinearGradient(x1, cy - effectiveAmplitude, x1, cy + effectiveAmplitude);
    springGrad.addColorStop(0, isDark ? '#67e8f9' : '#06b6d4');
    springGrad.addColorStop(0.5, colorMain);
    springGrad.addColorStop(1, isDark ? '#06b6d4' : '#0e7490');
    ctx.strokeStyle = springGrad;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, cy);
    for (let i = 0; i <= coils; i++) {
        const px = x1 + (len * i) / coils;
        const py = cy + (i === 0 || i === coils ? 0 : i % 2 === 0 ? -effectiveAmplitude : effectiveAmplitude);
        ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.lineJoin = 'miter';
}

// =====================================================================
// 共享: 从屏幕坐标中的 x 区域绘制一个最小最大坐标轴 (用于嵌套 mini 图)
// =====================================================================

interface MiniChartProps {
    ctx: CanvasRenderingContext2D;
    x: number;
    y: number;
    w: number;
    h: number;
    xs: number[];
    ys: number[];
    isDark: boolean;
    lineColor: string;
    label?: string;
    yFormatter?: (v: number) => string;
    showPeakX?: number;
    peakLabel?: string;
}

/** 绘制一个 mini A-f 或 x-t 折线, 带坐标轴和峰值竖线 */
function drawMiniChart(opts: MiniChartProps): void {
    const { ctx, x, y, w, h, xs, ys, isDark, label, yFormatter, showPeakX, peakLabel } = opts;
    if (xs.length === 0 || ys.length === 0) return;

    const xMin = xs[0]!;
    const xMax = xs[xs.length - 1]!;
    let yMin = Math.min(...ys);
    let yMax = Math.max(...ys);
    if (yMax - yMin < 1e-9) {
        yMax = yMin + 1;
    }
    const padY = (yMax - yMin) * 0.1;
    yMin -= padY;
    yMax += padY;

    // 背景
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.65)';
    roundRectPath(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.4)' : 'rgba(100,116,139,0.25)';
    ctx.lineWidth = 1;
    roundRectPath(ctx, x, y, w, h, 6);
    ctx.stroke();

    const sx = (xv: number) => x + ((xv - xMin) / (xMax - xMin)) * w;
    const sy = (yv: number) => y + h - ((yv - yMin) / (yMax - yMin)) * h;

    // 轴刻度
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.12)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
        const gx = x + (w * i) / 4;
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, y + h);
        ctx.stroke();
    }

    // 折线
    ctx.strokeStyle = opts.lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < xs.length; i++) {
        const px = sx(xs[i]!);
        const py = sy(ys[i]!);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // 峰值守竖线
    if (showPeakX !== undefined) {
        const px = sx(showPeakX);
        if (px >= x && px <= x + w) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(px, y);
            ctx.lineTo(px, y + h);
            ctx.stroke();
            ctx.setLineDash([]);
            if (peakLabel) {
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(peakLabel, px, y - 4);
            }
        }
    }

    // 轴标签
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(yFormatter ? yFormatter(yMax) : yMax.toFixed(2), x + 4, y + 4);
    ctx.fillText(yFormatter ? yFormatter(yMin) : yMin.toFixed(2), x + 4, y + h - 14);

    if (label) {
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(label, x + 4, y + h + 4);
    }
}

// =====================================================================
// 场景 1: 双单摆步调比较 (同相 / 反相 / 不同摆长)
// =====================================================================

/**
 * 绘制双单摆比较场景: 天花板上挂下的两根独立摆线 + 两个摆球 + 相位标记 + 摆球 2 拖尾.
 *
 * 物理关系 (小角度近似):
 *   theta_i(t) = A_i * cos(omega_i * t + phi_i)
 *   omega_i = sqrt(g / L_i)
 *   phi_1 = 0, phi_2 = phaseDiff
 *   T_i = 2 * pi * sqrt(L_i / g)
 */
export function drawDoublePendulumSyncScene(opts: Chapter2SceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;

    const L1 = params['length1'] ?? 1.0;
    const L2 = params['length2'] ?? 0.5;
    const A1deg = params['angle1'] ?? 10;
    const A2deg = params['angle2'] ?? 10;
    const phaseDiffDeg = params['phaseDiff'] ?? 0;
    const g = params['gravity'] ?? 9.8;

    const omega1 = Math.sqrt(g / L1);
    const omega2 = Math.sqrt(g / L2);
    const T1 = (2 * Math.PI) / omega1;
    const T2 = (2 * Math.PI) / omega2;
    const A1 = (A1deg * Math.PI) / 180;
    const A2 = (A2deg * Math.PI) / 180;
    const phi2 = (phaseDiffDeg * Math.PI) / 180;

    // 直接从解析式计算当前角度 (不依赖轨迹)
    const theta1 = A1 * Math.cos(omega1 * currentTime);
    const theta2 = A2 * Math.cos(omega2 * currentTime + phi2);

    // 布局
    const ceilingY = 50;
    const pivot1X = width * 0.32;
    const pivot2X = width * 0.68;
    const maxLen = Math.max(L1, L2);
    const pixelsPerMeter = Math.min((height - ceilingY - 60) / (maxLen * 1.4), 220);

    // --- 天花板 ---
    const ceilGrad = ctx.createLinearGradient(0, ceilingY - 14, 0, ceilingY);
    ceilGrad.addColorStop(0, isDark ? '#334155' : '#94a3b8');
    ceilGrad.addColorStop(1, isDark ? '#475569' : '#cbd5e1');
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(Math.min(pivot1X, pivot2X) - 60, ceilingY - 14, Math.abs(pivot2X - pivot1X) + 120, 14);
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.25)' : 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (let i = -60; i < Math.abs(pivot2X - pivot1X) + 80; i += 6) {
        ctx.beginPath();
        ctx.moveTo(Math.min(pivot1X, pivot2X) + i, ceilingY - 14);
        ctx.lineTo(Math.min(pivot1X, pivot2X) + i + 8, ceilingY - 4);
        ctx.stroke();
    }

    // --- 摆 1 ---
    const rod1Len = L1 * pixelsPerMeter;
    const b1x = pivot1X + rod1Len * Math.sin(theta1);
    const b1y = ceilingY + rod1Len * Math.cos(theta1);

    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivot1X, ceilingY);
    ctx.lineTo(b1x, b1y);
    ctx.stroke();

    // 摆 1 球 (蓝色)
    const r1 = 14;
    ctx.fillStyle = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(b1x + 2, b1y + 4, r1, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    const grad1 = ctx.createRadialGradient(b1x - 4, b1y - 4, 2, b1x, b1y, r1);
    grad1.addColorStop(0, '#93c5fd');
    grad1.addColorStop(0.5, '#3b82f6');
    grad1.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = grad1;
    ctx.beginPath();
    ctx.arc(b1x, b1y, r1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // --- 摆 2 ---
    const rod2Len = L2 * pixelsPerMeter;
    const b2x = pivot2X + rod2Len * Math.sin(theta2);
    const b2y = ceilingY + rod2Len * Math.cos(theta2);

    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivot2X, ceilingY);
    ctx.lineTo(b2x, b2y);
    ctx.stroke();

    // 摆球 2 拖尾 (模拟 80 帧最近的轨迹)
    const trailLen = 80;
    const trail: Array<{ x: number; y: number }> = [];
    for (let i = trailLen; i >= 0; i--) {
        const tt = currentTime - i * 0.05;
        if (tt < 0) continue;
        const t2t = A2 * Math.cos(omega2 * tt + phi2);
        trail.push({
            x: pivot2X + rod2Len * Math.sin(t2t),
            y: ceilingY + rod2Len * Math.cos(t2t)
        });
    }
    for (let i = 0; i < trail.length - 1; i++) {
        const alpha = 0.05 + 0.25 * (i / trail.length);
        ctx.strokeStyle = `rgba(249,115,22,${alpha})`;
        ctx.lineWidth = 1.5 + 1.5 * (i / trail.length);
        ctx.beginPath();
        ctx.moveTo(trail[i]!.x, trail[i]!.y);
        ctx.lineTo(trail[i + 1]!.x, trail[i + 1]!.y);
        ctx.stroke();
    }

    // 摆 2 球 (橙色)
    const r2 = 14;
    ctx.fillStyle = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(b2x + 2, b2y + 4, r2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    const grad2 = ctx.createRadialGradient(b2x - 4, b2y - 4, 2, b2x, b2y, r2);
    grad2.addColorStop(0, '#fdba74');
    grad2.addColorStop(0.5, '#f97316');
    grad2.addColorStop(1, '#c2410c');
    ctx.fillStyle = grad2;
    ctx.beginPath();
    ctx.arc(b2x, b2y, r2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9a3412';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // --- 相位标记: 每个摆球旁边的小圆点 ---
    // 在球旁沿摆动方向画小圆点 (仅当角速度较大时可见, 模拟运动方向指示)
    const dth1 = -A1 * omega1 * Math.sin(omega1 * currentTime);
    const dth2 = -A2 * omega2 * Math.sin(omega2 * currentTime + phi2);

    const markerR = 3;
    const markerOffset = 20;
    // 切线方向 (单位向量)
    const ux1 = Math.cos(theta1),
        uy1 = -Math.sin(theta1);
    const ux2 = Math.cos(theta2),
        uy2 = -Math.sin(theta2);
    const sign1 = dth1 >= 0 ? 1 : -1;
    const sign2 = dth2 >= 0 ? 1 : -1;

    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(b1x + ux1 * markerOffset * sign1, b1y + uy1 * markerOffset * sign1, markerR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.arc(b2x + ux2 * markerOffset * sign2, b2y + uy2 * markerOffset * sign2, markerR, 0, Math.PI * 2);
    ctx.fill();

    // --- 标题 + 步调状态判定 ---
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('双单摆步调比较', width / 2, 24);

    const sameLen = Math.abs(L1 - L2) < 1e-6;
    const inPhase = Math.abs(phaseDiffDeg) < 1 || Math.abs(phaseDiffDeg - 360) < 1;
    const antiPhase = Math.abs(phaseDiffDeg - 180) < 1;
    let syncLabel: string;
    if (sameLen && inPhase) syncLabel = '步调一致 (同相 + 同摆长)';
    else if (sameLen && antiPhase) syncLabel = '步调相反 (反相)';
    else if (!sameLen) syncLabel = '摆长不同 → 周期不同';
    else syncLabel = `相位差 ${phaseDiffDeg.toFixed(0)}°`;

    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    const syncTw = ctx.measureText(syncLabel).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, width / 2 - syncTw / 2 - 8, 32, syncTw + 16, 22, 4);
    ctx.fill();
    ctx.fillStyle = sameLen && inPhase ? '#22c55e' : sameLen && antiPhase ? '#f59e0b' : '#3b82f6';
    ctx.fillText(syncLabel, width / 2, 47);

    // --- 刻度: L1 / L2 标签 ---
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`L₁=${L1.toFixed(2)}m  T₁=${T1.toFixed(2)}s`, pivot1X, height - 36);
    ctx.fillText(`L₂=${L2.toFixed(2)}m  T₂=${T2.toFixed(2)}s`, pivot2X, height - 36);

    // --- 信息条 ---
    drawInfoBar(
        ctx,
        width,
        height,
        `L₁=${L1.toFixed(2)}m  L₂=${L2.toFixed(2)}m  Δφ=${phaseDiffDeg.toFixed(0)}°  g=${g.toFixed(1)}m/s²`,
        isDark
    );

    // --- HUD ---
    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(3)} s` },
        { label: 'θ₁', value: `${((theta1 * 180) / Math.PI).toFixed(2)} °` },
        { label: 'θ₂', value: `${((theta2 * 180) / Math.PI).toFixed(2)} °` },
        { label: 'T₁/T₂', value: `${T1.toFixed(2)}/${T2.toFixed(2)} s` }
    ]);

    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

// =====================================================================
// 场景 2: 受迫振动 (弹簧振子 + 驱动力旋转矢量 + A-f 曲线 + 相位差圆盘)
// =====================================================================

/**
 * 绘制受迫振动物理场景.
 *
 *    - 左侧: 墙壁 + 水平弹簧 + 物块, 平衡位置与当前位移 (红点) + 速度向量 (绿色)
 *    - 左中: 驱动力旋转矢量 (小圆盘), 角速度 = omega_d = 2*pi*f_drive
 *    - 右侧纵向:
 *        - 顶部: A-f 共振曲线, A_theoretical 红色竖线
 *        - 底部: 稳态阶段位移-时间图 (取自 simulationResult.charts.x_t)
 *    - 右下角: 相位差小圆盘 (驱动 vs 位移)
 *
 * 物理关系:
 *   omega_0 = sqrt(k / m), f_0 = omega_0 / (2*pi)
 *   A = (F0/m) / sqrt((omega_0^2 - omega_d^2)^2 + (2*beta*omega_d)^2)
 *   tan(phi) = 2*beta*omega_d / (omega_0^2 - omega_d^2)
 */
export function drawForcedVibrationScene(opts: Chapter2SceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;

    const m = params['mass'] ?? 1;
    const k = params['k'] ?? 100;
    const beta = params['beta'] ?? 0.3;
    const F0 = params['forceAmp'] ?? 1;
    const fDrive = params['driveFreq'] ?? 2;

    const omega0 = Math.sqrt(k / m);
    const omegaD = 2 * Math.PI * fDrive;
    const f0 = omega0 / (2 * Math.PI);
    const denom = Math.sqrt((omega0 * omega0 - omegaD * omegaD) ** 2 + (2 * beta * omegaD) ** 2);
    const A_theory = denom > 1e-12 ? F0 / m / denom : 0;
    const phi = Math.atan2(2 * beta * omegaD, omega0 * omega0 - omegaD * omegaD);

    // 从轨迹获取当前位移 (或退化为解析稳态预测)
    let xNow = 0;
    let vNow = 0;
    const frame = getCurrentFrame(simulationResult, currentTime);
    if (frame) {
        xNow = frame.position.x;
        vNow = frame.velocity.x;
    } else {
        // 无仿真时退化为稳态预测 (忽略暂态)
        xNow = A_theory * Math.cos(omegaD * currentTime + phi);
        vNow = -A_theory * omegaD * Math.sin(omegaD * currentTime + phi);
    }

    // 布局
    const cellH = height * 0.5;
    const cellW = width * 0.5;
    const leftX = 20;
    const leftW = cellW - 40;
    const rightX = cellW + 20;
    const rightW = cellW - 40;
    const topY = 36;
    const topH = cellH - 80;
    const bottomY = cellH + 20;
    const bottomH = cellH - 80;

    // -------------------------------------------------------------------
    // 左上: 墙壁 + 弹簧 + 物块
    // -------------------------------------------------------------------
    const groundY = topY + topH * 0.65;
    // 地面线
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftX, groundY);
    ctx.lineTo(leftX + leftW, groundY);
    ctx.stroke();
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.3)' : 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (let gx = leftX; gx < leftX + leftW; gx += 12) {
        ctx.beginPath();
        ctx.moveTo(gx, groundY);
        ctx.lineTo(gx - 8, groundY + 8);
        ctx.stroke();
    }

    // 墙壁 (左端)
    const wallX = leftX + 30;
    const wallGrad = ctx.createLinearGradient(wallX - 14, 0, wallX, 0);
    wallGrad.addColorStop(0, isDark ? '#334155' : '#94a3b8');
    wallGrad.addColorStop(1, isDark ? '#475569' : '#cbd5e1');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(wallX - 14, groundY - 60, 14, 60);
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.25)' : 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 60; i += 6) {
        ctx.beginPath();
        ctx.moveTo(wallX - 14, groundY - 60 + i);
        ctx.lineTo(wallX - 4, groundY - 60 + i + 10);
        ctx.stroke();
    }

    // 平衡位置 与 弹簧端
    const eqX = leftX + leftW * 0.5;
    const ampScale = Math.min(leftW * 0.32, 180); // 1m -> ampScale px
    const blockX = eqX + xNow * ampScale;
    const blockW = 44;
    const blockH = 36;

    // 平衡位置虚线
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.35)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(eqX, groundY - 70);
    ctx.lineTo(eqX, groundY + 6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('平衡', eqX, groundY + 18);

    // 弹簧
    drawSpringCoil(ctx, wallX, blockX - blockW / 2, groundY - blockH / 2, 14, 10, isDark, '#0891b2');

    // 物块
    draw3DBlock(ctx, blockX, groundY - blockH / 2, blockW, blockH, '#3b82f6', isDark, `${m.toFixed(2)}kg`);

    // 速度向量
    if (Math.abs(vNow) > 0.01) {
        const vScale = 30;
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(blockX, groundY - blockH - 8);
        ctx.lineTo(blockX + vNow * vScale, groundY - blockH - 8);
        ctx.stroke();
        const angle = vNow >= 0 ? 0 : Math.PI;
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        const headX = blockX + vNow * vScale;
        ctx.moveTo(headX, groundY - blockH - 8);
        ctx.lineTo(headX - 8 * Math.cos(angle) + 0, groundY - blockH - 8 - 5);
        ctx.lineTo(headX - 8 * Math.cos(angle) + 0, groundY - blockH - 8 + 5);
        ctx.closePath();
        ctx.fill();
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#22c55e';
        ctx.textAlign = 'center';
        ctx.fillText(`v=${vNow.toFixed(2)}`, blockX, groundY - blockH - 16);
    }

    // 驱动力标注 (作用在块上向右的切变力)
    const fDriveNow = F0 * Math.cos(omegaD * currentTime);
    if (Math.abs(fDriveNow) > 0.01) {
        const fScale = 6; // 1N=6px
        const fEnd = blockX + fDriveNow * fScale;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(blockX, groundY - blockH / 2 - 20);
        ctx.lineTo(fEnd, groundY - blockH / 2 - 20);
        ctx.stroke();
        const fdir = fDriveNow >= 0 ? 1 : -1;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(fEnd, groundY - blockH / 2 - 20);
        ctx.lineTo(fEnd - 7 * fdir, groundY - blockH / 2 - 20 - 4);
        ctx.lineTo(fEnd - 7 * fdir, groundY - blockH / 2 - 20 + 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('F_d', blockX, groundY - blockH / 2 - 28);
    }

    // -------------------------------------------------------------------
    // 右上: A-f 共振曲线
    // -------------------------------------------------------------------
    const afChartX = rightX;
    const afChartY = topY;
    const afChartW = rightW;
    const afChartH = topH;

    // 从 simulationResult.A_f_drive 画曲线; 若无则退化为解析计算
    const afPointsX: number[] = [];
    const afPointsY: number[] = [];
    const chartAf = simulationResult?.charts?.A_f_drive;
    if (chartAf && chartAf.points.length > 0) {
        for (const p of chartAf.points) {
            afPointsX.push(p.x);
            afPointsY.push(p.y);
        }
    } else {
        // 解析计算一个本地曲线
        const sweepN = 80;
        const fMin = Math.max(0.1, f0 * 0.3);
        const fMax = f0 * 2.2;
        for (let i = 0; i <= sweepN; i++) {
            const fi = fMin + ((fMax - fMin) * i) / sweepN;
            const omegai = 2 * Math.PI * fi;
            const denI = Math.sqrt((omega0 * omega0 - omegai * omegai) ** 2 + (2 * beta * omegai) ** 2);
            const Ai = denI > 1e-12 ? F0 / m / denI : 0;
            afPointsX.push(fi);
            afPointsY.push(Ai);
        }
    }

    drawMiniChart({
        ctx,
        x: afChartX,
        y: afChartY,
        w: afChartW,
        h: afChartH,
        xs: afPointsX,
        ys: afPointsY,
        isDark,
        lineColor: '#3b82f6',
        label: 'A-f 共振曲线',
        yFormatter: v => `${v.toFixed(2)}m`,
        showPeakX: fDrive,
        peakLabel: `f_d=${fDrive}Hz`
    });

    // 共振条件图标 (f_d ≈ f_0 时红色脉冲指示)
    const nearRes = Math.abs(fDrive - f0) / f0 < 0.15;
    if (nearRes) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('⚡ 共振', afChartX + afChartW - 6, afChartY + 4);
    }

    // -------------------------------------------------------------------
    // 右下: 稳态位移-时间 (x_t)
    // -------------------------------------------------------------------
    const xtChartX = rightX;
    const xtChartY = bottomY + 16;
    const xtChartW = rightW;
    const xtChartH = bottomH - 20;

    const xtXs: number[] = [];
    const xtYs: number[] = [];
    const chartXt = simulationResult?.charts?.x_t;
    if (chartXt && chartXt.points.length > 0) {
        for (const p of chartXt.points) {
            xtXs.push(p.x);
            xtYs.push(p.y);
        }
    }

    if (xtXs.length > 1) {
        drawMiniChart({
            ctx,
            x: xtChartX,
            y: xtChartY,
            w: xtChartW,
            h: xtChartH,
            xs: xtXs,
            ys: xtYs,
            isDark,
            lineColor: '#f97316',
            label: '稳态 x-t (末 2 周期)',
            yFormatter: v => `${v.toFixed(2)}m`
        });
    } else {
        // 无稳态数据时画一个近似稳态小图
        const sweepN = 60;
        const t0 = currentTime;
        for (let i = 0; i <= sweepN; i++) {
            const tt = t0 + (i / sweepN) * 0.2;
            xtXs.push(tt);
            xtYs.push(A_theory * Math.cos(omegaD * tt + phi));
        }
        drawMiniChart({
            ctx,
            x: xtChartX,
            y: xtChartY,
            w: xtChartW,
            h: xtChartH,
            xs: xtXs,
            ys: xtYs,
            isDark,
            lineColor: '#f97316',
            label: '稳态 x-t (预测)',
            yFormatter: v => `${v.toFixed(2)}m`
        });
    }

    // -------------------------------------------------------------------
    // 左下: 驱动力旋转矢量 + 相位差圆盘
    // -------------------------------------------------------------------
    const phaseDiskX = leftX + leftW * 0.28;
    const phaseDiskY = bottomY + bottomH * 0.32;
    const phaseDiskR = Math.min(leftW, bottomH) * 0.22;

    // 驱动力旋转矢量
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(phaseDiskX, phaseDiskY, phaseDiskR + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 参考轴
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.25)';
    ctx.beginPath();
    ctx.moveTo(phaseDiskX - phaseDiskR - 4, phaseDiskY);
    ctx.lineTo(phaseDiskX + phaseDiskR + 4, phaseDiskY);
    ctx.moveTo(phaseDiskX, phaseDiskY - phaseDiskR - 4);
    ctx.lineTo(phaseDiskX, phaseDiskY + phaseDiskR + 4);
    ctx.stroke();

    // 驱动力矢量 (cos 始终 0° 为参考)
    const driveAngle = omegaD * currentTime;
    const dvx = phaseDiskR * Math.cos(driveAngle);
    const dvy = -phaseDiskR * Math.sin(driveAngle);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(phaseDiskX, phaseDiskY);
    ctx.lineTo(phaseDiskX + dvx, phaseDiskY + dvy);
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(phaseDiskX + dvx, phaseDiskY + dvy, 4, 0, Math.PI * 2);
    ctx.fill();

    // 位移矢量 (相对相位角 phi)
    const disAngle = omegaD * currentTime + phi;
    const svx = phaseDiskR * 0.78 * Math.cos(disAngle);
    const svy = -phaseDiskR * 0.78 * Math.sin(disAngle);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(phaseDiskX, phaseDiskY);
    ctx.lineTo(phaseDiskX + svx, phaseDiskY + svy);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(phaseDiskX + svx, phaseDiskY + svy, 4, 0, Math.PI * 2);
    ctx.fill();

    // φ 标注
    if (Math.abs(phi) > 0.01) {
        const arcR = phaseDiskR * 0.45;
        ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.7)' : 'rgba(100,116,139,0.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(phaseDiskX, phaseDiskY, arcR, -phi, 0, phi < 0);
        ctx.stroke();
        ctx.fillStyle = isDark ? '#cbd5e1' : '#1e293b';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
            `φ=${((phi * 180) / Math.PI).toFixed(0)}°`,
            phaseDiskX + (arcR + 12) * Math.cos(-phi / 2),
            phaseDiskY + (arcR + 12) * Math.sin(-phi / 2)
        );
    }

    // 图例
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('● 驱动力', phaseDiskX + phaseDiskR + 12, phaseDiskY - 14);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('● 位移', phaseDiskX + phaseDiskR + 12, phaseDiskY);
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    const subLabel = `f₀=${f0.toFixed(2)}Hz  ω_d/ω₀=${(omegaD / omega0).toFixed(2)}`;
    ctx.fillText(subLabel, phaseDiskX - phaseDiskR, phaseDiskY + phaseDiskR + 14);

    // -------------------------------------------------------------------
    // 标题 + 信息
    // -------------------------------------------------------------------
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('受迫振动 (稳态频率 = 驱动频率)', width / 2, 24);

    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(3)} s` },
        { label: 'x', value: `${xNow.toFixed(3)} m` },
        { label: 'v', value: `${vNow.toFixed(3)} m/s` },
        { label: 'A', value: `${A_theory.toFixed(3)} m` }
    ]);

    drawInfoBar(
        ctx,
        width,
        height,
        `m=${m}kg  k=${k}N/m  f₀=${f0.toFixed(2)}Hz  f_d=${fDrive}Hz  β=${beta}  A=${A_theory.toFixed(3)}m`,
        isDark
    );

    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

// =====================================================================
// 场景 3: 共振曲线 (A-f 多阻尼对比 + Q 因数 + 当前频率扫描 + 动态振子)
// =====================================================================

/**
 * 绘制共振曲线场景.
 *
 *    - 顶部 (70%): A-f 主图. 多条阻尼曲线 (若只有一个阻尼就画一条)
 *         • 红色竖线 = 当前驱动频率 f_d (默认 = f_0 或用户选取)
 *         • 黑色虚线 = 峰值频率 f_peak (beta-dependent)
 *         • 标注 f_0, Q=f_0/Δf (-3dB 带宽)
 *    - 底部 (30%): 当前驱动下的物块振动弹簧 + 小振幅/大振幅对比, 数字显示 A(f_d)
 *
 * 阻尼曲线复用 A(f) = (F0/m) / sqrt((omega_0^2 - omega^2)^2 + (2*beta*omega)^2).
 */
export function drawResonanceCurveScene(opts: Chapter2SceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;

    const m = params['mass'] ?? 1;
    const k = params['k'] ?? 100;
    const F0 = params['forceAmp'] ?? 1;
    const beta = params['beta'] ?? 0.5;
    const fMin = params['freqMin'] ?? 0.1;
    const fMax = params['freqMax'] ?? 10;

    const omega0 = Math.sqrt(k / m);
    const f0 = omega0 / (2 * Math.PI);

    // 利用多阻尼曲线
    const chartA = simulationResult?.charts?.A_f_drive;
    const chartMulti = simulationResult?.charts?.multi_damping_curves;

    // 布局
    const titleH = 28;
    const mainX = 50;
    const mainY = titleH + 16;
    const mainW = width - 80;
    const mainH = height * 0.6;

    // 利用 currentTime 变化映射到扫频 (fMin → fMax), 默认周期 6 秒
    const sweepPeriod = 6;
    const phaseT = (currentTime % sweepPeriod) / sweepPeriod;
    const sweepF = fMin + phaseT * (fMax - fMin);

    // 当前频率
    const fNow = sweepF;
    const omegaNow = 2 * Math.PI * fNow;
    const denomNow = Math.sqrt((omega0 * omega0 - omegaNow * omegaNow) ** 2 + (2 * beta * omegaNow) ** 2);
    const Anow = denomNow > 1e-12 ? F0 / m / denomNow : 0;

    // 主曲线计算 (仅当 chart 不存在时补全)
    const betaColors = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444'];

    // -------------------------------------------------------------------
    // 顶部: A-f 主图
    // -------------------------------------------------------------------

    // 背景卡
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.7)';
    roundRectPath(ctx, mainX - 16, mainY - 8, mainW + 32, mainH + 16, 8);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#e2e8f0';
    ctx.lineWidth = 1;
    roundRectPath(ctx, mainX - 16, mainY - 8, mainW + 32, mainH + 16, 8);
    ctx.stroke();

    // 数据范围
    let gYMax = 0;
    const series: Array<{ beta: number; fPeek: number; aPeak: number; xs: number[]; ys: number[] }> = [];

    if (chartMulti && chartMulti.points.length > 0) {
        // 多阻尼曲线按顺序切分 (假定每个 beta 贡献 N 个点)
        // 默认按 121 点一份 (模型固定 N+1=121)
        const perSeries = 121;
        const nSeries = Math.floor(chartMulti.points.length / perSeries);
        for (let s = 0; s < nSeries; s++) {
            const xs: number[] = [];
            const ys: number[] = [];
            for (let i = 0; i < perSeries; i++) {
                const p = chartMulti.points[s * perSeries + i];
                if (p) {
                    xs.push(p.x);
                    ys.push(p.y);
                }
            }
            if (xs.length > 0) {
                const yMax = Math.max(...ys);
                const idx = ys.indexOf(yMax);
                series.push({ beta: beta, fPeek: xs[idx] ?? f0, aPeak: yMax, xs, ys });
                gYMax = Math.max(gYMax, yMax);
            }
        }
    }

    if (chartA && chartA.points.length > 0 && series.length === 0) {
        const xs: number[] = [];
        const ys: number[] = [];
        for (const p of chartA.points) {
            xs.push(p.x);
            ys.push(p.y);
        }
        const yMax = Math.max(...ys);
        // 峰值频率修正: sqrt(omega_0^2 - 2*beta^2) / (2*pi)
        const fp = Math.sqrt(Math.max(0, omega0 * omega0 - 2 * beta * beta)) / (2 * Math.PI);
        series.push({ beta, fPeek: fp, aPeak: yMax, xs, ys });
        gYMax = Math.max(gYMax, yMax);
    }

    if (series.length === 0) {
        // 全解析回退
        const N = 80;
        const xs: number[] = [];
        const ys: number[] = [];
        for (let i = 0; i <= N; i++) {
            const fi = fMin + ((fMax - fMin) * i) / N;
            xs.push(fi);
            const omi = 2 * Math.PI * fi;
            const denI = Math.sqrt((omega0 * omega0 - omi * omi) ** 2 + (2 * beta * omi) ** 2);
            ys.push(denI > 1e-12 ? F0 / m / denI : 0);
        }
        const yMax = Math.max(...ys);
        const fp = Math.sqrt(Math.max(0, omega0 * omega0 - 2 * beta * beta)) / (2 * Math.PI);
        series.push({ beta, fPeek: fp, aPeak: yMax, xs, ys });
        gYMax = yMax;
    }

    // 全局 y 最大值
    for (const s of series) gYMax = Math.max(gYMax, s.aPeak);
    const padY = gYMax * 0.15;
    const yMax = gYMax + padY;
    const yMin = 0;

    // 坐标映射
    const sx = (fv: number) => mainX + ((fv - fMin) / (fMax - fMin)) * mainW;
    const sy = (av: number) => mainY + mainH - ((av - yMin) / (yMax - yMin)) * mainH;

    // 轴
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mainX, mainY);
    ctx.lineTo(mainX, mainY + mainH);
    ctx.lineTo(mainX + mainW, mainY + mainH);
    ctx.stroke();

    // y 轴刻度 / 网格
    ctx.font = '10px monospace';
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
        const yVal = yMin + (i / 4) * (yMax - yMin);
        const py = sy(yVal);
        ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.10)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mainX, py);
        ctx.lineTo(mainX + mainW, py);
        ctx.stroke();
        ctx.fillText(yVal.toFixed(2), mainX - 6, py);
    }

    // x 轴刻度
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xTickN = 6;
    for (let i = 0; i <= xTickN; i++) {
        const fv = fMin + (i / xTickN) * (fMax - fMin);
        const px = sx(fv);
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.fillText(fv.toFixed(1), px, mainY + mainH + 6);
    }

    // 多条阻尼曲线
    series.forEach((s, idx) => {
        const color = betaColors[idx % betaColors.length]!;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < s.xs.length; i++) {
            const px = sx(s.xs[i]!);
            const py = sy(s.ys[i]!);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // 峰值小圆点
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx(s.fPeek), sy(s.aPeak), 4, 0, Math.PI * 2);
        ctx.fill();

        // 图例
        ctx.fillStyle = color;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`β=${s.beta.toFixed(2)}/s`, mainX + 6 + idx * 80, mainY + 8);
    });

    // f_0 竖线 (beta无关)
    if (f0 >= fMin && f0 <= fMax) {
        const f0x = sx(f0);
        ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.55)' : 'rgba(100,116,139,0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(f0x, mainY);
        ctx.lineTo(f0x, mainY + mainH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`f₀=${f0.toFixed(2)}Hz`, f0x, mainY - 6);
    }

    // 峰值频率 f_peak 竖线
    if (series[0]) {
        const fpx = sx(series[0].fPeek);
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(fpx, mainY);
        ctx.lineTo(fpx, mainY + mainH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`f_peak`, fpx, mainY - 6 - (f0 >= fMin && f0 <= fMax ? 14 : 0));
    }

    // 当前频率红色竖线
    if (fNow >= fMin && fNow <= fMax) {
        const fnx = sx(fNow);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(fnx, mainY);
        ctx.lineTo(fnx, mainY + mainH);
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`f_d=${fNow.toFixed(2)}Hz`, fnx, mainY + mainH + 18);
    }

    // 轴标签
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('驱动频率 f (Hz)', mainX + mainW / 2, mainY + mainH + 32);
    ctx.save();
    ctx.translate(mainX - 32, mainY + mainH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('稳态振幅 A (m)', 0, 0);
    ctx.restore();

    // -------------------------------------------------------------------
    // 底部: Q 因数卡 + 动态振子 (左=振子, 右=参数)
    // -------------------------------------------------------------------
    const bottomY = mainY + mainH + 50;
    const bottomH = height - bottomY - 36;

    if (bottomH > 40) {
        const qFactor = omega0 / (2 * beta);

        // 左半部: 弹簧振子 + 底部对比
        const subX = 30;
        const subW = width * 0.55;
        const subCY = bottomY + bottomH * 0.5;

        // 地面
        const groundY = subCY + 16;
        ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(subX, groundY);
        ctx.lineTo(subX + subW, groundY);
        ctx.stroke();
        ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.3)' : 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        for (let gx = subX; gx < subX + subW; gx += 12) {
            ctx.beginPath();
            ctx.moveTo(gx, groundY);
            ctx.lineTo(gx - 8, groundY + 8);
            ctx.stroke();
        }

        // 墙壁
        const wallX = subX + 20;
        const wallGrad2 = ctx.createLinearGradient(wallX - 14, 0, wallX, 0);
        wallGrad2.addColorStop(0, isDark ? '#334155' : '#94a3b8');
        wallGrad2.addColorStop(1, isDark ? '#475569' : '#cbd5e1');
        ctx.fillStyle = wallGrad2;
        ctx.fillRect(wallX - 14, subCY - 36, 14, 60);
        ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.25)' : 'rgba(0,0,0,0.08)';
        for (let i = 0; i < 60; i += 6) {
            ctx.beginPath();
            ctx.moveTo(wallX - 14, subCY - 36 + i);
            ctx.lineTo(wallX - 4, subCY - 36 + i + 10);
            ctx.stroke();
        }

        // 平衡位置 虚线
        const eqX2 = subX + subW * 0.45;
        ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.35)';
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(eqX2, subCY - 40);
        ctx.lineTo(eqX2, groundY + 6);
        ctx.stroke();
        ctx.setLineDash([]);

        // 当前振幅 → 物块位置
        const ampScale2 = Math.min(subW * 0.32, 140);
        const blockX2 = eqX2 + Anow * ampScale2 * Math.cos(omegaNow * currentTime);
        const blockW2 = 38;
        const blockH2 = 30;

        // 弹簧
        drawSpringCoil(ctx, wallX, blockX2 - blockW2 / 2, subCY, 12, 9, isDark, '#0891b2');

        // 物块
        draw3DBlock(ctx, blockX2, subCY, blockW2, blockH2, '#3b82f6', isDark, `${m.toFixed(1)}kg`);

        // 振幅标注
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`A(f_d)=${Anow.toFixed(3)}m`, eqX2, groundY + 22);

        // 右半部: 参数卡
        const paramX = width * 0.62;
        const paramW = width * 0.34;
        const paramY = bottomY + 4;
        const paramH = bottomH - 8;

        ctx.fillStyle = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.75)';
        roundRectPath(ctx, paramX, paramY, paramW, paramH, 6);
        ctx.fill();
        ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0';
        ctx.lineWidth = 1;
        roundRectPath(ctx, paramX, paramY, paramW, paramH, 6);
        ctx.stroke();

        const paramRows = [
            { label: '固有频率 f₀', value: `${f0.toFixed(3)} Hz` },
            { label: '品质因数 Q', value: qFactor.toFixed(2) },
            { label: '峰值频率 f_peak', value: series[0] ? `${series[0].fPeek.toFixed(3)} Hz` : '—' },
            { label: '峰值振幅 A_peak', value: series[0] ? `${series[0].aPeak.toFixed(4)} m` : '—' },
            { label: '当前频率 f_d', value: `${fNow.toFixed(3)} Hz` },
            { label: '当前振幅 A(f_d)', value: `${Anow.toFixed(4)} m` },
            { label: '阻尼比 β', value: `${beta} /s` },
            { label: '劲度 k', value: `${k} N/m` },
            { label: '质量 m', value: `${m} kg` }
        ];

        const lineH2 = Math.min(20, (paramH - 16) / paramRows.length);
        paramRows.forEach((row, i) => {
            const py = paramY + 10 + i * lineH2;
            ctx.font = '11px sans-serif';
            ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(row.label, paramX + 10, py);
            ctx.font = 'bold 11px monospace';
            ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
            ctx.textAlign = 'right';
            ctx.fillText(row.value, paramX + paramW - 10, py);
        });
    }

    // Q 因数 badge (右上角)
    const qFactor = omega0 / (2 * beta);
    const qText = `Q = ${qFactor.toFixed(2)}`;
    ctx.font = 'bold 12px sans-serif';
    const qTw = ctx.measureText(qText).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)';
    roundRectPath(ctx, width - qTw - 32, 6, qTw + 22, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#a855f7';
    ctx.textAlign = 'center';
    ctx.fillText(qText, width - qTw / 2 - 21, 20);

    // -------------------------------------------------------------------
    // 标题
    // -------------------------------------------------------------------
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('共振曲线 (A-f)  +  品质因数 Q = f₀ / (2β)', width / 2, 20);

    // 信息条
    drawInfoBar(
        ctx,
        width,
        height,
        `f₀=${f0.toFixed(2)}Hz  β=${beta}/s  Q=${qFactor.toFixed(2)}  f_d=${fNow.toFixed(2)}Hz  A=${Anow.toFixed(3)}m`,
        isDark
    );

    // HUD
    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(2)} s` },
        { label: 'f_d', value: `${fNow.toFixed(2)} Hz` },
        { label: 'A', value: `${Anow.toFixed(3)} m` },
        { label: 'Q', value: qFactor.toFixed(2) }
    ]);

    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

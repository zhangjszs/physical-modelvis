/**
 * 力学场景渲染模块 — 机械波 (选必一 第二章)
 *
 * 场景列表：
 *   - drawMechanicalWaveScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import {
    drawTitle,
    drawHud,
    drawInfoBar,
    drawEmptyState,
    drawArrow,
    getFrame,
    placeholder,
    maxOf,
    clearScene
} from './renderingUtils';

export interface MechanicsSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

const BLUE = '#3b82f6';
const ORANGE = '#f59e0b';

export function drawMechanicalWaveScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const waveMode = Math.round(params['waveMode'] ?? 0);
    const amplitude = params['amplitude'] ?? 0.1;
    const frequency = params['frequency'] ?? 2;
    const wavelength = params['wavelength'] ?? 0.5;
    const omega = 2 * Math.PI * frequency;
    const k = (2 * Math.PI) / wavelength;
    const modeNames = ['横波', '纵波', '干涉(驻波)'];

    const cy = height * 0.5;
    const leftX = width * 0.08;
    const rightX = width * 0.92;
    // 粒子数自适应: 每 ~11px 一个粒子, 保证小画布/高 DPR 下不浪费绘制调用
    const particleCount = Math.max(24, Math.min(140, Math.round((rightX - leftX) / 11)));
    const spacing = (rightX - leftX) / particleCount;
    const ampPx = Math.min(height * 0.18, amplitude * 600);

    drawTitle(ctx, `机械波: ${modeNames[waveMode]}`, width, isDark);

    // 引擎轨迹: 9 个 tracked 质点 (x = -1, -0.5, ..., 3) + 1 条 waveSnapshot
    // 像素映射: x ∈ [-1,3] → [leftX,rightX], 位移 → ampPx/amplitude 比例
    const engineTraj = simulationResult?.trajectories;
    const engineCount = Math.max(0, (engineTraj?.length ?? 0) - 1); // 去掉末尾 snapshot
    const mapX = (xPhys: number): number => leftX + ((xPhys + 1) / 4) * (rightX - leftX);
    const ampScale = engineCount > 0 ? ampPx / Math.max(0.001, amplitude) : 1;

    // tracked 质点平衡位置 (与引擎 x0 采样一致): -1, -0.5, ..., 3
    const engEqX: number[] = [];
    for (let i = 0; i < engineCount; i++) engEqX.push(-1 + (4 / (9 - 1)) * i);

    // 传播方向箭头
    drawArrow(ctx, width * 0.4, cy - ampPx - 30, width * 0.6, cy - ampPx - 30, BLUE, '传播方向');

    // 每帧仅对 tracked 质点各取一次插值帧 (O(engineCount) 次二分查找),
    // 粒子位移在其间线性插值 —— 避免每粒子重复 getFrame 二分 + 对象分配
    const engPos: Array<{ x: number; y: number } | null> = [];
    if (engineCount > 0) {
        for (let k = 0; k < engineCount; k++) {
            const f = getFrame(simulationResult, currentTime, k);
            engPos.push(f ? { x: f.position.x, y: f.position.y } : null);
        }
    }

    let prevPx: number | null = null;
    let prevPy: number | null = null;
    // 游标: 粒子 xPhys 单调递增, 区间搜索摊销 O(1)
    let kCur = 0;
    for (let i = 0; i < particleCount; i++) {
        const x0 = leftX + i * spacing;
        // 粒子覆盖引擎 tracked 范围 [-1, 3] (与引擎 x0 采样一致), 任何 λ 下插值均有效
        const xPhys = -1 + (4 * i) / particleCount;
        while (kCur < engPos.length - 1 && xPhys > engEqX[kCur + 1]!) kCur++;

        // 引擎位移插值: 相邻 tracked 质点线性插值, 边界 clamp
        const engDisp = (useX: boolean): number | null => {
            if (engPos.length === 0) return null;
            if (engPos.length === 1) {
                const only = engPos[0]!;
                return useX ? only.x : only.y;
            }
            const k = Math.min(kCur, engPos.length - 2);
            const a = engPos[k];
            const b = engPos[k + 1];
            if (!a || !b) return null;
            const span = engEqX[k + 1]! - engEqX[k]!;
            const w = span > 0 ? (xPhys - engEqX[k]!) / span : 0;
            return (useX ? a.x : a.y) + ((useX ? b.x : b.y) - (useX ? a.x : a.y)) * w;
        };

        if (waveMode === 1) {
            // 纵波: 引擎 position.x = xEq + 位移 (粒子沿传播方向振动)
            const dispX = engDisp(true);
            const px = dispX !== null ? mapX(dispX) : x0 + Math.sin(omega * currentTime - k * xPhys) * ampPx * 0.5;
            const densityC = 1 - Math.abs(px - x0) * 0.006;
            ctx.fillStyle = isDark
                ? `rgba(96,165,250,${0.5 + densityC * 0.3})`
                : `rgba(59,130,246,${0.5 + densityC * 0.3})`;
            ctx.beginPath();
            ctx.arc(px, cy, 4 * densityC + 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 横波/干涉: 引擎 position.y = -y_phys (屏幕向下), 平衡位置 x 已知
            const dispY = engDisp(false);
            const engEqXpx = mapX(xPhys + 1); // 平衡位置
            const py = dispY !== null ? cy + dispY * ampScale : cy - Math.sin(omega * currentTime - k * xPhys) * ampPx;
            const grad = ctx.createRadialGradient(engEqXpx - 1, py - 1, 1, engEqXpx, py, 5);
            grad.addColorStop(0, '#93c5fd');
            grad.addColorStop(1, BLUE);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(engEqXpx, py, 5, 0, Math.PI * 2);
            ctx.fill();
            if (prevPx !== null && prevPy !== null) {
                ctx.strokeStyle = isDark ? 'rgba(96,165,250,0.3)' : 'rgba(59,130,246,0.25)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(prevPx, prevPy);
                ctx.lineTo(engEqXpx, py);
                ctx.stroke();
            }
            prevPx = engEqXpx;
            prevPy = py;
        }
    }

    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftX, cy);
    ctx.lineTo(rightX, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    const lambdaPx = (wavelength / (wavelength * 4)) * (rightX - leftX);
    if (lambdaPx > 30) {
        const markY = cy + ampPx + 30;
        ctx.strokeStyle = ORANGE;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(leftX, markY);
        ctx.lineTo(leftX + lambdaPx, markY);
        ctx.moveTo(leftX, markY - 5);
        ctx.lineTo(leftX, markY + 5);
        ctx.moveTo(leftX + lambdaPx, markY - 5);
        ctx.lineTo(leftX + lambdaPx, markY + 5);
        ctx.stroke();
        ctx.fillStyle = ORANGE;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`λ=${wavelength}m`, leftX + lambdaPx / 2, markY - 8);
    }

    drawHud(ctx, isDark, [
        { label: 'mode', value: modeNames[waveMode] ?? '' },
        { label: 'A', value: `${amplitude} m` },
        { label: 'f', value: `${frequency} Hz` },
        { label: 'λ', value: `${wavelength} m` },
        { label: 'v', value: `${(frequency * wavelength).toFixed(2)} m/s` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `${modeNames[waveMode]}  A=${amplitude}m  f=${frequency}Hz  λ=${wavelength}m  v=fλ=${(frequency * wavelength).toFixed(2)}m/s`,
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

// ======================= Task 6: 静态验证/示意图场景 =======================

interface PendTrajPoint {
    t: number;
    position: { x: number };
}
function measurePendulumPeriod(traj: PendTrajPoint[] | undefined): number | null {
    if (!traj || traj.length < 4) return null;
    const crossings: number[] = [];
    for (let i = 1; i < traj.length; i++) {
        const a = traj[i - 1];
        const b = traj[i];
        if (!a || !b) continue;
        const xa = a.position.x;
        const xb = b.position.x;
        if (xa * xb < 0) {
            const f = xa / (xa - xb);
            crossings.push(a.t + f * (b.t - a.t));
        } else if (xa === 0) {
            crossings.push(a.t);
        }
    }
    if (crossings.length >= 2) {
        const T = (2 * (crossings[crossings.length - 1]! - crossings[0]!)) / (crossings.length - 1);
        return T > 0 ? T : null;
    }
    if (crossings.length === 1) {
        const T = 4 * crossings[0]!;
        return T > 0 ? T : null;
    }
    return null;
}

export function drawBallXTimeScene(o: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '小球 x-t 图像 (简谐运动)', width, isDark, { size: 18, y: 28 });

    const traj = simulationResult?.trajectories?.[0];
    if (!traj || traj.length === 0) {
        placeholder(ctx, width, height, isDark);
        return;
    }
    const duration = params['duration'] ?? 10;
    const L = params['length'] ?? 1.0;
    const g = params['g'] ?? 9.8;
    // 优先从真实轨迹过零实测周期 (大摆角下 != 小角度公式); 窗口太短回退小角度估算
    const Tsmall = 2 * Math.PI * Math.sqrt(Math.max(1e-6, L) / Math.max(1e-6, g));
    const Tmeasured = measurePendulumPeriod(traj);
    const T = Tmeasured ?? Tsmall;
    const Tlabel = Tmeasured ? `${T.toFixed(2)} s` : `${T.toFixed(2)} s (小角度估算)`;

    // 图表区 (右侧 60%)
    const gx = width * 0.4;
    const gy = height * 0.18;
    const gw = width * 0.55;
    const gh = height * 0.64;
    const xMax = maxOf(
        traj.map(p => Math.abs(p.position.x)),
        1e-6
    );
    const tMax = duration;

    const px = (t: number) => gx + (t / tMax) * gw;
    const py = (x: number) => gy + gh / 2 - (x / xMax) * (gh / 2) * 0.9;

    // 坐标轴
    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx, gy + gh);
    ctx.lineTo(gx + gw, gy + gh);
    ctx.stroke();
    // 零线
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(gx, py(0));
    ctx.lineTo(gx + gw, py(0));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('t (s)', gx + gw / 2, gy + gh + 18);
    ctx.save();
    ctx.translate(gx - 22, gy + gh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('x (m)', 0, 0);
    ctx.restore();

    // x(t) 曲线
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    traj.forEach((p, idx) => {
        const X = px(p.t);
        const Y = py(p.position.x);
        if (idx === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
    });
    ctx.stroke();

    // 当前时刻标记点
    const t = Math.max(0, Math.min(duration, currentTime));
    let cur = traj[0]!;
    for (const p of traj) {
        if (p.t <= t) cur = p;
        else break;
    }
    const mx = px(cur.t);
    const my = py(cur.position.x);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.fill();

    // 左侧小摆示意
    const pivotX = width * 0.18;
    const pivotY = height * 0.22;
    const lenPx = height * 0.4;
    const ang = Math.asin(Math.max(-1, Math.min(1, cur.position.x / Math.max(1e-6, L))));
    const bx = pivotX + Math.sin(ang) * lenPx;
    const by = pivotY + Math.cos(ang) * lenPx;
    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(bx, by, 10, 0, Math.PI * 2);
    ctx.fill();

    drawHud(
        ctx,
        isDark,
        [
            { label: 't', value: `${t.toFixed(2)} s` },
            { label: 'x', value: `${cur.position.x.toFixed(3)} m` },
            { label: 'T', value: Tlabel }
        ],
        {
            boxX: 10,
            boxY: 42,
            boxW: 210,
            lineH: 16,
            borderStroke: isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.25)',
            bgAlpha: { dark: 0.78, light: 0.88 }
        }
    );
    drawInfoBar(ctx, width, height, '摆球水平位移 x(t) 近似正弦 → 简谐运动', isDark, { height: 22, yOffset: 34 });
}

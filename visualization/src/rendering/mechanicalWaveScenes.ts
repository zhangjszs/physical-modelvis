/**
 * 力学场景渲染模块 — 机械波 (选必一 第二章)
 *
 * 场景列表：
 *   - drawMechanicalWaveScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import { G_ACCELERATION } from './constants';
import { readWaveMediumFromResult } from './engineExtraAccess';
import { measurePendulumPeriod } from './pendulumMetrics';
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
    const ampPx = Math.min(height * 0.18, amplitude * 600);

    drawTitle(ctx, `机械波: ${modeNames[waveMode]}`, width, isDark);

    // 引擎轨迹: N 个追踪质点 (数量随波长自适应, 见引擎 selectTrackedIndices) + 末尾 1 条 waveSnapshot
    // 像素映射: 介质区间 [xStart, xEnd] → [leftX, rightX], 位移 → ampPx/amplitude 比例
    const engineTraj = simulationResult?.trajectories;
    const engineCount = Math.max(0, (engineTraj?.length ?? 0) - 1); // 去掉末尾 snapshot
    // 介质几何 (区间 / 追踪点平衡位置) 取引擎 extra —— 几何事实的单一真源;
    // 结构不符时按场景默认区间回退, 不在此处自算相位。
    const waveMedium = readWaveMediumFromResult(simulationResult);
    const xStart = waveMedium?.xStart ?? -1;
    const xEnd = waveMedium?.xEnd ?? 3;
    const xSpan = xEnd - xStart;
    const mapX = (xPhys: number): number => leftX + ((xPhys - xStart) / xSpan) * (rightX - leftX);
    const ampScale = engineCount > 0 ? ampPx / Math.max(0.001, amplitude) : 1;

    // 追踪质点的平衡位置 x (m): 优先取引擎 extra.trackedX, 缺失时用轨迹首点兜底
    const engEqX: number[] = [];
    for (let i = 0; i < engineCount; i++) {
        const fromExtra = waveMedium?.trackedX[i];
        const fallbackX = engineTraj?.[i]?.[0]?.position.x;
        engEqX.push(typeof fromExtra === 'number' && Number.isFinite(fromExtra) ? fromExtra : (fallbackX ?? xStart));
    }

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

    // 画布质点**直接消费引擎追踪质点** (与 3D 舞台同一份数据) ——
    // 早期在等间距网格上重新采样, 追踪点之间的折线被二次采样 → 波形退化成尖刺折线。
    let prevPx: number | null = null;
    let prevPy: number | null = null;
    for (let idx = 0; idx < engEqX.length; idx++) {
        const xEq = engEqX[idx]!;
        const frame = engPos[idx];
        if (waveMode === 1) {
            // 纵波: 引擎 position.x = xEq + 位移 (粒子沿传播方向振动)
            const dispX = frame ? frame.x : xEq + Math.sin(omega * currentTime - k * xEq) * amplitude;
            const px = mapX(dispX);
            const densityC = 1 - Math.abs(px - mapX(xEq)) * 0.006;
            ctx.fillStyle = isDark
                ? `rgba(96,165,250,${0.5 + densityC * 0.3})`
                : `rgba(59,130,246,${0.5 + densityC * 0.3})`;
            ctx.beginPath();
            ctx.arc(px, cy, 4 * densityC + 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 横波/干涉: 引擎 position.y = -y_phys (屏幕向下), 平衡位置 x 已知
            const eqXpx = mapX(xEq);
            const py = frame ? cy + frame.y * ampScale : cy - Math.sin(omega * currentTime - k * xEq) * ampPx;
            const grad = ctx.createRadialGradient(eqXpx - 1, py - 1, 1, eqXpx, py, 5);
            grad.addColorStop(0, '#93c5fd');
            grad.addColorStop(1, BLUE);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(eqXpx, py, 5, 0, Math.PI * 2);
            ctx.fill();
            if (prevPx !== null && prevPy !== null) {
                ctx.strokeStyle = isDark ? 'rgba(96,165,250,0.3)' : 'rgba(59,130,246,0.25)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(prevPx, prevPy);
                ctx.lineTo(eqXpx, py);
                ctx.stroke();
            }
            prevPx = eqXpx;
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

    // 波长标尺: 像素长度按介质区间实长换算 (早期写死 "整个宽度 = 4λ", 与实际 λ 不符)
    const lambdaPx = (wavelength / xSpan) * (rightX - leftX);
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
    const g = params['g'] ?? G_ACCELERATION;
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

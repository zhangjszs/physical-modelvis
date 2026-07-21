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
    const particleCount = 60;
    const spacing = (rightX - leftX) / particleCount;
    const ampPx = Math.min(height * 0.18, amplitude * 600);

    drawTitle(ctx, `机械波: ${modeNames[waveMode]}`, width, isDark);

    // 传播方向箭头
    drawArrow(ctx, width * 0.4, cy - ampPx - 30, width * 0.6, cy - ampPx - 30, BLUE, '传播方向');

    for (let i = 0; i < particleCount; i++) {
        const x0 = leftX + i * spacing;
        const xPhys = (i / particleCount) * (wavelength * 4);

        let displacement: number;
        if (waveMode === 2) {
            displacement = 2 * Math.sin(k * xPhys) * Math.cos(omega * currentTime);
        } else {
            displacement = Math.sin(omega * currentTime - k * xPhys);
        }

        if (waveMode === 1) {
            const dx = displacement * ampPx * 0.5;
            const px = x0 + dx;
            const density = 1 - displacement * 0.3;
            ctx.fillStyle = isDark
                ? `rgba(96,165,250,${0.5 + density * 0.3})`
                : `rgba(59,130,246,${0.5 + density * 0.3})`;
            ctx.beginPath();
            ctx.arc(px, cy, 4 * density + 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const dy = displacement * ampPx;
            const py = cy - dy;
            const grad = ctx.createRadialGradient(x0 - 1, py - 1, 1, x0, py, 5);
            grad.addColorStop(0, '#93c5fd');
            grad.addColorStop(1, BLUE);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x0, py, 5, 0, Math.PI * 2);
            ctx.fill();
            if (i > 0) {
                const prevDisp =
                    waveMode === 2
                        ? 2 * Math.sin(k * ((i - 1) / particleCount) * wavelength * 4) * Math.cos(omega * currentTime)
                        : Math.sin(omega * currentTime - k * ((i - 1) / particleCount) * wavelength * 4);
                const prevY = cy - prevDisp * ampPx;
                ctx.strokeStyle = isDark ? 'rgba(96,165,250,0.3)' : 'rgba(59,130,246,0.25)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(leftX + (i - 1) * spacing, prevY);
                ctx.lineTo(x0, py);
                ctx.stroke();
            }
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

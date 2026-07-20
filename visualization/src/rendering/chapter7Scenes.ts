/**
 * 力学场景渲染模块 — 第七章 机械能守恒定律
 *
 * 场景列表：
 *   - drawEnergyConservationScene
 *   - drawSimplePendulumScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import {
    roundRectPath,
    mutedColor,
    clamp,
    drawTitle,
    drawHud,
    drawInfoBar,
    drawEmptyState,
    drawArrow,
    drawGround,
    getFrame
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
const GREEN = '#22c55e';
const ORANGE = '#f59e0b';
const RED = '#ef4444';
const PURPLE = '#a855f7';

export function drawEnergyConservationScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const h0 = params['h0'] ?? 10;
    const v0 = params['v0'] ?? 0;
    const mass = params['mass'] ?? 1;
    const g = params['g'] ?? 9.8;
    const friction = params['friction'] ?? 0;

    const frame = getFrame(simulationResult, currentTime);
    const y = frame ? Math.max(0, frame.position.y) : h0 - 0.5 * g * currentTime * currentTime;
    const vy = frame ? frame.velocity.y : -g * currentTime;
    const vx = v0;
    const h = Math.max(0, y);
    const v = Math.hypot(vx, vy);
    const KE = 0.5 * mass * v * v;
    const PE = mass * g * h;
    const totalE = KE + PE;
    const initE = mass * g * h0 + 0.5 * mass * v0 * v0;

    // 布局
    const groundY = height - 60;
    const topY = 80;
    const fallX = width * 0.35;
    const scale = (groundY - topY) / Math.max(1, h0);
    const ballY = clamp(topY + (h0 - h) * scale, topY, groundY);

    drawTitle(ctx, '机械能守恒定律: Ek + Ep = const', width, isDark);
    drawGround(ctx, groundY, width, isDark);

    // 高度标尺
    const rulerX = width * 0.18;
    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rulerX, topY);
    ctx.lineTo(rulerX, groundY);
    ctx.stroke();
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = mutedColor(isDark);
    for (let i = 0; i <= 5; i++) {
        const markY = topY + (i / 5) * (groundY - topY);
        ctx.beginPath();
        ctx.moveTo(rulerX, markY);
        ctx.lineTo(rulerX + 8, markY);
        ctx.stroke();
        ctx.fillText(`${((h0 * (5 - i)) / 5).toFixed(0)}m`, rulerX - 6, markY + 3);
    }

    // 下落轨迹虚线
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.2)';
    ctx.beginPath();
    ctx.moveTo(fallX, topY);
    ctx.lineTo(fallX + v0 * scale * 0.3, groundY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 已走过轨迹实线
    if (simulationResult && v0 !== 0) {
        const traj = simulationResult.trajectories[0];
        if (traj) {
            ctx.strokeStyle = BLUE;
            ctx.lineWidth = 2;
            ctx.beginPath();
            let started = false;
            for (const p of traj) {
                const sx = fallX + p.position.x * scale * 0.3;
                const sy = clamp(topY + (h0 - p.position.y) * scale, topY, groundY);
                if (!started) {
                    ctx.moveTo(sx, sy);
                    started = true;
                } else ctx.lineTo(sx, sy);
                if (p.t > currentTime) break;
            }
            ctx.stroke();
        }
    }

    // 小球
    const bx = fallX + (v0 !== 0 ? (h0 - h) * scale * 0.3 * (v0 / Math.max(1, Math.abs(v0))) : 0);
    const grad = ctx.createRadialGradient(bx - 5, ballY - 6, 3, bx, ballY, 16);
    grad.addColorStop(0, '#fef3c7');
    grad.addColorStop(0.5, ORANGE);
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, ballY, 16, 0, Math.PI * 2);
    ctx.fill();

    // 重力箭头
    drawArrow(ctx, bx + 26, ballY, bx + 26, ballY + 50, RED, 'mg');

    // 能量柱状图
    const barX = width * 0.62;
    const barW = 50;
    const barH = height * 0.5;
    const barTop = height * 0.18;
    const maxE = Math.max(initE, totalE, 0.01);

    // 背景
    ctx.fillStyle = isDark ? 'rgba(100,116,139,0.15)' : 'rgba(203,213,225,0.2)';
    roundRectPath(ctx, barX, barTop, barW, barH, 4);
    ctx.fill();
    roundRectPath(ctx, barX + barW + 20, barTop, barW, barH, 4);
    ctx.fill();
    roundRectPath(ctx, barX + (barW + 20) * 2, barTop, barW, barH, 4);
    ctx.fill();

    // 动能柱
    const keH2 = (KE / maxE) * barH;
    ctx.fillStyle = GREEN;
    roundRectPath(ctx, barX, barTop + barH - keH2, barW, keH2, 4);
    ctx.fill();
    ctx.fillStyle = GREEN;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Ek`, barX + barW / 2, barTop + barH + 16);
    ctx.fillText(`${KE.toFixed(1)}J`, barX + barW / 2, barTop + barH - keH2 - 6);

    // 势能柱
    const peH2 = (PE / maxE) * barH;
    ctx.fillStyle = RED;
    roundRectPath(ctx, barX + barW + 20, barTop + barH - peH2, barW, peH2, 4);
    ctx.fill();
    ctx.fillStyle = RED;
    ctx.fillText(`Ep`, barX + barW + 20 + barW / 2, barTop + barH + 16);
    ctx.fillText(`${PE.toFixed(1)}J`, barX + barW + 20 + barW / 2, barTop + barH - peH2 - 6);

    // 总能量柱
    const teH = (totalE / maxE) * barH;
    ctx.fillStyle = PURPLE;
    roundRectPath(ctx, barX + (barW + 20) * 2, barTop + barH - teH, barW, teH, 4);
    ctx.fill();
    ctx.fillStyle = PURPLE;
    ctx.fillText(`E总`, barX + (barW + 20) * 2 + barW / 2, barTop + barH + 16);
    ctx.fillText(`${totalE.toFixed(1)}J`, barX + (barW + 20) * 2 + barW / 2, barTop + barH - teH - 6);

    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(3)} s` },
        { label: 'h', value: `${h.toFixed(2)} m` },
        { label: 'v', value: `${v.toFixed(2)} m/s` },
        { label: 'E', value: `${totalE.toFixed(2)} J` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `h₀=${h0}m  m=${mass}kg  g=${g.toFixed(1)}m/s²  ${friction > 0 ? `摩擦力=${friction}N` : '无摩擦 → 守恒'}`,
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

export function drawSimplePendulumScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const L = params['length'] ?? 1.0;
    const angleDeg = params['angle'] ?? 15;
    const mass = params['mass'] ?? 1;
    const g = params['g'] ?? 9.8;
    const damping = params['damping'] ?? 0;
    const T = 2 * Math.PI * Math.sqrt(L / g);
    const omega0 = Math.sqrt(g / L);

    // 当前摆角（简单近似：小角度简谐运动）
    const angleRad = (angleDeg * Math.PI) / 180;
    const decay = damping > 0 ? Math.exp(-damping * currentTime * 0.5) : 1;
    const theta = angleRad * Math.cos(omega0 * currentTime) * decay;

    // 布局
    const pivotX = width * 0.5;
    const pivotY = 80;
    const ropeLen = Math.min(height * 0.5, L * 180);
    const bobX = pivotX + ropeLen * Math.sin(theta);
    const bobY = pivotY + ropeLen * Math.cos(theta);
    const bobR = 18 + mass * 2;

    drawTitle(ctx, `单摆: T = 2π√(L/g) = ${T.toFixed(3)}s`, width, isDark);

    // 支架
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    ctx.fillRect(pivotX - 60, pivotY - 16, 120, 16);
    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX - 50, pivotY - 16);
    ctx.lineTo(pivotX - 60, pivotY - 50);
    ctx.moveTo(pivotX + 50, pivotY - 16);
    ctx.lineTo(pivotX + 60, pivotY - 50);
    ctx.stroke();

    // 摆线
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    // 摆角标注弧
    if (Math.abs(theta) > 0.01) {
        const arcR = 40;
        ctx.strokeStyle = ORANGE;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, arcR, Math.PI / 2 - Math.abs(theta), Math.PI / 2, theta > 0);
        ctx.stroke();
        ctx.fillStyle = ORANGE;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
            `θ=${((Math.abs(theta) * 180) / Math.PI).toFixed(1)}°`,
            pivotX + (theta > 0 ? 50 : -50),
            pivotY + 30
        );
    }

    // 摆球
    const grad = ctx.createRadialGradient(bobX - bobR * 0.3, bobY - bobR * 0.3, bobR * 0.1, bobX, bobY, bobR);
    grad.addColorStop(0, '#fef3c7');
    grad.addColorStop(0.4, ORANGE);
    grad.addColorStop(1, '#92400e');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bobX, bobY, bobR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${mass}kg`, bobX, bobY);
    ctx.textBaseline = 'alphabetic';

    // 重力箭头
    drawArrow(ctx, bobX + bobR + 8, bobY, bobX + bobR + 8, bobY + 50, RED, 'mg');

    // 张力箭头（沿摆线向悬点）
    const tensionDir = { x: (pivotX - bobX) / ropeLen, y: (pivotY - bobY) / ropeLen };
    drawArrow(ctx, bobX, bobY, bobX + tensionDir.x * 50, bobY + tensionDir.y * 50, BLUE, 'T');

    // 能量条
    const h = L * (1 - Math.cos(theta));
    const v = omega0 * L * Math.abs(Math.sin(omega0 * currentTime)) * decay;
    const KE = 0.5 * mass * v * v;
    const PE = mass * g * h;
    const totalE = mass * g * L * (1 - Math.cos(angleRad));
    const barX = width * 0.78;
    const barW = 28;
    const barH = height * 0.45;
    const barTop = height * 0.2;

    // 总能量
    ctx.fillStyle = isDark ? 'rgba(100,116,139,0.2)' : 'rgba(203,213,225,0.3)';
    roundRectPath(ctx, barX, barTop, barW, barH, 4);
    ctx.fill();
    // 势能
    const peH = totalE > 0 ? (PE / totalE) * barH : 0;
    ctx.fillStyle = RED;
    roundRectPath(ctx, barX, barTop + barH - peH, barW, peH, 4);
    ctx.fill();
    // 动能
    const keH = totalE > 0 ? (KE / totalE) * barH : 0;
    ctx.fillStyle = GREEN;
    roundRectPath(ctx, barX, barTop + barH - peH - keH, barW, keH, 4);
    ctx.fill();
    // 标签
    ctx.fillStyle = RED;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`PE=${PE.toFixed(2)}J`, barX + barW + 6, barTop + barH - 4);
    ctx.fillStyle = GREEN;
    ctx.fillText(`KE=${KE.toFixed(2)}J`, barX + barW + 6, barTop + barH - peH - 4);

    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(3)} s` },
        { label: 'θ', value: `${((theta * 180) / Math.PI).toFixed(1)}°` },
        { label: 'T', value: `${T.toFixed(3)} s` },
        { label: 'v', value: `${v.toFixed(2)} m/s` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `L=${L}m  θ₀=${angleDeg}°  T=2π√(L/g)=${T.toFixed(3)}s${damping > 0 ? `  阻尼=${damping}` : ''}`,
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

/**
 * 力学场景渲染模块 — 机械波 (选必一 第二章)
 *
 * 场景列表：
 *   - drawMechanicalWaveScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import { drawTitle, drawHud, drawInfoBar, drawEmptyState, drawArrow } from './renderingUtils';

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

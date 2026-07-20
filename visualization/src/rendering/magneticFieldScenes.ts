/**
 * 电磁学场景渲染模块 — 选必二 第一章 安培力与洛伦兹力
 *
 * 场景列表：
 *   - drawMagneticForceScene
 *   - drawAmpereForceScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import { COLORS, clamp, clearScene, drawTitle, drawHud, drawInfoBar, drawArrow, drawWire } from './renderingUtils';

export interface ElectromagnetismSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

const BLUE = COLORS.BLUE;
const CYAN = COLORS.CYAN;
const GREEN = COLORS.GREEN;
const ORANGE = COLORS.ORANGE;
const RED = COLORS.RED;
const PURPLE = COLORS.PURPLE;

export function drawMagneticForceScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '安培力与洛伦兹力', width, isDark, { size: 18, y: 28 });
    const b = params['B'] ?? 0.5;
    const i = params['I'] ?? 2;
    const l = params['L'] ?? 0.3;
    const q = params['q'] ?? 1.6;
    const v = params['v'] ?? 1;
    const fAmp = b * i * l;
    const fLorentz = Math.abs(q) * v * b;
    for (let x = width * 0.12; x < width * 0.9; x += 44) {
        for (let y = height * 0.24; y < height * 0.78; y += 42) {
            ctx.strokeStyle = PURPLE;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x - 5, y - 5);
            ctx.lineTo(x + 5, y + 5);
            ctx.moveTo(x + 5, y - 5);
            ctx.lineTo(x - 5, y + 5);
            ctx.stroke();
        }
    }
    drawWire(
        ctx,
        [
            [width * 0.24, height * 0.46],
            [width * 0.58, height * 0.46]
        ],
        ORANGE
    );
    drawArrow(ctx, width * 0.3, height * 0.42, width * 0.52, height * 0.42, ORANGE, 'I');
    drawArrow(ctx, width * 0.42, height * 0.46, width * 0.42, height * 0.28, RED, 'F');
    ctx.fillStyle = q >= 0 ? RED : BLUE;
    ctx.beginPath();
    ctx.arc(width * 0.68, height * 0.6, 14, 0, Math.PI * 2);
    ctx.fill();
    drawArrow(ctx, width * 0.68, height * 0.6, width * 0.82, height * 0.6, GREEN, 'v');
    drawArrow(ctx, width * 0.68, height * 0.6, width * 0.68, height * 0.43, RED, 'qvB');
    drawHud(
        ctx,
        isDark,
        [
            { label: 'B', value: `${b.toFixed(2)} T` },
            { label: 'F_A', value: `${fAmp.toFixed(3)} N` },
            { label: 'F_L', value: `${fLorentz.toFixed(3)} arb` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '安培力 F=BILsinθ, 洛伦兹力 F=qvBsinφ', isDark);
}

export function drawAmpereForceScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '安培力因素', width, isDark, { size: 18, y: 28 });
    const b = params['B'] ?? 0.5;
    const i = params['I'] ?? 2;
    const l = params['L'] ?? 0.2;
    const angle = ((params['angle'] ?? 30) * Math.PI) / 180;
    const f = b * i * l * Math.sin(angle);
    const cx = width * 0.52;
    const cy = height * 0.52;
    for (let x = width * 0.18; x < width * 0.84; x += 50) {
        drawArrow(ctx, x, height * 0.25, x, height * 0.75, CYAN, x < width * 0.22 ? 'B' : undefined);
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-angle);
    drawWire(
        ctx,
        [
            [-120, 0],
            [120, 0]
        ],
        ORANGE
    );
    drawArrow(ctx, -70, -18, 55, -18, ORANGE, 'I');
    ctx.restore();
    drawArrow(ctx, cx, cy, cx, cy - clamp(f * 220, 30, 125), RED, 'F');
    drawHud(
        ctx,
        isDark,
        [
            { label: 'B', value: `${b.toFixed(2)} T` },
            { label: 'I', value: `${i.toFixed(2)} A` },
            { label: 'F', value: `${f.toFixed(3)} N` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, `导线与磁场夹角 ${((angle * 180) / Math.PI).toFixed(0)}°, F = BIL sinθ`, isDark);
}

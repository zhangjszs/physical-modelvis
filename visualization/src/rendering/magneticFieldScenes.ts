/**
 * 电磁学场景渲染模块 — 选必二 第一章 安培力与洛伦兹力
 *
 * 场景列表：
 *   - drawMagneticForceScene
 *   - drawAmpereForceScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult, Vector2D } from 'physics-core';
import {
    COLORS,
    clamp,
    clearScene,
    drawTitle,
    drawHud,
    drawInfoBar,
    drawArrow,
    drawWire,
    drawFieldLine,
    drawVectorField,
    maxOf,
    placeholder
} from './renderingUtils';

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

interface MagFieldLine {
    points: Vector2D[];
}
interface MagFieldSample {
    x: number;
    y: number;
    bx: number;
    by: number;
    magnitude: number;
}
interface MagFieldExtra {
    fieldLines: MagFieldLine[];
    samples: MagFieldSample[];
    wire?: Vector2D;
    poles?: { north: Vector2D; south: Vector2D };
}
export function drawCurrentMagneticFieldScene(o: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult } = o;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '电流的磁场', width, isDark, { size: 18, y: 28 });
    if (!simulationResult || !simulationResult.extra) {
        placeholder(ctx, width, height, isDark);
        return;
    }
    const extra = simulationResult.extra as unknown as MagFieldExtra;
    const cx = width / 2;
    const cy = height / 2;
    const scale = Math.min(width, height) * 0.4;
    const toScreen = (x: number, y: number): [number, number] => [cx + x * scale, cy - y * scale];
    const I = params['current'] ?? 5;
    const lineColor = isDark ? '#38bdf8' : '#0284c7';

    const maxMag = maxOf(
        extra.samples.map(s => s.magnitude),
        1e-9
    );
    // 磁场采样点用 bx/by, 适配矢量场绘制 (统一为 ex/ey)
    const magVectors = extra.samples.map(s => ({ x: s.x, y: s.y, ex: s.bx, ey: s.by, magnitude: s.magnitude }));
    drawVectorField(ctx, magVectors, toScreen, maxMag, isDark ? '#64748b' : '#94a3b8');

    for (const line of extra.fieldLines) {
        const pts = line.points.map(p => toScreen(p.x, p.y));
        drawFieldLine(ctx, pts, lineColor, 8);
    }

    if (extra.wire) {
        const [wx, wy] = toScreen(extra.wire.x, extra.wire.y);
        const r = 12;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(wx, wy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(I >= 0 ? '⊙' : '⊗', wx, wy);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.font = '12px sans-serif';
        ctx.fillText(`导线 (I=${I}A ${I >= 0 ? '出纸面⊙' : '入纸面⊗'})`, wx + r + 6, wy + 4);
    }

    if (extra.poles) {
        const [nx, ny] = toScreen(extra.poles.north.x, extra.poles.north.y);
        const [sx, sy] = toScreen(extra.poles.south.x, extra.poles.south.y);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', nx, ny - 6);
        ctx.fillStyle = '#3b82f6';
        ctx.fillText('S', sx, sy + 18);
        ctx.textAlign = 'left';
    }

    const modeLabel = params['mode'] === 2 ? '螺线管' : params['mode'] === 1 ? '线圈' : '直导线';
    drawHud(
        ctx,
        isDark,
        [
            { label: '模式', value: modeLabel },
            { label: 'I', value: `${I}A` },
            { label: '方向', value: I >= 0 ? '逆时针' : '顺时针' }
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
}

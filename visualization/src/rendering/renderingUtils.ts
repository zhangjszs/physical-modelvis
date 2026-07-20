/**
 * 通用渲染工具模块。
 *
 * 把各 scene 文件中重复出现的 helper（颜色、几何、通用绘制组件、frame 取帧）
 * 集中到一个公共出口，避免 10+ 文件各自维护同名函数。
 *
 * 设计原则：
 * 1. 默认参数与 mechanicsScenes.ts 保持一致（mechanics 是抽出的基线）
 * 2. 用 opts? 可选参数表达现有变体（drawTitle 的字号、drawHud 的 boxW 等），
 *    P0-A.2 替换各 scene 时通过 opts 显式传值保持原视觉
 * 3. roundRectPath 使用 gapScenes 的 r=min(r,w/2,h/2) 防溢出版本，最安全
 */

import type { SimulationResult, TrajectoryPoint } from 'physics-core';
import { findFrameIndex, interpolateFrame } from '../utils/frameUtils';

// ============================================================
// Group 1: 颜色常量
// ============================================================

/**
 * 通用调色板（Tailwind 500 系列）。
 * 各 scene 文件中重复定义的 BLUE/GREEN/ORANGE/RED/PURPLE 等本地常量应改为从此导入。
 */
export const COLORS = {
    BLUE: '#3b82f6',
    CYAN: '#06b6d4',
    GREEN: '#22c55e',
    ORANGE: '#f59e0b',
    RED: '#ef4444',
    PURPLE: '#a855f7',
    AMBER: '#f59e0b'
} as const;

// ============================================================
// Group 2: 颜色辅助函数
// ============================================================

/**
 * hex 颜色加深 / 变亮。
 * @param hex 形如 '#fff' 或 '#aabbcc' 的颜色
 * @param amount 正数变亮，负数变暗，输出钳到 [0, 255]
 */
export function shadeColor(hex: string, amount: number): string {
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

/** 主题下的主文字色 */
export function textColor(isDark: boolean): string {
    return isDark ? '#e2e8f0' : '#1e293b';
}

/** 主题下的次要文字色 */
export function mutedColor(isDark: boolean): string {
    return isDark ? '#94a3b8' : '#64748b';
}

/**
 * HUD / 信息面板的半透明背景色。
 * mechanics 基线：dark 0.75 / light 0.86。
 * 如需其他透明度，调用方可直接用 rgba 字符串覆盖。
 */
export function panelFill(isDark: boolean): string {
    return isDark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.86)';
}

// ============================================================
// Group 3: 几何辅助函数
// ============================================================

/** 数值钳到 [min, max] 区间 */
export function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

/**
 * 圆角矩形路径（不 fill / stroke，只构造路径）。
 * 采用 gapScenes 的防溢出版本：r = min(r, w/2, h/2)，避免 r 过大画歪。
 */
export function roundRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}

// ============================================================
// Group 4: 通用绘制组件
// ============================================================

/** 清空画布并填底色 */
export function clearScene(ctx: CanvasRenderingContext2D, w: number, h: number, isDark: boolean): void {
    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);
}

/** 画标题。默认 mechanics 风格（15px / y=24），其他文件可用 opts 覆盖 */
export function drawTitle(
    ctx: CanvasRenderingContext2D,
    title: string,
    w: number,
    isDark: boolean,
    opts?: { size?: number; y?: number }
): void {
    const size = opts?.size ?? 15;
    const y = opts?.y ?? 24;
    ctx.fillStyle = textColor(isDark);
    ctx.font = `bold ${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, w / 2, y);
}

/** 副标题（字号 13，灰色） */
export function drawSubtitle(
    ctx: CanvasRenderingContext2D,
    subtitle: string,
    x: number,
    y: number,
    isDark: boolean
): void {
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '13px sans-serif';
    ctx.fillText(subtitle, x, y);
}

/**
 * HUD 数据面板（左上角圆角矩形 + 多行 key=value）。
 * 默认 mechanics 风格：boxW=190, lineH=18, padding=8。
 * 支持变体：自定义位置 (boxX/boxY)、边框 (borderStroke)、两列布局 (twoColumn + gapScenes 位置变体)。
 */
export function drawHud(
    ctx: CanvasRenderingContext2D,
    isDark: boolean,
    rows: Array<{ label: string; value: string }>,
    opts?: {
        boxW?: number;
        lineH?: number;
        padding?: number;
        boxX?: number;
        boxY?: number;
        borderRadius?: number;
        borderStroke?: string;
        bgAlpha?: { dark: number; light: number };
        font?: string;
        textBaseline?: CanvasTextBaseline;
        textStartY?: number;
        labelColor?: (isDark: boolean) => string;
        twoColumn?: boolean;
        valueX?: number;
        boxH?: number;
    }
): void {
    if (rows.length === 0) return;
    const lineH = opts?.lineH ?? 18;
    const boxW = opts?.boxW ?? 190;
    const padding = opts?.padding ?? 8;
    const boxX = opts?.boxX ?? padding;
    const boxY = opts?.boxY ?? 10;
    const radius = opts?.borderRadius ?? 6;
    const bgDark = opts?.bgAlpha?.dark ?? 0.75;
    const bgLight = opts?.bgAlpha?.light ?? 0.86;
    const font = opts?.font ?? 'bold 12px monospace';
    const textBase = opts?.textBaseline ?? 'top';
    const getLabelColor = opts?.labelColor ?? textColor;
    const twoCol = opts?.twoColumn ?? false;
    const valueX = opts?.valueX ?? boxX + padding + 48;

    const boxH = opts?.boxH ?? rows.length * lineH + 18;
    ctx.fillStyle = isDark ? `rgba(15,23,42,${bgDark})` : `rgba(255,255,255,${bgLight})`;
    roundRectPath(ctx, boxX, boxY, boxW, boxH, radius);
    ctx.fill();
    if (opts?.borderStroke) {
        ctx.strokeStyle = opts.borderStroke;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    const textStartY = opts?.textStartY ?? boxY + 9;
    rows.forEach((row, i) => {
        const y = textStartY + i * lineH;
        ctx.font = font;
        ctx.textAlign = 'left';
        ctx.textBaseline = textBase;
        if (twoCol) {
            ctx.fillStyle = mutedColor(isDark);
            ctx.fillText(row.label, boxX + padding, y);
            ctx.fillStyle = getLabelColor(isDark);
            ctx.fillText(row.value, valueX, y);
        } else {
            ctx.fillStyle = getLabelColor(isDark);
            ctx.fillText(`${row.label} = ${row.value}`, boxX + padding, y);
        }
    });
    ctx.textBaseline = 'alphabetic';
}

/**
 * 底部信息条（居中文字 + 半透明圆角背景）。
 * 默认 mechanics 风格：height=24, yOffset=36（即距底部 36px）。
 */
export function drawInfoBar(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    text: string,
    isDark: boolean,
    opts?: { height?: number; yOffset?: number }
): void {
    const barH = opts?.height ?? 24;
    const yOffset = opts?.yOffset ?? 36;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = panelFill(isDark);
    roundRectPath(ctx, w / 2 - tw / 2 - 10, h - yOffset, tw + 20, barH, 5);
    ctx.fill();
    ctx.fillStyle = mutedColor(isDark);
    ctx.fillText(text, w / 2, h - yOffset + barH / 2);
}

/** 空状态提示（无 simulationResult 时居中显示） */
export function drawEmptyState(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    isDark: boolean,
    text?: string
): void {
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text ?? '点击「运行仿真」开始', w / 2, h / 2);
    ctx.textBaseline = 'alphabetic';
}

/**
 * 带箭头线段 + 可选文字标签。
 * mechanics 风格：lineWidth 2.4, head=min(13, len*0.28), lineCap round。
 */
export function drawArrow(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    label?: string,
    opts?: { headScale?: number }
): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 3) return;
    const headScale = opts?.headScale ?? 0.28;
    ctx.save();
    const angle = Math.atan2(dy, dx);
    const head = Math.min(13, len * headScale);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - head * 0.55 * Math.cos(angle), y2 - head * 0.55 * Math.sin(angle));
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - 0.4), y2 - head * Math.sin(angle - 0.4));
    ctx.lineTo(x2 - head * 0.45 * Math.cos(angle), y2 - head * 0.45 * Math.sin(angle));
    ctx.lineTo(x2 - head * Math.cos(angle + 0.4), y2 - head * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();

    if (label) {
        ctx.fillStyle = color;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x2 + 6, y2 - 8);
        ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
}

/**
 * 2D 方块（带阴影 + 渐变主体 + 高光 + 可选标签）。
 * 来自 mechanicsScenes.ts，radius=5。
 */
export function drawBlock(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    color: string,
    isDark: boolean,
    label?: string
): void {
    const x = cx - w / 2;
    const y = cy - h / 2;
    ctx.fillStyle = isDark ? 'rgba(0,0,0,0.34)' : 'rgba(0,0,0,0.14)';
    roundRectPath(ctx, x + 4, y + 4, w, h, 5);
    ctx.fill();
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, shadeColor(color, 35));
    grad.addColorStop(0.55, color);
    grad.addColorStop(1, shadeColor(color, -40));
    ctx.fillStyle = grad;
    roundRectPath(ctx, x, y, w, h, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRectPath(ctx, x + 4, y + 4, w - 8, h * 0.32, 4);
    ctx.fill();
    if (label) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, cy);
        ctx.textBaseline = 'alphabetic';
    }
}

/**
 * 3D 风格方块（更简单的阴影 + 渐变 + 高光）。
 * 来自 chapter3Scenes.ts，radius=4，高光更窄。
 */
export function draw3DBlock(
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
    // 阴影
    ctx.fillStyle = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.12)';
    roundRectPath(ctx, x + 3, y + 3, w, h, 4);
    ctx.fill();
    // 主体渐变
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, baseColor);
    grad.addColorStop(1, shadeColor(baseColor, -30));
    ctx.fillStyle = grad;
    roundRectPath(ctx, x, y, w, h, 4);
    ctx.fill();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRectPath(ctx, x + 3, y + 3, w - 6, h * 0.3, 3);
    ctx.fill();
    // 标签
    if (label) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, cy);
        ctx.textBaseline = 'alphabetic';
    }
}

/** 地面（水平线 + 斜线阴影） */
export function drawGround(ctx: CanvasRenderingContext2D, y: number, w: number, isDark: boolean): void {
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.28)' : 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 9, y + 9);
        ctx.stroke();
    }
}

// ============================================================
// Group 5: 取帧辅助
// ============================================================

/**
 * 从 simulationResult 取指定时刻的插值帧。
 * @param simulationResult 仿真结果（可为 null）
 * @param currentTime 当前时刻（秒）
 * @param trajectoryIndex 多 trajectory 场景的索引，默认 0
 * @returns 插值后的 TrajectoryPoint，若 result 为空或 trajectory 为空则返回 null
 */
export function getFrame(
    simulationResult: SimulationResult | null,
    currentTime: number,
    trajectoryIndex = 0
): TrajectoryPoint | null {
    const traj = simulationResult?.trajectories[trajectoryIndex];
    if (!traj || traj.length === 0) return null;
    const idx = findFrameIndex([traj], currentTime);
    const p0 = traj[idx];
    const p1 = traj[Math.min(idx + 1, traj.length - 1)];
    if (!p0 || !p1) return null;
    return interpolateFrame(p0, p1, currentTime);
}

/** 伪随机数 (固定种子, 每帧一致) */
export function seededRand(seed: number): number {
    const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
}

/** 绘制一个 mini 折线图 (带坐标轴) */
export function drawMiniChart(opts: {
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
    xLabel?: string;
    yLabel?: string;
    showPeakX?: number;
    peakLabel?: string;
    fillUnder?: string;
    logX?: boolean;
    logY?: boolean;
}): void {
    const { ctx, x, y, w, h, xs, ys, isDark, label, xLabel, yLabel, showPeakX, peakLabel, fillUnder, logX, logY } =
        opts;
    if (xs.length === 0 || ys.length === 0) return;

    const xMin = xs[0]!;
    const xMax = xs[xs.length - 1]!;
    let yMin = Math.min(...ys);
    let yMax = Math.max(...ys);
    if (yMax - yMin < 1e-9) {
        yMax = yMin + 1;
    }
    const padY = (yMax - yMin) * 0.12;
    yMin -= padY;
    yMax += padY;

    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.65)';
    roundRectPath(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.4)' : 'rgba(100,116,139,0.25)';
    ctx.lineWidth = 1;
    roundRectPath(ctx, x, y, w, h, 6);
    ctx.stroke();

    const useLogX = logX && xMin > 0 && xMax > 0;
    const useLogY = logY && yMin > 0 && yMax > 0;
    const logXMin = useLogX ? Math.log10(xMin) : 0;
    const logXMax = useLogX ? Math.log10(xMax) : 1;
    const logYMin = useLogY ? Math.log10(yMin) : 0;
    const logYMax = useLogY ? Math.log10(yMax) : 1;

    const sx = (xv: number) => {
        if (useLogX) return x + ((Math.log10(Math.max(xMin, xv)) - logXMin) / (logXMax - logXMin)) * w;
        return x + ((xv - xMin) / (xMax - xMin)) * w;
    };
    const sy = (yv: number) => {
        if (useLogY) return y + h - ((Math.log10(Math.max(yMin, yv)) - logYMin) / (logYMax - logYMin)) * h;
        return y + h - ((yv - yMin) / (yMax - yMin)) * h;
    };

    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.10)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
        const gx = x + (w * i) / 4;
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, y + h);
        ctx.stroke();
    }

    if (fillUnder) {
        ctx.fillStyle = fillUnder;
        ctx.beginPath();
        ctx.moveTo(sx(xs[0]!), y + h);
        for (let i = 0; i < xs.length; i++) ctx.lineTo(sx(xs[i]!), sy(ys[i]!));
        ctx.lineTo(sx(xs[xs.length - 1]!), y + h);
        ctx.closePath();
        ctx.fill();
    }

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

    const formatVal = (v: number) =>
        Math.abs(v) > 1e4 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(1) : v.toFixed(2);

    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(formatVal(yMax), x + 4, y + 4);
    ctx.fillText(formatVal(yMin), x + 4, y + h - 14);

    if (label) {
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(label, x + 4, y + h + 4);
    }
    if (xLabel) {
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(xLabel, x + w / 2, y + h + 16);
    }
    if (yLabel) {
        ctx.save();
        ctx.translate(x - 28, y + h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();
    }
}

/** 带标签的能量/热流箭头 */
export function drawThermalArrow(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    label?: string
): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 3) return;
    ctx.save();
    const a = Math.atan2(dy, dx);
    const head = Math.min(13, len * 0.25);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - head * 0.55 * Math.cos(a), y2 - head * 0.55 * Math.sin(a));
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4));
    ctx.lineTo(x2 - head * 0.45 * Math.cos(a), y2 - head * 0.45 * Math.sin(a));
    ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4));
    ctx.closePath();
    ctx.fill();
    if (label) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, x2 + 6, y2 - 6);
    }
    ctx.restore();
}

/** 竖直能量条 (从底部向上填充) */
export function drawEnergyBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    ratio: number,
    color: string,
    label: string,
    isDark: boolean
): void {
    const clamped = Math.max(0, Math.min(1, ratio));
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.58)' : 'rgba(255,255,255,0.70)';
    roundRectPath(ctx, x, y, w, h, 5);
    ctx.fill();
    ctx.fillStyle = color;
    roundRectPath(ctx, x, y + h * (1 - clamped), w, h * clamped, 5);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.lineWidth = 1;
    roundRectPath(ctx, x, y, w, h, 5);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h + 16);
}

// ============================================================
// Group 10: 电路/电磁学绘图元件
// ============================================================

/** 绘制折线导线 */
export function drawWire(ctx: CanvasRenderingContext2D, points: Array<[number, number]>, color: string): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
    ctx.restore();
}

/** 绘制电池符号 (长/短竖线 + 标签) */
export function drawBattery(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean, label: string): void {
    ctx.strokeStyle = textColor(isDark);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 18, y - 20);
    ctx.lineTo(x - 18, y + 20);
    ctx.moveTo(x + 14, y - 12);
    ctx.lineTo(x + 14, y + 12);
    ctx.stroke();
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 38);
    ctx.fillStyle = COLORS.RED;
    ctx.fillText('+', x - 18, y - 26);
    ctx.fillStyle = COLORS.BLUE;
    ctx.fillText('-', x + 14, y - 20);
}

/** 绘制电阻符号 (锯齿形) */
export function drawResistor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    isDark: boolean,
    label: string
): void {
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    for (let i = 0; i < 6; i++) {
        const px = x - w / 2 + ((i + 0.5) * w) / 6;
        ctx.lineTo(px, y + (i % 2 === 0 ? -12 : 12));
    }
    ctx.lineTo(x + w / 2, y);
    ctx.stroke();
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 22);
}

/** 绘制电容器符号 (两竖线 + 标签) */
export function drawCapacitorSymbol(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isDark: boolean,
    label: string
): void {
    ctx.strokeStyle = textColor(isDark);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 24);
    ctx.lineTo(x - 10, y + 24);
    ctx.moveTo(x + 10, y - 24);
    ctx.lineTo(x + 10, y + 24);
    ctx.stroke();
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 42);
}

/** 圆形指针电表 (V/A/Ω/G) */
export function drawMeter(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    ratio: number,
    isDark: boolean,
    label: string,
    value: string
): void {
    ctx.fillStyle = panelFill(isDark);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = 0; i <= 10; i++) {
        const a = Math.PI * (1.15 + (0.7 * i) / 10);
        const r1 = r - 8;
        const r2 = r - (i % 5 === 0 ? 18 : 13);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
        ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
        ctx.stroke();
    }
    const angle = Math.PI * (1.15 + 0.7 * clamp(ratio, 0, 1));
    drawArrow(ctx, x, y, x + Math.cos(angle) * (r - 22), y + Math.sin(angle) * (r - 22), COLORS.RED);
    ctx.fillStyle = textColor(isDark);
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 8);
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px monospace';
    ctx.fillText(value, x, y + r + 18);
}

/** 小型正弦波图表 (用于交流电/振荡显示) */
export function drawSineChart(opts: {
    ctx: CanvasRenderingContext2D;
    x: number;
    y: number;
    w: number;
    h: number;
    phase: number;
    color: string;
    isDark: boolean;
    label: string;
}): void {
    const { ctx, x, y, w, h, phase, color, isDark, label } = opts;
    ctx.fillStyle = panelFill(isDark);
    roundRectPath(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
        const px = x + (i / 120) * w;
        const py = y + h / 2 - Math.sin((i / 120) * Math.PI * 4 + phase) * (h * 0.36);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 8, y + 16);
}

/** 绘制螺线管/线圈 (正弦形绕线) */
export function drawCoil(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    turns: number,
    color: string
): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i <= turns * 16; i++) {
        const t = i / (turns * 16);
        const px = x + t * w;
        const py = y + Math.sin(t * turns * Math.PI * 2) * 14;
        ctx.lineTo(px, py);
    }
    ctx.stroke();
}

/** 正/负电荷符号 (圆形 + ±号) */
export function drawChargeSymbol(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    sign: number,
    isDark: boolean
): void {
    const positive = sign >= 0;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = positive ? COLORS.RED : COLORS.BLUE;
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.5, y);
    ctx.lineTo(x + radius * 0.5, y);
    if (positive) {
        ctx.moveTo(x, y - radius * 0.5);
        ctx.lineTo(x, y + radius * 0.5);
    }
    ctx.stroke();
}

/** 单行文字快捷绘制 */
export function drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    isDark: boolean,
    size = 13,
    color?: string
): void {
    ctx.fillStyle = color ?? textColor(isDark);
    ctx.font = `${size}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y);
}

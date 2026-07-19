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
 */
export function drawHud(
    ctx: CanvasRenderingContext2D,
    isDark: boolean,
    rows: Array<{ label: string; value: string }>,
    opts?: { boxW?: number; lineH?: number; padding?: number }
): void {
    const lineH = opts?.lineH ?? 18;
    const boxW = opts?.boxW ?? 190;
    const padding = opts?.padding ?? 8;
    const boxH = rows.length * lineH + 18;
    ctx.fillStyle = panelFill(isDark);
    roundRectPath(ctx, padding, 10, boxW, boxH, 6);
    ctx.fill();
    rows.forEach((row, i) => {
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = textColor(isDark);
        ctx.fillText(`${row.label} = ${row.value}`, padding + 8, 19 + i * lineH);
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

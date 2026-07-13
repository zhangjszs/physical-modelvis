/**
 * 基础力学场景定制渲染模块。
 *
 * 这些场景以教学图为主，使用屏幕坐标完整绘制实验装置、关键物理量和 HUD。
 * 物理计算仍来自 physics-core；本模块只负责把参数和当前时刻转成可读图像。
 */

import type { SimulationResult, TrajectoryPoint } from 'physics-core';
import { findFrameIndex, interpolateFrame } from '../utils/frameUtils';

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

function textColor(isDark: boolean): string {
    return isDark ? '#e2e8f0' : '#1e293b';
}

function mutedColor(isDark: boolean): string {
    return isDark ? '#94a3b8' : '#64748b';
}

function panelFill(isDark: boolean): string {
    return isDark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.86)';
}

function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

function drawArrow(
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
    const angle = Math.atan2(dy, dx);
    const head = Math.min(13, len * 0.28);
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

function drawBlock(
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

function drawGround(ctx: CanvasRenderingContext2D, y: number, width: number, isDark: boolean): void {
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.28)' : 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 9, y + 9);
        ctx.stroke();
    }
}

function drawInfoBar(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    text: string,
    isDark: boolean
): void {
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = panelFill(isDark);
    roundRectPath(ctx, width / 2 - tw / 2 - 10, height - 36, tw + 20, 24, 5);
    ctx.fill();
    ctx.fillStyle = mutedColor(isDark);
    ctx.fillText(text, width / 2, height - 19);
}

function drawHud(ctx: CanvasRenderingContext2D, isDark: boolean, rows: Array<{ label: string; value: string }>): void {
    const lineH = 18;
    const boxW = 190;
    const boxH = rows.length * lineH + 18;
    ctx.fillStyle = panelFill(isDark);
    roundRectPath(ctx, 8, 10, boxW, boxH, 6);
    ctx.fill();
    rows.forEach((row, i) => {
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = textColor(isDark);
        ctx.fillText(`${row.label} = ${row.value}`, 16, 19 + i * lineH);
    });
    ctx.textBaseline = 'alphabetic';
}

function drawEmptyState(ctx: CanvasRenderingContext2D, width: number, height: number, isDark: boolean): void {
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('点击「运行仿真」开始', width / 2, height / 2);
    ctx.textBaseline = 'alphabetic';
}

function getFrame(
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

function drawTitle(ctx: CanvasRenderingContext2D, width: number, title: string, isDark: boolean): void {
    ctx.fillStyle = textColor(isDark);
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 24);
}

export function drawFreeFallScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const h0 = params['height'] ?? 20;
    const g = params['g'] ?? 9.8;
    const frame = getFrame(simulationResult, currentTime);
    const fallen = frame ? Math.max(0, h0 - frame.position.y) : Math.min(h0, 0.5 * g * currentTime * currentTime);
    const v = frame ? Math.abs(frame.velocity.y) : g * currentTime;

    const topY = 55;
    const groundY = height - 62;
    const rulerX = width * 0.28;
    const fallX = width * 0.55;
    const scale = (groundY - topY) / Math.max(1, h0);
    const ballY = clamp(topY + fallen * scale, topY, groundY);

    drawTitle(ctx, width, '自由落体: h = 1/2 gt^2', isDark);
    drawGround(ctx, groundY, width, isDark);

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
        const y = topY + (i / 5) * (groundY - topY);
        ctx.beginPath();
        ctx.moveTo(rulerX, y);
        ctx.lineTo(rulerX + 9, y);
        ctx.stroke();
        ctx.fillText(`${((h0 * i) / 5).toFixed(0)}m`, rulerX - 6, y + 3);
    }

    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.28)';
    ctx.beginPath();
    ctx.moveTo(fallX, topY);
    ctx.lineTo(fallX, groundY);
    ctx.stroke();
    ctx.setLineDash([]);

    const grad = ctx.createRadialGradient(fallX - 6, ballY - 7, 3, fallX, ballY, 16);
    grad.addColorStop(0, '#fef3c7');
    grad.addColorStop(0.5, ORANGE);
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(fallX, ballY, 16, 0, Math.PI * 2);
    ctx.fill();
    drawArrow(ctx, fallX + 28, ballY - 12, fallX + 28, ballY + 50, RED, 'g');

    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(3)} s` },
        { label: 's', value: `${fallen.toFixed(2)} m` },
        { label: 'v', value: `${v.toFixed(2)} m/s` }
    ]);
    drawInfoBar(ctx, width, height, `h0=${h0}m  g=${g.toFixed(2)}m/s^2  s=1/2gt^2=${fallen.toFixed(2)}m`, isDark);
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

export function drawGalileoInclineScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const angleDeg = params['angleDeg'] ?? 30;
    const length = params['inclineLength'] ?? 2;
    const g = params['gravity'] ?? 9.8;
    const theta = (angleDeg * Math.PI) / 180;
    const a = g * Math.sin(theta);
    const frame = getFrame(simulationResult, currentTime);
    const s = clamp(frame ? frame.position.x : 0.5 * a * currentTime * currentTime, 0, length);

    const baseLeft = width * 0.18;
    const baseRight = width * 0.82;
    const baseY = height * 0.78;
    const maxInclineH = Math.max(0, baseY - 56);
    const inclineH = Math.min((baseRight - baseLeft) * Math.tan(theta), maxInclineH);
    const top = { x: baseLeft, y: baseY - inclineH };
    const bottom = { x: baseRight, y: baseY };
    const u = s / Math.max(0.001, length);
    const bx = top.x + (bottom.x - top.x) * u;
    const by = top.y + (bottom.y - top.y) * u;

    drawTitle(ctx, width, '伽利略斜面实验: s = 1/2 at^2', isDark);
    ctx.fillStyle = isDark ? '#334155' : '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(baseLeft, baseY);
    ctx.lineTo(baseRight, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 2;
    ctx.stroke();
    drawBlock(ctx, bx, by - 16, 34, 28, BLUE, isDark, '球');
    drawArrow(ctx, bx + 20, by - 20, bx + 80 * Math.cos(theta), by - 20 + 80 * Math.sin(theta), GREEN, 'v');
    drawArrow(ctx, bx - 10, by - 26, bx - 10 + 65 * Math.cos(theta), by - 26 + 65 * Math.sin(theta), RED, 'mg sinθ');

    ctx.fillStyle = ORANGE;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`θ=${angleDeg}°`, baseRight - 48, baseY - 16);

    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(3)} s` },
        { label: 'a', value: `${a.toFixed(2)} m/s²` },
        { label: 's', value: `${s.toFixed(2)} m` }
    ]);
    drawInfoBar(ctx, width, height, `a=g sinθ=${a.toFixed(2)}m/s^2  L=${length}m  θ=${angleDeg}°`, isDark);
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

export function drawReactionTimeScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const targetDistance = params['distance'] ?? 0.2;
    const g = params['gravity'] ?? 9.8;
    const frame = getFrame(simulationResult, currentTime);
    const distance = clamp(frame ? Math.abs(frame.position.y) : 0.5 * g * currentTime * currentTime, 0, targetDistance);
    const reaction = Math.sqrt((2 * targetDistance) / g);
    const scale = Math.min(950, (height - 130) / Math.max(0.05, targetDistance));
    const rulerTop = 60 + distance * scale;
    const rulerX = width * 0.5;
    const rulerH = Math.max(180, targetDistance * scale + 80);
    const handY = 85 + targetDistance * scale;

    drawTitle(ctx, width, '反应时间测量: t = sqrt(2h/g)', isDark);
    ctx.fillStyle = isDark ? '#f8fafc' : '#fefce8';
    roundRectPath(ctx, rulerX - 18, rulerTop, 36, rulerH, 3);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, rulerX - 18, rulerTop, 36, rulerH, 3);
    ctx.stroke();
    ctx.fillStyle = '#ca8a04';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    for (let cm = 0; cm <= Math.ceil(targetDistance * 100); cm += 2) {
        const y = rulerTop + cm * 0.01 * scale;
        if (y > rulerTop + rulerH - 10) break;
        ctx.beginPath();
        ctx.moveTo(rulerX + 14, y);
        ctx.lineTo(rulerX + (cm % 10 === 0 ? 2 : 8), y);
        ctx.stroke();
        if (cm % 10 === 0) ctx.fillText(`${cm}cm`, rulerX + 22, y + 3);
    }

    ctx.fillStyle = isDark ? '#475569' : '#fed7aa';
    roundRectPath(ctx, rulerX - 95, handY - 18, 78, 36, 16);
    ctx.fill();
    ctx.fillStyle = isDark ? '#64748b' : '#fdba74';
    roundRectPath(ctx, rulerX + 17, handY - 18, 78, 36, 16);
    ctx.fill();
    ctx.strokeStyle = RED;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(rulerX - 80, handY);
    ctx.lineTo(rulerX + 80, handY);
    ctx.stroke();
    ctx.setLineDash([]);

    drawHud(ctx, isDark, [
        { label: 'h', value: `${distance.toFixed(3)} m` },
        { label: 't', value: `${currentTime.toFixed(3)} s` },
        { label: 't_react', value: `${reaction.toFixed(3)} s` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `夹住距离 h=${targetDistance.toFixed(3)}m  反应时间 t=sqrt(2h/g)=${reaction.toFixed(3)}s`,
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

export function drawTickerTimerScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    const frequency = params['frequency'] ?? 50;
    const acceleration = params['acceleration'] ?? 1;
    const v0 = params['initialVelocity'] ?? 0;
    const period = 1 / frequency;
    const groundY = height * 0.62;
    const startX = 55;
    const scale = 70;

    drawTitle(ctx, width, '打点计时器: 相等时间间隔记录位置', isDark);
    drawGround(ctx, groundY, width, isDark);
    ctx.fillStyle = isDark ? '#f8fafc' : '#fff7ed';
    roundRectPath(ctx, 44, groundY - 12, width - 88, 24, 4);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#64748b' : '#cbd5e1';
    ctx.stroke();

    const maxDots = Math.min(70, Math.floor((params['duration'] ?? 2) / period));
    const activeDots = Math.min(maxDots, Math.floor(currentTime / period));
    let lastX = startX;
    for (let i = 0; i <= maxDots; i++) {
        const t = i * period;
        const s = Math.max(0, v0 * t + 0.5 * acceleration * t * t);
        const x = startX + s * scale;
        if (x > width - 55) break;
        const active = i <= activeDots;
        ctx.fillStyle = active ? RED : isDark ? '#94a3b8' : '#64748b';
        ctx.beginPath();
        ctx.arc(x, groundY, active ? 3.4 : 2.4, 0, Math.PI * 2);
        ctx.fill();
        if (active) lastX = x;
    }

    drawBlock(ctx, clamp(lastX + 35, 80, width - 80), groundY - 38, 58, 34, BLUE, isDark, '车');
    drawArrow(ctx, lastX + 58, groundY - 38, lastX + 120, groundY - 38, GREEN, 'v');
    drawHud(ctx, isDark, [
        { label: 'T', value: `${period.toFixed(3)} s` },
        { label: 'a', value: `${acceleration.toFixed(2)} m/s²` },
        { label: 'n', value: `${activeDots}` }
    ]);
    drawInfoBar(ctx, width, height, `f=${frequency}Hz  T=1/f=${period.toFixed(3)}s  相邻点间距增大表示加速`, isDark);
}

export function drawTransmissionBeltScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    const mode = Math.round(params['mode'] ?? 0);
    const r1 = params['r1'] ?? 0.2;
    const r2 = params['r2'] ?? 0.4;
    const omega1 = params['omega1'] ?? 10;
    const omega2 = mode === 3 ? omega1 : (omega1 * r1) / Math.max(0.001, r2);
    const left = { x: width * 0.32, y: height * 0.52 };
    const right = { x: width * 0.68, y: height * 0.52 };
    const rr1 = 34 + r1 * 55;
    const rr2 = 34 + r2 * 55;

    drawTitle(ctx, width, '传动装置: v = ωr', isDark);
    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = mode === 1 ? 3 : 10;
    ctx.beginPath();
    ctx.moveTo(left.x, left.y - rr1);
    ctx.lineTo(right.x, right.y - rr2);
    ctx.moveTo(left.x, left.y + rr1);
    ctx.lineTo(right.x, right.y + rr2);
    ctx.stroke();
    if (mode === 1) {
        for (let i = 0; i < 16; i++) {
            const t = i / 16;
            const x = left.x + (right.x - left.x) * t;
            const y = left.y - rr1 + (right.y - rr2 - (left.y - rr1)) * t;
            drawBlock(ctx, x, y, 8, 8, ORANGE, isDark);
        }
    }

    const phase1 = omega1 * currentTime;
    const phase2 = omega2 * currentTime * (mode === 1 ? -1 : 1);
    drawWheel(ctx, left.x, left.y, rr1, phase1, BLUE, isDark, '1');
    drawWheel(ctx, right.x, right.y, rr2, phase2, RED, isDark, '2');
    drawArrow(ctx, left.x, left.y - rr1 - 24, left.x + 80, left.y - rr1 - 24, GREEN, 'v');
    drawArrow(ctx, right.x, right.y - rr2 - 24, right.x + 80, right.y - rr2 - 24, GREEN, 'v');

    const modeLabel = ['皮带传动', '齿轮传动', '摩擦轮传动', '同轴转动'][mode] ?? '传动';
    drawHud(ctx, isDark, [
        { label: 'mode', value: modeLabel },
        { label: 'ω1', value: `${omega1.toFixed(2)} rad/s` },
        { label: 'ω2', value: `${omega2.toFixed(2)} rad/s` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `r1=${r1}m  r2=${r2}m  ${mode === 3 ? '同轴: ω1=ω2' : '无打滑: ω1r1=ω2r2'}`,
        isDark
    );
}

function drawWheel(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    phase: number,
    color: string,
    isDark: boolean,
    label: string
): void {
    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 5, cx, cy, r);
    grad.addColorStop(0, shadeColor(color, 40));
    grad.addColorStop(0.7, color);
    grad.addColorStop(1, shadeColor(color, -40));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0f172a' : '#f8fafc';
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
        const a = phase + (i * Math.PI) / 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82);
        ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
    ctx.textBaseline = 'alphabetic';
}

export function drawVerticalCircleScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    const length = params['length'] ?? 1;
    const mass = params['mass'] ?? 0.2;
    const v0 = params['initialSpeed'] ?? 5;
    const g = 9.8;
    const r = Math.min(width, height) * 0.27;
    const cx = width * 0.52;
    const cy = height * 0.5;
    const omega = v0 / Math.max(0.1, length);
    const angle = -Math.PI / 2 + omega * currentTime;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    const critical = Math.sqrt(g * length);
    const topOk = v0 >= critical;

    drawTitle(ctx, width, '竖直圆周运动: 最高点临界条件', isDark);
    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = topOk ? GREEN : RED;
    ctx.beginPath();
    ctx.arc(cx, cy - r, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = topOk ? GREEN : RED;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(topOk ? '可通过最高点' : '最高点速度不足', cx, cy - r - 30);
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    drawBlock(ctx, x, y, 30, 30, ORANGE, isDark, `${mass}kg`);
    drawArrow(ctx, x, y, cx, cy, BLUE, 'Fn');
    drawArrow(ctx, x + 26, y - 10, x + 26, y + 50, RED, 'mg');
    drawHud(ctx, isDark, [
        { label: 'v0', value: `${v0.toFixed(2)} m/s` },
        { label: 'v_top_min', value: `${critical.toFixed(2)} m/s` },
        { label: 'L', value: `${length.toFixed(2)} m` }
    ]);
    drawInfoBar(ctx, width, height, `最高点轻绳模型: v >= sqrt(gR) = ${critical.toFixed(2)}m/s`, isDark);
}

export function drawCenterOfGravityScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    const shape = Math.round(params['shapeType'] ?? 0);
    const cx = width * 0.52;
    const cy = height * 0.48;

    drawTitle(ctx, width, '悬挂法确定重心', isDark);
    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 54);
    ctx.lineTo(cx, cy - 100);
    ctx.stroke();

    ctx.fillStyle = isDark ? '#334155' : '#e2e8f0';
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (shape === 1) {
        ctx.arc(cx, cy, 85, 0, Math.PI * 2);
    } else if (shape === 2) {
        ctx.moveTo(cx - 90, cy - 60);
        ctx.lineTo(cx + 80, cy - 80);
        ctx.lineTo(cx + 55, cy + 70);
        ctx.lineTo(cx - 65, cy + 82);
        ctx.closePath();
    } else {
        roundRectPath(ctx, cx - 90, cy - 65, 180, 130, 6);
    }
    ctx.fill();
    ctx.stroke();

    const hangPoints = [
        { x: cx - 52, y: cy - 64 },
        { x: cx + 66, y: cy - 36 }
    ];
    for (const p of hangPoints) {
        ctx.fillStyle = ORANGE;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = RED;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        const dx = cx - p.x;
        const dy = cy - p.y;
        const tEnd = (cy + 115 - p.y) / (dy || 1);
        const xEnd = p.x + tEnd * dx;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(xEnd, cy + 115);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    ctx.fillStyle = GREEN;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = GREEN;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('G 重心', cx + 12, cy + 4);
    drawInfoBar(ctx, width, height, '两次悬挂的铅垂线交点即为薄板重心', isDark);
}

export function drawInertiaScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    const mode = Math.round(params['mode'] ?? 0);
    const groundY = height * 0.67;
    const shake = Math.sin(currentTime * 12) * 5;
    drawTitle(ctx, width, '惯性实验: 物体保持原有运动状态', isDark);
    drawGround(ctx, groundY, width, isDark);
    if (mode === 1) {
        drawBlock(ctx, width * 0.5 + shake, groundY - 14, 160, 14, BLUE, isDark, '纸板');
        drawEgg(ctx, width * 0.5, groundY - 58, isDark);
        drawArrow(ctx, width * 0.58, groundY - 14, width * 0.72, groundY - 14, RED, '快速抽出');
        drawInfoBar(ctx, width, height, '快速抽出纸板时, 鸡蛋因惯性近似保持原位置', isDark);
    } else if (mode === 2) {
        const carX = width * 0.38 + Math.min(140, currentTime * 45);
        drawBlock(ctx, carX, groundY - 26, 92, 38, BLUE, isDark, '小车');
        drawBlock(ctx, carX, groundY - 70, 32, 32, ORANGE, isDark, '块');
        drawArrow(ctx, carX + 52, groundY - 26, carX + 120, groundY - 26, GREEN, 'v');
        drawInfoBar(ctx, width, height, '小车突然运动或停止时, 上方物块因惯性出现相对滑动', isDark);
    } else {
        drawBlock(ctx, width * 0.5 + shake * 2, groundY - 15, 150, 18, BLUE, isDark, '硬纸片');
        drawBlock(ctx, width * 0.5, groundY - 46, 34, 28, ORANGE, isDark, '棋子');
        drawBlock(ctx, width * 0.5, groundY + 12, 70, 30, PURPLE, isDark, '杯');
        drawArrow(ctx, width * 0.58, groundY - 16, width * 0.74, groundY - 16, RED, '弹开');
        drawInfoBar(ctx, width, height, '纸片被快速弹开, 棋子因惯性落入杯中', isDark);
    }
    drawHud(ctx, isDark, [
        { label: 'mode', value: ['棋子实验', '鸡蛋实验', '小车实验'][mode] ?? '惯性实验' },
        { label: 't', value: `${currentTime.toFixed(2)} s` }
    ]);
}

function drawEgg(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean): void {
    const grad = ctx.createRadialGradient(x - 7, y - 10, 4, x, y, 24);
    grad.addColorStop(0, '#fff7ed');
    grad.addColorStop(1, isDark ? '#fbbf24' : '#fdba74');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, 18, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.stroke();
}

export function drawNewtonFirstLawScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    const v0 = params['v0'] ?? 5;
    const mass = params['mass'] ?? 1;
    const groundY = height * 0.66;
    const startX = width * 0.2;
    const x = clamp(startX + v0 * currentTime * 18, startX, width - 90);
    drawTitle(ctx, width, '牛顿第一定律: 合外力为零时保持匀速直线运动', isDark);
    drawGround(ctx, groundY, width, isDark);
    for (let i = 0; i < 5; i++) {
        const gx = startX + i * v0 * 0.5 * 18;
        ctx.globalAlpha = 0.16 + i * 0.12;
        drawBlock(ctx, gx, groundY - 26, 56, 36, BLUE, isDark);
    }
    ctx.globalAlpha = 1;
    drawBlock(ctx, x, groundY - 26, 64, 40, BLUE, isDark, `${mass}kg`);
    drawArrow(ctx, x + 36, groundY - 26, x + 110, groundY - 26, GREEN, 'v 恒定');
    drawHud(ctx, isDark, [
        { label: 'ΣF', value: '0 N' },
        { label: 'v', value: `${v0.toFixed(2)} m/s` },
        { label: 'm', value: `${mass.toFixed(2)} kg` }
    ]);
    drawInfoBar(ctx, width, height, '力不是维持运动的原因, 而是改变运动状态的原因', isDark);
}

export function drawCurveConditionScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const forceAngle = params['forceAngle'] ?? 45;
    const v0 = params['initialSpeed'] ?? 5;
    const m = params['mass'] ?? 1;
    const F = m * 2;
    const thetaRad = (forceAngle * Math.PI) / 180;
    const ax = (F * Math.cos(thetaRad)) / m;
    const ay = (F * Math.sin(thetaRad)) / m;

    const frame = getFrame(simulationResult, currentTime);
    const t = frame ? frame.t : currentTime;
    const px = v0 * t + 0.5 * ax * t * t;
    const py = 0.5 * ay * t * t;
    const vxNow = v0 + ax * t;
    const vyNow = ay * t;

    // 坐标系布局
    const originX = width * 0.15;
    const originY = height * 0.65;
    const maxExtent = Math.max(Math.abs(px), Math.abs(py), v0 * (params['duration'] ?? 3), 1);
    const scale = Math.min((width * 0.7) / maxExtent, (height * 0.5) / maxExtent, 40);

    const screenX = originX + px * scale;
    const screenY = originY - py * scale;

    drawTitle(ctx, width, '曲线运动条件: F 与 v₀ 不共线 → 曲线', isDark);

    // 坐标轴
    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(width - 30, originY);
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX, 50);
    ctx.stroke();
    drawArrow(ctx, width - 50, originY, width - 30, originY, mutedColor(isDark), 'x');
    drawArrow(ctx, originX, 70, originX, 50, mutedColor(isDark), 'y');

    // 轨迹（从 simulationResult 或解析计算）
    if (simulationResult) {
        const traj = simulationResult.trajectories[0];
        if (traj && traj.length > 1) {
            ctx.strokeStyle = BLUE;
            ctx.lineWidth = 2;
            ctx.beginPath();
            let started = false;
            for (const p of traj) {
                const sx = originX + p.position.x * scale;
                const sy = originY - p.position.y * scale;
                if (sx < 10 || sx > width - 10 || sy < 40 || sy > height - 40) continue;
                if (!started) {
                    ctx.moveTo(sx, sy);
                    started = true;
                } else ctx.lineTo(sx, sy);
                if (p.t > currentTime) break;
            }
            ctx.stroke();
        }
    }

    // 物体
    const grad = ctx.createRadialGradient(screenX - 4, screenY - 5, 2, screenX, screenY, 14);
    grad.addColorStop(0, '#fef3c7');
    grad.addColorStop(0.5, ORANGE);
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 14, 0, Math.PI * 2);
    ctx.fill();

    // v₀ 箭头（初始速度，水平向右）
    const v0ArrowLen = Math.min(v0 * 12, width * 0.25);
    drawArrow(ctx, originX, originY - 30, originX + v0ArrowLen, originY - 30, GREEN, 'v₀');

    // F 箭头
    const fArrowLen = Math.min(F * 18, width * 0.2);
    drawArrow(
        ctx,
        originX + 20,
        originY + 20,
        originX + 20 + fArrowLen * Math.cos(-thetaRad),
        originY + 20 + fArrowLen * Math.sin(-thetaRad),
        RED,
        'F'
    );

    // 速度箭头（当前）
    const vScale = 10;
    drawArrow(ctx, screenX, screenY, screenX + vxNow * vScale, screenY - vyNow * vScale, GREEN, 'v');

    // 角度标注
    const isLinear = forceAngle === 0 || forceAngle === 180;
    ctx.fillStyle = isLinear ? GREEN : RED;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isLinear ? 'F ∥ v₀ → 直线运动' : `F 与 v₀ 成 ${forceAngle}° → 曲线运动`, width / 2, height * 0.16);

    drawHud(ctx, isDark, [
        { label: 't', value: `${t.toFixed(3)} s` },
        { label: 'x', value: `${px.toFixed(2)} m` },
        { label: 'y', value: `${py.toFixed(2)} m` },
        { label: 'v', value: `${Math.hypot(vxNow, vyNow).toFixed(2)} m/s` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `v₀=${v0}m/s  F=${F.toFixed(1)}N  θ=${forceAngle}°  ${isLinear ? '直线' : '抛物线'}`,
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

export function drawMotionCompositionScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const vxConst = params['vxConst'] ?? 2;
    const vyAccel = params['vyAccel'] ?? 2;
    const duration = params['duration'] ?? 3;

    const frame = getFrame(simulationResult, currentTime);
    const t = frame ? frame.t : currentTime;
    const px = vxConst * t;
    const py = 0.5 * vyAccel * t * t;
    const vyNow = vyAccel * t;

    // 坐标系布局
    const originX = width * 0.12;
    const originY = height * 0.78;
    const maxX = vxConst * duration;
    const maxY = 0.5 * vyAccel * duration * duration;
    const maxExtent = Math.max(maxX, maxY, 1);
    const scaleX = (width * 0.75) / maxExtent;
    const scaleY = (height * 0.6) / maxExtent;
    const sc = Math.min(scaleX, scaleY, 60);

    const screenX = originX + px * sc;
    const screenY = originY - py * sc;

    drawTitle(ctx, width, '运动的合成与分解: x=vₓt, y=½aᵧt²', isDark);

    // 坐标轴
    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(width - 20, originY);
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX, 50);
    ctx.stroke();
    drawArrow(ctx, width - 40, originY, width - 20, originY, mutedColor(isDark), 'x');
    drawArrow(ctx, originX, 70, originX, 50, mutedColor(isDark), 'y');

    // 水平分运动虚线
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX + maxX * sc, originY);
    ctx.stroke();

    // 竖直分运动虚线
    ctx.strokeStyle = RED;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX, originY - maxY * sc);
    ctx.stroke();
    ctx.setLineDash([]);

    // 当前位置到轴的投影虚线
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(screenX, originY);
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(originX, screenY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 合运动轨迹
    if (simulationResult) {
        const traj = simulationResult.trajectories[0];
        if (traj && traj.length > 1) {
            ctx.strokeStyle = BLUE;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            let started = false;
            for (const p of traj) {
                const sx = originX + p.position.x * sc;
                const sy = originY - p.position.y * sc;
                if (!started) {
                    ctx.moveTo(sx, sy);
                    started = true;
                } else ctx.lineTo(sx, sy);
                if (p.t > currentTime) break;
            }
            ctx.stroke();
        }
    }

    // 物体
    const grad = ctx.createRadialGradient(screenX - 4, screenY - 5, 2, screenX, screenY, 14);
    grad.addColorStop(0, '#bbf7d0');
    grad.addColorStop(0.5, GREEN);
    grad.addColorStop(1, '#166534');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 14, 0, Math.PI * 2);
    ctx.fill();

    // 分速度箭头
    const vxArrowLen = vxConst * 15;
    drawArrow(ctx, screenX, screenY + 22, screenX + vxArrowLen, screenY + 22, GREEN, 'vₓ');
    const vyArrowLen = vyNow * 10;
    drawArrow(ctx, screenX - 22, screenY, screenX - 22, screenY - vyArrowLen, RED, 'vᵧ');

    // 合速度箭头
    const vTotal = Math.hypot(vxConst, vyNow);
    const vAngle = Math.atan2(vyNow, vxConst);
    const vArrowLen = vTotal * 10;
    drawArrow(
        ctx,
        screenX,
        screenY,
        screenX + vArrowLen * Math.cos(-vAngle),
        screenY + vArrowLen * Math.sin(-vAngle),
        PURPLE,
        'v'
    );

    // 分运动标注
    ctx.fillStyle = GREEN;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('匀速分运动 x=vₓt', originX + maxX * sc * 0.5, originY + 22);
    ctx.fillStyle = RED;
    ctx.fillText('匀加速分运动 y=½aᵧt²', originX - 60, originY - maxY * sc * 0.5);

    drawHud(ctx, isDark, [
        { label: 't', value: `${t.toFixed(3)} s` },
        { label: 'x', value: `${px.toFixed(2)} m` },
        { label: 'y', value: `${py.toFixed(2)} m` },
        { label: 'v', value: `${Math.hypot(vxConst, vyNow).toFixed(2)} m/s` }
    ]);
    drawInfoBar(ctx, width, height, `vₓ=${vxConst}m/s  aᵧ=${vyAccel}m/s²  合运动: y=(aᵧ/2vₓ²)x²`, isDark);
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

export function drawCurveVelocityDirectionScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const trackShape = Math.round(params['trackShape'] ?? 0);
    const angularSpeed = params['angularSpeed'] ?? 1;
    const releaseIndex = Math.round(params['releaseIndex'] ?? 1);

    const shapeNames = ['圆形', '抛物线', '螺旋'];
    const cx = width * 0.45;
    const cy = height * 0.5;
    const R = Math.min(width, height) * 0.22;

    drawTitle(ctx, width, '曲线运动速度方向: 脱离后沿切线飞出', isDark);

    // 画曲线轨道
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (trackShape === 0) {
        // 圆形轨道
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
    } else if (trackShape === 1) {
        // 抛物线 y = 0.005 * x^2
        for (let i = 0; i <= 200; i++) {
            const xp = (i / 200) * width * 0.7;
            const xm = xp - width * 0.35;
            const yp = 0.003 * xm * xm;
            if (i === 0)
                ctx.moveTo(width * 0.15 + xp * 0, cy - R + yp); // simplified
            else
                ctx.lineTo(
                    width * 0.15 + (i / 200) * width * 0.7,
                    cy - R + 0.003 * Math.pow((i / 200 - 0.5) * width * 0.7, 2)
                );
        }
    } else {
        // 螺旋
        for (let i = 0; i <= 300; i++) {
            const angle = (i / 300) * Math.PI * 4;
            const r = R * 0.3 + (R * 0.7 * i) / 300;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // 脱离点计算
    const releaseAngle = (releaseIndex / 4) * Math.PI * 2;
    let relX: number, relY: number, tanDx: number, tanDy: number;
    if (trackShape === 0) {
        relX = cx + R * Math.cos(releaseAngle);
        relY = cy + R * Math.sin(releaseAngle);
        tanDx = -Math.sin(releaseAngle);
        tanDy = Math.cos(releaseAngle);
    } else if (trackShape === 1) {
        const xp = width * 0.15 + (releaseIndex / 3) * width * 0.7;
        const xm = xp - width * 0.35;
        relX = xp;
        relY = cy - R + 0.003 * xm * xm;
        const slope = 0.006 * xm;
        const norm = Math.hypot(1, slope);
        tanDx = 1 / norm;
        tanDy = slope / norm;
    } else {
        const angle = (releaseIndex / 3) * Math.PI * 4;
        const r = R * 0.3 + (R * 0.7 * releaseIndex) / 3;
        relX = cx + r * Math.cos(angle);
        relY = cy + r * Math.sin(angle);
        tanDx = -Math.sin(angle);
        tanDy = Math.cos(angle);
    }

    // 脱离点标注
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(relX, relY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = RED;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`脱离点${releaseIndex + 1}`, relX, relY - 14);

    // 切线方向箭头
    const tanLen = 100;
    drawArrow(ctx, relX, relY, relX + tanDx * tanLen, relY + tanDy * tanLen, GREEN, '切线方向 v');

    // 动画中的运动物体
    if (simulationResult) {
        const traj = simulationResult.trajectories[0];
        if (traj && traj.length > 0) {
            const f = getFrame(simulationResult, currentTime);
            if (f) {
                // 从物理坐标映射到屏幕坐标（此场景物理坐标在曲线附近）
                const progress = clamp(currentTime / (params['duration'] ?? 1), 0, 1);
                const angle = releaseAngle * progress * 2; // 沿轨道运动
                let bx: number, by: number;
                if (trackShape === 0) {
                    bx = cx + R * Math.cos(angle);
                    by = cy + R * Math.sin(angle);
                } else {
                    bx = relX + (f.position.x - relX) * 0.5;
                    by = relY + (f.position.y - relY) * 0.5;
                }

                const bGrad = ctx.createRadialGradient(bx - 3, by - 4, 2, bx, by, 12);
                bGrad.addColorStop(0, '#fef3c7');
                bGrad.addColorStop(0.5, ORANGE);
                bGrad.addColorStop(1, '#b45309');
                ctx.fillStyle = bGrad;
                ctx.beginPath();
                ctx.arc(bx, by, 12, 0, Math.PI * 2);
                ctx.fill();

                // 速度方向箭头
                const vMag = Math.hypot(f.velocity.x, f.velocity.y);
                if (vMag > 0.01) {
                    const vNorm = { x: f.velocity.x / vMag, y: f.velocity.y / vMag };
                    drawArrow(ctx, bx, by, bx + vNorm.x * 60, by - vNorm.y * 60, GREEN, 'v');
                }
            }
        }
    }

    // 额外标注几条切线（教学演示）
    for (let i = 0; i < 4; i++) {
        if (i === releaseIndex) continue;
        const a = (i / 4) * Math.PI * 2;
        let px2: number, py2: number, tdx: number, tdy: number;
        if (trackShape === 0) {
            px2 = cx + R * Math.cos(a);
            py2 = cy + R * Math.sin(a);
            tdx = -Math.sin(a);
            tdy = Math.cos(a);
        } else {
            continue;
        }
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isDark ? 'rgba(34,197,94,0.3)' : 'rgba(22,163,74,0.25)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px2, py2);
        ctx.lineTo(px2 + tdx * 60, py2 + tdy * 60);
        ctx.stroke();
        ctx.setLineDash([]);
        // 小圆点
        ctx.fillStyle = isDark ? 'rgba(34,197,94,0.5)' : 'rgba(22,163,74,0.4)';
        ctx.beginPath();
        ctx.arc(px2, py2, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawHud(ctx, isDark, [
        { label: 'shape', value: shapeNames[trackShape] ?? '圆形' },
        { label: 'ω', value: `${angularSpeed.toFixed(1)} rad/s` },
        { label: 't', value: `${currentTime.toFixed(3)} s` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `轨道: ${shapeNames[trackShape]}  脱离点: 第${releaseIndex + 1}个  切线方向 = 瞬时速度方向`,
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

export function drawNewtonSecondLawScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    const force = params['force'] ?? 10;
    const mass = params['mass'] ?? 2;
    const v0 = params['v0'] ?? 0;
    const includeFriction = (params['includeFriction'] ?? 0) === 1;
    const friction = includeFriction ? (params['friction'] ?? 1) : 0;
    const netF = Math.max(0, force - friction);
    const a = netF / Math.max(0.001, mass);
    const groundY = height * 0.66;
    const x = clamp(width * 0.18 + (v0 * currentTime + 0.5 * a * currentTime * currentTime) * 28, 80, width - 100);

    drawTitle(ctx, width, '牛顿第二定律: F = ma', isDark);
    drawGround(ctx, groundY, width, isDark);
    drawBlock(ctx, x, groundY - 30, 78, 44, BLUE, isDark, `${mass}kg`);
    // 力/摩擦/加速度箭头端点钳制在画布内，大数值不再越出左右界
    drawArrow(ctx, x + 44, groundY - 34, Math.min(width - 10, x + 44 + force * 7), groundY - 34, ORANGE, 'F');
    if (friction > 0) {
        drawArrow(ctx, x - 44, groundY - 21, Math.max(10, x - 44 - friction * 10), groundY - 21, RED, 'f');
    }
    drawArrow(ctx, x + 44, groundY - 56, Math.min(width - 10, x + 44 + a * 34), groundY - 56, GREEN, 'a');
    ctx.fillStyle = panelFill(isDark);
    roundRectPath(ctx, width * 0.58, height * 0.26, 235, 86, 8);
    ctx.fill();
    ctx.fillStyle = textColor(isDark);
    ctx.font = 'bold 18px serif';
    ctx.textAlign = 'center';
    ctx.fillText('a = F合 / m', width * 0.58 + 118, height * 0.26 + 32);
    ctx.font = '13px monospace';
    ctx.fillText(
        `= ${netF.toFixed(2)} / ${mass.toFixed(2)} = ${a.toFixed(2)} m/s²`,
        width * 0.58 + 118,
        height * 0.26 + 58
    );
    drawHud(ctx, isDark, [
        { label: 'F', value: `${force.toFixed(2)} N` },
        { label: 'f', value: `${friction.toFixed(2)} N` },
        { label: 'a', value: `${a.toFixed(2)} m/s²` }
    ]);
    drawInfoBar(ctx, width, height, `F合=${netF.toFixed(2)}N  m=${mass.toFixed(2)}kg  a=${a.toFixed(2)}m/s^2`, isDark);
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

    drawTitle(ctx, width, `单摆: T = 2π√(L/g) = ${T.toFixed(3)}s`, isDark);

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

    drawTitle(ctx, width, '机械能守恒定律: Ek + Ep = const', isDark);
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

export function drawOverweightScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const modeIdx = Math.round(params['mode'] ?? 0);
    const mass = params['mass'] ?? 1;
    const accMag = params['accMagnitude'] ?? 2;
    const g = params['gravity'] ?? 9.8;
    const modes = ['upStart', 'upStop', 'downStart', 'downStop'] as const;
    const mode = modes[modeIdx] ?? 'upStart';

    // 支持力 N = m(g + ay)
    let ay = 0;
    if (mode === 'upStart') ay = accMag;
    else if (mode === 'upStop') ay = -accMag;
    else if (mode === 'downStart') ay = -accMag;
    else if (mode === 'downStop') ay = accMag;
    const N = Math.max(0, mass * (g + ay));
    const mg = mass * g;
    const isOverweight = N > mg;
    const isWeightless = Math.abs(N) < 0.01;

    // 电梯位移
    const frame = getFrame(simulationResult, currentTime);
    const elevY = frame ? frame.position.y : 0.5 * ay * currentTime * currentTime;
    const elevDisplacement = clamp(elevY * 30, -80, 80);

    // 布局
    const cx = width * 0.38;
    const elevTop = height * 0.2 + elevDisplacement;
    const elevW = 160;
    const elevH = 200;
    const floorY = elevTop + elevH;

    drawTitle(ctx, width, `超重与失重: N = m(g + aᵧ)`, isDark);

    // 电梯外框
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 3;
    // 左右墙壁
    ctx.beginPath();
    ctx.moveTo(cx - elevW / 2 - 10, height * 0.12);
    ctx.lineTo(cx - elevW / 2 - 10, height * 0.88);
    ctx.moveTo(cx + elevW / 2 + 10, height * 0.12);
    ctx.lineTo(cx + elevW / 2 + 10, height * 0.88);
    ctx.stroke();
    // 导轨纹理
    ctx.strokeStyle = isDark ? 'rgba(71,85,105,0.4)' : 'rgba(148,163,184,0.3)';
    ctx.lineWidth = 1;
    for (let y = height * 0.12; y < height * 0.88; y += 15) {
        ctx.beginPath();
        ctx.moveTo(cx - elevW / 2 - 10, y);
        ctx.lineTo(cx - elevW / 2 - 4, y);
        ctx.moveTo(cx + elevW / 2 + 4, y);
        ctx.lineTo(cx + elevW / 2 + 10, y);
        ctx.stroke();
    }

    // 电梯箱体
    const elevGrad = ctx.createLinearGradient(cx - elevW / 2, elevTop, cx + elevW / 2, elevTop);
    elevGrad.addColorStop(0, isDark ? '#1e293b' : '#e2e8f0');
    elevGrad.addColorStop(0.5, isDark ? '#334155' : '#f1f5f9');
    elevGrad.addColorStop(1, isDark ? '#1e293b' : '#e2e8f0');
    ctx.fillStyle = elevGrad;
    roundRectPath(ctx, cx - elevW / 2, elevTop, elevW, elevH, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 2;
    roundRectPath(ctx, cx - elevW / 2, elevTop, elevW, elevH, 6);
    ctx.stroke();

    // 台秤
    const scaleY2 = floorY - 30;
    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    roundRectPath(ctx, cx - 45, scaleY2, 90, 26, 4);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#64748b' : '#cbd5e1';
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, cx - 45, scaleY2, 90, 26, 4);
    ctx.stroke();
    // 台秤读数
    ctx.fillStyle = isOverweight ? RED : isWeightless ? GREEN : BLUE;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${N.toFixed(1)} N`, cx, scaleY2 + 18);

    // 物体在台秤上
    const objH = 40;
    const objY = scaleY2 - objH;
    drawBlock(ctx, cx, objY + objH / 2, 50, objH, BLUE, isDark, `${mass}kg`);

    // 力箭头
    const arrowBase = objY;
    // N 向上
    const nArrowLen = Math.min(N * 3, 100);
    drawArrow(ctx, cx - 30, arrowBase, cx - 30, arrowBase - nArrowLen, BLUE, `N=${N.toFixed(1)}N`);
    // mg 向下
    const mgArrowLen = Math.min(mg * 3, 100);
    drawArrow(ctx, cx + 30, arrowBase + objH, cx + 30, arrowBase + objH + mgArrowLen, RED, `mg=${mg.toFixed(1)}N`);

    // 加速度箭头
    if (Math.abs(ay) > 0.01) {
        const aArrowLen = accMag * 15;
        const aDir = ay > 0 ? -1 : 1; // 屏幕坐标系
        drawArrow(
            ctx,
            cx + elevW / 2 + 20,
            elevTop + elevH / 2,
            cx + elevW / 2 + 20,
            elevTop + elevH / 2 + aDir * aArrowLen,
            GREEN,
            `a=${accMag}m/s²`
        );
    }

    // 状态标签
    const statusText = isWeightless ? '完全失重 N=0' : isOverweight ? '超重 N>mg' : '失重 N<mg';
    const statusColor = isWeightless ? GREEN : isOverweight ? RED : ORANGE;
    ctx.fillStyle = statusColor;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(statusText, cx, elevTop - 20);

    // 右侧公式面板
    const panelX = width * 0.65;
    ctx.fillStyle = panelFill(isDark);
    roundRectPath(ctx, panelX, height * 0.25, 200, 120, 8);
    ctx.fill();
    ctx.fillStyle = textColor(isDark);
    ctx.font = 'bold 16px serif';
    ctx.textAlign = 'center';
    ctx.fillText('N = m(g + aᵧ)', panelX + 100, height * 0.25 + 35);
    ctx.font = '13px monospace';
    ctx.fillText(
        `= ${mass}×(${g.toFixed(1)} + ${ay >= 0 ? '+' : ''}${ay.toFixed(1)})`,
        panelX + 100,
        height * 0.25 + 60
    );
    ctx.fillText(`= ${N.toFixed(2)} N`, panelX + 100, height * 0.25 + 82);

    const modeNames = ['向上加速(超重)', '向上减速(失重)', '向下加速(失重)', '向下减速(超重)'];
    drawHud(ctx, isDark, [
        { label: 'mode', value: modeNames[modeIdx] ?? '' },
        { label: 'aᵧ', value: `${ay.toFixed(1)} m/s²` },
        { label: 'N', value: `${N.toFixed(2)} N` },
        { label: 'mg', value: `${mg.toFixed(2)} N` }
    ]);
    drawInfoBar(ctx, width, height, `m=${mass}kg  a=${accMag}m/s²  ${modeNames[modeIdx]}  N=${N.toFixed(1)}N`, isDark);
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

// ======================= Task 3: 圆周与离心场景 =======================

export function drawCentrifugalScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const mass = params['mass'] ?? 1;
    const radius = params['radius'] ?? 0.3;
    const omega = params['angularSpeed'] ?? 5;
    const mu = params['frictionCoeff'] ?? 0.5;
    const g = 9.8;

    const omegaCrit = Math.sqrt((mu * g) / Math.max(0.01, radius));
    const isSliding = omega > omegaCrit;
    const Fneeded = mass * omega * omega * radius;
    const Fmax = mu * mass * g;

    // 布局：俯视图转盘
    const cx = width * 0.45;
    const cy = height * 0.5;
    const R = Math.min(width, height) * 0.25;

    drawTitle(ctx, width, `离心现象: F需=mω²r vs F实=μmg`, isDark);

    // 转盘
    const diskGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    diskGrad.addColorStop(0, isDark ? '#334155' : '#e2e8f0');
    diskGrad.addColorStop(0.8, isDark ? '#1e293b' : '#cbd5e1');
    diskGrad.addColorStop(1, isDark ? '#0f172a' : '#94a3b8');
    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 转盘旋转标记线
    const phase = omega * currentTime;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
        const a = phase + (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9);
        ctx.stroke();
    }

    // 中心点
    ctx.fillStyle = isDark ? '#64748b' : '#334155';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    // 物块位置
    const rPx = (radius / Math.max(0.01, 1)) * R;
    let blockAngle: number;
    if (isSliding && simulationResult) {
        const f = getFrame(simulationResult, currentTime);
        if (f) {
            blockAngle = Math.atan2(f.position.y, f.position.x);
        } else {
            blockAngle = phase;
        }
    } else {
        blockAngle = phase;
    }
    const blockR = isSliding ? Math.min(rPx + currentTime * 20, R * 1.5) : rPx;
    const bx = cx + blockR * Math.cos(blockAngle);
    const by = cy + blockR * Math.sin(blockAngle);

    // 物块
    drawBlock(ctx, bx, by, 30, 30, isSliding ? RED : BLUE, isDark, `${mass}kg`);

    // 向心力箭头
    if (!isSliding) {
        const fDirX = (cx - bx) / rPx;
        const fDirY = (cy - by) / rPx;
        drawArrow(ctx, bx, by, bx + fDirX * 50, by + fDirY * 50, GREEN, 'f=μmg');
    }

    // 临界条件标注
    ctx.fillStyle = isSliding ? RED : GREEN;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
        isSliding
            ? `ω=${omega.toFixed(1)} > ω临界=${omegaCrit.toFixed(1)} → 离心滑出！`
            : `ω=${omega.toFixed(1)} < ω临界=${omegaCrit.toFixed(1)} → 随盘转动`,
        width / 2,
        height * 0.14
    );

    drawHud(ctx, isDark, [
        { label: 'ω', value: `${omega.toFixed(1)} rad/s` },
        { label: 'ωcrit', value: `${omegaCrit.toFixed(1)} rad/s` },
        { label: 'F需', value: `${Fneeded.toFixed(2)} N` },
        { label: 'Fmax', value: `${Fmax.toFixed(2)} N` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `m=${mass}kg  r=${radius}m  μ=${mu}  ωcrit=√(μg/r)=${omegaCrit.toFixed(1)}rad/s`,
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

export function drawOrbitalScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const h_km = params['altitude'] ?? 400;
    const vFactor = params['velocityFactor'] ?? 1.0;
    const GM = 3.986e14;
    const R_EARTH = 6.371e6;
    const r = R_EARTH + h_km * 1000;
    const vOrbit = Math.sqrt(GM / r);
    const v = vOrbit * vFactor;

    // 布局
    const cx = width * 0.45;
    const cy = height * 0.5;
    const earthR = Math.min(width, height) * 0.12;
    const orbitR = earthR + (h_km / 36000) * (Math.min(width, height) * 0.3);

    drawTitle(ctx, width, '万有引力与航天: 卫星轨道运动', isDark);

    // 地球
    const earthGrad = ctx.createRadialGradient(cx - earthR * 0.3, cy - earthR * 0.3, earthR * 0.1, cx, cy, earthR);
    earthGrad.addColorStop(0, '#60a5fa');
    earthGrad.addColorStop(0.4, '#3b82f6');
    earthGrad.addColorStop(0.8, '#1d4ed8');
    earthGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = earthGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, earthR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, earthR * 0.9, earthR * 0.3, 0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('地球', cx, cy + 4);

    // 轨道
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    if (Math.abs(vFactor - 1.0) < 0.02) {
        ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
    } else {
        const a = orbitR * (vFactor > 1 ? 1.3 : 0.8);
        const b = orbitR * (vFactor > 1 ? 0.9 : 1.1);
        ctx.ellipse(cx, cy, a, b, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 卫星位置
    const T = (2 * Math.PI * r) / vOrbit;
    const angle = (currentTime / T) * Math.PI * 2;
    const satX = cx + orbitR * Math.cos(angle);
    const satY = cy + orbitR * Math.sin(angle);

    // 卫星
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(satX, satY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(satX - 20, satY - 3, 12, 6);
    ctx.fillRect(satX + 8, satY - 3, 12, 6);

    // 速度箭头
    const vAngle = angle + Math.PI / 2;
    drawArrow(ctx, satX, satY, satX + Math.cos(vAngle) * 40, satY + Math.sin(vAngle) * 40, GREEN, 'v');

    // 引力箭头
    const gDirX = (cx - satX) / orbitR;
    const gDirY = (cy - satY) / orbitR;
    drawArrow(ctx, satX, satY, satX + gDirX * 35, satY + gDirY * 35, RED, 'F引');

    // 宇宙速度参考
    const v1 = Math.sqrt(GM / R_EARTH) / 1000;
    const v2 = v1 * Math.sqrt(2);
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`第一宇宙速度 v₁=${v1.toFixed(2)}km/s`, 16, height - 80);
    ctx.fillText(`第二宇宙速度 v₂=${v2.toFixed(2)}km/s`, 16, height - 62);

    const orbitType =
        vFactor >= 1.41 ? '逃逸轨道' : vFactor > 1.01 ? '椭圆(近地点)' : vFactor < 0.99 ? '椭圆(远地点)' : '圆轨道';
    drawHud(ctx, isDark, [
        { label: 'h', value: `${h_km} km` },
        { label: 'v', value: `${(v / 1000).toFixed(2)} km/s` },
        { label: 'v/v圆', value: `${vFactor.toFixed(2)}` },
        { label: 'type', value: orbitType }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `h=${h_km}km  v=${(v / 1000).toFixed(2)}km/s  v圆=${(vOrbit / 1000).toFixed(2)}km/s  ${orbitType}`,
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

// ======================= Task 4: 碰撞与动量场景 =======================

export function drawMomentumScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const modeNum = params['modeLabel'] ?? 0;
    const isRecoil = modeNum === 1;
    const force = params['force'] ?? 10;
    const mass = params['mass'] ?? 2;
    const mass2 = params['mass2'] ?? 1;
    const v2 = params['v2'] ?? 5;
    const v0 = params['v0'] ?? 0;

    const groundY = height * 0.65;
    drawTitle(ctx, width, isRecoil ? '反冲运动: m₁v₁ + m₂v₂ = 0' : '动量定理: F·Δt = Δp', isDark);
    drawGround(ctx, groundY, width, isDark);

    if (isRecoil) {
        const v1 = -(mass2 * v2) / mass;
        const centerX = width * 0.5;
        const sep = currentTime * 40;
        const x1 = clamp(centerX + v1 * sep * 0.5, 60, width - 60);
        const x2 = clamp(centerX + v2 * sep * 0.5, 60, width - 60);

        drawBlock(ctx, x1, groundY - 30, 56, 40, BLUE, isDark, `m₁=${mass}kg`);
        drawBlock(ctx, x2, groundY - 30, 44, 34, RED, isDark, `m₂=${mass2}kg`);
        drawArrow(ctx, x1 - 30, groundY - 30, x1 - 30 + v1 * 12, groundY - 30, GREEN, `v₁=${v1.toFixed(1)}`);
        drawArrow(ctx, x2 + 30, groundY - 30, x2 + 30 + v2 * 12, groundY - 30, GREEN, `v₂=${v2.toFixed(1)}`);

        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = ORANGE;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX, groundY - 70);
        ctx.lineTo(centerX, groundY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = ORANGE;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('分离点', centerX, groundY - 76);

        const p1 = mass * v1;
        const p2 = mass2 * v2;
        drawHud(ctx, isDark, [
            { label: 'v₁', value: `${v1.toFixed(2)} m/s` },
            { label: 'v₂', value: `${v2.toFixed(2)} m/s` },
            { label: 'p₁+p₂', value: `${(p1 + p2).toFixed(2)} kg·m/s` },
            { label: 'Σp', value: '≈ 0 (守恒)' }
        ]);
        drawInfoBar(
            ctx,
            width,
            height,
            `反冲: m₁=${mass}kg  m₂=${mass2}kg  v₂=${v2}m/s  v₁=${v1.toFixed(2)}m/s`,
            isDark
        );
    } else {
        const a = force / Math.max(0.01, mass);
        const vNow = v0 + a * currentTime;
        const x = clamp(width * 0.18 + (v0 * currentTime + 0.5 * a * currentTime * currentTime) * 25, 60, width - 80);
        const impulse = force * currentTime;
        const dp = mass * (vNow - v0);

        drawBlock(ctx, x, groundY - 30, 64, 44, BLUE, isDark, `${mass}kg`);
        drawArrow(ctx, x + 36, groundY - 34, Math.min(width - 10, x + 36 + force * 5), groundY - 34, ORANGE, 'F');
        drawArrow(ctx, x + 36, groundY - 58, Math.min(width - 10, x + 36 + vNow * 12), groundY - 58, GREEN, 'v');

        const barY = height * 0.2;
        const barW = 180;
        ctx.fillStyle = panelFill(isDark);
        roundRectPath(ctx, width * 0.6, barY, barW + 20, 100, 8);
        ctx.fill();
        ctx.fillStyle = textColor(isDark);
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`p₀ = ${(mass * v0).toFixed(2)} kg·m/s`, width * 0.6 + 10, barY + 25);
        ctx.fillText(`p  = ${(mass * vNow).toFixed(2)} kg·m/s`, width * 0.6 + 10, barY + 48);
        ctx.fillText(`Δp = ${dp.toFixed(2)} kg·m/s`, width * 0.6 + 10, barY + 71);
        ctx.fillText(`FΔt = ${impulse.toFixed(2)} N·s`, width * 0.6 + 10, barY + 90);

        drawHud(ctx, isDark, [
            { label: 'F', value: `${force.toFixed(1)} N` },
            { label: 'v', value: `${vNow.toFixed(2)} m/s` },
            { label: 'FΔt', value: `${impulse.toFixed(2)} N·s` },
            { label: 'Δp', value: `${dp.toFixed(2)} kg·m/s` }
        ]);
        drawInfoBar(
            ctx,
            width,
            height,
            `F=${force}N  m=${mass}kg  v₀=${v0}m/s  F·Δt=Δp=${dp.toFixed(2)}kg·m/s`,
            isDark
        );
    }
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

export function drawProjectileCollisionScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const m1 = params['m1'] ?? 0.1;
    const m2 = params['m2'] ?? 0.1;
    const v1 = params['v1Initial'] ?? 2;
    const tableH = params['tableHeight'] ?? 0.8;
    const e = params['restitution'] ?? 1;
    const g = params['gravity'] ?? 9.8;
    const tFall = Math.sqrt((2 * tableH) / g);

    const groundY = height - 50;
    const tableTop = groundY - tableH * 150;
    const tableLeft = width * 0.15;
    const tableRight = width * 0.5;

    drawTitle(ctx, width, '平抛碰撞 (验证动量守恒)', isDark);
    drawGround(ctx, groundY, width, isDark);

    // 实验台
    ctx.fillStyle = isDark ? '#334155' : '#cbd5e1';
    ctx.fillRect(tableLeft, tableTop, tableRight - tableLeft, 8);
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tableLeft + 20, tableTop + 8);
    ctx.lineTo(tableLeft + 20, groundY);
    ctx.moveTo(tableRight - 20, tableTop + 8);
    ctx.lineTo(tableRight - 20, groundY);
    ctx.stroke();

    // 斜轨
    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tableLeft, tableTop - 60);
    ctx.quadraticCurveTo(tableLeft + 40, tableTop, tableLeft + 80, tableTop);
    ctx.stroke();

    const collisionX = tableRight;
    const collisionY = tableTop;
    const v1After = ((m1 - e * m2) * v1) / (m1 + m2);
    const v2After = ((1 + e) * m1 * v1) / (m1 + m2);
    const isPreCollision = currentTime < 0.3;

    if (isPreCollision) {
        const preX = tableLeft + 80 + (collisionX - tableLeft - 80) * (currentTime / 0.3);
        const grad1 = ctx.createRadialGradient(preX - 3, collisionY - 13, 2, preX, collisionY - 10, 10);
        grad1.addColorStop(0, '#93c5fd');
        grad1.addColorStop(1, '#1d4ed8');
        ctx.fillStyle = grad1;
        ctx.beginPath();
        ctx.arc(preX, collisionY - 10, 10, 0, Math.PI * 2);
        ctx.fill();
        const grad2 = ctx.createRadialGradient(collisionX - 3, collisionY - 13, 2, collisionX, collisionY - 10, 10);
        grad2.addColorStop(0, '#fca5a5');
        grad2.addColorStop(1, '#b91c1c');
        ctx.fillStyle = grad2;
        ctx.beginPath();
        ctx.arc(collisionX, collisionY - 10, 10, 0, Math.PI * 2);
        ctx.fill();
    } else {
        const tAfter = currentTime - 0.3;
        const fallY = 0.5 * g * tAfter * tAfter;
        const fallYpx = (fallY * 150) / Math.max(0.01, tableH);

        const ball1X = collisionX + v1After * tAfter * 40;
        const ball1Y = collisionY + fallYpx;
        if (ball1Y < groundY) {
            const g1 = ctx.createRadialGradient(ball1X - 3, ball1Y - 3, 2, ball1X, ball1Y, 10);
            g1.addColorStop(0, '#93c5fd');
            g1.addColorStop(1, '#1d4ed8');
            ctx.fillStyle = g1;
            ctx.beginPath();
            ctx.arc(ball1X, Math.min(ball1Y, groundY - 10), 10, 0, Math.PI * 2);
            ctx.fill();
        }

        const ball2X = collisionX + v2After * tAfter * 40;
        const ball2Y = collisionY + fallYpx;
        if (ball2Y < groundY) {
            const g2 = ctx.createRadialGradient(ball2X - 3, ball2Y - 3, 2, ball2X, ball2Y, 10);
            g2.addColorStop(0, '#fca5a5');
            g2.addColorStop(1, '#b91c1c');
            ctx.fillStyle = g2;
            ctx.beginPath();
            ctx.arc(ball2X, Math.min(ball2Y, groundY - 10), 10, 0, Math.PI * 2);
            ctx.fill();
        }

        const opX = collisionX + v1 * tFall * 40;
        const omX = collisionX + v1After * tFall * 40;
        const onX = collisionX + v2After * tFall * 40;

        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.2)';
        ctx.lineWidth = 1;
        [opX, omX, onX].forEach((x, i) => {
            ctx.beginPath();
            ctx.moveTo(x, groundY - 5);
            ctx.lineTo(x, groundY + 5);
            ctx.stroke();
            const labels = ['OP', 'OM', 'ON'];
            const colors = [PURPLE, BLUE, RED];
            ctx.fillStyle = colors[i]!;
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(labels[i] ?? '', x, groundY + 20);
        });
        ctx.setLineDash([]);
    }

    const pBefore = m1 * v1;
    const pAfter = m1 * v1After + m2 * v2After;
    ctx.fillStyle = panelFill(isDark);
    roundRectPath(ctx, width * 0.6, height * 0.2, 220, 80, 8);
    ctx.fill();
    ctx.fillStyle = textColor(isDark);
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`碰前: p = m₁v₁ = ${pBefore.toFixed(4)}`, width * 0.6 + 10, height * 0.2 + 25);
    ctx.fillText(`碰后: p' = m₁v₁' + m₂v₂' = ${pAfter.toFixed(4)}`, width * 0.6 + 10, height * 0.2 + 48);
    ctx.fillText(`守恒验证: |Δp| = ${Math.abs(pBefore - pAfter).toFixed(6)}`, width * 0.6 + 10, height * 0.2 + 71);

    drawHud(ctx, isDark, [
        { label: 'v₁', value: `${v1} m/s` },
        { label: "v₁'", value: `${v1After.toFixed(2)} m/s` },
        { label: "v₂'", value: `${v2After.toFixed(2)} m/s` },
        { label: 't_fall', value: `${tFall.toFixed(3)} s` }
    ]);
    drawInfoBar(ctx, width, height, `m₁=${m1}kg  m₂=${m2}kg  v₁=${v1}m/s  e=${e}  h=${tableH}m`, isDark);
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

// ======================= Task 5: 波动场景 =======================

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

    drawTitle(ctx, width, `机械波: ${modeNames[waveMode]}`, isDark);

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

export function drawCavendishScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    const m1 = params['m1'] ?? 10;
    const m2 = params['m2'] ?? 0.5;
    const distance = params['distance'] ?? 0.1;
    const torsionConst = params['torsionConst'] ?? 1e-4;
    const mirrorDist = params['mirrorDist'] ?? 5;

    const G = 6.674e-11;
    const armLength = 1;
    const F = (G * m1 * m2) / (distance * distance);
    const tau = F * armLength;
    const theta = tau / torsionConst;
    const spotDisp = 2 * mirrorDist * theta;

    const cx = width * 0.42;
    const cy = height * 0.48;
    const armPx = Math.min(width * 0.2, 140);

    drawTitle(ctx, width, '卡文迪什扭秤测万有引力常数 G', isDark);

    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 60);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    ctx.fillRect(cx - 20, 52, 40, 12);

    ctx.strokeStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - armPx, cy);
    ctx.lineTo(cx + armPx, cy);
    ctx.stroke();

    const smallR = 10 + m2 * 3;
    const ballPositions = [cx - armPx, cx + armPx];
    for (const bx of ballPositions) {
        const grad = ctx.createRadialGradient(bx - 2, cy - 2, 1, bx, cy, smallR);
        grad.addColorStop(0, '#d4d4d8');
        grad.addColorStop(1, '#71717a');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, cy, smallR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('m₂', bx, cy);
    }
    ctx.textBaseline = 'alphabetic';

    const bigR = 18 + Math.log10(Math.max(1, m1)) * 8;
    const bigBallPositions = [cx - armPx - bigR - smallR - 4, cx + armPx + bigR + smallR + 4];
    for (const bx of bigBallPositions) {
        const grad = ctx.createRadialGradient(bx - 3, cy - 3, 2, bx, cy, bigR);
        grad.addColorStop(0, '#fbbf24');
        grad.addColorStop(0.6, '#d97706');
        grad.addColorStop(1, '#92400e');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, cy, bigR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('m₁', bx, cy);
    }
    ctx.textBaseline = 'alphabetic';

    drawArrow(ctx, cx - armPx, cy + smallR + 8, cx - armPx - 30, cy + smallR + 8, RED, 'F引');
    drawArrow(ctx, cx + armPx, cy + smallR + 8, cx + armPx + 30, cy + smallR + 8, RED, 'F引');

    ctx.fillStyle = isDark ? '#67e8f9' : '#06b6d4';
    ctx.fillRect(cx - 8, cy - 32, 16, 4);

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 30);
    ctx.lineTo(width * 0.85, cy - 50);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#1e293b' : '#f8fafc';
    ctx.fillRect(width * 0.85 - 5, cy - 80, 10, 80);
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.strokeRect(width * 0.85 - 5, cy - 80, 10, 80);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(width * 0.85, cy - 50, 4, 0, Math.PI * 2);
    ctx.fill();

    const panelX = width * 0.08;
    ctx.fillStyle = panelFill(isDark);
    roundRectPath(ctx, panelX, height * 0.72, width * 0.84, 65, 8);
    ctx.fill();
    ctx.fillStyle = textColor(isDark);
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
        `三级放大: 力矩τ=F·L=${tau.toExponential(2)}N·m → 扭转角θ=τ/k=${theta.toExponential(2)}rad → 光点偏移Δ=2Dθ=${spotDisp.toExponential(2)}m`,
        panelX + 10,
        height * 0.72 + 25
    );
    ctx.fillText(`F = G·m₁m₂/r² = ${F.toExponential(3)}N   G ≈ 6.674×10⁻¹¹ N·m²/kg²`, panelX + 10, height * 0.72 + 50);

    drawHud(ctx, isDark, [
        { label: 'm₁', value: `${m1} kg` },
        { label: 'm₂', value: `${m2} kg` },
        { label: 'r', value: `${distance} m` },
        { label: 'F', value: `${F.toExponential(2)} N` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `m₁=${m1}kg  m₂=${m2}kg  r=${distance}m  k=${torsionConst.toExponential(1)}N·m/rad  D=${mirrorDist}m`,
        isDark
    );
}

export function drawMoonEarthTestScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, currentTime } = opts;
    const R_earth = 6.371e6;
    const r_moon = 3.844e8;
    const T_moon = 27.3 * 86400;
    const g_surface = 9.8;

    const a_moon = (4 * Math.PI * Math.PI * r_moon) / (T_moon * T_moon);
    const ratio = (R_earth / r_moon) * (R_earth / r_moon);
    const a_theory = g_surface * ratio;

    const cx = width * 0.35;
    const cy = height * 0.45;
    const earthR = 45;
    const moonOrbitR = Math.min(width * 0.25, 160);

    drawTitle(ctx, width, '月地检验: 验证万有引力平方反比律', isDark);

    const earthGrad = ctx.createRadialGradient(cx - earthR * 0.3, cy - earthR * 0.3, earthR * 0.1, cx, cy, earthR);
    earthGrad.addColorStop(0, '#60a5fa');
    earthGrad.addColorStop(0.5, '#2563eb');
    earthGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = earthGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, earthR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('地球', cx, cy + 4);

    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, moonOrbitR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const moonAngle = currentTime * 0.3;
    const moonX = cx + moonOrbitR * Math.cos(moonAngle);
    const moonY = cy + moonOrbitR * Math.sin(moonAngle);
    const moonR = 14;
    const moonGrad = ctx.createRadialGradient(moonX - 3, moonY - 3, 2, moonX, moonY, moonR);
    moonGrad.addColorStop(0, '#e5e7eb');
    moonGrad.addColorStop(0.6, '#9ca3af');
    moonGrad.addColorStop(1, '#4b5563');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('月球', moonX, moonY + 3);

    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(moonX, moonY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('r = 3.84×10⁸m', (cx + moonX) / 2, (cy + moonY) / 2 - 10);

    const gDir = { x: (cx - moonX) / moonOrbitR, y: (cy - moonY) / moonOrbitR };
    drawArrow(ctx, moonX, moonY, moonX + gDir.x * 40, moonY + gDir.y * 40, RED, 'F引');

    const barX = width * 0.65;
    const barW = 60;
    const barH = height * 0.35;
    const barTop = height * 0.22;

    ctx.fillStyle = panelFill(isDark);
    roundRectPath(ctx, barX - 20, barTop - 30, barW * 2 + 60, barH + 80, 8);
    ctx.fill();

    ctx.fillStyle = textColor(isDark);
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('a_月 vs g/3600 对比', barX + barW + 10, barTop - 10);

    const maxA = Math.max(a_moon, a_theory) * 1.2;
    const h1 = (a_moon / maxA) * barH;
    ctx.fillStyle = BLUE;
    roundRectPath(ctx, barX, barTop + barH - h1, barW, h1, 4);
    ctx.fill();
    ctx.fillStyle = BLUE;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`实测`, barX + barW / 2, barTop + barH + 16);
    ctx.fillText(`${a_moon.toExponential(3)}`, barX + barW / 2, barTop + barH - h1 - 6);

    const h2 = (a_theory / maxA) * barH;
    ctx.fillStyle = GREEN;
    roundRectPath(ctx, barX + barW + 20, barTop + barH - h2, barW, h2, 4);
    ctx.fill();
    ctx.fillStyle = GREEN;
    ctx.fillText(`理论`, barX + barW + 20 + barW / 2, barTop + barH + 16);
    ctx.fillText(`${a_theory.toExponential(3)}`, barX + barW + 20 + barW / 2, barTop + barH - h2 - 6);

    const error = (Math.abs(a_moon - a_theory) / a_theory) * 100;
    ctx.fillStyle = error < 5 ? GREEN : RED;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
        `误差: ${error.toFixed(1)}%  ${error < 5 ? '✓ 验证通过' : '✗ 偏差较大'}`,
        barX + barW + 10,
        barTop + barH + 45
    );

    drawHud(ctx, isDark, [
        { label: 'a月', value: `${a_moon.toExponential(3)} m/s²` },
        { label: 'g/3600', value: `${a_theory.toExponential(3)} m/s²` },
        { label: 'R/r', value: `${(R_earth / r_moon).toExponential(3)}` },
        { label: 'error', value: `${error.toFixed(1)}%` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `a月=4π²r/T²=${a_moon.toExponential(3)}  g(R/r)²=${a_theory.toExponential(3)}  验证平方反比律`,
        isDark
    );
}

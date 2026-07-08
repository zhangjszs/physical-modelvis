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

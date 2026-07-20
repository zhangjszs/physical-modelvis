/**
 * 力学场景渲染模块 — 第一章 运动的描述 / 第二章 匀变速直线运动
 *
 * 场景列表：
 *   - drawFreeFallScene
 *   - drawGalileoInclineScene
 *   - drawReactionTimeScene
 *   - drawTickerTimerScene
 *   - drawCenterOfGravityScene
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
    drawBlock,
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

    drawTitle(ctx, '自由落体: h = 1/2 gt^2', width, isDark);
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

    drawTitle(ctx, '伽利略斜面实验: s = 1/2 at^2', width, isDark);
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

    drawTitle(ctx, '反应时间测量: t = sqrt(2h/g)', width, isDark);
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

    drawTitle(ctx, '打点计时器: 相等时间间隔记录位置', width, isDark);
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

export function drawCenterOfGravityScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    const shape = Math.round(params['shapeType'] ?? 0);
    const cx = width * 0.52;
    const cy = height * 0.48;

    drawTitle(ctx, '悬挂法确定重心', width, isDark);
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

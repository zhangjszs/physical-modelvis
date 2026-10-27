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
import { G_ACCELERATION } from './constants';
import { getThemeTokens } from '../utils/themeTokens';
import { woodTexture } from './textureFactory';
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

/**
 * 自由落体板书读数 — **单一真源: 引擎轨迹** (#159 逐节审计)
 *
 * 引擎的 `uniform-accelerated` 模型**不做地面约束**: 物体落地后轨迹继续按
 * 抛物线外推到地面以下 (h₀=20m, duration=3s → y 最低到 −24.1m)。
 * 板书若直接读 `h₀ − y` 与 `|v_y|`, 会显示 s = 44.10 m / v = 29.40 m/s ——
 * 那是「穿过地面继续下落」的外推值, 与真实落地过程矛盾 (问题一·物理)。
 *
 * 本函数把读数夹到「已落地」状态: 位移上限 h₀, 速率上限落地冲击速度 √(2gh₀),
 * 时钟停在落地时刻。渲染层与契约测试共用这一份口径。
 */
export interface FreeFallReadouts {
    /** 当前物理时刻 (落地后停在落地时刻) */
    t: number;
    /** 下落距离 (≤ h₀) */
    s: number;
    /** 速率 (≤ 落地冲击速度) */
    v: number;
    /** 落地时刻 */
    tImpact: number;
    /** 是否已落地 */
    landed: boolean;
    h0: number;
    g: number;
}

export function freeFallReadouts(
    params: Record<string, number>,
    result: SimulationResult | null,
    currentTime: number
): FreeFallReadouts {
    const h0 = Math.max(0, params['height'] ?? 20);
    const g = Math.max(1e-6, params['g'] ?? G_ACCELERATION);
    const tImpact = Math.sqrt((2 * h0) / g);
    const landed = currentTime >= tImpact;
    const frame = getFrame(result, currentTime);
    const sRaw = frame ? Math.max(0, h0 - frame.position.y) : 0.5 * g * currentTime * currentTime;
    const vRaw = frame ? Math.abs(frame.velocity.y) : g * currentTime;
    return {
        t: landed ? tImpact : currentTime,
        s: Math.min(h0, Math.max(0, sRaw)),
        v: Math.min(Math.sqrt(2 * g * h0), vRaw),
        tImpact,
        landed,
        h0,
        g
    };
}

/**
 * 竖直运动板书读数 — **单一真源: 引擎轨迹** (#159 逐节审计)
 *
 * 关键量 (释放高度 h₀ / 最高点 H_max / 上升时间 t_up / 落地时刻 t_ground)
 * 全部从引擎轨迹读出; 渲染层与契约测试共用这一份口径。
 */
export interface VerticalMotionBoardReadouts {
    /** 当前物理时刻 (落地后停在落地时刻) */
    t: number;
    /** 当前离地高度 (落地后为 0) */
    y: number;
    /** 竖直速度 (向上为正) */
    v: number;
    h0: number;
    v0y: number;
    g: number;
    /** 最高点离地高度 */
    hMax: number;
    /** 相对释放点的上升高度 */
    deltaH: number;
    /** 到达最高点的时刻 */
    tUp: number;
    /** 落地时刻 */
    tGround: number;
    landed: boolean;
}

export function verticalMotionBoardReadouts(
    params: Record<string, number>,
    result: SimulationResult | null,
    currentTime: number
): VerticalMotionBoardReadouts {
    const h0 = Math.max(0, params['height'] ?? 20);
    const v0y = params['v0y'] ?? 0;
    const g = Math.max(1e-6, params['g'] ?? G_ACCELERATION);

    const traj = result?.trajectories?.[0] ?? [];
    let hMax = h0;
    let tUp = 0;
    let groundT: number | null = null;
    for (const p of traj) {
        if (p.position.y > hMax) {
            hMax = p.position.y;
            tUp = p.t;
        }
        if (groundT === null && p.t > 0 && p.position.y <= 0) groundT = p.t;
    }
    const tGround = groundT ?? (tUp > 0 ? tUp + Math.sqrt((2 * hMax) / g) : Math.sqrt((2 * h0) / g));

    const frame = getFrame(result, currentTime);
    const yRaw = frame ? frame.position.y : h0 + v0y * currentTime - 0.5 * g * currentTime * currentTime;
    const vRaw = frame ? frame.velocity.y : v0y - g * currentTime;
    const landed = currentTime >= tGround;
    const vImpact = Math.sqrt(Math.max(0, 2 * g * hMax));

    return {
        t: landed ? tGround : currentTime,
        y: landed ? 0 : Math.max(0, yRaw),
        v: landed ? -vImpact : vRaw,
        h0,
        v0y,
        g,
        hMax,
        deltaH: Math.max(0, hMax - h0),
        tUp,
        tGround,
        landed
    };
}

export function drawFreeFallScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const read = freeFallReadouts(params, simulationResult, currentTime);
    const { h0, g, tShown, fallen, v, tImpact, landed } = {
        h0: read.h0,
        g: read.g,
        tShown: read.t,
        fallen: read.s,
        v: read.v,
        tImpact: read.tImpact,
        landed: read.landed
    };

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
        { label: 't', value: `${tShown.toFixed(3)} s` },
        { label: 's', value: `${fallen.toFixed(2)} m` },
        { label: 'v', value: `${v.toFixed(2)} m/s` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `h0=${h0}m  g=${g.toFixed(2)}m/s^2  s=1/2gt^2=${fallen.toFixed(2)}m` +
            (landed ? `  [已落地 t=${tImpact.toFixed(2)}s]` : ''),
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

/**
 * 竖直上抛 / 自由落体 专属板书 (#159 逐节审计 · 高中核心 24 节)
 *
 * 背景: `uniform-accelerated` 场景原先落到 SimulationCanvas 的**通用默认渲染器**,
 * 只有坐标轴/网格/速度矢量, 看不出「上升 → 最高点 → 回落」这条核心过程;
 * 且默认 v₀y = 0 时与「自由落体」场景完全同形, 场景名承诺的上抛规律在默认画面里根本看不到。
 *
 * 本板书给出:
 *   - 竖直轨道 + 地面 + 释放点/最高点/落点三处关键位置标注;
 *   - 最高点 H_max、上升时间 t_up、落地时刻 t_ground (由引擎轨迹读出, 非本地公式);
 *   - 右侧 v-t 图 (直线过零 = 最高点), 让「速率先减后增」可视化;
 *   - 落地后读数冻结在落地值 (引擎轨迹在地面以下的外推值不得进入板书)。
 */
export function drawVerticalMotionScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const read = verticalMotionBoardReadouts(params, simulationResult, currentTime);
    const { h0, v0y, g, hMax, tUp, tGround, landed, y, v } = read;
    const tShown = read.t;

    // —— 布局: 左 68% 为竖直轨道, 右 32% 为 v-t 图 ——
    const plotRight = width * 0.66;
    const plotLeft = width * 0.08;
    const groundY = height - 74;
    const topY = 60;
    const spanY = Math.max(1, hMax - 0);
    const scale = (groundY - topY) / spanY;
    const trackX = (plotLeft + plotRight) / 2;
    const yPx = (meters: number) => groundY - meters * scale;

    drawTitle(ctx, v0y > 0 ? '竖直上抛: v = v₀ − gt' : '自由落体: h = 1/2 gt^2', width, isDark);

    // 地面
    drawGround(ctx, groundY, width, isDark);

    // 竖直标尺 (与轨道同 x, 标注米数)
    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(trackX - 54, topY);
    ctx.lineTo(trackX - 54, groundY);
    ctx.stroke();
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = mutedColor(isDark);
    const rulerStep = spanY > 40 ? 10 : spanY > 12 ? 5 : 2;
    for (let m = 0; m <= hMax + 1e-6; m += rulerStep) {
        const py = yPx(m);
        ctx.beginPath();
        ctx.moveTo(trackX - 54, py);
        ctx.lineTo(trackX - 45, py);
        ctx.stroke();
        ctx.fillText(`${m.toFixed(0)}m`, trackX - 58, py + 3);
    }

    // 释放点 / 最高点 / 落点 标记
    const marker = (py: number, label: string, color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(trackX - 54, py);
        ctx.lineTo(trackX + 54, py);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, trackX + 58, py + 4);
    };
    marker(yPx(h0), `释放点 h₀=${h0.toFixed(1)}m`, BLUE);
    if (hMax > h0 + 1e-6) marker(yPx(hMax), `最高点 H=${hMax.toFixed(2)}m`, GREEN);

    // 物体
    const ballY = yPx(y);
    const grad = ctx.createRadialGradient(trackX - 5, ballY - 6, 2, trackX, ballY, 14);
    grad.addColorStop(0, '#fef3c7');
    grad.addColorStop(0.5, ORANGE);
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(trackX, ballY, 14, 0, Math.PI * 2);
    ctx.fill();

    // 速度矢量 (向上为正)
    const vLen = Math.max(-70, Math.min(70, v * 6));
    if (Math.abs(vLen) > 3) {
        drawArrow(ctx, trackX + 22, ballY, trackX + 22, ballY - vLen, v >= 0 ? GREEN : RED, 'v');
    }
    // 重力矢量
    drawArrow(ctx, trackX - 22, ballY - 14, trackX - 22, ballY + 40, RED, 'g');

    // —— 右侧 v-t 图 (直线, 过零 = 最高点) ——
    const vtLeft = width * 0.72;
    const vtRight = width * 0.94;
    const vtTop = topY + 10;
    const vtBottom = height - 110;
    const tMax = Math.max(0.5, Math.min(tGround, durationOf(simulationResult) || tGround));
    const vMaxAbs = Math.max(1, Math.abs(v0y), Math.sqrt(Math.max(0, 2 * g * hMax)));
    const vtZero = (vtTop + vtBottom) / 2;
    // 屏幕 y 向下增长 → 正速度要画在上方, 必须取负号
    const vScale = (vtBottom - vtTop) / 2 / vMaxAbs;
    const vToPy = (v: number) => vtZero - v * vScale;

    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(vtLeft, vtTop);
    ctx.lineTo(vtLeft, vtBottom);
    ctx.moveTo(vtLeft, vtBottom);
    ctx.lineTo(vtRight, vtBottom);
    ctx.stroke();
    // 零线
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.5)' : 'rgba(100,116,139,0.45)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(vtLeft, vtZero);
    ctx.lineTo(vtRight, vtZero);
    ctx.stroke();
    ctx.setLineDash([]);

    // v-t 直线 (引擎速度公式 v = v₀ − gt, 斜率即 −g)
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(vtLeft, vToPy(v0y));
    ctx.lineTo(vtLeft + (vtRight - vtLeft) * Math.min(1, tGround / tMax), vToPy(v0y - g * tGround));
    ctx.stroke();
    // 当前点
    const curT = Math.min(tShown, tMax);
    const curV = v0y - g * curT;
    ctx.fillStyle = ORANGE;
    ctx.beginPath();
    ctx.arc(vtLeft + (vtRight - vtLeft) * (curT / tMax), vToPy(curV), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('v–t 图 (斜率 −g)', (vtLeft + vtRight) / 2, vtBottom + 16);
    ctx.textAlign = 'right';
    ctx.fillText(`${vMaxAbs.toFixed(0)} m/s`, vtLeft - 3, vtTop + 8);
    ctx.textAlign = 'left';
    ctx.fillText(`t=${tMax.toFixed(1)}s`, vtRight, vtBottom + 16);

    drawHud(ctx, isDark, [
        { label: 't', value: `${tShown.toFixed(2)} s` },
        { label: 'y', value: `${y.toFixed(2)} m` },
        { label: 'v', value: `${v.toFixed(2)} m/s` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `h₀=${h0.toFixed(1)}m  v₀y=${v0y.toFixed(1)}m/s  g=${g.toFixed(2)}m/s²  ` +
            `t_up=${tUp.toFixed(2)}s  H_max=${hMax.toFixed(2)}m  t_ground=${tGround.toFixed(2)}s` +
            (landed ? '  [已落地]' : ''),
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

/** 引擎结果的总时长 (秒); 无结果返回 0 */
function durationOf(result: SimulationResult | null): number {
    const meta = result?.meta as { duration?: number } | undefined;
    if (meta && typeof meta.duration === 'number' && meta.duration > 0) return meta.duration;
    const traj = result?.trajectories?.[0] ?? [];
    return traj.length ? traj[traj.length - 1]!.t : 0;
}

/**
 * 抛体运动板书读数 — **单一真源: 引擎轨迹 + maxValues** (#159 逐节审计)
 */
export interface ProjectileBoardReadouts {
    /** 当前水平位移 (m) */
    x: number;
    /** 当前离地高度 (m) */
    y: number;
    /** 水平速度 (恒定) */
    vx: number;
    /** 竖直速度 */
    vy: number;
    /** 速率 */
    v: number;
    /** 最高点离地高度 */
    apexHeight: number;
    /** 射程 */
    range: number;
    /** 飞行时间 */
    flightTime: number;
    /** 发射角 (°) */
    thetaDeg: number;
}

export function projectileBoardReadouts(
    params: Record<string, number>,
    result: SimulationResult | null,
    currentTime: number
): ProjectileBoardReadouts {
    const mv = result?.diagnostics?.maxValues as Record<string, number> | undefined;
    const frame = getFrame(result, currentTime);
    const x = frame ? frame.position.x : 0;
    const y = frame ? frame.position.y : 0;
    const vx = frame ? frame.velocity.x : 0;
    const vy = frame ? frame.velocity.y : 0;
    return {
        x,
        y,
        vx,
        vy,
        v: Math.hypot(vx, vy),
        apexHeight: typeof mv?.['apexHeight'] === 'number' ? mv['apexHeight'] : y,
        range: typeof mv?.['range'] === 'number' ? mv['range'] : x,
        flightTime: typeof mv?.['flightTime'] === 'number' ? mv['flightTime'] : currentTime,
        thetaDeg: typeof mv?.['thetaDeg'] === 'number' ? mv['thetaDeg'] : (params['angle'] ?? 45)
    };
}

/**
 * 抛体运动专属板书 (#159 逐节审计 · 高中核心 24 节)
 *
 * 背景: `projectile` 场景原先落到 SimulationCanvas 的**通用默认渲染器**,
 * 只有坐标轴/网格/速度矢量, 看不出「水平匀速 + 竖直匀加速 = 抛物线」这条核心分解,
 * 也没有最高点/射程标注 —— 而《高中核心》这节课的教学目标恰恰是「平抛运动的分解规律」。
 *
 * 本板书给出:
 *   - 引擎抛物线 + 发射点/最高点/落点三处标注 (最高点水平虚线体现「同时到达」);
 *   - 最高点处画出水平速度分量 (恒定) 与竖直分量 (此处为零);
 *   - HUD 读 x / y / vx / vy, 信息条读 H_max / R / t_flight (全部来自引擎)。
 */
export function drawProjectileScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const read = projectileBoardReadouts(params, simulationResult, currentTime);

    const traj = simulationResult?.trajectories?.[0] ?? [];
    // —— 视野: 包住整条轨迹 (含发射高度) ——
    let maxX = Math.max(1, read.range);
    let maxY = Math.max(1, read.apexHeight);
    for (const p of traj) {
        maxX = Math.max(maxX, p.position.x);
        maxY = Math.max(maxY, p.position.y);
    }
    const left = width * 0.1;
    const right = width * 0.9;
    const bottom = height - 78;
    const top = 64;
    const scale = Math.min((right - left) / Math.max(0.5, maxX), (bottom - top) / Math.max(0.5, maxY));
    const ox = left;
    const oy = bottom;
    const px = (m: number) => ox + m * scale;
    const py = (m: number) => oy - m * scale;

    drawTitle(ctx, '抛体运动: 水平匀速 + 竖直匀加速', width, isDark);
    drawGround(ctx, oy, width, isDark);

    // —— 水平刻度 (每 10 m 一格, 与世界尺度同源) ——
    ctx.strokeStyle = mutedColor(isDark);
    ctx.fillStyle = mutedColor(isDark);
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const gridStep = maxX > 60 ? 20 : maxX > 24 ? 10 : 5;
    for (let m = 0; m <= maxX + 1e-6; m += gridStep) {
        ctx.beginPath();
        ctx.moveTo(px(m), oy);
        ctx.lineTo(px(m), oy + 5);
        ctx.stroke();
        ctx.fillText(`${m.toFixed(0)}`, px(m), oy + 16);
    }
    ctx.textAlign = 'right';
    ctx.fillText('x / m', right, oy + 16);

    // —— 竖直刻度 ——
    ctx.textAlign = 'left';
    const vGridStep = maxY > 40 ? 10 : maxY > 12 ? 5 : 2;
    for (let m = 0; m <= maxY + 1e-6; m += vGridStep) {
        ctx.beginPath();
        ctx.moveTo(ox - 5, py(m));
        ctx.lineTo(ox, py(m));
        ctx.stroke();
        ctx.fillText(`${m.toFixed(0)}`, ox + 4, py(m) - 3);
    }

    // —— 引擎抛物线 ——
    if (traj.length > 1) {
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        traj.forEach((p, i) => {
            const X = px(p.position.x);
            const Y = py(p.position.y);
            if (i === 0) ctx.moveTo(X, Y);
            else ctx.lineTo(X, Y);
        });
        ctx.stroke();
    }

    // —— 最高点水平虚线 (体现「水平位移与竖直位移同时到达」) ——
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = isDark ? 'rgba(248,113,113,0.6)' : 'rgba(239,68,68,0.5)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(px(0), py(read.apexHeight));
    ctx.lineTo(px(Math.min(maxX, read.range)), py(read.apexHeight));
    ctx.stroke();
    ctx.setLineDash([]);

    // —— 最高点标记 ——
    const engineApex = traj.reduce((best, p) => (p.position.y > (best?.position.y ?? -Infinity) ? p : best), traj[0]);
    const ax = engineApex ? px(engineApex.position.x) : px(0);
    const ay = py(read.apexHeight);
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(ax, ay, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    // 标牌放在最高点线**上方**, 避免与小球/速度箭头叠字
    ctx.fillText(`最高点 H=${read.apexHeight.toFixed(1)}m`, ax + 10, ay - 14);

    // —— 落点标记 ——
    ctx.fillStyle = ORANGE;
    ctx.beginPath();
    ctx.arc(px(read.range), oy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(`落点 R=${read.range.toFixed(1)}m`, px(read.range) - 10, oy - 10);

    // —— 当前物体 ——
    const bx = px(read.x);
    const by = py(read.y);
    const grad = ctx.createRadialGradient(bx - 5, by - 6, 2, bx, by, 13);
    grad.addColorStop(0, '#fef3c7');
    grad.addColorStop(0.5, ORANGE);
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, 13, 0, Math.PI * 2);
    ctx.fill();

    // —— 速度分解 (水平分量恒定 / 竖直分量随时间变) ——
    // 两分量共用同一比例尺, 合成矢量长度固定 → 箭头不会随速度大小暴涨出画面
    const vMag = Math.max(1e-6, Math.hypot(read.vx, read.vy));
    const vScale = 90 / vMag;
    drawArrow(ctx, bx, by - 26, bx + read.vx * vScale, by - 26, GREEN, 'vx');
    drawArrow(ctx, bx, by - 26, bx, by - 26 - read.vy * vScale, RED, 'vy');

    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(2)} s` },
        { label: 'x', value: `${read.x.toFixed(2)} m` },
        { label: 'y', value: `${read.y.toFixed(2)} m` },
        { label: 'vx', value: `${read.vx.toFixed(2)} m/s` },
        { label: 'vy', value: `${read.vy.toFixed(2)} m/s` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `v₀=${(params['v0'] ?? 20).toFixed(1)}m/s  θ=${read.thetaDeg.toFixed(0)}°  h₀=${(params['h0'] ?? 2).toFixed(1)}m  ` +
            `H_max=${read.apexHeight.toFixed(2)}m  R=${read.range.toFixed(2)}m  t_flight=${read.flightTime.toFixed(2)}s`,
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

/**
 * 伽利略斜面读数 — **单一真源: 引擎轨迹** (#159 逐节审计)
 *
 * 旧板书用 `clamp(frame.position.x, 0, L)` 当作「沿斜面位移 s」:
 *   - 引擎坐标里 x = s·cosθ, θ=30° 时只读到真值的 86.6%;
 *   - clamp 到 L 之后, 水平外推段 (默认时长 76%) 全部显示同一个数 → 小球冻结;
 *   - 对接斜面/水平面两段根本没有画。
 * 现在沿斜面位移由引擎位置在斜面方向上的**投影**得到 (引擎 y 向下为正,
 * 下滑方向 (cosθ, sinθ) → s = x·cosθ + y·sinθ), 并补齐三段装置。
 */
export interface GalileoInclineReadouts {
    mode: 'single' | 'docked' | 'horizontal' | 'all';
    thetaDeg: number;
    inclineLength: number;
    gravity: number;
    /** 沿斜面加速度 a = g·sinθ */
    acceleration: number;
    /** 斜面竖直落差 h = L·sinθ */
    heightDrop: number;
    /** 滑到底端时间 t_end = √(2L/a) */
    tEnd: number;
    /** 底端速度 v_end = √(2gh) */
    vEnd: number;
    /** 当前沿斜面位移 (m) */
    s: number;
    /** 当前沿斜面速度 (m/s) */
    v: number;
    source: 'engine' | 'fallback';
}

export function galileoInclineReadouts(
    params: Record<string, number>,
    result: SimulationResult | null,
    currentTime: number
): GalileoInclineReadouts {
    const thetaDeg = params['angleDeg'] ?? 30;
    const inclineLength = params['inclineLength'] ?? 2;
    const gravity = params['gravity'] ?? G_ACCELERATION;
    const modeIdx = Math.round(params['mode'] ?? 3);
    const mode = (['single', 'docked', 'horizontal', 'all'] as const)[modeIdx] ?? 'all';
    const theta = (thetaDeg * Math.PI) / 180;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const acceleration = gravity * sinT;
    const heightDrop = inclineLength * sinT;
    const tEnd = acceleration > 0 ? Math.sqrt((2 * inclineLength) / acceleration) : Number.POSITIVE_INFINITY;
    const vEnd = Math.sqrt(2 * gravity * heightDrop);

    const frame = getFrame(result, currentTime);
    if (frame) {
        // 引擎 y 向下为正, 下滑方向 (cosθ, sinθ) → 沿斜面投影
        const s = frame.position.x * cosT + frame.position.y * sinT;
        const v = frame.velocity.x * cosT + frame.velocity.y * sinT;
        return {
            mode,
            thetaDeg,
            inclineLength,
            gravity,
            acceleration,
            heightDrop,
            tEnd,
            vEnd,
            s,
            v,
            source: 'engine'
        };
    }
    const s = Math.min(inclineLength, 0.5 * acceleration * currentTime * currentTime);
    return {
        mode,
        thetaDeg,
        inclineLength,
        gravity,
        acceleration,
        heightDrop,
        tEnd,
        vEnd,
        s,
        v: acceleration * currentTime,
        source: 'fallback'
    };
}

/**
 * 斜面运动读数 — **单一真源: 引擎轨迹** (#159 逐节审计)
 *
 * 沿斜面位移 s = x·cosθ − y·sinθ (引擎坐标 y 向上为正, 下滑方向 (cosθ, −sinθ)),
 * 不得再用笛卡尔 x 分量或写死的比例 (旧 2D 滑块被钉在斜面 45% 处)。
 */
export interface InclinedPlaneReadouts {
    thetaDeg: number;
    friction: number;
    mass: number;
    inclineLength: number;
    /** 沿斜面加速度 a = g(sinθ − μcosθ) */
    acceleration: number;
    /** 当前沿斜面位移 (m) */
    s: number;
    /** 当前沿斜面速度 (m/s) */
    v: number;
    /** 是否已滑到底端 */
    atBottom: boolean;
    source: 'engine' | 'fallback';
}

export function inclinePlaneReadouts(
    params: Record<string, number>,
    result: SimulationResult | null,
    currentTime: number
): InclinedPlaneReadouts {
    const thetaDeg = params['theta'] ?? 30;
    const friction = params['mu'] ?? 0;
    const mass = params['m'] ?? 1;
    const inclineLength = params['inclineLength'] ?? 6;
    const theta = (thetaDeg * Math.PI) / 180;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const acceleration = G_ACCELERATION * (sinT - friction * cosT);

    const frame = getFrame(result, currentTime);
    if (frame) {
        const startY = inclineLength * sinT;
        const s = frame.position.x * cosT - (frame.position.y - startY) * sinT;
        const v = frame.velocity.x * cosT - frame.velocity.y * sinT;
        return {
            thetaDeg,
            friction,
            mass,
            inclineLength,
            acceleration,
            s,
            v,
            atBottom: s >= inclineLength - 1e-6,
            source: 'engine'
        };
    }
    return {
        thetaDeg,
        friction,
        mass,
        inclineLength,
        acceleration,
        s: Math.min(inclineLength, 0.5 * acceleration * currentTime * currentTime),
        v: acceleration * currentTime,
        atBottom: false,
        source: 'fallback'
    };
}

/**
 * 伽利略斜面理想实验板书 — 斜面 / 对接斜面 / 水平面外推 (#159 逐节审计)
 *
 * 旧实现的三个硬伤:
 *   1. 沿斜面位移用 `frame.position.x` (水平分量) 算 —— 引擎坐标里 x = s·cosθ,
 *      于是 s 永远读小 (θ=30° 时只有真值的 86.6%);
 *   2. `clamp(…, 0, length)` 把位移钳在斜面长度内, 水平外推段 (76% 的时长)
 *      全部显示成同一个值, 小球「冻结」;
 *   3. 只画一条斜面, 对接斜面与水平面两段外推**完全不画** —— 伽利略实验的
 *      三段推理链在 2D 上看不到。
 *
 * 现在整屏按引擎坐标 (x 向右, y 向下) 等比映射: 装置几何、轨迹、小球位置
 * 共用同一套换算, 三段装置按 mode 呈现。
 */
export function drawGalileoInclineScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;

    const read = galileoInclineReadouts(params, simulationResult, currentTime);
    const angleDeg = read.thetaDeg;
    const L = read.inclineLength;
    const mode = read.mode;
    const theta = (angleDeg * Math.PI) / 180;
    const cosT = Math.cos(theta);
    const a = read.acceleration;
    const h = read.heightDrop; // 斜面竖直落差 (引擎坐标 y 向下为正)

    const traj = simulationResult?.trajectories?.[0] ?? [];
    const frame = getFrame(simulationResult, currentTime);

    // —— 屏幕映射: 引擎坐标 (x 右, y 下) 等比缩放, 装置与轨迹同源 ——
    let minX = 0;
    let maxX = L * cosT;
    let minY = 0;
    let maxY = h;
    for (const p of traj) {
        minX = Math.min(minX, p.position.x);
        maxX = Math.max(maxX, p.position.x);
        minY = Math.min(minY, p.position.y);
        maxY = Math.max(maxY, p.position.y);
    }
    const marginX = 70;
    const marginTop = 96;
    const marginBottom = 120;
    const maxW = Math.max(80, width - marginX * 2);
    const maxH = Math.max(80, height - marginTop - marginBottom);
    const scale = Math.min(maxW / Math.max(0.2, maxX - minX), maxH / Math.max(0.2, maxY - minY));
    const originX = marginX - minX * scale;
    const originY = marginTop - minY * scale;
    const sx = (x: number) => originX + x * scale;
    const sy = (y: number) => originY + y * scale;

    drawTitle(ctx, `伽利略理想斜面: a = g·sinθ = ${a.toFixed(2)} m/s²`, width, isDark);

    // —— 装置: 左侧下滑斜面 ——
    const topPt = { x: sx(0), y: sy(0) };
    const valleyPt = { x: sx(L * cosT), y: sy(h) };
    ctx.strokeStyle = isDark ? '#60a5fa' : '#2563eb';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(topPt.x, topPt.y);
    ctx.lineTo(valleyPt.x, valleyPt.y);
    ctx.stroke();

    // —— 装置: 右侧对接斜面 ('docked' 模式) ——
    if (mode === 'docked') {
        const dockTop = { x: sx(2 * L * cosT), y: sy(0) };
        ctx.strokeStyle = isDark ? '#34d399' : '#059669';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(valleyPt.x, valleyPt.y);
        ctx.lineTo(dockTop.x, dockTop.y);
        ctx.stroke();
        ctx.fillStyle = isDark ? '#34d399' : '#059669';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('对接斜面', (valleyPt.x + dockTop.x) / 2, (valleyPt.y + dockTop.y) / 2 - 12);
    }

    // —— 装置: 谷底水平面 ('horizontal' / 'all' 模式) ——
    if (mode === 'horizontal' || mode === 'all') {
        const planeEnd = { x: sx(maxX), y: sy(h) };
        ctx.strokeStyle = isDark ? '#a78bfa' : '#7c3aed';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(valleyPt.x, valleyPt.y);
        ctx.lineTo(planeEnd.x, planeEnd.y);
        ctx.stroke();
        ctx.fillStyle = isDark ? '#a78bfa' : '#7c3aed';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('水平面 (对接斜面放平的极限)', (valleyPt.x + planeEnd.x) / 2, valleyPt.y + 22);
    }

    // —— 等高参考虚线 (原起点高度) ——
    ctx.strokeStyle = isDark ? '#f59e0b' : '#d97706';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(sx(minX), topPt.y);
    ctx.lineTo(sx(maxX), topPt.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = isDark ? '#fbbf24' : '#b45309';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('等高参考线 (h = L·sinθ)', sx(minX) + 6, topPt.y - 8);

    // —— 轨迹 ——
    if (traj.length > 1) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        traj.forEach((p, i) => {
            const px = sx(p.position.x);
            const py = sy(p.position.y);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // —— 当前小球 (引擎位置) ——
    const cur = frame ? frame.position : { x: 0, y: 0 };
    const ballX = sx(cur.x);
    const ballY = sy(cur.y);
    const grad = ctx.createRadialGradient(ballX - 4, ballY - 5, 2, ballX, ballY, 12);
    grad.addColorStop(0, '#fef3c7');
    grad.addColorStop(0.5, '#f59e0b');
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ballX, ballY, 12, 0, Math.PI * 2);
    ctx.fill();

    // —— 沿斜面位移 (引擎投影, 不是水平分量) ——
    const s = read.s;
    const v = read.v;

    // —— 标注 ——
    ctx.fillStyle = isDark ? '#60a5fa' : '#2563eb';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`θ=${angleDeg}°`, (topPt.x + valleyPt.x) / 2 - 18, (topPt.y + valleyPt.y) / 2 + 18);
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.fillText(`L=${L.toFixed(1)}m`, (topPt.x + valleyPt.x) / 2 + 26, (topPt.y + valleyPt.y) / 2 + 4);

    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(3)} s` },
        { label: 's', value: `${s.toFixed(2)} m` },
        { label: 'v', value: `${v.toFixed(2)} m/s` },
        { label: 'a', value: `${a.toFixed(2)} m/s²` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `模式: ${mode}  θ=${angleDeg}°  L=${L.toFixed(1)}m  a=g·sinθ=${a.toFixed(2)}m/s²  ` +
            `h=L·sinθ=${h.toFixed(2)}m  t_end=√(2L/a)=${Math.sqrt((2 * L) / a).toFixed(3)}s`,
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

/**
 * 斜面运动板书 — 斜面 + 滑块 (位置/轨迹全部来自引擎) (#159 逐节审计)
 *
 * 旧实现把 2D 斜面画成**静态装饰件**: 木质楔形背景里的滑块被写死在斜面
 * 45% 处 (`const t = 0.45`), 而真实物体又由通用轨迹通道按世界坐标绘制 ——
 * 同一个画面出现「两个滑块、两个坐标系」, 且装饰滑块永远不动。
 *
 * 现在改为整屏自定义渲染: 楔形背景、滑块、轨迹、角度标注共用**同一套**
 * 屏幕映射 (斜面长度 L 与倾角 θ 决定), 滑块位置读引擎轨迹。
 */
export function drawInclinedPlaneScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;

    const read = inclinePlaneReadouts(params, simulationResult, currentTime);
    const thetaDeg = read.thetaDeg;
    const mu = read.friction;
    const m = read.mass;
    const L = read.inclineLength;
    const a = read.acceleration;
    const theta = (thetaDeg * Math.PI) / 180;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    // —— 屏幕映射: 斜面长度 L 与倾角 θ 唯一决定楔形与滑块位置 ——
    const scale = Math.min((width * 0.66) / Math.max(0.05, L * cosT), (height * 0.55) / Math.max(0.05, L * sinT));
    const rampLen = L * scale;
    const bottomRight = { x: width * 0.84, y: height * 0.8 };
    const bottomLeft = { x: bottomRight.x - rampLen * cosT, y: bottomRight.y };
    const topLeft = { x: bottomLeft.x, y: bottomRight.y - rampLen * sinT };
    /** 引擎沿斜面位移 s (m) → 屏幕点 */
    const screenOfS = (s: number) => ({
        x: topLeft.x + s * cosT * scale,
        y: topLeft.y + s * sinT * scale
    });

    drawTitle(ctx, `斜面运动: a = g(sinθ − μcosθ) = ${a.toFixed(2)} m/s²`, width, isDark);

    // —— 楔形 (木质斜面板) ——
    const tokens = getThemeTokens(isDark);
    ctx.fillStyle = tokens.canvasShadowSoft;
    ctx.beginPath();
    ctx.moveTo(topLeft.x + 5, topLeft.y + 5);
    ctx.lineTo(bottomLeft.x + 5, bottomLeft.y + 5);
    ctx.lineTo(bottomRight.x + 5, bottomRight.y + 5);
    ctx.closePath();
    ctx.fill();

    const wedgeW = bottomRight.x - bottomLeft.x;
    const wedgeH = bottomRight.y - topLeft.y;
    const woodTex = woodTexture(Math.max(64, wedgeW), Math.max(64, wedgeH), tokens.canvasWood, isDark);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(woodTex, bottomLeft.x, topLeft.y, wedgeW, wedgeH);
    ctx.restore();

    ctx.strokeStyle = tokens.canvasWedgeEdge;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = tokens.canvasWedgeHatch;
    ctx.lineWidth = 1;
    for (let i = 0; i < rampLen * sinT; i += 7) {
        ctx.beginPath();
        ctx.moveTo(bottomLeft.x - 8, topLeft.y + i);
        ctx.lineTo(bottomLeft.x, topLeft.y + i + 7);
        ctx.stroke();
    }

    // —— 引擎轨迹 (沿斜面) ——
    const startY = L * sinT;
    const alongOf = (p: { x: number; y: number }) => p.x * cosT - (p.y - startY) * sinT;
    const traj = simulationResult?.trajectories?.[0] ?? [];
    if (traj.length > 1) {
        ctx.strokeStyle = ORANGE;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        traj.forEach((p, i) => {
            const pt = screenOfS(alongOf(p.position));
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // —— 当前滑块 (读引擎) ——
    const s = read.s;
    const vAlong = read.v;
    const pos = screenOfS(s);
    const blockW = 38;
    const blockH = 24;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(theta);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    roundRectPath(ctx, -blockW / 2 + 3, -blockH + 3, blockW, blockH, 4);
    ctx.fill();
    const bGrad = ctx.createLinearGradient(-blockW / 2, -blockH, blockW / 2, 0);
    bGrad.addColorStop(0, '#60a5fa');
    bGrad.addColorStop(0.5, '#3b82f6');
    bGrad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = bGrad;
    roundRectPath(ctx, -blockW / 2, -blockH, blockW, blockH, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    roundRectPath(ctx, -blockW / 2 + 3, -blockH + 3, blockW - 6, blockH * 0.35, 3);
    ctx.fill();
    ctx.restore();

    // —— 角度标注 (底端) ——
    const arcR = 45;
    const startAngle = Math.PI;
    const slopeAngleFromBR = Math.atan2(topLeft.y - bottomRight.y, topLeft.x - bottomRight.x);
    const minorSweep = (((slopeAngleFromBR - startAngle) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const midAngle = startAngle + minorSweep / 2;
    ctx.fillStyle = tokens.canvasAngleFill;
    ctx.beginPath();
    ctx.moveTo(bottomRight.x, bottomRight.y);
    ctx.arc(bottomRight.x, bottomRight.y, arcR, startAngle, slopeAngleFromBR, false);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = tokens.canvasAngleStroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bottomRight.x, bottomRight.y, arcR, startAngle, slopeAngleFromBR, false);
    ctx.stroke();
    ctx.fillStyle = tokens.canvasAngleStroke;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        `θ=${thetaDeg}°`,
        bottomRight.x + (arcR + 22) * Math.cos(midAngle),
        bottomRight.y + (arcR + 22) * Math.sin(midAngle)
    );
    ctx.textBaseline = 'alphabetic';

    // —— 斜面长度标注 ——
    ctx.fillStyle = tokens.readoutText;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
        `L = ${L.toFixed(1)} m`,
        (topLeft.x + bottomLeft.x) / 2 - sinT * 26,
        (topLeft.y + bottomLeft.y) / 2 + cosT * 26
    );
    ctx.fillText(`m=${m}kg`, pos.x + sinT * (blockH + 14), pos.y - cosT * (blockH + 14));

    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(2)} s` },
        { label: 's', value: `${s.toFixed(2)} m` },
        { label: 'v', value: `${vAlong.toFixed(2)} m/s` },
        { label: 'a', value: `${a.toFixed(2)} m/s²` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `θ=${thetaDeg}°  μ=${mu}  m=${m}kg  L=${L.toFixed(1)}m  a=g(sinθ−μcosθ)=${a.toFixed(2)}m/s²  ` +
            `s=${s.toFixed(2)}m  v=${vAlong.toFixed(2)}m/s`,
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

export function drawReactionTimeScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const targetDistance = params['distance'] ?? 0.2;
    const g = params['gravity'] ?? G_ACCELERATION;
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

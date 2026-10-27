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

export function drawGalileoInclineScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const angleDeg = params['angleDeg'] ?? 30;
    const length = params['inclineLength'] ?? 2;
    const g = params['gravity'] ?? G_ACCELERATION;
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

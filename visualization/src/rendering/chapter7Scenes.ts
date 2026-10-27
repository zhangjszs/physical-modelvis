/**
 * 力学场景渲染模块 — 第七章 机械能守恒定律
 *
 * 场景列表：
 *   - drawEnergyConservationScene
 *   - drawSimplePendulumScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import { G_ACCELERATION } from './constants';
import { measurePendulumPeriod } from './pendulumMetrics';
import {
    roundRectPath,
    mutedColor,
    clamp,
    drawTitle,
    drawHud,
    drawInfoBar,
    drawEmptyState,
    drawArrow,
    drawGround,
    getFrame,
    interpSeries,
    arrowHead,
    clearScene
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
const PURPLE = '#a855f7';

/**
 * 机械能守恒板书读数 — **单一真源: 引擎轨迹** (#159 逐节审计)
 *
 * 旧实现只把**位置**夹到地面 (`Math.max(0, y)`) 却**放任速度继续增长**
 * (`vy` 未夹), 于是物体「冻在地面」而动能一路涨到 432 J —— 同一块板上却写着
 * 「无摩擦 → 守恒」, 总能量柱从 E₀=98 J 涨到 432 J, 结论与读数自相矛盾。
 *
 * 现在: 场景把仿真时长截到**触地时刻**, 引擎轨迹本身就终止在地面,
 * 板书读到的 y/v/KE/PE/E 全部落在物理合法区间, E总 ≡ E₀。
 */
export interface EnergyConservationReadouts {
    /** 当前水平位移 (m) */
    x: number;
    /** 当前离地高度 (m) */
    h: number;
    /** 水平速度 (m/s) */
    vx: number;
    /** 竖直速度 (m/s) */
    vy: number;
    /** 速率 (m/s) */
    v: number;
    /** 动能 (J) */
    ke: number;
    /** 势能 (J) */
    pe: number;
    /** 机械能 (J) */
    total: number;
    /** 初始机械能 (J) */
    init: number;
    /** 触地时刻 (s) */
    tGround: number;
    /** 是否已落地 */
    landed: boolean;
}

export function energyConservationReadouts(
    params: Record<string, number>,
    result: SimulationResult | null,
    currentTime: number
): EnergyConservationReadouts {
    const h0 = Math.max(0, params['h0'] ?? 10);
    const v0 = params['v0'] ?? 0;
    const mass = params['mass'] ?? 1;
    const g = Math.max(1e-6, params['g'] ?? G_ACCELERATION);
    const tGround = Math.sqrt((2 * h0) / g);

    const frame = getFrame(result, currentTime);
    const landed = currentTime >= tGround;
    const y = frame ? frame.position.y : h0 - 0.5 * g * currentTime * currentTime;
    const vy = frame ? frame.velocity.y : -g * currentTime;
    const vx = frame ? frame.velocity.x : v0;
    const h = Math.max(0, landed ? 0 : y);
    const vyClamped = landed ? -Math.sqrt(2 * g * h0) : vy;
    const v = Math.hypot(vx, vyClamped);
    const ke = 0.5 * mass * v * v;
    const pe = mass * g * h;
    return {
        x: frame ? frame.position.x : v0 * currentTime,
        h,
        vx,
        vy: vyClamped,
        v,
        ke,
        pe,
        total: ke + pe,
        init: mass * g * h0 + 0.5 * mass * v0 * v0,
        tGround,
        landed
    };
}

export function drawEnergyConservationScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const h0 = params['h0'] ?? 10;
    const v0 = params['v0'] ?? 0;
    const mass = params['mass'] ?? 1;
    const g = params['g'] ?? G_ACCELERATION;
    const friction = params['friction'] ?? 0;

    const read = energyConservationReadouts(params, simulationResult, currentTime);
    const h = read.h;
    const v = read.v;
    const KE = read.ke;
    const PE = read.pe;
    const totalE = read.total;
    const initE = read.init;

    // 布局
    const groundY = height - 60;
    const topY = 80;
    const fallX = width * 0.35;
    const scale = (groundY - topY) / Math.max(1, h0);
    const ballY = clamp(topY + (h0 - h) * scale, topY, groundY);
    // 水平位移单独定标: 落地时水平射程 x = v₀·√(2h₀/g) 恰好铺满轨道区
    const range = Math.max(0.5, Math.abs(v0) * read.tGround);
    const hScale = (width * 0.62 - fallX) / range;

    drawTitle(ctx, '机械能守恒定律: Ek + Ep = const', width, isDark);
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

    // 完整抛物线虚线 (引擎轨迹包络, 落地段止于地面)
    const trajAll = simulationResult?.trajectories?.[0];
    if (trajAll && trajAll.length > 1) {
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.2)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        trajAll.forEach((p, i) => {
            const sx = fallX + p.position.x * hScale;
            const sy = clamp(topY + (h0 - Math.max(0, p.position.y)) * scale, topY, groundY);
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 已走过轨迹实线 (引擎轨迹; 旧实现只在 v₀≠0 时才画 → 默认自由落体看不到轨迹线)
    if (simulationResult) {
        const traj = simulationResult.trajectories[0];
        if (traj) {
            ctx.strokeStyle = BLUE;
            ctx.lineWidth = 2;
            ctx.beginPath();
            let started = false;
            for (const p of traj) {
                const sx = fallX + p.position.x * hScale;
                const sy = clamp(topY + (h0 - Math.max(0, p.position.y)) * scale, topY, groundY);
                if (!started) {
                    ctx.moveTo(sx, sy);
                    started = true;
                } else ctx.lineTo(sx, sy);
                if (p.t > currentTime) break;
            }
            ctx.stroke();
        }
    }

    // 小球 (水平位置读引擎 x, 不再用「下落距离 × 0.3」这种与物理无关的近似)
    const bx = fallX + read.x * hScale;
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
        { label: 'x', value: `${read.x.toFixed(2)} m` },
        { label: 'v', value: `${v.toFixed(2)} m/s` },
        { label: 'E', value: `${totalE.toFixed(2)} J` }
    ]);
    // 摩擦说明必须诚实: 引擎 uniform-accelerated 是**解析无摩擦模型**
    // (environment.ground.friction 不被该模型消费), 摩擦 > 0 时板书不能宣称能量已损耗。
    const frictionNote =
        friction > 0 ? `摩擦设定 ${friction}N (注: 当前引擎为无摩擦解析模型, 板书按引擎实际输出显示)` : '无摩擦 → 守恒';
    drawInfoBar(
        ctx,
        width,
        height,
        `h₀=${h0}m  m=${mass}kg  g=${g.toFixed(1)}m/s²  ${frictionNote}  E₀=${initE.toFixed(1)}J  E=${totalE.toFixed(1)}J` +
            (read.landed ? `  [已落地 t=${read.tGround.toFixed(2)}s]` : ''),
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

export function drawSimplePendulumScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const L = params['length'] ?? 1.0;
    const angleDeg = params['angle'] ?? 15;
    const mass = params['mass'] ?? 1;
    const g = params['g'] ?? G_ACCELERATION;
    const damping = params['damping'] ?? 0;
    const Tsmall = 2 * Math.PI * Math.sqrt(L / g);
    const omega0 = Math.sqrt(g / L);

    // 周期读数优先用引擎实测 (大摆角下 2π√(L/g) 明显偏小, 与画面轨迹对不上);
    // 无引擎结果时才回退小角度公式。2D 板书与 3D 器材标牌共用同一份实测值。
    const Tmeasured = measurePendulumPeriod(simulationResult?.trajectories?.[0]);
    const T = Tmeasured ?? Tsmall;
    const Tsource = Tmeasured !== null ? '引擎实测' : '小角度近似';

    // 当前摆角: 优先用引擎 theta_t 图表 (Velocity Verlet 非线性, 大角度精确)
    // 引擎图表单位是度; 无引擎结果时回退小角度近似
    const angleRad0 = (angleDeg * Math.PI) / 180;
    const thetaFromEngine = (() => {
        const series = simulationResult?.charts?.theta_t;
        if (!series || !Array.isArray(series.points) || series.points.length < 2) return null;
        const pts = series.points as Array<{ x: number; y: number }>;
        if (currentTime <= pts[0]!.x) return (pts[0]!.y * Math.PI) / 180;
        if (currentTime >= pts[pts.length - 1]!.x) return (pts[pts.length - 1]!.y * Math.PI) / 180;
        let lo = 0;
        let hi = pts.length - 1;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (pts[mid]!.x <= currentTime) lo = mid;
            else hi = mid;
        }
        const frac = (currentTime - pts[lo]!.x) / (pts[hi]!.x - pts[lo]!.x || 1);
        const deg = pts[lo]!.y + (pts[hi]!.y - pts[lo]!.y) * frac;
        return (deg * Math.PI) / 180;
    })();
    const theta =
        thetaFromEngine ??
        angleRad0 * Math.cos(omega0 * currentTime) * (damping > 0 ? Math.exp(-damping * currentTime * 0.5) : 1);

    // 布局
    const pivotX = width * 0.5;
    const pivotY = 80;
    const ropeLen = Math.min(height * 0.5, L * 180);
    const bobX = pivotX + ropeLen * Math.sin(theta);
    const bobY = pivotY + ropeLen * Math.cos(theta);
    const bobR = 18 + mass * 2;

    drawTitle(ctx, `单摆: T = ${T.toFixed(3)}s (${Tsource})  |  2π√(L/g) = ${Tsmall.toFixed(3)}s`, width, isDark);

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

    // 能量条: 优先用引擎 pe_t/ke_t 图表 (动能=½mv² 机械能守恒精确), 回退原近似
    const energyFromEngine = (key: 'pe_t' | 'ke_t'): number | null => {
        const series = simulationResult?.charts?.[key];
        if (!series || !Array.isArray(series.points) || series.points.length < 2) return null;
        const pts = series.points as Array<{ x: number; y: number }>;
        if (currentTime <= pts[0]!.x) return pts[0]!.y;
        if (currentTime >= pts[pts.length - 1]!.x) return pts[pts.length - 1]!.y;
        let lo = 0;
        let hi = pts.length - 1;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (pts[mid]!.x <= currentTime) lo = mid;
            else hi = mid;
        }
        const frac = (currentTime - pts[lo]!.x) / (pts[hi]!.x - pts[lo]!.x || 1);
        return pts[lo]!.y + (pts[hi]!.y - pts[lo]!.y) * frac;
    };
    const PE_engine = energyFromEngine('pe_t');
    const KE_engine = energyFromEngine('ke_t');
    const h = L * (1 - Math.cos(theta));
    const v = thetaFromEngine
        ? Math.sqrt(Math.max(0, 2 * g * h))
        : omega0 *
          L *
          Math.abs(Math.sin(omega0 * currentTime)) *
          (damping > 0 ? Math.exp(-damping * currentTime * 0.5) : 1);
    const KE = KE_engine ?? 0.5 * mass * v * v;
    const PE = PE_engine ?? mass * g * h;
    const totalE = mass * g * L * (1 - Math.cos(angleRad0));
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
        { label: 'T', value: `${T.toFixed(3)} s (${Tsource})` },
        { label: 'v', value: `${v.toFixed(2)} m/s` }
    ]);
    drawInfoBar(
        ctx,
        width,
        height,
        `L=${L}m  θ₀=${angleDeg}°  T(${Tsource})=${T.toFixed(3)}s  2π√(L/g)=${Tsmall.toFixed(3)}s${
            damping > 0 ? `  阻尼=${damping}` : ''
        }`,
        isDark
    );
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

export function drawWorkEnergyScene(o: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '动能定理 W = ΔEk', width, isDark, { size: 18, y: 28 });

    const m = params['mass'] ?? 1;
    const F = params['force'] ?? 5;
    const v0 = params['v0'] ?? 0;
    const duration = params['duration'] ?? 3;
    const t = Math.max(0, Math.min(duration, currentTime));
    const a = F / Math.max(1e-6, m);
    const s = v0 * t + 0.5 * a * t * t; // 含初速度, 与模型 ke_t 一致
    const W = F * s;

    // 动能来自模型 charts.ke_t (合外力做功 = 动能增量)
    const keChart = simulationResult?.charts?.ke_t;
    const Ek = interpSeries(keChart, t);
    const Ek0 = keChart?.points?.[0]?.y ?? 0;
    const dEk = Ek - Ek0;

    // 运动方块 (沿水平轨道按位移 s 移动)
    const trackY = height * 0.42;
    const startX = width * 0.12;
    const trackLen = width * 0.55;
    const sMax = v0 * duration + 0.5 * a * duration * duration;
    const blockX = startX + Math.min(1, s / Math.max(1e-6, sMax)) * trackLen;

    ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, trackY + 28);
    ctx.lineTo(startX + trackLen, trackY + 28);
    ctx.stroke();

    // 方块
    ctx.fillStyle = '#f59e0b';
    roundRectPath(ctx, blockX - 18, trackY - 18, 36, 36, 5);
    ctx.fill();
    // 力箭头
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(blockX + 18, trackY);
    ctx.lineTo(blockX + 18 + 40, trackY);
    ctx.stroke();
    arrowHead(ctx, blockX + 18, trackY, blockX + 18 + 40, trackY, 9, '#ef4444');
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('F', blockX + 18 + 20, trackY - 8);

    // 位移标注
    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, trackY + 34);
    ctx.lineTo(blockX, trackY + 34);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.fillText(`s = ${s.toFixed(2)} m`, (startX + blockX) / 2, trackY + 48);

    // W 与 ΔEk 柱状对比
    const barX = width * 0.78;
    const barBaseY = height * 0.82;
    const barMaxH = height * 0.5;
    const wVal = Math.max(0, W);
    const ekVal = Math.max(0, dEk);
    const refMax = Math.max(wVal, ekVal, 1e-6);
    const wH = (wVal / refMax) * barMaxH;
    const ekH = (ekVal / refMax) * barMaxH;

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(barX, barBaseY - wH, 36, wH);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(barX + 52, barBaseY - ekH, 36, ekH);

    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('W', barX + 18, barBaseY + 16);
    ctx.fillText('ΔEk', barX + 70, barBaseY + 16);
    ctx.textAlign = 'left';

    const equal = Math.abs(W - dEk) < Math.max(1e-6, Math.abs(W) * 0.02);
    drawHud(
        ctx,
        isDark,
        [
            { label: 'm', value: `${m} kg` },
            { label: 'F', value: `${F} N` },
            { label: 'W', value: `${W.toFixed(2)} J` },
            { label: 'ΔEk', value: `${dEk.toFixed(2)} J` },
            { label: 'W=ΔEk', value: equal ? '✓' : '…' }
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

/**
 * 力学场景渲染模块 — 第四章 牛顿运动定律
 *
 * 场景列表：
 *   - drawInertiaScene
 *   - drawNewtonFirstLawScene
 *   - drawNewtonSecondLawScene
 *   - drawOverweightScene
 *   - drawMomentumScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import {
    roundRectPath,
    textColor,
    panelFill,
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
const PURPLE = '#a855f7';

export function drawInertiaScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    const mode = Math.round(params['mode'] ?? 0);
    const groundY = height * 0.67;
    const shake = Math.sin(currentTime * 12) * 5;
    drawTitle(ctx, '惯性实验: 物体保持原有运动状态', width, isDark);
    drawGround(ctx, groundY, width, isDark);

    // 引擎轨迹 (物理米, y 向上): [上方物体, 下方物体]; 像素映射: x*scale + cx, groundY - y*scale
    const engFrameTop = getFrame(simulationResult, currentTime, 0);
    const engFrameBottom = getFrame(simulationResult, currentTime, 1);
    const scale = Math.min(height * 0.22, width * 0.2);
    const cx = width * 0.42;
    const posTop = engFrameTop
        ? { x: cx + engFrameTop.position.x * scale, y: groundY - engFrameTop.position.y * scale }
        : undefined;
    const posBottom = engFrameBottom
        ? { x: cx + engFrameBottom.position.x * scale, y: groundY - engFrameBottom.position.y * scale }
        : undefined;

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
        // 棋子打击: 位置读引擎轨迹 (上方棋子 x 恒定 + 自由落体, 下方摩擦减速)
        const bottomX = posBottom ? posBottom.x : width * 0.5 + shake * 2;
        const topX = posTop ? posTop.x : width * 0.5;
        const topY = posTop ? posTop.y : groundY - 46;
        drawBlock(ctx, bottomX, groundY - 15, 150, 18, BLUE, isDark, '硬纸片');
        drawBlock(ctx, topX, topY, 34, 28, ORANGE, isDark, '棋子');
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
    drawTitle(ctx, '牛顿第一定律: 合外力为零时保持匀速直线运动', width, isDark);
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

    drawTitle(ctx, '牛顿第二定律: F = ma', width, isDark);
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

    drawTitle(ctx, `超重与失重: N = m(g + aᵧ)`, width, isDark);

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
    drawTitle(ctx, isRecoil ? '反冲运动: m₁v₁ + m₂v₂ = 0' : '动量定理: F·Δt = Δp', width, isDark);
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

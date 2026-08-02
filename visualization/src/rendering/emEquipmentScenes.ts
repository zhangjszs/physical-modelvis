/**
 * 选必二「电磁装备」定制渲染模块
 *
 * 包含 5 个可视化场景：
 *   1. drawCurrentBalanceScene      — 电流天平 (U 形磁铁 + 水平导体棒 + 砝码盘 + 指针 + 安培力)
 *   2. drawEmDampingScene           — 电磁阻尼 (铝框摆动 + 振幅衰减 θ-t 对比曲线)
 *   3. drawMutualInductanceScene    — 互感现象 (双线圈 + 铁芯 + A1/A2 电流表 + 通断电动势)
 *   4. drawSelfInductanceScene      — 自感现象 (线圈 + 铁芯 + 灯泡 + I-t 渐变曲线)
 *   5. drawLCOscillatorScene        — 电磁振荡 (LC 电路 + 电场能/磁场能条 + I-t/Q-t 波形)
 *
 * 设计原则 (沿用 chapter2Scenes.ts / waveOptScenes.ts):
 *   - 纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 *   - 每个场景函数负责完整渲染 (背景 + 动态元素 + HUD)
 *   - 共享工具函数在本文件内复用
 *   - 与 SimulationCanvas 中 drawCollisionScene / drawSpringScene 风格一致
 */

import type { SimulationResult } from 'physics-core';
import { roundRectPath, drawEmptyState, drawHud, drawInfoBar, drawArrow } from './renderingUtils';

// ========== 共享类型 ==========

export interface EmEquipSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

// ========== 共享工具函数 ==========

/** 迷你折线图: 在指定区域内绘制 x-y 数据 */
function drawMiniChart(opts: {
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
    dashedRefY?: number; // 参考 Y 值 (画虚线)
    refColor?: string;
    refLabel?: string;
}): void {
    const { ctx, x, y, w, h, xs, ys, isDark, label } = opts;
    if (xs.length === 0 || ys.length === 0) return;

    const xMin = xs[0]!;
    const xMax = xs[xs.length - 1]!;
    let yMin = Math.min(...ys);
    let yMax = Math.max(...ys);
    if (opts.dashedRefY !== undefined) {
        yMin = Math.min(yMin, opts.dashedRefY);
        yMax = Math.max(yMax, opts.dashedRefY);
    }
    if (yMax - yMin < 1e-9) {
        yMax = yMin + 1;
    }
    const padY = (yMax - yMin) * 0.15;
    yMin -= padY;
    yMax += padY;

    // 背景
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.65)';
    roundRectPath(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.4)' : 'rgba(100,116,139,0.25)';
    ctx.lineWidth = 1;
    roundRectPath(ctx, x, y, w, h, 6);
    ctx.stroke();

    const sx = (xv: number) => x + ((xv - xMin) / (xMax - xMin)) * w;
    const sy = (yv: number) => y + h - ((yv - yMin) / (yMax - yMin)) * h;

    // 网格
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.10)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
        const gx = x + (w * i) / 5;
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, y + h);
        ctx.stroke();
    }

    // 参考虚线
    if (opts.dashedRefY !== undefined) {
        const ry = sy(opts.dashedRefY);
        ctx.strokeStyle = opts.refColor ?? '#ef4444';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x, ry);
        ctx.lineTo(x + w, ry);
        ctx.stroke();
        ctx.setLineDash([]);
        if (opts.refLabel) {
            ctx.fillStyle = opts.refColor ?? '#ef4444';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(opts.refLabel, x + w / 2, y - 4);
        }
    }

    // 折线
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

    // 轴标签
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(yMax.toFixed(2), x + 4, y + 4);
    ctx.fillText(yMin.toFixed(2), x + 4, y + h - 14);

    if (label) {
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 4, y + h + 4);
    }
}

/** 绘制一个线圈 (水平跑道形) */
function drawCoilHorizontal(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    color: string,
    lineWidth = 2,
    turns = 6
): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const left = cx - w / 2;
    const right = cx + w / 2;
    const top = cy - h / 2;
    const bottom = cy + h / 2;
    // 椭圆端 + 直边
    for (let i = 0; i < turns; i++) {
        const t = i / (turns - 1);
        const yTop = top + (h / 2) * t;
        const yBot = bottom - (h / 2) * t;
        ctx.beginPath();
        ctx.moveTo(left + 6, yTop);
        ctx.lineTo(right - 6, yTop);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(left + 6, yBot);
        ctx.lineTo(right - 6, yBot);
        ctx.stroke();
    }
    // 左侧弧
    ctx.beginPath();
    ctx.ellipse(left + 3, cy, 6, h / 2 + 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    // 右侧弧
    ctx.beginPath();
    ctx.ellipse(right - 3, cy, 6, h / 2 + 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

// =====================================================================
// 场景 1: 电流天平 (current-balance)
// =====================================================================

/**
 * 绘制电流天平场景.
 *
 *    - 顶部: U 形磁铁 (蓝色 N 极 + 红色 S 极)
 *    - 磁铁之间: 水平导体棒 (长度 L), 电流方向箭头
 *    - 左臂端: 挂砝码盘 + 砝码
 *    - 支点: 中心上下两小三角形
 *    - 底部: 指针 + 刻度盘 (偏转角) + 平衡位置基准线
 *    - 安培力箭头: 沿导体棒向上/下 (由 F_net 符号决定)
 *    - HUD: B, I, L, n, F, m_eq
 */
export function drawCurrentBalanceScene(opts: EmEquipSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;

    const B = params['magneticField'] ?? 0.5;
    const I = params['current'] ?? 1;
    const l = params['wireLen'] ?? 0.05;
    const n = params['turns'] ?? 20;
    const m = params['mass'] ?? 0.01;
    const g = params['gravity'] ?? 9.8;

    const F_ampere = n * B * I * l;
    const F_gravity = m * g;
    const F_net = F_gravity - F_ampere;
    const I_eq = F_gravity / (n * B * l + 1e-30);
    const m_eq = (n * B * I * l) / g;

    // 当前倾角 (从轨迹读取 或退化为静态比例)
    let thetaDeg = (Math.atan2(F_net, F_gravity + F_ampere) * 180) / Math.PI;
    thetaDeg = Math.max(-30, Math.min(30, thetaDeg));
    if (simulationResult) {
        const traj0 = simulationResult.trajectories[0];
        if (traj0 && traj0.length > 0) {
            // 时间插值找当前倾角
            const t = currentTime;
            const total = (simulationResult.meta as unknown as { duration?: number }).duration ?? 5;
            let idx = Math.floor((t / total) * (traj0.length - 1));
            idx = Math.max(0, Math.min(traj0.length - 1, idx));
            const ang = traj0[idx]!.position.y;
            if (typeof ang === 'number') thetaDeg = ang;
        }
    }

    // 布局
    const pivotX = width / 2;
    const pivotY = height * 0.3;
    const armHalf = Math.min(width * 0.32, 220);
    const thetaRad = (thetaDeg * Math.PI) / 180;

    // --- 天平臂 (绕支点倾斜) ---
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(thetaRad);

    // 臂杆
    const armGrad = ctx.createLinearGradient(-armHalf, 0, armHalf, 0);
    armGrad.addColorStop(0, '#94a3b8');
    armGrad.addColorStop(0.5, isDark ? '#cbd5e1' : '#64748b');
    armGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = armGrad;
    ctx.fillRect(-armHalf, -3, armHalf * 2, 6);
    ctx.strokeStyle = isDark ? '#475569' : '#334155';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-armHalf, -3, armHalf * 2, 6);

    // 支点轴 (中点的小圆)
    ctx.restore();

    // 支点三角形 (上下双三角形结构)
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY - 14);
    ctx.lineTo(pivotX - 10, pivotY - 2);
    ctx.lineTo(pivotX + 10, pivotY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = isDark ? '#1e293b' : '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- U 形磁铁: 位于天平臂臂中段下方并延伸 ---
    // 使磁铁极面位于天平臂中段附近, 导体棒在两极间
    const magnetCY = pivotY + 36;
    const magnetGap = 36; // 两极间隙
    const magnetW = 28; // 每极宽度
    const poleL = 30; // 每极长度
    const poleLeft = pivotX - magnetGap / 2 - magnetW;
    const poleRight = pivotX + magnetGap / 2;

    // N 极 (蓝色)
    {
        const ng = ctx.createLinearGradient(poleLeft, magnetCY, poleLeft + magnetW, magnetCY + poleL);
        ng.addColorStop(0, '#60a5fa');
        ng.addColorStop(1, '#1d4ed8');
        ctx.fillStyle = ng;
        ctx.fillRect(poleLeft, magnetCY, magnetW, poleL);
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 1;
        ctx.strokeRect(poleLeft, magnetCY, magnetW, poleL);
        ctx.fillStyle = '#dbeafe';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', poleLeft + magnetW / 2, magnetCY - 6);
    }

    // S 极 (红色)
    {
        const sg = ctx.createLinearGradient(poleRight, magnetCY, poleRight + magnetW, magnetCY + poleL);
        sg.addColorStop(0, '#fca5a5');
        sg.addColorStop(1, '#b91c1c');
        ctx.fillStyle = sg;
        ctx.fillRect(poleRight, magnetCY, magnetW, poleL);
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 1;
        ctx.strokeRect(poleRight, magnetCY, magnetW, poleL);
        ctx.fillStyle = '#fee2e2';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('S', poleRight + magnetW / 2, magnetCY - 6);
    }

    // 磁铁轭 (连接两极的底部)
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.fillRect(poleLeft, magnetCY + poleL - 6, magnetW + magnetGap + magnetW, 6);
    ctx.strokeStyle = isDark ? '#1e293b' : '#475569';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(poleLeft, magnetCY + poleL - 6, magnetW + magnetGap + magnetW, 6);

    // --- 导体棒 (在两极之间水平, 固定在臂上) ---
    const rodY = magnetCY + poleL / 2;
    const rodLeft = poleLeft + magnetW + 4;
    const rodRight = poleRight - 4;
    const rodMidX = (rodLeft + rodRight) / 2;

    ctx.strokeStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rodLeft, rodY);
    ctx.lineTo(rodRight, rodY);
    ctx.stroke();

    // 电流方向箭头 (沿导体棒)
    const iDir = I >= 0 ? 1 : -1;
    const arrowX1 = rodMidX - 20 * iDir;
    const arrowX2 = rodMidX + 20 * iDir;
    drawArrow(ctx, arrowX1, rodY - 10, arrowX2, rodY - 10, '#fbbf24');
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`I=${I.toFixed(2)}A`, rodMidX, rodY - 18);

    // --- 安培力箭头 (沿导体棒向上/下) ---
    const fDir = F_net < 0 ? -1 : 1; // F_net<0 → 安培力向上 → 箭头画在下方表示力向上 ? 用颜色+标签
    const fEndY = rodY - fDir * 60;
    drawArrow(ctx, rodMidX + 30, rodY, rodMidX + 30, fEndY, '#22c55e');
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`F_安=${F_ampere.toFixed(4)}N`, rodMidX + 40, (rodY + fEndY) / 2);

    // --- 左臂端: 砝码盘 (悬挂一根线) ---
    const leftX = pivotX - armHalf;
    const cordY = pivotY + 30;
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(leftX, pivotY + 3);
    ctx.lineTo(leftX, cordY);
    ctx.stroke();
    // 砝码盘 (矩形托盘)
    const panW = 46,
        panH = 8;
    ctx.fillStyle = isDark ? '#78716c' : '#a8a29e';
    roundRectPath(ctx, leftX - panW / 2, cordY, panW, panH, 2);
    ctx.fill();
    // 砝码 (方块)
    const wW = 30,
        wH = 16;
    const wGrad = ctx.createLinearGradient(leftX - wW / 2, cordY + panH, leftX + wW / 2, cordY + panH + wH);
    wGrad.addColorStop(0, '#a78bfa');
    wGrad.addColorStop(1, '#6d28d9');
    ctx.fillStyle = wGrad;
    ctx.fillRect(leftX - wW / 2, cordY + panH, wW, wH);
    ctx.fillStyle = '#ede9fe';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${m.toFixed(3)}kg`, leftX, cordY + panH + wH - 4);
    // 重力箭头
    drawArrow(ctx, leftX - 36, cordY + panH + wH, leftX - 36, cordY + panH + wH + 40, '#ef4444');
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`mg`, leftX - 42, cordY + panH + wH + 28);

    // --- 右臂端: 平衡锤 (可选, 装饰) ---
    const rightX = pivotX + armHalf;
    ctx.fillStyle = isDark ? '#78716c' : '#a8a29e';
    ctx.beginPath();
    ctx.arc(rightX, pivotY + 2, 8, 0, Math.PI * 2);
    ctx.fill();

    // --- 底部: 指针 + 刻度盘 ---
    const dialY = pivotY + 90;
    // 平衡位置基准竖线
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY + 6);
    ctx.lineTo(pivotX, dialY + 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // 指针 (从支点下方指向刻度)
    const pointerLen = 50;
    const pointerEndX = pivotX + pointerLen * Math.sin(thetaRad);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY + 6);
    ctx.lineTo(pointerEndX, dialY + 14);
    ctx.stroke();
    // 指针尖端红点
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(pointerEndX, dialY + 14, 4, 0, Math.PI * 2);
    ctx.fill();

    // 刻度盘 (半圆)
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pivotX, dialY + 14, pointerLen + 6, Math.PI, 2 * Math.PI, false);
    ctx.stroke();
    // 刻度线
    for (let d = -20; d <= 20; d += 5) {
        const a = (d * Math.PI) / 180;
        const inward = 6;
        ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pivotX + (pointerLen + 6) * Math.sin(-a), dialY + 14 - (pointerLen + 6) * Math.cos(-a));
        ctx.lineTo(
            pivotX + (pointerLen + 6 - inward) * Math.sin(-a),
            dialY + 14 - (pointerLen + 6 - inward) * Math.cos(-a)
        );
        ctx.stroke();
        if (d % 10 === 0) {
            ctx.fillStyle = isDark ? '#94a3b8' : '#334155';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
                `${d}°`,
                pivotX + (pointerLen + 14) * Math.sin(-a),
                dialY + 14 - (pointerLen + 14) * Math.cos(-a)
            );
        }
    }

    // --- 标题 ---
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('电流天平 (安培力测量)', width / 2, 24);

    // 倾角 badge
    const nearEq = Math.abs(I - I_eq) / I_eq < 0.05;
    const balText = nearEq ? `平衡 (θ=${thetaDeg.toFixed(2)}°)` : `倾斜 θ=${thetaDeg.toFixed(2)}°`;
    ctx.font = 'bold 12px sans-serif';
    const bt = ctx.measureText(balText).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, width / 2 - bt / 2 - 8, 32, bt + 16, 22, 4);
    ctx.fill();
    ctx.fillStyle = nearEq ? '#22c55e' : '#f59e0b';
    ctx.textAlign = 'center';
    ctx.fillText(balText, width / 2, 47);

    // --- HUD ---
    drawHud(ctx, isDark, [
        { label: 'B', value: `${B.toFixed(3)} T` },
        { label: 'I', value: `${I.toFixed(3)} A` },
        { label: 'n × l', value: `${n} × ${l.toFixed(3)}m` },
        { label: 'F_安', value: `${F_ampere.toFixed(4)} N` },
        { label: 'm·g', value: `${F_gravity.toFixed(4)} N` },
        { label: 'θ', value: `${thetaDeg.toFixed(2)} °` }
    ]);

    // --- 信息条 ---
    drawInfoBar(
        ctx,
        width,
        height,
        `I_eq=${I_eq.toFixed(3)}A  m_eq=${(m_eq * 1000).toFixed(1)}g  n=${n}匝  l=${l}m`,
        isDark,
        { height: 22, yOffset: 34 }
    );

    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

// =====================================================================
// 场景 2: 电磁阻尼 (em-damping)
// =====================================================================

/**
 * 绘制电磁阻尼场景.
 *
 *    - 顶部: 铝框摆动示意 (摆角 θ₀·cos(ωt)·exp(-γt))
 *    - 中部: 磁力线 B (⊗ 符号) 穿过铝框区域
 *    - 中部: 涡流方向示意 (小圆圈内 ⊗/⊙)
 *    - 底部: θ-t 振幅衰减曲线, 对比有铝框 vs 无铝框
 *    - 阻尼系数 γ / 时间常数 τ 标注
 *    - 信息条: B, ω₀, J, τ_c
 */
export function drawEmDampingScene(opts: EmEquipSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;

    const B = params['magneticField'] ?? 0.3;
    const omega0 = params['angularSpeed'] ?? 100;
    const J = params['inertia'] ?? 0.01;
    const R = params['radius'] ?? 0.1;
    const sigma = params['conductivity'] ?? 5.8e7;

    const k = 0.5 * sigma * Math.pow(R, 4);
    const tauC = J / (k * B * B + 1e-30);
    const gamma = 1 / Math.max(tauC, 1e-30);

    // 布局
    const titleH = 28;
    const topY = titleH + 16;
    const topH = height * 0.4;
    const bottomY = topY + topH + 20;
    const bottomH = height - bottomY - 50;

    // --- 标题 ---
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('电磁阻尼 (涡流力矩衰减)', width / 2, 20);

    // --- 顶部: 铝框摆动示意 ---
    const pivotX = width / 2;
    const pivotY = topY + 16; // 悬挂点 = 天花板底边，与摆线起点/铝框绘制点一致
    const rodLen = Math.min(topH * 0.38, 110);

    // 当前摆角: θ = θ₀·exp(-γt)·cos(ω't), 近似 ω' ≈ omega0 / 100
    const omegaD = omega0 / 80;
    const A0 = 0.35; // rad 初始振幅
    const A_t = A0 * Math.exp(-gamma * currentTime);
    const phi = A_t * Math.cos(omegaD * currentTime);

    // 天花板
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    ctx.fillRect(pivotX - 60, topY + 6, 120, 10);
    // 摆线
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pivotX, topY + 16);
    ctx.lineTo(pivotX + rodLen * Math.sin(phi), pivotY + rodLen * Math.cos(phi) - (pivotY - topY - 16) * 0);
    ctx.stroke();

    const frameCX = pivotX + rodLen * Math.sin(phi);
    const frameCY = pivotY + (rodLen - 10) * Math.cos(phi) - (pivotY - topY - 16) * 0.0;

    // 铝框 (矩形, 居中在末端, 绕末端倾斜 phi)
    ctx.save();
    ctx.translate(pivotX + rodLen * Math.sin(phi), topY + 16 + rodLen * Math.cos(phi));
    ctx.rotate(phi);
    const frameW = 50,
        frameH = 36;
    // 填充
    const frGrad = ctx.createLinearGradient(-frameW / 2, -frameH / 2, frameW / 2, frameH / 2);
    frGrad.addColorStop(0, isDark ? '#94a3b8' : '#cbd5e1');
    frGrad.addColorStop(1, isDark ? '#64748b' : '#94a3b8');
    ctx.fillStyle = frGrad;
    ctx.fillRect(-frameW / 2, -frameH / 2, frameW, frameH);
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-frameW / 2, -frameH / 2, frameW, frameH);
    // 铝框文字
    ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Al', 0, 4);
    ctx.restore();

    // 平衡位置虚线
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.35)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pivotX, topY + 16);
    ctx.lineTo(pivotX, frameCY + 30);
    ctx.stroke();
    ctx.setLineDash([]);

    // 磁场符号 (在框区域内画 ⊗ 表示涡流场)
    const mx = frameCX - 40;
    const my = frameCY + 5;
    const mr = 6;
    ctx.strokeStyle = isDark ? 'rgba(168,85,247,0.7)' : 'rgba(126,34,206,0.6)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.stroke();
    const d = mr * 0.5;
    ctx.beginPath();
    ctx.moveTo(mx - d, my - d);
    ctx.lineTo(mx + d, my + d);
    ctx.moveTo(mx + d, my - d);
    ctx.lineTo(mx - d, my + d);
    ctx.stroke();

    // 涡流方向标注
    const eddyCx = frameCX + 40;
    const eddyCy = frameCY + 5;
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(eddyCx, eddyCy, mr, 0, Math.PI * 2);
    ctx.stroke();
    // 点表示电流向外
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(eddyCx, eddyCy, 2, 0, Math.PI * 2);
    ctx.fill();

    // 标注图例
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⊗ 磁场 B', mx - 20, my + 20);
    ctx.fillText('⊙ 涡流向', eddyCx - 25, eddyCy + 20);

    // 右侧: 摆角衰减示意图
    const arcX = width - 60;
    const arcY = topY + topH * 0.3;
    const arcR = 32;
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(arcX, arcY, arcR, Math.PI * 0.65, Math.PI * 0.95, true);
    ctx.stroke();
    // 摆角弧
    const phiAbsDeg = (Math.abs(phi) * 180) / Math.PI;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(arcX, arcY, arcR, Math.PI * 0.8, Math.PI * 0.8 - Math.min(Math.abs(phi), 0.45), phi < 0);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`θ=${phiAbsDeg.toFixed(1)}°`, arcX - 20, arcY - 8);
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '10px sans-serif';
    ctx.fillText(`A(t)=${((A_t * 180) / Math.PI).toFixed(2)}°`, arcX - 20, arcY + 28);

    // --- 底部: θ-t 振幅衰减曲线 (对比有铝框 vs 无铝框) ---
    if (bottomH > 50) {
        const pad = 30;
        const chartX = pad + 30;
        const chartY = bottomY;
        const chartW = width - pad * 2 - 60;
        const chartH = bottomH - 30;
        const duration = params['duration'] ?? 5;
        const sweepPts = 120;
        const thetaWith: number[] = [];
        const thetaFree: number[] = [];
        const ts: number[] = [];
        for (let i = 0; i <= sweepPts; i++) {
            const ti = (duration * i) / sweepPts;
            ts.push(ti);
            const Ai = A0 * Math.exp(-gamma * ti);
            const AiFree = A0; // 无铝框: 振幅不衰减的小阻尼自由摆动 (近似不变)
            thetaWith.push((Ai * 180) / Math.PI);
            thetaFree.push(((AiFree * 180) / Math.PI) * Math.exp(-0.05 * ti)); // 自由极小阻尼
        }

        // 背景
        ctx.fillStyle = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.7)';
        roundRectPath(ctx, chartX - 12, chartY - 6, chartW + 24, chartH + 20, 8);
        ctx.fill();

        // 用迷你折线图
        drawMiniChart({
            ctx,
            x: chartX,
            y: chartY,
            w: chartW,
            h: chartH,
            xs: ts,
            ys: thetaWith,
            isDark,
            lineColor: '#3b82f6',
            label: '有铝框 (阻尼)',
            dashedRefY: 0,
            refColor: isDark ? '#64748b' : '#94a3b8',
            refLabel: '平衡'
        });

        // 第二条: 无铝框 自由摆动在上方叠加 — 做第二张图
        const chartY2 = chartY + chartH + 30;
        const chartH2 = 70;
        if (chartY2 + chartH2 < height - 30) {
            ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('对比: 无铝框 (自由摆动, 振幅不变)', chartX, chartY2 - 4);
            drawMiniChart({
                ctx,
                x: chartX,
                y: chartY2,
                w: chartW,
                h: chartH2,
                xs: ts,
                ys: thetaFree,
                isDark,
                lineColor: '#a855f7',
                label: '无铝框'
            });
        }

        // 图例
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(chartX + 10, chartY - 22, 12, 3);
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('有铝框 (涡流阻尼)', chartX + 26, chartY - 18);
    }

    // 衰减常数 badge
    const tauText = `τ_c = ${tauC.toFixed(4)} s   γ = ${gamma.toFixed(3)} /s`;
    ctx.font = 'bold 12px sans-serif';
    const ttw = ctx.measureText(tauText).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, width - ttw - 30, 6, ttw + 22, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText(tauText, width - ttw / 2 - 19, 20);

    // --- HUD ---
    drawHud(
        ctx,
        isDark,
        [
            { label: 't', value: `${currentTime.toFixed(3)} s` },
            { label: 'ω₀', value: `${omega0.toFixed(1)} rad/s` },
            { label: 'B', value: `${B.toFixed(3)} T` },
            { label: 'τ_c', value: `${tauC.toFixed(4)} s` },
            { label: 'A(t)', value: `${((A_t * 180) / Math.PI).toFixed(2)} °` }
        ],
        { boxW: 210 }
    );

    drawInfoBar(
        ctx,
        width,
        height,
        `B=${B}T  ω₀=${omega0}rad/s  J=${J}kg·m²  R=${R}m  τ_c=${tauC.toFixed(4)}s`,
        isDark,
        { height: 22, yOffset: 34 }
    );

    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

// =====================================================================
// 场景 3: 互感 (mutual-inductance)
// =====================================================================

/**
 * 绘制互感现象场景.
 *
 *    - 左侧: 原边线圈 (电感 L₁) + 电池 + 开关 + 电流表 A1
 *    - 右侧: 副边线圈 (电感 L₂) + 电流表 A2 (无电源)
 *    - 顶部: 铁芯连接两线圈 (矩形磁路)
 *    - 开关通断动画: 开关状态随时间切换; A1/A2 指针偏转
 *    - 底部: 原边电流 I1(t) + 副边电动势 E2(t) 波形对比图
 *    - M = Φ₂/I₁ 标注
 *    - 信息条: L1, L2, k, f, M, E2_peak
 */
export function drawMutualInductanceScene(opts: EmEquipSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;

    const L1 = params['L1'] ?? 0.1;
    const L2 = params['L2'] ?? 0.05;
    const k = params['coupling'] ?? 0.6;
    const f = params['frequency'] ?? 50;
    const I0 = params['primaryCurrent'] ?? 1;

    const M = k * Math.sqrt(L1 * L2);
    const omega = 2 * Math.PI * f;
    const E2pk = M * I0 * omega;

    // 当前开关状态: 在 t=0 时开关闭合 (用 currentTime 模拟)
    // 当 currentTime < 0.1 时画断开状态, 否则画闭合. (制造瞬态可视化)
    // 更自然: 始终画闭合 (稳态), 偏转大小由 sin(ωt) 驱动
    const switchClosed = currentTime > 0.01;

    // 布局
    const pad = 40;
    const coilR = 36;
    const coilLeftX = width * 0.28;
    const coilRightX = width * 0.72;
    const coilY = height * 0.36;

    // --- 标题 ---
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('互感现象 (双线圈)', width / 2, 22);

    // --- 铁芯 (顶部矩形磁路) ---
    const coreY = coilY - coilR - 16;
    const coreH = 10;
    ctx.fillStyle = isDark ? '#78716c' : '#a8a29e';
    // 横向铁芯 (连接两线圈顶部)
    ctx.fillRect(coilLeftX - coilR, coreY, coilRightX - coilLeftX + coilR * 2, coreH);
    ctx.strokeStyle = isDark ? '#44403c' : '#57534e';
    ctx.lineWidth = 1;
    ctx.strokeRect(coilLeftX - coilR, coreY, coilRightX - coilLeftX + coilR * 2, coreH);
    // 线圈中心竖向柱
    ctx.fillStyle = isDark ? '#78716c' : '#a8a29e';
    ctx.fillRect(coilLeftX - 8, coilY - coilR - coreH, 16, coilR + coreH);
    ctx.fillRect(coilRightX - 8, coilY - coilR - coreH, 16, coilR + coreH);

    // 铁芯内磁通方向箭头 (中央)
    const fluxX = (coilLeftX + coilRightX) / 2;
    const fluxY = coreY + coreH / 2;
    const fluxDir = Math.sin(omega * currentTime) >= 0 ? 1 : -1;
    drawArrow(ctx, fluxX - 30 * fluxDir, fluxY, fluxX + 30 * fluxDir, fluxDir > 0 ? fluxY : fluxY, '#a855f7');
    ctx.fillStyle = '#a855f7';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Φ', fluxX, fluxY - 8);

    // --- 原边线圈 (左侧) ---
    drawCoilHorizontal(ctx, coilLeftX, coilY, coilR * 1.6, coilR, '#3b82f6', 2.5, 8);
    // 标签
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('L₁ (原边)', coilLeftX, coilY + coilR + 18);
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText(`L1=${L1}H`, coilLeftX, coilY + coilR + 32);

    // --- 副边线圈 (右侧) ---
    drawCoilHorizontal(ctx, coilRightX, coilY, coilR * 1.6, coilR, '#10b981', 2.5, 8);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('L₂ (副边)', coilRightX, coilY + coilR + 18);
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText(`L2=${L2}H`, coilRightX, coilY + coilR + 32);

    // --- 原边电路: 电池 + 开关 + 电流表 (线圈上方) ---
    const circuitY = coreY - 28;

    // 电池 (长线正极, 短线负极)
    const batX = coilLeftX - 16;
    const batY = circuitY - 16;
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(batX, batY);
    ctx.lineTo(batX, batY + 8);
    ctx.moveTo(batX - 6, batY + 8);
    ctx.lineTo(batX + 6, batY + 8);
    ctx.moveTo(batX - 3, batY + 14);
    ctx.lineTo(batX + 3, batY + 14);
    ctx.moveTo(batX, batY + 14);
    ctx.lineTo(batX, batY + 26);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('E', batX, batY - 4);

    // 导线从电池到线圈 top
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(batX, batY + 26);
    ctx.lineTo(coilLeftX, coilY - coilR);
    ctx.stroke();

    // 开关
    const swX = coilLeftX;
    const swY = batY + 18;
    ctx.strokeStyle = switchClosed ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(swX - 12, swY);
    ctx.lineTo(swX - 4, swY);
    if (switchClosed) {
        ctx.lineTo(swX + 4, swY);
    } else {
        ctx.lineTo(swX + 4, swY - 8);
    }
    ctx.lineTo(swX + 12, swY);
    ctx.stroke();
    ctx.fillStyle = switchClosed ? '#22c55e' : '#ef4444';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(switchClosed ? 'ON' : 'OFF', swX, swY + 14);

    // A1 电流表 (线圈下方)
    const meter1X = coilLeftX + coilR + 6;
    const meter1Y = coilY;
    // 电流表圆 (外圈)
    ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
    ctx.beginPath();
    ctx.arc(meter1X, meter1Y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 指针
    const I1now = I0 * Math.sin(omega * currentTime);
    const needleA1 = Math.max(-0.8, Math.min(0.8, I1now / (I0 * 1.2)));
    const needle1Angle = -Math.PI / 4 + (Math.PI / 2) * needleA1;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(meter1X, meter1Y);
    ctx.lineTo(meter1X + 14 * Math.cos(needle1Angle), meter1Y - 14 * Math.sin(needle1Angle));
    ctx.stroke();
    // 刻度
    for (let d = -2; d <= 2; d++) {
        const aa = -Math.PI / 4 + (Math.PI / 4) * d;
        ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(meter1X + 12 * Math.cos(aa), meter1Y - 12 * Math.sin(aa));
        ctx.lineTo(meter1X + 15 * Math.cos(aa), meter1Y - 15 * Math.sin(aa));
        ctx.stroke();
    }
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A₁', meter1X, meter1Y + 28 + 6);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText(`I1=${I1now.toFixed(2)}A`, meter1X, meter1Y + 40 + 6);

    // --- 副边电路: 电流表 A2 (线圈下方) ---
    const meter2X = coilRightX - coilR - 6;
    const meter2Y = coilY;
    ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
    ctx.beginPath();
    ctx.arc(meter2X, meter2Y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 副边感生电动势 E2 = -M·dI1/dt ∝ cos(ωt)
    const E2now = -E2pk * Math.cos(omega * currentTime);
    const needleA2 = Math.max(-0.8, Math.min(0.8, E2now / (E2pk * 1.2)));
    const needle2Angle = -Math.PI / 4 + (Math.PI / 2) * needleA2;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(meter2X, meter2Y);
    ctx.lineTo(meter2X + 14 * Math.cos(needle2Angle), meter2Y - 14 * Math.sin(needle2Angle));
    ctx.stroke();
    for (let d = -2; d <= 2; d++) {
        const aa = -Math.PI / 4 + (Math.PI / 4) * d;
        ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(meter2X + 12 * Math.cos(aa), meter2Y - 12 * Math.sin(aa));
        ctx.lineTo(meter2X + 15 * Math.cos(aa), meter2Y - 15 * Math.sin(aa));
        ctx.stroke();
    }
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A₂', meter2X, meter2Y + 28 + 6);
    ctx.fillStyle = '#10b981';
    ctx.fillText(`E2=${E2now.toFixed(2)}V`, meter2X, meter2Y + 40 + 6);

    // --- 底部: 波形图 (I1(t) + E2(t)) ---
    const waveY = height * 0.55;
    const waveH = height * 0.28;
    const waveX = pad + 20;
    const waveW = width - pad * 2 - 40;

    if (waveH > 50) {
        ctx.fillStyle = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.7)';
        roundRectPath(ctx, waveX - 8, waveY - 6, waveW + 16, waveH + 30, 6);
        ctx.fill();

        // I1(t)
        const N = 150;
        const dur = 1 / f;
        const I1_X: number[] = [];
        const I1_Y: number[] = [];
        const E2_X: number[] = [];
        const E2_Y: number[] = [];
        for (let i = 0; i <= N; i++) {
            const ti = (dur * i) / N;
            I1_X.push(ti * 1000);
            I1_Y.push(I0 * Math.sin(omega * ti));
            E2_X.push(ti * 1000);
            E2_Y.push(-E2pk * Math.cos(omega * ti));
        }

        // 找到 y 范围合并轴
        const yAll = [...I1_Y, ...E2_Y];
        const yMin = Math.min(...yAll);
        const yMax = Math.max(...yAll);
        const padY = (yMax - yMin) * 0.15;
        const gMin = yMin - padY;
        const gMax = yMax + padY;

        const sxv = (v: number) => waveX + (v / (dur * 1000)) * waveW;
        const syv = (v: number) => waveY + waveH - ((v - gMin) / (gMax - gMin)) * waveH;

        // 零线
        ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(waveX, syv(0));
        ctx.lineTo(waveX + waveW, syv(0));
        ctx.stroke();
        ctx.setLineDash([]);

        // I1 曲线
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < I1_X.length; i++) {
            const px = sxv(I1_X[i]!);
            const py = syv(I1_Y[i]!);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // E2 曲线
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < E2_X.length; i++) {
            const px = sxv(E2_X[i]!);
            const py = syv(E2_Y[i]!);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // 当前时间竖线
        const curTms = (currentTime % dur) * 1000;
        const curPx = sxv(curTms);
        if (curPx >= waveX && curPx <= waveX + waveW) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(curPx, waveY);
            ctx.lineTo(curPx, waveY + waveH);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 图例
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(waveX + 10, waveY - 2, 14, 3);
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('I₁(t)', waveX + 28, waveY + 2);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(waveX + 70, waveY - 2, 14, 3);
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        ctx.fillText('E₂(t)', waveX + 88, waveY + 2);

        // 轴标签
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('t (ms)', waveX + waveW / 2, waveY + waveH + 18);
    }

    // --- M 公式 badge ---
    const mText = `M = k·√(L₁L₂) = ${M.toExponential(3)} H`;
    ctx.font = 'bold 12px sans-serif';
    const mtw = ctx.measureText(mText).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, width / 2 - mtw / 2 - 10, 30, mtw + 20, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#a855f7';
    ctx.textAlign = 'center';
    ctx.fillText(mText, width / 2, 44);

    // --- HUD ---
    drawHud(
        ctx,
        isDark,
        [
            { label: 't', value: `${currentTime.toFixed(4)} s` },
            { label: 'L1', value: `${L1} H` },
            { label: 'L2', value: `${L2} H` },
            { label: 'k', value: `${k.toFixed(2)}` },
            { label: 'M', value: `${M.toExponential(2)} H` },
            { label: 'E2pk', value: `${E2pk.toFixed(3)} V` }
        ],
        { boxW: 210 }
    );

    drawInfoBar(
        ctx,
        width,
        height,
        `L1=${L1}H  L2=${L2}H  k=${k}  f=${f}Hz  I0=${I0}A  M=${M.toExponential(3)}H  E2pk=${E2pk.toFixed(3)}V`,
        isDark,
        { height: 22, yOffset: 34 }
    );

    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

// =====================================================================
// 场景 4: 自感 (self-inductance)
// =====================================================================

/**
 * 绘制自感现象场景.
 *
 *    - 顶部: 线圈 + 铁芯 + 灯泡 + 电源 + 开关 (完整电路)
 *    - 开关闭合: 灯泡渐亮 (电感阻碍电流)
 *    - 开关断开: 灯泡闪亮后灭 (自感电动势)
 *    - 中部: 灯泡亮度随时间变化 (视觉)
 *    - 底部: 电流-时间曲线 (I-t) 显示渐变
 *    - L = Φ/I 标注
 *    - 信息条: L, R, E, τ, I_ss
 */
export function drawSelfInductanceScene(opts: EmEquipSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;

    const L = params['inductance'] ?? 0.5;
    const R = params['resistance'] ?? 10;
    const E = params['emf'] ?? 12;
    // mode = turnOff 断电自感演示

    const tau = L / R;
    const Iss = E / R;

    // 当前电流 (断电模式: i(t) = I_ss·exp(-t/τ))
    let iNow = Iss * Math.exp(-currentTime / tau);
    if (simulationResult) {
        const traj0 = simulationResult.trajectories[0];
        if (traj0 && traj0.length > 0) {
            const t = currentTime;
            const total = (simulationResult.meta as unknown as { duration?: number }).duration ?? 0.5;
            let idx = Math.floor((t / total) * (traj0.length - 1));
            idx = Math.max(0, Math.min(traj0.length - 1, idx));
            iNow = traj0[idx]!.position.y;
        }
    }

    // 灯泡亮度 (0~1)
    const brightness = Math.max(0, Math.min(1, iNow / Iss));

    // 布局
    const titleH = 28;
    const circuitY = titleH + 60;
    const circuitH = height * 0.3;
    const waveY = circuitY + circuitH + 30;
    const waveH = height - waveY - 50;

    // --- 标题 ---
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('自感现象 (断电自感)', width / 2, 22);

    // --- 电路: 线圈 + 铁芯 + 灯泡 + 电源 + 开关 ---
    const cx = width / 2;
    const cy = circuitY + circuitH / 2;

    // 线圈 (左侧)
    const coilX = cx - 100;
    drawCoilHorizontal(ctx, coilX, cy, 50, 40, '#a855f7', 2.5, 7);
    // 铁芯 (穿过线圈)
    ctx.fillStyle = isDark ? '#78716c' : '#a8a29e';
    ctx.fillRect(coilX - 30, cy - 6, 60, 12);
    ctx.strokeStyle = isDark ? '#44403c' : '#57534e';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(coilX - 30, cy - 6, 60, 12);
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('线圈 + 铁芯', coilX, cy + 36);
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText(`L=${L}H`, coilX, cy + 50);

    // 灯泡 (右侧)
    const bulbX = cx + 80;
    const bulbY = cy;
    // 灯泡底座
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    ctx.fillRect(bulbX - 10, bulbY + 14, 20, 6);
    // 灯泡玻璃
    const bulbGrad = ctx.createRadialGradient(bulbX - 4, bulbY - 4, 2, bulbX, bulbY, 22);
    const brightHex = `rgba(255,224,102,${0.2 + 0.8 * brightness})`;
    bulbGrad.addColorStop(0, brightHex);
    bulbGrad.addColorStop(0.6, `rgba(251,191,36,${0.15 + 0.5 * brightness})`);
    bulbGrad.addColorStop(1, `rgba(251,191,36,0.05)`);
    ctx.fillStyle = bulbGrad;
    ctx.beginPath();
    ctx.arc(bulbX, bulbY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 灯丝
    ctx.strokeStyle = `rgba(255,${Math.round(100 + 155 * brightness)},${Math.round(50 * (1 - brightness))},1)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bulbX - 6, bulbY + 6);
    ctx.lineTo(bulbX - 3, bulbY - 2);
    ctx.lineTo(bulbX + 3, bulbY + 2);
    ctx.lineTo(bulbX + 6, bulbY - 6);
    ctx.stroke();
    // 灯泡标签
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('灯泡', bulbX, bulbY + 36);
    ctx.fillStyle = brightness > 0.5 ? '#fbbf24' : isDark ? '#64748b' : '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText(`亮度 ${(brightness * 100).toFixed(0)}%`, bulbX, bulbY + 50);

    // 电源 (下方)
    const batX = cx;
    const batY = cy + 50;
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(batX, batY);
    ctx.lineTo(batX, batY + 8);
    ctx.moveTo(batX - 6, batY + 8);
    ctx.lineTo(batX + 6, batY + 8);
    ctx.moveTo(batX - 3, batY + 14);
    ctx.lineTo(batX + 3, batY + 14);
    ctx.moveTo(batX, batY + 14);
    ctx.lineTo(batX, batY + 26);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`E=${E}V`, batX, batY + 38);

    // 开关 (电源旁)
    const swX = cx + 50;
    const swY = batY + 14;
    const swClosed = currentTime < 0.001; // 断电模式: 开关断开
    ctx.strokeStyle = swClosed ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(swX - 12, swY);
    ctx.lineTo(swX - 4, swY);
    if (swClosed) {
        ctx.lineTo(swX + 4, swY);
    } else {
        ctx.lineTo(swX + 4, swY - 8);
    }
    ctx.lineTo(swX + 12, swY);
    ctx.stroke();
    ctx.fillStyle = swClosed ? '#22c55e' : '#ef4444';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(swClosed ? 'ON' : 'OFF', swX, swY + 14);

    // 导线 (简化: 用直线连接各元件)
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.lineWidth = 1.2;
    // 线圈 top → 灯泡 top
    ctx.beginPath();
    ctx.moveTo(coilX + 25, cy - 20);
    ctx.lineTo(bulbX - 20, bulbY - 20);
    ctx.lineTo(bulbX - 20, bulbY);
    ctx.stroke();
    // 灯泡 bottom → 电源 top
    ctx.beginPath();
    ctx.moveTo(bulbX, bulbY + 20);
    ctx.lineTo(bulbX, batY);
    ctx.lineTo(batX, batY);
    ctx.stroke();
    // 电源 bottom → 开关
    ctx.beginPath();
    ctx.moveTo(batX, batY + 26);
    ctx.lineTo(batX, swY);
    ctx.lineTo(swX - 12, swY);
    ctx.stroke();
    // 开关 → 线圈 bottom
    ctx.beginPath();
    ctx.moveTo(swX + 12, swY);
    ctx.lineTo(swX + 12, swY + 30);
    ctx.lineTo(coilX - 25, cy + 20);
    ctx.stroke();

    // --- 底部: I-t 渐变曲线 ---
    if (waveH > 50) {
        const pad = 30;
        const chartX = pad + 20;
        const chartY = waveY;
        const chartW = width - pad * 2 - 40;
        const chartH = waveH - 20;
        const duration = params['duration'] ?? 0.5;

        ctx.fillStyle = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.7)';
        roundRectPath(ctx, chartX - 8, chartY - 6, chartW + 16, chartH + 30, 6);
        ctx.fill();

        const N = 150;
        const I_X: number[] = [];
        const I_Y: number[] = [];
        const U_Y: number[] = [];
        for (let i = 0; i <= N; i++) {
            const ti = (duration * i) / N;
            I_X.push(ti * 1000);
            I_Y.push(Iss * Math.exp(-ti / tau));
            U_Y.push(-E * Math.exp(-ti / tau));
        }

        const yAll = [...I_Y, ...U_Y];
        const yMin = Math.min(...yAll);
        const yMax = Math.max(...yAll);
        const padY = (yMax - yMin) * 0.15;
        const gMin = yMin - padY;
        const gMax = yMax + padY;

        const sxv = (v: number) => chartX + (v / (duration * 1000)) * chartW;
        const syv = (v: number) => chartY + chartH - ((v - gMin) / (gMax - gMin)) * chartH;

        // 零线
        ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(chartX, syv(0));
        ctx.lineTo(chartX + chartW, syv(0));
        ctx.stroke();
        ctx.setLineDash([]);

        // I(t) 曲线
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < I_X.length; i++) {
            const px = sxv(I_X[i]!);
            const py = syv(I_Y[i]!);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // uL(t) 曲线
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < I_X.length; i++) {
            const px = sxv(I_X[i]!);
            const py = syv(U_Y[i]!);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // 当前时间竖线
        const curTms = (currentTime % duration) * 1000;
        const curPx = sxv(curTms);
        if (curPx >= chartX && curPx <= chartX + chartW) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(curPx, chartY);
            ctx.lineTo(curPx, chartY + chartH);
            ctx.stroke();
            ctx.setLineDash([]);
            // 当前点
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(curPx, syv(iNow), 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // 时间常数标注
        const tauTau = tau * 1000;
        const tauPx = sxv(tauTau);
        if (tauPx > chartX && tauPx < chartX + chartW) {
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.moveTo(tauPx, chartY);
            ctx.lineTo(tauPx, chartY + chartH);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#a855f7';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`τ=${(tau * 1000).toFixed(1)}ms`, tauPx, chartY - 4);
        }

        // 图例
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(chartX + 10, chartY - 2, 14, 3);
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('i(t)', chartX + 28, chartY + 2);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(chartX + 60, chartY - 2, 14, 3);
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        ctx.fillText('uL(t)', chartX + 78, chartY + 2);

        // 轴标签
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('t (ms)', chartX + chartW / 2, chartY + chartH + 18);
    }

    // --- L 公式 badge ---
    const lText = `L = Φ/I = ${L} H`;
    ctx.font = 'bold 12px sans-serif';
    const ltw = ctx.measureText(lText).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, width / 2 - ltw / 2 - 10, 30, ltw + 20, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#a855f7';
    ctx.textAlign = 'center';
    ctx.fillText(lText, width / 2, 44);

    // --- HUD ---
    drawHud(
        ctx,
        isDark,
        [
            { label: 't', value: `${currentTime.toFixed(4)} s` },
            { label: 'L', value: `${L} H` },
            { label: 'R', value: `${R} Ω` },
            { label: 'τ', value: `${(tau * 1000).toFixed(2)} ms` },
            { label: 'I_ss', value: `${Iss.toFixed(3)} A` },
            { label: 'i(t)', value: `${iNow.toFixed(4)} A` }
        ],
        { boxW: 210 }
    );

    drawInfoBar(
        ctx,
        width,
        height,
        `L=${L}H  R=${R}Ω  E=${E}V  τ=${(tau * 1000).toFixed(2)}ms  I_ss=${Iss.toFixed(3)}A  i(t)=${iNow.toFixed(4)}A`,
        isDark,
        { height: 22, yOffset: 34 }
    );

    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

// =====================================================================
// 场景 5: 电磁振荡 (lc-oscillator)
// =====================================================================

/**
 * 绘制 LC 电磁振荡场景.
 *
 *    - 顶部: 平行板电容器 (两极板) + 线圈 (电感)
 *    - 电流方向箭头 (顺时针/逆时针)
 *    - 中部: 电场能条 (上) + 磁场能条 (下) 互相转换
 *    - 底部: I-t 和 Q-t 波形
 *    - ω = 1/√(LC) 标注
 *    - 信息条: L, C, f, T, Q₀, I_m, E_total
 */
export function drawLCOscillatorScene(opts: EmEquipSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;

    const C_pf = params['C'] ?? 100;
    const L_uh = params['Lind'] ?? 10;
    const Q0_uc = params['Q0'] ?? 1;

    const C = C_pf * 1e-12;
    const L = L_uh * 1e-6;
    const Q0 = Q0_uc * 1e-6;

    const omega = 1 / Math.sqrt(L * C);
    const T = (2 * Math.PI) / omega;
    const f = omega / (2 * Math.PI);
    const Im = Q0 * omega;
    const E_total = (Q0 * Q0) / (2 * C);

    // 当前状态: 优先读引擎 charts (q_t μC / i_t mA / Ee_t, Em_t μJ), 回退自算解析公式
    const engCharts = simulationResult?.charts as
        | {
              x_t?: { points: Array<{ x: number; y: number }> }; // q(t) μC
              y_t?: { points: Array<{ x: number; y: number }> }; // i(t) mA
              ke_t?: { points: Array<{ x: number; y: number }> }; // Ee(t) μJ
              pe_t?: { points: Array<{ x: number; y: number }> }; // Em(t) μJ
          }
        | undefined;
    const interp = (pts: Array<{ x: number; y: number }> | undefined, tUs: number): number | null => {
        if (!pts || pts.length < 2) return null;
        const tt = (((tUs % 2e6) + 2e6) % 2e6) + pts[0]!.x; // 引擎覆盖 2T; 取模循环
        let lo = 0;
        let hi = pts.length - 1;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (pts[mid]!.x < tt) lo = mid;
            else hi = mid;
        }
        const p0 = pts[lo]!;
        const p1 = pts[hi]!;
        if (p1.x - p0.x < 1e-9) return p0.y;
        return p0.y + ((p1.y - p0.y) * (tt - p0.x)) / (p1.x - p0.x);
    };
    const curTusAll = (currentTime % (2 * T)) * 1e6;
    const qUs = interp(engCharts?.x_t?.points, curTusAll);
    const iMa = interp(engCharts?.y_t?.points, curTusAll);
    const EeUj = interp(engCharts?.ke_t?.points, curTusAll);
    const EmUj = interp(engCharts?.pe_t?.points, curTusAll);
    const qNow = qUs !== null ? qUs * 1e-6 : Q0 * Math.cos(omega * currentTime);
    const iNow = iMa !== null ? iMa * 1e-3 : -Q0 * omega * Math.sin(omega * currentTime);
    const EeNow = EeUj !== null ? EeUj * 1e-6 : (qNow * qNow) / (2 * C);
    const EmNow = EmUj !== null ? EmUj * 1e-6 : (L * iNow * iNow) / 2;

    // 布局
    const titleH = 28;
    const topY = titleH + 16;
    const topH = height * 0.3;
    const barY = topY + topH + 16;
    const barH = 50;
    const waveY = barY + barH + 16;
    const waveH = height - waveY - 50;

    // --- 标题 ---
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LC 电磁振荡', width / 2, 22);

    // --- 顶部: 电容器 + 线圈 ---
    const cx = width / 2;
    const cy = topY + topH / 2;

    // 电容器 (左侧)
    const capX = cx - 100;
    const capPlateH = 50;
    const capGap = 18;
    // 上极板
    const capGrad1 = ctx.createLinearGradient(capX - 30, cy - capGap / 2 - capPlateH, capX + 30, cy - capGap / 2);
    capGrad1.addColorStop(0, '#60a5fa');
    capGrad1.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = capGrad1;
    ctx.fillRect(capX - 30, cy - capGap / 2 - capPlateH, 60, capPlateH);
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 1;
    ctx.strokeRect(capX - 30, cy - capGap / 2 - capPlateH, 60, capPlateH);
    // 下极板
    const capGrad2 = ctx.createLinearGradient(capX - 30, cy + capGap / 2, capX + 30, cy + capGap / 2 + capPlateH);
    capGrad2.addColorStop(0, '#fca5a5');
    capGrad2.addColorStop(1, '#b91c1c');
    ctx.fillStyle = capGrad2;
    ctx.fillRect(capX - 30, cy + capGap / 2, 60, capPlateH);
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1;
    ctx.strokeRect(capX - 30, cy + capGap / 2, 60, capPlateH);
    // 电荷标注
    const qSign = qNow >= 0 ? '+' : '−';
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(qSign, capX, cy - capGap / 2 - capPlateH / 2 + 5);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillText(qSign === '+' ? '−' : '+', capX, cy + capGap / 2 + capPlateH / 2 + 5);
    // 电容标签
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`C=${C_pf}pF`, capX, cy + capGap / 2 + capPlateH + 18);

    // 电场线 (极板之间, 随 qNow 强度变化)
    const eAlpha = Math.min(1, Math.abs(qNow) / Q0);
    ctx.strokeStyle = `rgba(59,130,246,${0.2 + 0.6 * eAlpha})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
        const lx = capX - 20 + i * 10;
        ctx.beginPath();
        ctx.moveTo(lx, cy - capGap / 2 + 2);
        ctx.lineTo(lx, cy + capGap / 2 - 2);
        ctx.stroke();
        // 箭头
        const ay = cy - 2 + (i % 2 === 0 ? 0 : 0);
        ctx.fillStyle = `rgba(59,130,246,${0.2 + 0.6 * eAlpha})`;
        ctx.beginPath();
        ctx.moveTo(lx, ay);
        ctx.lineTo(lx - 3, ay + 5);
        ctx.lineTo(lx + 3, ay + 5);
        ctx.closePath();
        ctx.fill();
    }

    // 线圈 (右侧)
    const coilX = cx + 100;
    drawCoilHorizontal(ctx, coilX, cy, 50, 40, '#a855f7', 2.5, 7);
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`L=${L_uh}μH`, coilX, cy + 36);

    // 电流方向箭头 (在线圈上方画弧形箭头)
    const arcDir = iNow >= 0 ? 1 : -1;
    const arcR = 30;
    ctx.strokeStyle = `rgba(251,191,36,${0.3 + 0.7 * Math.min(1, Math.abs(iNow) / Im)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(coilX, cy, arcR, Math.PI * 0.6, Math.PI * 0.6 + arcDir * Math.PI * 0.8, arcDir < 0);
    ctx.stroke();
    // 箭头尖端
    const endA = Math.PI * 0.6 + arcDir * Math.PI * 0.8;
    const tipX = coilX + arcR * Math.cos(endA);
    const tipY = cy + arcR * Math.sin(endA);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - 8 * Math.cos(endA - arcDir * 0.4), tipY - 8 * Math.sin(endA - arcDir * 0.4));
    ctx.lineTo(tipX - 8 * Math.cos(endA + arcDir * 0.4), tipY - 8 * Math.sin(endA + arcDir * 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`i=${(iNow * 1e3).toFixed(2)}mA`, coilX, cy - arcR - 8);

    // 导线连接 (电容 → 线圈)
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.lineWidth = 1.2;
    // 上 → 上
    ctx.beginPath();
    ctx.moveTo(capX + 30, cy - capGap / 2 - capPlateH / 2);
    ctx.lineTo(coilX - 25, cy - 20);
    ctx.stroke();
    // 下 → 下
    ctx.beginPath();
    ctx.moveTo(capX + 30, cy + capGap / 2 + capPlateH / 2);
    ctx.lineTo(coilX - 25, cy + 20);
    ctx.stroke();

    // --- 中部: 电场能条 + 磁场能条 ---
    const barPad = 40;
    const barW = width - barPad * 2;
    const barX = barPad;
    const eBarY = barY;
    const mBarY = barY + barH / 2 + 4;
    const singleBarH = barH / 2 - 4;

    // 电场能条 (蓝色)
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(241,245,249,0.7)';
    roundRectPath(ctx, barX, eBarY, barW, singleBarH, 4);
    ctx.fill();
    const eFrac = E_total > 0 ? EeNow / E_total : 0;
    const eGrad = ctx.createLinearGradient(barX, 0, barX + barW * eFrac, 0);
    eGrad.addColorStop(0, '#3b82f6');
    eGrad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = eGrad;
    roundRectPath(ctx, barX, eBarY, barW * eFrac, singleBarH, 4);
    ctx.fill();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
        `电场能 Ee = ${(EeNow * 1e6).toFixed(3)} μJ  (${(eFrac * 100).toFixed(1)}%)`,
        barX + 8,
        eBarY + singleBarH / 2 + 4
    );

    // 磁场能条 (紫色)
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(241,245,249,0.7)';
    roundRectPath(ctx, barX, mBarY, barW, singleBarH, 4);
    ctx.fill();
    const mFrac = E_total > 0 ? EmNow / E_total : 0;
    const mGrad = ctx.createLinearGradient(barX, 0, barX + barW * mFrac, 0);
    mGrad.addColorStop(0, '#a855f7');
    mGrad.addColorStop(1, '#6d28d9');
    ctx.fillStyle = mGrad;
    roundRectPath(ctx, barX, mBarY, barW * mFrac, singleBarH, 4);
    ctx.fill();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
        `磁场能 Em = ${(EmNow * 1e6).toFixed(3)} μJ  (${(mFrac * 100).toFixed(1)}%)`,
        barX + 8,
        mBarY + singleBarH / 2 + 4
    );

    // --- 底部: I-t 和 Q-t 波形 ---
    if (waveH > 50) {
        const pad = 30;
        const chartX = pad + 20;
        const chartY = waveY;
        const chartW = width - pad * 2 - 40;
        const chartH = waveH - 20;

        ctx.fillStyle = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.7)';
        roundRectPath(ctx, chartX - 8, chartY - 6, chartW + 16, chartH + 30, 6);
        ctx.fill();

        const N = 200;
        const tMax = T;
        const Q_X: number[] = [];
        const Q_Y: number[] = [];
        const I_X: number[] = [];
        const I_Y: number[] = [];
        const qPts = engCharts?.x_t?.points;
        const iPts = engCharts?.y_t?.points;
        for (let i = 0; i <= N; i++) {
            const ti = (tMax * i) / N;
            const tiUs = ti * 1e6;
            Q_X.push(tiUs);
            Q_Y.push(qPts ? (interp(qPts, tiUs) ?? Q0 * Math.cos(omega * ti) * 1e6) : Q0 * Math.cos(omega * ti) * 1e6);
            I_X.push(tiUs);
            I_Y.push(
                iPts
                    ? (interp(iPts, tiUs) ?? -Q0 * omega * Math.sin(omega * ti) * 1e3)
                    : -Q0 * omega * Math.sin(omega * ti) * 1e3
            );
        }

        const yAll = [...Q_Y, ...I_Y];
        const yMin = Math.min(...yAll);
        const yMax = Math.max(...yAll);
        const padY = (yMax - yMin) * 0.15;
        const gMin = yMin - padY;
        const gMax = yMax + padY;

        const sxv = (v: number) => chartX + (v / (tMax * 1e6)) * chartW;
        const syv = (v: number) => chartY + chartH - ((v - gMin) / (gMax - gMin)) * chartH;

        // 零线
        ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(chartX, syv(0));
        ctx.lineTo(chartX + chartW, syv(0));
        ctx.stroke();
        ctx.setLineDash([]);

        // Q(t) 曲线
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < Q_X.length; i++) {
            const px = sxv(Q_X[i]!);
            const py = syv(Q_Y[i]!);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // I(t) 曲线
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < I_X.length; i++) {
            const px = sxv(I_X[i]!);
            const py = syv(I_Y[i]!);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // 当前时间竖线
        const curTus = (currentTime % T) * 1e6;
        const curPx = sxv(curTus);
        if (curPx >= chartX && curPx <= chartX + chartW) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(curPx, chartY);
            ctx.lineTo(curPx, chartY + chartH);
            ctx.stroke();
            ctx.setLineDash([]);
            // 当前点
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(curPx, syv(qNow * 1e6), 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(curPx, syv(iNow * 1e3), 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // 图例
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(chartX + 10, chartY - 2, 14, 3);
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('q(t) (μC)', chartX + 28, chartY + 2);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(chartX + 90, chartY - 2, 14, 3);
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        ctx.fillText('i(t) (mA)', chartX + 108, chartY + 2);

        // 轴标签
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('t (μs)', chartX + chartW / 2, chartY + chartH + 18);
    }

    // --- ω 公式 badge ---
    const wText = `ω = 1/√(LC) = ${omega.toExponential(2)} rad/s`;
    ctx.font = 'bold 12px sans-serif';
    const wtw = ctx.measureText(wText).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, width / 2 - wtw / 2 - 10, 30, wtw + 20, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#a855f7';
    ctx.textAlign = 'center';
    ctx.fillText(wText, width / 2, 44);

    // --- HUD ---
    drawHud(
        ctx,
        isDark,
        [
            { label: 't', value: `${(currentTime * 1e6).toFixed(2)} μs` },
            { label: 'L', value: `${L_uh} μH` },
            { label: 'C', value: `${C_pf} pF` },
            { label: 'f', value: `${(f / 1e3).toFixed(2)} kHz` },
            { label: 'T', value: `${(T * 1e6).toFixed(2)} μs` },
            { label: 'E_total', value: `${(E_total * 1e6).toFixed(3)} μJ` }
        ],
        { boxW: 220 }
    );

    drawInfoBar(
        ctx,
        width,
        height,
        `L=${L_uh}μH  C=${C_pf}pF  f=${(f / 1e3).toFixed(2)}kHz  T=${(T * 1e6).toFixed(2)}μs  Q0=${Q0_uc}μC  Im=${(Im * 1e3).toFixed(2)}mA`,
        isDark,
        { height: 22, yOffset: 34 }
    );

    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}

/**
 * 热学场景渲染模块 — 选必三 第四章 热力学定律
 *
 * 场景列表：
 *   - drawHeatTransferScene
 *   - drawJouleMechanicalScene
 *   - drawJouleElectricalScene
 *   - drawAdiabaticCompressionScene
 *   - drawEnergyTransformationScene
 *   - drawPerpetuumMobileScene
 *   - drawHeatDirectionScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import {
    roundRectPath,
    clearScene,
    drawTitle,
    drawHud,
    drawInfoBar,
    drawEmptyState,
    seededRand,
    drawMiniChart,
    drawThermalArrow,
    drawEnergyBar
} from './renderingUtils';

export interface ThermalSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

function drawHeatTransferPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    isDark: boolean,
    title: string,
    color: string,
    formula: string,
    desc: string,
    drawFn: () => void
): void {
    // 背景
    ctx.fillStyle = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.5)';
    roundRectPath(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#e2e8f0';
    ctx.lineWidth = 1;
    roundRectPath(ctx, x, y, w, h, 6);
    ctx.stroke();

    // 标题
    ctx.fillStyle = color;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x + 10, y + 6);

    // 公式
    ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(formula, x + 80, y + 6);

    // 描述
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText(desc, x + 80, y + 20);

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    // 绘制内容
    drawFn();
}

export function drawHeatTransferScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const modeNum = params['mode'] ?? 0;
    const modeLabel = modeNum === 1 ? '对流' : modeNum === 2 ? '辐射' : '传导';
    const Tenv = params['ambientTemp'] ?? 350;
    const T0 = params['initialTemp'] ?? 300;

    drawTitle(ctx, `热传递 (三种模式对比) — 当前: ${modeLabel}`, w, isDark, { size: 18, y: 28 });

    const panelW = w - 60;
    const panelX = 30;
    const panelH = h * 0.18;
    const panelGap = 10;

    // ========== 上: 热传导 ==========
    const condY = 55;
    drawHeatTransferPanel(
        ctx,
        panelX,
        condY,
        panelW,
        panelH,
        isDark,
        '热传导',
        '#ef4444',
        'Q̇ = k·A·ΔT / L',
        '分子碰撞传递动能',
        () => {
            // 沿棒的温度剖面
            const barX = panelX + 20;
            const barW = panelW * 0.55;
            const barY = condY + panelH * 0.55;
            const barH = 12;
            // 温度剖面 (线性)
            const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
            grad.addColorStop(0, '#ef4444');
            grad.addColorStop(1, '#3b82f6');
            ctx.fillStyle = grad;
            ctx.fillRect(barX, barY, barW, barH);
            ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barW, barH);
            // 分子振动示意
            const nMol = 12;
            for (let i = 0; i < nMol; i++) {
                const mx = barX + (i / (nMol - 1)) * barW;
                const t = i / (nMol - 1);
                const amp = 3 + t * 5;
                const my = barY - 8 + Math.sin(currentTime * 3 + i) * amp;
                ctx.fillStyle = `rgb(${Math.round(239 - t * 180)},${Math.round(68 + t * 60)},${Math.round(68 + t * 130)})`;
                ctx.beginPath();
                ctx.arc(mx, my, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            // 标签
            ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`T_hot=${T0}K`, barX, barY - 14);
            ctx.fillText(`T_env=${Tenv}K`, barX + barW, barY - 14);
            ctx.textAlign = 'left';
        }
    );

    // ========== 中: 热对流 ==========
    const convY = condY + panelH + panelGap;
    drawHeatTransferPanel(
        ctx,
        panelX,
        convY,
        panelW,
        panelH,
        isDark,
        '热对流',
        '#f59e0b',
        'Q̇ = h·A·ΔT',
        '流体运动传热',
        () => {
            // 容器
            const boxX = panelX + 20;
            const boxW = panelW * 0.55;
            const boxY = convY + 20;
            const boxH = panelH - 30;
            ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
            ctx.lineWidth = 1;
            ctx.strokeRect(boxX, boxY, boxW, boxH);
            // 流体粒子 (红色上升/蓝色下沉)
            const fluidN = 24;
            for (let i = 0; i < fluidN; i++) {
                const seed = i * 11 + currentTime * 0.8;
                const px = boxX + 5 + seededRand(seed) * (boxW - 10);
                const py = boxY + 5 + seededRand(seed + 50) * (boxH - 10);
                const isHot = seededRand(seed + 100) > 0.5;
                ctx.fillStyle = isHot ? '#ef4444' : '#3b82f6';
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fill();
                // 速度方向
                const vy = isHot ? -8 : 8;
                ctx.strokeStyle = isHot ? '#ef4444' : '#3b82f6';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px, py + vy);
                ctx.stroke();
            }
            // 底部加热
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(boxX, boxY + boxH - 4, boxW, 4);
            ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('加热', boxX + boxW / 2, boxY + boxH + 12);
            ctx.textAlign = 'left';
        }
    );

    // ========== 下: 热辐射 ==========
    const radY = convY + panelH + panelGap;
    drawHeatTransferPanel(
        ctx,
        panelX,
        radY,
        panelW,
        panelH,
        isDark,
        '热辐射',
        '#a855f7',
        'Q̇ = ε·σ·A·(T⁴ − T_env⁴)',
        '电磁波 (无需介质)',
        () => {
            // 辐射源
            const srcX = panelX + 60;
            const srcY = radY + panelH / 2;
            const srcR = 14;
            const srcGrad = ctx.createRadialGradient(srcX - 3, srcY - 3, 1, srcX, srcY, srcR);
            srcGrad.addColorStop(0, '#fbbf24');
            srcGrad.addColorStop(0.6, '#ef4444');
            srcGrad.addColorStop(1, '#7f1d1d');
            ctx.fillStyle = srcGrad;
            ctx.beginPath();
            ctx.arc(srcX, srcY, srcR, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('T', srcX, srcY);
            ctx.textBaseline = 'alphabetic';
            ctx.textAlign = 'left';

            // 波纹 (电磁波)
            const waveN = 4;
            for (let i = 0; i < waveN; i++) {
                const t = (currentTime * 0.6 + i / waveN) % 1;
                const r = srcR + t * 80;
                const alpha = 1 - t;
                ctx.strokeStyle = `rgba(168,85,247,${alpha * 0.7})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(srcX, srcY, r, -Math.PI / 3, Math.PI / 3);
                ctx.stroke();
            }
            // 辐射方向箭头
            const arrowX = srcX + 60;
            const arrowY = srcY;
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(srcX + srcR + 5, srcY);
            ctx.lineTo(arrowX, arrowY);
            ctx.stroke();
            ctx.fillStyle = '#a855f7';
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX - 8, arrowY - 4);
            ctx.lineTo(arrowX - 8, arrowY + 4);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('电磁波', arrowX, arrowY - 10);
            ctx.textAlign = 'left';
        }
    );

    // ========== 底部: Qdot-t 对比曲线 ==========
    const chartY = radY + panelH + panelGap + 6;
    const chartH = h - chartY - 50;
    if (chartH > 60) {
        // 从 simulationResult 获取数据
        const chartT = simulationResult?.charts?.x_t;
        const chartQ = simulationResult?.charts?.y_t;
        if (chartT && chartT.points.length > 0 && chartQ && chartQ.points.length > 0) {
            const xs = chartT.points.map(p => p.x);
            const ysT = chartT.points.map(p => p.y);
            const ysQ = chartQ.points.map(p => p.y);
            drawMiniChart({
                ctx,
                x: panelX,
                y: chartY,
                w: panelW,
                h: chartH,
                xs,
                ys: ysT,
                isDark,
                lineColor: '#ef4444',
                label: 'T-t 温度曲线',
                xLabel: '时间 t (s)',
                yLabel: '温度 T (K)'
            });
            // 叠加 Qdot 曲线 (用右侧 y 轴)
            // 简化: 在同一图上用不同颜色画 Qdot (归一化)
            const qMax = Math.max(...ysQ);
            const tMax = Math.max(...ysT);
            if (qMax > 0 && tMax > 0) {
                const xMin = xs[0]!;
                const xMax = xs[xs.length - 1]!;
                let yMinT = Math.min(...ysT);
                let yMaxT = Math.max(...ysT);
                if (yMaxT - yMinT < 1e-9) {
                    yMaxT = yMinT + 1;
                }
                const padY = (yMaxT - yMinT) * 0.12;
                yMinT -= padY;
                yMaxT += padY;
                const sx2 = (xv: number) => panelX + ((xv - xMin) / (xMax - xMin)) * panelW;
                const sy2 = (yv: number) => chartY + chartH - ((yv - yMinT) / (yMaxT - yMinT)) * chartH;
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 3]);
                ctx.beginPath();
                for (let i = 0; i < xs.length; i++) {
                    // 将 Qdot 归一化到 T 范围
                    const qNorm = yMinT + (ysQ[i]! / qMax) * (yMaxT - yMinT);
                    const px = sx2(xs[i]!);
                    const py = sy2(qNorm);
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();
                ctx.setLineDash([]);
                // 图例
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(panelX + panelW - 100, chartY + 4, 12, 3);
                ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('T (温度)', panelX + panelW - 84, chartY + 10);
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(panelX + panelW - 100, chartY + 16, 12, 3);
                ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
                ctx.fillText('Q̇ (热流)', panelX + panelW - 84, chartY + 22);
            }
        }
    }

    // HUD
    drawHud(
        ctx,
        isDark,
        [
            { label: 't', value: `${currentTime.toFixed(2)} s` },
            { label: 'T0', value: `${T0} K` },
            { label: 'Tenv', value: `${Tenv} K` },
            { label: 'mode', value: modeLabel }
        ],
        { boxW: 200, lineH: 16 }
    );

    drawInfoBar(ctx, w, h, `T0=${T0}K  Tenv=${Tenv}K  mode=${modeLabel}  傅里叶/牛顿/斯忒藩-玻尔兹曼`, isDark, {
        height: 22,
        yOffset: 34
    });

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawJouleMechanicalScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '机械功改变内能', w, isDark, { size: 18, y: 28 });
    const mass = params['mass'] ?? 5;
    const height = params['height'] ?? 1.5;
    const drops = params['drops'] ?? 100;
    const waterMass = params['waterMass'] ?? 0.5;
    const c = params['specificHeat'] ?? 4184;
    const work = mass * 9.8 * height * drops;
    const deltaT = work / (waterMass * c);
    const tankX = w * 0.42;
    const tankY = h * 0.36;
    ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.lineWidth = 3;
    roundRectPath(ctx, tankX, tankY, 160, 120, 8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(14,165,233,0.34)';
    ctx.fillRect(tankX + 8, tankY + 48, 144, 64);
    for (let i = 0; i < 8; i++) {
        const a = currentTime * 4 + i;
        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(tankX + 80, tankY + 60);
        ctx.lineTo(tankX + 80 + Math.cos(a) * 55, tankY + 82 + Math.sin(a) * 25);
        ctx.stroke();
    }
    drawEnergyBar(ctx, w * 0.18, h * 0.34, 46, 130, 1, '#f59e0b', 'mgh', isDark);
    drawThermalArrow(ctx, w * 0.25, h * 0.48, tankX - 16, tankY + 58, '#ef4444', 'W');
    drawHud(
        ctx,
        isDark,
        [
            { label: 'W', value: `${work.toFixed(0)} J` },
            { label: 'm_water', value: `${waterMass.toFixed(2)} kg` },
            { label: 'dT', value: `${deltaT.toFixed(2)} K` }
        ],
        { boxW: 200, lineH: 16 }
    );
    drawInfoBar(ctx, w, h, '重物下落做功带动叶片搅拌, 机械功转化为水的内能', isDark, { height: 22, yOffset: 34 });
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawJouleElectricalScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '电功改变内能', w, isDark, { size: 18, y: 28 });
    const voltage = params['voltage'] ?? 12;
    const resistance = params['resistance'] ?? 10;
    const time = params['time'] ?? 300;
    const waterMass = params['waterMass'] ?? 0.5;
    const power = (voltage * voltage) / Math.max(resistance, 1e-6);
    const heat = power * time;
    const deltaT = heat / (waterMass * 4184);
    const cx = w * 0.52;
    const cy = h * 0.54;
    ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.lineWidth = 3;
    roundRectPath(ctx, cx - 95, cy - 80, 190, 150, 10);
    ctx.stroke();
    ctx.fillStyle = 'rgba(14,165,233,0.34)';
    ctx.fillRect(cx - 86, cy - 18, 172, 80);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
        const x = cx - 60 + i * 5;
        const y = cy + 18 + Math.sin(i * Math.PI) * 12;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    drawThermalArrow(ctx, w * 0.22, cy, cx - 102, cy, '#f59e0b', 'I');
    drawHud(
        ctx,
        isDark,
        [
            { label: 'P', value: `${power.toFixed(1)} W` },
            { label: 'Q', value: `${heat.toFixed(0)} J` },
            { label: 'dT', value: `${deltaT.toFixed(2)} K` }
        ],
        { boxW: 200, lineH: 16 }
    );
    drawInfoBar(ctx, w, h, '焦耳定律 Q = I^2Rt = U^2t/R, 电功转化为水的内能', isDark, { height: 22, yOffset: 34 });
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawAdiabaticCompressionScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '绝热压缩', w, isDark, { size: 18, y: 28 });
    const t0 = params['initialTemp'] ?? 300;
    const ratio = params['compressionRatio'] ?? 9;
    const gamma = 1.4;
    const t2 = t0 * ratio ** (gamma - 1);
    const progress = Math.min(1, currentTime / 5);
    const cylX = w * 0.35;
    const cylY = h * 0.25;
    const cylW = w * 0.28;
    const cylH = h * 0.48;
    ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.lineWidth = 3;
    roundRectPath(ctx, cylX, cylY, cylW, cylH, 8);
    ctx.stroke();
    const pistonY = cylY + 18 + progress * (cylH * 0.62);
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    roundRectPath(ctx, cylX - 12, pistonY, cylW + 24, 20, 4);
    ctx.fill();
    ctx.fillStyle = `rgba(239,68,68,${0.14 + progress * 0.46})`;
    roundRectPath(ctx, cylX + 8, pistonY + 24, cylW - 16, cylY + cylH - pistonY - 34, 6);
    ctx.fill();
    drawThermalArrow(ctx, cylX + cylW / 2, cylY - 28, cylX + cylW / 2, pistonY - 6, '#ef4444', '压缩');
    drawHud(
        ctx,
        isDark,
        [
            { label: 'T0', value: `${t0.toFixed(0)} K` },
            { label: 'V1/V2', value: ratio.toFixed(1) },
            { label: 'T2', value: `${t2.toFixed(0)} K` }
        ],
        { boxW: 200, lineH: 16 }
    );
    drawInfoBar(ctx, w, h, '绝热过程近似 Q=0, TV^(gamma-1)=常量, 快速压缩可显著升温', isDark, {
        height: 22,
        yOffset: 34
    });
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawEnergyTransformationScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '能量转化与守恒', w, isDark, { size: 18, y: 28 });
    const input = params['inputEnergy'] ?? 100;
    const efficiency = params['efficiency'] ?? 0.85;
    const useful = input * efficiency;
    const loss = input - useful;
    const x = w * 0.18;
    const y = h * 0.46;
    drawEnergyBar(ctx, x, y - 90, 54, 130, 1, '#3b82f6', '输入', isDark);
    drawThermalArrow(ctx, x + 72, y - 25, w * 0.47, y - 25, '#22c55e', '转化');
    drawEnergyBar(ctx, w * 0.52, y - 90, 54, 130, efficiency, '#22c55e', '有用', isDark);
    drawEnergyBar(ctx, w * 0.66, y - 90, 54, 130, loss / input, '#ef4444', '损失', isDark);
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${input.toFixed(0)} J = ${useful.toFixed(0)} J + ${loss.toFixed(0)} J`, w * 0.5, h * 0.75);
    drawHud(
        ctx,
        isDark,
        [
            { label: 'Ein', value: `${input.toFixed(0)} J` },
            { label: 'eta', value: `${(efficiency * 100).toFixed(0)}%` },
            { label: 'loss', value: `${loss.toFixed(1)} J` }
        ],
        { boxW: 200, lineH: 16 }
    );
    drawInfoBar(ctx, w, h, '能量不会凭空产生或消失, 只会从一种形式转化为另一种形式', isDark, {
        height: 22,
        yOffset: 34
    });
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawPerpetuumMobileScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '永动机不可能', w, isDark, { size: 18, y: 28 });
    const hot = params['hotTemp'] ?? 600;
    const cold = params['coldTemp'] ?? 300;
    const carnot = 1 - cold / Math.max(hot, 1e-6);
    const cx = w * 0.5;
    const cy = h * 0.5;
    ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 78, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
        const a = currentTime * 1.5 + (i * Math.PI * 2) / 8;
        ctx.strokeStyle = i % 2 === 0 ? '#ef4444' : '#3b82f6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 78, cy + Math.sin(a) * 78);
        ctx.stroke();
    }
    drawThermalArrow(ctx, w * 0.2, h * 0.35, cx - 86, cy - 36, '#ef4444', 'Qh');
    drawThermalArrow(ctx, cx + 86, cy + 36, w * 0.78, h * 0.68, '#3b82f6', 'Qc 必有');
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('×', cx, cy + 14);
    drawHud(
        ctx,
        isDark,
        [
            { label: 'Th', value: `${hot.toFixed(0)} K` },
            { label: 'Tc', value: `${cold.toFixed(0)} K` },
            { label: 'eta_max', value: `${(carnot * 100).toFixed(1)}%` }
        ],
        { boxW: 200, lineH: 16 }
    );
    drawInfoBar(ctx, w, h, '第二类永动机违反热力学第二定律: 单一热源不可能完全变成功', isDark, {
        height: 22,
        yOffset: 34
    });
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawHeatDirectionScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '热力学方向性', w, isDark, { size: 18, y: 28 });
    const hot = params['hotTemp'] ?? 400;
    const cold = params['coldTemp'] ?? 250;
    const k = params['thermalConductivity'] ?? 5;
    const qRate = k * (hot - cold);
    const leftX = w * 0.22;
    const rightX = w * 0.68;
    const y = h * 0.46;
    ctx.fillStyle = 'rgba(239,68,68,0.55)';
    roundRectPath(ctx, leftX, y, 110, 120, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(59,130,246,0.55)';
    roundRectPath(ctx, rightX, y, 110, 120, 8);
    ctx.fill();
    ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${hot.toFixed(0)} K`, leftX + 55, y + 65);
    ctx.fillText(`${cold.toFixed(0)} K`, rightX + 55, y + 65);
    const pulse = Math.sin(currentTime * 4) * 8;
    drawThermalArrow(ctx, leftX + 126, y + 60, rightX - 16 + pulse, y + 60, '#f59e0b', '热流');
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    drawThermalArrow(ctx, rightX - 16, y + 98, leftX + 126, y + 98, '#ef4444', '自发反向 ×');
    ctx.setLineDash([]);
    drawHud(
        ctx,
        isDark,
        [
            { label: 'dT', value: `${(hot - cold).toFixed(0)} K` },
            { label: 'k', value: `${k.toFixed(1)}` },
            { label: 'Qdot', value: `${qRate.toFixed(0)} arb` }
        ],
        { boxW: 200, lineH: 16 }
    );
    drawInfoBar(ctx, w, h, '热量自发地从高温物体传到低温物体, 反向过程需要外界做功', isDark, {
        height: 22,
        yOffset: 34
    });
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

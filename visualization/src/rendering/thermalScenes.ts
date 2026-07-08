/**
 * 选必三「热学 / 分子 / 热力学」场景渲染模块
 *
 * 包含 8 个可视化场景 (Stage J5 new loop):
 *   1. drawDiffusionScene        — 扩散现象 (分子粒子随机运动 + 浓度梯度)
 *   2. drawBrownianScene         — 布朗运动 (大颗粒抖动 + 小颗粒随机撞击 + 位移-时间图)
 *   3. drawMeltingCurveScene     — 熔化/凝固曲线 (升温段 + 平台段 + 再升温)
 *   4. drawHeatTransferScene     — 热传递三种模式对比 (传导/对流/辐射 T-t + Qdot-t)
 *   5. drawSurfaceTensionScene   — 表面张力 (液膜收缩 + 吊环受力 + F-sigma 曲线)
 *   6. drawCapillaryScene        — 毛细现象 (弯月面 + 毛细上升/下降 + Jurin 公式)
 *   7. drawLiquidCrystalScene    — 液晶 (向列型分子排列 + 透射率 + 阈值效应)
 *
 * 设计原则 (沿用 nuclearScenes.ts / chapter2Scenes.ts):
 *   - 纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 *   - 每个场景函数负责完整渲染 (背景 + 动态元素 + HUD)
 *   - 共享工具函数在本文件内复用
 *
 * 引用 sceneId (来自 sceneRegistry.ts):
 *   - 'diffusion'
 *   - 'brownian-motion'
 *   - 'melting-curve'
 *   - 'heat-transfer'
 *   - 'surface-tension'
 *   - 'capillary'
 *   - 'liquid-crystal'
 */

import type { SimulationResult } from 'physics-core';

// ========== 共享类型 ==========

export interface ThermalSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

// ========== 共享工具函数 ==========

function clearScene(ctx: CanvasRenderingContext2D, w: number, h: number, isDark: boolean): void {
    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);
}

function drawTitle(ctx: CanvasRenderingContext2D, title: string, w: number, isDark: boolean): void {
    ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, 28);
    ctx.textAlign = 'left';
}

function drawHud(ctx: CanvasRenderingContext2D, isDark: boolean, rows: Array<{ label: string; value: string }>): void {
    if (rows.length === 0) return;
    const padding = 8;
    const lineH = 16;
    const boxH = rows.length * lineH + padding * 2;
    const boxW = 200;

    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.85)';
    roundRectPath(ctx, 8, 8, boxW, boxH, 6);
    ctx.fill();

    rows.forEach((row, i) => {
        const y = 8 + padding + i * lineH;
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${row.label} = ${row.value}`, 16, y);
    });
    ctx.textBaseline = 'alphabetic';
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
    ctx.textBaseline = 'alphabetic';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, width / 2 - tw / 2 - 8, height - 34, tw + 16, 22, 4);
    ctx.fill();
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.fillText(text, width / 2, height - 18);
}

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

/** 绘制"点击运行仿真"提示 */
function drawEmptyState(ctx: CanvasRenderingContext2D, width: number, height: number, isDark: boolean): void {
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('点击「运行仿真」开始', width / 2, height / 2);
    ctx.textBaseline = 'alphabetic';
}

/** 伪随机数 (固定种子, 每帧一致) */
function seededRand(seed: number): number {
    const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
}

/** 绘制一个 mini 折线图 (带坐标轴) */
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
    xLabel?: string;
    yLabel?: string;
    showPeakX?: number;
    peakLabel?: string;
    fillUnder?: string;
}): void {
    const { ctx, x, y, w, h, xs, ys, isDark, label, xLabel, yLabel, showPeakX, peakLabel, fillUnder } = opts;
    if (xs.length === 0 || ys.length === 0) return;

    const xMin = xs[0]!;
    const xMax = xs[xs.length - 1]!;
    let yMin = Math.min(...ys);
    let yMax = Math.max(...ys);
    if (yMax - yMin < 1e-9) {
        yMax = yMin + 1;
    }
    const padY = (yMax - yMin) * 0.12;
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
    for (let i = 1; i < 4; i++) {
        const gx = x + (w * i) / 4;
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, y + h);
        ctx.stroke();
    }

    // 填充区域
    if (fillUnder) {
        ctx.fillStyle = fillUnder;
        ctx.beginPath();
        ctx.moveTo(sx(xs[0]!), y + h);
        for (let i = 0; i < xs.length; i++) ctx.lineTo(sx(xs[i]!), sy(ys[i]!));
        ctx.lineTo(sx(xs[xs.length - 1]!), y + h);
        ctx.closePath();
        ctx.fill();
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

    // 峰值竖线
    if (showPeakX !== undefined) {
        const px = sx(showPeakX);
        if (px >= x && px <= x + w) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(px, y);
            ctx.lineTo(px, y + h);
            ctx.stroke();
            ctx.setLineDash([]);
            if (peakLabel) {
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(peakLabel, px, y - 4);
            }
        }
    }

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
        ctx.textBaseline = 'top';
        ctx.fillText(label, x + 4, y + h + 4);
    }
    if (xLabel) {
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(xLabel, x + w / 2, y + h + 16);
    }
    if (yLabel) {
        ctx.save();
        ctx.translate(x - 28, y + h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();
    }
}

// =====================================================================
// 场景 1: 扩散现象 (浓度梯度 + 分子随机运动)
// =====================================================================

/**
 * 绘制扩散场景.
 *   - 顶部: 分子粒子随机运动 (左侧高浓度 → 右侧低浓度)
 *   - 中部: 颜色梯度条 (左→右 显示浓度)
 *   - 底部: 浓度分布曲线 (取自 simulationResult.charts.x_t)
 *   - 标注: 菲克第一定律 J = -D·dC/dx
 */
export function drawDiffusionScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const T = params['temperature'] ?? 300;
    const isLiquid = (params['medium'] ?? 0) === 1;
    const N = params['particleCount'] ?? 500;
    const D = isLiquid ? 1e-9 * Math.pow(T / 300, 1.5) : 1e-5 * Math.pow(T / 300, 1.5);

    drawTitle(ctx, '扩散现象 (浓度梯度)', w, isDark);

    // 粒子区域
    const partY0 = 50;
    const partH = h * 0.32;
    const partX0 = 30;
    const partW = w - 60;

    // 粒子区域背景
    ctx.fillStyle = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.5)';
    roundRectPath(ctx, partX0, partY0, partW, partH, 6);
    ctx.fill();

    // 粒子 (随时间向右扩散)
    const visibleN = Math.min(200, N);
    const spreadT = Math.max(0.1, currentTime);
    const spreadSigma = Math.sqrt(2 * D * spreadT) * 1e6; // μm
    const maxSpread = 4;
    const normSpread = Math.min(maxSpread, spreadSigma / 50);

    for (let i = 0; i < visibleN; i++) {
        const seed = i + 1;
        // 初始位置: 左侧高浓度
        const initX = partX0 + seededRand(seed) * partW * 0.15;
        const initY = partY0 + seededRand(seed + 1000) * partH;
        // 扩散: 向右随机游走
        const drift = normSpread * partW * 0.05 * seededRand(seed + 2000);
        const jitterX = (seededRand(seed + 3000) - 0.5) * partW * 0.04 * normSpread;
        const jitterY = (seededRand(seed + 4000) - 0.5) * partH * 0.15;
        const px = Math.max(partX0, Math.min(partX0 + partW, initX + drift + jitterX));
        const py = Math.max(partY0, Math.min(partY0 + partH, initY + jitterY));

        // 颜色: 左侧深色, 右侧浅色
        const t = (px - partX0) / partW;
        const r = Math.round(59 + t * (148 - 59));
        const g = Math.round(130 + t * (163 - 130));
        const b = Math.round(246 + t * (184 - 246));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
    }

    // 浓度梯度条
    const barY = partY0 + partH + 16;
    const barH = 14;
    const barGrad = ctx.createLinearGradient(partX0, 0, partX0 + partW, 0);
    barGrad.addColorStop(0, 'rgba(59,130,246,0.85)');
    barGrad.addColorStop(0.5, 'rgba(99,102,241,0.45)');
    barGrad.addColorStop(1, 'rgba(148,163,184,0.15)');
    ctx.fillStyle = barGrad;
    roundRectPath(ctx, partX0, barY, partW, barH, 4);
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.4)' : 'rgba(100,116,139,0.25)';
    ctx.lineWidth = 1;
    roundRectPath(ctx, partX0, barY, partW, barH, 4);
    ctx.stroke();

    // 浓度条标签
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('高浓度', partX0, barY - 2);
    ctx.textAlign = 'right';
    ctx.fillText('低浓度', partX0 + partW, barY - 2);
    ctx.textAlign = 'center';
    ctx.fillText('浓度梯度 →', partX0 + partW / 2, barY - 2);
    ctx.textBaseline = 'alphabetic';

    // 菲克第一定律标注
    const lawY = barY + barH + 18;
    ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('菲克第一定律:  J = −D · dC/dx', w / 2, lawY);
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText(`D = ${D.toExponential(2)} m²/s  (${isLiquid ? '液体' : '气体'}, T=${T}K)`, w / 2, lawY + 16);
    ctx.textAlign = 'left';

    // 底部: 浓度分布曲线
    const chartY = lawY + 36;
    const chartH = h - chartY - 50;
    if (chartH > 60) {
        const chart = simulationResult?.charts?.x_t;
        if (chart && chart.points.length > 0) {
            const xs = chart.points.map(p => p.x);
            const ys = chart.points.map(p => p.y);
            drawMiniChart({
                ctx,
                x: partX0,
                y: chartY,
                w: partW,
                h: chartH,
                xs,
                ys,
                isDark,
                lineColor: '#3b82f6',
                label: 'C(x) 高斯分布',
                xLabel: chart.xLabel ?? '位置 x (μm)',
                yLabel: chart.yLabel ?? '浓度 C (a.u.)',
                fillUnder: 'rgba(59,130,246,0.18)'
            });
        }
    }

    // HUD
    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(2)} s` },
        { label: 'T', value: `${T} K` },
        { label: 'D', value: `${D.toExponential(1)} m²/s` },
        { label: 'N', value: `${N}` }
    ]);

    drawInfoBar(
        ctx,
        w,
        h,
        `T=${T}K  medium=${isLiquid ? '液体' : '气体'}  D=${D.toExponential(2)} m²/s  N=${N}`,
        isDark
    );

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

// =====================================================================
// 场景 2: 布朗运动 (大颗粒抖动 + 小颗粒随机撞击)
// =====================================================================

/**
 * 绘制布朗运动场景.
 *   - 顶部: 大颗粒 (布朗粒子) 在 canvas 中心附近抖动 + 轨迹尾巴
 *   - 周围: 多个小颗粒 (液体分子) 随机运动
 *   - 底部: 位移-时间图 (取自 simulationResult.charts.x_t)
 *   - 标注: 爱因斯坦公式 ⟨x²⟩ = 2Dt
 */
export function drawBrownianScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const rUm = params['particleRadius'] ?? 1.0;
    const T = params['liquidTemp'] ?? 300;
    const eta = params['fluidViscosity'] ?? 1.0;
    const nParts = params['nParticles'] ?? 10;
    const kB = 1.38e-23;
    const D = (kB * T) / (6 * Math.PI * eta * 1e-3 * rUm * 1e-6);

    drawTitle(ctx, '布朗运动 (微粒抖动)', w, isDark);

    // 粒子区域
    const partY0 = 50;
    const partH = h * 0.36;
    const partX0 = 30;
    const partW = w - 60;

    // 背景
    ctx.fillStyle = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.5)';
    roundRectPath(ctx, partX0, partY0, partW, partH, 6);
    ctx.fill();

    const cx = partX0 + partW / 2;
    const cy = partY0 + partH / 2;

    // 大颗粒轨迹 (最近 80 个位置)
    const trailLen = 80;
    const trail: Array<{ x: number; y: number }> = [];
    for (let i = trailLen; i >= 0; i--) {
        const tt = currentTime - i * 0.05;
        if (tt < 0) continue;
        const seed = tt * 7 + 1;
        const dx = (seededRand(seed) - 0.5) * partW * 0.18;
        const dy = (seededRand(seed + 100) - 0.5) * partH * 0.4;
        trail.push({ x: cx + dx, y: cy + dy });
    }
    // 轨迹线
    for (let i = 0; i < trail.length - 1; i++) {
        const alpha = 0.05 + 0.5 * (i / trail.length);
        ctx.strokeStyle = `rgba(249,115,22,${alpha})`;
        ctx.lineWidth = 1 + 1.5 * (i / trail.length);
        ctx.beginPath();
        ctx.moveTo(trail[i]!.x, trail[i]!.y);
        ctx.lineTo(trail[i + 1]!.x, trail[i + 1]!.y);
        ctx.stroke();
    }

    // 大颗粒 (布朗粒子)
    const bigR = 18;
    const bigX = trail.length > 0 ? trail[trail.length - 1]!.x : cx;
    const bigY = trail.length > 0 ? trail[trail.length - 1]!.y : cy;
    ctx.fillStyle = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(bigX + 2, bigY + 4, bigR, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    const bigGrad = ctx.createRadialGradient(bigX - 5, bigY - 5, 2, bigX, bigY, bigR);
    bigGrad.addColorStop(0, '#fdba74');
    bigGrad.addColorStop(0.5, '#f97316');
    bigGrad.addColorStop(1, '#c2410c');
    ctx.fillStyle = bigGrad;
    ctx.beginPath();
    ctx.arc(bigX, bigY, bigR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9a3412';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('布朗粒子', bigX, bigY);
    ctx.textBaseline = 'alphabetic';

    // 小颗粒 (液体分子)
    const smallN = Math.min(40, nParts * 4);
    for (let i = 0; i < smallN; i++) {
        const seed = i * 13 + currentTime * 3;
        const angle = seededRand(seed) * Math.PI * 2;
        const dist = 30 + seededRand(seed + 50) * Math.min(partW, partH) * 0.4;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;
        if (px < partX0 || px > partX0 + partW || py < partY0 || py > partY0 + partH) continue;
        ctx.fillStyle = isDark ? 'rgba(56,189,248,0.7)' : 'rgba(14,165,233,0.6)';
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // 标注: 爱因斯坦公式
    const lawY = partY0 + partH + 22;
    ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('爱因斯坦公式:  ⟨x²⟩ = 2·D·t', w / 2, lawY);
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText(`D = kT/(6πηr) = ${D.toExponential(2)} m²/s  (T=${T}K, η=${eta}cP, r=${rUm}μm)`, w / 2, lawY + 16);
    ctx.textAlign = 'left';

    // 底部: 位移-时间图
    const chartY = lawY + 36;
    const chartH = h - chartY - 50;
    if (chartH > 60) {
        const chart = simulationResult?.charts?.x_t;
        if (chart && chart.points.length > 0) {
            const xs = chart.points.map(p => p.x);
            const ys = chart.points.map(p => p.y);
            drawMiniChart({
                ctx,
                x: partX0,
                y: chartY,
                w: partW,
                h: chartH,
                xs,
                ys,
                isDark,
                lineColor: '#f97316',
                label: 'x(t) 位移-时间',
                xLabel: '时间 t (s)',
                yLabel: 'x 位置 (μm)'
            });
        }
    }

    // HUD
    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(2)} s` },
        { label: 'T', value: `${T} K` },
        { label: 'D', value: `${D.toExponential(1)} m²/s` },
        { label: 'r', value: `${rUm} μm` }
    ]);

    drawInfoBar(ctx, w, h, `r=${rUm}μm  T=${T}K  η=${eta}cP  D=${D.toExponential(2)} m²/s  N=${nParts}`, isDark);

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

// =====================================================================
// 场景 3: 熔化/凝固曲线 (T-t 平台段)
// =====================================================================

/**
 * 绘制熔化曲线场景.
 *   - 主图: T-t 曲线 (升温段 + 平台段 + 再升温)
 *   - 平台段用蓝色阴影标注 (固液共存)
 *   - 左下方: 固态晶体格点示意
 *   - 右下方: 液态无序运动示意
 *   - 标注: 熔点/凝固点
 */
export function drawMeltingCurveScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const isNonCrystal = (params['medium'] ?? 0) === 1;
    const Tm = params['meltingPoint'] ?? 50;
    const heatRate = params['heatingRate'] ?? 5;
    const durationMin = params['duration'] ?? 20;

    drawTitle(ctx, isNonCrystal ? '非晶体熔化 (连续软化)' : '晶体熔化/凝固曲线 (T-t)', w, isDark);

    // 主图区域
    const chartX = 60;
    const chartY = 60;
    const chartW = w - 90;
    const chartH = h * 0.45;

    // 背景
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.65)';
    roundRectPath(ctx, chartX - 16, chartY - 8, chartW + 32, chartH + 16, 8);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#e2e8f0';
    ctx.lineWidth = 1;
    roundRectPath(ctx, chartX - 16, chartY - 8, chartW + 32, chartH + 16, 8);
    ctx.stroke();

    // 数据范围
    const tMax = durationMin;
    const tMin = 0;
    let Tmin = 0;
    let Tmax = Math.max(Tm + 30, heatRate * durationMin);

    // 从 simulationResult 获取数据
    const chart = simulationResult?.charts?.x_t;
    let dataPoints: Array<{ t: number; T: number }> = [];
    if (chart && chart.points.length > 0) {
        dataPoints = chart.points.map(p => ({ t: p.x, T: p.y }));
        const allT = dataPoints.map(p => p.T);
        Tmin = Math.min(...allT);
        Tmax = Math.max(...allT);
        const pad = (Tmax - Tmin) * 0.1;
        Tmin -= pad;
        Tmax += pad;
    } else {
        // 解析构造
        const N = 80;
        for (let i = 0; i <= N; i++) {
            const t = (i / N) * tMax;
            let T: number;
            if (isNonCrystal) {
                // 非线性连续上升
                T = heatRate * t * 0.5 + 5 * Math.sin(t / 3);
            } else {
                // 晶体: 升温 → 平台 → 升温
                const tMeltStart = Math.max(2, (Tm - Tmin) / heatRate);
                const tMeltEnd = tMeltStart + 8;
                if (t < tMeltStart) T = heatRate * t * 0.5;
                else if (t < tMeltEnd) T = Tm;
                else T = Tm + heatRate * (t - tMeltEnd) * 0.3;
            }
            dataPoints.push({ t, T });
        }
    }

    const sx = (tv: number) => chartX + ((tv - tMin) / (tMax - tMin)) * chartW;
    const sy = (Tv: number) => chartY + chartH - ((Tv - Tmin) / (Tmax - Tmin)) * chartH;

    // 轴
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(chartX, chartY);
    ctx.lineTo(chartX, chartY + chartH);
    ctx.lineTo(chartX + chartW, chartY + chartH);
    ctx.stroke();

    // y 轴刻度
    ctx.font = '10px monospace';
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
        const Tv = Tmin + (i / 4) * (Tmax - Tmin);
        const py = sy(Tv);
        ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.10)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartX, py);
        ctx.lineTo(chartX + chartW, py);
        ctx.stroke();
        ctx.fillText(`${Tv.toFixed(0)}°`, chartX - 6, py);
    }

    // x 轴刻度
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= 4; i++) {
        const tv = tMin + (i / 4) * (tMax - tMin);
        const px = sx(tv);
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.fillText(`${tv.toFixed(0)}`, px, chartY + chartH + 6);
    }

    // 平台段阴影 (仅晶体)
    if (!isNonCrystal && dataPoints.length > 0) {
        // 找到平台段 (T ≈ Tm)
        const platPoints = dataPoints.filter(p => Math.abs(p.T - Tm) < 1.0);
        if (platPoints.length > 1) {
            const tStart = platPoints[0]!.t;
            const tEnd = platPoints[platPoints.length - 1]!.t;
            const xStart = sx(tStart);
            const xEnd = sx(tEnd);
            ctx.fillStyle = 'rgba(59,130,246,0.18)';
            ctx.fillRect(xStart, chartY, xEnd - xStart, chartH);
            // 平台线
            const platY = sy(Tm);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(xStart, platY);
            ctx.lineTo(xEnd, platY);
            ctx.stroke();
            ctx.setLineDash([]);
            // 熔点标注
            ctx.fillStyle = '#3b82f6';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`熔点/凝固点 Tm=${Tm}°C`, (xStart + xEnd) / 2, platY - 8);
            ctx.textAlign = 'left';
        }
    }

    // T-t 曲线
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < dataPoints.length; i++) {
        const px = sx(dataPoints[i]!.t);
        const py = sy(dataPoints[i]!.T);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // 当前时间指示
    const curT = currentTime % (tMax + 1);
    const curX = sx(curT);
    if (curX >= chartX && curX <= chartX + chartW) {
        ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.5)' : 'rgba(100,116,139,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(curX, chartY);
        ctx.lineTo(curX, chartY + chartH);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 轴标签
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('时间 t (min)', chartX + chartW / 2, chartY + chartH + 32);
    ctx.save();
    ctx.translate(chartX - 40, chartY + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('温度 T (°C)', 0, 0);
    ctx.restore();

    // 底部: 固态/液态示意
    const bottomY = chartY + chartH + 50;
    const bottomH = h - bottomY - 50;
    if (bottomH > 40) {
        const cellW = Math.min(280, (w - 80) / 2);
        const cellY = bottomY;
        const cellH = bottomH;

        // 左: 固态晶体格点
        const leftX = w / 2 - cellW - 10;
        ctx.fillStyle = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.5)';
        roundRectPath(ctx, leftX, cellY, cellW, cellH, 6);
        ctx.fill();
        ctx.strokeStyle = isDark ? '#475569' : '#e2e8f0';
        ctx.lineWidth = 1;
        roundRectPath(ctx, leftX, cellY, cellW, cellH, 6);
        ctx.stroke();
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('固态 (晶格振动)', leftX + cellW / 2, cellY + 14);
        // 格点
        const gridN = 5;
        const gridSpacing = Math.min(cellW, cellH - 30) / (gridN + 1);
        const gridOX = leftX + (cellW - gridSpacing * (gridN - 1)) / 2;
        const gridOY = cellY + 20 + (cellH - 20 - gridSpacing * (gridN - 1)) / 2;
        for (let i = 0; i < gridN; i++) {
            for (let j = 0; j < gridN; j++) {
                const gx = gridOX + i * gridSpacing + Math.sin(currentTime * 2 + i + j) * 1.5;
                const gy = gridOY + j * gridSpacing + Math.cos(currentTime * 2 + i + j) * 1.5;
                ctx.fillStyle = '#60a5fa';
                ctx.beginPath();
                ctx.arc(gx, gy, 3, 0, Math.PI * 2);
                ctx.fill();
                // 键
                if (i < gridN - 1) {
                    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.3)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(gx, gy);
                    ctx.lineTo(gridOX + (i + 1) * gridSpacing, gy);
                    ctx.stroke();
                }
                if (j < gridN - 1) {
                    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.3)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(gx, gy);
                    ctx.lineTo(gx, gridOY + (j + 1) * gridSpacing);
                    ctx.stroke();
                }
            }
        }

        // 右: 液态无序运动
        const rightX = w / 2 + 10;
        ctx.fillStyle = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.5)';
        roundRectPath(ctx, rightX, cellY, cellW, cellH, 6);
        ctx.fill();
        ctx.strokeStyle = isDark ? '#475569' : '#e2e8f0';
        ctx.lineWidth = 1;
        roundRectPath(ctx, rightX, cellY, cellW, cellH, 6);
        ctx.stroke();
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('液态 (无序运动)', rightX + cellW / 2, cellY + 14);
        // 无序粒子
        const liquidN = 18;
        for (let i = 0; i < liquidN; i++) {
            const seed = i * 7 + currentTime * 1.5;
            const px = rightX + 15 + seededRand(seed) * (cellW - 30);
            const py = cellY + 25 + seededRand(seed + 100) * (cellH - 30);
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.textAlign = 'left';
    }

    // HUD
    drawHud(ctx, isDark, [
        { label: 't', value: `${(currentTime % (tMax + 1)).toFixed(1)} min` },
        { label: 'Tm', value: `${Tm} °C` },
        { label: 'rate', value: `${heatRate} °C/min` },
        { label: 'type', value: isNonCrystal ? '非晶体' : '晶体' }
    ]);

    drawInfoBar(
        ctx,
        w,
        h,
        `Tm=${Tm}°C  rate=${heatRate}°C/min  ${isNonCrystal ? '非晶体 (连续软化)' : '晶体 (平台段)'}`,
        isDark
    );

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

// =====================================================================
// 场景 4: 热传递三种模式对比 (传导/对流/辐射)
// =====================================================================

/**
 * 绘制热传递对比场景.
 *   - 上: 热传导 (分子碰撞传递动能, 沿棒温度剖面)
 *   - 中: 热对流 (流体运动, 红色上升/蓝色下沉)
 *   - 下: 热辐射 (电磁波, 波纹发射)
 *   - 底部: 三种方式 Qdot-t 对比曲线
 *   - 标注: 傅里叶/牛顿冷却/斯忒藩-玻尔兹曼公式
 */
export function drawHeatTransferScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const modeNum = params['mode'] ?? 0;
    const modeLabel = modeNum === 1 ? '对流' : modeNum === 2 ? '辐射' : '传导';
    const Tenv = params['ambientTemp'] ?? 350;
    const T0 = params['initialTemp'] ?? 300;

    drawTitle(ctx, `热传递 (三种模式对比) — 当前: ${modeLabel}`, w, isDark);

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
    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(2)} s` },
        { label: 'T0', value: `${T0} K` },
        { label: 'Tenv', value: `${Tenv} K` },
        { label: 'mode', value: modeLabel }
    ]);

    drawInfoBar(ctx, w, h, `T0=${T0}K  Tenv=${Tenv}K  mode=${modeLabel}  傅里叶/牛顿/斯忒藩-玻尔兹曼`, isDark);

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

/** 绘制一个热传递子面板 (标题 + 公式 + 绘制回调) */
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

// =====================================================================
// 场景 5: 表面张力 (液膜收缩 + 吊环受力)
// =====================================================================

/**
 * 绘制表面张力场景.
 *   - 液膜 + 吊环 (F_sigma = 2·sigma·L)
 *   - 表面张力系数-温度曲线 (取自 simulationResult.charts.y_t)
 *   - 标注: 表面张力公式
 */
export function drawSurfaceTensionScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const isMercury = (params['medium'] ?? 0) === 1;
    const L = params['sliderLength'] ?? 4;
    const Tdeg = params['temperature'] ?? 20;
    const sigma0 = isMercury ? 0.487 : 0.072;
    const sigma = sigma0 * (1 - 0.002 * (Tdeg - 20));
    const F = 2 * sigma * (L / 100);

    drawTitle(ctx, '表面张力 (液膜收缩)', w, isDark);

    // 左: 吊环 + 液膜示意
    const leftW = w * 0.45;
    const leftX = 30;
    const leftY = 60;
    const leftH = h * 0.5;

    ctx.fillStyle = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.5)';
    roundRectPath(ctx, leftX, leftY, leftW, leftH, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#e2e8f0';
    ctx.lineWidth = 1;
    roundRectPath(ctx, leftX, leftY, leftW, leftH, 6);
    ctx.stroke();

    // 液膜 (薄膜)
    const filmX = leftX + leftW * 0.2;
    const filmW = leftW * 0.6;
    const filmY = leftY + leftH * 0.45;
    const filmH = leftH * 0.35;
    const filmGrad = ctx.createLinearGradient(0, filmY, 0, filmY + filmH);
    filmGrad.addColorStop(0, 'rgba(56,189,248,0.4)');
    filmGrad.addColorStop(1, 'rgba(14,165,233,0.6)');
    ctx.fillStyle = filmGrad;
    ctx.fillRect(filmX, filmY, filmW, filmH);
    // 液膜表面线
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(filmX, filmY);
    for (let i = 0; i <= 20; i++) {
        const px = filmX + (filmW * i) / 20;
        const py = filmY + Math.sin(currentTime * 2 + i * 0.5) * 2;
        ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(filmX, filmY + filmH);
    for (let i = 0; i <= 20; i++) {
        const px = filmX + (filmW * i) / 20;
        const py = filmY + filmH + Math.sin(currentTime * 2 + i * 0.5 + 1) * 2;
        ctx.lineTo(px, py);
    }
    ctx.stroke();

    // 吊环
    const ringX = leftX + leftW / 2;
    const ringY = filmY - 30;
    const ringR = 22;
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
    ctx.stroke();
    // 吊环支架
    ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ringX, ringY - ringR);
    ctx.lineTo(ringX, ringY - ringR - 20);
    ctx.lineTo(ringX + 30, ringY - ringR - 20);
    ctx.stroke();

    // 表面张力箭头 (沿液膜表面)
    const arrowN = 5;
    for (let i = 0; i < arrowN; i++) {
        const ax = filmX + (filmW * (i + 0.5)) / arrowN;
        const ay = filmY + 4;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax, ay + 12);
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(ax, ay + 12);
        ctx.lineTo(ax - 3, ay + 8);
        ctx.lineTo(ax + 3, ay + 8);
        ctx.closePath();
        ctx.fill();
    }

    // 标签
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`L=${L}cm`, ringX, ringY + ringR + 16);
    ctx.fillText(`F_σ = 2σL = ${(F * 1000).toFixed(3)} mN`, ringX, ringY + ringR + 32);
    ctx.textAlign = 'left';

    // 右: 公式 + 参数
    const rightX = leftX + leftW + 20;
    const rightW = w - rightX - 30;
    const rightY = 60;
    const rightH = h * 0.5;

    ctx.fillStyle = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.5)';
    roundRectPath(ctx, rightX, rightY, rightW, rightH, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#e2e8f0';
    ctx.lineWidth = 1;
    roundRectPath(ctx, rightX, rightY, rightW, rightH, 6);
    ctx.stroke();

    // 公式
    ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('F_σ = 2·σ·L', rightX + rightW / 2, rightY + 24);
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText('(液膜有 2 个表面)', rightX + rightW / 2, rightY + 42);

    // 参数表
    const rows = [
        { label: '液体', value: isMercury ? '水银' : '水' },
        { label: 'σ₀', value: `${sigma0} N/m` },
        { label: '温度 T', value: `${Tdeg} °C` },
        { label: 'σ(T)', value: `${sigma.toFixed(4)} N/m` },
        { label: '吊环 L', value: `${L} cm` },
        { label: 'F_σ', value: `${(F * 1000).toFixed(3)} mN` }
    ];
    ctx.font = '11px sans-serif';
    rows.forEach((row, i) => {
        const ry = rightY + 64 + i * 20;
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.textAlign = 'left';
        ctx.fillText(row.label, rightX + 12, ry);
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.textAlign = 'right';
        ctx.fillText(row.value, rightX + rightW - 12, ry);
    });
    ctx.textAlign = 'left';

    // 底部: sigma-T 曲线
    const chartY = Math.max(leftY + leftH, rightY + rightH) + 20;
    const chartH = h - chartY - 50;
    if (chartH > 60) {
        const chart = simulationResult?.charts?.y_t;
        if (chart && chart.points.length > 0) {
            const xs = chart.points.map(p => p.x);
            const ys = chart.points.map(p => p.y);
            drawMiniChart({
                ctx,
                x: 30,
                y: chartY,
                w: w - 60,
                h: chartH,
                xs,
                ys,
                isDark,
                lineColor: '#0ea5e9',
                label: 'σ-T 表面张力系数-温度',
                xLabel: '温度 T (°C)',
                yLabel: 'σ (N/m)',
                fillUnder: 'rgba(14,165,233,0.15)'
            });
        }
    }

    // HUD
    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(2)} s` },
        { label: 'σ', value: `${sigma.toFixed(4)} N/m` },
        { label: 'L', value: `${L} cm` },
        { label: 'F', value: `${(F * 1000).toFixed(3)} mN` }
    ]);

    drawInfoBar(
        ctx,
        w,
        h,
        `${isMercury ? '水银' : '水'}  σ₀=${sigma0}N/m  T=${Tdeg}°C  σ=${sigma.toFixed(4)}N/m  L=${L}cm`,
        isDark
    );

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

// =====================================================================
// 场景 6: 毛细现象 (弯月面 + 毛细上升/下降)
// =====================================================================

/**
 * 绘制毛细现象场景.
 *   - 毛细管 + 弯月面 (水: 凹月面上升; 水银: 凸月面下降)
 *   - Jurin 公式: h = 2σcosθ / (ρgr)
 *   - 液面高度标注
 */
export function drawCapillaryScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: canvasH, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, canvasH, isDark);

    const rMm = params['tubeRadius'] ?? 0.5;
    const isMercury = (params['medium'] ?? 0) === 1;
    const isParaffin = (params['material'] ?? 0) === 1;

    // 物理参数 (Jurin 公式)
    const sigma = isMercury ? 0.487 : 0.072;
    const rho = isMercury ? 13500 : 1000;
    const thetaDeg = isMercury ? 140 : isParaffin ? 105 : 0;
    const thetaRad = (thetaDeg * Math.PI) / 180;
    const g = 9.8;
    const r = rMm * 1e-3;
    const capillaryHM = (2 * sigma * Math.cos(thetaRad)) / (rho * g * r); // m
    const hMm = capillaryHM * 1000;

    drawTitle(ctx, '毛细现象 (液面升降)', w, isDark);

    // 左: 毛细管示意
    const leftW = w * 0.4;
    const leftX = 30;
    const leftY = 60;
    const leftH = canvasH * 0.65;

    ctx.fillStyle = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.5)';
    roundRectPath(ctx, leftX, leftY, leftW, leftH, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#e2e8f0';
    ctx.lineWidth = 1;
    roundRectPath(ctx, leftX, leftY, leftW, leftH, 6);
    ctx.stroke();

    // 容器 (外部液面)
    const containerH = leftH * 0.3;
    const containerY = leftY + leftH - containerH;
    ctx.fillStyle = isDark ? 'rgba(56,189,248,0.15)' : 'rgba(14,165,233,0.12)';
    ctx.fillRect(leftX + 10, containerY, leftW - 20, containerH);
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(leftX + 10, containerY, leftW - 20, containerH);
    // 外部液面线
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftX + 10, containerY);
    ctx.lineTo(leftX + leftW - 10, containerY);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('外部液面', leftX + leftW / 2, containerY - 6);
    ctx.textAlign = 'left';

    // 毛细管
    const tubeW = 30;
    const tubeX = leftX + leftW / 2 - tubeW / 2;
    const tubeTopY = leftY + 20;
    const tubeBotY = leftY + leftH - 4;
    ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tubeX, tubeTopY);
    ctx.lineTo(tubeX, tubeBotY);
    ctx.moveTo(tubeX + tubeW, tubeTopY);
    ctx.lineTo(tubeX + tubeW, tubeBotY);
    ctx.stroke();
    // 玻璃材质
    ctx.fillStyle = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.08)';
    ctx.fillRect(tubeX, tubeTopY, tubeW, tubeBotY - tubeTopY);

    // 管内液面 (弯月面)
    const hPx = Math.min(leftH * 0.5, Math.abs(hMm) * 5);
    const tubeLiquidY = capillaryHM > 0 ? containerY - hPx : containerY + hPx;
    ctx.fillStyle = isDark ? 'rgba(56,189,248,0.4)' : 'rgba(14,165,233,0.3)';
    ctx.beginPath();
    if (capillaryHM > 0) {
        // 凹月面 (上升)
        ctx.moveTo(tubeX + 2, containerY);
        ctx.quadraticCurveTo(tubeX + tubeW / 2, tubeLiquidY, tubeX + tubeW - 2, containerY);
        ctx.lineTo(tubeX + tubeW - 2, tubeBotY);
        ctx.lineTo(tubeX + 2, tubeBotY);
    } else {
        // 凸月面 (下降)
        ctx.moveTo(tubeX + 2, containerY);
        ctx.quadraticCurveTo(tubeX + tubeW / 2, tubeLiquidY, tubeX + tubeW - 2, containerY);
        ctx.lineTo(tubeX + tubeW - 2, tubeBotY);
        ctx.lineTo(tubeX + 2, tubeBotY);
    }
    ctx.closePath();
    ctx.fill();

    // 高度标注
    const labelX = tubeX + tubeW + 12;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(labelX, containerY);
    ctx.lineTo(labelX, tubeLiquidY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`h=${hMm.toFixed(2)}mm`, labelX + 4, (containerY + tubeLiquidY) / 2);
    ctx.textAlign = 'left';

    // 接触角标注
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`θ=${thetaDeg}°`, tubeX + tubeW / 2, tubeTopY - 8);
    ctx.textAlign = 'left';

    // 右: 公式 + 参数
    const rightX = leftX + leftW + 20;
    const rightW = w - rightX - 30;
    const rightY = 60;
    const rightH = canvasH * 0.5;

    ctx.fillStyle = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.5)';
    roundRectPath(ctx, rightX, rightY, rightW, rightH, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#e2e8f0';
    ctx.lineWidth = 1;
    roundRectPath(ctx, rightX, rightY, rightW, rightH, 6);
    ctx.stroke();

    // Jurin 公式
    ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Jurin 公式', rightX + rightW / 2, rightY + 24);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('h = 2σ·cosθ / (ρ·g·r)', rightX + rightW / 2, rightY + 46);

    // 参数表
    const rows = [
        { label: '液体', value: isMercury ? '水银' : '水' },
        { label: '管壁', value: isParaffin ? '石蜡' : '玻璃' },
        { label: '管半径 r', value: `${rMm} mm` },
        { label: '接触角 θ', value: `${thetaDeg}°` },
        { label: 'σ', value: `${sigma} N/m` },
        { label: 'ρ', value: `${rho} kg/m³` },
        { label: 'h', value: `${hMm.toFixed(2)} mm` },
        { label: '方向', value: capillaryHM > 0 ? '上升 (浸润)' : '下降 (不浸润)' }
    ];
    ctx.font = '11px sans-serif';
    rows.forEach((row, i) => {
        const ry = rightY + 68 + i * 20;
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.textAlign = 'left';
        ctx.fillText(row.label, rightX + 12, ry);
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.textAlign = 'right';
        ctx.fillText(row.value, rightX + rightW - 12, ry);
    });
    ctx.textAlign = 'left';

    // 底部: 毛细高度-管径曲线 (解析)
    const chartY = Math.max(leftY + leftH, rightY + rightH) + 20;
    const chartH = canvasH - chartY - 50;
    if (chartH > 60) {
        const xs: number[] = [];
        const ys: number[] = [];
        for (let i = 1; i <= 40; i++) {
            const ri = 0.05 + (i / 40) * 0.95;
            const hi = ((2 * sigma * Math.cos(thetaRad)) / (rho * g * ri * 1e-3)) * 1000;
            xs.push(parseFloat(ri.toFixed(2)));
            ys.push(parseFloat(hi.toFixed(2)));
        }
        drawMiniChart({
            ctx,
            x: 30,
            y: chartY,
            w: w - 60,
            h: chartH,
            xs,
            ys,
            isDark,
            lineColor: '#0ea5e9',
            label: 'h-r 毛细高度-管径 (反比)',
            xLabel: '管半径 r (mm)',
            yLabel: 'h (mm)',
            showPeakX: rMm,
            peakLabel: `r=${rMm}mm`
        });
    }

    // HUD
    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(2)} s` },
        { label: 'h', value: `${hMm.toFixed(2)} mm` },
        { label: 'θ', value: `${thetaDeg}°` },
        { label: 'r', value: `${rMm} mm` }
    ]);

    drawInfoBar(
        ctx,
        w,
        canvasH,
        `${isMercury ? '水银' : '水'}  ${isParaffin ? '石蜡' : '玻璃'}  r=${rMm}mm  θ=${thetaDeg}°  h=${hMm.toFixed(2)}mm`,
        isDark
    );

    if (!simulationResult) drawEmptyState(ctx, w, canvasH, isDark);
}

// =====================================================================
// 场景 7: 液晶 (光学各向异性 + 透射率)
// =====================================================================

/**
 * 绘制液晶场景.
 *   - 向列型分子排列 (棒状分子, 方向一致)
 *   - 透射率-温度曲线 (取自 simulationResult.charts.x_t)
 *   - 阈值电压标注
 */
export function drawLiquidCrystalScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const isCholesteric = (params['medium'] ?? 0) === 1;
    const startTemp = params['startTemp'] ?? 20;
    const endTemp = params['endTemp'] ?? 40;
    const voltage = params['voltage'] ?? 3;
    const Tc = 35; // 清亮点
    const Vth = 2; // 阈值电压

    drawTitle(ctx, `液晶 (${isCholesteric ? '胆甾型' : '向列型'}) — 光学各向异性`, w, isDark);

    // 左: 分子排列示意
    const leftW = w * 0.4;
    const leftX = 30;
    const leftY = 60;
    const leftH = h * 0.5;

    ctx.fillStyle = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.5)';
    roundRectPath(ctx, leftX, leftY, leftW, leftH, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#e2e8f0';
    ctx.lineWidth = 1;
    roundRectPath(ctx, leftX, leftY, leftW, leftH, 6);
    ctx.stroke();

    // 液晶盒 (上下基板)
    const cellX = leftX + 20;
    const cellW = leftW - 40;
    const cellY = leftY + 30;
    const cellH = leftH - 50;
    // 上基板
    ctx.fillStyle = isDark ? 'rgba(100,116,139,0.4)' : 'rgba(100,116,139,0.25)';
    ctx.fillRect(cellX, cellY, cellW, 8);
    ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.lineWidth = 1;
    ctx.strokeRect(cellX, cellY, cellW, 8);
    // 下基板
    ctx.fillStyle = isDark ? 'rgba(100,116,139,0.4)' : 'rgba(100,116,139,0.25)';
    ctx.fillRect(cellX, cellY + cellH - 8, cellW, 8);
    ctx.strokeRect(cellX, cellY + cellH - 8, cellW, 8);

    // 液晶分子 (棒状)
    const molN = 16;
    const isOn = voltage > Vth;
    for (let i = 0; i < molN; i++) {
        const mx = cellX + 10 + (i / (molN - 1)) * (cellW - 20);
        const my = cellY + 15 + ((i % 4) / 3) * (cellH - 30);
        const len = 18;
        // 未通电: 沿基板排列 (水平); 通电: 竖直排列
        const angle = isOn ? Math.PI / 2 : 0;
        const jitter = Math.sin(currentTime * 2 + i) * 0.05;
        const a = angle + jitter;
        const x1 = mx - (len / 2) * Math.cos(a);
        const y1 = my - (len / 2) * Math.sin(a);
        const x2 = mx + (len / 2) * Math.cos(a);
        const y2 = my + (len / 2) * Math.sin(a);
        ctx.strokeStyle = isOn ? '#a855f7' : '#60a5fa';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // 分子端点
        ctx.fillStyle = isOn ? '#a855f7' : '#60a5fa';
        ctx.beginPath();
        ctx.arc(x1, y1, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x2, y2, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // 电压标注
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`V=${voltage}V ${isOn ? '(开启)' : '(关闭)'}`, cellX + cellW / 2, cellY + cellH + 14);
    ctx.textAlign = 'left';

    // 右: 公式 + 参数
    const rightX = leftX + leftW + 20;
    const rightW = w - rightX - 30;
    const rightY = 60;
    const rightH = h * 0.5;

    ctx.fillStyle = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.5)';
    roundRectPath(ctx, rightX, rightY, rightW, rightH, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#e2e8f0';
    ctx.lineWidth = 1;
    roundRectPath(ctx, rightX, rightY, rightW, rightH, 6);
    ctx.stroke();

    // 标题
    ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('液晶光学各向异性', rightX + rightW / 2, rightY + 24);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.fillText('Δn = n_e − n_o  (双折射)', rightX + rightW / 2, rightY + 42);
    ctx.fillText('V > V_th 时分子竖直排列', rightX + rightW / 2, rightY + 58);
    ctx.fillText('透射率发生突变', rightX + rightW / 2, rightY + 74);

    // 参数表
    const rows = [
        { label: '模式', value: isCholesteric ? '胆甾型' : '向列型' },
        { label: '起始温度', value: `${startTemp} °C` },
        { label: '终止温度', value: `${endTemp} °C` },
        { label: '清亮点 Tc', value: `${Tc} °C` },
        { label: '驱动电压', value: `${voltage} V` },
        { label: '阈值 Vth', value: `${Vth} V` },
        { label: '状态', value: isOn ? '开启 (亮)' : '关闭 (暗)' }
    ];
    ctx.font = '11px sans-serif';
    rows.forEach((row, i) => {
        const ry = rightY + 92 + i * 20;
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.textAlign = 'left';
        ctx.fillText(row.label, rightX + 12, ry);
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.textAlign = 'right';
        ctx.fillText(row.value, rightX + rightW - 12, ry);
    });
    ctx.textAlign = 'left';

    // 底部: 透射率-温度曲线 (解析)
    const chartY = Math.max(leftY + leftH, rightY + rightH) + 20;
    const chartH = h - chartY - 50;
    if (chartH > 60) {
        const xs: number[] = [];
        const ys: number[] = [];
        for (let i = 0; i <= 40; i++) {
            const Ti = startTemp + (i / 40) * (endTemp - startTemp);
            // 透射率: 低于 Tc 时高, 高于 Tc 时低 (各向同性)
            let tr: number;
            if (Ti < Tc - 3) tr = 0.85;
            else if (Ti > Tc + 3) tr = 0.15;
            else tr = 0.85 - ((Ti - (Tc - 3)) / 6) * 0.7;
            xs.push(parseFloat(Ti.toFixed(1)));
            ys.push(parseFloat(tr.toFixed(2)));
        }
        drawMiniChart({
            ctx,
            x: 30,
            y: chartY,
            w: w - 60,
            h: chartH,
            xs,
            ys,
            isDark,
            lineColor: '#a855f7',
            label: '透射率-温度 (清亮点 Tc=35°C)',
            xLabel: '温度 T (°C)',
            yLabel: '透射率',
            showPeakX: Tc,
            peakLabel: `Tc=${Tc}°C`
        });
    }

    // HUD
    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(2)} s` },
        { label: 'V', value: `${voltage} V` },
        { label: 'Vth', value: `${Vth} V` },
        { label: 'Tc', value: `${Tc} °C` }
    ]);

    drawInfoBar(
        ctx,
        w,
        h,
        `${isCholesteric ? '胆甾型' : '向列型'}  V=${voltage}V  Vth=${Vth}V  Tc=${Tc}°C  ${isOn ? '开启' : '关闭'}`,
        isDark
    );

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

function drawThermalArrow(
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
    const a = Math.atan2(dy, dx);
    const head = Math.min(13, len * 0.25);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - head * 0.55 * Math.cos(a), y2 - head * 0.55 * Math.sin(a));
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4));
    ctx.lineTo(x2 - head * 0.45 * Math.cos(a), y2 - head * 0.45 * Math.sin(a));
    ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4));
    ctx.closePath();
    ctx.fill();
    if (label) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, x2 + 6, y2 - 6);
    }
    ctx.restore();
}

function drawEnergyBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    ratio: number,
    color: string,
    label: string,
    isDark: boolean
): void {
    const clamped = Math.max(0, Math.min(1, ratio));
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.58)' : 'rgba(255,255,255,0.70)';
    roundRectPath(ctx, x, y, w, h, 5);
    ctx.fill();
    ctx.fillStyle = color;
    roundRectPath(ctx, x, y + h * (1 - clamped), w, h * clamped, 5);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.lineWidth = 1;
    roundRectPath(ctx, x, y, w, h, 5);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h + 16);
}

export function drawOilFilmScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '油膜法测分子直径', w, isDark);
    const concentration = params['oilConcentration'] ?? 500;
    const dropsPerMl = params['dropsPerMl'] ?? 50;
    const filmArea = params['filmArea'] ?? 200;
    const volumeMm3 = 1000 / Math.max(concentration * dropsPerMl, 1e-6);
    const diameterNm = (volumeMm3 / Math.max(filmArea, 1e-6)) * 1e6;
    const cx = w * 0.52;
    const cy = h * 0.52;
    const rx = Math.min(w * 0.28, 130 + filmArea * 0.12);
    const ry = rx * 0.45;
    ctx.fillStyle = isDark ? 'rgba(14,165,233,0.18)' : 'rgba(14,165,233,0.16)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = 0; i < 46; i++) {
        const a = seededRand(i) * Math.PI * 2;
        const r = Math.sqrt(seededRand(i + 7));
        ctx.fillStyle = i % 3 === 0 ? '#f59e0b' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, 2.4, 0, Math.PI * 2);
        ctx.fill();
    }
    drawHud(ctx, isDark, [
        { label: 'V_drop', value: `${volumeMm3.toFixed(3)} mm3` },
        { label: 'S', value: `${filmArea.toFixed(1)} cm2` },
        { label: 'd', value: `${diameterNm.toFixed(2)} nm` }
    ]);
    drawInfoBar(ctx, w, h, '单分子油膜近似: d = V / S, 面积越大估算直径越小', isDark);
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawLiquidMixingScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '液体混合与扩散', w, isDark);
    const water = params['volumeWater'] ?? 50;
    const alcohol = params['volumeAlcohol'] ?? 50;
    const contraction = 0.04 * Math.min(water, alcohol);
    const finalVolume = water + alcohol - contraction;
    const beakerX = w * 0.36;
    const beakerY = h * 0.22;
    const beakerW = w * 0.28;
    const beakerH = h * 0.5;
    ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.lineWidth = 3;
    roundRectPath(ctx, beakerX, beakerY, beakerW, beakerH, 10);
    ctx.stroke();
    const mix = Math.min(1, currentTime / 3);
    const grad = ctx.createLinearGradient(beakerX, beakerY + beakerH, beakerX, beakerY);
    grad.addColorStop(0, `rgba(59,130,246,${0.38 + mix * 0.15})`);
    grad.addColorStop(1, `rgba(245,158,11,${0.38 - mix * 0.22})`);
    ctx.fillStyle = grad;
    roundRectPath(ctx, beakerX + 8, beakerY + beakerH * 0.18, beakerW - 16, beakerH * 0.74, 8);
    ctx.fill();
    for (let i = 0; i < 70; i++) {
        const x = beakerX + 16 + seededRand(i) * (beakerW - 32);
        const baseY = beakerY + beakerH * (i % 2 === 0 ? 0.32 : 0.7);
        const y = baseY + (seededRand(i + 3) - 0.5) * beakerH * 0.28 * (0.4 + mix);
        ctx.fillStyle = i % 2 === 0 ? '#60a5fa' : '#f59e0b';
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawHud(ctx, isDark, [
        { label: 'Vw', value: `${water.toFixed(0)} mL` },
        { label: 'Va', value: `${alcohol.toFixed(0)} mL` },
        { label: 'Vmix', value: `${finalVolume.toFixed(1)} mL` }
    ]);
    drawInfoBar(ctx, w, h, '水和酒精混合体积小于二者之和, 说明分子间存在空隙', isDark);
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawMolecularForceScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '分子力曲线', w, isDark);
    const epsilon = params['epsilon'] ?? 1;
    const sigma = params['sigma'] ?? 0.34;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i <= 80; i++) {
        const r = sigma * (0.82 + i * 0.035);
        const sr = sigma / r;
        const force = (24 * epsilon * (2 * sr ** 13 - sr ** 7)) / sigma;
        xs.push(parseFloat(r.toFixed(3)));
        ys.push(Math.max(-8, Math.min(8, force)));
    }
    drawMiniChart({
        ctx,
        x: w * 0.12,
        y: h * 0.22,
        w: w * 0.76,
        h: h * 0.42,
        xs,
        ys,
        isDark,
        lineColor: '#a855f7',
        label: 'F-r 分子力曲线',
        xLabel: 'r (nm)',
        yLabel: 'F'
    });
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(w * 0.42, h * 0.76, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(w * 0.58, h * 0.76, 20, 0, Math.PI * 2);
    ctx.fill();
    drawThermalArrow(ctx, w * 0.47, h * 0.76, w * 0.53, h * 0.76, '#ef4444', '斥/引随距离变号');
    drawHud(ctx, isDark, [
        { label: 'epsilon', value: epsilon.toFixed(2) },
        { label: 'sigma', value: `${sigma.toFixed(2)} nm` },
        { label: 'r0', value: `${(1.122 * sigma).toFixed(2)} nm` }
    ]);
    drawInfoBar(ctx, w, h, '距离很小时表现为斥力, 稍远处表现为引力, 远距离分子力趋近于零', isDark);
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawWettingScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    const medium = params['medium'] ?? 0;
    const surface = params['surface'] ?? 0;
    const theta = medium < 0.5 && surface < 0.5 ? 35 : medium < 0.5 ? 105 : 140;
    drawTitle(ctx, `润湿/不润湿  θ=${theta}°`, w, isDark);
    const baseY = h * 0.68;
    ctx.fillStyle = isDark ? '#334155' : '#cbd5e1';
    ctx.fillRect(w * 0.18, baseY, w * 0.64, 10);
    const dropW = theta < 90 ? 190 : 130;
    const dropH = theta < 90 ? 58 : 95;
    ctx.fillStyle = medium < 0.5 ? 'rgba(14,165,233,0.58)' : 'rgba(148,163,184,0.62)';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, baseY - dropH / 2, dropW / 2, dropH, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    drawThermalArrow(ctx, w * 0.5, baseY, w * 0.64, baseY - 45, '#22c55e', 'γ');
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w * 0.5, baseY, 54, Math.PI, Math.PI + (theta * Math.PI) / 180);
    ctx.stroke();
    drawHud(ctx, isDark, [
        { label: 'theta', value: `${theta} deg` },
        { label: 'medium', value: medium < 0.5 ? 'water' : 'mercury' },
        { label: 'state', value: theta < 90 ? 'wetting' : 'non-wetting' }
    ]);
    drawInfoBar(ctx, w, h, 'θ < 90° 为润湿, θ > 90° 为不润湿; 接触角由三相界面张力决定', isDark);
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawJouleMechanicalScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '机械功改变内能', w, isDark);
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
    drawHud(ctx, isDark, [
        { label: 'W', value: `${work.toFixed(0)} J` },
        { label: 'm_water', value: `${waterMass.toFixed(2)} kg` },
        { label: 'dT', value: `${deltaT.toFixed(2)} K` }
    ]);
    drawInfoBar(ctx, w, h, '重物下落做功带动叶片搅拌, 机械功转化为水的内能', isDark);
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawJouleElectricalScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '电功改变内能', w, isDark);
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
    drawHud(ctx, isDark, [
        { label: 'P', value: `${power.toFixed(1)} W` },
        { label: 'Q', value: `${heat.toFixed(0)} J` },
        { label: 'dT', value: `${deltaT.toFixed(2)} K` }
    ]);
    drawInfoBar(ctx, w, h, '焦耳定律 Q = I^2Rt = U^2t/R, 电功转化为水的内能', isDark);
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawAdiabaticCompressionScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '绝热压缩', w, isDark);
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
    drawHud(ctx, isDark, [
        { label: 'T0', value: `${t0.toFixed(0)} K` },
        { label: 'V1/V2', value: ratio.toFixed(1) },
        { label: 'T2', value: `${t2.toFixed(0)} K` }
    ]);
    drawInfoBar(ctx, w, h, '绝热过程近似 Q=0, TV^(gamma-1)=常量, 快速压缩可显著升温', isDark);
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawEnergyTransformationScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '能量转化与守恒', w, isDark);
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
    drawHud(ctx, isDark, [
        { label: 'Ein', value: `${input.toFixed(0)} J` },
        { label: 'eta', value: `${(efficiency * 100).toFixed(0)}%` },
        { label: 'loss', value: `${loss.toFixed(1)} J` }
    ]);
    drawInfoBar(ctx, w, h, '能量不会凭空产生或消失, 只会从一种形式转化为另一种形式', isDark);
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawPerpetuumMobileScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '永动机不可能', w, isDark);
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
    drawHud(ctx, isDark, [
        { label: 'Th', value: `${hot.toFixed(0)} K` },
        { label: 'Tc', value: `${cold.toFixed(0)} K` },
        { label: 'eta_max', value: `${(carnot * 100).toFixed(1)}%` }
    ]);
    drawInfoBar(ctx, w, h, '第二类永动机违反热力学第二定律: 单一热源不可能完全变成功', isDark);
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawHeatDirectionScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '热力学方向性', w, isDark);
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
    drawHud(ctx, isDark, [
        { label: 'dT', value: `${(hot - cold).toFixed(0)} K` },
        { label: 'k', value: `${k.toFixed(1)}` },
        { label: 'Qdot', value: `${qRate.toFixed(0)} arb` }
    ]);
    drawInfoBar(ctx, w, h, '热量自发地从高温物体传到低温物体, 反向过程需要外界做功', isDark);
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

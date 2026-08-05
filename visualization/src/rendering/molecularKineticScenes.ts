/**
 * 热学场景渲染模块 — 选必三 第一章 分子动理论
 *
 * 场景列表：
 *   - drawDiffusionScene
 *   - drawBrownianScene
 *   - drawMolecularForceScene
 *   - drawOilFilmScene
 *   - drawLiquidMixingScene
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
    drawThermalArrow
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

/**
 * 扩散粒子颜色阶梯缓存 (深蓝 #3b82f6 → 浅蓝 #94a3b8, 16 级)。
 * 避免每帧对每个粒子构造 `rgb(...)` 字符串 fillStyle。
 */
const DIFFUSION_COLOR_STEPS: string[] = (() => {
    const out: string[] = [];
    for (let i = 0; i < 16; i++) {
        const t = i / 15;
        const r = Math.round(59 + t * (148 - 59));
        const g = Math.round(130 + t * (163 - 130));
        const b = Math.round(246 + t * (184 - 246));
        out.push(`rgb(${r},${g},${b})`);
    }
    return out;
})();

export function drawDiffusionScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const T = params['temperature'] ?? 300;
    const isLiquid = (params['medium'] ?? 0) === 1;
    const N = params['particleCount'] ?? 500;
    const D = isLiquid ? 1e-9 * Math.pow(T / 300, 1.5) : 1e-5 * Math.pow(T / 300, 1.5);

    drawTitle(ctx, '扩散现象 (浓度梯度)', w, isDark, { size: 18, y: 28 });

    // 粒子区域
    const partY0 = 50;
    const partH = h * 0.32;
    const partX0 = 30;
    const partW = w - 60;

    // 粒子区域背景
    ctx.fillStyle = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(226,232,240,0.5)';
    roundRectPath(ctx, partX0, partY0, partW, partH, 6);
    ctx.fill();

    // 粒子 (随时间向右扩散) — 数量按区域面积自适应, 每粒子约 700px², 上限 200
    const visibleN = Math.min(200, N, Math.max(24, Math.round((partW * partH) / 700)));
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

        // 颜色: 左侧深色, 右侧浅色 (16 级阶梯缓存)
        const t = (px - partX0) / partW;
        ctx.fillStyle = DIFFUSION_COLOR_STEPS[Math.min(15, Math.max(0, Math.floor(t * 16)))]!;
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
    drawHud(
        ctx,
        isDark,
        [
            { label: 't', value: `${currentTime.toFixed(2)} s` },
            { label: 'T', value: `${T} K` },
            { label: 'D', value: `${D.toExponential(1)} m²/s` },
            { label: 'N', value: `${N}` }
        ],
        { boxW: 200, lineH: 16 }
    );

    drawInfoBar(
        ctx,
        w,
        h,
        `T=${T}K  medium=${isLiquid ? '液体' : '气体'}  D=${D.toExponential(2)} m²/s  N=${N}`,
        isDark,
        { height: 22, yOffset: 34 }
    );

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawBrownianScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const rUm = params['particleRadius'] ?? 1.0;
    const T = params['liquidTemp'] ?? 300;
    const eta = params['fluidViscosity'] ?? 1.0;
    const nParts = params['nParticles'] ?? 10;
    const kB = 1.38e-23;
    const D = (kB * T) / (6 * Math.PI * eta * 1e-3 * rUm * 1e-6);

    drawTitle(ctx, '布朗运动 (微粒抖动)', w, isDark, { size: 18, y: 28 });

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

    // 大颗粒轨迹 (最近 80 个位置) — 分档合并 stroke, 避免每段一次 beginPath/stroke
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
    // 轨迹线: alpha/线宽分 8 档, 每档一条 path 一次 stroke
    ctx.lineCap = 'round';
    for (let level = 0; level < 8; level++) {
        const from = level / 8;
        const to = (level + 1) / 8;
        const mid = (from + to) / 2;
        ctx.strokeStyle = `rgba(249,115,22,${0.05 + 0.5 * mid})`;
        ctx.lineWidth = 1 + 1.5 * mid;
        let inPath = false;
        for (let i = 0; i < trail.length - 1; i++) {
            const p = i / (trail.length - 1);
            if (p < from || p >= to) continue;
            if (!inPath) {
                ctx.beginPath();
                ctx.moveTo(trail[i]!.x, trail[i]!.y);
                inPath = true;
            }
            ctx.lineTo(trail[i + 1]!.x, trail[i + 1]!.y);
        }
        if (inPath) ctx.stroke();
    }
    ctx.lineCap = 'butt';

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
    drawHud(
        ctx,
        isDark,
        [
            { label: 't', value: `${currentTime.toFixed(2)} s` },
            { label: 'T', value: `${T} K` },
            { label: 'D', value: `${D.toExponential(1)} m²/s` },
            { label: 'r', value: `${rUm} μm` }
        ],
        { boxW: 200, lineH: 16 }
    );

    drawInfoBar(ctx, w, h, `r=${rUm}μm  T=${T}K  η=${eta}cP  D=${D.toExponential(2)} m²/s  N=${nParts}`, isDark, {
        height: 22,
        yOffset: 34
    });

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawMolecularForceScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '分子力曲线', w, isDark, { size: 18, y: 28 });
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
    drawHud(
        ctx,
        isDark,
        [
            { label: 'epsilon', value: epsilon.toFixed(2) },
            { label: 'sigma', value: `${sigma.toFixed(2)} nm` },
            { label: 'r0', value: `${(1.122 * sigma).toFixed(2)} nm` }
        ],
        { boxW: 200, lineH: 16 }
    );
    drawInfoBar(ctx, w, h, '距离很小时表现为斥力, 稍远处表现为引力, 远距离分子力趋近于零', isDark, {
        height: 22,
        yOffset: 34
    });
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawOilFilmScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '油膜法测分子直径', w, isDark, { size: 18, y: 28 });
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
    drawHud(
        ctx,
        isDark,
        [
            { label: 'V_drop', value: `${volumeMm3.toFixed(3)} mm3` },
            { label: 'S', value: `${filmArea.toFixed(1)} cm2` },
            { label: 'd', value: `${diameterNm.toFixed(2)} nm` }
        ],
        { boxW: 200, lineH: 16 }
    );
    drawInfoBar(ctx, w, h, '单分子油膜近似: d = V / S, 面积越大估算直径越小', isDark, { height: 22, yOffset: 34 });
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawLiquidMixingScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '液体混合与扩散', w, isDark, { size: 18, y: 28 });
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
    drawHud(
        ctx,
        isDark,
        [
            { label: 'Vw', value: `${water.toFixed(0)} mL` },
            { label: 'Va', value: `${alcohol.toFixed(0)} mL` },
            { label: 'Vmix', value: `${finalVolume.toFixed(1)} mL` }
        ],
        { boxW: 200, lineH: 16 }
    );
    drawInfoBar(ctx, w, h, '水和酒精混合体积小于二者之和, 说明分子间存在空隙', isDark, { height: 22, yOffset: 34 });
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

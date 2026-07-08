/**
 * 选必三「量子/原子核」场景渲染模块
 *
 * 包含 3 个可视化场景：
 *   1. drawAlphaScatteringScene   — α 粒子卢瑟福散射 (金核 + 双曲线轨迹 + 大角度标注)
 *   2. drawDecayStatisticsScene   — 衰变统计规律 (泊松直方图 + 高斯拟合 + 衰变动画)
 *   3. drawFissionChainScene      — 裂变链式反应 (级联树 + U-235 核 + 200 MeV 标注)
 *
 * 设计原则 (沿用 waveOptScenes.ts / chapter2Scenes.ts):
 *   - 纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 *   - 每个场景函数负责完整渲染 (背景 + 动态元素 + HUD)
 *   - 与 SimulationCanvas 中 drawCollisionScene / drawSpringScene 风格一致
 *
 * 引用 sceneId (来自 sceneRegistry.ts):
 *   - 'alpha-scattering'  — 选必三 第五章 α 粒子散射实验 (Z=79, MeV量级)
 *   - 'decay-statistics'  — 选必三 第五章 衰变统计规律 (泊松→高斯)
 *   - 'fission-chain'     — 选必三 第五章 裂变链式反应 (k 临界/超临界/次临界)
 */

import type { SimulationResult } from 'physics-core';

// ========== 共享类型 ==========

export interface NuclearSceneOptions {
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

function drawArrow(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    label?: string
): void {
    const dx = x2 - x1,
        dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 3) return;
    ctx.save();
    const angle = Math.atan2(dy, dx);
    const headLen = Math.min(12, len * 0.3);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - headLen * 0.6 * Math.cos(angle), y2 - headLen * 0.6 * Math.sin(angle));
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - 0.38), y2 - headLen * Math.sin(angle - 0.38));
    ctx.lineTo(x2 - headLen * 0.45 * Math.cos(angle), y2 - headLen * 0.45 * Math.sin(angle));
    ctx.lineTo(x2 - headLen * Math.cos(angle + 0.38), y2 - headLen * Math.sin(angle + 0.38));
    ctx.closePath();
    ctx.fill();
    if (label) {
        ctx.fillStyle = color;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x2 + 6, y2 - 4);
    }
    ctx.restore();
}

/**
 * 渲染脉冲/闪烁发光圆, 用于标注激活的核/裂变的 U-235 / 放射线. alpha 在 [0, 1].
 */
function drawGlowCircle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    color: string,
    alpha: number
): void {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2);
    grad.addColorStop(0, color);
    grad.addColorStop(0.4, color + '88');
    grad.addColorStop(1, color + '00');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * 星空背景 (云室径迹场景氛围). 在 clearScene 后调用.
 */
function drawStarfield(ctx: CanvasRenderingContext2D, w: number, h: number, isDark: boolean, n = 24): void {
    ctx.fillStyle = isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.45)';
    // 伪随机 (固定种子, 每帧一致)
    const seeded = (i: number) => {
        const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
        return v - Math.floor(v);
    };
    for (let i = 0; i < n; i++) {
        const x = seeded(i) * w;
        const y = seeded(i + 100) * h;
        const r = 0.6 + seeded(i + 200) * 1.0;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
}

// =====================================================================
// 场景 1: α 粒子卢瑟福散射
// =====================================================================

/**
 * 绘制 α 粒子散射场景.
 *   - Canvas 中央: 金原子核 (标 'Au'), 脉冲发光表示靶核持续存在
 *   - 多条入射 α 粒子双曲线轨迹, 不同瞄准距离 b (从左侧水平飞来)
 *   - 库仑斥力导致偏转 θ
 *   - 大角度散射 (θ>90°) 闪烁标注
 *   - HUD: E_k (α 动能), Z (靶核电荷), k 常数
 *   - 背面计数率统计 (直方图, 取自 simulationResult.charts.x_t)
 */
export function drawAlphaScatteringScene(o: NuclearSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);
    drawStarfield(ctx, w, h, isDark, 30);

    const E_MeV = params['alphaEnergy'] ?? 5;
    const Z = params['targetZ'] ?? 79;
    const eSq = 1.44; // MeV·fm
    const kCoeff = (2 * Z * eSq) / (E_MeV * 5.0); // fm

    // 靶核位置 (画面中央偏左 0.45 处)
    const nucleusX = w * 0.45;
    const nucleusY = h * 0.5;
    const nucleusR = 22;

    // 瞄准距离 (绘制多条轨迹)
    const impactParams = [0.1, 0.35, 0.55, 0.78, 1.1, 1.6]; // 归一化系数；首条小瞄准距使默认参数下出现大角度散射
    const impactRaw = Math.max(8, Math.min(h * 0.2, kCoeff * 4));
    const trackColors = ['#4ade80', '#60a5fa', '#a78bfa', '#fb923c', '#f472b6'];

    // --- 脉冲靶核发光 ---
    const pulse = 0.7 + 0.3 * Math.sin(currentTime * 2.2);
    drawGlowCircle(ctx, nucleusX, nucleusY, nucleusR, '#ef4444', pulse);

    // Au 核标签
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Au', nucleusX, nucleusY);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '10px sans-serif';
    ctx.fillText(`Z=${Z}`, nucleusX, nucleusY + nucleusR + 12);
    ctx.textAlign = 'left';

    // --- 入射 α 粒子(当前) ---
    // 入射方向: 从左侧沿 →, 当前动画位置
    const alphaY = h * 0.18;
    const alphaProgress = (currentTime * 0.6) % 1; // 0 → 1 入射到靶核
    // 只显示接近靶核的一条主线
    const alphaX = w * 0.05 + (nucleusX - w * 0.05) * alphaProgress;
    const alphaR = 7;
    // 入射方向指示 (弯曲预警)
    ctx.fillStyle = isDark ? 'rgba(74,222,128,0.3)' : 'rgba(34,197,94,0.2)';
    ctx.beginPath();
    ctx.arc(alphaX, alphaY, alphaR + 4, 0, Math.PI * 2);
    ctx.fill();
    const aGrad = ctx.createRadialGradient(alphaX - 2, alphaY - 2, 1, alphaX, alphaY, alphaR);
    aGrad.addColorStop(0, '#bbf7d0');
    aGrad.addColorStop(0.6, '#4ade80');
    aGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = aGrad;
    ctx.beginPath();
    ctx.arc(alphaX, alphaY, alphaR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('α', alphaX, alphaY);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    // --- 入射辅助线 (虚线直到靶核) ---
    const incomingAlphaX = alphaX + alphaR;
    ctx.strokeStyle = isDark ? 'rgba(74,222,128,0.35)' : 'rgba(34,197,94,0.25)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(incomingAlphaX, alphaY);
    ctx.lineTo(nucleusX, alphaY);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- 多条已散射轨迹 (静态双曲线近似) ---
    impactParams.forEach((bFactor, idx) => {
        const b = bFactor * impactRaw;
        const theta = 2 * Math.atan2(Math.max(kCoeff, 2), Math.max(b, 0.5));
        const phi = Math.PI - theta; // 出射与 +x 夹角
        const isLargeAngle = theta > Math.PI / 2;

        // 入射段 (水平, 在 y=nucleusY - b 处)
        const inY = nucleusY - b;
        const inStartX = 20;
        const inEndX = nucleusX;

        // 出射段 (沿 phi 方向)
        const outStartX = nucleusX;
        const outStartY = nucleusY;
        const outEndX = nucleusX + (w - nucleusX - 20) * Math.cos(phi);
        const outEndY = nucleusY + (w - nucleusX - 20) * Math.sin(phi);

        const color = trackColors[idx % trackColors.length]!;

        // 入射段虚线
        ctx.strokeStyle = color + (isDark ? '66' : '55');
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(inStartX, inY);
        ctx.lineTo(inEndX, inY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 出射段实线 (带箭头)
        drawArrow(ctx, outStartX, outStartY, outEndX, outEndY, color);

        // 大角度散射闪烁标注
        if (isLargeAngle) {
            const blink = 0.5 + 0.5 * Math.sin(currentTime * 4 + idx);
            ctx.globalAlpha = 0.4 + 0.6 * blink;
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`大角度 θ=${((theta * 180) / Math.PI).toFixed(0)}°!`, outEndX + 6, outEndY - 12);
            ctx.globalAlpha = 1;
            // 靶核旁 "反弹" 闪烁标记
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(inEndX, inY, 16 + 6 * Math.sin(currentTime * 6 + idx), 0, Math.PI * 2);
            ctx.stroke();
        }
    });

    // --- 散射角标注弧 ---
    const arcR = 60;
    const arcTheta = Math.PI / 3; // 展示一条 60° 弧线作为示意
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.5)' : 'rgba(100,116,139,0.4)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(nucleusX, nucleusY, arcR, 0, -arcTheta, true);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('θ', nucleusX + arcR + 14, nucleusY - arcR * 0.7);

    // --- 右下角 α 粒子计数器角标 (取自 charts.x_t) ---
    const chartAlpha = simulationResult?.charts?.x_t;
    let scatteredCount = 0;
    if (chartAlpha && chartAlpha.points.length > 0) {
        scatteredCount = Math.round(chartAlpha.points.reduce((s, p) => s + p.y, 0));
    }
    const counterText = `α 总数 N = ${scatteredCount}`;
    ctx.font = 'bold 11px monospace';
    const ctw = ctx.measureText(counterText).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, w - ctw - 28, h - 36, ctw + 20, 24, 5);
    ctx.fill();
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(counterText, w - ctw - 18, h - 20);

    // --- 标题 ---
    drawTitle(ctx, 'α 粒子卢瑟福散射', w, isDark);

    // --- HUD ---
    drawHud(ctx, isDark, [
        { label: 'E_k', value: `${E_MeV.toFixed(1)} MeV` },
        { label: 'Z (靶核)', value: `${Z}` },
        { label: 'k', value: `${kCoeff.toFixed(2)} fm` },
        { label: 'b≈', value: `(${impactParams.length} 条)` }
    ]);

    // 散射公式底部
    const formulaText = `θ = 2·arctan(k/b),  k = 2Z·e²/(E_α·c)  ≈ ${kCoeff.toFixed(2)} fm`;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const ftw = ctx.measureText(formulaText).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, w / 2 - ftw / 2 - 8, h - 32, ftw + 16, 20, 4);
    ctx.fill();
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.fillText(formulaText, w / 2, h - 18);
    ctx.textAlign = 'left';
}

// =====================================================================
// 场景 2: 衰变统计规律 (泊松→高斯)
// =====================================================================

/**
 * 绘制衰变统计规律场景.
 *   - 上方: 计数的泊松直方图 (charts.x_t: x=计数 N, y=频数) + 高斯拟合曲线 (charts.y_t)
 *   - 下方: 当前第 N=0,1,2,... 个样本动画 (动画流畅示意采样)
 *   - 左侧: 参数 (N̄, σ, nTrials) HUD
 *   - 顶部中央: 标题 + 期望值 λ=...
 *
 * 物理公式不变: P(N) = λ^N·e^(-λ)/N!,  σ=√λ
 */
export function drawDecayStatisticsScene(o: NuclearSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const meanCount = params['meanCount'] ?? 50;
    const nTrials = params['nTrials'] ?? 1000;
    const sigma = Math.sqrt(meanCount);

    // 布局
    const titleH = 36;
    const chartPad = 24;
    const chartX = chartPad + 60;
    const chartY = titleH + 30;
    const chartW = w - chartX - chartPad - 70;
    const chartH = h * 0.55;

    // --- 标题 ---
    drawTitle(ctx, '衰变统计规律 (泊松→高斯)', w, isDark);

    // --- 直方图背景 ---
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.55)' : 'rgba(248,250,252,0.7)';
    roundRectPath(ctx, chartX - 10, chartY - 8, chartW + 70, chartH + 30, 8);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0';
    ctx.lineWidth = 1;
    roundRectPath(ctx, chartX - 10, chartY - 8, chartW + 70, chartH + 30, 8);
    ctx.stroke();

    // 轴
    const axisY = chartY + chartH;
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(chartX, chartY);
    ctx.lineTo(chartX, axisY);
    ctx.lineTo(chartX + chartW, axisY);
    ctx.stroke();

    // 数据获取
    const histChart = simulationResult?.charts?.x_t;
    const fitChart = simulationResult?.charts?.y_t;
    const histPoints = histChart?.points ?? [];
    const fitPoints = fitChart?.points ?? [];

    // X 轴范围 (按实际数据)
    let xMax = Math.max(...histPoints.map(p => p.x), Math.ceil(meanCount * 2));
    if (xMax < 10) xMax = 10;
    const yMax = Math.max(...histPoints.map(p => p.y + 1), ...fitPoints.map(p => p.y + 1), 1);

    // 坐标映射
    const sx = (xv: number) => chartX + (xv / xMax) * chartW;
    const sy = (yv: number) => axisY - (yv / yMax) * chartH;

    // Y 轴刻度
    ctx.font = '10px monospace';
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
        const yv = (yMax * i) / 4;
        const py = sy(yv);
        ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartX, py);
        ctx.lineTo(chartX + chartW, py);
        ctx.stroke();
        ctx.fillText(yv.toFixed(0), chartX - 6, py);
    }
    ctx.textBaseline = 'alphabetic';

    // X 轴刻度
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xStep = xMax > 60 ? 20 : xMax > 30 ? 10 : 5;
    for (let xi = 0; xi <= xMax; xi += xStep) {
        const px = sx(xi);
        if (px > chartX + chartW) break;
        ctx.fillText(xi.toFixed(0), px, axisY + 6);
    }
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    // --- 直方图柱 ---
    const barW = Math.max(2, chartW / xMax - 1);
    for (const p of histPoints) {
        if (p.x > xMax || p.y <= 0) continue;
        const px = sx(p.x);
        const top = sy(p.y);
        const bh = axisY - top;
        const grad = ctx.createLinearGradient(px, top, px, axisY);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(1, '#0284c7');
        ctx.fillStyle = grad;
        ctx.fillRect(px, top, barW, bh);
    }

    // --- 高斯曲线 ---
    if (fitPoints.length > 1) {
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < fitPoints.length; i++) {
            const p = fitPoints[i]!;
            if (p.x > xMax) break;
            const px = sx(p.x);
            const py = sy(p.y);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.lineJoin = 'miter';

        // 高斯曲线标签
        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('高斯拟合', chartX + chartW - 80, chartY + 14);
    }

    // --- λ 标注竖线 ---
    const meanX = sx(meanCount);
    if (meanX >= chartX && meanX <= chartX + chartW) {
        ctx.strokeStyle = isDark ? '#ef4444' : '#dc2626';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(meanX, chartY);
        ctx.lineTo(meanX, axisY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`N̄ = ${meanCount}`, meanX, chartY - 4);
    }
    ctx.textAlign = 'left';

    // --- 标准差 ±σ 区域 (半透明高亮) ---
    if (meanCount - sigma > 0) {
        const sx1 = sx(Math.max(0, meanCount - sigma));
        const sx2 = sx(meanCount + sigma);
        ctx.fillStyle = isDark ? 'rgba(251,191,36,0.15)' : 'rgba(245,158,11,0.12)';
        ctx.fillRect(sx1, chartY, sx2 - sx1, chartH);
        ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`±σ (${sigma.toFixed(1)})`, (sx1 + sx2) / 2, axisY - 6);
    }
    ctx.textAlign = 'left';

    // --- 轴标签 ---
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('衰变计数 N', chartX + chartW / 2, axisY + 24);
    ctx.save();
    ctx.translate(14, chartY + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('频数', 0, 0);
    ctx.restore();
    ctx.textAlign = 'left';

    // --- 底部: 计数动画---
    const animY = chartY + chartH + chartPad + 20;
    const animH = h - animY - 40;
    if (animH > 30) {
        ctx.font = '11px sans-serif';
        ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
        ctx.fillText('当前采样计数 (蒙特卡洛实时演示)', chartX, animY);
        // 用一个闪烁圆表示当前采样中
        const blink = (currentTime * 4) % 1;
        const dotColor = blink < 0.5 ? '#ef4444' : '#fbbf24';
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(chartX + 280, animY - 4, 5, 0, Math.PI * 2);
        ctx.fill();
        // 进度条
        const barX = chartX + 300;
        const barW2 = 140;
        const progress = (currentTime * 0.4) % 1;
        ctx.fillStyle = isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.15)';
        roundRectPath(ctx, barX, animY - 8, barW2, 12, 4);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        roundRectPath(ctx, barX, animY - 8, barW2 * progress, 12, 4);
        ctx.fill();
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = '10px sans-serif';
        ctx.fillText(`${(progress * 100).toFixed(0)}%`, barX + barW2 + 8, animY);
    }

    // --- HUD ---
    drawHud(ctx, isDark, [
        { label: 'λ (= N̄)', value: `${meanCount}` },
        { label: 'σ (= √λ)', value: sigma.toFixed(2) },
        { label: 'n 试验', value: `${nTrials}` },
        { label: '分布', value: meanCount < 20 ? '泊松' : '高斯' }
    ]);

    // 底部公式
    const formulaText = `P(N) = λ^N·e^(-λ)/N!   σ = √λ`;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const ftw = ctx.measureText(formulaText).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, w / 2 - ftw / 2 - 8, h - 32, ftw + 16, 20, 4);
    ctx.fill();
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.fillText(formulaText, w / 2, h - 18);
    ctx.textAlign = 'left';
}

// =====================================================================
// 场景 3: 核裂变链式反应
// =====================================================================

/**
 * 绘制裂变链式反应场景.
 *   - 树状级联: 中子 n 撞击 U-235 → 2-3 新中子 + 两个碎片
 *   - 递归布局到 generations 层
 *   - 临界条件判别 (k=1 临界 / k>1 超临界 / k<1 次临界) + 状态标签
 *   - 闪烁发光 + 放射线效果
 *   - HUD: k 因子、代数、当前裂变总数、E ≈ 200 MeV/次
 */
export function drawFissionChainScene(o: NuclearSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);
    drawStarfield(ctx, w, h, isDark, 20);

    const k = params['multiplicationFactor'] ?? 1.0;
    const genMax = params['generations'] ?? 10;

    // --- 标题 ---
    const statusText = Math.abs(k - 1) < 1e-6 ? '临界 (k=1)' : k > 1 ? '超临界 (k>1)' : '次临界 (k<1)';
    const statusColor = Math.abs(k - 1) < 1e-6 ? '#fbbf24' : k > 1 ? '#ef4444' : '#22c55e';
    drawTitle(ctx, '核裂变链式反应', w, isDark);

    // 状态徽章
    ctx.font = 'bold 13px sans-serif';
    const stw = ctx.measureText(statusText).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.85)';
    roundRectPath(ctx, w - stw - 28, 8, stw + 20, 22, 4);
    ctx.fill();
    ctx.fillStyle = statusColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(statusText, w - 18, 23);
    ctx.textAlign = 'left';

    // 计算实际可达代数 (受屏幕高度约束)
    const maxDepth = Math.min(genMax, 8); // 最多画 8 层以免溢出
    const titleH = 40;
    const bottomInfo = 36;
    const treeTop = titleH + 16;
    const treeH = h - treeTop - bottomInfo;
    const levelH = treeH / (maxDepth + 1);

    // --- 数据: 每代中子数 ---
    const chartFission = simulationResult?.charts?.x_t;
    const chartCum = simulationResult?.charts?.y_t;
    const neuPerGen: number[] = [];
    if (chartFission && chartFission.points.length > 0) {
        for (const pt of chartFission.points) {
            if (pt.x <= maxDepth) neuPerGen[Math.round(pt.x)] = pt.y;
        }
    }
    if (neuPerGen.length === 0) {
        // 退化解析计算
        for (let g = 0; g <= maxDepth; g++) {
            neuPerGen[g] = Math.pow(k, g);
        }
    }
    const Nfinal = neuPerGen[maxDepth] ?? Math.pow(k, maxDepth);

    // --- 递归绘制级联树 ---
    // 存储每个 (g, idx) 位置的[U235 中心坐标]，方便画连接
    const nucleusPositions: Array<Array<{ x: number; y: number }>> = [];

    // 根 (起始中子)
    const rootX = w * 0.15;
    const rootY = treeTop + levelH * 0.5;

    // 绘制起始中子
    const startPulse = 0.6 + 0.4 * Math.sin(currentTime * 3);
    drawGlowCircle(ctx, rootX, rootY, 8, '#22d3ee', startPulse);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('n', rootX, rootY);
    ctx.textBaseline = 'alphabetic';

    // 第 0 代 U235 (被撞击的那个)
    const firstUX = w * 0.35;
    const firstUY = rootY;
    nucleusPositions.push([{ x: firstUX, y: firstUY }]);

    // 入射中子连线
    drawArrow(ctx, rootX + 8, rootY, firstUX - 18, firstUY, '#22d3ee');

    // 递归布局: 每代 g 的第 j 个 U235 → 下一代的 children
    function drawU235(x: number, y: number, isActive: boolean): void {
        const r = isActive ? 18 + 4 * Math.sin(currentTime * 5) : 16;
        const fade = isActive ? 1 : 0.75;
        ctx.globalAlpha = fade;
        drawGlowCircle(ctx, x, y, r, isActive ? '#f97316' : '#f59e0b', 0.5 + 0.3 * Math.sin(currentTime * 3 + x));
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('U', x, y);
        ctx.textBaseline = 'alphabetic';
        ctx.globalAlpha = 1;
    }

    function drawFragment(x: number, y: number, color: string, label: string): void {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
        ctx.textBaseline = 'alphabetic';
    }

    // 绘制第 0 代 U235
    const activationPhase = (currentTime * 0.6) % (genMax + 2);
    drawU235(firstUX, firstUY, activationPhase < 1);

    // 计算每代位置 (伪树)
    function layoutGeneration(g: number): Array<{ x: number; y: number }> {
        const nodes: Array<{ x: number; y: number }> = [];
        if (g <= 0) return nucleusPositions[0] ?? [];
        const parent = nucleusPositions[g - 1] ?? [];
        if (parent.length === 0) return [];
        // 当代预计节点数 (画上限 12 子节点以免爆屏)
        // 简化: 假设 k 等于每核释放的中子数 (这里是常数 k 的中位值)
        const kEffective = Math.max(1, Math.min(3, Math.round(k)));
        let idx = 0;
        for (const pNode of parent) {
            if (idx >= 32) break; // 全局上限
            for (let c = 0; c < kEffective && idx < 32; c++) {
                const spread = levelH * 0.7;
                const yOff = (c - (kEffective - 1) / 2) * spread + (((idx * 37) % 11) - 5);
                const yPos = Math.max(treeTop + 10, Math.min(h - bottomInfo - 20, pNode.y + yOff));
                const xFrac = 0.4 + (g / (genMax + 1)) * 0.5;
                nodes.push({ x: Math.min(w * 0.92, w * xFrac + (idx % 3) * 24), y: yPos });
                idx++;
            }
        }
        return nodes;
    }

    // 预计算各代位置
    for (let g = 1; g <= maxDepth; g++) {
        nucleusPositions[g] = layoutGeneration(g);
    }

    // 绘制各代
    for (let g = 1; g <= maxDepth; g++) {
        const nodes = nucleusPositions[g] ?? [];
        if (nodes.length === 0) continue;
        const isActive = activationPhase >= g && activationPhase < g + 1;
        // 从父位置画连接线 + 中子点标记 + 碎片
        const parents = nucleusPositions[g - 1] ?? [];
        if (parents.length === 0) continue;

        for (let i = 0; i < nodes.length; i++) {
            const child = nodes[i]!;
            const parent = parents[i % parents.length]!;

            // 中子连接
            const midX = (parent.x + child.x) / 2;
            const midY = (parent.y + child.y) / 2;
            drawArrow(ctx, parent.x + 18, parent.y, child.x - 18, child.y, '#22d3ee');
            // 中点 'n'
            ctx.fillStyle = '#67e8f9';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('n', midX, midY - 6);
            ctx.textBaseline = 'alphabetic';

            // 裂变碎片 (仅当在激活阶段显示)
            if (isActive) {
                const fragR = 16;
                const fragAngle = Math.atan2(child.y - parent.y, child.x - parent.x) + Math.PI / 2;
                const f1x = child.x + fragR * Math.cos(fragAngle);
                const f1y = child.y + fragR * Math.sin(fragAngle);
                const f2x = child.x - fragR * Math.cos(fragAngle);
                const f2y = child.y - fragR * Math.sin(fragAngle);
                drawFragment(f1x, f1y, '#3b82f6', 'Ba');
                drawFragment(f2x, f2y, '#22c55e', 'Kr');
            }
        }

        // 批量绘制 U235
        for (const node of nodes) {
            drawU235(node.x, node.y, isActive);
        }
    }

    // --- 底部信息栏 ---
    const bottomY = h - bottomInfo;
    // 累计裂变总数
    let totalFissions = Nfinal;
    if (chartCum && chartCum.points.length > 0) {
        const lastPt = chartCum.points[chartCum.points.length - 1];
        totalFissions = lastPt ? lastPt.y : totalFissions;
    }
    const E_total_MeV = totalFissions * 200;
    const E_MJ = E_total_MeV * 1.602e-19; // 1 MeV = 1.602e-13 J = 1.602e-19 MJ

    const infoRows = [
        `k = ${k.toFixed(2)}`,
        `gen = ${genMax}`,
        `N_final = ${Nfinal.toFixed(0)}`,
        `N_fis = ${totalFissions.toFixed(0)}`,
        `E ≈ ${E_MJ.toExponential(1)} MJ`
    ];
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    infoRows.forEach((r, i) => {
        const x = 16 + i * 130;
        ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
        roundRectPath(ctx, x, bottomY - 2, 122, 18, 3);
        ctx.fill();
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.fillText(r, x + 8, bottomY + 11);
    });

    // --- 闪烁脉冲: 触发效果 ---
    if (Math.abs(k - 1) < 1e-6) {
        // 临界: 底部稳定脉冲
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('⚡ 临界链式反应自持', w - 180, bottomY + 4);
    } else if (k > 1) {
        const pulse = 0.4 + 0.6 * Math.sin(currentTime * 6);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('⚠ 超临界! 指数增长', w - 180, bottomY + 4);
        ctx.globalAlpha = 1;
    } else {
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('次临界: 反应衰减', w - 180, bottomY + 4);
    }
    ctx.textAlign = 'left';

    // --- HUD ---
    const lastU = nucleusPositions[maxDepth]?.[0];
    const nOnScreen = lastU ? (neuPerGen[maxDepth]?.toFixed(0) ?? '—') : '—';
    drawHud(ctx, isDark, [
        { label: 'k (增殖因子)', value: k.toFixed(2) },
        { label: '当前代数', value: `${maxDepth}` },
        { label: 'N_本代中子', value: nOnScreen },
        { label: '状态', value: statusText.split(' ')[0] ?? '' }
    ]);

    // 底部公式
    const formulaText = 'N_g = N₀·k^g    U-235 + n → 碎片 + (2~3)n  + ~200 MeV';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const ftw = ctx.measureText(formulaText).width;
    ctx.fillStyle = isDark ? 'rgba(14,165,233,0.85)' : 'rgba(2,132,199,0.85)';
    roundRectPath(ctx, w / 2 - ftw / 2 - 8, h - 16, ftw + 16, 16, 3);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(formulaText, w / 2, h - 5);
    ctx.textAlign = 'left';
}

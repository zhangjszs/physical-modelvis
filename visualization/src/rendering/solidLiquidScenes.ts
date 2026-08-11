/**
 * 热学场景渲染模块 — 选必三 第三章 固体、液体
 *
 * 场景列表：
 *   - drawMeltingCurveScene
 *   - drawSurfaceTensionScene
 *   - drawCapillaryScene
 *   - drawWettingScene
 *   - drawLiquidCrystalScene
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

export function drawMeltingCurveScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const isNonCrystal = (params['medium'] ?? 0) === 1;
    const Tm = params['meltingPoint'] ?? 50;
    const heatRate = params['heatingRate'] ?? 5;
    const durationMin = params['duration'] ?? 20;

    drawTitle(ctx, isNonCrystal ? '非晶体熔化 (连续软化)' : '晶体熔化/凝固曲线 (T-t)', w, isDark, { size: 18, y: 28 });

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
    drawHud(
        ctx,
        isDark,
        [
            { label: 't', value: `${(currentTime % (tMax + 1)).toFixed(1)} min` },
            { label: 'Tm', value: `${Tm} °C` },
            { label: 'rate', value: `${heatRate} °C/min` },
            { label: 'type', value: isNonCrystal ? '非晶体' : '晶体' }
        ],
        { boxW: 200, lineH: 16 }
    );

    drawInfoBar(
        ctx,
        w,
        h,
        `Tm=${Tm}°C  rate=${heatRate}°C/min  ${isNonCrystal ? '非晶体 (连续软化)' : '晶体 (平台段)'}`,
        isDark,
        { height: 22, yOffset: 34 }
    );

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawSurfaceTensionScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const isMercury = (params['medium'] ?? 0) === 1;
    const L = params['sliderLength'] ?? 4;
    const Tdeg = params['temperature'] ?? 20;
    const sigma0 = isMercury ? 0.487 : 0.072;
    const sigma = sigma0 * (1 - 0.002 * (Tdeg - 20));
    const F = 2 * sigma * (L / 100);

    drawTitle(ctx, '表面张力 (液膜收缩)', w, isDark, { size: 18, y: 28 });

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
    drawHud(
        ctx,
        isDark,
        [
            { label: 't', value: `${currentTime.toFixed(2)} s` },
            { label: 'σ', value: `${sigma.toFixed(4)} N/m` },
            { label: 'L', value: `${L} cm` },
            { label: 'F', value: `${(F * 1000).toFixed(3)} mN` }
        ],
        { boxW: 200, lineH: 16 }
    );

    drawInfoBar(
        ctx,
        w,
        h,
        `${isMercury ? '水银' : '水'}  σ₀=${sigma0}N/m  T=${Tdeg}°C  σ=${sigma.toFixed(4)}N/m  L=${L}cm`,
        isDark,
        { height: 22, yOffset: 34 }
    );

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawCapillaryScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: canvasH, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, canvasH, isDark);

    const rMm = params['tubeRadius'] ?? 0.5;
    const isMercury = (params['medium'] ?? 0) === 1;
    const isParaffin = (params['material'] ?? 0) === 1;

    // 物理参数 (Jurin 公式, 常量与引擎 capillary.ts 同源)
    const sigma = isMercury ? 0.487 : 0.072;
    const rho = isMercury ? 13534 : 1000;
    const thetaDeg = isMercury ? (isParaffin ? 150 : 140) : isParaffin ? 105 : 0;
    const thetaRad = (thetaDeg * Math.PI) / 180;
    const g = 9.8;
    const r = rMm * 1e-3;
    const capillaryHM = (2 * sigma * Math.cos(thetaRad)) / (rho * g * r); // m
    const hMm = capillaryHM * 1000;

    drawTitle(ctx, '毛细现象 (液面升降)', w, isDark, { size: 18, y: 28 });

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
    drawHud(
        ctx,
        isDark,
        [
            { label: 't', value: `${currentTime.toFixed(2)} s` },
            { label: 'h', value: `${hMm.toFixed(2)} mm` },
            { label: 'θ', value: `${thetaDeg}°` },
            { label: 'r', value: `${rMm} mm` }
        ],
        { boxW: 200, lineH: 16 }
    );

    drawInfoBar(
        ctx,
        w,
        canvasH,
        `${isMercury ? '水银' : '水'}  ${isParaffin ? '石蜡' : '玻璃'}  r=${rMm}mm  θ=${thetaDeg}°  h=${hMm.toFixed(2)}mm`,
        isDark,
        { height: 22, yOffset: 34 }
    );

    if (!simulationResult) drawEmptyState(ctx, w, canvasH, isDark);
}

export function drawWettingScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult } = o;
    clearScene(ctx, w, h, isDark);
    const medium = params['medium'] ?? 0;
    const surface = params['surface'] ?? 0;
    const theta = medium < 0.5 && surface < 0.5 ? 35 : medium < 0.5 ? 105 : 140;
    drawTitle(ctx, `润湿/不润湿  θ=${theta}°`, w, isDark, { size: 18, y: 28 });
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
    drawHud(
        ctx,
        isDark,
        [
            { label: 'theta', value: `${theta} deg` },
            { label: 'medium', value: medium < 0.5 ? 'water' : 'mercury' },
            { label: 'state', value: theta < 90 ? 'wetting' : 'non-wetting' }
        ],
        { boxW: 200, lineH: 16 }
    );
    drawInfoBar(ctx, w, h, 'θ < 90° 为润湿, θ > 90° 为不润湿; 接触角由三相界面张力决定', isDark, {
        height: 22,
        yOffset: 34
    });
    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

export function drawLiquidCrystalScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const isCholesteric = (params['medium'] ?? 0) === 1;
    const startTemp = params['startTemp'] ?? 20;
    const endTemp = params['endTemp'] ?? 40;
    const voltage = params['voltage'] ?? 3;
    // 单一真源: 清亮点/阈值电压读引擎 maxValues, 回退默认常量
    const maxLc = (simulationResult?.diagnostics?.maxValues ?? {}) as Record<string, number>;
    const Tc = maxLc.clearingPointDegC ?? 35; // 清亮点
    const Vth = maxLc.thresholdVoltageV ?? 2; // 阈值电压

    drawTitle(ctx, `液晶 (${isCholesteric ? '胆甾型' : '向列型'}) — 光学各向异性`, w, isDark, { size: 18, y: 28 });

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

    // 底部: 透射率-温度曲线 (单一真源: 引擎 x_t Tarasov 曲线, 回退分段线性)
    const chartY = Math.max(leftY + leftH, rightY + rightH) + 20;
    const chartH = h - chartY - 50;
    if (chartH > 60) {
        const xs: number[] = [];
        const ys: number[] = [];
        const xChart = (
            simulationResult?.charts as unknown as
                Record<string, { points: Array<{ x: number; y: number }> }> | undefined
        )?.['x_t'];
        const enginePoints = xChart?.points;
        if (enginePoints && enginePoints.length >= 2) {
            // 引擎曲线覆盖 -10~90℃, 过滤到当前扫描区间
            const filtered = enginePoints.filter(p => p.x >= startTemp && p.x <= endTemp);
            if (filtered.length >= 2) {
                for (const p of filtered) {
                    xs.push(p.x);
                    ys.push(p.y);
                }
            }
        }
        if (xs.length === 0) {
            // 回退: 低于 Tc 时高, 高于 Tc 时低 (各向同性)
            for (let i = 0; i <= 40; i++) {
                const Ti = startTemp + (i / 40) * (endTemp - startTemp);
                let tr: number;
                if (Ti < Tc - 3) tr = 0.85;
                else if (Ti > Tc + 3) tr = 0.15;
                else tr = 0.85 - ((Ti - (Tc - 3)) / 6) * 0.7;
                xs.push(parseFloat(Ti.toFixed(1)));
                ys.push(parseFloat(tr.toFixed(2)));
            }
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
    const transmittancePct =
        maxLc.transmittancePct ??
        (() => {
            // 回退: 与引擎同式 Tarasov + Freedericksz (防御空结果)
            const midT = (startTemp + endTemp) / 2;
            const tempRatio = midT >= Tc ? 0 : Math.pow(1 - midT / Tc, 0.22);
            const voltRatio = voltage <= Vth ? 1 : 1 - (Vth / voltage) * (Vth / voltage);
            return Math.sin(Math.PI * 0.2 * tempRatio * voltRatio * 0.25) ** 2 * 100;
        })();
    drawHud(
        ctx,
        isDark,
        [
            { label: 't', value: `${currentTime.toFixed(2)} s` },
            { label: 'V', value: `${voltage} V` },
            { label: 'Vth', value: `${Vth} V` },
            { label: 'Tc', value: `${Tc} °C` },
            { label: 'T%', value: `${transmittancePct.toFixed(1)}%` }
        ],
        { boxW: 200, lineH: 16 }
    );

    drawInfoBar(
        ctx,
        w,
        h,
        `${isCholesteric ? '胆甾型' : '向列型'}  V=${voltage}V  Vth=${Vth}V  Tc=${Tc}°C  ${isOn ? '开启' : '关闭'}`,
        isDark,
        { height: 22, yOffset: 34 }
    );

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

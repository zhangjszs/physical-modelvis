/**
 * 选必一 第四章「波动/光学」场景渲染模块
 *
 * 包含 6 个可视化场景：
 *   1. drawSoundWaveformScene    — 声波波形 (疏密波 + f, λ, v 标注)
 *   2. drawWaterDiffractionScene — 水波单缝衍射 (直传 vs 衍射扩散)
 *   3. drawDopplerScene          — 多普勒效应 (运动声源 + 疏密波前)
 *   4. drawDoubleSlitScene       — 双缝干涉 (杨氏实验 + I(x) 包络)
 *   5. drawSingleSlitScene       — 单缝衍射 (I(θ) 曲线 + 中央明纹)
 *   6. drawThinFilmScene         — 薄膜干涉 (截面+等厚条纹)
 *
 * 设计原则 (沿用 chapter3Scenes.ts / chapter2Scenes.ts):
 *   - 纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 *   - 每个场景函数负责完整渲染 (背景 + 动态元素 + HUD)
 *   - 与 SimulationCanvas 中 drawCollisionScene / drawSpringScene 风格一致
 */

import type { SimulationResult } from 'physics-core';
import {
    clearScene,
    drawTitle,
    drawSubtitle,
    clamp,
    roundRectPath,
    drawArrow,
    drawHud,
    arrowHead,
    drawInfoBar
} from './renderingUtils';

// ========== 共享类型 ==========

export interface WaveOptSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

// ========== 共享工具 ==========

const BLUE = '#3b82f6';
const GREEN = '#22c55e';
const ORANGE = '#f59e0b';
const RED = '#ef4444';
const PURPLE = '#a855f7';

// ========== 1. 声波波形 ==========

export function drawSoundWaveformScene(o: WaveOptSceneOptions) {
    const { ctx, width: w, height: h, isDark, params, currentTime: t } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '声波波形', w, isDark, { size: 20, y: 32 });

    const freq = params.frequency ?? 440;
    const waveSpeed = params.waveSpeed ?? 340;
    const lambda = waveSpeed / freq;
    const amp = 50;
    const centerY = h / 2;
    const k = (2 * Math.PI) / Math.max(lambda, 1);
    const omega = 2 * Math.PI * freq;

    // 波源 (喇叭)
    ctx.save();
    ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.beginPath();
    ctx.moveTo(40, centerY - 30);
    ctx.lineTo(40, centerY + 30);
    ctx.lineTo(70, centerY + 45);
    ctx.lineTo(70, centerY - 45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('声源', 55, centerY - 55);
    ctx.restore();

    // y-x 波形
    ctx.strokeStyle = isDark ? '#38bdf8' : '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
        const y = centerY + amp * Math.sin(k * x - omega * t);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 波长标注 (一个完整周期)
    const pixelLambda = lambda * 40;
    if (pixelLambda > 20 && pixelLambda < w) {
        ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        const markerX = 100;
        ctx.moveTo(markerX, centerY - amp - 10);
        ctx.lineTo(markerX + pixelLambda, centerY - amp - 10);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('λ', markerX + pixelLambda / 2, centerY - amp - 15);
        ctx.textAlign = 'left';
    }

    // HUD
    drawSubtitle(ctx, `频率 f = ${freq.toFixed(0)} Hz`, 20, h - 80, isDark);
    drawSubtitle(ctx, `波速 v = ${waveSpeed} m/s`, 20, h - 60, isDark);
    drawSubtitle(ctx, `波长 λ = v/f = ${lambda.toFixed(3)} m`, 20, h - 40, isDark);
}

// ========== 2. 水波+单缝衍射 ==========

export function drawWaterDiffractionScene(o: WaveOptSceneOptions) {
    const { ctx, width: w, height: h, isDark, params, currentTime: t } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '水波单缝衍射', w, isDark, { size: 20, y: 32 });

    const lambda = params.wavelength ?? 30;
    const slitWidth = params.slitWidth ?? 60;
    const sourceX = 60;
    const sourceY = h / 2;
    const slitX = w * 0.5;
    const borderTop = 20;
    const borderBottom = h - 60;

    // 水池背景
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, isDark ? '#0c4a6e' : '#bae6fd');
    grad.addColorStop(1, isDark ? '#082f49' : '#7dd3fc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 入射波 (平行直线)
    ctx.strokeStyle = isDark ? '#7dd3fc' : '#0369a1';
    ctx.lineWidth = 1.5;
    const numWaves = 6;
    for (let i = 0; i < numWaves; i++) {
        const yOff = ((i - (numWaves - 1) / 2) * (h - 80)) / numWaves + 40;
        ctx.beginPath();
        for (let x = sourceX; x < slitX; x++) {
            const phase = ((x - sourceX) / lambda - t * 2) * 2 * Math.PI;
            const yy = yOff + 6 * Math.sin(phase);
            if (x === sourceX) ctx.moveTo(x, yy);
            else ctx.lineTo(x, yy);
        }
        ctx.stroke();
    }

    // 带缝的挡板
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    ctx.fillRect(slitX - 3, borderTop, 6, sourceY - slitWidth / 2 - borderTop);
    ctx.fillRect(slitX - 3, sourceY + slitWidth / 2, 6, borderBottom - sourceY - slitWidth / 2);

    // 缝后波: 若 slit >> λ 为近似直线, 否则圆扩散
    const ratio = slitWidth / lambda;
    ctx.strokeStyle = isDark ? '#38bdf8' : '#0284c7';
    ctx.lineWidth = 2;
    const waveCount = 5;
    for (let n = 1; n <= waveCount; n++) {
        const r = n * lambda + ((t * 30) % lambda);
        if (r <= 0) continue;
        ctx.beginPath();
        ctx.globalAlpha = 1 - n * 0.15;
        if (ratio < 2) {
            // 衍射明显 — 半圆
            ctx.arc(slitX, sourceY, r, -Math.PI / 2, Math.PI / 2, false);
        } else {
            // 近似直线 — 矩形波前
            ctx.moveTo(slitX + r, sourceY - ((h - 80) / 2 / numWaves) * n);
            ctx.lineTo(slitX + r, sourceY + ((h - 80) / 2 / numWaves) * n);
        }
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // HUD
    const mode = ratio < 2 ? '明显衍射' : '近似直线传播';
    drawSubtitle(
        ctx,
        `波长 λ = ${lambda}px | 缝宽 a = ${slitWidth}px | a/λ = ${ratio.toFixed(1)} | ${mode}`,
        20,
        h - 20,
        isDark
    );
}

// ========== 3. 多普勒效应 ==========

export function drawDopplerScene(o: WaveOptSceneOptions) {
    const { ctx, width: w, height: h, isDark, params, currentTime: t } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '多普勒效应', w, isDark, { size: 20, y: 32 });

    const vSource = params.sourceSpeed ?? 50;
    const vWave = params.waveSpeed ?? 340;
    const f0 = params.frequency ?? 1;
    const maxRadius = Math.max(w, h);
    const cx = ((vSource * t) % (w + 200)) - 100;
    const cy = h / 2;

    // 多个波前圆
    const period = 1 / f0;
    const numWaves = 8;
    for (let n = 0; n < numWaves; n++) {
        const tEmit = t - n * period;
        if (tEmit < 0) continue;
        const r = vWave * tEmit * 0.5;
        if (r <= 0 || r > maxRadius) continue;
        const emitX = ((vSource * tEmit) % (w + 200)) - 100;
        ctx.strokeStyle = isDark ? `rgba(56,189,248,${1 - n * 0.12})` : `rgba(2,132,199,${1 - n * 0.12})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(emitX, cy, r, 0, 2 * Math.PI);
        ctx.stroke();
    }

    // 声源当前位置
    ctx.fillStyle = isDark ? '#f97316' : '#ea580c';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('声源', cx, cy - 14);
    ctx.textAlign = 'left';

    // 观察者 + 观测频率
    const observers = [
        { x: w - 80, label: '前' },
        { x: 80, label: '后' }
    ];
    for (const obs of observers) {
        ctx.fillStyle = isDark ? '#a3e635' : '#65a30d';
        ctx.beginPath();
        ctx.arc(obs.x, cy, 6, 0, 2 * Math.PI);
        ctx.fill();
        const dir = obs.x > cx ? 1 : -1;
        const fObs = (f0 * vWave) / (vWave - dir * vSource);
        ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b';
        ctx.font = '12px sans-serif';
        ctx.fillText(`${obs.label}: f'=${fObs.toFixed(2)}`, obs.x - 30, cy + 24);
    }

    // HUD
    drawSubtitle(ctx, `f₀=${f0}Hz v_s=${vSource}m/s v=${vWave}m/s 蓝移(前) f'>f₀ / 红移(后) f'<f₀`, 20, h - 20, isDark);
}

// ========== 4. 双缝干涉 ==========

export function drawDoubleSlitScene(o: WaveOptSceneOptions) {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '杨氏双缝干涉', w, isDark, { size: 20, y: 32 });

    const lambda = params.wavelength ?? 5;
    const d = params.slitDistance ?? 20;
    const L = params.screenDistance ?? 400;
    const slitX = w * 0.3;
    const screenX = slitX + 220;

    // 光源
    ctx.fillStyle = isDark ? '#ef4444' : '#dc2626';
    ctx.beginPath();
    ctx.arc(30, h / 2, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b';
    ctx.font = '12px sans-serif';
    ctx.fillText('激光', 18, h / 2 - 16);

    // 双缝挡板
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    const slitSep = d * 3;
    ctx.fillRect(slitX - 3, 40, 6, h / 2 - slitSep / 2 - 40);
    ctx.fillRect(slitX - 3, h / 2 - slitSep / 2, 6, slitSep);
    ctx.fillRect(slitX - 3, h / 2 + slitSep / 2, 6, h - h / 2 - slitSep / 2 - 40);

    // 屏幕
    ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
    ctx.fillRect(screenX, 40, 4, h - 80);

    // 干涉条纹
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    const screenH = h - 80;
    for (let py = 0; py < screenH; py++) {
        const y = 40 + py - h / 2;
        const theta = Math.atan(y / L);
        const pathDiff = d * Math.sin(theta);
        const intensity = Math.cos((Math.PI * pathDiff) / lambda) ** 2;
        const yPx = py + 40;
        const r = Math.floor(255 * intensity);
        ctx.fillStyle = `rgb(${r},${r * 0.9},${Math.floor(r * 0.3)})`;
        ctx.fillRect(screenX, yPx, 4, 1);
    }
    ctx.textAlign = 'left';

    // 上方显示光强曲线
    const curveW = screenX - slitX - 10;
    ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let py = 0; py < screenH; py++) {
        const y = py - screenH / 2;
        const theta = Math.atan(y / L);
        const pathDiff = d * Math.sin(theta);
        const intensity = Math.cos((Math.PI * pathDiff) / lambda) ** 2;
        const x = slitX + 10 + intensity * curveW;
        if (py === 0) ctx.moveTo(x, 40 + py);
        else ctx.lineTo(x, 40 + py);
    }
    ctx.stroke();
    ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.font = '10px sans-serif';
    ctx.fillText('I(x)', slitX + 10, 50);

    drawSubtitle(ctx, `λ=${lambda} d=${d} L=${L} Δx=λL/d`, 20, h - 20, isDark);
}

// ========== 5. 单缝衍射 ==========

export function drawSingleSlitScene(o: WaveOptSceneOptions) {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '单缝衍射', w, isDark, { size: 20, y: 32 });

    const a = params.slitWidth ?? 15;
    const lambda = params.wavelength ?? 5;
    const L = params.screenDistance ?? 400;

    // 单缝
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    const slitPos = w * 0.3;
    const slitPx = a * 4;
    ctx.fillRect(slitPos - 3, 40, 6, h / 2 - slitPx / 2 - 40);
    ctx.fillRect(slitPos - 3, h / 2 + slitPx / 2, 6, h - h / 2 - slitPx / 2 - 40);

    // 屏幕条纹
    const screenX = slitPos + 200;
    ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
    ctx.fillRect(screenX, 40, 4, h - 80);

    const screenH = h - 80;
    const intensities: number[] = [];
    for (let py = 0; py < screenH; py++) {
        const y = py - screenH / 2;
        const theta = Math.atan(y / L);
        const beta = (Math.PI * a * Math.sin(theta)) / lambda;
        const intensity = beta === 0 ? 1 : Math.sin(beta) / beta;
        const I = intensity ** 2;
        intensities.push(I);
        const r = Math.floor(200 * I + 55);
        const g = Math.floor(180 * I + 40);
        const b = Math.floor(60 * I + 30);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(screenX, 40 + py, 4, 1);
    }

    // I(θ) 包络曲线
    const curveX = screenX + 40;
    ctx.strokeStyle = isDark ? '#f97316' : '#ea580c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let py = 0; py < screenH; py++) {
        const x = curveX + (intensities[py] ?? 0) * 80;
        if (py === 0) ctx.moveTo(x, 40 + py);
        else ctx.lineTo(x, 40 + py);
    }
    ctx.stroke();
    ctx.fillStyle = isDark ? '#f97316' : '#ea580c';
    ctx.font = '10px sans-serif';
    ctx.fillText('I(θ)', curveX, 38);

    drawSubtitle(ctx, `缝宽 a=${a} λ=${lambda} 中央明纹 Δθ=2λ/a 次级明纹≈±1.43λ/a`, 20, h - 20, isDark);
}

// ========== 6. 薄膜干涉 ==========

export function drawThinFilmScene(o: WaveOptSceneOptions) {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '薄膜干涉', w, isDark, { size: 20, y: 32 });

    const nFilm = params.refractiveIndex ?? 1.33;
    const thickness = params.thickness ?? 500;
    const lambda = params.wavelength ?? 550;

    // 薄膜截面
    const filmTop = h * 0.35;
    const filmBottom = h * 0.55;
    const filmGrad = ctx.createLinearGradient(0, filmTop, 0, filmBottom);
    filmGrad.addColorStop(0, isDark ? 'rgba(56,189,248,0.3)' : 'rgba(56,189,248,0.2)');
    filmGrad.addColorStop(1, isDark ? 'rgba(14,165,233,0.3)' : 'rgba(14,165,233,0.2)');
    ctx.fillStyle = filmGrad;
    ctx.fillRect(40, filmTop, w - 80, filmBottom - filmTop);
    ctx.strokeStyle = isDark ? '#38bdf8' : '#0284c7';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, filmTop, w - 80, filmBottom - filmTop);

    // 介质标注
    ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b';
    ctx.font = '12px sans-serif';
    ctx.fillText('空气 n=1', 50, filmTop - 10);
    ctx.fillText(`薄膜 n=${nFilm}`, 50, (filmTop + filmBottom) / 2);
    ctx.fillText('空气 n=1', 50, filmBottom + 20);

    // 入射光线 (三条)
    const incidentX = w * 0.25;
    const ang = Math.PI / 6;
    const rayLen = 80;
    for (const off of [-30, 0, 30]) {
        const startY = filmTop - rayLen + off;
        const endY = filmTop + off;
        const endX = incidentX + (endY - startY) * Math.cos(ang);
        ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(incidentX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    // 反射光 1 (上表面)
    ctx.strokeStyle = isDark ? '#f97316' : '#ea580c';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(incidentX + 30, filmTop - 30);
    ctx.lineTo(incidentX + 30 + 50, filmTop - 30 - 50);
    ctx.stroke();

    // 反射光 2 (下表面)
    ctx.strokeStyle = isDark ? '#a3e635' : '#65a30d';
    ctx.beginPath();
    ctx.moveTo(incidentX + 30, filmBottom + 30);
    ctx.lineTo(incidentX + 30 + 50, filmBottom + 30 + 50);
    ctx.stroke();
    ctx.setLineDash([]);

    // 半波损失标注
    ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
    ctx.font = '11px sans-serif';
    ctx.fillText('半波损失 λ/2', incidentX + 35, filmTop - 38);

    // 等厚条纹 (底部)
    const stripeY = h * 0.7;
    ctx.font = '12px sans-serif';
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.fillText('等厚干涉条纹 (俯视)', 40, stripeY - 10);
    const stripeW = w - 80;
    const stripeH = 40;
    for (let i = 0; i < stripeW; i += 2) {
        const t = thickness + (i / stripeW - 0.5) * 200;
        const phase = (4 * Math.PI * nFilm * t) / lambda;
        const I = Math.cos(phase) ** 2;
        const r = Math.floor(200 * I + 55);
        const g = Math.floor(180 * I + 40);
        const b = Math.floor(60 * I + 80);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(40 + i, stripeY, 2, stripeH);
    }

    drawSubtitle(ctx, `n=${nFilm} d=${thickness}nm λ=${lambda}nm Δ=2nd+λ/2`, 20, h - 20, isDark);
}

// ========== 7. 光的折射 (Snell 定律) ==========

export function drawRefractionScene(o: WaveOptSceneOptions) {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '光的折射定律 (Snell)', w, isDark, { size: 20, y: 32 });

    const n1 = params.n1 ?? 1.0;
    const n2 = params.n2 ?? 1.5;
    const a1 = ((params.angle ?? 30) * Math.PI) / 180;
    const cy = h / 2;
    const cx = w * 0.5;
    const rayLen = h * 0.32;

    // 两种介质背景
    ctx.fillStyle = isDark ? 'rgba(56,189,248,0.10)' : 'rgba(56,189,248,0.10)';
    ctx.fillRect(0, 0, w, cy);
    ctx.fillStyle = isDark ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0.10)';
    ctx.fillRect(0, cy, w, cy);
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = '13px sans-serif';
    ctx.fillText(`介质1  n₁=${n1.toFixed(2)}`, 14, cy - 12);
    ctx.fillText(`介质2  n₂=${n2.toFixed(2)}`, 14, cy + 22);

    // 界面 + 法线
    ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cx, cy - rayLen - 20);
    ctx.lineTo(cx, cy + rayLen + 20);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = mutedText(isDark);
    ctx.fillText('法线', cx + 8, cy - rayLen - 20);

    const sinA2 = (n1 / n2) * Math.sin(a1);
    if (sinA2 > 1) {
        // 全反射
        const srcX = cx - Math.sin(a1) * rayLen;
        const srcY = cy - Math.cos(a1) * rayLen;
        drawArrow(ctx, srcX, srcY, cx, cy, ORANGE, '');
        // 反射光线 (介质1 内, 关于界面对称)
        const rx = cx + Math.sin(a1) * rayLen;
        const ry = cy - Math.cos(a1) * rayLen;
        drawArrow(ctx, cx, cy, rx, ry, RED, '');
        const crit = (Math.asin(n2 / n1) * 180) / Math.PI;
        drawHud(
            ctx,
            isDark,
            [
                { label: 'θ₁', value: `${((a1 * 180) / Math.PI).toFixed(0)}°` },
                { label: 'θ₂', value: '全反射' },
                { label: 'θc', value: `${crit.toFixed(1)}°` }
            ],
            {
                boxX: 8,
                boxY: 32,
                boxW: 156,
                lineH: 20,
                borderRadius: 8,
                bgAlpha: { dark: 0.7, light: 0.82 },
                font: '13px sans-serif',
                textBaseline: 'alphabetic',
                textStartY: 54,
                twoColumn: true,
                valueX: 62,
                boxH: 70
            }
        );
        drawSubtitle(ctx, `n₁>n₂ 且 θ₁>θc → 发生全反射`, 20, h - 20, isDark);
        return;
    }
    const a2 = Math.asin(sinA2);
    const srcX = cx - Math.sin(a1) * rayLen;
    const srcY = cy - Math.cos(a1) * rayLen;
    drawArrow(ctx, srcX, srcY, cx, cy, ORANGE, '');
    const rX = cx + Math.sin(a2) * rayLen;
    const rY = cy + Math.cos(a2) * rayLen;
    drawArrow(ctx, cx, cy, rX, rY, GREEN, '');
    drawHud(
        ctx,
        isDark,
        [
            { label: 'θ₁', value: `${((a1 * 180) / Math.PI).toFixed(0)}°` },
            { label: 'θ₂', value: `${((a2 * 180) / Math.PI).toFixed(1)}°` },
            { label: 'n₁/n₂', value: `${(n1 / n2).toFixed(2)}` }
        ],
        {
            boxX: 8,
            boxY: 32,
            boxW: 156,
            lineH: 20,
            borderRadius: 8,
            bgAlpha: { dark: 0.7, light: 0.82 },
            font: '13px sans-serif',
            textBaseline: 'alphabetic',
            textStartY: 54,
            twoColumn: true,
            valueX: 62,
            boxH: 70
        }
    );
    drawSubtitle(ctx, `n₁sinθ₁ = n₂sinθ₂ → sinθ₂ = (n₁/n₂)sinθ₁`, 20, h - 20, isDark);
}

function mutedText(isDark: boolean): string {
    return isDark ? '#94a3b8' : '#64748b';
}

// ========== 8. 双缝干涉 (杨氏实验, 参数 slitSep/screenDist) ==========

export function drawInterferenceScene(o: WaveOptSceneOptions) {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '双缝干涉 (杨氏实验)', w, isDark, { size: 20, y: 32 });

    const lambdaNm = params.wavelength ?? 600;
    const dMm = params.slitSep ?? 0.5;
    const LM = params.screenDist ?? 2.0;
    const lambda = lambdaNm * 1e-9;
    const d = Math.max(dMm * 1e-3, 1e-6);
    const L = LM;
    const slitX = w * 0.28;
    const screenX = slitX + 230;
    const slitSep = dMm * 60;

    // 光源
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(28, h / 2, 8, 0, 2 * Math.PI);
    ctx.fill();
    // 双缝
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    ctx.fillRect(slitX - 3, 40, 6, h / 2 - slitSep / 2 - 40);
    ctx.fillRect(slitX - 3, h / 2 - slitSep / 2, 6, slitSep);
    ctx.fillRect(slitX - 3, h / 2 + slitSep / 2, 6, h - h / 2 - slitSep / 2 - 40);
    // 屏幕 + 条纹
    ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
    ctx.fillRect(screenX, 40, 4, h - 80);
    const screenH = h - 80;
    for (let py = 0; py < screenH; py++) {
        const y = py - screenH / 2;
        const theta = Math.atan(y / L);
        const pathDiff = d * Math.sin(theta);
        const I = Math.cos((Math.PI * pathDiff) / lambda) ** 2;
        const r = Math.floor(255 * I);
        ctx.fillStyle = `rgb(${r},${Math.floor(r * 0.9)},${Math.floor(r * 0.3)})`;
        ctx.fillRect(screenX, 40 + py, 4, 1);
    }
    // 光强曲线
    const curveW = screenX - slitX - 10;
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let py = 0; py < screenH; py++) {
        const y = py - screenH / 2;
        const theta = Math.atan(y / L);
        const pathDiff = d * Math.sin(theta);
        const I = Math.cos((Math.PI * pathDiff) / lambda) ** 2;
        const x = slitX + 10 + I * curveW;
        if (py === 0) ctx.moveTo(x, 40 + py);
        else ctx.lineTo(x, 40 + py);
    }
    ctx.stroke();
    const dY = (lambda * L) / d; // m
    drawHud(
        ctx,
        isDark,
        [
            { label: 'λ', value: `${lambdaNm.toFixed(0)} nm` },
            { label: 'd', value: `${dMm.toFixed(2)} mm` },
            { label: 'Δy', value: `${(dY * 1000).toFixed(2)} mm` }
        ],
        {
            boxX: 8,
            boxY: 32,
            boxW: 156,
            lineH: 20,
            borderRadius: 8,
            bgAlpha: { dark: 0.7, light: 0.82 },
            font: '13px sans-serif',
            textBaseline: 'alphabetic',
            textStartY: 54,
            twoColumn: true,
            valueX: 62,
            boxH: 70
        }
    );
    drawSubtitle(
        ctx,
        params.filmThickness && params.filmThickness > 0
            ? '含薄膜模式 (薄膜干涉叠加)'
            : `Δy = λL/d = ${dY.toExponential(2)} m`,
        20,
        h - 20,
        isDark
    );
}

// ========== 9. 光栅衍射 (光栅方程 d sinθ = kλ) ==========

export function drawDiffractionGratingScene(o: WaveOptSceneOptions) {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '光栅衍射 (光栅方程)', w, isDark, { size: 20, y: 32 });

    const dUm = params.gratingConst ?? 2;
    const lambdaNm = params.wavelength ?? 550;
    const orderMax = params.orderMax ?? 4;
    const N = params.slitCount ?? 500;
    const d = dUm * 1e-6;
    const lambda = lambdaNm * 1e-9;
    const kMax = Math.min(orderMax, Math.floor(d / lambda));

    const cx = w * 0.5;
    const cy = h * 0.5;
    const fanLen = h * 0.34;
    // 光栅 (竖直)
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    ctx.fillRect(cx - 4, cy - fanLen, 8, fanLen * 2);
    // 入射光
    drawArrow(ctx, cx - 120, cy, cx, cy, ORANGE, '');

    const rows: Array<{ k: number; theta: number }> = [];
    for (let k = -kMax; k <= kMax; k++) {
        const sinT = (k * lambda) / d;
        if (Math.abs(sinT) > 1) continue;
        const theta = Math.asin(sinT);
        rows.push({ k, theta });
        const ex = cx + Math.sin(theta) * fanLen * 1.7;
        const ey = cy + Math.cos(theta) * fanLen * 1.7;
        const bright = k === 0 ? 255 : clamp(255 - Math.abs(k) * 40, 90, 255);
        ctx.strokeStyle = `rgb(${bright},${Math.floor(bright * 0.85)},${Math.floor(bright * 0.2)})`;
        ctx.lineWidth = clamp(60 / Math.sqrt(N), 1.5, 8);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.fillStyle = mutedText(isDark);
        ctx.font = '12px sans-serif';
        ctx.fillText(`k=${k}`, ex + 4, ey);
    }
    const firstOrder = (lambda / d) * (180 / Math.PI);
    drawHud(
        ctx,
        isDark,
        [
            { label: 'd', value: `${dUm.toFixed(1)} μm` },
            { label: 'λ', value: `${lambdaNm.toFixed(0)} nm` },
            { label: 'k_max', value: `${kMax}` }
        ],
        {
            boxX: 8,
            boxY: 32,
            boxW: 156,
            lineH: 20,
            borderRadius: 8,
            bgAlpha: { dark: 0.7, light: 0.82 },
            font: '13px sans-serif',
            textBaseline: 'alphabetic',
            textStartY: 54,
            twoColumn: true,
            valueX: 62,
            boxH: 70
        }
    );
    drawSubtitle(ctx, `d·sinθ = kλ  →  ±1 级 θ ≈ ${firstOrder.toFixed(1)}°  (N=${N} 谱线越锐)`, 20, h - 20, isDark);
}

// ========== 10. 偏振光 (马吕斯定律) ==========

export function drawPolarizationMalusScene(o: WaveOptSceneOptions) {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '偏振光 (马吕斯定律)', w, isDark, { size: 20, y: 32 });

    const I0 = params.initIntensity ?? 1;
    const n = Math.round(params.nPolarizers ?? 2);
    const a0 = params.angle0 ?? 0;
    const a1 = params.angle1 ?? 45;
    const a2 = params.angle2 ?? 90;
    const incAngle = params.incAngle ?? 0;
    const angles = [a0, a1, a2].slice(0, n);

    let I = I0;
    let prev = incAngle;
    const rowH = 64;
    const top = h * 0.26;
    for (let i = 0; i < n; i++) {
        const p = angles[i] ?? 0;
        const delta = ((p - prev) * Math.PI) / 180;
        I *= Math.cos(delta) ** 2;
        prev = p;
        const y = top + i * rowH;
        // 偏振片
        ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
        ctx.strokeStyle = isDark ? '#64748b' : '#475569';
        ctx.lineWidth = 2;
        roundRectPath(ctx, w * 0.3, y - 22, 26, 44, 5);
        ctx.fill();
        ctx.stroke();
        // 透振方向
        const ang = (p * Math.PI) / 180;
        ctx.strokeStyle = PURPLE;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w * 0.3 + 13 - Math.cos(ang) * 18, y - Math.sin(ang) * 18);
        ctx.lineTo(w * 0.3 + 13 + Math.cos(ang) * 18, y + Math.sin(ang) * 18);
        ctx.stroke();
        ctx.fillStyle = mutedText(isDark);
        ctx.font = '12px sans-serif';
        ctx.fillText(`P${i + 1}  ${p.toFixed(0)}°`, w * 0.3 + 36, y + 4);
        // 强度条
        const barX = w * 0.6;
        ctx.fillStyle = isDark ? '#334155' : '#cbd5e1';
        roundRectPath(ctx, barX, y - 16, 200, 14, 4);
        ctx.fill();
        ctx.fillStyle = BLUE;
        roundRectPath(ctx, barX, y - 16, 200 * clamp(I, 0, 1), 14, 4);
        ctx.fill();
    }
    drawHud(
        ctx,
        isDark,
        [
            { label: 'I₀', value: I0.toFixed(2) },
            { label: 'n', value: `${n}` },
            { label: 'I', value: I.toFixed(3) }
        ],
        {
            boxX: 8,
            boxY: 32,
            boxW: 156,
            lineH: 20,
            borderRadius: 8,
            bgAlpha: { dark: 0.7, light: 0.82 },
            font: '13px sans-serif',
            textBaseline: 'alphabetic',
            textStartY: 54,
            twoColumn: true,
            valueX: 62,
            boxH: 70
        }
    );
    drawSubtitle(ctx, `马吕斯定律: I = I₀·Π cos²(Δθᵢ)  →  I=${I.toFixed(3)}`, 20, h - 20, isDark);
}

// ========== 11. 全息照相 (干涉记录) ==========

export function drawHologramScene(o: WaveOptSceneOptions) {
    const { ctx, width: w, height: h, isDark, params, currentTime: t } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '全息照相 (干涉记录)', w, isDark, { size: 20, y: 32 });

    const thr = ((params.refAngle ?? 30) * Math.PI) / 180;
    const tho = ((params.objAngle ?? -10) * Math.PI) / 180;
    const lambdaNm = params.wavelength ?? 632.8;
    const ar = params.refAmp ?? 1;
    const ao = params.objAmp ?? 0.5;
    const k = (2 * Math.PI) / (lambdaNm * 1e-9);
    const lambda = lambdaNm * 1e-9;
    const fringeSpacing = lambda / Math.max(Math.abs(Math.sin(thr) - Math.sin(tho)), 1e-3); // m

    const plateX = w * 0.62;
    const plateTop = h * 0.18;
    const plateH = h * 0.5;
    // 参考光 (上) 与 物光 (下) 入射
    drawArrow(ctx, w * 0.1, plateTop + 20, plateX, plateTop + 20, RED, '参考光');
    drawArrow(ctx, w * 0.1, plateTop + plateH - 20, plateX, plateTop + plateH - 20, GREEN, '物光');
    // 干板
    ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = 2;
    ctx.fillRect(plateX, plateTop, 10, plateH);
    ctx.strokeRect(plateX, plateTop, 10, plateH);
    // 记录条纹 (cos 调制)
    const phaseShift = t * 0.6;
    for (let y = 0; y < plateH; y += 2) {
        const yy = plateTop + y;
        const Int = ar * ar + ao * ao + 2 * ar * ao * Math.cos(k * yy * (Math.sin(thr) - Math.sin(tho)) + phaseShift);
        const norm = clamp(Int / (ar * ar + ao * ao + 2 * ar * ao + 1e-6), 0, 1);
        const c = Math.floor(255 * norm);
        ctx.fillStyle = `rgb(${c},${c},${Math.floor(c * 0.7)})`;
        ctx.fillRect(plateX - 14, yy, 14, 2);
    }
    // 再现光束 (重建)
    drawArrow(ctx, plateX + 30, plateTop + plateH / 2, plateX + 160, plateTop + plateH / 2 - 60, BLUE, '再现');
    drawHud(
        ctx,
        isDark,
        [
            { label: 'λ', value: `${lambdaNm.toFixed(1)} nm` },
            { label: 'θr-θo', value: `${(((thr - tho) * 180) / Math.PI).toFixed(0)}°` },
            { label: 'Λ', value: `${(fringeSpacing * 1e6).toFixed(2)} μm` }
        ],
        {
            boxX: 8,
            boxY: 32,
            boxW: 156,
            lineH: 20,
            borderRadius: 8,
            bgAlpha: { dark: 0.7, light: 0.82 },
            font: '13px sans-serif',
            textBaseline: 'alphabetic',
            textStartY: 54,
            twoColumn: true,
            valueX: 62,
            boxH: 70
        }
    );
    drawSubtitle(ctx, `条纹间距 Λ = λ/|sinθr−sinθo| = ${(fringeSpacing * 1e6).toFixed(2)} μm`, 20, h - 20, isDark);
}

export function drawTotalInternalReflectionScene(o: WaveOptSceneOptions): void {
    const { ctx, width, height, isDark, params } = o;
    clearScene(ctx, width, height, isDark);
    const n1 = params['n1'] ?? 1.5;
    const n2 = params['n2'] ?? 1.0;
    const angleDeg = params['angle'] ?? 50;
    const mode = Math.round(params['mode'] ?? 1); // 0=普通折射 1=全反射 2=光导纤维
    const fg = isDark ? '#e2e8f0' : '#1e293b';
    const grid = isDark ? '#334155' : '#cbd5e1';

    drawTitle(ctx, '全反射与光导', width, isDark, { size: 18, y: 28 });

    if (mode === 2) {
        // ---- 光导纤维：水平纤芯内的全反射传导 ----
        const fy0 = height * 0.3;
        const fy1 = height * 0.7;
        const fx0 = width * 0.12;
        const fx1 = width * 0.88;
        ctx.fillStyle = isDark ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.12)';
        ctx.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
        ctx.strokeStyle = grid;
        ctx.lineWidth = 2;
        ctx.strokeRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
        const cy = (fy0 + fy1) / 2;
        const phi = (angleDeg * Math.PI) / 180;
        let x = fx0;
        let y = cy;
        const dx = Math.cos(phi);
        let dy = Math.sin(phi);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const stepLen = 4;
        for (let i = 0; i < 4000; i++) {
            x += dx * stepLen;
            y += dy * stepLen;
            if (y <= fy0) {
                y = fy0;
                dy = -dy;
            } else if (y >= fy1) {
                y = fy1;
                dy = -dy;
            }
            ctx.lineTo(x, y);
            if (x >= fx1) break;
        }
        ctx.stroke();
        arrowHead(ctx, fx0, cy, fx0 + Math.cos(phi) * 30, cy + Math.sin(phi) * 30, 10, '#f59e0b');
        ctx.fillStyle = fg;
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`纤芯 n₁=${n1.toFixed(2)}  /  包层 n₂=${n2.toFixed(2)}`, 12, height - 40);
        ctx.fillText(`入射角 φ=${angleDeg.toFixed(0)}° → 全反射在芯-包层界面上传导`, 12, height - 22);
        drawHud(
            ctx,
            isDark,
            [
                { label: 'n₁(芯)', value: n1.toFixed(2) },
                { label: 'n₂(包层)', value: n2.toFixed(2) },
                { label: 'φ', value: `${angleDeg.toFixed(0)}°` }
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
        return;
    }

    // ---- 界面折射 / 全反射 ----
    const cx = width / 2;
    const cy = height / 2;
    const scale = Math.min(width, height) * 0.34;
    const math = (x: number, y: number): [number, number] => [cx + x * scale, cy - y * scale];

    // 两种介质
    ctx.fillStyle = isDark ? 'rgba(56,189,248,0.08)' : 'rgba(56,189,248,0.10)';
    ctx.fillRect(0, 0, width, cy);
    ctx.fillStyle = isDark ? 'rgba(168,85,247,0.08)' : 'rgba(168,85,247,0.10)';
    ctx.fillRect(0, cy, width, height - cy);

    // 界面
    ctx.strokeStyle = grid;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const [lx, ly] = math(-2, 0);
    const [rx, ry] = math(2, 0);
    ctx.moveTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.stroke();

    // 法线
    ctx.strokeStyle = grid;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    const [nx0, ny0] = math(0, 1.6);
    const [nx1, ny1] = math(0, -1.6);
    ctx.moveTo(nx0, ny0);
    ctx.lineTo(nx1, ny1);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = fg;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`介质1  n₁=${n1.toFixed(2)}`, 12, 20);
    ctx.fillText(`介质2  n₂=${n2.toFixed(2)}`, 12, height - 12);

    const th1 = (angleDeg * Math.PI) / 180;
    const critical = n1 > n2 ? Math.asin(Math.min(1, n2 / n1)) : NaN;
    const hit = math(0, 0);

    // 入射光线 (自左上射向界面)
    const L = 2.2;
    const start = math(-L * Math.sin(th1), L * Math.cos(th1));
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.lineTo(hit[0], hit[1]);
    ctx.stroke();
    arrowHead(ctx, start[0], start[1], hit[0], hit[1], 11, '#f59e0b');

    const isTIR = mode === 1 || (n1 > n2 && !isNaN(critical) && th1 > critical);
    if (isTIR) {
        const end = math(L * Math.sin(th1), L * Math.cos(th1)); // 反射回介质1 (向上)
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(hit[0], hit[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
        arrowHead(ctx, hit[0], hit[1], end[0], end[1], 11, '#ef4444');
        const critDeg = isNaN(critical) ? 0 : (critical * 180) / Math.PI;
        drawHud(
            ctx,
            isDark,
            [
                { label: '入射角 θ₁', value: `${angleDeg.toFixed(0)}°` },
                { label: '临界角 θc', value: `${critDeg.toFixed(1)}°` },
                { label: '现象', value: '全反射' }
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
        drawInfoBar(ctx, width, height, `θ₁ > θc → 光全部反射回光密介质 (光导/全反射棱镜原理)`, isDark, {
            height: 22,
            yOffset: 34
        });
    } else {
        const sinTh2 = Math.min(1, (n1 * Math.sin(th1)) / Math.max(1e-6, n2));
        const th2 = Math.asin(sinTh2);
        const end = math(L * Math.sin(th2), -L * Math.cos(th2)); // 折射入介质2 (向下)
        ctx.strokeStyle = '#22c55e';
        ctx.beginPath();
        ctx.moveTo(hit[0], hit[1]);
        ctx.lineTo(end[0], end[1]);
        ctx.stroke();
        arrowHead(ctx, hit[0], hit[1], end[0], end[1], 11, '#22c55e');
        drawHud(
            ctx,
            isDark,
            [
                { label: '入射角 θ₁', value: `${angleDeg.toFixed(0)}°` },
                { label: '折射角 θ₂', value: `${((th2 * 180) / Math.PI).toFixed(0)}°` },
                { label: '现象', value: '折射' }
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
        drawInfoBar(ctx, width, height, `n₁sinθ₁ = n₂sinθ₂ (斯涅尔定律)`, isDark, { height: 22, yOffset: 34 });
    }
}

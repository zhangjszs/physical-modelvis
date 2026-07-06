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

function clearScene(ctx: CanvasRenderingContext2D, w: number, h: number, isDark: boolean) {
  ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
  ctx.fillRect(0, 0, w, h);
}

function drawTitle(ctx: CanvasRenderingContext2D, title: string, w: number, isDark: boolean) {
  ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, w / 2, 32);
  ctx.textAlign = 'left';
}

function drawSubtitle(ctx: CanvasRenderingContext2D, subtitle: string, x: number, y: number, isDark: boolean) {
  ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
  ctx.font = '13px sans-serif';
  ctx.fillText(subtitle, x, y);
}

// ========== 1. 声波波形 ==========

export function drawSoundWaveformScene(o: WaveOptSceneOptions) {
  const { ctx, width: w, height: h, isDark, params, currentTime: t } = o;
  clearScene(ctx, w, h, isDark);
  drawTitle(ctx, '声波波形', w, isDark);

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
  drawTitle(ctx, '水波单缝衍射', w, isDark);

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
    const yOff = (i - (numWaves - 1) / 2) * (h - 80) / numWaves + 40;
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
    const r = n * lambda + (t * 30 % lambda);
    if (r <= 0) continue;
    ctx.beginPath();
    ctx.globalAlpha = 1 - n * 0.15;
    if (ratio < 2) {
      // 衍射明显 — 半圆
      ctx.arc(slitX, sourceY, r, -Math.PI / 2, Math.PI / 2, false);
    } else {
      // 近似直线 — 矩形波前
      ctx.moveTo(slitX + r, sourceY - (h - 80) / 2 / numWaves * n);
      ctx.lineTo(slitX + r, sourceY + (h - 80) / 2 / numWaves * n);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // HUD
  const mode = ratio < 2 ? '明显衍射' : '近似直线传播';
  drawSubtitle(ctx, `波长 λ = ${lambda}px | 缝宽 a = ${slitWidth}px | a/λ = ${ratio.toFixed(1)} | ${mode}`, 20, h - 20, isDark);
}

// ========== 3. 多普勒效应 ==========

export function drawDopplerScene(o: WaveOptSceneOptions) {
  const { ctx, width: w, height: h, isDark, params, currentTime: t } = o;
  clearScene(ctx, w, h, isDark);
  drawTitle(ctx, '多普勒效应', w, isDark);

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
    { x: 80, label: '后' },
  ];
  for (const obs of observers) {
    ctx.fillStyle = isDark ? '#a3e635' : '#65a30d';
    ctx.beginPath();
    ctx.arc(obs.x, cy, 6, 0, 2 * Math.PI);
    ctx.fill();
    const dir = obs.x > cx ? 1 : -1;
    const fObs = f0 * vWave / (vWave - dir * vSource);
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
  drawTitle(ctx, '杨氏双缝干涉', w, isDark);

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
    const intensity = Math.cos(Math.PI * pathDiff / lambda) ** 2;
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
    const intensity = Math.cos(Math.PI * pathDiff / lambda) ** 2;
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
  drawTitle(ctx, '单缝衍射', w, isDark);

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
    const beta = Math.PI * a * Math.sin(theta) / lambda;
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
  drawTitle(ctx, '薄膜干涉', w, isDark);

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
    const I = (Math.cos(phase) ** 2);
    const r = Math.floor(200 * I + 55);
    const g = Math.floor(180 * I + 40);
    const b = Math.floor(60 * I + 80);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(40 + i, stripeY, 2, stripeH);
  }

  drawSubtitle(ctx, `n=${nFilm} d=${thickness}nm λ=${lambda}nm Δ=2nd+λ/2`, 20, h - 20, isDark);
}

/**
 * 选必三「近代物理」场景渲染模块
 *
 * 包含 10 个可视化场景：
 *   1. drawPhotoelectricScene       — 光电效应 (爱因斯坦方程 K_max = hν − W₀ + 阈值 ν₀)
 *   2. drawBohrScene                — 玻尔氢原子能级图 + 发射光谱 (按线系着色)
 *   3. drawRadioactiveScene         — 放射性衰变 (云室径迹 + 指数衰减曲线)
 *   4. drawMicroDeformationScene    — 光杠杆放大微小形变 (杠杆几何 + 放大倍数)
 *   5. drawBlackBodyScene           — 黑体辐射 (普朗克谱 + 维恩位移)
 *   6. drawElectronDiffractionScene — 电子衍射 (德布罗意波 + 晶体衍射环)
 *   7. drawRadiationDeflectionScene — 放射线在磁场中的偏转 (α/β/γ 曲率对比)
 *   8. drawCosmicRayScene           — 宇宙射线 (大气簇射 + 屏蔽衰减)
 *   9. drawNeutronDiscoveryScene    — 中子发现 (查德威克两级碰撞)
 *  10. drawBohrOrbitScene           — 玻尔轨道模型 (rₙ ∝ n², 电子环游)
 *
 * 设计原则 (沿用 nuclearScenes.ts / waveOptScenes.ts):
 *   - 纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 *   - 每个场景函数负责完整渲染 (背景 + 动态元素 + HUD)
 *   - 物理数值尽量复用 constants.ts 的 CODATA 公式 helper
 *
 * 引用 sceneId (来自 modern.ts):
 *   - 'photoelectric' / 'bohr' / 'radioactive' / 'micro-deformation' / 'black-body'
 *   - 'electron-diffraction' / 'radiation-deflection' / 'cosmic-ray'
 *   - 'neutron-discovery' / 'bohr-orbit'
 */

import type { SimulationResult } from 'physics-core';
import {
    photoThresholdFrequencyTHz,
    wienPeakWavelength,
    stefanBoltzmannExitance,
    PLANCK_H,
    E_CHARGE,
    K_BOLTZMANN
} from './constants';

// ========== 共享类型 ==========

export interface ModernSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

// ========== 共享工具函数 ==========

function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
}

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
    const boxW = 230;

    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.78)' : 'rgba(255,255,255,0.88)';
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
 * 脉冲/闪烁发光圆, 用于标注激活的核/电子.
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

const COL = {
    blue: '#3b82f6',
    cyan: '#06b6d4',
    green: '#22c55e',
    orange: '#f59e0b',
    red: '#ef4444',
    purple: '#a855f7',
    yellow: '#eab308',
    pink: '#ec4899',
    gray: '#94a3b8'
};

/** 波长(nm) → 近似可见色, 紫外/红外用紫/暗红表示 */
function wavelengthToColor(nm: number): string {
    if (nm < 380) return '#7c3aed';
    if (nm > 750) return '#7f1d1d';
    const t = clamp((nm - 380) / (750 - 380), 0, 1);
    const hue = 270 - t * 250; // 紫(270)→红(20)
    return `hsl(${hue.toFixed(0)}, 90%, 60%)`;
}

/** 黑体温度 → 发光色 (低温深红, 高温趋白) */
function temperatureColor(T: number): string {
    const t = clamp((T - 1000) / (8000 - 1000), 0, 1);
    const r = 255;
    const gC = Math.round(60 + t * 195);
    const bC = Math.round(30 + t * 225);
    const toHex = (v: number) => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(gC)}${toHex(bC)}`;
}

/** 确定性伪随机 (固定种子, 每帧一致) */
function seeded(i: number): number {
    const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return v - Math.floor(v);
}

/** 云室径迹绘制 (α 短粗略弯 / β 长细弯 / γ 极少直) */
function drawCloudTracks(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    rayNum: number,
    isDark: boolean
): void {
    const color = isDark ? '#e2e8f0' : '#334155';
    if (rayNum === 2) {
        for (let i = 0; i < 3; i++) {
            const sx = x + seeded(i) * w;
            const sy = y + seeded(i + 9) * h;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + 30, sy + 4);
            ctx.stroke();
        }
        return;
    }
    const n = rayNum === 1 ? 7 : 10;
    for (let i = 0; i < n; i++) {
        const sx = x + seeded(i) * w * 0.6;
        const sy = y + seeded(i + 5) * h;
        const len = rayNum === 1 ? h * (0.6 + seeded(i + 20) * 0.3) : h * (0.25 + seeded(i + 30) * 0.2);
        ctx.strokeStyle = color;
        ctx.lineWidth = rayNum === 1 ? 1 : 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        const steps = 14;
        for (let s = 1; s <= steps; s++) {
            const f = s / steps;
            const px = sx + len * f * 0.3;
            const py = sy + len * f;
            const wobble = rayNum === 1 ? Math.sin(f * 10 + i) * 14 * f : Math.sin(f * 6 + i) * 3 * f;
            ctx.lineTo(px + wobble, py);
        }
        ctx.stroke();
    }
}

// =====================================================================
// 场景 1: 光电效应
// =====================================================================

export function drawPhotoelectricScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '光电效应 — 爱因斯坦方程 K_max = hν − W₀', w, isDark);

    const W0 = params['W0'] ?? 2.3;
    const nuMin = params['nuMin'] ?? 300;
    const nuMax = params['nuMax'] ?? 1500;
    const nu0 = photoThresholdFrequencyTHz(W0); // THz
    const h_eV_per_THz = 4.135667696e-3; // h = 4.135667696e-15 eV·s → 每 THz

    const plotX = 70,
        plotY = 60,
        plotW = w - plotX - 30,
        plotH = h - plotY - 70;
    const fLeft = Math.min(nuMin, nu0) - 100;
    const fRight = nuMax + 100;
    const fRange = Math.max(1, fRight - fLeft);
    const Kmax = Math.max(0.1, h_eV_per_THz * fRight - W0);
    const fToX = (f: number) => plotX + ((f - fLeft) / fRange) * plotW;
    const kToY = (k: number) => plotY + plotH - (k / Kmax) * plotH;

    // 坐标轴
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('入射光频率 ν (THz)', plotX + plotW / 2, plotY + plotH + 34);
    ctx.save();
    ctx.translate(18, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('光电子最大初动能 K_max (eV)', 0, 0);
    ctx.restore();
    ctx.textAlign = 'left';

    // 阈值线 ν₀
    const x0 = fToX(nu0);
    ctx.strokeStyle = COL.red;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(x0, plotY);
    ctx.lineTo(x0, plotY + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COL.red;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`ν₀ = ${nu0.toFixed(0)} THz`, x0, plotY + 12);
    ctx.textAlign = 'left';

    // K_max 直线 (ν > ν₀ 段)
    ctx.strokeStyle = COL.green;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x0, kToY(0));
    ctx.lineTo(fToX(fRight), kToY(h_eV_per_THz * fRight - W0));
    ctx.stroke();
    // ν < ν₀ 段 (K = 0, 虚线贴轴)
    ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(fToX(fLeft), kToY(0));
    ctx.lineTo(x0, kToY(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // 动画: 入射光子 + 逸出电子
    const animatedF = fLeft + ((currentTime * 0.5) % 1) * fRange;
    const photonX = fToX(animatedF);
    const photonY = plotY + 14;
    ctx.fillStyle = COL.yellow;
    ctx.beginPath();
    ctx.arc(photonX, photonY, 4, 0, Math.PI * 2);
    ctx.fill();
    if (animatedF > nu0) {
        const K = h_eV_per_THz * animatedF - W0;
        const ey = kToY(K);
        ctx.fillStyle = COL.cyan;
        ctx.beginPath();
        ctx.arc(photonX, ey, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('e⁻', photonX + 6, ey);
    }

    drawHud(ctx, isDark, [
        { label: 'W₀', value: `${W0.toFixed(2)} eV` },
        { label: 'ν₀', value: `${nu0.toFixed(0)} THz` },
        { label: 'ν_max', value: `${nuMax} THz` },
        { label: 'K_max', value: `${(h_eV_per_THz * nuMax - W0).toFixed(2)} eV` }
    ]);
}

// =====================================================================
// 场景 2: 玻尔氢原子能级 + 发射光谱
// =====================================================================

export function drawBohrScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '玻尔氢原子模型 — 能级与发射光谱', w, isDark);

    const seriesNum = params['seriesB'] ?? 1;
    const maxN = Math.max(3, Math.round(params['maxN'] ?? 6));
    const n1 = seriesNum === 0 ? 1 : seriesNum === 2 ? 3 : 2;
    const seriesName = seriesNum === 0 ? '赖曼系(紫外)' : seriesNum === 2 ? '帕邢系(红外)' : '巴尔末系(可见)';
    const seriesColor = seriesNum === 0 ? COL.purple : seriesNum === 2 ? COL.orange : COL.green;
    const E = (n: number) => -13.6 / (n * n); // eV
    const Rydberg = 1.097e7; // m⁻¹

    // 左半: 能级图 (能量轴水平, 越负越靠左)
    const leftX = 60,
        topY = 70,
        botY = h - 60;
    const xE0 = leftX + (w * 0.42 - leftX);
    for (let n = 1; n <= maxN; n++) {
        const y = topY + ((n - 1) / (maxN - 1)) * (botY - topY);
        ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftX, y);
        ctx.lineTo(xE0, y);
        ctx.stroke();
        ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`n=${n}`, xE0 + 6, y + 3);
        ctx.textAlign = 'right';
        ctx.fillText(`${E(n).toFixed(2)} eV`, leftX - 4, y + 3);
    }
    ctx.textAlign = 'left';
    // 跃迁箭头
    for (let n2 = n1 + 1; n2 <= maxN; n2++) {
        const y1 = topY + ((n1 - 1) / (maxN - 1)) * (botY - topY);
        const y2 = topY + ((n2 - 1) / (maxN - 1)) * (botY - topY);
        ctx.strokeStyle = seriesColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xE0 - 8, y2);
        ctx.lineTo(xE0 - 8, y1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(xE0 - 8, y1);
        ctx.lineTo(xE0 - 13, y1 + 6);
        ctx.lineTo(xE0 - 3, y1 + 6);
        ctx.closePath();
        ctx.fillStyle = seriesColor;
        ctx.fill();
    }

    // 右半: 发射光谱条带
    const specX = w * 0.56,
        specW = w - specX - 30,
        specY = h * 0.3,
        specH = 40;
    ctx.fillStyle = isDark ? '#0b1220' : '#0f172a';
    ctx.fillRect(specX, specY, specW, specH);
    for (let n2 = n1 + 1; n2 <= maxN; n2++) {
        const invLam = Rydberg * (1 / (n1 * n1) - 1 / (n2 * n2));
        const lam = 1 / invLam; // m
        const color = wavelengthToColor(lam * 1e9);
        const xPos = specX + ((n2 - n1 - 1) / Math.max(1, maxN - n1)) * specW;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xPos, specY - 10);
        ctx.lineTo(xPos, specY + specH + 10);
        ctx.stroke();
        ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${(lam * 1e9).toFixed(0)}nm`, xPos, specY + specH + 24);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText('发射光谱 (波长)', specX, specY - 16);

    drawHud(ctx, isDark, [
        { label: '线系', value: seriesName },
        { label: 'n₁', value: `${n1}` },
        { label: 'n_max', value: `${maxN}` },
        { label: '谱线条数', value: `${Math.max(0, maxN - n1)}` }
    ]);
}

// =====================================================================
// 场景 3: 放射性衰变 (云室 + 指数衰减)
// =====================================================================

export function drawRadioactiveScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '放射性衰变 — 云室径迹与指数衰减', w, isDark);

    const N0 = params['N0'] ?? 1000;
    const T = params['halfLife'] ?? 10;
    const tEnd = params['tEnd'] ?? 50;
    const rayNum = params['rayType'] ?? 0;
    const rayType = rayNum === 1 ? 'β' : rayNum === 2 ? 'γ' : 'α';

    // 左: 衰减曲线
    const plotX = 60,
        plotY = 70,
        plotW = w * 0.42,
        plotH = h - plotY - 60;
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.stroke();
    ctx.strokeStyle = COL.blue;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
        const t = (i / 100) * tEnd;
        const N = N0 * Math.pow(2, -t / T);
        const x = plotX + (t / tEnd) * plotW;
        const y = plotY + plotH - (N / N0) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    const tNow = (currentTime * 0.4) % tEnd;
    const Nnow = N0 * Math.pow(2, -tNow / T);
    const cx = plotX + (tNow / tEnd) * plotW;
    const cy = plotY + plotH - (Nnow / N0) * plotH;
    ctx.fillStyle = COL.red;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('剩余原子数 N(t) = N₀·2^(−t/T½)', plotX + plotW / 2, plotY + plotH + 34);
    ctx.textAlign = 'left';

    // 右: 云室
    const chX = w * 0.52,
        chY = 70,
        chW = w - chX - 30,
        chH = h - chY - 60;
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(chX, chY, chW, chH);
    ctx.fillStyle = isDark ? 'rgba(148,163,184,0.06)' : 'rgba(100,116,139,0.06)';
    ctx.fillRect(chX, chY, chW, chH);
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('云室 (过饱和蒸气)', chX + chW / 2, chY - 10);
    ctx.textAlign = 'left';
    drawCloudTracks(ctx, chX + 10, chY + 20, chW - 20, chH - 40, rayNum, isDark);

    drawHud(ctx, isDark, [
        { label: 'N₀', value: `${N0}` },
        { label: 'T½', value: `${T} s` },
        { label: 't', value: `${tNow.toFixed(1)} s` },
        { label: 'N(t)', value: `${Nnow.toFixed(0)}` },
        { label: '射线', value: rayType }
    ]);
}

// =====================================================================
// 场景 4: 光杠杆放大微小形变
// =====================================================================

export function drawMicroDeformationScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '光杠杆放大微小形变', w, isDark);

    const F = params['pressure'] ?? 100; // N
    const L = params['laserDist'] ?? 1; // 激光到镜面 (杠杆臂, m)
    const D = params['mirrorDist'] ?? 5; // 镜面到屏 (光程, m)
    const E = params['youngModulus'] ?? 10; // GPa

    // 形变 δ (示意量级): 桌面在 F 下下沉, 与 F/E 成正比
    const delta = (F / (E * 1e9)) * 1e-3; // m
    const theta = delta / L; // 镜面转角 ≈ δ/L (rad)
    const spotShift = 2 * D * theta; // 反射光斑位移 (m)
    const amp = (2 * D) / L; // 放大倍数

    const baseY = h * 0.62;
    const laserX = w * 0.08,
        mirrorX = w * 0.4,
        screenX = w * 0.86;
    // 桌面梁 + 支点
    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, baseY);
    ctx.lineTo(w * 0.92, baseY);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#475569' : '#64748b';
    ctx.beginPath();
    ctx.moveTo(w * 0.5, baseY);
    ctx.lineTo(w * 0.5 - 12, baseY + 26);
    ctx.lineTo(w * 0.5 + 12, baseY + 26);
    ctx.closePath();
    ctx.fill();
    // 力 F
    drawArrow(ctx, w * 0.7, baseY - 60, w * 0.7, baseY - 8, COL.red, 'F');

    // 激光入射 (虚线到镜)
    ctx.strokeStyle = COL.red;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(laserX, baseY - 30);
    ctx.lineTo(mirrorX, baseY - 30);
    ctx.stroke();
    ctx.setLineDash([]);
    // 镜 (放大显示的转角)
    const mirrorTilt = clamp(theta * 1000 * 0.5, -0.35, 0.35);
    ctx.save();
    ctx.translate(mirrorX, baseY - 30);
    ctx.rotate(mirrorTilt);
    ctx.strokeStyle = COL.cyan;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, 22);
    ctx.stroke();
    ctx.restore();
    // 反射光到屏
    const reflAngle = 2 * mirrorTilt;
    ctx.strokeStyle = COL.yellow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mirrorX, baseY - 30);
    ctx.lineTo(screenX, baseY - 30 - Math.tan(reflAngle) * (screenX - mirrorX));
    ctx.stroke();
    // 屏
    ctx.strokeStyle = isDark ? '#475569' : '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenX, baseY - 80);
    ctx.lineTo(screenX, baseY + 20);
    ctx.stroke();
    // 光斑
    const spotY = baseY - 30 - Math.tan(reflAngle) * (screenX - mirrorX);
    ctx.fillStyle = COL.yellow;
    ctx.beginPath();
    ctx.arc(screenX, spotY, 5, 0, Math.PI * 2);
    ctx.fill();

    // 文字标注
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('激光笔', laserX, baseY - 40);
    ctx.fillText('平面镜', mirrorX - 18, baseY + 4);
    ctx.fillText('投影屏', screenX + 6, baseY - 50);

    drawHud(ctx, isDark, [
        { label: 'F', value: `${F} N` },
        { label: 'E', value: `${E} GPa` },
        { label: 'δ (形变量)', value: `${(delta * 1e9).toFixed(3)} nm` },
        { label: '放大 2D/L', value: `${amp.toFixed(1)}×` },
        { label: '光斑位移', value: `${(spotShift * 1e3).toFixed(3)} mm` }
    ]);
}

// =====================================================================
// 场景 5: 黑体辐射 (普朗克谱 + 维恩位移)
// =====================================================================

export function drawBlackBodyScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '黑体辐射 — 普朗克谱与维恩位移', w, isDark);

    const T = params['temperature'] ?? 3000;
    const lamPeakNm = wienPeakWavelength(T) * 1e9; // nm
    const M = stefanBoltzmannExitance(T);

    const plotX = 70,
        plotY = 60,
        plotW = w - plotX - 30,
        plotH = h - plotY - 70;
    const lamMin = 50,
        lamMax = 3000; // nm
    const hc = PLANCK_H * 299792458;
    const kT = K_BOLTZMANN * T;
    const Blambda = (lamNm: number) => {
        const lam = lamNm * 1e-9;
        const x = hc / (lam * kT);
        if (x > 700) return 0;
        return Math.pow(lam, -5) / (Math.exp(x) - 1);
    };
    let peak = 0;
    for (let l = lamMin; l <= lamMax; l += 5) peak = Math.max(peak, Blambda(l));
    const lamToX = (l: number) => plotX + ((l - lamMin) / (lamMax - lamMin)) * plotW;
    const bToY = (b: number) => plotY + plotH - (b / peak) * plotH;

    // 坐标轴
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('波长 λ (nm)', plotX + plotW / 2, plotY + plotH + 34);
    ctx.textAlign = 'left';

    // 普朗克曲线 (填充)
    ctx.beginPath();
    ctx.moveTo(lamToX(lamMin), bToY(0));
    for (let l = lamMin; l <= lamMax; l += 5) ctx.lineTo(lamToX(l), bToY(Blambda(l)));
    ctx.lineTo(lamToX(lamMax), bToY(0));
    ctx.closePath();
    const g = ctx.createLinearGradient(plotX, 0, plotX + plotW, 0);
    const col = temperatureColor(T);
    g.addColorStop(0, col + '10');
    g.addColorStop(1, col + 'cc');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 维恩峰位
    ctx.strokeStyle = COL.red;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(lamToX(lamPeakNm), plotY);
    ctx.lineTo(lamToX(lamPeakNm), plotY + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COL.red;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`λ_max = ${lamPeakNm.toFixed(0)} nm`, lamToX(lamPeakNm) + 6, plotY + 16);

    drawHud(ctx, isDark, [
        { label: 'T', value: `${T} K` },
        { label: 'λ_max', value: `${lamPeakNm.toFixed(0)} nm` },
        { label: 'M=σT⁴', value: `${M.toExponential(2)} W/m²` }
    ]);
}

// =====================================================================
// 场景 6: 电子衍射 (德布罗意波 + 晶体衍射环)
// =====================================================================

const REF_LAMBDA_PM = 12.3; // 参考: 10 kV 电子德布罗意波长 ≈ 12.3 pm

export function drawElectronDiffractionScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '电子衍射 — 德布罗意波与晶体衍射环', w, isDark);

    const V = params['accVoltage'] ?? 10000; // V
    const me = 9.10938356e-31;
    const eV = E_CHARGE * V;
    const lambda = PLANCK_H / Math.sqrt(2 * me * eV); // m
    const lambdaPm = lambda * 1e12;

    // 左: 加速 + 晶体
    const cy0 = h * 0.5;
    ctx.fillStyle = COL.cyan;
    ctx.beginPath();
    ctx.arc(w * 0.08, cy0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('e⁻', w * 0.08, cy0);
    ctx.textBaseline = 'alphabetic';
    drawArrow(ctx, w * 0.08 + 12, cy0, w * 0.28, cy0, COL.cyan);
    // 晶体点阵
    const gx = w * 0.32,
        gy = h * 0.5;
    ctx.fillStyle = isDark ? '#64748b' : '#475569';
    for (let i = -2; i <= 2; i++)
        for (let j = -2; j <= 2; j++) {
            ctx.beginPath();
            ctx.arc(gx + i * 9, gy + j * 9, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('晶体', gx, gy + 36);
    ctx.textAlign = 'left';

    // 右: 衍射屏 (同心环)
    const sx = w * 0.68,
        sy = h * 0.5;
    ctx.strokeStyle = isDark ? '#475569' : '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx - w * 0.26, sy - h * 0.34, w * 0.52, h * 0.68);
    const baseR = h * 0.05;
    const scale = (h * 0.3) / (5 * REF_LAMBDA_PM);
    for (let k = 1; k <= 5; k++) {
        const r = baseR + k * lambdaPm * scale;
        if (r > h * 0.32) break;
        ctx.strokeStyle = `hsla(${200 - k * 18}, 80%, 60%, 0.9)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.fillStyle = COL.cyan;
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
    // 晶体→屏 发散示意
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.25)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.setLineDash([]);

    drawHud(ctx, isDark, [
        { label: '加速电压 V', value: `${(V / 1000).toFixed(1)} kV` },
        { label: 'λ(德布罗意)', value: `${lambdaPm.toFixed(1)} pm` },
        { label: '公式', value: 'λ=h/√(2meV)' }
    ]);
}

// =====================================================================
// 场景 7: 放射线在磁场中的偏转
// =====================================================================

export function drawRadiationDeflectionScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '放射线在磁场中的偏转', w, isDark);

    const B = params['Bfield'] ?? 0.5;
    const K_MeV = params['particleEnergy'] ?? 5;
    const pt = params['particleType'] ?? 0;
    const typeName = pt === 1 ? 'β⁻(电子)' : pt === 2 ? 'γ(光子)' : 'α(氦核)';
    const K_J = K_MeV * 1e6 * E_CHARGE;
    const q = pt === 1 ? -E_CHARGE : pt === 2 ? 0 : 2 * E_CHARGE;
    const m = pt === 1 ? 9.109e-31 : pt === 2 ? 0 : 4 * 1.6605e-27;
    const color = pt === 1 ? COL.green : pt === 2 ? COL.gray : COL.orange;

    const fieldX = w * 0.3,
        fieldW = w * 0.5,
        top = 60,
        bot = h - 50;
    ctx.fillStyle = isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)';
    ctx.fillRect(fieldX, top, fieldW, bot - top);
    ctx.strokeStyle = isDark ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.35)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeRect(fieldX, top, fieldW, bot - top);
    ctx.setLineDash([]);
    ctx.fillStyle = isDark ? 'rgba(96,165,250,0.5)' : 'rgba(37,99,235,0.45)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 6; i++) {
        const bx = fieldX + 20 + (i * (fieldW - 40)) / 5;
        ctx.fillText('×', bx, top + 16);
    }
    ctx.fillText('B 垂直纸面向里', fieldX + fieldW / 2, top + 32);
    ctx.textAlign = 'left';

    const startX = w * 0.08;
    const startY = (top + bot) / 2;
    if (pt === 2) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(w - 20, startY);
        ctx.stroke();
    } else {
        const p = Math.sqrt(2 * m * K_J);
        const r = Math.abs(q) > 0 ? p / (Math.abs(q) * B) : 0;
        const rPix = clamp(r * 120, 16, (bot - top) / 2 - 8);
        const sign = q > 0 ? 1 : -1; // α 向下(+y), β 向上(−y)
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(startX + rPix, startY, rPix, Math.PI, 0, sign > 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + rPix, startY);
        ctx.stroke();
    }
    // 入射粒子
    const prog = (currentTime * 0.5) % 1;
    const px = startX + prog * (fieldX - startX);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, startY, 5, 0, Math.PI * 2);
    ctx.fill();

    drawHud(ctx, isDark, [
        { label: 'B', value: `${B} T` },
        { label: 'K', value: `${K_MeV} MeV` },
        { label: '类型', value: typeName },
        {
            label: '曲率半径 r',
            value: pt === 2 ? '∞(不偏)' : `${(Math.sqrt(2 * m * K_J) / (Math.abs(q) * B)).toExponential(2)} m`
        }
    ]);
}

// =====================================================================
// 场景 8: 宇宙射线 (大气簇射 + 屏蔽衰减)
// =====================================================================

export function drawCosmicRayScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '宇宙射线 — 大气簇射与屏蔽衰减', w, isDark);

    const alt = params['altitude'] ?? 0; // m
    const sm = params['shieldingMode'] ?? 0;
    const shieldName = sm === 1 ? '铅屏蔽' : sm === 2 ? '水屏蔽' : '空气';
    const lambdaEff = sm === 1 ? 0.2 : sm === 2 ? 1.5 : 8.0; // km (示意衰减长度)
    const top = 60,
        bot = h - 50;
    const atmH = bot - top;
    const altToY = (a: number) => bot - (a / 30000) * atmH;

    // 大气柱
    const grad = ctx.createLinearGradient(0, top, 0, bot);
    grad.addColorStop(0, isDark ? 'rgba(56,89,138,0.35)' : 'rgba(147,197,253,0.30)');
    grad.addColorStop(1, isDark ? 'rgba(15,23,42,0.1)' : 'rgba(248,250,252,0.1)');
    ctx.fillStyle = grad;
    ctx.fillRect(w * 0.1, top, w * 0.45, atmH);
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    [0, 10000, 20000, 30000].forEach(a => {
        const y = altToY(a);
        ctx.fillText(`${a / 1000} km`, w * 0.1 - 6, y + 3);
        ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.3)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(w * 0.1, y);
        ctx.lineTo(w * 0.55, y);
        ctx.stroke();
        ctx.setLineDash([]);
    });
    ctx.textAlign = 'left';

    // 初级宇宙线 → 大气簇射
    for (let i = 0; i < 6; i++) {
        const x = w * 0.12 + seeded(i) * w * 0.4;
        ctx.strokeStyle = isDark ? 'rgba(250,204,21,0.7)' : 'rgba(202,138,4,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, top + 4);
        let cx = x,
            cy = top + 4;
        for (let s = 0; s < 8; s++) {
            const nx = cx + (seeded(i * 10 + s) - 0.5) * 30;
            const ny = cy + atmH / 10;
            ctx.lineTo(nx, ny);
            cx = nx;
            cy = ny;
        }
        ctx.stroke();
    }
    // 观测点
    const obsY = altToY(alt);
    ctx.strokeStyle = COL.red;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, obsY);
    ctx.lineTo(w * 0.55, obsY);
    ctx.stroke();
    ctx.fillStyle = COL.red;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`观测点 (海拔 ${alt} m)`, w * 0.1 + 4, obsY - 4);

    // 屏蔽层
    if (sm !== 0) {
        ctx.fillStyle = sm === 1 ? 'rgba(100,116,139,0.7)' : 'rgba(56,189,248,0.5)';
        ctx.fillRect(w * 0.1, bot - 14, w * 0.45, 14);
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(shieldName, w * 0.32, bot - 3);
        ctx.textAlign = 'left';
    }

    // 右: 通量衰减曲线 N = N₀·e^(−d/λ)
    const plotX = w * 0.62,
        plotY = 70,
        plotW = w - plotX - 30,
        plotH = h - plotY - 60;
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.stroke();
    ctx.strokeStyle = COL.orange;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
        const d = (i / 100) * 30; // km
        const N = Math.exp(-d / lambdaEff);
        const x = plotX + (d / 30) * plotW;
        const y = plotY + plotH - N * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('μ 子通量 N(d) = N₀·e^(−d/λ)', plotX + plotW / 2, plotY + plotH + 34);
    ctx.textAlign = 'left';

    drawHud(ctx, isDark, [
        { label: '海拔', value: `${alt} m` },
        { label: '屏蔽', value: shieldName },
        { label: 'λ_eff', value: `${lambdaEff} km` }
    ]);
}

// =====================================================================
// 场景 9: 中子发现 (查德威克两级碰撞)
// =====================================================================

export function drawNeutronDiscoveryScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '中子发现 (查德威克实验)', w, isDark);

    const alphaE = params['alphaEnergy'] ?? 5; // MeV
    const targetA = params['targetMass'] ?? 1; // u
    const neutronKE = alphaE * 0.9; // MeV (示意)
    const recoilKE = targetA <= 1 ? neutronKE : (neutronKE * 4 * targetA) / (1 + targetA) ** 2;

    const y1 = h * 0.34,
        y2 = h * 0.7;
    // 阶段1: α + ⁹Be → ¹²C + n
    ctx.fillStyle = COL.orange;
    ctx.beginPath();
    ctx.arc(w * 0.1, y1, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('α', w * 0.1, y1);
    ctx.textBaseline = 'alphabetic';
    drawArrow(ctx, w * 0.1 + 11, y1, w * 0.3, y1, COL.orange);
    ctx.fillStyle = isDark ? '#64748b' : '#475569';
    ctx.fillRect(w * 0.3 - 14, y1 - 14, 28, 28);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⁹Be', w * 0.3, y1);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COL.cyan;
    ctx.beginPath();
    ctx.arc(w * 0.52, y1, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('n⁰', w * 0.52, y1);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = isDark ? '#64748b' : '#475569';
    ctx.fillRect(w * 0.66 - 14, y1 - 14, 28, 28);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('¹²C', w * 0.66, y1);
    ctx.textBaseline = 'alphabetic';
    drawArrow(ctx, w * 0.52 + 10, y1, w * 0.3, y2, COL.cyan);

    // 阶段2: n + 靶 → 反冲核
    ctx.fillStyle = isDark ? '#64748b' : '#475569';
    ctx.fillRect(w * 0.3 - 14, y2 - 14, 28, 28);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(targetA <= 1 ? '¹H' : targetA >= 14 ? '¹⁴N' : `${targetA}`, w * 0.3, y2);
    ctx.textBaseline = 'alphabetic';
    drawArrow(ctx, w * 0.3 + 16, y2, w * 0.6, y2, COL.green);
    ctx.fillStyle = COL.green;
    ctx.beginPath();
    ctx.arc(w * 0.62, y2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('反冲', w * 0.62, y2 + 22);
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('① α 轰击铍 → 释放中子 (电中性, 不偏折)', w * 0.1, y1 - 26);
    ctx.fillText('② 中子撞击含氢/氮靶 → 反冲核证明其质量≈质子', w * 0.1, y2 - 26);

    drawHud(ctx, isDark, [
        { label: 'α 能量', value: `${alphaE} MeV` },
        { label: '靶核', value: targetA <= 1 ? '氢(H)' : targetA >= 14 ? '氮(N)' : `A=${targetA}` },
        { label: '中子 K', value: `${neutronKE.toFixed(2)} MeV` },
        { label: '反冲核 K', value: `${recoilKE.toFixed(2)} MeV` }
    ]);
}

// =====================================================================
// 场景 10: 玻尔轨道模型 (rₙ ∝ n²)
// =====================================================================

export function drawBohrOrbitScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '玻尔氢原子模型 — 轨道能级 (rₙ ∝ n²)', w, isDark);

    const seriesNum = params['seriesB'] ?? 1;
    const maxN = Math.max(3, Math.round(params['maxN'] ?? 6));
    const n1 = seriesNum === 0 ? 1 : seriesNum === 2 ? 3 : 2;
    const a0 = 0.0529; // nm
    const cx = w * 0.42,
        cy = h * 0.5;
    const baseR = 14;
    const rN = (n: number) => baseR + n * n * 4;

    for (let n = 1; n <= maxN; n++) {
        const r = rN(n);
        if (r > h * 0.45) break;
        ctx.strokeStyle = isDark ? `rgba(148,163,184,${0.25 + n * 0.05})` : `rgba(100,116,139,${0.25 + n * 0.05})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`n=${n}`, cx + r + 3, cy - 2);
        const ang = currentTime * (1.2 / n) + n;
        const ex = cx + r * Math.cos(ang);
        const ey = cy + r * Math.sin(ang);
        ctx.fillStyle = COL.cyan;
        ctx.beginPath();
        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    // 原子核
    drawGlowCircle(ctx, cx, cy, 8, COL.red, 0.9);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', cx, cy);
    ctx.textBaseline = 'alphabetic';

    // 右侧: 跃迁说明
    const rx = w * 0.7,
        ry = h * 0.3;
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`线系: ${seriesNum === 0 ? '赖曼' : seriesNum === 2 ? '帕邢' : '巴尔末'} (n₁=${n1})`, rx, ry);
    ctx.fillText('跃迁 n → n₁ 能量:', rx, ry + 22);
    for (let n2 = n1 + 1; n2 <= Math.min(maxN, n1 + 5); n2++) {
        const dE = 13.6 * (1 / (n1 * n1) - 1 / (n2 * n2));
        ctx.fillText(`  n=${n2} → ${n1}: ΔE=${dE.toFixed(2)} eV`, rx, ry + 22 + (n2 - n1) * 16);
    }

    drawHud(ctx, isDark, [
        { label: 'a₀', value: `${a0} nm` },
        { label: 'n_max', value: `${maxN}` },
        { label: 'r₁', value: `${a0.toFixed(3)} nm` },
        { label: 'r_max', value: `${(a0 * maxN * maxN).toFixed(1)} nm` }
    ]);
}

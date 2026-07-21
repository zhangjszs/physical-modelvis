/**
 * 近代物理场景渲染模块 — 选必三 第四章 波粒二象性
 *
 * 场景列表：
 *   - drawPhotoelectricScene
 *   - drawBlackBodyScene
 *   - drawElectronDiffractionScene
 *   - drawMicroDeformationScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import { clamp, clearScene, drawTitle, drawHud, drawArrow } from './renderingUtils';
import {
    photoThresholdFrequencyTHz,
    wienPeakWavelength,
    stefanBoltzmannExitance,
    PLANCK_H,
    E_CHARGE,
    K_BOLTZMANN
} from './constants';

export interface ModernSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
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

const REF_LAMBDA_PM = 12.3; // 参考: 10 kV 电子德布罗意波长 ≈ 12.3 pm

function temperatureColor(T: number): string {
    const t = clamp((T - 1000) / (8000 - 1000), 0, 1);
    const r = 255;
    const gC = Math.round(60 + t * 195);
    const bC = Math.round(30 + t * 225);
    const toHex = (v: number) => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(gC)}${toHex(bC)}`;
}

export function drawPhotoelectricScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '光电效应 — 爱因斯坦方程 K_max = hν − W₀', w, isDark, { size: 18, y: 28 });

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

    drawHud(
        ctx,
        isDark,
        [
            { label: 'W₀', value: `${W0.toFixed(2)} eV` },
            { label: 'ν₀', value: `${nu0.toFixed(0)} THz` },
            { label: 'ν_max', value: `${nuMax} THz` },
            { label: 'K_max', value: `${(h_eV_per_THz * nuMax - W0).toFixed(2)} eV` }
        ],
        { boxW: 230, lineH: 16 }
    );
}

export function drawBlackBodyScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '黑体辐射 — 普朗克谱与维恩位移', w, isDark, { size: 18, y: 28 });

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

    drawHud(
        ctx,
        isDark,
        [
            { label: 'T', value: `${T} K` },
            { label: 'λ_max', value: `${lamPeakNm.toFixed(0)} nm` },
            { label: 'M=σT⁴', value: `${M.toExponential(2)} W/m²` }
        ],
        { boxW: 230, lineH: 16 }
    );
}

export function drawElectronDiffractionScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '电子衍射 — 德布罗意波与晶体衍射环', w, isDark, { size: 18, y: 28 });

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

    drawHud(
        ctx,
        isDark,
        [
            { label: '加速电压 V', value: `${(V / 1000).toFixed(1)} kV` },
            { label: 'λ(德布罗意)', value: `${lambdaPm.toFixed(1)} pm` },
            { label: '公式', value: 'λ=h/√(2meV)' }
        ],
        { boxW: 230, lineH: 16 }
    );
}

export function drawMicroDeformationScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '光杠杆放大微小形变', w, isDark, { size: 18, y: 28 });

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

    drawHud(
        ctx,
        isDark,
        [
            { label: 'F', value: `${F} N` },
            { label: 'E', value: `${E} GPa` },
            { label: 'δ (形变量)', value: `${(delta * 1e9).toFixed(3)} nm` },
            { label: '放大 2D/L', value: `${amp.toFixed(1)}×` },
            { label: '光斑位移', value: `${(spotShift * 1e3).toFixed(3)} mm` }
        ],
        { boxW: 230, lineH: 16 }
    );
}

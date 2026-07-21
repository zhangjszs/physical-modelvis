/**
 * 近代物理场景渲染模块 — 选必三 第五章 原子核与粒子
 *
 * 场景列表：
 *   - drawRadioactiveScene
 *   - drawRadiationDeflectionScene
 *   - drawCosmicRayScene
 *   - drawNeutronDiscoveryScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import { clamp, clearScene, drawTitle, drawHud, drawArrow } from './renderingUtils';
import { E_CHARGE } from './constants';

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

function seeded(i: number): number {
    const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return v - Math.floor(v);
}
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

export function drawRadioactiveScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '放射性衰变 — 云室径迹与指数衰减', w, isDark, { size: 18, y: 28 });

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

    drawHud(
        ctx,
        isDark,
        [
            { label: 'N₀', value: `${N0}` },
            { label: 'T½', value: `${T} s` },
            { label: 't', value: `${tNow.toFixed(1)} s` },
            { label: 'N(t)', value: `${Nnow.toFixed(0)}` },
            { label: '射线', value: rayType }
        ],
        { boxW: 230, lineH: 16 }
    );
}

export function drawRadiationDeflectionScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, currentTime } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '放射线在磁场中的偏转', w, isDark, { size: 18, y: 28 });

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

    drawHud(
        ctx,
        isDark,
        [
            { label: 'B', value: `${B} T` },
            { label: 'K', value: `${K_MeV} MeV` },
            { label: '类型', value: typeName },
            {
                label: '曲率半径 r',
                value: pt === 2 ? '∞(不偏)' : `${(Math.sqrt(2 * m * K_J) / (Math.abs(q) * B)).toExponential(2)} m`
            }
        ],
        { boxW: 230, lineH: 16 }
    );
}

export function drawCosmicRayScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '宇宙射线 — 大气簇射与屏蔽衰减', w, isDark, { size: 18, y: 28 });

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

    drawHud(
        ctx,
        isDark,
        [
            { label: '海拔', value: `${alt} m` },
            { label: '屏蔽', value: shieldName },
            { label: 'λ_eff', value: `${lambdaEff} km` }
        ],
        { boxW: 230, lineH: 16 }
    );
}

export function drawNeutronDiscoveryScene(o: ModernSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '中子发现 (查德威克实验)', w, isDark, { size: 18, y: 28 });

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

    drawHud(
        ctx,
        isDark,
        [
            { label: 'α 能量', value: `${alphaE} MeV` },
            { label: '靶核', value: targetA <= 1 ? '氢(H)' : targetA >= 14 ? '氮(N)' : `A=${targetA}` },
            { label: '中子 K', value: `${neutronKE.toFixed(2)} MeV` },
            { label: '反冲核 K', value: `${recoilKE.toFixed(2)} MeV` }
        ],
        { boxW: 230, lineH: 16 }
    );
}

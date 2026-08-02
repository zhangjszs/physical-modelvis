/**
 * 电磁学场景渲染模块 — 选必二 第三~四章 交变电流与电磁波
 *
 * 场景列表：
 *   - drawAcCurrentScene
 *   - drawEmWaveHertzScene
 *   - drawEmWaveCommunicationScene
 *   - drawEmSpectrumScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import {
    COLORS,
    roundRectPath,
    clamp,
    textColor,
    mutedColor,
    clearScene,
    drawTitle,
    drawHud,
    drawInfoBar,
    drawSineChart,
    drawCoil,
    drawChargeSymbol,
    drawText
} from './renderingUtils';

export interface ElectromagnetismSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

const BLUE = COLORS.BLUE;
const GREEN = COLORS.GREEN;
const ORANGE = COLORS.ORANGE;

export function drawAcCurrentScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '交变电流与变压器', width, isDark, { size: 18, y: 28 });
    const em = params['Em'] ?? 311;
    const freq = params['freq'] ?? 50;
    const nRatio = params['nRatio'] ?? 0.1;
    const phase = currentTime * freq * Math.PI * 2;
    const u = em * Math.sin(phase);
    const u2 = u * nRatio;
    drawSineChart({
        ctx,
        x: width * 0.12,
        y: height * 0.25,
        w: width * 0.34,
        h: height * 0.32,
        phase,
        color: BLUE,
        isDark,
        label: 'u1(t)'
    });
    drawSineChart({
        ctx,
        x: width * 0.54,
        y: height * 0.25,
        w: width * 0.34,
        h: height * 0.32,
        phase,
        color: GREEN,
        isDark,
        label: 'u2(t)'
    });
    drawCoil(ctx, width * 0.36, height * 0.68, 90, 6, BLUE);
    drawCoil(ctx, width * 0.55, height * 0.68, 70, 4, GREEN);
    ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(width * 0.48, height * 0.6);
    ctx.lineTo(width * 0.48, height * 0.76);
    ctx.stroke();
    drawHud(
        ctx,
        isDark,
        [
            { label: 'U1m', value: `${em.toFixed(0)} V` },
            { label: 'f', value: `${freq.toFixed(0)} Hz` },
            { label: 'U2/U1', value: nRatio.toFixed(2) }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, `瞬时值 u1=${u.toFixed(1)} V, u2=${u2.toFixed(1)} V`, isDark);
}

export function drawEmWaveHertzScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime, simulationResult } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '赫兹电磁波实验 (LC 振荡 + 驻波)', width, isDark, { size: 18, y: 28 });
    const C = 2.99792458e8;
    const turns = params['turns'] ?? 10;
    const sparkGap = params['sparkGap'] ?? 1;
    const distance = params['distance'] ?? 5;

    // 引擎数值: 频率/波长/接收电动势优先读 maxValues, 回退自算
    const maxVals = simulationResult?.diagnostics?.maxValues as
        { frequency?: number; wavelength?: number; currentEmf_mV?: number; maxCurrent?: number } | undefined;
    const frequency = maxVals?.frequency ?? (params['frequency'] ?? 100) * 1e6;
    const lambda = maxVals?.wavelength ?? C / frequency;
    const emf_mV = maxVals?.currentEmf_mV;

    const emitX = width * 0.16;
    const recvX = width * 0.8;
    const midY = height * 0.46;
    // 发射端：火花间隙 + 线圈
    drawChargeSymbol(ctx, emitX, midY - 28, 12, 1, isDark);
    ctx.strokeStyle = textColor(isDark);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(emitX, midY - 16);
    ctx.lineTo(emitX, midY + 16);
    ctx.stroke();
    drawChargeSymbol(ctx, emitX, midY + 28, 12, -1, isDark);
    drawCoil(ctx, emitX - 30, midY, 50, 5, BLUE);
    // 接收端：共振环
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(recvX, midY, 26, 0, Math.PI * 2);
    ctx.stroke();
    drawText(ctx, `N=${turns}`, recvX - 14, midY + 44, isDark, 12, mutedColor(isDark));
    // 传播的正弦电磁波（行进波）
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const waves = 6;
    for (let i = 0; i <= 200; i++) {
        const t = i / 200;
        const x = emitX + 40 + t * (recvX - emitX - 80);
        const phase = 2 * Math.PI * waves * t - currentTime * 6;
        const y = midY + Math.sin(phase) * 26;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    drawText(
        ctx,
        `λ = ${(lambda * 100).toFixed(1)} cm`,
        (emitX + recvX) / 2 - 40,
        midY - 40,
        isDark,
        13,
        mutedColor(isDark)
    );
    drawHud(
        ctx,
        isDark,
        [
            { label: 'f', value: `${frequency.toExponential(2)} Hz` },
            { label: 'λ', value: `${(lambda * 100).toFixed(1)} cm` },
            { label: 'd', value: `${distance.toFixed(1)} m` },
            ...(emf_mV !== undefined ? [{ label: 'ε', value: `${emf_mV.toExponential(2)} mV` }] : [])
        ],
        { boxW: 250 }
    );
    drawInfoBar(
        ctx,
        width,
        height,
        `火花间隙 ${sparkGap.toFixed(1)} mm 产生振荡，发射端辐射电磁波被接收环共振接收`,
        isDark
    );
}

export function drawEmWaveCommunicationScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '电磁波发射接收 (AM 调幅)', width, isDark, { size: 18, y: 28 });
    const carrierFreq = params['carrierFreq'] ?? 1;
    const audioFreq = params['audioFreq'] ?? 1;
    const m = params['modulationIndex'] ?? 0.8;
    const Ac = params['carrierAmplitude'] ?? 1;
    const ampScale = clamp(Ac, 0.2, 2);
    const distance = params['distance'] ?? 10;

    const ax = width * 0.1;
    const aw = width * 0.8;
    // 三段图：载波 / 调制信号 / 已调波
    const rows = [
        { y: height * 0.28, kind: 'carrier' as const, color: BLUE, title: '载波' },
        { y: height * 0.46, kind: 'audio' as const, color: GREEN, title: '调制信号 (音频)' },
        { y: height * 0.66, kind: 'am' as const, color: ORANGE, title: '已调波 (AM)' }
    ];
    const carrierCycles = 22;
    const audioCycles = 2;
    for (const row of rows) {
        ctx.strokeStyle = mutedColor(isDark);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ax, row.y);
        ctx.lineTo(ax + aw, row.y);
        ctx.stroke();
        ctx.strokeStyle = row.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= 240; i++) {
            const t = i / 240;
            const x = ax + t * aw;
            const phaseC = currentTime * 2 * Math.PI * 0.5 + t * carrierCycles * 2 * Math.PI;
            const phaseA = t * audioCycles * 2 * Math.PI;
            let yv = 0;
            if (row.kind === 'carrier') yv = ampScale * Math.sin(phaseC);
            else if (row.kind === 'audio') yv = Math.sin(phaseA);
            else yv = ampScale * (1 + m * Math.sin(phaseA)) * Math.sin(phaseC);
            const py = row.y - yv * 34;
            if (i === 0) ctx.moveTo(x, py);
            else ctx.lineTo(x, py);
        }
        ctx.stroke();
        drawText(ctx, row.title, ax, row.y - 42, isDark, 12, mutedColor(isDark));
    }
    drawHud(
        ctx,
        isDark,
        [
            { label: 'f_c', value: `${carrierFreq.toFixed(2)} MHz` },
            { label: 'f_m', value: `${audioFreq.toFixed(2)} kHz` },
            { label: 'm', value: m.toFixed(2) }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, `已调波 s(t)=A꜀(1+m·cosωₘt)cosω_ct，传输距离 ${distance.toFixed(1)} km`, isDark);
}

export function drawEmSpectrumScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '电磁波谱 (频段分布)', width, isDark, { size: 18, y: 28 });
    const fMin = Math.pow(10, params['freqMinExp'] ?? 1);
    const fMax = Math.pow(10, params['freqMaxExp'] ?? 16);
    const logMin = Math.log10(fMin);
    const logMax = Math.log10(fMax);

    const bands: Array<{ name: string; f0: number; f1: number; color: string }> = [
        { name: '无线电', f0: 1, f1: 1e9, color: '#6366f1' },
        { name: '微波', f0: 1e9, f1: 3e11, color: '#06b6d4' },
        { name: '红外', f0: 3e11, f1: 4e14, color: '#f59e0b' },
        { name: '可见光', f0: 4e14, f1: 7.9e14, color: '#22c55e' },
        { name: '紫外', f0: 7.9e14, f1: 3e17, color: '#3b82f6' },
        { name: 'X 射线', f0: 3e17, f1: 3e19, color: '#ec4899' },
        { name: 'γ 射线', f0: 3e19, f1: 1e24, color: '#ef4444' }
    ];
    const x0 = width * 0.1;
    const x1 = width * 0.9;
    const barY = height * 0.42;
    const barH = 40;
    const toX = (f: number) => {
        const lf = Math.log10(Math.min(Math.max(f, fMin), fMax));
        return x0 + ((lf - logMin) / Math.max(logMax - logMin, 1e-6)) * (x1 - x0);
    };
    for (const b of bands) {
        const bx = toX(b.f0);
        const bw = toX(b.f1) - bx;
        if (bw <= 0.5) continue;
        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.85;
        roundRectPath(ctx, bx, barY, Math.max(bw, 1), barH, 4);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (bw > 34) {
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(b.name, bx + bw / 2, barY + barH / 2 + 4);
            ctx.textAlign = 'left';
        }
    }
    // 高亮可见光
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.strokeRect(toX(4e14), barY - 4, toX(7.9e14) - toX(4e14), barH + 8);
    // 刻度
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px system-ui, sans-serif';
    for (let p = Math.ceil(logMin); p <= Math.floor(logMax); p += 1) {
        const tx = toX(Math.pow(10, p));
        ctx.strokeStyle = mutedColor(isDark);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx, barY + barH);
        ctx.lineTo(tx, barY + barH + 6);
        ctx.stroke();
        ctx.fillText(`10^${p}`, tx - 14, barY + barH + 20);
    }
    drawHud(
        ctx,
        isDark,
        [
            { label: 'f_min', value: `${logMin.toFixed(0)} Hz` },
            { label: 'f_max', value: `${logMax.toFixed(0)} Hz` },
            { label: 'c', value: '3×10⁸ m/s' }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '电磁波按频率递增分为七段，真空中波速 c 恒定、λ = c/f', isDark);
}

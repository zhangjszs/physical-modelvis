/**
 * 电学/电磁基础与仪器读数场景定制渲染模块。
 *
 * 这些场景偏实验装置和读数教学，使用屏幕坐标完整绘制核心结构、
 * 参数关系和关键公式。数值仍由 physics-core 负责，本模块只做可视化。
 */

import type { SimulationResult } from 'physics-core';

export interface ElectromagnetismSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

const BLUE = '#3b82f6';
const CYAN = '#06b6d4';
const GREEN = '#22c55e';
const ORANGE = '#f59e0b';
const RED = '#ef4444';
const PURPLE = '#a855f7';
const AMBER = '#f59e0b';

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

function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

function labelColor(isDark: boolean): string {
    return isDark ? '#e2e8f0' : '#1e293b';
}

function mutedColor(isDark: boolean): string {
    return isDark ? '#94a3b8' : '#64748b';
}

function panelFill(isDark: boolean): string {
    return isDark ? 'rgba(15,23,42,0.76)' : 'rgba(255,255,255,0.88)';
}

function clearScene(ctx: CanvasRenderingContext2D, width: number, height: number, isDark: boolean): void {
    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    ctx.fillRect(0, 0, width, height);
}

function drawTitle(ctx: CanvasRenderingContext2D, title: string, width: number, isDark: boolean): void {
    ctx.fillStyle = labelColor(isDark);
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 28);
}

function drawHud(ctx: CanvasRenderingContext2D, isDark: boolean, rows: Array<{ label: string; value: string }>): void {
    const lineH = 18;
    const boxW = 214;
    const boxH = rows.length * lineH + 18;
    ctx.fillStyle = panelFill(isDark);
    roundRectPath(ctx, 8, 10, boxW, boxH, 6);
    ctx.fill();
    rows.forEach((row, i) => {
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = labelColor(isDark);
        ctx.fillText(`${row.label} = ${row.value}`, 16, 19 + i * lineH);
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
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = panelFill(isDark);
    roundRectPath(ctx, width / 2 - tw / 2 - 10, height - 36, tw + 20, 24, 5);
    ctx.fill();
    ctx.fillStyle = mutedColor(isDark);
    ctx.fillText(text, width / 2, height - 19);
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
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 3) return;
    ctx.save();
    const angle = Math.atan2(dy, dx);
    const head = Math.min(13, len * 0.28);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - head * 0.55 * Math.cos(angle), y2 - head * 0.55 * Math.sin(angle));
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - 0.4), y2 - head * Math.sin(angle - 0.4));
    ctx.lineTo(x2 - head * 0.45 * Math.cos(angle), y2 - head * 0.45 * Math.sin(angle));
    ctx.lineTo(x2 - head * Math.cos(angle + 0.4), y2 - head * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
    if (label) {
        ctx.fillStyle = color;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x2 + 6, y2 - 8);
        ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
}

function drawWire(ctx: CanvasRenderingContext2D, points: Array<[number, number]>, color: string): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
    ctx.restore();
}

function drawBattery(ctx: CanvasRenderingContext2D, x: number, y: number, isDark: boolean, label: string): void {
    ctx.strokeStyle = labelColor(isDark);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 18, y - 20);
    ctx.lineTo(x - 18, y + 20);
    ctx.moveTo(x + 14, y - 12);
    ctx.lineTo(x + 14, y + 12);
    ctx.stroke();
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 38);
    ctx.fillStyle = RED;
    ctx.fillText('+', x - 18, y - 26);
    ctx.fillStyle = BLUE;
    ctx.fillText('-', x + 14, y - 20);
}

function drawResistor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    isDark: boolean,
    label: string
): void {
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    for (let i = 0; i < 6; i++) {
        const px = x - w / 2 + ((i + 0.5) * w) / 6;
        ctx.lineTo(px, y + (i % 2 === 0 ? -12 : 12));
    }
    ctx.lineTo(x + w / 2, y);
    ctx.stroke();
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 22);
}

function drawCapacitorSymbol(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isDark: boolean,
    label: string
): void {
    ctx.strokeStyle = labelColor(isDark);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 24);
    ctx.lineTo(x - 10, y + 24);
    ctx.moveTo(x + 10, y - 24);
    ctx.lineTo(x + 10, y + 24);
    ctx.stroke();
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 42);
}

function drawMeter(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    ratio: number,
    isDark: boolean,
    label: string,
    value: string
): void {
    ctx.fillStyle = panelFill(isDark);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = 0; i <= 10; i++) {
        const a = Math.PI * (1.15 + (0.7 * i) / 10);
        const r1 = r - 8;
        const r2 = r - (i % 5 === 0 ? 18 : 13);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
        ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
        ctx.stroke();
    }
    const angle = Math.PI * (1.15 + 0.7 * clamp(ratio, 0, 1));
    drawArrow(ctx, x, y, x + Math.cos(angle) * (r - 22), y + Math.sin(angle) * (r - 22), RED);
    ctx.fillStyle = labelColor(isDark);
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 8);
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px monospace';
    ctx.fillText(value, x, y + r + 18);
}

function drawSineChart(opts: {
    ctx: CanvasRenderingContext2D;
    x: number;
    y: number;
    w: number;
    h: number;
    phase: number;
    color: string;
    isDark: boolean;
    label: string;
}): void {
    const { ctx, x, y, w, h, phase, color, isDark, label } = opts;
    ctx.fillStyle = panelFill(isDark);
    roundRectPath(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
        const px = x + (i / 120) * w;
        const py = y + h / 2 - Math.sin((i / 120) * Math.PI * 4 + phase) * (h * 0.36);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 8, y + 16);
}

function drawCoil(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, turns: number, color: string): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i <= turns * 16; i++) {
        const t = i / (turns * 16);
        const px = x + t * w;
        const py = y + Math.sin(t * turns * Math.PI * 2) * 14;
        ctx.lineTo(px, py);
    }
    ctx.stroke();
}

export function drawCircuitScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '直流电路分析', width, isDark);
    const emf = params['emf'] ?? 12;
    const r = params['r'] ?? 1;
    const r1 = params['r1'] ?? 10;
    const r2 = params['r2'] ?? 10;
    const r3 = params['r3'] ?? 20;
    const parallel = (params['r2conn'] ?? 1) > 0.5 || (params['r3conn'] ?? 1) > 0.5;
    const r23 = parallel ? 1 / (1 / r2 + 1 / r3) : r2 + r3;
    const req = r + r1 + r23;
    const current = emf / Math.max(req, 1e-6);
    const wire = isDark ? '#94a3b8' : '#475569';
    const left = width * 0.18;
    const right = width * 0.82;
    const top = height * 0.28;
    const bottom = height * 0.68;
    drawWire(
        ctx,
        [
            [left, top],
            [right, top],
            [right, bottom],
            [left, bottom],
            [left, top]
        ],
        wire
    );
    drawBattery(ctx, left, (top + bottom) / 2, isDark, `${emf} V`);
    drawResistor(ctx, width * 0.5, top, 90, isDark, `R1 ${r1}Ω`);
    drawResistor(ctx, right, height * 0.45, 80, isDark, `R2 ${r2}Ω`);
    drawResistor(ctx, right, height * 0.58, 80, isDark, `R3 ${r3}Ω`);
    drawArrow(ctx, width * 0.34, top - 24, width * 0.5, top - 24, ORANGE, 'I');
    drawMeter(ctx, width * 0.31, bottom, 34, clamp(current / 2, 0, 1), isDark, 'A', `${current.toFixed(2)} A`);
    drawHud(ctx, isDark, [
        { label: 'E', value: `${emf.toFixed(1)} V` },
        { label: 'R_eq', value: `${req.toFixed(2)} Ω` },
        { label: 'I', value: `${current.toFixed(2)} A` }
    ]);
    drawInfoBar(ctx, width, height, parallel ? 'R2 与 R3 并联后再与 R1、内阻串联' : 'R1、R2、R3 与内阻串联', isDark);
}

export function drawAcCurrentScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '交变电流与变压器', width, isDark);
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
    drawHud(ctx, isDark, [
        { label: 'U1m', value: `${em.toFixed(0)} V` },
        { label: 'f', value: `${freq.toFixed(0)} Hz` },
        { label: 'U2/U1', value: nRatio.toFixed(2) }
    ]);
    drawInfoBar(ctx, width, height, `瞬时值 u1=${u.toFixed(1)} V, u2=${u2.toFixed(1)} V`, isDark);
}

export function drawEmInductionScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '电磁感应', width, isDark);
    const b = params['Bind'] ?? 0.5;
    const area = params['A'] ?? 0.01;
    const n = params['Nturns'] ?? 100;
    const angle = ((params['angleBind'] ?? 0) * Math.PI) / 180 + Math.sin(currentTime * 2) * 0.35;
    const flux = n * b * area * Math.cos(angle);
    const cx = width * 0.5;
    const cy = height * 0.52;
    for (let x = width * 0.18; x < width * 0.86; x += 42) {
        drawArrow(ctx, x, height * 0.25, x, height * 0.78, CYAN);
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 4;
    roundRectPath(ctx, -80, -48, 160, 96, 12);
    ctx.stroke();
    ctx.restore();
    drawMeter(ctx, width * 0.77, cy, 38, clamp(Math.abs(Math.sin(currentTime * 2)), 0, 1), isDark, 'G', '感应电流');
    drawHud(ctx, isDark, [
        { label: 'B', value: `${b.toFixed(2)} T` },
        { label: 'N', value: `${n.toFixed(0)}` },
        { label: 'Phi', value: `${flux.toFixed(3)} Wb` }
    ]);
    drawInfoBar(ctx, width, height, '磁通量变化产生感应电动势: E = -N dPhi/dt', isDark);
}

export function drawMagneticForceScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '安培力与洛伦兹力', width, isDark);
    const b = params['B'] ?? 0.5;
    const i = params['I'] ?? 2;
    const l = params['L'] ?? 0.3;
    const q = params['q'] ?? 1.6;
    const v = params['v'] ?? 1;
    const fAmp = b * i * l;
    const fLorentz = Math.abs(q) * v * b;
    for (let x = width * 0.12; x < width * 0.9; x += 44) {
        for (let y = height * 0.24; y < height * 0.78; y += 42) {
            ctx.strokeStyle = PURPLE;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x - 5, y - 5);
            ctx.lineTo(x + 5, y + 5);
            ctx.moveTo(x + 5, y - 5);
            ctx.lineTo(x - 5, y + 5);
            ctx.stroke();
        }
    }
    drawWire(
        ctx,
        [
            [width * 0.24, height * 0.46],
            [width * 0.58, height * 0.46]
        ],
        ORANGE
    );
    drawArrow(ctx, width * 0.3, height * 0.42, width * 0.52, height * 0.42, ORANGE, 'I');
    drawArrow(ctx, width * 0.42, height * 0.46, width * 0.42, height * 0.28, RED, 'F');
    ctx.fillStyle = q >= 0 ? RED : BLUE;
    ctx.beginPath();
    ctx.arc(width * 0.68, height * 0.6, 14, 0, Math.PI * 2);
    ctx.fill();
    drawArrow(ctx, width * 0.68, height * 0.6, width * 0.82, height * 0.6, GREEN, 'v');
    drawArrow(ctx, width * 0.68, height * 0.6, width * 0.68, height * 0.43, RED, 'qvB');
    drawHud(ctx, isDark, [
        { label: 'B', value: `${b.toFixed(2)} T` },
        { label: 'F_A', value: `${fAmp.toFixed(3)} N` },
        { label: 'F_L', value: `${fLorentz.toFixed(3)} arb` }
    ]);
    drawInfoBar(ctx, width, height, '安培力 F=BILsinθ, 洛伦兹力 F=qvBsinφ', isDark);
}

export function drawAmpereForceScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '安培力因素', width, isDark);
    const b = params['B'] ?? 0.5;
    const i = params['I'] ?? 2;
    const l = params['L'] ?? 0.2;
    const angle = ((params['angle'] ?? 30) * Math.PI) / 180;
    const f = b * i * l * Math.sin(angle);
    const cx = width * 0.52;
    const cy = height * 0.52;
    for (let x = width * 0.18; x < width * 0.84; x += 50) {
        drawArrow(ctx, x, height * 0.25, x, height * 0.75, CYAN, x < width * 0.22 ? 'B' : undefined);
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-angle);
    drawWire(
        ctx,
        [
            [-120, 0],
            [120, 0]
        ],
        ORANGE
    );
    drawArrow(ctx, -70, -18, 55, -18, ORANGE, 'I');
    ctx.restore();
    drawArrow(ctx, cx, cy, cx, cy - clamp(f * 220, 30, 125), RED, 'F');
    drawHud(ctx, isDark, [
        { label: 'B', value: `${b.toFixed(2)} T` },
        { label: 'I', value: `${i.toFixed(2)} A` },
        { label: 'F', value: `${f.toFixed(3)} N` }
    ]);
    drawInfoBar(ctx, width, height, `导线与磁场夹角 ${((angle * 180) / Math.PI).toFixed(0)}°, F = BIL sinθ`, isDark);
}

export function drawCapacitorChargeScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, 'RC 电容充放电', width, isDark);
    const r = params['resistance'] ?? 1000;
    const cMicro = params['capacitance'] ?? 100;
    const emf = params['emf'] ?? 10;
    const mode = params['mode'] ?? 0;
    const tau = r * cMicro * 1e-6;
    const ratio =
        mode < 0.5 ? 1 - Math.exp(-currentTime / Math.max(tau, 1e-6)) : Math.exp(-currentTime / Math.max(tau, 1e-6));
    const u = emf * ratio;
    const y = height * 0.52;
    drawWire(
        ctx,
        [
            [width * 0.2, y],
            [width * 0.78, y]
        ],
        mutedColor(isDark)
    );
    drawBattery(ctx, width * 0.22, y, isDark, `${emf} V`);
    drawResistor(ctx, width * 0.44, y, 90, isDark, `${r}Ω`);
    drawCapacitorSymbol(ctx, width * 0.66, y, isDark, `${cMicro}μF`);
    ctx.fillStyle = `rgba(59,130,246,${0.18 + ratio * 0.55})`;
    ctx.fillRect(width * 0.655, y - 24, 10, 48);
    drawSineChart({
        ctx,
        x: width * 0.58,
        y: height * 0.18,
        w: width * 0.3,
        h: height * 0.2,
        phase: -Math.PI / 2 + ratio * Math.PI,
        color: BLUE,
        isDark,
        label: 'U_C(t)'
    });
    drawHud(ctx, isDark, [
        { label: 'tau', value: `${tau.toFixed(3)} s` },
        { label: 'Uc', value: `${u.toFixed(2)} V` },
        { label: 'mode', value: mode < 0.5 ? 'charge' : 'discharge' }
    ]);
    drawInfoBar(ctx, width, height, mode < 0.5 ? '充电: Uc=E(1-e^-t/RC)' : '放电: Uc=U0 e^-t/RC', isDark);
}

export function drawParallelPlateCapacitorScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '平行板电容器', width, isDark);
    const area = params['area'] ?? 0.01;
    const distanceMm = params['distance'] ?? 1;
    const er = params['epsilonR'] ?? 3;
    const cap = (8.854e-12 * er * area) / (distanceMm * 1e-3);
    const cx = width * 0.52;
    const cy = height * 0.52;
    const plateH = clamp(90 + area * 2600, 90, 170);
    const gap = clamp(36 + distanceMm * 18, 38, 130);
    ctx.fillStyle = BLUE;
    roundRectPath(ctx, cx - gap / 2 - 12, cy - plateH / 2, 12, plateH, 3);
    ctx.fill();
    ctx.fillStyle = RED;
    roundRectPath(ctx, cx + gap / 2, cy - plateH / 2, 12, plateH, 3);
    ctx.fill();
    for (let y = cy - plateH / 2 + 18; y < cy + plateH / 2; y += 28) {
        drawArrow(ctx, cx - gap / 2 + 8, y, cx + gap / 2 - 4, y, AMBER);
    }
    ctx.fillStyle = `rgba(34,197,94,${clamp(er / 8, 0.12, 0.5)})`;
    roundRectPath(ctx, cx - gap / 2 + 12, cy - plateH / 2, gap - 12, plateH, 4);
    ctx.fill();
    drawHud(ctx, isDark, [
        { label: 'S', value: `${area.toFixed(3)} m2` },
        { label: 'd', value: `${distanceMm.toFixed(2)} mm` },
        { label: 'C', value: `${(cap * 1e12).toFixed(1)} pF` }
    ]);
    drawInfoBar(ctx, width, height, 'C = epsilon0 * epsilonR * S / d, 极板越大/间距越小电容越大', isDark);
}

export function drawLoadVoltageScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '路端电压与负载', width, isDark);
    const emf = params['emf'] ?? 12;
    const r = params['internalResistance'] ?? 2;
    const rMin = params['loadRMin'] ?? 1;
    const rMax = params['loadRMax'] ?? 10;
    const load = (rMin + rMax) / 2;
    const current = emf / (r + load);
    const u = emf - current * r;
    const y = height * 0.54;
    drawWire(
        ctx,
        [
            [width * 0.2, y],
            [width * 0.8, y],
            [width * 0.8, y + 90],
            [width * 0.2, y + 90],
            [width * 0.2, y]
        ],
        mutedColor(isDark)
    );
    drawBattery(ctx, width * 0.2, y + 45, isDark, `${emf} V`);
    drawResistor(ctx, width * 0.43, y, 82, isDark, `r ${r}Ω`);
    drawResistor(ctx, width * 0.66, y, 90, isDark, `R ${load.toFixed(1)}Ω`);
    drawMeter(ctx, width * 0.66, y + 90, 34, clamp(u / emf, 0, 1), isDark, 'V', `${u.toFixed(2)} V`);
    drawHud(ctx, isDark, [
        { label: 'E', value: `${emf.toFixed(1)} V` },
        { label: 'I', value: `${current.toFixed(2)} A` },
        { label: 'U', value: `${u.toFixed(2)} V` }
    ]);
    drawInfoBar(ctx, width, height, '负载越小电流越大, 内阻分压越明显: U = E - Ir', isDark);
}

export function drawResistanceLawScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '电阻定律', width, isDark);
    const len = params['length'] ?? 1;
    const diameterMm = params['diameter'] ?? 1;
    const material = params['material'] ?? 0;
    const rho = material < 0.5 ? 1.68e-8 : material < 1.5 ? 2.82e-8 : 1.1e-6;
    const area = Math.PI * ((diameterMm * 1e-3) / 2) ** 2;
    const resistance = (rho * len) / Math.max(area, 1e-12);
    const x1 = width * 0.18;
    const x2 = width * 0.82;
    const y = height * 0.52;
    const thick = clamp(diameterMm * 9, 6, 28);
    const grad = ctx.createLinearGradient(x1, y - thick, x2, y + thick);
    grad.addColorStop(0, '#94a3b8');
    grad.addColorStop(0.5, material < 0.5 ? '#f59e0b' : material < 1.5 ? '#cbd5e1' : '#64748b');
    grad.addColorStop(1, '#475569');
    ctx.strokeStyle = grad;
    ctx.lineWidth = thick;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    drawArrow(ctx, x1, y + 50, x2, y + 50, GREEN, 'L');
    drawHud(ctx, isDark, [
        { label: 'L', value: `${len.toFixed(2)} m` },
        { label: 'd', value: `${diameterMm.toFixed(2)} mm` },
        { label: 'R', value: `${resistance.toFixed(3)} Ω` }
    ]);
    drawInfoBar(ctx, width, height, 'R = rho * L / S, 长度越长电阻越大, 横截面积越大电阻越小', isDark);
}

export function drawMultimeterScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '多用电表读数', width, isDark);
    const mode = params['mode'] ?? 0;
    const range = params['range'] ?? 10;
    const value = params['testValue'] ?? 4.5;
    const ratio = clamp(value / Math.max(range, 1e-6), 0, 1);
    drawMeter(
        ctx,
        width * 0.5,
        height * 0.47,
        Math.min(width, height) * 0.24,
        ratio,
        isDark,
        mode < 0.5 ? 'V' : mode < 1.5 ? 'A' : 'Ω',
        `${value.toFixed(2)}`
    );
    const knobX = width * 0.5;
    const knobY = height * 0.76;
    ctx.fillStyle = panelFill(isDark);
    ctx.beginPath();
    ctx.arc(knobX, knobY, 38, 0, Math.PI * 2);
    ctx.fill();
    drawArrow(
        ctx,
        knobX,
        knobY,
        knobX + Math.cos(-Math.PI / 2 + mode) * 32,
        knobY + Math.sin(-Math.PI / 2 + mode) * 32,
        ORANGE
    );
    drawHud(ctx, isDark, [
        { label: 'range', value: `${range}` },
        { label: 'value', value: `${value.toFixed(2)}` },
        { label: 'ratio', value: `${(ratio * 100).toFixed(0)}%` }
    ]);
    drawInfoBar(ctx, width, height, '读数 = 指针比例 * 所选量程, 电压并联/电流串联/欧姆档先调零', isDark);
}

export function drawVernierCaliperScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '游标卡尺读数', width, isDark);
    const size = params['objectSize'] ?? 23.4;
    const nType = params['nType'] ?? 1;
    const precision = nType < 0.5 ? 0.1 : nType < 1.5 ? 0.05 : 0.02;
    const main = Math.floor(size);
    const vernier = Math.round((size - main) / precision);
    const x0 = width * 0.16;
    const y = height * 0.48;
    const scale = 8;
    ctx.strokeStyle = labelColor(isDark);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + 360, y);
    ctx.stroke();
    for (let i = 0; i <= 40; i++) {
        const x = x0 + i * scale;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + (i % 10 === 0 ? 34 : i % 5 === 0 ? 26 : 18));
        ctx.stroke();
        if (i % 10 === 0) {
            ctx.fillStyle = mutedColor(isDark);
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(String(i), x, y + 48);
        }
    }
    const vx = x0 + size * scale;
    ctx.fillStyle = `rgba(59,130,246,${isDark ? 0.42 : 0.3})`;
    roundRectPath(ctx, vx - 44, y + 14, 96, 40, 4);
    ctx.fill();
    drawArrow(ctx, vx, y - 42, vx, y - 4, RED, '测量爪');
    drawHud(ctx, isDark, [
        { label: 'main', value: `${main} mm` },
        { label: 'vernier', value: `${vernier} * ${precision}` },
        { label: 'L', value: `${size.toFixed(2)} mm` }
    ]);
    drawInfoBar(ctx, width, height, '总读数 = 主尺读数 + 游标对齐格数 * 精度', isDark);
}

export function drawMicrometerScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '螺旋测微器读数', width, isDark);
    const thickness = params['thickness'] ?? 5.75;
    const main = Math.floor(thickness * 2) / 2;
    const drum = Math.round((thickness - main) / 0.01);
    const cx = width * 0.5;
    const cy = height * 0.52;
    ctx.strokeStyle = labelColor(isDark);
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(cx - 115, cy, 62, Math.PI * 0.55, Math.PI * 1.45);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 80, cy - 18, 128, 36);
    ctx.fillStyle = isDark ? '#334155' : '#cbd5e1';
    roundRectPath(ctx, cx + 44, cy - 34, 116, 68, 8);
    ctx.fill();
    ctx.strokeStyle = mutedColor(isDark);
    for (let i = 0; i <= 10; i++) {
        const x = cx - 70 + i * 11;
        ctx.beginPath();
        ctx.moveTo(x, cy - 18);
        ctx.lineTo(x, cy + (i % 2 === 0 ? 18 : 10));
        ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
        const y = cy - 25 + i * 7;
        ctx.beginPath();
        ctx.moveTo(cx + 48, y);
        ctx.lineTo(cx + 152, y);
        ctx.stroke();
    }
    ctx.fillStyle = ORANGE;
    roundRectPath(ctx, cx - 104, cy - 14, clamp(thickness * 10, 18, 86), 28, 4);
    ctx.fill();
    drawHud(ctx, isDark, [
        { label: 'main', value: `${main.toFixed(2)} mm` },
        { label: 'drum', value: `${drum} * 0.01` },
        { label: 'L', value: `${thickness.toFixed(2)} mm` }
    ]);
    drawInfoBar(ctx, width, height, '总读数 = 固定套筒主尺 + 微分筒刻度 * 0.01 mm', isDark);
}

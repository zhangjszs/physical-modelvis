/**
 * 电学/电磁基础与仪器读数场景定制渲染模块。
 *
 * 这些场景偏实验装置和读数教学，使用屏幕坐标完整绘制核心结构、
 * 参数关系和关键公式。数值仍由 physics-core 负责，本模块只做可视化。
 */

import type { SimulationResult } from 'physics-core';
import {
    roundRectPath,
    clamp,
    textColor,
    mutedColor,
    panelFill,
    clearScene,
    drawTitle,
    drawHud,
    drawInfoBar,
    drawArrow
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

const BLUE = '#3b82f6';
const CYAN = '#06b6d4';
const GREEN = '#22c55e';
const ORANGE = '#f59e0b';
const RED = '#ef4444';
const PURPLE = '#a855f7';
const AMBER = '#f59e0b';

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
    ctx.strokeStyle = textColor(isDark);
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
    ctx.strokeStyle = textColor(isDark);
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
    ctx.fillStyle = textColor(isDark);
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
    drawTitle(ctx, '直流电路分析', width, isDark, { size: 18, y: 28 });
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
    drawHud(
        ctx,
        isDark,
        [
            { label: 'E', value: `${emf.toFixed(1)} V` },
            { label: 'R_eq', value: `${req.toFixed(2)} Ω` },
            { label: 'I', value: `${current.toFixed(2)} A` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, parallel ? 'R2 与 R3 并联后再与 R1、内阻串联' : 'R1、R2、R3 与内阻串联', isDark);
}

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

export function drawEmInductionScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '电磁感应', width, isDark, { size: 18, y: 28 });
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
    drawHud(
        ctx,
        isDark,
        [
            { label: 'B', value: `${b.toFixed(2)} T` },
            { label: 'N', value: `${n.toFixed(0)}` },
            { label: 'Phi', value: `${flux.toFixed(3)} Wb` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '磁通量变化产生感应电动势: E = -N dPhi/dt', isDark);
}

export function drawMagneticForceScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '安培力与洛伦兹力', width, isDark, { size: 18, y: 28 });
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
    drawHud(
        ctx,
        isDark,
        [
            { label: 'B', value: `${b.toFixed(2)} T` },
            { label: 'F_A', value: `${fAmp.toFixed(3)} N` },
            { label: 'F_L', value: `${fLorentz.toFixed(3)} arb` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '安培力 F=BILsinθ, 洛伦兹力 F=qvBsinφ', isDark);
}

export function drawAmpereForceScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '安培力因素', width, isDark, { size: 18, y: 28 });
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
    drawHud(
        ctx,
        isDark,
        [
            { label: 'B', value: `${b.toFixed(2)} T` },
            { label: 'I', value: `${i.toFixed(2)} A` },
            { label: 'F', value: `${f.toFixed(3)} N` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, `导线与磁场夹角 ${((angle * 180) / Math.PI).toFixed(0)}°, F = BIL sinθ`, isDark);
}

export function drawCapacitorChargeScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, 'RC 电容充放电', width, isDark, { size: 18, y: 28 });
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
    drawHud(
        ctx,
        isDark,
        [
            { label: 'tau', value: `${tau.toFixed(3)} s` },
            { label: 'Uc', value: `${u.toFixed(2)} V` },
            { label: 'mode', value: mode < 0.5 ? 'charge' : 'discharge' }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, mode < 0.5 ? '充电: Uc=E(1-e^-t/RC)' : '放电: Uc=U0 e^-t/RC', isDark);
}

export function drawParallelPlateCapacitorScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '平行板电容器', width, isDark, { size: 18, y: 28 });
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
    drawHud(
        ctx,
        isDark,
        [
            { label: 'S', value: `${area.toFixed(3)} m2` },
            { label: 'd', value: `${distanceMm.toFixed(2)} mm` },
            { label: 'C', value: `${(cap * 1e12).toFixed(1)} pF` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, 'C = epsilon0 * epsilonR * S / d, 极板越大/间距越小电容越大', isDark);
}

export function drawLoadVoltageScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '路端电压与负载', width, isDark, { size: 18, y: 28 });
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
    drawHud(
        ctx,
        isDark,
        [
            { label: 'E', value: `${emf.toFixed(1)} V` },
            { label: 'I', value: `${current.toFixed(2)} A` },
            { label: 'U', value: `${u.toFixed(2)} V` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '负载越小电流越大, 内阻分压越明显: U = E - Ir', isDark);
}

export function drawResistanceLawScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '电阻定律', width, isDark, { size: 18, y: 28 });
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
    drawHud(
        ctx,
        isDark,
        [
            { label: 'L', value: `${len.toFixed(2)} m` },
            { label: 'd', value: `${diameterMm.toFixed(2)} mm` },
            { label: 'R', value: `${resistance.toFixed(3)} Ω` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, 'R = rho * L / S, 长度越长电阻越大, 横截面积越大电阻越小', isDark);
}

export function drawMultimeterScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '多用电表读数', width, isDark, { size: 18, y: 28 });
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
    drawHud(
        ctx,
        isDark,
        [
            { label: 'range', value: `${range}` },
            { label: 'value', value: `${value.toFixed(2)}` },
            { label: 'ratio', value: `${(ratio * 100).toFixed(0)}%` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '读数 = 指针比例 * 所选量程, 电压并联/电流串联/欧姆档先调零', isDark);
}

export function drawVernierCaliperScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '游标卡尺读数', width, isDark, { size: 18, y: 28 });
    const size = params['objectSize'] ?? 23.4;
    const nType = params['nType'] ?? 1;
    const precision = nType < 0.5 ? 0.1 : nType < 1.5 ? 0.05 : 0.02;
    const main = Math.floor(size);
    const vernier = Math.round((size - main) / precision);
    const x0 = width * 0.16;
    const y = height * 0.48;
    const scale = 8;
    ctx.strokeStyle = textColor(isDark);
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
    drawHud(
        ctx,
        isDark,
        [
            { label: 'main', value: `${main} mm` },
            { label: 'vernier', value: `${vernier} * ${precision}` },
            { label: 'L', value: `${size.toFixed(2)} mm` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '总读数 = 主尺读数 + 游标对齐格数 * 精度', isDark);
}

export function drawMicrometerScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '螺旋测微器读数', width, isDark, { size: 18, y: 28 });
    const thickness = params['thickness'] ?? 5.75;
    const main = Math.floor(thickness * 2) / 2;
    const drum = Math.round((thickness - main) / 0.01);
    const cx = width * 0.5;
    const cy = height * 0.52;
    ctx.strokeStyle = textColor(isDark);
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
    drawHud(
        ctx,
        isDark,
        [
            { label: 'main', value: `${main.toFixed(2)} mm` },
            { label: 'drum', value: `${drum} * 0.01` },
            { label: 'L', value: `${thickness.toFixed(2)} mm` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '总读数 = 固定套筒主尺 + 微分筒刻度 * 0.01 mm', isDark);
}

/** 绘制一个带电小球（正电荷红、负电荷蓝） */
function drawChargeSymbol(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    sign: number,
    isDark: boolean
): void {
    const positive = sign >= 0;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = positive ? RED : BLUE;
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.5, y);
    ctx.lineTo(x + radius * 0.5, y);
    if (positive) {
        ctx.moveTo(x, y - radius * 0.5);
        ctx.lineTo(x, y + radius * 0.5);
    }
    ctx.stroke();
}

/** 小工具：绘制一行文字 */
function drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    isDark: boolean,
    size = 13,
    color?: string
): void {
    ctx.fillStyle = color ?? textColor(isDark);
    ctx.font = `${size}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y);
}

/** 探究库仑定律：F = k·q₁q₂/r² */
export function drawCoulombForceExploreScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '探究电荷间作用力 (库仑定律)', width, isDark, { size: 18, y: 28 });
    const K = 8.9875517923e9;
    const q1 = params['q1'] ?? 1;
    const q2 = params['q2'] ?? 1;
    const distance = params['distance'] ?? 5;
    const mode = (params['mode'] ?? 0) >= 0.5 ? 1 : 0;
    const q1C = q1 * 1e-6;
    const q2C = q2 * 1e-6;
    const r = Math.max(distance * 1e-2, 1e-4);
    const F = (K * q1C * q2C) / (r * r); // N
    const repulsive = q1 * q2 > 0;

    const y = height * 0.46;
    const x1 = width * 0.28;
    const x2 = width * 0.72;
    const rad = 22;
    drawChargeSymbol(ctx, x1, y, rad, q1, isDark);
    drawChargeSymbol(ctx, x2, y, rad, q2, isDark);
    // 作用力箭头（沿两球连线）
    const midX = (x1 + x2) / 2;
    if (repulsive) {
        drawArrow(ctx, midX - 6, y - 40, x1 + rad + 6, y - 40, ORANGE, '');
        drawArrow(ctx, midX + 6, y - 40, x2 - rad - 6, y - 40, ORANGE, 'F');
    } else {
        drawArrow(ctx, x1 + rad + 6, y - 40, midX - 6, y - 40, ORANGE, '');
        drawArrow(ctx, x2 - rad - 6, y - 40, midX + 6, y - 40, ORANGE, 'F');
    }
    drawText(ctx, `r = ${distance.toFixed(1)} cm`, midX - 28, y + 50, isDark, 13, mutedColor(isDark));

    // 关系示意图：左 F∝q₁q₂，右 F∝1/r²
    const bx = width * 0.12;
    const by = height * 0.72;
    const bw = width * 0.76;
    const bh = height * 0.16;
    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '12px system-ui, sans-serif';
    const label = mode === 0 ? '模式: 固定 r, 改变 q → F ∝ q₁·q₂' : '模式: 固定 q, 改变 r → F ∝ 1/r²';
    drawText(ctx, label, bx + 8, by - 6, isDark, 12, mutedColor(isDark));
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const px = bx + 8 + t * (bw - 16);
        const norm = mode === 0 ? t : 1 - t; // q 线性 / r 反比
        const py = by + bh - 8 - norm * (bh - 18);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();

    drawHud(
        ctx,
        isDark,
        [
            { label: 'q₁', value: `${q1.toFixed(2)} μC` },
            { label: 'q₂', value: `${q2.toFixed(2)} μC` },
            { label: 'F', value: `${F < 1e-3 ? (F * 1e6).toFixed(2) + ' μN' : F.toFixed(3) + ' N'}` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, `F = k·q₁q₂/r² = ${F.toExponential(2)} N（k=8.99×10⁹）`, isDark);
}

/** 验电器：箔片张角随带电量增大 */
export function drawElectroscopeScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '验电器 (箔片张角 vs 电量)', width, isDark, { size: 18, y: 28 });
    const K = 8.9875517923e9;
    const q = params['charge'] ?? 1;
    const foilLength = params['foilLength'] ?? 5;
    const foilMass = params['foilMass'] ?? 1;
    const qC = q * 1e-6;
    const L = Math.max(foilLength * 1e-2, 0.01);
    const g = 9.8;
    // 简化模型：箔尖斥力 F = k q² / (2L)²，与重力矩平衡 → tanθ = F/(mg)
    const repel = (K * qC * qC) / (4 * L * L);
    const gravity = Math.max(foilMass * 1e-3 * g, 1e-9);
    const theta = clamp(Math.atan(repel / gravity), 0, (78 * Math.PI) / 180);

    const cx = width * 0.5;
    const topY = height * 0.2;
    const domeR = 26;
    // 顶部金属球 + 杆
    ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.beginPath();
    ctx.arc(cx, topY + domeR, domeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#94a3b8' : '#334155';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx, topY + domeR * 2);
    ctx.lineTo(cx, height * 0.45);
    ctx.stroke();
    // 两箔片
    const pivotY = height * 0.45;
    const tipLen = height * 0.28 * clamp(foilLength / 10, 0.4, 1.4);
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 4;
    for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx, pivotY);
        ctx.lineTo(cx + dir * Math.sin(theta) * tipLen, pivotY + Math.cos(theta) * tipLen);
        ctx.stroke();
    }
    drawText(
        ctx,
        `张角 2θ ≈ ${((theta * 2 * 180) / Math.PI).toFixed(1)}°`,
        cx + 40,
        pivotY + tipLen * 0.6,
        isDark,
        13,
        textColor(isDark)
    );
    drawHud(
        ctx,
        isDark,
        [
            { label: 'q', value: `${q.toFixed(2)} μC` },
            { label: 'L', value: `${foilLength.toFixed(1)} cm` },
            { label: 'θ', value: `${((theta * 180) / Math.PI).toFixed(1)}°` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '同种电荷相互排斥，箔片张角随带电量增大', isDark);
}

/** 静电感应：近端异种电荷、远端同种电荷 */
export function drawElectrostaticInductionScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '静电感应 (近/远端感应电荷)', width, isDark, { size: 18, y: 28 });
    const chargeC = params['chargeC'] ?? 1;
    const separation = params['separation'] ?? 2;
    const distanceAC = params['distanceAC'] ?? 10;
    const cSign = chargeC >= 0 ? 1 : -1;
    // 感应强度随电荷量增大、随距离平方减小（定性）
    const induced = clamp((Math.abs(chargeC) / 100) * (10 / Math.max(distanceAC, 0.5)), 0.1, 1);

    const conductorY = height * 0.5;
    const aLeft = width * 0.42;
    const gap = clamp(separation * 2, 6, 60);
    const aRight = aLeft + 70;
    const bLeft = aRight + gap;
    const bRight = bLeft + 70;
    const conductorH = 46;
    // 导体 A、B
    ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
    ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 2;
    for (const [x0, x1] of [
        [aLeft, aRight],
        [bLeft, bRight]
    ] as Array<[number, number]>) {
        roundRectPath(ctx, x0, conductorY - conductorH / 2, x1 - x0, conductorH, 6);
        ctx.fill();
        ctx.stroke();
    }
    // 外部带电体 C
    const cX = aLeft - Math.max(distanceAC * 1.6, 40);
    drawChargeSymbol(ctx, cX, conductorY, 20, cSign, isDark);
    // 感应电荷标注：A 近端(左)与 C 异种，A 远端(右)同种；B 近端(左)同种
    const aNearSign = -cSign;
    const aFarSign = cSign;
    const bNearSign = cSign;
    const sym = (s: number) => (s > 0 ? '+' : '−');
    const col = (s: number) => (s > 0 ? RED : BLUE);
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = col(aNearSign);
    ctx.fillText(sym(aNearSign), aLeft + 10, conductorY - conductorH / 2 - 8);
    ctx.fillStyle = col(aFarSign);
    ctx.fillText(sym(aFarSign), aRight - 18, conductorY - conductorH / 2 - 8);
    ctx.fillStyle = col(bNearSign);
    ctx.fillText(sym(bNearSign), bLeft + 10, conductorY - conductorH / 2 - 8);
    // 电场线：C → A 近端
    ctx.strokeStyle = mutedColor(isDark);
    ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(cX + 20, conductorY + i * 10);
        ctx.lineTo(aLeft - 2, conductorY + i * 10);
        ctx.stroke();
    }
    drawText(
        ctx,
        `感应强度 ≈ ${(induced * 100).toFixed(0)}%`,
        width * 0.12,
        height * 0.8,
        isDark,
        13,
        mutedColor(isDark)
    );
    drawHud(
        ctx,
        isDark,
        [
            { label: 'C', value: `${chargeC.toFixed(2)} μC ${cSign > 0 ? '(+)' : '(−)'}` },
            { label: 'd_AC', value: `${distanceAC.toFixed(1)} cm` },
            { label: '近端', value: sym(aNearSign) }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '导体近端感应出异种电荷、远端同种电荷', isDark);
}

/** 静电屏蔽：导体腔内部场强为零 */
export function drawElectrostaticShieldingScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '静电屏蔽 (接地 vs 不接地)', width, isDark, { size: 18, y: 28 });
    const externalField = params['externalField'] ?? 500;
    const cavityCharge = params['cavityCharge'] ?? 0;
    const grounded = (params['isGrounded'] ?? 1) >= 0.5;

    const shellX = width * 0.34;
    const shellY = height * 0.28;
    const shellW = width * 0.34;
    const shellH = height * 0.44;
    const wall = 22;
    // 外部电场线（水平，遇导体壳偏折）
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 4; i++) {
        const ly = height * 0.3 + i * height * 0.1;
        ctx.beginPath();
        ctx.moveTo(10, ly);
        ctx.lineTo(shellX, ly);
        ctx.stroke();
        // 壳外绕过
        ctx.beginPath();
        ctx.moveTo(shellX + shellW, ly);
        ctx.lineTo(width - 10, ly);
        ctx.stroke();
    }
    // 导体壳（外框 + 空腔）
    ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = 2;
    roundRectPath(ctx, shellX, shellY, shellW, shellH, 10);
    ctx.fill();
    ctx.stroke();
    // 空腔
    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    roundRectPath(ctx, shellX + wall, shellY + wall, shellW - wall * 2, shellH - wall * 2, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#334155' : '#94a3b8';
    ctx.stroke();
    // 接地符号
    if (grounded) {
        const gx = shellX + shellW / 2;
        const gy = shellY + shellH;
        ctx.strokeStyle = GREEN;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx, gy + 18);
        for (let i = 0; i < 3; i++) {
            ctx.moveTo(gx - 9 + i * 9, gy + 18 + i * 5);
            ctx.lineTo(gx + 9 - i * 9, gy + 18 + i * 5);
        }
        ctx.stroke();
    }
    // 腔内电荷
    if (cavityCharge !== 0) {
        drawChargeSymbol(ctx, shellX + shellW / 2, shellY + shellH / 2, 14, cavityCharge >= 0 ? 1 : -1, isDark);
    }
    const eInside = cavityCharge !== 0 ? '≠ 0 (腔内电荷)' : '= 0';
    drawText(ctx, `导体内部场强 ${eInside}`, shellX, shellY - 10, isDark, 13, textColor(isDark));
    drawHud(
        ctx,
        isDark,
        [
            { label: 'E_ext', value: `${externalField.toFixed(0)} V/m` },
            { label: '接地', value: grounded ? '是' : '否' },
            { label: 'E_in', value: cavityCharge !== 0 ? '见腔内' : '0' }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '静电平衡时导体内部场强为零，外电场被屏蔽', isDark);
}

/** 法拉第圆筒：电荷全部分布在外表面，内表面为零 */
export function drawFaradayCupScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '法拉第圆筒 (内表面电荷=0)', width, isDark, { size: 18, y: 28 });
    const totalCharge = params['totalCharge'] ?? 5;
    const cx = width * 0.5;
    const topY = height * 0.26;
    const cupW = width * 0.26;
    const cupH = height * 0.4;
    const wall = 16;
    // 圆筒外壳（U 形）
    ctx.fillStyle = isDark ? '#1e293b' : '#e2e8f0';
    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = 2;
    roundRectPath(ctx, cx - cupW / 2, topY, cupW, cupH, 8);
    ctx.fill();
    ctx.stroke();
    // 内部掏空
    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    roundRectPath(ctx, cx - cupW / 2 + wall, topY + wall, cupW - wall * 2, cupH - wall, 4);
    ctx.fill();
    // 外表面电荷（+ 号）
    ctx.fillStyle = RED;
    ctx.font = 'bold 15px system-ui, sans-serif';
    const nOuter = 7;
    for (let i = 0; i < nOuter; i++) {
        const x = cx - cupW / 2 + wall / 2;
        const y = topY + 18 + (i / (nOuter - 1)) * (cupH - 30);
        ctx.fillText('+', x - 4, y);
        ctx.fillText('+', cx + cupW / 2 - wall / 2 - 4, y);
    }
    // 探针
    const innerProbeY = topY + cupH * 0.5;
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, topY - 26);
    ctx.lineTo(cx, innerProbeY);
    ctx.stroke();
    drawText(ctx, '内探针: 0', cx + 18, innerProbeY, isDark, 13, mutedColor(isDark));
    drawText(ctx, `外探针: ${totalCharge.toFixed(1)} μC`, cx + 18, topY + 14, isDark, 13, ORANGE);
    drawHud(
        ctx,
        isDark,
        [
            { label: 'Q', value: `${totalCharge.toFixed(1)} μC` },
            { label: '内表面', value: '0' },
            { label: '外表面', value: `${totalCharge.toFixed(1)} μC` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '静电平衡时净电荷只分布在外表面，内表面电荷为零', isDark);
}

/** 赫兹电磁波实验：发射端火花振子 → 接收端共振环 */
export function drawEmWaveHertzScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '赫兹电磁波实验 (LC 振荡 + 驻波)', width, isDark, { size: 18, y: 28 });
    const C = 2.99792458e8;
    const frequency = (params['frequency'] ?? 100) * 1e6;
    const turns = params['turns'] ?? 10;
    const sparkGap = params['sparkGap'] ?? 1;
    const distance = params['distance'] ?? 5;
    const lambda = C / frequency; // m

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
            { label: 'd', value: `${distance.toFixed(1)} m` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(
        ctx,
        width,
        height,
        `火花间隙 ${sparkGap.toFixed(1)} mm 产生振荡，发射端辐射电磁波被接收环共振接收`,
        isDark
    );
}

/** 涡流：导体板摆动受涡流阻尼，振幅指数衰减 */
export function drawEddyCurrentScene(opts: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params, currentTime } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '涡流现象 (阻尼摆动)', width, isDark, { size: 18, y: 28 });
    const magneticField = params['magneticField'] ?? 0.2;
    const frequency = params['frequency'] ?? 50;
    const conductivity = params['conductivity'] ?? 5.8e7;
    const thickness = params['thickness'] ?? 0.001;
    const muR = params['muR'] ?? 1;
    // 阻尼时间常数随 σ、B²、t² 增大而减小（定性）
    const dampingRate =
        (conductivity / 1e7) * (magneticField * magneticField) * (thickness * 1000) * (thickness * 1000) * muR;
    const tau = clamp(1 / Math.max(dampingRate, 1e-3), 0.4, 25);
    const A0 = 0.5;
    const amp = A0 * Math.exp(-currentTime / tau);
    const omega = 2 * Math.PI * 0.6;
    const angle = amp * Math.sin(currentTime * omega);

    const pivotX = width * 0.3;
    const pivotY = height * 0.22;
    const rodLen = height * 0.42;
    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    const plateX = pivotX + Math.sin(angle) * rodLen;
    const plateY = pivotY + Math.cos(angle) * rodLen;
    ctx.lineTo(plateX, plateY);
    ctx.stroke();
    // 金属板
    ctx.save();
    ctx.translate(plateX, plateY);
    ctx.rotate(-angle);
    ctx.fillStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.strokeStyle = isDark ? '#64748b' : '#334155';
    ctx.lineWidth = 2;
    roundRectPath(ctx, -34, -26, 68, 52, 6);
    ctx.fill();
    ctx.stroke();
    // 涡流环（强度随速度）
    const speed = Math.abs(amp * omega * Math.cos(currentTime * omega));
    if (speed > 0.02) {
        ctx.strokeStyle = ORANGE;
        ctx.lineWidth = 2;
        for (const cyc of [-12, 12]) {
            ctx.beginPath();
            ctx.arc(0, cyc, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, cyc, 6, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    ctx.restore();
    // 磁铁
    drawText(ctx, 'N', plateX - 6, plateY + 70, isDark, 13, RED);
    drawText(ctx, 'S', plateX + 6, plateY + 70, isDark, 13, BLUE);
    drawHud(
        ctx,
        isDark,
        [
            { label: 'B', value: `${magneticField.toFixed(2)} T` },
            { label: 'f', value: `${frequency.toFixed(0)} Hz` },
            { label: 'τ', value: `${tau.toFixed(1)} s` }
        ],
        { boxW: 214 }
    );
    drawInfoBar(ctx, width, height, '变化的磁场在导体中产生涡流，涡流阻碍相对运动（电磁阻尼）', isDark);
}

/** 电磁波发射接收：AM 调幅波（载波 × 包络） */
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

/** 电磁波谱：按频率对数轴分段着色 */
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

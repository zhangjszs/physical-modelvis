/**
 * 电磁学场景渲染模块 — 必修三 第十一~十二章 电路
 *
 * 场景列表：
 *   - drawCircuitScene
 *   - drawResistanceLawScene
 *   - drawLoadVoltageScene
 *   - drawMultimeterScene
 *   - drawVernierCaliperScene
 *   - drawMicrometerScene
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
    panelFill,
    clearScene,
    drawTitle,
    drawHud,
    drawInfoBar,
    drawArrow,
    drawWire,
    drawBattery,
    drawResistor,
    drawMeter,
    placeholder
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

const GREEN = COLORS.GREEN;
const ORANGE = COLORS.ORANGE;
const RED = COLORS.RED;

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

export function drawBulbVIScene(o: ElectromagnetismSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult } = o;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '小灯泡伏安特性 (I-U 曲线)', width, isDark, { size: 18, y: 28 });
    if (!simulationResult || !simulationResult.charts) {
        placeholder(ctx, width, height, isDark);
        return;
    }
    const vi = simulationResult.charts.vx_t;
    const E = params['emf'] ?? 12;
    const r = params['r'] ?? 1;
    if (!vi || vi.points.length === 0) {
        placeholder(ctx, width, height, isDark);
        return;
    }
    const padL = 70;
    const padB = 50;
    const padT = 50;
    const padR = 30;
    const gx = padL;
    const gy = height - padB;
    const gw = width - padL - padR;
    const gh = height - padT - padB;
    const uMax = E;
    const iMax = Math.max(0.1, E / Math.max(0.1, r));

    const ux = (u: number) => gx + (u / uMax) * gw;
    const iy = (i: number) => gy - (i / iMax) * gh;

    // 坐标轴
    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx, padT);
    ctx.lineTo(gx, gy);
    ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('电压 U (V)', gx + gw / 2, height - 14);
    ctx.save();
    ctx.translate(18, padT + gh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('电流 I (A)', 0, 0);
    ctx.restore();

    // 灯泡伏安曲线
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    vi.points.forEach((p, idx) => {
        const X = ux(p.x);
        const Y = iy(p.y);
        if (idx === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
    });
    ctx.stroke();

    // 负载线: I = (E - U)/r
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(ux(0), iy(E / Math.max(0.1, r)));
    ctx.lineTo(ux(E), iy(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // 工作点: 伏安曲线与负载线交点 (数值找穿越)
    let op: { u: number; i: number } | null = null;
    for (const p of vi.points) {
        const loadI = (E - p.x) / Math.max(0.1, r);
        if (Math.abs(loadI - p.y) < Math.max(1e-3, loadI * 0.02)) {
            op = { u: p.x, i: p.y };
            break;
        }
    }
    if (op) {
        const ox = ux(op.u);
        const oy = iy(op.i);
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(ox, oy, 6, 0, Math.PI * 2);
        ctx.fill();
        drawHud(
            ctx,
            isDark,
            [
                { label: 'U_op', value: `${op.u.toFixed(2)} V` },
                { label: 'I_op', value: `${op.i.toFixed(3)} A` },
                { label: 'P_op', value: `${(op.u * op.i).toFixed(2)} W` }
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
    }
    drawInfoBar(ctx, width, height, '非线性电阻: 温度↑→电阻↑, I-U 曲线上凸 (与负载线交点为工作点)', isDark, {
        height: 22,
        yOffset: 34
    });
}

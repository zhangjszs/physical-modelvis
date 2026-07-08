/**
 * 选必三「传感器 / 控制电路」场景渲染模块
 *
 * 包含 7 个可视化场景 (Stage J6 new loop):
 *   1. drawHallEffectScene       — 霍尔元件 (3D 薄片 + I/B/VH 箭头 + 载流子偏转 + 表头)
 *   2. drawPhotoresistorScene    — 光敏电阻 (LDR 符号 + R-L 双对数曲线 + 小灯 + 阈值开关)
 *   3. drawThermistorScene       — 热敏电阻 (NTC 符号 + R-T 指数衰减 + 温度计滑杆)
 *   4. drawReedSwitchScene       — 干簧管 (玻璃管 + 铁磁簧片 + LED 指示 + 磁铁滑杆)
 *   5. drawStrainGaugeScene      — 电阻应变片 (惠斯通电桥 + 应变片变形 + 桥压输出)
 *   6. drawSecurityAlarmScene    — 门窗防盗报警 (门磁 + 干簧管 + LED/蜂鸣器 + 状态)
 *   7. drawLightControlSwitchScene — 光控开关 (光敏分压 + 比较器 + 继电器 + 路灯)
 *
 * 设计原则 (沿用 thermalScenes.ts / chapter2Scenes.ts):
 *   - 纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 *   - 每个场景函数负责完整渲染 (背景 + 动态元素 + HUD + 公式)
 *   - 共享工具函数在本文件内复用
 *
 * 引用 sceneId (来自 sceneRegistry.ts):
 *   - 'hall-effect'
 *   - 'photoresistor'
 *   - 'thermistor'
 *   - 'reed-switch'
 *   - 'strain-gauge'
 *   - 'security-alarm'
 *   - 'light-control-switch'
 */

import type { SimulationResult } from 'physics-core';

// ========== 共享类型 ==========

export interface SensorSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

// ========== 共享工具函数 ==========

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
    const boxW = 210;

    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.85)';
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

function drawInfoBar(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    text: string,
    isDark: boolean
): void {
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
    roundRectPath(ctx, width / 2 - tw / 2 - 8, height - 34, tw + 16, 22, 4);
    ctx.fill();
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.fillText(text, width / 2, height - 18);
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

function drawEmptyState(ctx: CanvasRenderingContext2D, width: number, height: number, isDark: boolean): void {
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('点击「运行仿真」开始', width / 2, height / 2);
    ctx.textBaseline = 'alphabetic';
}

/** 伪随机数 (固定种子) */
function seededRand(seed: number): number {
    const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
}

/** 绘制 mini 折线图 */
function drawMiniChart(opts: {
    ctx: CanvasRenderingContext2D;
    x: number;
    y: number;
    w: number;
    h: number;
    xs: number[];
    ys: number[];
    isDark: boolean;
    lineColor: string;
    label?: string;
    xLabel?: string;
    yLabel?: string;
    showPeakX?: number;
    peakLabel?: string;
    fillUnder?: string;
    logX?: boolean;
    logY?: boolean;
}): void {
    const { ctx, x, y, w, h, xs, ys, isDark, label, xLabel, yLabel, showPeakX, peakLabel, fillUnder, logX, logY } =
        opts;
    if (xs.length === 0 || ys.length === 0) return;

    const xMin = xs[0]!;
    const xMax = xs[xs.length - 1]!;
    let yMin = Math.min(...ys);
    let yMax = Math.max(...ys);
    if (yMax - yMin < 1e-9) {
        yMax = yMin + 1;
    }
    const padY = (yMax - yMin) * 0.12;
    yMin -= padY;
    yMax += padY;

    // 背景
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.65)';
    roundRectPath(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.4)' : 'rgba(100,116,139,0.25)';
    ctx.lineWidth = 1;
    roundRectPath(ctx, x, y, w, h, 6);
    ctx.stroke();

    const useLogX = logX && xMin > 0 && xMax > 0;
    const useLogY = logY && yMin > 0 && yMax > 0;
    const logXMin = useLogX ? Math.log10(xMin) : 0;
    const logXMax = useLogX ? Math.log10(xMax) : 1;
    const logYMin = useLogY ? Math.log10(yMin) : 0;
    const logYMax = useLogY ? Math.log10(yMax) : 1;

    const sx = (xv: number) => {
        if (useLogX) return x + ((Math.log10(Math.max(xMin, xv)) - logXMin) / (logXMax - logXMin)) * w;
        return x + ((xv - xMin) / (xMax - xMin)) * w;
    };
    const sy = (yv: number) => {
        if (useLogY) return y + h - ((Math.log10(Math.max(yMin, yv)) - logYMin) / (logYMax - logYMin)) * h;
        return y + h - ((yv - yMin) / (yMax - yMin)) * h;
    };

    // 网格
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.10)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
        const gx = x + (w * i) / 4;
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, y + h);
        ctx.stroke();
    }

    // 填充
    if (fillUnder) {
        ctx.fillStyle = fillUnder;
        ctx.beginPath();
        ctx.moveTo(sx(xs[0]!), y + h);
        for (let i = 0; i < xs.length; i++) ctx.lineTo(sx(xs[i]!), sy(ys[i]!));
        ctx.lineTo(sx(xs[xs.length - 1]!), y + h);
        ctx.closePath();
        ctx.fill();
    }

    // 折线
    ctx.strokeStyle = opts.lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < xs.length; i++) {
        const px = sx(xs[i]!);
        const py = sy(ys[i]!);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // 峰值竖线
    if (showPeakX !== undefined) {
        const px = sx(showPeakX);
        if (px >= x && px <= x + w) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(px, y);
            ctx.lineTo(px, y + h);
            ctx.stroke();
            ctx.setLineDash([]);
            if (peakLabel) {
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(peakLabel, px, y - 4);
            }
        }
    }

    // 轴标签
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(yMax.toExponential ? yMax.toExponential(1) : yMax.toFixed(2), x + 4, y + 4);
    ctx.fillText(yMin.toExponential ? yMin.toExponential(1) : yMin.toFixed(2), x + 4, y + h - 14);

    if (label) {
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(label, x + 4, y + h + 4);
    }
    if (xLabel) {
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(xLabel, x + w / 2, y + h + 16);
    }
    if (yLabel) {
        ctx.save();
        ctx.translate(x - 30, y + h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();
    }
}

/** 绘制一个箭头 */
function drawArrow(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    lineWidth = 2,
    headLen = 8
): void {
    const dx = x2 - x1,
        dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    ctx.save();
    const angle = Math.atan2(dy, dx);
    const hh = Math.min(headLen, len * 0.35);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - hh * 0.5 * Math.cos(angle), y2 - hh * 0.5 * Math.sin(angle));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - hh * Math.cos(angle - 0.4), y2 - hh * Math.sin(angle - 0.4));
    ctx.lineTo(x2 - hh * 0.5 * Math.cos(angle), y2 - hh * 0.5 * Math.sin(angle));
    ctx.lineTo(x2 - hh * Math.cos(angle + 0.4), y2 - hh * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

/** 磁场 ⊗ 圆圈叉 */
function drawBFieldDot(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    const d = r * 0.45;
    ctx.beginPath();
    ctx.moveTo(cx - d, cy - d);
    ctx.lineTo(cx + d, cy + d);
    ctx.moveTo(cx + d, cy - d);
    ctx.lineTo(cx - d, cy + d);
    ctx.stroke();
}

// =====================================================================
// 场景 1: 霍尔元件 (hall-effect)
//   V_H = I·B / (n·q·t)
//   电流 I 沿 +x; 磁场 B 垂直纸面向里 (⊗);
//   电子 q<0 向下偏 → 上表面正, 下表面负 (电子型)
// =====================================================================

export function drawHallEffectScene(o: SensorSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const I = params['current'] ?? 1;
    const B = params['magneticField'] ?? 0.3;
    const n = params['chargeDensity'] ?? 1e22;
    const t = params['thickness'] ?? 0.001;
    const q = 1.602e-19;

    // V_H 解析值 (伏特)
    const Vh = (I * B) / (n * q * t);

    drawTitle(ctx, '霍尔元件 (霍尔电压 V_H)', w, isDark);

    // 居中霍尔片 3D 等距视角
    const cx = w * 0.45;
    const cy = h * 0.45;
    const plateW = 240;
    const plateH = 50;
    const depth = 18; // 等距厚度

    // 3D 效果: 后侧面 (深色)
    ctx.fillStyle = isDark ? '#1e3a5f' : '#93c5fd';
    ctx.beginPath();
    ctx.moveTo(cx - plateW / 2 + 6, cy - plateH / 2 - depth);
    ctx.lineTo(cx + plateW / 2 + 6, cy - plateH / 2 - depth);
    ctx.lineTo(cx + plateW / 2, cy - plateH / 2);
    ctx.lineTo(cx - plateW / 2, cy - plateH / 2);
    ctx.closePath();
    ctx.fill();

    // 右侧面 (深色)
    ctx.fillStyle = isDark ? '#1e40af' : '#60a5fa';
    ctx.beginPath();
    ctx.moveTo(cx + plateW / 2, cy - plateH / 2);
    ctx.lineTo(cx + plateW / 2 + 6, cy - plateH / 2 - depth);
    ctx.lineTo(cx + plateW / 2 + 6, cy + plateH / 2 - depth);
    ctx.lineTo(cx + plateW / 2, cy + plateH / 2);
    ctx.closePath();
    ctx.fill();

    // 顶面 (铜色导体)
    const plateGrad = ctx.createLinearGradient(cx - plateW / 2, cy - plateH / 2, cx + plateW / 2, cy + plateH / 2);
    plateGrad.addColorStop(0, isDark ? '#7c98b3' : '#b8d0e8');
    plateGrad.addColorStop(0.5, isDark ? '#5c7893' : '#94b6d4');
    plateGrad.addColorStop(1, isDark ? '#3d5a73' : '#7aa0c0');
    ctx.fillStyle = plateGrad;
    ctx.fillRect(cx - plateW / 2, cy - plateH / 2, plateW, plateH);

    // 边框
    ctx.strokeStyle = isDark ? '#94b6d4' : '#4a7da0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - plateW / 2, cy - plateH / 2, plateW, plateH);

    // 上方 + 号 (上表面, 电子型载流子则负电荷在下表面)
    const showPolarity = Vh >= 0;
    ctx.fillStyle = isDark ? '#ffffff' : '#1e293b';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(showPolarity ? '+' : '−', cx, cy - plateH / 2 - 14);
    ctx.fillText(showPolarity ? '−' : '+', cx, cy + plateH / 2 + 14);

    // 电流 I 方向 (沿 +x, 红色)
    const iY = cy + plateH / 2 + 38;
    drawArrow(ctx, cx - 100, iY, cx + 100, iY, '#ef4444', 2.5, 10);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`I = ${I.toFixed(1)} A`, cx, iY + 20);

    // 载流子偏转 (在薄片内, 向下偏移)
    const deflectN = 20;
    const deflectAmp = Math.min(plateH * 0.35, 8 + Math.abs(Vh) * 5e6);
    for (let i = 0; i < deflectN; i++) {
        const seed = i + 1;
        const px = cx - plateW / 2 + 20 + seededRand(seed) * (plateW - 40);
        const py = cy - plateH / 2 + seededRand(seed + 500) * plateH;
        // 偏转 = 洛伦兹力向下 (电子 -q × v × B)
        const offsetY = deflectAmp;
        ctx.fillStyle = 'rgba(239,68,68,0.7)';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + offsetY);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(239,68,68,0.7)';
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(px, py + offsetY, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // 载流子偏转标签
    ctx.fillStyle = '#ef4444';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('e⁻ 向下偏', cx + plateW / 2 + 20, cy + 4);

    // 磁场 B (⊗) 标注在薄片上方居中
    drawBFieldDot(ctx, cx, cy - plateH / 2 - 50, 10, '#a855f7');
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`B = ${B.toFixed(2)} T`, cx + 16, cy - plateH / 2 - 46);

    // 右侧: V_H 表头 + 公式
    const meterX = w * 0.78;
    const meterY = cy - 45;
    // 表头边框
    ctx.fillStyle = isDark ? 'rgba(30,41,59,0.8)' : '#ffffff';
    roundRectPath(ctx, meterX - 60, meterY, 120, 80, 8);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, meterX - 60, meterY, 120, 80, 8);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('V_H (mV)', meterX, meterY + 12);
    const VmV = Vh * 1000;
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`${VmV >= 0 ? '+' : ''}${VmV.toFixed(2)}`, meterX, meterY + 44);
    ctx.fillStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.font = '11px sans-serif';
    ctx.fillText('mV', meterX, meterY + 64);

    // 公式 V_H = IB/(nqt)
    ctx.fillStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('V_H = I·B / (n·q·t)', 30, h - 80);
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText(`= ${I}×${B} / (${n.toExponential(0)}×${q.toExponential(0)}×${t})`, 30, h - 62);
    ctx.fillText(`= ${Vh.toExponential(3)} V`, 30, h - 46);

    // HUD
    drawHud(ctx, isDark, [
        { label: 'I', value: `${I.toFixed(2)} A` },
        { label: 'B', value: `${B.toFixed(3)} T` },
        { label: 'n', value: `${n.toExponential(1)} m^-3` },
        { label: 't', value: `${(t * 1000).toFixed(3)} mm` },
        { label: 'V_H', value: `${(Vh * 1000).toFixed(3)} mV` },
        { label: 't(s)', value: `${currentTime.toFixed(2)} s` }
    ]);

    drawInfoBar(
        ctx,
        w,
        h,
        `V_H=IB/(nqt)  I=${I.toFixed(1)}A  B=${B.toFixed(2)}T  t=${(t * 1000).toFixed(2)}mm`,
        isDark
    );

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

// =====================================================================
// 场景 2: 光敏电阻 (photoresistor)
//   R(E) = R_dark · exp(-k·E)
// =====================================================================

export function drawPhotoresistorScene(o: SensorSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const Rdark = params['darkResistance'] ?? 1e6;
    const k = params['sensitivity'] ?? 2e-3;
    const E = params['lightIntensity'] ?? 100;
    const T = params['temperature'] ?? 25;

    const R = Rdark * Math.exp(-k * E);
    // 阈值开关逻辑: E < 5 lx 相当于夜晚 → 灯亮
    const isNight = E < 5;
    const thresholdE = 5;

    drawTitle(ctx, '光敏电阻 (R-L 特性)', w, isDark);

    // --- 左侧: LDR 符号 ---
    const ldrX = w * 0.13;
    const ldrY = h * 0.32;

    // 背景卡
    ctx.fillStyle = isDark ? 'rgba(30,41,59,0.6)' : 'rgba(226,232,240,0.6)';
    roundRectPath(ctx, ldrX - 50, ldrY - 50, 200, 180, 8);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.lineWidth = 1;
    roundRectPath(ctx, ldrX - 50, ldrY - 50, 200, 180, 8);
    ctx.stroke();

    // LDR 符号 (矩形 + 光箭头 + 两条线)
    // 矩形主体
    const symX = ldrX + 30;
    const symY = ldrY;
    const symW = 80;
    const symH = 36;
    ctx.strokeStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(symX, symY - symH / 2, symW, symH);
    // 内部斜线 (电阻符号间断)
    ctx.beginPath();
    ctx.moveTo(symX + symW / 2, symY - symH / 2);
    ctx.lineTo(symX + symW / 2 + 6, symY - symH / 4);
    ctx.lineTo(symX + symW / 2 - 6, symY);
    ctx.lineTo(symX + symW / 2 + 6, symY + symH / 4);
    ctx.lineTo(symX + symW / 2, symY + symH / 2);
    ctx.stroke();
    // 光箭头 (斜向上)
    for (let ai = 0; ai < 3; ai++) {
        const ax = symX - 10 + ai * 14;
        const ay = symY - 30 - ai * 10;
        drawArrow(ctx, ax, ay + 12, ax + 4, ay, '#fbbf24', 1.5, 4);
    }
    // 进出引线
    ctx.beginPath();
    ctx.moveTo(symX - 16, symY);
    ctx.lineTo(symX, symY);
    ctx.moveTo(symX + symW, symY);
    ctx.lineTo(symX + symW + 16, symY);
    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();

    // LDR 标签
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LDR', symX + symW / 2, symY + symH / 2 + 18);

    // 实时 R 值 (右下角)
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
        `R = ${R >= 1e3 ? (R / 1e3).toFixed(1) + ' kΩ' : R.toFixed(1) + ' Ω'}`,
        symX + symW / 2,
        symY + symH / 2 + 34
    );

    // --- 小灯 + 滑杆 ---
    const lampX = w * 0.13;
    const lampY = h * 0.78;

    // 小灯 (根据当前照度调整亮度)
    const lightLevel = Math.max(0.05, Math.min(1, E / 1000));
    // 灯座
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    ctx.beginPath();
    ctx.arc(lampX + 60, lampY - 28, 6, 0, Math.PI * 2);
    ctx.fill();
    // 灯丝
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(lampX + 60, lampY - 34);
    ctx.lineTo(lampX + 56, lampY - 40);
    ctx.lineTo(lampX + 64, lampY - 40);
    ctx.lineTo(lampX + 60, lampY - 34);
    ctx.stroke();
    // 灯光锥 (根据 E)
    const glowR = 30 + lightLevel * 60;
    const glowGrad = ctx.createRadialGradient(lampX + 60, lampY - 50, 4, lampX + 60, lampY - 50, glowR);
    glowGrad.addColorStop(0, `rgba(251,191,36,${0.4 * lightLevel})`);
    glowGrad.addColorStop(0.6, `rgba(251,191,36,${0.15 * lightLevel})`);
    glowGrad.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(lampX + 60, lampY - 50, glowR, 0, Math.PI * 2);
    ctx.fill();

    // 照度滑杆
    const sliderX = lampX + 110;
    const sliderY = lampY - 50;
    const sliderLen = 100;
    ctx.fillStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.fillRect(sliderX, sliderY, sliderLen, 6);
    // 滑杆填充 (对数坐标)
    const fillR = Math.max(0, Math.min(sliderLen, (Math.log10(E + 1) / 5) * sliderLen));
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(sliderX, sliderY, fillR, 6);
    // 刻度 + 标签
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('E=0', sliderX, sliderY - 4);
    ctx.textAlign = 'right';
    ctx.fillText('E=1e5 lx', sliderX + sliderLen, sliderY - 4);
    ctx.textAlign = 'center';
    ctx.fillText(`E = ${E.toFixed(1)} lx`, sliderX + sliderLen / 2, sliderY + 20);

    // 阈值开关逻辑指示
    const swX1 = w * 0.08;
    const swY1 = h * 0.58;
    ctx.fillStyle = isNight ? '#ef4444' : '#22c55e';
    roundRectPath(ctx, swX1, swY1, 120, 26, 4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(isNight ? '🔴 灯亮 (夜)' : '🟢 灯灭 (昼)', swX1 + 8, swY1 + 13);
    ctx.textBaseline = 'alphabetic';

    // --- 右侧: R-L 双对数曲线 ---
    const chartX = w * 0.42;
    const chartY = 48;
    const chartW = w * 0.55;
    const chartH = h * 0.5;

    // 计算 R-E 数据
    const N = 80;
    const xs: number[] = [];
    const ys: number[] = [];
    const eMin = 0.1;
    const eMax = 1e5;
    for (let i = 0; i <= N; i++) {
        const logE = Math.log10(eMin) + (Math.log10(eMax) - Math.log10(eMin)) * (i / N);
        const Ev = Math.pow(10, logE);
        xs.push(Ev);
        ys.push(Rdark * Math.exp(-k * Ev));
    }

    drawMiniChart({
        ctx,
        x: chartX,
        y: chartY,
        w: chartW,
        h: chartH,
        xs,
        ys,
        isDark,
        lineColor: '#fbbf24',
        label: 'R-E 阻值-照度 (双对数)',
        xLabel: '照度 E (lx)',
        yLabel: '电阻 R (Ω)',
        showPeakX: E,
        peakLabel: `E=${E} lx`,
        logX: true,
        logY: true
    });

    // 阈值线
    const thresholdX =
        chartX + ((Math.log10(thresholdE) - Math.log10(eMin)) / (Math.log10(eMax) - Math.log10(eMin))) * chartW;
    if (thresholdX >= chartX && thresholdX <= chartX + chartW) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(thresholdX, chartY);
        ctx.lineTo(thresholdX, chartY + chartH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ef4444';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`阈值=E<${thresholdE}lx`, thresholdX, chartY + chartH - 4);
    }

    // --- 公式 (底部) ---
    const formY = h * 0.78;
    ctx.fillStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('R(E) = R_dark · exp(−k·E)', w / 2 + 80, formY);
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = '12px sans-serif';
    ctx.fillText(`R_dark=${Rdark.toExponential(0)} Ω  k=${k}  T=${T}°C`, w / 2 + 80, formY + 20);
    ctx.fillText(`当前 R = ${R >= 1e3 ? (R / 1e3).toFixed(1) + ' kΩ' : R.toFixed(0) + ' Ω'}`, w / 2 + 80, formY + 38);

    // HUD
    drawHud(ctx, isDark, [
        { label: 'E', value: `${E.toFixed(1)} lx` },
        { label: 'R', value: `${R >= 1e3 ? (R / 1e3).toFixed(1) + ' k' : R.toFixed(0)} Ω` },
        { label: 'R_dark', value: `${Rdark.toExponential(0)} Ω` },
        { label: 'k', value: `${k}` },
        { label: 'T', value: `${T} °C` },
        { label: 't', value: `${currentTime.toFixed(1)} s` }
    ]);

    drawInfoBar(
        ctx,
        w,
        h,
        `R(E)=R_dark·exp(-kE)  E=${E}lx  R=${R >= 1e6 ? (R / 1e6).toFixed(2) + 'M' : R >= 1e3 ? (R / 1e3).toFixed(1) + 'k' : R.toFixed(0)}Ω`,
        isDark
    );

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

// =====================================================================
// 场景 3: 热敏电阻 (thermistor)
//   R(T) = R₀ · exp(B(1/T − 1/T₀)), T₀=298 K
//   NTC: 温度↑ → 电阻↓
// =====================================================================

export function drawThermistorScene(o: SensorSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const T = params['temperature'] ?? 300;
    const R0 = params['R0'] ?? 1e4;
    const B = params['BValue'] ?? 3950;
    const T0 = 298.15;
    const R = R0 * Math.exp(B * (1 / T - 1 / T0));

    drawTitle(ctx, '热敏电阻 (R-T 特性)', w, isDark);

    // --- 左侧: NTC 温度计形状 ---
    const termX = w * 0.15;
    const termY0 = h * 0.15;
    const termH = h * 0.6;

    // 温度计外形
    ctx.fillStyle = isDark ? '#334155' : '#e2e8f0';
    roundRectPath(ctx, termX - 16, termY0, 32, termH + 30, 16);
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    // 底部球
    ctx.beginPath();
    ctx.arc(termX, termY0 + termH + 6, 22, 0, Math.PI * 2);
    ctx.fill();
    // 球渐变
    const bulbGrad = ctx.createRadialGradient(termX - 6, termY0 + termH + 2, 4, termX, termY0 + termH + 6, 22);
    bulbGrad.addColorStop(0, '#fca5a5');
    bulbGrad.addColorStop(0.5, '#ef4444');
    bulbGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = bulbGrad;
    ctx.beginPath();
    ctx.arc(termX, termY0 + termH + 6, 20, 0, Math.PI * 2);
    ctx.fill();

    // 温度计刻度
    const tMin = 200;
    const tMax = 600;
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    for (let ti = tMin; ti <= tMax; ti += 50) {
        const py = termY0 + termH - ((ti - tMin) / (tMax - tMin)) * termH;
        ctx.fillRect(termX + 10, py - 0.5, 6, 1);
        ctx.fillText(`${ti}K`, termX - 18, py + 3);
    }
    // 当前温度液柱
    const fillH = Math.max(0, Math.min(termH, ((T - tMin) / (tMax - tMin)) * termH));
    const fillGrad = ctx.createLinearGradient(termX, termY0 + termH, termX, termY0 + termH - fillH);
    fillGrad.addColorStop(0, '#991b1b');
    fillGrad.addColorStop(1, '#ef4444');
    ctx.fillStyle = fillGrad;
    roundRectPath(ctx, termX - 6, termY0 + termH - fillH, 12, fillH + 12, 6);
    ctx.fill();

    // 当前温度标签
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${T.toFixed(0)}K`, termX, termY0 + termH + 8);

    // 温度转换为 °C
    const Tcelsius = T - 273.15;
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`= ${Tcelsius.toFixed(0)}°C`, termX, termY0 + termH + 44);

    // --- NTC 符号 + 显示 ---
    const symX = w * 0.32;
    const symY = h * 0.32;
    // 矩形符号
    ctx.strokeStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(symX - 48, symY - 20, 96, 40);
    // 内部折线 (电阻)
    ctx.beginPath();
    ctx.moveTo(symX - 20, symY - 20);
    ctx.lineTo(symX - 14, symY - 10);
    ctx.lineTo(symX - 26, symY);
    ctx.lineTo(symX - 14, symY + 10);
    ctx.lineTo(symX - 20, symY + 20);
    ctx.stroke();
    // 温度计弧线
    ctx.beginPath();
    ctx.arc(symX + 22, symY + 18, 12, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NTC', symX, symY + 36);

    // 实时 R 显示
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`${R >= 1e3 ? (R / 1e3).toFixed(1) + ' kΩ' : R.toFixed(0) + ' Ω'}`, symX, symY - 50);
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText(`T = ${T.toFixed(0)} K`, symX, symY - 30);

    // 滑杆
    const sliderX = symX - 70;
    const sliderY = symY + 80;
    ctx.fillStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.fillRect(sliderX, sliderY, 140, 6);
    const sliderF = Math.max(0, Math.min(1, (T - tMin) / (tMax - tMin)));
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(sliderX, sliderY, sliderF * 140, 6);
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${tMin}K`, sliderX - 8, sliderY - 4);
    ctx.textAlign = 'right';
    ctx.fillText(`${tMax}K`, sliderX + 148, sliderY - 4);
    ctx.textAlign = 'center';
    ctx.fillText(`T = ${T.toFixed(0)} K`, sliderX + 70, sliderY + 20);

    // --- 右侧: R-T 曲线 ---
    const chartX = w * 0.55;
    const chartY = 50;
    const chartW = w * 0.42;
    const chartH = h * 0.45;

    const N = 80;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i <= N; i++) {
        const Ti = tMin + ((tMax - tMin) * i) / N;
        xs.push(Ti);
        ys.push(R0 * Math.exp(B * (1 / Ti - 1 / T0)));
    }

    drawMiniChart({
        ctx,
        x: chartX,
        y: chartY,
        w: chartW,
        h: chartH,
        xs,
        ys,
        isDark,
        lineColor: '#ef4444',
        label: 'R-T 阻温特性 (NTC)',
        xLabel: '温度 T (K)',
        yLabel: '电阻 R (Ω)',
        showPeakX: T,
        peakLabel: `T=${T}K`,
        logY: true
    });

    // --- 公式 (底部) ---
    const formY = h * 0.78;
    ctx.fillStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('R = R₀ · exp(B(1/T − 1/T₀))', w - 40, formY);
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText(`R₀ = ${R0.toExponential(0)} Ω`, w - 40, formY + 18);
    ctx.fillText(`B = ${B} K    T₀ = 298 K`, w - 40, formY + 34);
    ctx.fillText(`R = ${R >= 1e3 ? (R / 1e3).toFixed(1) + ' kΩ' : R.toFixed(0) + ' Ω'}`, w - 40, formY + 50);

    // HUD
    drawHud(ctx, isDark, [
        { label: 'T', value: `${T.toFixed(1)} K` },
        { label: 'R', value: `${R >= 1e3 ? (R / 1e3).toFixed(2) + ' k' : R.toFixed(0)} Ω` },
        { label: 'R₀', value: `${R0.toExponential(0)} Ω` },
        { label: 'B', value: `${B} K` },
        { label: 'T₀', value: `${T0} K` },
        { label: 't', value: `${currentTime.toFixed(1)} s` }
    ]);

    drawInfoBar(
        ctx,
        w,
        h,
        `R=R₀·exp(B(1/T-1/T₀))  T=${T}K  R=${R >= 1e3 ? (R / 1e3).toFixed(1) + 'k' : R.toFixed(0)}Ω  B=${B}K`,
        isDark
    );

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

// =====================================================================
// 场景 4: 干簧管 (reed-switch)
//   H(d) = H₀ / (1 + (d/d₀)²)  (经验公式: 磁铁越近 → 磁场越强)
//   H > H_pull: 吸合 (通路);  H < H_rel: 释放 (断路)
// =====================================================================

export function drawReedSwitchScene(o: SensorSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const d = params['magnetDistance'] ?? 5;
    const Hpull = params['pullInThreshold'] ?? 50;
    const Hrel = params['releaseThreshold'] ?? 30;

    // H = H₀ / (1 + (d/d₀)²), H₀=200 mT, d₀=10 mm
    const H0 = 200;
    const d0 = 10;
    const H = H0 / (1 + (d / d0) * (d / d0));
    const state = H >= Hpull ? 'close' : H <= Hrel ? 'open' : H >= (Hpull + Hrel) / 2 ? 'close' : 'open';

    drawTitle(ctx, '干簧管 (磁控开关)', w, isDark);

    // --- 磁铁 (左侧) ---
    const magnetX = w * 0.12;
    const magnetY = h * 0.42;
    const magnetW = 70;
    const magnetH = 50;

    // 磁铁极
    const magGrad = ctx.createLinearGradient(magnetX, magnetY, magnetX + magnetW, magnetY);
    magGrad.addColorStop(0, '#ef4444');
    magGrad.addColorStop(0.49, '#ef4444');
    magGrad.addColorStop(0.5, '#3b82f6');
    magGrad.addColorStop(1, '#3b82f6');
    ctx.fillStyle = magGrad;
    roundRectPath(ctx, magnetX, magnetY - magnetH / 2, magnetW, magnetH, 4);
    ctx.fill();

    // 标签 N / S
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', magnetX + magnetW * 0.25, magnetY);
    ctx.fillText('S', magnetX + magnetW * 0.75, magnetY);

    // 磁感线 (2-3 条弧线)
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.2;
    for (let li = 0; li < 3; li++) {
        const arcR = 40 + li * 28;
        ctx.beginPath();
        ctx.arc(magnetX + magnetW, magnetY, arcR, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
        // 箭头
        const arrowAngle = (Math.PI / 3) * 0.6;
        const ax = magnetX + magnetW + arcR * Math.cos(arrowAngle);
        const ay = magnetY - arcR * Math.sin(arrowAngle);
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.moveTo(ax + 6, ay - 2);
        ctx.lineTo(ax, ay + 2);
        ctx.lineTo(ax + 2, ay - 6);
        ctx.closePath();
        ctx.fill();
    }

    // --- 干簧管 (右侧) ---
    const tubeX = w * 0.5;
    const tubeY = h * 0.42;
    const tubeW = 240;
    const tubeH = 70;

    // 玻璃管
    const tubeGrad = ctx.createLinearGradient(tubeX, tubeY - tubeH / 2, tubeX, tubeY + tubeH / 2);
    tubeGrad.addColorStop(0, isDark ? 'rgba(147,197,253,0.5)' : 'rgba(186,230,253,0.6)');
    tubeGrad.addColorStop(0.5, isDark ? 'rgba(59,130,246,0.2)' : 'rgba(191,219,254,0.4)');
    tubeGrad.addColorStop(1, isDark ? 'rgba(147,197,253,0.5)' : 'rgba(186,230,253,0.6)');
    ctx.fillStyle = tubeGrad;
    ctx.beginPath();
    ctx.ellipse(tubeX + tubeW / 2, tubeY, tubeW / 2, tubeH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#93c5fd' : '#60a5fa';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 簧片间距 (吸合时为 0)
    const gap = state === 'close' ? 0 : Math.max(2, 14 - H / 10);

    // 左簧片
    const reed1StartX = tubeX + 28;
    const reed1EndX = tubeX + tubeW / 2 - gap / 2;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(reed1StartX, tubeY + 6);
    ctx.lineTo(reed1EndX, tubeY + 6);
    ctx.stroke();

    // 右簧片
    const reed2StartX = tubeX + tubeW / 2 + gap / 2;
    const reed2EndX = tubeX + tubeW - 28;
    ctx.beginPath();
    ctx.moveTo(reed2StartX, tubeY + 6);
    ctx.lineTo(reed2EndX, tubeY + 6);
    ctx.stroke();

    // 簧片颜色 (铁磁材料)
    const reedColor = state === 'close' ? '#f59e0b' : '#94a3b8';
    ctx.strokeStyle = reedColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(reed1StartX, tubeY + 6);
    ctx.lineTo(reed1EndX, tubeY + 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(reed2StartX, tubeY + 6);
    ctx.lineTo(reed2EndX, tubeY + 6);
    ctx.stroke();

    // 引线
    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tubeX + 4, tubeY + 6);
    ctx.lineTo(tubeX + 28, tubeY + 6);
    ctx.moveTo(tubeX + tubeW - 28, tubeY + 6);
    ctx.lineTo(tubeX + tubeW - 4, tubeY + 6);
    ctx.stroke();

    // 磁铁到干簧管距离
    ctx.strokeStyle = isDark ? '#94a3b8' : '#cbd5e1';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(magnetX + magnetW + 4, tubeY + 40);
    ctx.lineTo(tubeX, tubeY + 40);
    ctx.stroke();
    ctx.setLineDash([]);
    // 距离箭头
    drawArrow(ctx, magnetX + magnetW + 4, tubeY + 40, tubeX, tubeY + 40, isDark ? '#94a3b8' : '#64748b', 1.2, 6);
    drawArrow(ctx, tubeX, tubeY + 44, magnetX + magnetW + 4, tubeY + 44, isDark ? '#94a3b8' : '#64748b', 1.2, 6);
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`d = ${d.toFixed(1)} mm`, (magnetX + magnetW + tubeX) / 2, tubeY + 56);

    // --- 状态指示 (LED) ---
    const ledX = w * 0.82;
    const ledY = h * 0.32;

    // LED 灯座
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(ledX, ledY, 18, 0, Math.PI * 2);
    ctx.fill();
    // LED 灯
    const ledColor = state === 'close' ? '#22c55e' : '#ef4444';
    const ledGrad2 = ctx.createRadialGradient(ledX - 4, ledY - 4, 2, ledX, ledY, 16);
    ledGrad2.addColorStop(0, state === 'close' ? '#86efac' : '#fca5a5');
    ledGrad2.addColorStop(1, ledColor);
    ctx.fillStyle = ledGrad2;
    ctx.beginPath();
    ctx.arc(ledX, ledY, 14, 0, Math.PI * 2);
    ctx.fill();
    // 灯光锥
    const ledGlow = ctx.createRadialGradient(ledX, ledY, 6, ledX, ledY, 40);
    ledGlow.addColorStop(0, state === 'close' ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.4)');
    ledGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ledGlow;
    ctx.beginPath();
    ctx.arc(ledX, ledY, 40, 0, Math.PI * 2);
    ctx.fill();

    // 状态标签
    ctx.fillStyle = ledColor;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state === 'close' ? '通路 (闭合)' : '断路 (断开)', ledX, ledY + 36);

    // --- 滑杆 (距离控制) ---
    const sliderX = w * 0.18;
    const sliderY = h * 0.78;
    const sliderW = w * 0.7;
    ctx.fillStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.fillRect(sliderX, sliderY, sliderW, 6);
    const sliderF = Math.max(0, Math.min(1, d / 100));
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(sliderX, sliderY, sliderF * sliderW, 6);
    // 刻度
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('0mm', sliderX, sliderY - 4);
    ctx.textAlign = 'right';
    ctx.fillText('100mm', sliderX + sliderW, sliderY - 4);
    ctx.textAlign = 'center';
    ctx.fillText(`磁铁距离 d = ${d.toFixed(1)} mm`, sliderX + sliderW / 2, sliderY + 22);

    // H 值显示
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`H = ${H.toFixed(1)} mT  (吸合>${Hpull}, 释放<${Hrel})`, sliderX + sliderW / 2, sliderY + 38);

    // --- 磁滞回线 ---
    const hysX = w * 0.74;
    const hysY = h * 0.55;
    const hysW = w * 0.22;
    const hysH = h * 0.18;

    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.7)';
    roundRectPath(ctx, hysX, hysY, hysW, hysH, 6);
    ctx.fill();
    // 磁滞回线: 吸合段 + 释放段
    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hysX, hysY);
    ctx.lineTo(hysX, hysY + hysH);
    ctx.lineTo(hysX + hysW, hysY + hysH);
    ctx.stroke();
    // 吸合线
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hysX + 4, hysY + hysH - 4);
    ctx.lineTo(hysX + hysW * 0.6, hysY + hysH - 4);
    ctx.lineTo(hysX + hysW * 0.6, hysY + 4);
    ctx.stroke();
    // 释放线
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(hysX + 4, hysY + hysH - 4);
    ctx.lineTo(hysX + hysW * 0.3, hysY + hysH - 4);
    ctx.lineTo(hysX + hysW * 0.3, hysY + 4);
    ctx.stroke();
    // 当前点
    const curPROPOR = Math.max(0, Math.min(0.9, H / 200));
    const curHx = hysX + 4 + curPROPOR * (hysW * 0.6 - 4);
    const curHy = hysY + hysH - 4 - curPROPOR * (hysH - 8);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(curHx, curHy, 3, 0, Math.PI * 2);
    ctx.fill();
    // 标签
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('吸合', hysX + 2, hysY + hysH + 10);
    ctx.textAlign = 'right';
    ctx.fillText('H', hysX + hysW - 2, hysY + hysH + 10);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('释放', hysX + 2, hysY - 2);
    ctx.textBaseline = 'alphabetic';

    // HUD
    drawHud(ctx, isDark, [
        { label: 'd', value: `${d.toFixed(1)} mm` },
        { label: 'H', value: `${H.toFixed(1)} mT` },
        { label: 'H_pull', value: `${Hpull} mT` },
        { label: 'H_rel', value: `${Hrel} mT` },
        { label: '状态', value: state === 'close' ? '闭合' : '断开' },
        { label: 't', value: `${currentTime.toFixed(1)} s` }
    ]);

    drawInfoBar(
        ctx,
        w,
        h,
        `干簧管: d=${d}mm  H=${H.toFixed(1)}mT  ${state === 'close' ? '通路(吸合)' : '断路(断开)'}`,
        isDark
    );

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

// =====================================================================
// 场景 5: 电阻应变片 (strain-gauge)
//   ΔR/R = K·ε , ΔU = (U_K/4)·K·ε (单臂电桥)
// =====================================================================

export function drawStrainGaugeScene(o: SensorSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const strain = params['strain'] ?? 1000; // με (微应变)
    const K = params['gaugeFactor'] ?? 2.1;
    const UK = params['bridgeVoltage'] ?? 5;

    const epsilon = strain * 1e-6; // 无量纲
    const deltaRR = K * epsilon;
    const R0 = 120; // 标称 120 Ω
    const deltaR = R0 * deltaRR;
    // 单臂电桥输出: ΔU ≈ UK/4 · K · ε
    const deltaU = (UK / 4) * K * epsilon;

    drawTitle(ctx, '电阻应变片 (惠斯通电桥)', w, isDark);

    // --- 左侧: 应变片变形示意 ---
    const sgX = w * 0.08;
    const sgY = h * 0.25;
    const sgW = 200;
    const sgH = 70;

    // 金属梁
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    roundRectPath(ctx, sgX - 20, sgY + 35, sgW + 40, 40, 4);
    ctx.fill();

    // 应变片基底 (随应变纵向拉伸)
    const deform = Math.max(0, Math.min(10, strain / 200));
    const baseX = sgX + 20;
    const baseY = sgY + 20;
    const baseW = sgW - 40;
    const baseH = 30;

    // 未变形轮廓 (虚线)
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.3)';
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(baseX, baseY - deform, baseW, baseH + deform * 2);
    ctx.setLineDash([]);

    // 变形后的应变片
    const grad = ctx.createLinearGradient(baseX, baseY, baseX + baseW, baseY);
    grad.addColorStop(0, '#fbbf24');
    grad.addColorStop(0.5, '#f59e0b');
    grad.addColorStop(1, '#d97706');
    ctx.fillStyle = grad;
    roundRectPath(ctx, baseX, baseY - deform, baseW, baseH + deform * 2, 3);
    ctx.fill();

    // 电阻栅线
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
        const lx = baseX + 10 + (i * (baseW - 20)) / 7;
        ctx.beginPath();
        ctx.moveTo(lx, baseY - deform + 4);
        ctx.lineTo(lx, baseY - deform + baseH + deform * 2 - 4);
        ctx.stroke();
    }

    // 引线
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(baseX + 10, baseY + baseH / 2);
    ctx.lineTo(baseX - 20, baseY + baseH / 2);
    ctx.moveTo(baseX + baseW - 10, baseY + baseH / 2);
    ctx.lineTo(baseX + baseW + 20, baseY + baseH / 2);
    ctx.stroke();

    // 标签
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('应变片 (纵向贴装)', baseX + baseW / 2 + 10, baseY - deform - 8);

    // 应变标注
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`ε = ${strain} με`, sgX + sgW / 2, sgY + sgH + 70);
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText(`ΔL/L = ${strain} × 10⁻⁶`, sgX + sgW / 2, sgY + sgH + 86);

    // --- 右侧: 惠斯通电桥 ---
    const brX = w * 0.5;
    const brY = h * 0.2;
    const brSize = 180;

    // 电桥 4 个臂 (菱形)
    const centerX = brX + brSize / 2;
    const centerY = brY + brSize / 2;
    const R = ['R₁', 'R₂', 'R₃', 'R₄(工作臂)'];

    // 电源正负极
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, brY - 16);
    ctx.lineTo(centerX, brY);
    ctx.stroke();
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`+U_K = ${UK}V`, centerX, brY - 22);

    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(centerX, brY + brSize);
    ctx.lineTo(centerX, brY + brSize + 16);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText('GND', centerX, brY + brSize + 28);

    // 电桥 4 条臂线 (菱形)
    // 左上: R₁, 右上: R₂, 左下: R₃, 右下: R₄
    const corners = [
        { x: centerX, y: brY }, // 上
        { x: brX + brSize, y: centerY }, // 右
        { x: centerX, y: brY + brSize }, // 下
        { x: brX, y: centerY } // 左
    ];

    ctx.strokeStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.lineWidth = 2;
    // 上-右 (R₁)
    ctx.beginPath();
    ctx.moveTo(corners[0]!.x, corners[0]!.y);
    ctx.lineTo(corners[1]!.x, corners[1]!.y);
    ctx.stroke();
    // 右-下 (R₂)
    ctx.beginPath();
    ctx.moveTo(corners[1]!.x, corners[1]!.y);
    ctx.lineTo(corners[2]!.x, corners[2]!.y);
    ctx.stroke();
    // 下-左 (R₃)
    ctx.beginPath();
    ctx.moveTo(corners[2]!.x, corners[2]!.y);
    ctx.lineTo(corners[3]!.x, corners[3]!.y);
    ctx.stroke();
    // 左-上 (R₄)
    ctx.beginPath();
    ctx.moveTo(corners[3]!.x, corners[3]!.y);
    ctx.lineTo(corners[0]!.x, corners[0]!.y);
    ctx.stroke();
    // 输出之间 (从上到下 中间为电压表)
    ctx.beginPath();
    ctx.moveTo(brX, centerY);
    ctx.lineTo(brX - 30, centerY);
    ctx.moveTo(brX + brSize, centerY);
    ctx.lineTo(brX + brSize + 30, centerY);
    ctx.stroke();

    // R 标签
    const labelOff = 16;
    const midPoints = [
        { x: (corners[0]!.x + corners[1]!.x) / 2, y: (corners[0]!.y + corners[1]!.y) / 2, offX: labelOff, offY: -8 }, // 右上
        { x: (corners[1]!.x + corners[2]!.x) / 2, y: (corners[1]!.y + corners[2]!.y) / 2, offX: labelOff, offY: 4 },
        { x: (corners[2]!.x + corners[3]!.x) / 2, y: (corners[2]!.y + corners[3]!.y) / 2, offX: -labelOff, offY: 4 },
        { x: (corners[3]!.x + corners[0]!.x) / 2, y: (corners[3]!.y + corners[0]!.y) / 2, offX: -labelOff, offY: -8 }
    ];
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    R.forEach((r, i) => {
        const mp = midPoints[i]!;
        ctx.fillText(r, mp.x + mp.offX, mp.y + mp.offY);
    });

    // 节点小圆
    corners.forEach(c => {
        ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    // 电压表 (跨接左右)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(brX - 30, centerY);
    ctx.lineTo(brX - 60, centerY);
    ctx.lineTo(brX - 60, centerY - 22);
    ctx.lineTo(brX + brSize + 60, centerY - 22);
    ctx.lineTo(brX + brSize + 60, centerY);
    ctx.lineTo(brX + brSize + 30, centerY);
    ctx.stroke();
    // V 符号
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('V', brX + brSize / 2, centerY - 28);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`ΔU = ${(deltaU * 1000).toFixed(3)} mV`, brX + brSize / 2, centerY - 46);

    // --- 桥压-应变曲线 ---
    const chartX = w * 0.08;
    const chartY = h * 0.62;
    const chartW = w * 0.36;
    const chartH = h * 0.22;

    const xs: number[] = [];
    const ys: number[] = [];
    for (let si = -5000; si <= 5000; si += 200) {
        xs.push(si);
        ys.push((UK / 4) * K * (si * 1e-6) * 1000); // mV
    }
    drawMiniChart({
        ctx,
        x: chartX,
        y: chartY,
        w: chartW,
        h: chartH,
        xs,
        ys,
        isDark,
        lineColor: '#06b6d4',
        label: 'ΔU-ε (单臂电桥)',
        xLabel: '应变 ε (με)',
        yLabel: 'ΔU (mV)',
        showPeakX: strain > 0 ? strain : undefined,
        peakLabel: `${strain}`,
        fillUnder: 'rgba(6,182,212,0.15)'
    });

    // 目前应变点
    if (strain >= -5000 && strain <= 5000) {
        const dotX = chartX + ((strain - -5000) / 10000) * chartW;
        const yVal = (UK / 4) * K * (strain * 1e-6) * 1000;
        const yMax = Math.max(...ys);
        const yMin = Math.min(...ys);
        const dotY = chartY + chartH - ((yVal - yMin) / (yMax - yMin)) * chartH;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // 公式
    const formX = w * 0.52;
    const formY = h * 0.66;
    ctx.fillStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('惠斯通电桥 (单臂)', formX + 80, formY);
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('ΔR / R = K·ε', formX + 80, formY + 20);
    ctx.fillText('ΔU ≈ U_K · K · ε / 4', formX + 80, formY + 38);
    // 代入
    ctx.font = '11px sans-serif';
    ctx.fillText(`K = ${K}, ε = ${strain} × 10⁻⁶, U_K = ${UK} V`, formX + 80, formY + 56);
    ctx.fillText(`ΔR = R·K·ε = ${deltaR.toFixed(4)} Ω (R₀=${R0}Ω)`, formX + 80, formY + 72);

    // HUD
    drawHud(ctx, isDark, [
        { label: 'ε', value: `${strain} με` },
        { label: 'K', value: `${K}` },
        { label: 'ΔR/R', value: `${deltaRR.toExponential(2)}` },
        { label: 'ΔU', value: `${(deltaU * 1000).toFixed(3)} mV` },
        { label: 'U_K', value: `${UK} V` },
        { label: 't', value: `${currentTime.toFixed(1)} s` }
    ]);

    drawInfoBar(ctx, w, h, `惠斯通电桥: ΔR/R=K·ε  ε=${strain}με  K=${K}  ΔU=${(deltaU * 1000).toFixed(3)}mV`, isDark);

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

// =====================================================================
// 场景 6: 门窗防盗报警 (security-alarm)
//   磁体远离干簧管 → 干簧管断开 → 非门输入高 → LED + 蜂鸣器报警
// =====================================================================

export function drawSecurityAlarmScene(o: SensorSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const magnetDistance = params['magnetDistance'] ?? 5;
    const operateDist = params['operateDistance'] ?? 15;
    const releaseDist = params['releaseDistance'] ?? 25;

    // 状态: 吸合 (门关), 断开 (门开/报警)
    const doorOpen = magnetDistance > operateDist;
    const alarm = doorOpen;

    drawTitle(ctx, '门窗防盗报警 (磁控开关)', w, isDark);

    // --- 左侧: 门框 + 门扇 + 磁体 + 干簧管 ---
    const doorX = w * 0.13;
    const doorY = h * 0.22;
    const doorW = 160;
    const doorH = 220;

    // 门框
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    ctx.fillRect(doorX - 14, doorY - 14, 14, doorH + 28);
    ctx.fillRect(doorX + doorW, doorY - 14, 14, doorH + 28);
    ctx.fillRect(doorX - 14, doorY - 14, doorW + 42, 14);

    // 门扇 (开门时偏移)
    const openOffset = doorOpen ? Math.min(magnetDistance * 1.5, 80) : 0;
    // 门扇阴影
    if (doorOpen) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        roundRectPath(ctx, doorX + 2 + openOffset, doorY + 2, doorW, doorH, 4);
        ctx.fill();
    }
    // 门扇主体
    const doorGrad = ctx.createLinearGradient(doorX, doorY, doorX + doorW, doorY);
    doorGrad.addColorStop(0, isDark ? '#7c5e3c' : '#b07c4f');
    doorGrad.addColorStop(1, isDark ? '#6b4a2a' : '#946b3f');
    ctx.fillStyle = doorGrad;
    roundRectPath(ctx, doorX + openOffset, doorY, doorW, doorH, 4);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#4a3020' : '#6b4a2a';
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, doorX + openOffset, doorY, doorW, doorH, 4);
    ctx.stroke();
    // 门把手
    ctx.fillStyle = '#d4a030';
    ctx.beginPath();
    ctx.arc(doorX + openOffset + doorW - 22, doorY + doorH / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // 磁体 (在门扇顶部)
    const magnetX = doorX + openOffset + doorW - 30;
    const magnetY = doorY + 20;
    ctx.fillStyle = '#ef4444';
    roundRectPath(ctx, magnetX - 14, magnetY - 10, 28, 20, 3);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('磁体', magnetX, magnetY + 4);

    // 干簧管 (门框)
    const reedX = doorX + doorW - 30;
    const reedY2 = doorY + 18;
    ctx.fillStyle = isDark ? 'rgba(147,197,253,0.5)' : 'rgba(186,230,253,0.5)';
    ctx.beginPath();
    ctx.ellipse(reedX, reedY2, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // 触点
    const contactOpen = doorOpen;
    const reedGap = contactOpen ? 8 : 0;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(reedX - 12, reedY2);
    ctx.lineTo(reedX - reedGap, reedY2);
    ctx.moveTo(reedX + reedGap, reedY2);
    ctx.lineTo(reedX + 12, reedY2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('干簧管', reedX, reedY2 + 24);

    // 状态标签 (门)
    ctx.fillStyle = doorOpen ? '#ef4444' : '#22c55e';
    roundRectPath(ctx, doorX + openOffset, doorY + doorH + 10, doorW, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(doorOpen ? '门开启 (报警)' : '门关闭 (正常)', doorX + openOffset + doorW / 2, doorY + doorH + 22);

    // --- 右侧: 简易逻辑电路 ---
    const circX = w * 0.52;
    const circY = h * 0.22;
    const circW = w * 0.44;

    // 电路背景卡
    ctx.fillStyle = isDark ? 'rgba(30,41,59,0.6)' : 'rgba(226,232,240,0.6)';
    roundRectPath(ctx, circX - 20, circY - 10, circW + 20, h * 0.4, 8);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.lineWidth = 1;
    roundRectPath(ctx, circX - 20, circY - 10, circW + 20, h * 0.4, 8);
    ctx.stroke();

    // 标题
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('逻辑电路', circX - 10, circY + 6);

    // 非门符号
    const notX = circX + 80;
    const notY = circY + 60;
    const notW = 60;
    const notH = 36;
    ctx.strokeStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(notX, notY);
    ctx.lineTo(notX, notY + notH);
    ctx.lineTo(notX + notW - 10, notY + notH / 2);
    ctx.closePath();
    ctx.stroke();
    // 输入输出小圈
    ctx.beginPath();
    ctx.arc(notX + notW - 4, notY + notH / 2, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('非门', notX + notW / 2, notY + notH + 14);

    // 输入线
    const inY = notY + notH / 2;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(circX - 10, inY);
    ctx.lineTo(notX, inY);
    ctx.stroke();
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(doorOpen ? '高(H)' : '低(L)', circX - 8, inY - 4);

    // 输出线
    const outX2 = notX + notW + 4;
    ctx.strokeStyle = doorOpen ? '#ef4444' : '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(outX2, inY);
    ctx.lineTo(circX + circW - 10, inY);
    ctx.stroke();
    ctx.fillStyle = doorOpen ? '#ef4444' : '#22c55e';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(doorOpen ? 'H → 报警' : 'L → 正常', (outX2 + circX + circW - 10) / 2, inY - 8);

    // --- 报警指示 + 蜂鸣器 ---
    const indX = circX + circW * 0.3;
    const indY = circY + 140;

    // LED (红色闪烁)
    const pulse = alarm ? 0.5 + 0.5 * Math.sin(currentTime * 8) : 0.1;
    const ledGrad3 = ctx.createRadialGradient(indX - 4, indY - 4, 2, indX, indY, 16);
    ledGrad3.addColorStop(0, alarm ? '#fca5a5' : '#475569');
    ledGrad3.addColorStop(1, alarm ? '#ef4444' : '#334155');
    ctx.fillStyle = ledGrad3;
    ctx.beginPath();
    ctx.arc(indX, indY, 14, 0, Math.PI * 2);
    ctx.fill();
    // LED 灯光
    if (alarm) {
        const alarmGlow = ctx.createRadialGradient(indX, indY, 4, indX, indY, 50);
        alarmGlow.addColorStop(0, `rgba(239,68,68,${0.7 * pulse})`);
        alarmGlow.addColorStop(1, 'rgba(239,68,68,0)');
        ctx.fillStyle = alarmGlow;
        ctx.beginPath();
        ctx.arc(indX, indY, 50, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = alarm ? '#ef4444' : '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(alarm ? '⚠ 报警' : '正常', indX, indY + 34);

    // 蜂鸣器 (右侧)
    const buzzX = circX + circW * 0.7;
    const buzzY = indY;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(buzzX, buzzY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = alarm ? '#ef4444' : '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 蜂鸣片
    ctx.beginPath();
    ctx.arc(buzzX, buzzY, 8, 0, Math.PI * 2);
    ctx.strokeStyle = alarm ? '#ef4444' : '#64748b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 声波
    if (alarm) {
        ctx.strokeStyle = `rgba(239,68,88,${pulse})`;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(buzzX, buzzY, 16 + i * 6, -Math.PI * 0.4, Math.PI * 0.4);
            ctx.stroke();
        }
        ctx.fillStyle = `rgba(239,68,68,${pulse})`;
        ctx.beginPath();
        ctx.arc(buzzX, buzzY - 24, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = alarm ? '#ef4444' : '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('蜂鸣器', buzzX, buzzY + 34);

    // --- 距离 + 门槛 ---
    const slidY = h * 0.78;
    const slidX = w * 0.1;
    const slidW = w * 0.8;
    ctx.fillStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.fillRect(slidX, slidY, slidW, 6);
    const slidF = Math.max(0, Math.min(1, magnetDistance / 50));
    ctx.fillStyle = doorOpen ? '#ef4444' : '#22c55e';
    ctx.fillRect(slidX, slidY, slidF * slidW, 6);
    // 门槛标记
    const operMark = (operateDist / 50) * slidW;
    const relMark = (releaseDist / 50) * slidW;
    ctx.strokeStyle = '#fbbf24';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(slidX + operMark, slidY - 10);
    ctx.lineTo(slidX + operMark, slidY + 14);
    ctx.stroke();
    ctx.strokeStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(slidX + relMark, slidY - 10);
    ctx.lineTo(slidX + relMark, slidY + 14);
    ctx.stroke();
    ctx.setLineDash([]);
    // 标签
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('0mm', slidX, slidY - 4);
    ctx.textAlign = 'right';
    ctx.fillText(`50mm  吸合=${operateDist}mm  释放=${releaseDist}mm`, slidX + slidW, slidY - 4);
    ctx.textAlign = 'center';
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`d = ${magnetDistance.toFixed(1)} mm`, slidX + slidW / 2, slidY + 24);

    // 真值表
    const tvX = w * 0.52;
    const tvY = h * 0.62;
    const tvW = circW;
    const tvH = 36;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.7)';
    roundRectPath(ctx, tvX - 10, tvY, tvW + 10, tvH + 16, 6);
    ctx.fill();
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('逻辑真值表:', tvX - 4, tvY + 12);
    // 两端
    ctx.font = '9px monospace';
    const rowy = tvY + 28;
    ctx.fillText('干簧管: 闭合(=0) | 断开(=1)', tvX - 4, rowy);
    ctx.fillText(`输出  : ${doorOpen ? 'H (=1, 报警)' : 'L (=0, 正常)'}`, tvX - 4, rowy + 12);

    // HUD
    drawHud(ctx, isDark, [
        { label: 'd', value: `${magnetDistance.toFixed(1)} mm` },
        { label: '吸合阈', value: `${operateDist} mm` },
        { label: '释放阈', value: `${releaseDist} mm` },
        { label: '门', value: doorOpen ? '开启' : '关闭' },
        { label: '干簧管', value: doorOpen ? '断开' : '吸合' },
        { label: '报警', value: alarm ? '激活' : '关闭' }
    ]);

    drawInfoBar(
        ctx,
        w,
        h,
        `磁控报警: d=${magnetDistance.toFixed(1)}mm  吸合阈=${operateDist}mm  释放阈=${releaseDist}mm`,
        isDark
    );

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

// =====================================================================
// 场景 7: 光控开关 (light-control-switch)
//   敏感元件 LDR 与 R_fix 分压 → V_cc = E · R_fix/(R_LDR + R_fix)
//   V_cc > V_be_on (0.7V) → 三极管导通 → 继电器吸合 → 路灯亮/灭
//   自动 24h 变化曲线 (白天阻值低 → V_cc 低 → 灯灭; 夜晚反之)
// =====================================================================

export function drawLightControlSwitchScene(o: SensorSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);

    const L = params['lightIntensity'] ?? 0.5;
    const threshold = params['threshold'] ?? 10;
    const Rfix = params['Rfix'] ?? 10000;
    const Esupply = params['Esupply'] ?? 12;

    // 夜间: LDR 阻值升高；L 为归一化照度∈[0,1]，映射到 lux 与阈值比较
    // 简化模型: R_LDR = Rdark · exp(-k·L)，k 取较大值使亮/暗阻值明显变化
    const Rdark2 = 1e6;
    const k2 = 7;
    const Rldr = Rdark2 * Math.exp(-k2 * L);

    // 分压(当前拓扑: LDR 在上、Rfix 在下): 亮时 Rldr 小→Vcc 高；暗时 Rldr 大→Vcc 低
    const Vcc = (Esupply * Rfix) / (Rldr + Rfix);
    // 照度(lux)与阈值比较：低照度(夜)→灯亮。threshold 单位为 lx，与 24h 曲线一致
    const currentLux = L * 40000;
    const lampOn = currentLux < threshold;
    // 低边 NPN + 继电器：Vcc 低(暗)→三极管截止→继电器吸合→灯亮；故三极管状态与灯相反
    const transistorOn = !lampOn;

    drawTitle(ctx, '光控开关 (路灯自动控制)', w, isDark);

    // --- 左侧: 光敏分压电路 ---
    const circX = w * 0.04;
    const circY = h * 0.18;
    const circW = 280;
    const circH = 200;

    ctx.fillStyle = isDark ? 'rgba(30,41,59,0.6)' : 'rgba(226,232,240,0.6)';
    roundRectPath(ctx, circX - 8, circY - 10, circW + 20, circH + 20, 8);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.lineWidth = 1;
    roundRectPath(ctx, circX - 8, circY - 10, circW + 20, circH + 20, 8);
    ctx.stroke();

    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LDR 分压电路', circX, circY + 6);

    // 电源
    const powX = circX + 20;
    const powY = circY + 30;
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`+${Esupply}V`, powX, powY);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(powX + 6, powY + 6);
    ctx.lineTo(powX + 6, powY + 50);
    ctx.stroke();

    // LDR 符号 (右上)
    const ldrX2 = circX + circW * 0.7;
    const ldrY2 = circY + 40;
    ctx.strokeStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ldrX2 - 24, ldrY2 - 14, 48, 28);
    ctx.beginPath();
    ctx.moveTo(ldrX2 - 10, ldrY2 - 14);
    ctx.lineTo(ldrX2 - 6, ldrY2 - 8);
    ctx.lineTo(ldrX2 - 14, ldrY2);
    ctx.lineTo(ldrX2 - 6, ldrY2 + 8);
    ctx.lineTo(ldrX2 - 10, ldrY2 + 14);
    ctx.stroke();
    // 光箭头
    for (let ai = 0; ai < 2; ai++) {
        drawArrow(
            ctx,
            ldrX2 - 26 + ai * 10,
            ldrY2 - 24 - ai * 8,
            ldrX2 - 22 + ai * 10,
            ldrY2 - 28 - ai * 8,
            '#fbbf24',
            1,
            3
        );
    }
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`LDR`, ldrX2, ldrY2 + 26);
    ctx.fillText(`R=${Rldr >= 1e3 ? (Rldr / 1e3).toFixed(0) + 'k' : Rldr.toFixed(0)}`, ldrX2, ldrY2 + 38);

    // R_fix (右下)
    const rfixX2 = ldrX2;
    const rfixY2 = ldrY2 + 70;
    ctx.strokeStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rfixX2 - 24, rfixY2 - 10, 48, 20);
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`R_fix`, rfixX2, rfixY2 + 22);
    ctx.fillText(`${Rfix >= 1e3 ? (Rfix / 1e3).toFixed(0) + 'k' : Rfix}`, rfixX2, rfixY2 + 34);

    // LDR 和 Rfix 之间连线 (V_cc 采样点)
    ctx.strokeStyle = isDark ? '#cbd5e1' : '#475569';
    ctx.lineWidth = 1.2;
    // 上: 电源 +Esupply 到 LDR
    ctx.beginPath();
    ctx.moveTo(powX + 6, powY + 6);
    ctx.lineTo(powX + 6, ldrY2);
    ctx.lineTo(ldrX2 - 24, ldrY2);
    ctx.stroke();
    // LDR 到 Rfix
    ctx.beginPath();
    ctx.moveTo(ldrX2 + 24, ldrY2);
    ctx.lineTo(ldrX2 + 60, ldrY2);
    ctx.lineTo(rfixX2 + 60, rfixY2);
    ctx.lineTo(rfixX2 + 24, rfixY2);
    ctx.stroke();
    // Rfix 到 GND
    ctx.beginPath();
    ctx.moveTo(rfixX2 - 24, rfixY2);
    ctx.lineTo(rfixX2 - 60, rfixY2);
    ctx.lineTo(powX + 6, rfixY2);
    ctx.lineTo(powX + 6, powY + 50);
    ctx.stroke();
    // GND 符号
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(powX + 1, powY + 50);
    ctx.lineTo(powX + 11, powY + 50);
    ctx.moveTo(powX + 3, powY + 54);
    ctx.lineTo(powX + 9, powY + 54);
    ctx.moveTo(powX + 5, powY + 58);
    ctx.lineTo(powX + 7, powY + 58);
    ctx.stroke();

    // V_cc 采样点
    const vccX = (ldrX2 + 60 + rfixX2 + 60) / 2;
    const vccY = rfixY2 + 24;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(vccX, vccY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`V_cc = ${Vcc.toFixed(2)} V`, vccX + 10, vccY);

    // 三极管示意
    const trX = vccX + 100;
    const trY = vccY - 18;
    ctx.strokeStyle = transistorOn ? '#10b981' : '#94a3b8';
    ctx.lineWidth = 1.5;
    // NPN 三极管符号
    ctx.beginPath();
    ctx.moveTo(trX, trY + 16);
    ctx.lineTo(trX + 20, trY + 16);
    ctx.lineTo(trX + 20, trY);
    ctx.moveTo(trX + 20, trY + 8);
    ctx.lineTo(trX + 40, trY);
    ctx.lineTo(trX + 40, trY - 8);
    ctx.moveTo(trX + 20, trY + 24);
    ctx.lineTo(trX + 40, trY + 32);
    ctx.lineTo(trX + 40, trY + 38);
    ctx.stroke();
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(trX + 40, trY + 16);
    ctx.lineTo(trX + 60, trY + 16);
    ctx.stroke();
    ctx.fillStyle = transistorOn ? '#10b981' : '#94a3b8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(transistorOn ? 'NPN 导通' : 'NPN 截止', trX + 30, trY + 46);
    ctx.fillText(`V_cc ${transistorOn ? '≥' : '<'} V_be`, trX + 30, trY + 58);

    // --- 路灯 ---
    const lampX2 = w * 0.06;
    const lampY2 = h * 0.78;

    // 灯杆
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    ctx.fillRect(lampX2 + 84, lampY2 + 40, 6, 80);
    // 灯罩
    ctx.beginPath();
    ctx.moveTo(lampX2 + 60, lampY2 + 40);
    ctx.lineTo(lampX2 + 120, lampY2 + 40);
    ctx.lineTo(lampX2 + 100, lampY2 + 22);
    ctx.lineTo(lampX2 + 80, lampY2 + 22);
    ctx.closePath();
    ctx.fillStyle = isDark ? '#64748b' : '#475569';
    ctx.fill();
    // 灯泡
    const bulbGrad = ctx.createRadialGradient(lampX2 + 90, lampY2 + 48, 4, lampX2 + 90, lampY2 + 48, 16);
    if (lampOn) {
        bulbGrad.addColorStop(0, '#ffffff');
        bulbGrad.addColorStop(0.5, '#fde68a');
        bulbGrad.addColorStop(1, '#fbbf24');
    } else {
        bulbGrad.addColorStop(0, '#64748b');
        bulbGrad.addColorStop(1, '#334155');
    }
    ctx.fillStyle = bulbGrad;
    ctx.beginPath();
    ctx.arc(lampX2 + 90, lampY2 + 48, 14, 0, Math.PI * 2);
    ctx.fill();
    // 灯光锥
    if (lampOn) {
        const lampGlow = ctx.createRadialGradient(lampX2 + 90, lampY2 + 50, 8, lampX2 + 90, lampY2 + 50, 80);
        lampGlow.addColorStop(0, 'rgba(251,191,36,0.6)');
        lampGlow.addColorStop(0.5, 'rgba(251,191,36,0.2)');
        lampGlow.addColorStop(1, 'rgba(251,191,36,0)');
        ctx.fillStyle = lampGlow;
        ctx.beginPath();
        ctx.moveTo(lampX2 + 80, lampY2 + 50);
        ctx.lineTo(lampX2 + 20, lampY2 + 130);
        ctx.lineTo(lampX2 + 160, lampY2 + 130);
        ctx.lineTo(lampX2 + 100, lampY2 + 50);
        ctx.closePath();
        ctx.fill();
    }

    // 路灯状态
    ctx.fillStyle = lampOn ? '#fbbf24' : '#94a3b8';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lampOn ? '路灯 ● 亮 (夜)' : '路灯 ○ 灭 (昼)', lampX2 + 90, lampY2 + 150);

    // --- 24h 光照度曲线 (右上) ---
    const chartX2 = w * 0.42;
    const chartY2 = 50;
    const chartW2 = w * 0.55;
    const chartH2 = h * 0.42;

    // 用简单的 sin 仿真白天正午照度高, 夜晚低
    // currentTime 直接模拟小时 (duration 单位 = h)
    const tHours = ((currentTime % 24) + 24) % 24;

    // 曲线
    const xs3: number[] = [];
    const ys3: number[] = [];
    for (let i = 0; i <= 48; i++) {
        const th = (i / 48) * 24;
        xs3.push(th);
        const lvl = Math.max(0.5, Math.max(0, Math.sin(((th - 6) / 24) * Math.PI * 2)) * 40000);
        ys3.push(lvl);
    }

    drawMiniChart({
        ctx,
        x: chartX2,
        y: chartY2,
        w: chartW2,
        h: chartH2,
        xs: xs3,
        ys: ys3,
        isDark,
        lineColor: '#fbbf24',
        label: '24h 照度曲线',
        xLabel: '时间 t (h)',
        yLabel: '照度 E (lx)',
        logY: true,
        fillUnder: 'rgba(251,191,36,0.1)'
    });

    // 阈值线
    const thrY2 =
        chartY2 +
        chartH2 -
        ((Math.log10(Math.max(0.5, threshold)) - Math.log10(0.5)) / (Math.log10(40000) - Math.log10(0.5))) * chartH2;
    if (thrY2 >= chartY2 && thrY2 <= chartY2 + chartH2) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(chartX2, thrY2);
        ctx.lineTo(chartX2 + chartW2, thrY2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ef4444';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`阈值=${threshold}lx`, chartX2 + chartW2 - 4, thrY2 - 2);
    }

    // 当前时刻点
    if (tHours >= 0 && tHours <= 24) {
        const px3 = chartX2 + (tHours / 24) * chartW2;
        const lvl = Math.max(0.5, Math.max(0, Math.sin(((tHours - 6) / 24) * Math.PI * 2)) * 40000);
        const py3 =
            chartY2 + chartH2 - ((Math.log10(lvl) - Math.log10(0.5)) / (Math.log10(40000) - Math.log10(0.5))) * chartH2;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(px3, py3, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // --- 逻辑指示 + LED (右下) ---
    const indY2 = h * 0.58;

    // LED 指示
    const aLedX = chartX2 + 30;
    const aLedY = indY2;
    const ledGrad2 = ctx.createRadialGradient(aLedX - 4, aLedY - 4, 2, aLedX, aLedY, 14);
    if (lampOn) {
        ledGrad2.addColorStop(0, '#fef3c7');
        ledGrad2.addColorStop(1, '#fbbf24');
    } else {
        ledGrad2.addColorStop(0, '#475569');
        ledGrad2.addColorStop(1, '#334155');
    }
    ctx.fillStyle = ledGrad2;
    ctx.beginPath();
    ctx.arc(aLedX, aLedY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lampOn ? '#fbbf24' : '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lampOn ? '灯亮' : '灯灭', aLedX, aLedY + 28);

    // 数值表
    const valX2 = chartX2 + chartW2 * 0.55;
    const valY2 = indY2 - 40;
    const valW = chartW2 * 0.42;
    const valH = 90;
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.7)';
    roundRectPath(ctx, valX2 - 4, valY2, valW + 8, valH, 6);
    ctx.fill();
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    const vRows = [
        `E = ${L.toFixed(2)} lx`,
        `R_LDR = ${Rldr >= 1e3 ? (Rldr / 1e3).toFixed(1) + ' kΩ' : Rldr.toFixed(0) + ' Ω'}`,
        `V_cc = ${Vcc.toFixed(3)} V`,
        `阈值 V_be = 0.7 V`,
        `输出 = ${lampOn ? '灯亮' : '灯灭'}`,
        `t = ${tHours.toFixed(1)} h`
    ];
    vRows.forEach((r, i) => {
        ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
        ctx.fillText(r, valX2, valY2 + 14 + i * 14);
    });

    // 照度滑杆
    const slidX2 = w * 0.42;
    const slidY2 = h * 0.78;
    const slidW2 = w * 0.55;
    ctx.fillStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.fillRect(slidX2, slidY2, slidW2, 6);
    // 对数填充
    const slidR2 = Math.max(
        0,
        Math.min(1, (Math.log10(Math.max(0.5, L)) - Math.log10(0.5)) / (Math.log10(1e5) - Math.log10(0.5)))
    );
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(slidX2, slidY2, slidR2 * slidW2, 6);
    // 刻度
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('0.5lx', slidX2, slidY2 - 4);
    ctx.textAlign = 'right';
    ctx.fillText('1e5lx', slidX2 + slidW2, slidY2 - 4);
    ctx.textAlign = 'center';
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`照度 E = ${L.toFixed(2)} lx  阈值 = ${threshold} lx`, slidX2 + slidW2 / 2, slidY2 + 22);

    // 公式
    const formY3 = h * 0.86;
    ctx.fillStyle = isDark ? '#cbd5e1' : '#1e293b';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('V_cc = E_supp · R_fix / (R_LDR + R_fix)', w * 0.5 + 60, formY3);
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText('LDR: 光照↑ → R↓ → V_cc↓ → 三极管截止 → 灯灭', w * 0.5 + 60, formY3 + 16);
    ctx.fillText('LDR: 光照↓ → R↑ → V_cc↑ → 三极管导通 → 灯亮', w * 0.5 + 60, formY3 + 30);

    // HUD
    drawHud(ctx, isDark, [
        { label: 'E', value: `${L.toFixed(2)} lx` },
        { label: 'R_LDR', value: `${Rldr >= 1e3 ? (Rldr / 1e3).toFixed(1) + ' k' : Rldr.toFixed(0)} Ω` },
        { label: 'R_fix', value: `${(Rfix / 1e3).toFixed(0)} kΩ` },
        { label: 'V_cc', value: `${Vcc.toFixed(3)} V` },
        { label: '阈值', value: `${threshold} lx` },
        { label: 't', value: `${currentTime.toFixed(1)} s` }
    ]);

    drawInfoBar(
        ctx,
        w,
        h,
        `Vcc=E·Rfix/(Rldr+Rfix)  E=${L}lx  Rldr=${Rldr >= 1e3 ? (Rldr / 1e3).toFixed(0) + 'k' : Rldr.toFixed(0)}  Vcc=${Vcc.toFixed(3)}V  阈值=${threshold}lx`,
        isDark
    );

    if (!simulationResult) drawEmptyState(ctx, w, h, isDark);
}

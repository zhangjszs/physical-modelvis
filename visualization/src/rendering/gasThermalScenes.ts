/**
 * 热学场景渲染模块 — 选必三 第二章 气体
 *
 * 场景列表：
 *   - drawGasLawScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import { getChart } from 'physics-core';
import { clearScene, drawTitle, drawInfoBar, mutedColor, textColor } from './renderingUtils';
import { gasLawProcessState, type GasLawMode } from '../utils/gasLawProcess';

export interface ThermalSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

const MODE_LABEL: Record<GasLawMode, string> = {
    0: '等温过程',
    1: '等压过程',
    2: '等容过程'
};

const MODE_FORMULA: Record<GasLawMode, string> = {
    0: 'pV = const (玻意耳定律)',
    1: 'V/T = const (盖-吕萨克定律)',
    2: 'p/T = const (查理定律)'
};

const MODE_COLOR: Record<GasLawMode, string> = {
    0: '#3b82f6',
    1: '#f59e0b',
    2: '#ef4444'
};

/** 2D 板书读数 — 单一真源: 引擎 maxValues + 引擎 charts + 共享过程插值 */
export interface GasLawReadouts {
    source: 'engine' | 'fallback';
    mode: GasLawMode;
    modeLabel: string;
    modeFormula: string;
    /** 引擎物质的量 (mol) */
    moles: number;
    /** 引擎气体常数 R (J/(mol·K)) */
    R: number;
    /** 当前体积 (L) */
    volume_L: number;
    /** 当前压强 (kPa) */
    pressure_kPa: number;
    /** 当前温度 (K) */
    temperature_K: number;
    /** 引擎初态 */
    initial: { volume_L: number; pressure_kPa: number; temperature_K: number };
    /** 引擎终态 */
    final: { volume_L: number; pressure_kPa: number; temperature_K: number };
    /** 压强是否取自引擎过程曲线 */
    pressureFromEngineCurve: boolean;
    /** 引擎过程曲线点数 (0 = 引擎没给曲线) */
    curvePoints: number;
    /** 横轴语义: 等容过程引擎曲线 x = 温度, 其余 x = 体积 */
    xIsTemperature: boolean;
}

export function gasLawReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    time: number
): GasLawReadouts {
    const state = gasLawProcessState(result, params, time);
    const chart = result ? getChart(result, 'gas-law', 'x_t') : undefined;
    return {
        source: state.source,
        mode: state.mode,
        modeLabel: MODE_LABEL[state.mode],
        modeFormula: MODE_FORMULA[state.mode],
        moles: state.moles,
        R: state.R,
        volume_L: state.volume_L,
        pressure_kPa: state.pressure_kPa,
        temperature_K: state.temperature_K,
        initial: state.initial,
        final: state.final,
        pressureFromEngineCurve: state.pressureFromEngineCurve,
        curvePoints: chart?.points.length ?? 0,
        xIsTemperature: state.mode === 2
    };
}

/**
 * 理想气体状态方程专属板书。
 *
 * 画面结构:
 *   - 左: 过程曲线 (引擎 x_t) + 初态/终态标记 + 当前状态动点;
 *   - 右: 气缸 + 活塞示意 (体积随过程变化) + 实时读数 + 状态条;
 *   - 底部: 过程结论信息条。
 *
 * 等容过程特别处理: 引擎过程曲线的 x 是**温度 T (K)** 而不是体积 (p-T 图),
 * 横轴标签与初末态坐标必须跟着换, 否则会出现「横轴标 V/L 却画的是 p-T 直线」。
 */
export function drawGasLawScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '理想气体状态方程 pV = nRT', w, isDark, { size: 18, y: 24 });

    const read = gasLawReadouts(params, simulationResult, currentTime);
    const color = MODE_COLOR[read.mode];

    // ===== 左: 过程曲线 (引擎 x_t) =====
    const chart = simulationResult ? getChart(simulationResult, 'gas-law', 'x_t') : undefined;
    const pts = chart?.points ?? [];

    const plotX = 58;
    const plotY = 56;
    const plotW = w * 0.44;
    const plotH = h - plotY - 128;

    // 横轴取值: 等容 → 温度 (K), 其余 → 体积 (L)
    const curX = read.xIsTemperature ? read.temperature_K : read.volume_L;
    const initX = read.xIsTemperature ? read.initial.temperature_K : read.initial.volume_L;
    const finalX = read.xIsTemperature ? read.final.temperature_K : read.final.volume_L;

    let xLo = Infinity;
    let xHi = -Infinity;
    let pLo = Infinity;
    let pHi = -Infinity;
    for (const pt of pts) {
        if (pt.x < xLo) xLo = pt.x;
        if (pt.x > xHi) xHi = pt.x;
        if (pt.y < pLo) pLo = pt.y;
        if (pt.y > pHi) pHi = pt.y;
    }
    xLo = Math.min(xLo, initX, curX);
    xHi = Math.max(xHi, finalX, curX);
    pLo = Math.min(pLo, read.pressure_kPa);
    pHi = Math.max(pHi, read.pressure_kPa);
    if (!Number.isFinite(xLo) || !Number.isFinite(pLo)) {
        xLo = 0;
        xHi = 1;
        pLo = 0;
        pHi = 1;
    }
    if (xHi - xLo < 1e-6) {
        xLo -= 1;
        xHi += 1;
    }
    if (pHi - pLo < 1e-6) {
        pLo -= 1;
        pHi += 1;
    }
    const xPad = (xHi - xLo) * 0.12;
    const pPad = (pHi - pLo) * 0.14;
    xLo -= xPad;
    xHi += xPad;
    pLo = Math.max(0, pLo - pPad);
    pHi += pPad;

    const VX = (x: number) => plotX + ((x - xLo) / (xHi - xLo)) * plotW;
    const PY = (p: number) => plotY + plotH - ((p - pLo) / (pHi - pLo)) * plotH;

    // 坐标轴
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.stroke();

    // 网格 + 纵轴刻度
    ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)';
    ctx.lineWidth = 1;
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
        const pv = pLo + ((pHi - pLo) / 4) * i;
        const gy = PY(pv);
        ctx.beginPath();
        ctx.moveTo(plotX, gy);
        ctx.lineTo(plotX + plotW, gy);
        ctx.stroke();
        ctx.fillText(pv.toFixed(0), plotX - 6, gy);
    }

    // 过程曲线 (引擎)
    if (pts.length >= 2) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        pts.forEach((pt, i) => {
            const px = VX(pt.x);
            const py = PY(pt.y);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();
    }

    // 初态 / 终态标记 (引擎 maxValues)
    const marker = (mx: number, my: number, label: string, dotColor: string): void => {
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(VX(mx), PY(my), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isDark ? '#0f172a' : '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = dotColor;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, VX(mx), PY(my) - 7);
    };
    marker(initX, read.initial.pressure_kPa, '初态', '#64748b');
    marker(finalX, read.final.pressure_kPa, '终态', color);

    // 当前状态动点 (演示过程)
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(VX(curX), PY(read.pressure_kPa), 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(VX(curX), PY(read.pressure_kPa), 5, 0, Math.PI * 2);
    ctx.fill();

    // 轴标题
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(read.xIsTemperature ? '温度 T (K)' : '体积 V (L)', plotX + plotW / 2, plotY + plotH + 18);
    ctx.save();
    ctx.translate(plotX - 40, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('压强 p (kPa)', 0, 0);
    ctx.restore();

    // 过程说明 (等容模式特别提示横轴换了)
    ctx.fillStyle = textColor(isDark);
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${read.modeLabel} · ${read.modeFormula}`, plotX, plotY + plotH + 30);
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '10px sans-serif';
    ctx.fillText(
        read.xIsTemperature ? '等容过程用 p–T 图 (V 恒定), 横轴为温度' : '等温/等压过程用 p–V 图, 横轴为体积',
        plotX,
        plotY + plotH + 46
    );

    // ===== 右: 气缸 + 活塞 + 读数 =====
    const colX = w * 0.55;
    const cylX = colX;
    const cylW = Math.min(130, w * 0.17);
    const cylTop = 96;
    const cylBot = h - 150;
    const cylH = Math.max(120, cylBot - cylTop);

    // 体积上限 → 活塞最高位置 (初态体积映射到 0.82 高度, 终态按比例)
    const vRef = Math.max(read.initial.volume_L, read.final.volume_L);
    const gasRatio = vRef > 0 ? read.volume_L / vRef : 0;
    const gasH = cylH * (0.12 + 0.7 * gasRatio);
    const pistonY = cylBot - gasH;

    // 气体颜色随温度
    const tSpan = Math.max(1e-6, read.final.temperature_K - read.initial.temperature_K);
    const tNorm = Math.max(0, Math.min(1, (read.temperature_K - read.initial.temperature_K) / tSpan));
    const gasR = Math.round(59 + tNorm * 180);
    const gasG = Math.round(130 - tNorm * 70);
    const gasB = Math.round(246 - tNorm * 180);

    // 气缸壁
    ctx.strokeStyle = isDark ? '#64748b' : '#475569';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cylX, cylTop);
    ctx.lineTo(cylX, cylBot);
    ctx.lineTo(cylX + cylW, cylBot);
    ctx.lineTo(cylX + cylW, cylTop);
    ctx.stroke();

    // 气体
    ctx.fillStyle = `rgb(${gasR},${gasG},${gasB})`;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(cylX + 2, pistonY, cylW - 4, gasH - 2);
    ctx.globalAlpha = 1;

    // 活塞
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.fillRect(cylX - 6, pistonY - 14, cylW + 12, 14);
    ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cylX - 6, pistonY - 14, cylW + 12, 14);

    // 压强箭头 (向下压活塞), 长度 ∝ p
    const pNorm = Math.max(0, Math.min(1, (read.pressure_kPa - pLo) / (pHi - pLo)));
    const arrowLen = 14 + pNorm * 44;
    ctx.strokeStyle = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
        const ax = cylX + cylW * (0.3 + k * 0.2);
        const ay0 = pistonY - 14 - arrowLen - 6;
        const ay1 = pistonY - 18;
        ctx.beginPath();
        ctx.moveTo(ax, ay0);
        ctx.lineTo(ax, ay1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax - 4, ay1 + 6);
        ctx.lineTo(ax, ay1);
        ctx.lineTo(ax + 4, ay1 + 6);
        ctx.closePath();
        ctx.fill();
    }

    // 读数文本
    const tx = cylX + cylW + 18;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '11px monospace';
    ctx.fillStyle = textColor(isDark);
    ctx.fillText(`n   = ${read.moles.toFixed(2)} mol`, tx, cylTop + 4);
    ctx.fillStyle = color;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(read.modeLabel, tx, cylTop + 24);
    ctx.font = '11px monospace';
    ctx.fillStyle = textColor(isDark);
    ctx.fillText(`p   = ${read.pressure_kPa.toFixed(1)} kPa`, tx, cylTop + 44);
    ctx.fillText(`V   = ${read.volume_L.toFixed(1)} L`, tx, cylTop + 62);
    ctx.fillText(`T   = ${read.temperature_K.toFixed(0)} K`, tx, cylTop + 80);
    ctx.font = '10px monospace';
    ctx.fillStyle = mutedColor(isDark);
    ctx.fillText(`pV  = ${(read.pressure_kPa * read.volume_L).toFixed(0)} J`, tx, cylTop + 104);
    ctx.fillText(`nRT = ${(read.moles * read.R * read.temperature_K).toFixed(0)} J`, tx, cylTop + 120);
    ctx.fillText(`R   = ${read.R.toFixed(3)} J/(mol·K)`, tx, cylTop + 136);

    // 初态 → 终态 提示
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '10px sans-serif';
    ctx.fillText(
        `初态 V=${read.initial.volume_L.toFixed(1)}L p=${read.initial.pressure_kPa.toFixed(1)}kPa T=${read.initial.temperature_K.toFixed(0)}K`,
        cylX,
        cylBot + 12
    );
    ctx.fillText(
        `终态 V=${read.final.volume_L.toFixed(1)}L p=${read.final.pressure_kPa.toFixed(1)}kPa T=${read.final.temperature_K.toFixed(0)}K`,
        cylX,
        cylBot + 27
    );

    // 状态条
    const barY = cylBot + 46;
    ctx.fillStyle = 'rgba(59,130,246,0.16)';
    ctx.fillRect(cylX, barY, w - cylX - 14, 20);
    ctx.fillStyle = color;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        read.mode === 0
            ? '等温压缩: V ↓ ⇒ p ↑ (pV = const)'
            : read.mode === 1
              ? '等压冷却: T ↓ ⇒ V ↓ (V/T = const)'
              : '等容冷却: T ↓ ⇒ p ↓ (p/T = const)',
        cylX + 6,
        barY + 10
    );

    // ===== 结论信息条 =====
    const info =
        read.mode === 0
            ? `等温过程: pV = 常数 —— 体积减半 (${read.initial.volume_L.toFixed(1)}L → ${read.final.volume_L.toFixed(1)}L), 压强翻倍 (${read.initial.pressure_kPa.toFixed(1)} → ${read.final.pressure_kPa.toFixed(1)} kPa), 温度不变`
            : read.mode === 1
              ? `等压过程: V/T = 常数 —— 压强不变 (${read.initial.pressure_kPa.toFixed(1)} kPa), 体积减半 ⇒ 温度减半 (${read.initial.temperature_K.toFixed(0)} → ${read.final.temperature_K.toFixed(0)} K)`
              : `等容过程: p/T = 常数 —— 体积不变 (${read.initial.volume_L.toFixed(1)}L), 温度减半 ⇒ 压强减半 (${read.initial.pressure_kPa.toFixed(1)} → ${read.final.pressure_kPa.toFixed(1)} kPa)`;
    drawInfoBar(ctx, w, h, info, isDark, { height: 24, yOffset: 30 });
}

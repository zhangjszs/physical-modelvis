/**
 * 热学场景渲染模块 — 选必三 第二章 气体
 *
 * 场景列表：
 *   - drawGasLawScene
 *
 * 设计原则：纯函数 + 屏幕坐标, 零依赖 React/Zustand/CoordinateTransformer
 */
import type { SimulationResult } from 'physics-core';
import { chartsOf } from 'physics-core';
import { GAS_CONSTANT_R } from './constants';
import { clearScene, drawTitle, drawHud, drawInfoBar, interpSeries } from './renderingUtils';

export interface ThermalSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

export function drawGasLawScene(o: ThermalSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = o;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '理想气体状态方程  pV = nRT', w, isDark, { size: 18, y: 28 });

    const n = params['n'] ?? 1;
    const modeNum = params['modeG'] ?? 0;
    const mode: 'isothermal' | 'isobaric' | 'isochoric' =
        modeNum === 1 ? 'isobaric' : modeNum === 2 ? 'isochoric' : 'isothermal';
    const p0 = params['p0'] ?? 101.3; // kPa
    const V0 = params['V0'] ?? 22.4; // L
    const T0 = params['T0'] ?? 273.15; // K
    const mvGas = simulationResult?.diagnostics?.maxValues as
        { R?: number; finalPressurePa?: number; finalVolumeM3?: number; finalTemperatureK?: number } | undefined;
    /**
     * 气体常数 R: 优先读引擎 maxValues.R (真源 PHYSICS_CONSTANTS.R, 教材口径 8.314);
     * 旧渲染独用的 GAS_CONSTANT_R=8.314 为另一处独立定义、与引擎同值无差,
     * 本批结构上归一到引擎单一来源; 无引擎结果回退旧定义。
     */
    const engR = mvGas?.R;
    const R = typeof engR === 'number' && Number.isFinite(engR) && engR > 0 ? engR : GAS_CONSTANT_R;

    const modeLabel = mode === 'isothermal' ? '等温过程' : mode === 'isobaric' ? '等压过程' : '等容过程';
    const modeColor = mode === 'isothermal' ? '#3b82f6' : mode === 'isobaric' ? '#f59e0b' : '#ef4444';

    // 过程变量取值范围
    const Vmin = V0 * 0.4;
    const Vmax = V0 * 1.6;
    const Tmin = T0 * 0.5;
    const Tmax = T0 * 1.5;

    // 动画相位 0..1 (演示 sweep, 非引擎时间 — 相位本身为示意, 相位处的物理量取自引擎)
    const phase = Math.sin(currentTime * 1.2) * 0.5 + 0.5;

    /**
     * 过程曲线消费引擎 (#65 · B 局部): 引擎 gas-law 模型 x_t 即过程曲线
     * (等温/等压: x=V(L)/y=p(kPa), 与本画布坐标同单位; 等容: x=T(K)/y=p(kPa))。
     * 无引擎结果回退旧自算采样。
     */
    const engCharts = simulationResult ? chartsOf(simulationResult, 'gas-law') : undefined;
    const engCurve = engCharts?.x_t;
    const hasEngCurve = !!engCurve && engCurve.points.length >= 2;

    // 当前状态点 (V_m, P_m, T_m): V/T 沿演示 sweep 窗取值, P 由引擎曲线插值;
    // 等温 T 取输入回显 (读 param 即等价, D24), 等压/等容 T 由状态方程/相位给出。
    let Vm: number, Pm: number, Tm: number;
    if (hasEngCurve && engCurve) {
        if (mode === 'isothermal') {
            Vm = Vmin + phase * (Vmax - Vmin);
            const pEng = interpSeries(engCurve, Vm);
            Pm = Number.isFinite(pEng) ? pEng : (p0 * V0) / Vm;
            Tm = T0;
        } else if (mode === 'isobaric') {
            Vm = Vmin + phase * (Vmax - Vmin);
            const pEng = interpSeries(engCurve, Vm);
            Pm = Number.isFinite(pEng) ? pEng : p0;
            Tm = (Pm * Vm) / (n * R);
        } else {
            Tm = Tmin + phase * (Tmax - Tmin);
            Vm = V0;
            const pEng = interpSeries(engCurve, Tm);
            Pm = Number.isFinite(pEng) ? pEng : (p0 * Tm) / T0;
        }
    } else if (mode === 'isothermal') {
        Vm = Vmin + phase * (Vmax - Vmin);
        Pm = (p0 * V0) / Vm;
        Tm = (Pm * Vm) / (n * R);
    } else if (mode === 'isobaric') {
        Vm = Vmin + phase * (Vmax - Vmin);
        Pm = p0;
        Tm = (Pm * Vm) / (n * R);
    } else {
        Tm = Tmin + phase * (Tmax - Tmin);
        Vm = V0;
        Pm = (p0 * Tm) / T0;
    }

    // 采样过程曲线
    const curve: Array<{ V: number; P: number }> = [];
    if (hasEngCurve && engCurve) {
        if (mode === 'isochoric') {
            // 引擎等容曲线 x=T(K): 取画布 T 窗内采样点, V 恒 V0 (P-V 图上为垂直线)
            for (const pt of engCurve.points) {
                if (pt.x >= Tmin && pt.x <= Tmax) curve.push({ V: V0, P: pt.y });
            }
        } else {
            // 等温/等压: 引擎点 x=V(L)/y=p(kPa) 与画布同单位, 整条采用
            for (const pt of engCurve.points) curve.push({ V: pt.x, P: pt.y });
        }
    }
    if (curve.length < 2) {
        curve.length = 0;
        const N = 64;
        for (let i = 0; i <= N; i++) {
            const t = i / N;
            if (mode === 'isothermal') {
                const V = Vmin + t * (Vmax - Vmin);
                curve.push({ V, P: (p0 * V0) / V });
            } else if (mode === 'isobaric') {
                const V = Vmin + t * (Vmax - Vmin);
                curve.push({ V, P: p0 });
            } else {
                const T = Tmin + t * (Tmax - Tmin);
                curve.push({ V: V0, P: (p0 * T) / T0 });
            }
        }
    }

    // 轴范围 (含当前点), 带边距
    let pLo = Infinity;
    let pHi = -Infinity;
    let vLo = Infinity;
    let vHi = -Infinity;
    for (const pt of curve) {
        if (pt.P < pLo) pLo = pt.P;
        if (pt.P > pHi) pHi = pt.P;
        if (pt.V < vLo) vLo = pt.V;
        if (pt.V > vHi) vHi = pt.V;
    }
    pLo = Math.min(pLo, Pm);
    pHi = Math.max(pHi, Pm);
    vLo = Math.min(vLo, Vm);
    vHi = Math.max(vHi, Vm);
    if (pHi - pLo < 1e-6) {
        pLo -= 1;
        pHi += 1;
    }
    if (vHi - vLo < 1e-6) {
        vLo -= 1;
        vHi += 1;
    }
    const pMargin = (pHi - pLo) * 0.15;
    const vMargin = (vHi - vLo) * 0.15;
    pLo -= pMargin;
    pHi += pMargin;
    vLo -= vMargin;
    vHi += vMargin;

    // ===== 左侧 P–V 图 =====
    const plotX = 64;
    const plotY = 64;
    const plotW = w * 0.5 - 30;
    const plotH = h - 150;
    const VX = (V: number) => plotX + ((V - vLo) / (vHi - vLo)) * plotW;
    const PY = (P: number) => plotY + plotH - ((P - pLo) / (pHi - pLo)) * plotH;

    // 坐标轴
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.stroke();

    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('V / L', plotX + plotW / 2, plotY + plotH + 26);
    ctx.save();
    ctx.translate(plotX - 38, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('p / kPa', 0, 0);
    ctx.restore();
    ctx.textAlign = 'left';

    // 曲线
    ctx.strokeStyle = modeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    curve.forEach((pt, i) => {
        const x = VX(pt.V);
        const y = PY(pt.P);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 当前状态动点
    const mx = VX(Vm);
    const my = PY(Pm);
    ctx.fillStyle = modeColor;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(mx, my, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(mx, my, 5, 0, Math.PI * 2);
    ctx.fill();

    // ===== 右侧气缸 + 活塞 =====
    const cylX = w * 0.64;
    const cylW = 130;
    const cylTop = 70;
    const cylBot = h - 96;
    const cylH = cylBot - cylTop;

    // 气体温度归一 (用于颜色)
    const tNorm = Math.max(0, Math.min(1, (Tm - Tmin) / (Tmax - Tmin)));
    const gasR = Math.round(59 + tNorm * 180);
    const gasG = Math.round(130 - tNorm * 70);
    const gasB = Math.round(246 - tNorm * 180);
    const gasColor = `rgb(${gasR},${gasG},${gasB})`;

    // 气体高度 ∝ Vm
    const vNorm = Math.max(0, Math.min(1, (Vm - Vmin) / (Vmax - Vmin)));
    const gasH = cylH * (0.18 + 0.74 * vNorm);
    const pistonY = cylBot - gasH;

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
    ctx.fillStyle = gasColor;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(cylX + 2, pistonY, cylW - 4, gasH - 2);
    ctx.globalAlpha = 1;

    // 活塞
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.fillRect(cylX - 6, pistonY - 14, cylW + 12, 14);
    ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cylX - 6, pistonY - 14, cylW + 12, 14);

    // 压强箭头 (向下压活塞), 长度 ∝ p
    const pNorm = Math.max(0, Math.min(1, (Pm - pLo) / (pHi - pLo)));
    const arrowLen = 12 + pNorm * 40;
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

    // 右侧状态文本
    const txtX = cylX + cylW + 26;
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`n    = ${n.toFixed(2)} mol`, txtX, cylTop + 10);
    ctx.fillStyle = modeColor;
    ctx.fillText(modeLabel, txtX, cylTop + 32);
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.fillText(`p    = ${Pm.toFixed(1)} kPa`, txtX, cylTop + 54);
    ctx.fillText(`V    = ${Vm.toFixed(1)} L`, txtX, cylTop + 74);
    ctx.fillText(`T    = ${Tm.toFixed(0)} K`, txtX, cylTop + 94);
    ctx.font = '11px monospace';
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    const lhs = Pm * Vm;
    const rhs = n * R * Tm;
    ctx.fillText(`pV   = ${lhs.toFixed(0)} J`, txtX, cylTop + 120);
    ctx.fillText(`nRT  = ${rhs.toFixed(0)} J`, txtX, cylTop + 138);

    // HUD (左上): 初始条件
    drawHud(
        ctx,
        isDark,
        [
            { label: 'n', value: `${n.toFixed(2)} mol` },
            { label: 'mode', value: `${modeNum}` },
            { label: 'p₀', value: `${p0.toFixed(1)} kPa` },
            { label: 'V₀', value: `${V0.toFixed(1)} L` },
            { label: 'T₀', value: `${T0.toFixed(0)} K` }
        ],
        { boxW: 200, lineH: 16 }
    );

    // 信息条
    const info =
        mode === 'isothermal'
            ? '等温: pV = 常数, 体积增大则压强减小'
            : mode === 'isobaric'
              ? '等压: V/T = 常数, 温度升高则体积膨胀 (盖-吕萨克定律)'
              : '等容: p/T = 常数, 温度升高则压强增大 (查理定律)';
    drawInfoBar(ctx, w, h, info, isDark, { height: 22, yOffset: 34 });
}

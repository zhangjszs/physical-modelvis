/**
 * 光电效应 2D 专属板书 — 爱因斯坦光电方程 hν = W₀ + e·U_c
 *
 * 背景 (#159 逐节审计 · 批次 F-2 光电效应):
 *   旧板书 (`waveParticleDualityScenes.drawPhotoelectricScene`) 有四个问题:
 *   1. 纵轴上限 K_max 由渲染层自算 `h·ν_max − W₀`, 而绘图域比引擎采样域多出
 *      `ν_max + 100 THz` —— 引擎曲线的真实右端画不到绘图右缘, 直线与坐标轴错位;
 *   2. 引擎 charts 的 `x_t` 通道 (截止电压 U_c–ν 直线) **完全没有被画出来**,
 *      而「截止电压随频率线性」正是这个实验要演示的第二个结论;
 *   3. 读引擎 maxValues 时用了 `as { thresholdFrequency_THz?: number }` 双重强转,
 *      绕开了类型化访问层 (项目硬约定: 读引擎结果必须走类型化层);
 *   4. 画面只有一根直线 + 一条阈值线, 看不出「光电管 / 光电流」,
 *      也没给出本实验最关键的结论:
 *      光强只影响光电流**大小**, 不影响光电子最大初动能 E_k。
 *
 * 本模块的单一真源:
 *   - 曲线走 `getChart(result, 'photoelectric', 'x_t' | 'y_t')`;
 *   - 标量读数走引擎 `diagnostics.maxValues`
 *     (workFunction_eV / thresholdFrequency_THz / h / e / h_over_e / slope_dUc_dnu);
 *   - 演示时钟 (时间 → 当前频率) 走 `utils/photoelectricSweep`;
 *   - 无引擎结果时才按 hν = W₀ + E_k 兜底 (防御空结果, 不崩)。
 */
import type { ChartSeries, SimulationResult } from 'physics-core';
import { getChart, PHYSICS_CONSTANTS } from 'physics-core';
import { COLORS, clearScene, drawInfoBar, drawMiniChart, drawTitle, mutedColor, textColor } from './renderingUtils';
import { H_EV_PER_THZ, photoelectricSweep } from '../utils/photoelectricSweep';

export interface PhotoelectricSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

/** 引擎 maxValues 取值 (Record<string, number> → number | undefined) */
function engValue(result: SimulationResult | null | undefined, key: string): number | undefined {
    const v = result?.diagnostics?.maxValues?.[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** 引擎 chart (键名受 chart-registry 编译期约束) */
function chartOf(result: SimulationResult | null | undefined, key: 'x_t' | 'y_t'): ChartSeries | undefined {
    return result ? getChart(result, 'photoelectric', key) : undefined;
}

/** 2D 板书读数 — 单一真源: 引擎 maxValues + 引擎 charts */
export interface PhotoelectricReadouts {
    source: 'engine' | 'fallback';
    /** 逸出功 W₀ (eV) */
    workFunction_eV: number;
    /** 极限频率 (红限) ν₀ (THz) */
    thresholdFrequency_THz: number;
    /** 普朗克常量 h (J·s) */
    h: number;
    /** 元电荷 e (C) */
    e: number;
    /** h/e (V·s) —— U_c–ν 直线斜率 */
    hOverE: number;
    /** dU_c/dν (V/THz) */
    slopeDUcDnu: number;
    /** 当前入射频率 (THz, 演示时钟映射) */
    nu: number;
    /** 扫描区间 (THz) */
    nuMin: number;
    nuMax: number;
    /** 光子能量 hν (eV) */
    hNu_eV: number;
    /** 光电子最大初动能 E_k (eV) —— 引擎 E_k–ν 曲线插值 */
    maxKinetic_eV: number;
    /** 截止电压 U_c (V) —— 引擎 U_c–ν 曲线插值 */
    cutoffVoltage_V: number;
    /** 是否发生光电效应 (ν > ν₀) */
    emitting: boolean;
    /** 引擎 E_k–ν 曲线点数 (0 = 引擎没给曲线) */
    ekCurvePoints: number;
    /** 引擎 U_c–ν 曲线点数 */
    ucCurvePoints: number;
}

export function photoelectricReadouts(
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    time: number
): PhotoelectricReadouts {
    const sweep = photoelectricSweep(params, time);

    const engW0 = engValue(result, 'workFunction_eV');
    const engNu0 = engValue(result, 'thresholdFrequency_THz');
    const engH = engValue(result, 'h');
    const engE = engValue(result, 'e');
    const engHOverE = engValue(result, 'h_over_e');
    const engSlope = engValue(result, 'slope_dUc_dnu');

    const workFunction_eV = engW0 ?? params['W0'] ?? 2.3;
    const thresholdFrequency_THz = engNu0 ?? workFunction_eV / H_EV_PER_THZ;
    const h = engH ?? PHYSICS_CONSTANTS.h.value;
    const e = engE ?? PHYSICS_CONSTANTS.e.value;
    const hOverE = engHOverE ?? h / e;
    const slopeDUcDnu = engSlope ?? (h / e) * 1e-12;

    const ekChart = chartOf(result, 'y_t');
    const ucChart = chartOf(result, 'x_t');

    // E_k / U_c 走引擎曲线插值; 引擎无曲线时按 hν = W₀ + E_k 兜底
    const interp = (chart: ChartSeries | undefined, nu: number): number | undefined => {
        if (!chart || chart.points.length === 0) return undefined;
        const pts = chart.points;
        const first = pts[0];
        const last = pts[pts.length - 1];
        if (!first || !last) return undefined;
        if (nu <= first.x) return first.y;
        if (nu >= last.x) return last.y;
        for (let i = 1; i < pts.length; i++) {
            const p = pts[i];
            if (!p) continue;
            if (nu <= p.x) {
                const prev = pts[i - 1];
                if (!prev) return p.y;
                const span = p.x - prev.x;
                if (span <= 1e-12) return p.y;
                return prev.y + ((p.y - prev.y) * (nu - prev.x)) / span;
            }
        }
        return last.y;
    };

    // 引擎语义: ν < ν₀ 时「截止电压不存在」, 曲线里根本没有这一段点 ⇒ 此处取 0。
    // (引擎曲线只保留 ν ≥ ν₀ 的采样点, 且首点是网格上最接近 ν₀ 的样本, 其 E_k 略大于 0。)
    const belowThreshold = sweep.nu <= thresholdFrequency_THz;
    const fallbackEk = Math.max(0, H_EV_PER_THZ * sweep.nu - workFunction_eV);
    const maxKinetic_eV = belowThreshold ? 0 : (interp(ekChart, sweep.nu) ?? fallbackEk);
    const cutoffVoltage_V = belowThreshold ? 0 : (interp(ucChart, sweep.nu) ?? Math.max(0, maxKinetic_eV));
    const hNu_eV = (h * sweep.nu * 1e12) / e;

    return {
        source: engNu0 !== undefined && engW0 !== undefined ? 'engine' : 'fallback',
        workFunction_eV,
        thresholdFrequency_THz,
        h,
        e,
        hOverE,
        slopeDUcDnu,
        nu: sweep.nu,
        nuMin: sweep.nuMin,
        nuMax: sweep.nuMax,
        hNu_eV,
        maxKinetic_eV,
        cutoffVoltage_V,
        emitting: sweep.nu > thresholdFrequency_THz,
        ekCurvePoints: ekChart?.points.length ?? 0,
        ucCurvePoints: ucChart?.points.length ?? 0
    };
}

/**
 * 光电效应专属板书。
 *
 * 画面结构:
 *   - 左: E_k–ν 主图 (引擎 y_t) + 红限 ν₀ 阈值线 + 当前工作点 + 斜率 h/e 标注;
 *   - 右上: U_c–ν 小图 (引擎 x_t) —— 截止电压随频率线性 (普朗克常量测定);
 *   - 右下: 光电管示意 (光源 → 阴极 K → 阳极 A) + 实时读数;
 *   - 底部: 实验结论信息条。
 */
export function drawPhotoelectricScene(opts: PhotoelectricSceneOptions): void {
    const { ctx, width: w, height: h, isDark, params, simulationResult, currentTime } = opts;
    clearScene(ctx, w, h, isDark);
    drawTitle(ctx, '光电效应 — 爱因斯坦方程 hν = W₀ + e·U_c', w, isDark, { size: 18, y: 24 });

    const read = photoelectricReadouts(params, simulationResult, currentTime);

    // ===== 版面 (画布高度随舞台自适应, 全部按比例推导) =====
    const plotX = 56;
    const plotY = 46;
    const plotW = Math.max(220, w * 0.37);
    const plotH = Math.max(160, h - plotY - 118);
    const plotBottom = plotY + plotH;

    const colX = Math.max(plotX + plotW + 20, w * 0.46);
    const colW = w - colX - 14;

    // ===== 左: E_k–ν 主图 (引擎 y_t) =====
    const nu0 = read.thresholdFrequency_THz;
    const nuMax = Math.max(read.nuMax, nu0 + 1);
    const ekMax = Math.max(0.1, H_EV_PER_THZ * nuMax - read.workFunction_eV);
    // 左侧留出 25% 量程画「ν < ν₀ 无光电子」区 (红限之前没有光电子)
    const fLeft = nu0 - (nuMax - nu0) * 0.25;
    const fRight = nuMax + (nuMax - nu0) * 0.03;
    const kTop = ekMax * 1.12;

    const fToX = (f: number) => plotX + ((f - fLeft) / (fRight - fLeft)) * plotW;
    const kToY = (k: number) => plotY + plotH - (k / kTop) * plotH;

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
        const kv = (kTop / 4) * i;
        const gy = kToY(kv);
        ctx.beginPath();
        ctx.moveTo(plotX, gy);
        ctx.lineTo(plotX + plotW, gy);
        ctx.stroke();
        ctx.fillText(kv.toFixed(1), plotX - 6, gy);
    }

    // ν < ν₀ 区域底色 (无光电子)
    const x0 = fToX(nu0);
    const noEmitW = Math.max(0, x0 - plotX);
    ctx.fillStyle = isDark ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.07)';
    ctx.fillRect(plotX, plotY, noEmitW, plotH);
    ctx.fillStyle = COLORS.RED;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('ν < ν₀', plotX + noEmitW / 2, plotY + 6);
    ctx.fillText('无光电子', plotX + noEmitW / 2, plotY + 19);

    // 红限阈值线 ν₀ (引擎 thresholdFrequency_THz)
    ctx.strokeStyle = COLORS.RED;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x0, plotY);
    ctx.lineTo(x0, plotY + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.RED;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`ν₀ = ${nu0.toFixed(0)} THz`, x0 + 4, plotY + 12);

    // E_k–ν 直线 (引擎 y_t)
    const ekChart = chartOf(simulationResult, 'y_t');
    ctx.strokeStyle = COLORS.GREEN;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (ekChart && ekChart.points.length >= 2) {
        ekChart.points.forEach((p, idx) => {
            const px = fToX(p.x);
            const py = kToY(p.y);
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
    } else {
        ctx.moveTo(fToX(nu0), kToY(0));
        ctx.lineTo(fToX(nuMax), kToY(ekMax));
    }
    ctx.stroke();

    // 当前工作点 (演示时钟扫频位置, E_k 取引擎曲线插值)
    const wpX = fToX(read.nu);
    const wpY = kToY(read.maxKinetic_eV);
    ctx.fillStyle = read.emitting ? COLORS.AMBER : COLORS.RED;
    ctx.beginPath();
    ctx.arc(wpX, wpY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#0f172a' : '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 坐标轴标题
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('入射光频率 ν (THz)', plotX + plotW / 2, plotBottom + 16);
    ctx.save();
    ctx.translate(plotX - 40, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('最大初动能 E_k (eV)', 0, 0);
    ctx.restore();

    // 参数行 (W₀ / ν₀ 读引擎) + 斜率说明 (h/e 读引擎)
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = textColor(isDark);
    ctx.fillText(
        `W₀ = ${read.workFunction_eV.toFixed(2)} eV    ν₀ = ${nu0.toFixed(0)} THz (红限)`,
        plotX,
        plotBottom + 30
    );
    ctx.fillStyle = mutedColor(isDark);
    ctx.fillText(`斜率 h/e = ${read.hOverE.toExponential(3)} V·s (普朗克常量测定)`, plotX, plotBottom + 44);

    // ===== 右上: U_c–ν 小图 (引擎 x_t) =====
    ctx.fillStyle = textColor(isDark);
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('截止电压 U_c–ν 直线 (eU_c = hν − W₀)', colX, 40);

    const ucChart = chartOf(simulationResult, 'x_t');
    const ucXs = ucChart?.points.map(p => p.x) ?? [];
    const ucYs = ucChart?.points.map(p => p.y) ?? [];
    const miniY = 50;
    const miniH = Math.max(90, Math.min(220, plotH * 0.4));
    drawMiniChart({
        ctx,
        x: colX,
        y: miniY,
        w: colW,
        h: miniH,
        xs: ucXs,
        ys: ucYs,
        isDark,
        lineColor: COLORS.ORANGE,
        clampYZero: true,
        xLabel: '频率 ν (THz)',
        yLabel: 'U_c (V)'
    });

    // ===== 右中: 光电管示意 + 读数 =====
    const tubeY = miniY + miniH + 34;
    const tubeH = Math.max(70, Math.min(180, plotH * 0.3));
    const axisY = tubeY + tubeH * 0.42;

    // 暗箱光源
    ctx.fillStyle = isDark ? '#334155' : '#475569';
    ctx.fillRect(colX, axisY - 13, 22, 26);
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('单色光源', colX + 11, axisY + 16);

    // 玻璃泡
    ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(colX + 62, axisY, 25, 0, Math.PI * 2);
    ctx.stroke();

    // 入射光束
    ctx.strokeStyle = COLORS.AMBER;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(colX + 22, axisY);
    ctx.lineTo(colX + 82, axisY);
    ctx.stroke();

    // 阴极 K (受光面) + 阳极 A (收集环)
    ctx.fillStyle = '#d97706';
    ctx.fillRect(colX + 80, axisY - 20, 5, 40);
    ctx.strokeStyle = COLORS.CYAN;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(colX + 58, axisY, 7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('A 阳极', colX + 58, axisY - 28);
    ctx.fillText('K 阴极', colX + 82, axisY - 28);

    // 光电子 (ν > ν₀ 时从 K 飞向 A)
    if (read.emitting) {
        const phase = (currentTime * 1.4) % 1;
        const ex = colX + 78 - phase * 16;
        ctx.fillStyle = COLORS.CYAN;
        ctx.beginPath();
        ctx.arc(ex, axisY, 3.2, 0, Math.PI * 2);
        ctx.fill();
    }

    // 读数文本
    const tx = colX + 100;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '11px monospace';
    ctx.fillStyle = textColor(isDark);
    ctx.fillText(`ν  = ${read.nu.toFixed(0)} THz`, tx, tubeY);
    ctx.fillText(`hν = ${read.hNu_eV.toFixed(2)} eV`, tx, tubeY + 13);
    ctx.fillStyle = read.emitting ? COLORS.GREEN : COLORS.RED;
    ctx.fillText(`E_k= ${read.maxKinetic_eV.toFixed(2)} eV`, tx, tubeY + 26);
    ctx.fillText(`U_c= ${read.cutoffVoltage_V.toFixed(2)} V`, tx, tubeY + 39);
    ctx.fillStyle = textColor(isDark);
    ctx.fillText(`W₀ = ${read.workFunction_eV.toFixed(2)} eV`, tx, tubeY + 52);
    ctx.fillText(`ν₀ = ${nu0.toFixed(0)} THz`, tx, tubeY + 65);

    // 状态条
    const barY = tubeY + tubeH + 4;
    ctx.fillStyle = read.emitting ? 'rgba(34,197,94,0.16)' : 'rgba(239,68,68,0.16)';
    ctx.fillRect(colX, barY, colW, 20);
    ctx.fillStyle = read.emitting ? '#059669' : '#dc2626';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        read.emitting ? 'ν > ν₀：光电子逸出 → 光电流 I > 0' : 'ν < ν₀：无光电流（增大光强也无用）',
        colX + 6,
        barY + 10
    );

    // ===== 右下: 光强 → 光电流 (同 ν 下光强只改电流大小) =====
    const lightY = barY + 28;
    const lightH = Math.max(60, plotBottom - lightY);
    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.65)';
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.4)' : 'rgba(100,116,139,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(colX, lightY, colW, lightH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor(isDark);
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('同一频率下: 光强 ↑ ⇒ 光电流 ↑，但 E_k 不变', colX + 8, lightY + 6);

    // 两束不同强度的光 → 两根不同高度的光电流柱
    const rayX = colX + 14;
    const tubeBoxX = colX + 92;
    const barBase = lightY + lightH - 14;
    const barMax = lightH - 42;
    const rays: Array<{ y: number; width: number; label: string; amp: number }> = [
        { y: lightY + 32, width: 1.5, label: '弱光', amp: 0.45 },
        { y: lightY + 52, width: 3.5, label: '强光', amp: 1 }
    ];
    rays.forEach((ray, i) => {
        ctx.strokeStyle = COLORS.AMBER;
        ctx.lineWidth = ray.width;
        ctx.beginPath();
        ctx.moveTo(rayX, ray.y);
        ctx.lineTo(tubeBoxX, ray.y);
        ctx.stroke();
        ctx.fillStyle = mutedColor(isDark);
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ray.label, rayX - 2, ray.y - 6);

        // 光电流柱
        const bh = barMax * ray.amp;
        ctx.fillStyle = i === 0 ? '#38bdf8' : '#0ea5e9';
        ctx.fillRect(tubeBoxX + 34 + i * 30, barBase - bh, 20, bh);
        ctx.fillStyle = textColor(isDark);
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(i === 0 ? 'I₁' : 'I₂', tubeBoxX + 44 + i * 30, barBase + 2);
    });
    // 光电管方块
    ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tubeBoxX - 4, lightY + 24, 16, 34);
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('光电管', tubeBoxX + 4, lightY + 60);

    // ===== 结论信息条 =====
    const info = read.emitting
        ? `ν = ${read.nu.toFixed(0)} THz > ν₀ = ${nu0.toFixed(0)} THz：发生光电效应，E_k = ${read.maxKinetic_eV.toFixed(2)} eV，U_c = ${read.cutoffVoltage_V.toFixed(2)} V（光强只改光电流大小，不改 E_k）`
        : `ν = ${read.nu.toFixed(0)} THz < ν₀ = ${nu0.toFixed(0)} THz：频率低于红限，不发生光电效应 —— 增大光强也无光电流`;
    drawInfoBar(ctx, w, h, info, isDark, { height: 22, yOffset: 26 });
}

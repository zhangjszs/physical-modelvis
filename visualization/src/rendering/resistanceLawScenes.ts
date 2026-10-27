/**
 * 电阻定律 2D 专属板书 — R = ρ·L/S 的控制变量实验
 *
 * 背景 (#159 逐节审计 · 批次 E'' 电阻定律):
 *   旧板书 (`electricCircuitScenes.drawResistanceLawScene`) 只画一根导线 + 三行读数,
 *   引擎产出的 6 条 charts (语义上 3 条: R_L / R_invS / R_material) **一条都没画** ——
 *   而这三条曲线正是这个实验要演示的结论:
 *     - 固定 d 与材料 → R-L 直线 (斜率 = ρ/S);
 *     - 固定 L 与材料 → R-1/S 直线 (斜率 = ρ·L);
 *     - 固定 L 与 S   → 材料电阻率越大, 电阻越大。
 *   画面上看不到任何一条, 「控制变量法探究三因素」这个实验的落点完全缺席。
 *
 *   同时旧板书内联了一份材料电阻率 (铁档用 2.82e-8, 实为铝值) 与引擎
 *   RESISTIVITY.Fe = 1.0e-7 不一致 —— 无引擎结果时铁档电阻偏小约 3.5 倍。
 *
 * 本模块的单一真源:
 *   - 曲线数据走 `getChart(result, 'resistance-law', 'R_L' | 'R_invS' | 'R_material')`;
 *   - 标量读数走引擎 `diagnostics.maxValues` (resistivity / crossSection /
 *     baseResistance / slope_R_L / slope_R_invS / rCu / rFe / rNichrome);
 *   - 无引擎结果时才按 RESISTIVITY + 解析式兜底。
 */
import type { ChartSeries, SimulationResult } from 'physics-core';
import { getChart, RESISTIVITY } from 'physics-core';
import {
    COLORS,
    clamp,
    clearScene,
    drawArrow,
    drawHud,
    drawInfoBar,
    drawMiniChart,
    drawTitle,
    mutedColor,
    textColor
} from './renderingUtils';

export interface ResistanceLawSceneOptions {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    isDark: boolean;
    params: Record<string, number>;
    simulationResult: SimulationResult | null;
    currentTime: number;
}

/** 场景参数 material 索引 → 引擎材料键 */
const MATERIAL_KEYS = ['Cu', 'Fe', 'Nichrome'] as const;
type MaterialKey = (typeof MATERIAL_KEYS)[number];

const MATERIAL_NAMES: Record<MaterialKey, string> = { Cu: '铜', Fe: '铁', Nichrome: '镍铬' };

/** 取引擎 chart (无引擎结果时返回 undefined) —— 键名受 chart-registry 编译期约束 */
function chartOf(
    result: SimulationResult | null | undefined,
    key: 'R_L' | 'R_invS' | 'R_material'
): ChartSeries | undefined {
    return result ? getChart(result, 'resistance-law', key) : undefined;
}

/** 电阻读数的有效数字格式 (R₀ 常在 10⁻³ ~ 10¹ 量级, 固定两位小数会把 0.0214 写成 0.02) */
export function formatResistanceValue(r: number): string {
    if (!Number.isFinite(r)) return '—';
    const abs = Math.abs(r);
    if (abs >= 1000 || (abs > 0 && abs < 0.01)) return r.toExponential(2);
    if (abs >= 100) return r.toFixed(1);
    if (abs >= 10) return r.toFixed(2);
    return r.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

/** 2D 板书读数 — 单一真源: 引擎 maxValues + 引擎 charts */
export interface ResistanceLawReadouts {
    source: 'engine' | 'fallback';
    /** 导线长度 L (m) */
    L: number;
    /** 导线直径 d (mm) */
    dMm: number;
    /** 材料键 */
    material: MaterialKey;
    /** 材料中文名 */
    materialName: string;
    /** 电阻率 ρ (Ω·m) */
    rho: number;
    /** 横截面积 S (m²) */
    area: number;
    /** 基准电阻 R₀ (Ω) */
    R: number;
    /** R-L 斜率 ρ/S (Ω/m) */
    slopeRL: number;
    /** R-1/S 斜率 ρ·L (Ω·m²) */
    slopeInvS: number;
    /** 三种材料在当前 L、S 下的电阻 (Ω) */
    rCu: number;
    rFe: number;
    rNichrome: number;
    /** R-L 曲线点数 (0 = 引擎没给曲线) */
    curveRLPoints: number;
    /** R-1/S 曲线点数 */
    curveInvSPoints: number;
    /** 材料对比曲线点数 */
    curveMaterialPoints: number;
}

export function resistanceLawReadouts(
    params: Record<string, number>,
    result?: SimulationResult | null
): ResistanceLawReadouts {
    const L = params['length'] ?? 1;
    const dMm = params['diameter'] ?? 1;
    const matIdx = Math.round(params['material'] ?? 0);
    const material: MaterialKey = MATERIAL_KEYS[clamp(matIdx, 0, MATERIAL_KEYS.length - 1)]!;

    const mv = result?.diagnostics?.maxValues;
    const eng = (key: string): number | undefined => {
        const v = mv?.[key];
        return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
    };

    const area = Math.PI * ((dMm * 1e-3) / 2) ** 2;
    const rho = eng('resistivity') ?? RESISTIVITY[material];
    const crossSection = eng('crossSection') ?? area;
    const denom = Math.max(crossSection, 1e-12);

    const curveRL = chartOf(result, 'R_L');
    const curveInvS = chartOf(result, 'R_invS');
    const curveMaterial = chartOf(result, 'R_material');

    return {
        source: eng('baseResistance') !== undefined ? 'engine' : 'fallback',
        L,
        dMm,
        material,
        materialName: MATERIAL_NAMES[material],
        rho,
        area: crossSection,
        R: eng('baseResistance') ?? (rho * L) / denom,
        slopeRL: eng('slope_R_L') ?? rho / denom,
        slopeInvS: eng('slope_R_invS') ?? rho * L,
        rCu: eng('rCu') ?? (RESISTIVITY.Cu * L) / denom,
        rFe: eng('rFe') ?? (RESISTIVITY.Fe * L) / denom,
        rNichrome: eng('rNichrome') ?? (RESISTIVITY.Nichrome * L) / denom,
        curveRLPoints: curveRL?.points.length ?? 0,
        curveInvSPoints: curveInvS?.points.length ?? 0,
        curveMaterialPoints: curveMaterial?.points.length ?? 0
    };
}

/** 从引擎 chart 取 (x, y) 数组; 没有曲线时返回空数组 */
function chartPoints(
    result: SimulationResult | null | undefined,
    key: 'R_L' | 'R_invS' | 'R_material'
): { xs: number[]; ys: number[] } {
    const chart = chartOf(result, key);
    if (!chart) return { xs: [], ys: [] };
    return {
        xs: chart.points.map(p => p.x),
        ys: chart.points.map(p => p.y)
    };
}

/**
 * 电阻定律专属板书。
 *
 * 画面结构:
 *   - 左上: 导线示意 (长度 L / 直径 d 随参数变化) + 读数 HUD;
 *   - 右上: R-L 直线 (引擎 R_L);
 *   - 右下: R-1/S 直线 (引擎 R_invS);
 *   - 左下: 材料对比柱 (引擎 R_material);
 *   - 底部: 结论信息条。
 */
export function drawResistanceLawScene(opts: ResistanceLawSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult } = opts;
    clearScene(ctx, width, height, isDark);
    drawTitle(ctx, '电阻定律 R = ρ·L/S', width, isDark, { size: 18, y: 28 });

    const read = resistanceLawReadouts(params, simulationResult);

    // —— 左侧: 导线示意 ——
    const wireX1 = width * 0.1;
    const wireX2 = width * 0.42;
    const wireY = height * 0.3;
    const thick = clamp(read.dMm * 9, 6, 28);
    const grad = ctx.createLinearGradient(wireX1, wireY - thick, wireX2, wireY + thick);
    grad.addColorStop(0, '#94a3b8');
    grad.addColorStop(0.5, read.material === 'Cu' ? '#f59e0b' : read.material === 'Fe' ? '#cbd5e1' : '#64748b');
    grad.addColorStop(1, '#475569');
    ctx.strokeStyle = grad;
    ctx.lineWidth = thick;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(wireX1, wireY);
    ctx.lineTo(wireX2, wireY);
    ctx.stroke();
    drawArrow(ctx, wireX1, wireY + 46, wireX2, wireY + 46, COLORS.GREEN, 'L');
    ctx.fillStyle = mutedColor(isDark);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`导线直径 d = ${read.dMm.toFixed(2)} mm`, wireX1, wireY + 60);

    // —— 右侧上: R-L 直线 ——
    const rl = chartPoints(simulationResult, 'R_L');
    const plotX = width * 0.5;
    const plotW = width * 0.44;
    const plotH = height * 0.2;
    drawMiniChart({
        ctx,
        x: plotX,
        y: height * 0.12,
        w: plotW,
        h: plotH,
        xs: rl.xs,
        ys: rl.ys,
        isDark,
        lineColor: COLORS.ORANGE,
        clampYZero: true,
        label: 'R-L 直线 (固定 d 与材料)',
        xLabel: '长度 L (m)',
        yLabel: '电阻 R (Ω)'
    });

    // —— 右侧下: R-1/S 直线 ——
    const invs = chartPoints(simulationResult, 'R_invS');
    drawMiniChart({
        ctx,
        x: plotX,
        y: height * 0.47,
        w: plotW,
        h: plotH,
        xs: invs.xs,
        ys: invs.ys,
        isDark,
        lineColor: COLORS.GREEN,
        clampYZero: true,
        label: 'R-1/S 直线 (固定 L 与材料)',
        xLabel: '1/S (m⁻²)',
        yLabel: '电阻 R (Ω)'
    });

    // —— 左下: 材料对比柱 ——
    drawMaterialBars(ctx, read, width * 0.1, height * 0.52, width * 0.32, height * 0.2, isDark);

    // —— 读数 HUD ——
    drawHud(
        ctx,
        isDark,
        [
            { label: 'ρ', value: `${read.rho.toExponential(2)} Ω·m` },
            { label: 'S', value: `${read.area.toExponential(3)} m²` },
            { label: 'R₀', value: `${formatResistanceValue(read.R)} Ω` },
            { label: 'k(R-L)', value: `${read.slopeRL.toExponential(3)} Ω/m` }
        ],
        { boxW: 230, twoColumn: true, valueX: 96 }
    );

    drawInfoBar(
        ctx,
        width,
        height,
        `控制变量: 长度↑电阻↑ · 横截面积↑电阻↓ · ${read.materialName}的 ρ 越大电阻越大 (铜 ${formatResistanceValue(read.rCu)} Ω < 铁 ${formatResistanceValue(read.rFe)} Ω < 镍铬 ${formatResistanceValue(read.rNichrome)} Ω)`,
        isDark
    );
}

/** 材料对比柱状图 (数据来自引擎 R_material 曲线) */
function drawMaterialBars(
    ctx: CanvasRenderingContext2D,
    read: ResistanceLawReadouts,
    x: number,
    y: number,
    w: number,
    h: number,
    isDark: boolean
): void {
    const entries: Array<{ name: string; r: number; color: string }> = [
        { name: '铜', r: read.rCu, color: COLORS.ORANGE },
        { name: '铁', r: read.rFe, color: '#94a3b8' },
        { name: '镍铬', r: read.rNichrome, color: COLORS.GREEN }
    ];
    const maxR = Math.max(...entries.map(e => e.r), 1e-12);

    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.65)';
    ctx.strokeStyle = isDark ? 'rgba(100,116,139,0.4)' : 'rgba(100,116,139,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();

    const barW = (w - 30) / entries.length;
    entries.forEach((e, i) => {
        const bh = (e.r / maxR) * (h - 34);
        const bx = x + 12 + i * barW + barW * 0.18;
        const by = y + h - 18 - bh;
        ctx.fillStyle = e.color;
        ctx.fillRect(bx, by, barW * 0.64, bh);
        ctx.fillStyle = textColor(isDark);
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(formatResistanceValue(e.r), bx + (barW * 0.64) / 2, by - 12);
        ctx.fillStyle = mutedColor(isDark);
        ctx.fillText(e.name, bx + (barW * 0.64) / 2, y + h - 16);
    });

    ctx.fillStyle = textColor(isDark);
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('材料对比 (固定 L 与 S)', x + 4, y + h + 4);
}

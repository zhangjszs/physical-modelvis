import type { PhysicsProblem } from '../types/problem.js';
import type {
    SimulationResult,
    TrajectoryPoint,
    Keyframe,
    ChartSeries,
    ExplanationStep,
    FormulaUsage
} from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 双缝干涉模型 — 杨氏双缝实验与单缝插透明薄片相移 (选必一 第四章)
 *
 * 光强分布 (双缝, 远场 Fraunhofer)：
 *   无薄片: Δ(x) = d·x/L,  I(x) = I₀·cos²(π·d·x / (λ·L)),  Δy = λ·L/d
 *   单缝前插透明薄片 (位于正 x 侧狭缝前, 厚度 t, 折射率 n):
 *     附加单程光程差: Δ_opt = (n − 1)·t   (仅 t > 0 且 n > 1 时非零)
 *     总光程差:       Δ_total(x) = d·x/L − Δ_opt
 *     光强分布:       I(x) = I₀·cos²(π·Δ_total(x) / λ)
 *     条纹整体平移:   x_shift = +Δ_opt·L/d = (n − 1)·t·L/d  (向插片侧平移，Δy 严格不变)
 */
export class InterferenceModel extends PhysicsModelBase {
    readonly name = '双缝干涉';
    readonly version = '1.1.0';
    readonly description = '杨氏双缝干涉条纹分布、单缝透明薄片相移与光强曲线';
    readonly modelType = 'interference' as const;
    readonly assumptions = [
        '理想单色光 (Δλ→0)',
        '远场近似 (L ≫ d)',
        '双缝宽度远小于波长 (衍射效应忽略)',
        '空气环境 (n≈1)；若在正 x 侧单缝前插透明薄片，产生单程附加光程差 Δ_opt=(n−1)t'
    ];
    readonly applicableRange = '可见光 380–780 nm；d=0.1–2 mm；L=0.5–5 m；薄片 t=0–2 μm, n≥1';
    readonly errorSources = [
        '实际缝宽有限 → 单缝衍射调制',
        '光源非完全单色 → 高级次条纹模糊',
        '近场 (菲涅耳) 条件偏离远场公式'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'wavelengthNm', description: '光波长 (nm)', unit: 'nm', required: true, min: 380, max: 780 },
        { name: 'slitSeparationMm', description: '缝距 d (mm)', unit: 'mm', required: true, min: 0.05, max: 5 },
        { name: 'screenDistanceM', description: '缝到屏距离 L (m)', unit: 'm', required: true, min: 0.1, max: 10 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const ic = problem.constraints?.interference;
        if (!ic) throw new Error('interference 模型需要 interference 约束配置');

        const lambdaNm = ic.wavelengthNm; // nm
        const lambda = lambdaNm * 1e-9; // m
        const dMm = ic.slitSeparationMm; // mm
        const d = dMm * 1e-3; // m
        const L = ic.screenDistanceM; // m

        // 明纹间距 (与是否插薄片无关，严格不变)
        const deltaY = (lambda * L) / d; // m
        const deltaYmm = deltaY * 1e3; // mm

        // 单缝前插透明薄片 (位于正 x 侧狭缝前, 仅 t > 0 且 n > 1 时产生非零相移)
        const filmThicknessUm = ic.filmThicknessUm ?? 0;
        const filmThickness = filmThicknessUm * 1e-6; // m
        const filmN = ic.filmN ?? 1;
        const hasFilm = filmThicknessUm > 0 && filmN > 1;
        const filmOpticalPathDiff = hasFilm ? (filmN - 1) * filmThickness : 0; // m: Δ_opt = (n - 1)t
        const filmOpticalPathDiffUm = filmOpticalPathDiff * 1e6; // μm
        const filmShiftOrders = hasFilm ? filmOpticalPathDiff / lambda : 0; // Δ_opt / λ
        const fringeShiftM = hasFilm ? (filmOpticalPathDiff * L) / d : 0; // m: x_shift = Δ_opt·L/d
        const fringeShiftMm = fringeShiftM * 1e3; // mm

        // 光强曲线：I(x) = I₀·cos²(π·Δ_total(x)/λ), Δ_total(x) = d·x/L − Δ_opt
        // x 在屏幕上从 -w/2 到 w/2 (w = 5·Δy)
        const w = 5 * deltaY; // m
        const N = 400;
        const intensityCurve: ChartSeries = {
            xLabel: '屏上位置 x (mm)',
            yLabel: '相对光强 I/I₀',
            xUnit: 'mm',
            yUnit: '',
            points: []
        };
        for (let i = 0; i <= N; i++) {
            const x = -w / 2 + (w * i) / N; // m
            const deltaTotal = (d * x) / L - filmOpticalPathDiff;
            const phi = (Math.PI * deltaTotal) / lambda;
            const I = Math.cos(phi) * Math.cos(phi);
            intensityCurve.points.push({
                x: parseFloat((x * 1e3).toFixed(4)),
                y: parseFloat(I.toFixed(4))
            });
        }

        // 光程差-条纹级次图 (x vs Δ_total(x)/λ)
        const fringeOrderCurve: ChartSeries = {
            xLabel: '屏上位置 x (mm)',
            yLabel: '光程差 Δ/λ',
            xUnit: 'mm',
            yUnit: '',
            points: []
        };
        for (let i = 0; i <= 200; i++) {
            const x = -w / 2 + (w * i) / 200;
            const deltaTotal = (d * x) / L - filmOpticalPathDiff;
            fringeOrderCurve.points.push({
                x: parseFloat((x * 1e3).toFixed(3)),
                y: parseFloat((deltaTotal / lambda).toFixed(3))
            });
        }

        // 关键帧: 中央零级明纹 (k=0) 与第 1 级明纹均随薄片向正 x 侧平移 x_shift
        const shiftNote = hasFilm
            ? `, 单缝薄片附加光程 Δ_opt=${(filmOpticalPathDiff * 1e9).toFixed(1)}nm, 平移 Δx=+${fringeShiftMm.toFixed(3)}mm (${filmShiftOrders.toFixed(2)}Δy)`
            : '';
        const keyframes: Keyframe[] = [
            {
                label: '中央明纹 (k=0)',
                t: 0,
                position: { x: fringeShiftMm, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `中央明纹 (总光程差 Δ_total=0, k=0) 位于 x=${fringeShiftMm.toFixed(3)}mm, Δy=${deltaYmm.toFixed(3)}mm, λ=${lambdaNm}nm, d=${dMm}mm, L=${L}m${shiftNote}`
            },
            {
                label: '第 1 级明纹 (k=±1)',
                t: 0,
                position: { x: fringeShiftMm + deltaYmm, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `第 1 级明纹位置 x=${(fringeShiftMm + deltaYmm).toFixed(3)}mm / ${(fringeShiftMm - deltaYmm).toFixed(3)}mm (间隔仍为 Δy=${deltaYmm.toFixed(3)}mm)${shiftNote}`
            }
        ];

        // 视窗 [-w/2, w/2] 内的明纹位置列表: x_k = x_shift + k·Δy
        const fringes: TrajectoryPoint[] = [];
        const halfW = w / 2;
        const kMin = Math.ceil((-halfW - fringeShiftM) / deltaY);
        const kMax = Math.floor((halfW - fringeShiftM) / deltaY);
        let maxAbsK = 0;
        for (let k = kMin; k <= kMax && fringes.length < 41; k++) {
            const xKmm = (fringeShiftM + k * deltaY) * 1e3;
            maxAbsK = Math.max(maxAbsK, Math.abs(k));
            fringes.push({
                t: 0,
                position: { x: xKmm, y: 0 },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            });
        }
        if (fringes.length === 0) {
            fringes.push({
                t: 0,
                position: { x: fringeShiftMm, y: 0 },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            });
        }

        const warnings: string[] = [];
        if (deltaYmm < 0.1) warnings.push('条纹间距过小，肉眼难以分辨');
        if (dMm < 0.1) warnings.push('缝距过小，接近单缝衍射极限');
        if (lambdaNm < 380 || lambdaNm > 780) warnings.push('波长不在可见光范围 (380–780 nm)');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '明纹间距公式 (与是否加薄片无关)',
                formula: 'Δy = λ·L/d',
                calculation: `Δy = ${lambdaNm}×10⁻⁹ × ${L} / (${dMm}×10⁻³) = ${deltaYmm.toFixed(3)} mm`
            },
            {
                order: 2,
                description: '明纹位置条件',
                formula: hasFilm ? 'x_k = x_shift + k·Δy  (k∈ℤ)' : 'x_k = k·λ·L/d = k·Δy  (k=0,±1,±2,...)',
                calculation: hasFilm
                    ? `k=0: x=${fringeShiftMm.toFixed(3)}mm; k=±1: x=${(fringeShiftMm + deltaYmm).toFixed(3)}mm / ${(fringeShiftMm - deltaYmm).toFixed(3)}mm`
                    : `k=±1: x=±${deltaYmm.toFixed(3)}mm; k=±2: x=±${(2 * deltaYmm).toFixed(3)}mm`
            },
            {
                order: 3,
                description: '光强分布',
                formula: hasFilm ? 'I(x) = I₀·cos²(π·(d·x/L − Δ_opt)/λ)' : 'I(x) = I₀·cos²(π·d·x/(λ·L))',
                result: '双缝干涉光强曲线是 cos² 函数，条纹等间距 Δy 不变'
            }
        ];

        if (hasFilm) {
            steps.push({
                order: 4,
                description: '单缝前插透明薄片相移',
                formula: 'Δ_opt = (n − 1)·t,  x_shift = Δ_opt·L/d = (n − 1)·t·L/d',
                calculation: `Δ_opt = (${filmN} − 1)×${filmThicknessUm.toFixed(2)}μm = ${(filmOpticalPathDiff * 1e9).toFixed(1)}nm (${filmShiftOrders.toFixed(3)}λ) → 整体向插片侧平移 Δx = +${fringeShiftMm.toFixed(3)}mm`
            });
        }

        const formulas: FormulaUsage[] = [
            {
                name: '条纹间距',
                formula: 'Δy = λ·L/d',
                variables: {
                    λ: { value: lambdaNm, unit: 'nm' },
                    L: { value: L, unit: 'm' },
                    d: { value: dMm, unit: 'mm' },
                    Δy: { value: deltaYmm, unit: 'mm' }
                }
            },
            {
                name: '明纹位置',
                formula: hasFilm ? 'x_k = (n−1)·t·L/d + k·λ·L/d' : 'x_k = k·λ·L/d',
                variables: {
                    k: { value: 1, unit: '' },
                    'x₁': { value: parseFloat((fringeShiftMm + deltaYmm).toFixed(4)), unit: 'mm' }
                }
            },
            ...(hasFilm
                ? [
                      {
                          name: '单缝透明薄片条纹平移',
                          formula: 'Δ_opt = (n − 1)·t,  Δx = Δ_opt·L/d',
                          variables: {
                              n: { value: filmN, unit: '' },
                              t: { value: filmThicknessUm, unit: 'μm' },
                              Δ_opt: { value: parseFloat(filmOpticalPathDiffUm.toFixed(4)), unit: 'μm' },
                              Δx: { value: parseFloat(fringeShiftMm.toFixed(4)), unit: 'mm' }
                          }
                      }
                  ]
                : [])
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [fringes],
            keyframes,
            charts: { x_t: intensityCurve, y_t: fringeOrderCurve },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    deltaYmm,
                    lambdaNm,
                    slitSeparationMm: dMm,
                    screenDistanceM: L,
                    maxFringeOrder: maxAbsK,
                    fringeShiftMm,
                    filmOpticalPathDiffUm,
                    filmShiftOrders,
                    filmOpticalPathDiff: filmOpticalPathDiffUm,
                    filmOrder: filmShiftOrders
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: hasFilm
                    ? `双缝干涉 (单缝加薄片): λ=${lambdaNm}nm, d=${dMm}mm, L=${L}m → Δy=${deltaYmm.toFixed(3)}mm (不变), 薄片 Δ_opt=${(filmOpticalPathDiff * 1e9).toFixed(1)}nm, 条纹平移 Δx=+${fringeShiftMm.toFixed(3)}mm`
                    : `双缝干涉: λ=${lambdaNm}nm, d=${dMm}mm, L=${L}m → 条纹间距 Δy=${deltaYmm.toFixed(3)}mm (视窗内可见明纹 ${fringes.length} 条)`,
                steps,
                formulas
            },
            errors: [],
            warnings
        };
    }
}

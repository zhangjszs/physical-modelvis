import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 双缝干涉模型 — 杨氏双缝实验 (选必一 第四章)
 *
 * 光强分布 (双缝, 远场 Fraunhofer)：
 *   I(x) = I₀·cos²(π·d·x / (λ·L))
 *   Δy (明纹间距) = λ·L / d
 *
 * 条纹级次 k (中央明纹 k=0)：
 *   x_k = k·λ·L/d   (明纹, k∈ℤ)
 *   x_k = (k+½)·λ·L/d (暗纹, k∈ℤ)
 *
 * 薄膜干涉：2·n·d·cosθ' = (m+½)λ (增透) / mλ (增反)
 */
export class InterferenceModel extends PhysicsModelBase {
    readonly name = '双缝干涉';
    readonly version = '1.0.0';
    readonly description = '杨氏双缝干涉条纹分布、光程差与光强曲线';
    readonly modelType = 'interference' as const;
    readonly assumptions = [
        '理想单色光 (Δλ→0)',
        '远场近似 (L ≫ d)',
        '双缝宽度远小于波长 (衍射效应忽略)',
        '空气环境 (n≈1)'
    ];
    readonly applicableRange = '可见光 400–700 nm；d=0.1–2 mm；L=0.5–5 m';
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

        // 明纹间距
        const deltaY = (lambda * L) / d; // m
        const deltaYmm = deltaY * 1e3; // mm

        // 薄膜干涉 (可选参数)
        const hasFilm = (ic.filmThicknessUm ?? 0) > 0 && (ic.filmN ?? 0) > 0;
        const filmThickness = (ic.filmThicknessUm ?? 0) * 1e-6; // m
        const filmN = ic.filmN ?? 1;
        // 薄膜干涉：垂直入射光程差 Δ = 2nd → Δ/λ 为干涉级次倍数
        const filmOpticalPathDiff = hasFilm ? 2 * filmN * filmThickness : 0;
        const filmOrder = hasFilm ? filmOpticalPathDiff / lambda : 0;
        // 增透条件：Δ = (m+½)λ → 反射相消 → m = Δ/λ - ½
        // 增反条件：Δ = mλ → 反射相长
        const isAntiReflective = hasFilm && Math.abs(filmOrder - Math.round(filmOrder - 0.5) - 0.5) < 0.05;
        const isHighReflective = hasFilm && Math.abs(filmOrder - Math.round(filmOrder)) < 0.05;

        // 光强曲线：I(x) = I₀·cos²(π·d·x/(λ·L))
        // x 在屏幕上从 -w/2 到 w/2 (w=5·Δy 足以展示 5 条明纹)
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
            const phi = (Math.PI * d * x) / (lambda * L);
            const I = Math.cos(phi) * Math.cos(phi);
            intensityCurve.points.push({
                x: parseFloat((x * 1e3).toFixed(4)),
                y: parseFloat(I.toFixed(4))
            });
        }

        // 光程差-条纹级次图 (一维示意：x vs Δ/λ)
        const fringeOrderCurve: ChartSeries = {
            xLabel: '屏上位置 x (mm)',
            yLabel: '光程差 Δ/λ',
            xUnit: 'mm',
            yUnit: '',
            points: []
        };
        for (let i = 0; i <= 200; i++) {
            const x = -w / 2 + (w * i) / 200;
            const opticalPathDiff = (d * x) / L; // 光程差 (二级近似：Δ ≈ d·sinθ ≈ d·x/L)
            fringeOrderCurve.points.push({
                x: parseFloat((x * 1e3).toFixed(3)),
                y: parseFloat((opticalPathDiff / lambda).toFixed(3))
            });
        }

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '中央明纹 (k=0)',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `中央明纹 (光程差 Δ=0, k=0), Δy=${deltaYmm.toFixed(3)}mm, λ=${lambdaNm}nm, d=${dMm}mm, L=${L}m`
            },
            {
                label: '第 1 级明纹 (k=±1)',
                t: 0,
                position: { x: deltaY * 1e3, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `第 1 级明纹位置 x=±${(deltaY * 1e3).toFixed(3)}mm, 光程差 Δ=λ`
            }
        ];

        // 明纹/暗纹位置列表 (用作示意图)
        const fringes: TrajectoryPoint[] = [];
        let k = 0;
        while (true) {
            const xK = k * deltaY * 1e3; // mm
            if (Math.abs(xK) > (w * 1e3) / 2) break;
            if (k === 0) {
                fringes.push({
                    t: 0,
                    position: { x: xK, y: 0 },
                    velocity: { x: 0, y: 0 },
                    kineticEnergy: 0,
                    potentialEnergy: 0
                });
            } else {
                fringes.push({
                    t: 0,
                    position: { x: xK, y: 0 },
                    velocity: { x: 0, y: 0 },
                    kineticEnergy: 0,
                    potentialEnergy: 0
                });
                fringes.push({
                    t: 0,
                    position: { x: -xK, y: 0 },
                    velocity: { x: 0, y: 0 },
                    kineticEnergy: 0,
                    potentialEnergy: 0
                });
            }
            k++;
            if (k > 20) break; // safety
        }

        const warnings: string[] = [];
        if (deltaYmm < 0.1) warnings.push('条纹间距过小，肉眼难以分辨');
        if (dMm < 0.1) warnings.push('缝距过小，接近单缝衍射极限');
        if (lambdaNm < 380 || lambdaNm > 780) warnings.push('波长不在可见光范围 (380–780 nm)');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '明纹间距公式',
                formula: 'Δy = λ·L/d',
                calculation: `Δy = ${lambdaNm}×10⁻⁹ × ${L} / (${dMm}×10⁻³) = ${(deltaY * 1e3).toFixed(3)} mm`
            },
            {
                order: 2,
                description: '明纹条件',
                formula: 'x_k = k·λ·L/d = k·Δy  (k=0,±1,±2,...)',
                calculation:
                    k > 1
                        ? `k=±1: x=±${(deltaY * 1e3).toFixed(3)}mm; k=±2: x=±${(2 * deltaY * 1e3).toFixed(3)}mm`
                        : '仅中央明纹可见'
            },
            {
                order: 3,
                description: '光强分布',
                formula: 'I(x) = I₀·cos²(π·d·x/(λ·L))',
                result: '双缝干涉光强曲线是 cos² 函数，等间距等亮度 (远场)'
            }
        ];

        if (hasFilm) {
            steps.push({
                order: 4,
                description: '薄膜干涉',
                formula: '光程差 Δ = 2nd',
                calculation: `Δ = 2×${filmN}×${(filmThickness * 1e6).toFixed(1)}μm = ${(filmOpticalPathDiff * 1e6).toFixed(2)}μm = ${filmOrder.toFixed(2)}λ → ${isAntiReflective ? '增透 (反射相消)' : isHighReflective ? '增反 (反射相长)' : '介于两者之间'}`
            });
        }

        return {
            meta: {
                model: 'interference',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [fringes],
            keyframes,
            charts: { x_t: intensityCurve, y_t: fringeOrderCurve },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    deltaYmm,
                    lambdaNm: lambdaNm,
                    slitSeparationMm: dMm,
                    screenDistanceM: L,
                    maxFringeOrder: k - 1,
                    filmOpticalPathDiff: filmOpticalPathDiff * 1e6, // μm
                    filmOrder,
                    isAntiReflective: isAntiReflective ? 1 : 0,
                    isHighReflective: isHighReflective ? 1 : 0
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `双缝干涉: λ=${lambdaNm}nm, d=${dMm}mm, L=${L}m → 条纹间距 Δy=${deltaYmm.toFixed(3)}mm (可分辨明纹 ${2 * (k - 1) + 1} 条)`,
                steps,
                formulas: [
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
                        formula: 'x_k = k·λ·L/d',
                        variables: { k: { value: 1, unit: '' }, 'x₁': { value: deltaYmm, unit: 'mm' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

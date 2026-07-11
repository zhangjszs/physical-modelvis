import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

// 普朗克常量 (J·s), 元电荷 (C), 1 eV (J)
const h = 6.626e-34;
const e = 1.602e-19;
const eV = 1.602e-19;

/**
 * 光电效应模型 — 爱因斯坦方程 hν = W₀ + e·U_c (选必三 第四章 §2)
 *
 * 截止电压 U_c = (hν − W₀)/e (当 ν ≥ ν₀)
 * 极限频率 ν₀ = W₀/h
 * 普朗克常量测定：斜率 U_c-ν = h/e
 */
export class PhotoelectricModel extends PhysicsModelBase {
    readonly name = '光电效应';
    readonly version = '1.0.0';
    readonly description = '爱因斯坦光电方程 hν=W₀+eU_c, 截止电压-频率线性';
    readonly modelType = 'photoelectric' as const;
    readonly assumptions = [
        '光子能量完全被单个电子吸收',
        '电子从表面逸出 (不考虑深部电子)',
        '势垒与频率无关 (简化模型)'
    ];
    readonly applicableRange = '可见光至紫外 (频率 ~400–3000 THz)；逸出功 2–6 eV';
    readonly errorSources = ['实际存在接触电势差', '热电子发射 (下室温可忽略)', '金属表面氧化层影响逸出功'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'workFunction', description: '逸出功 W₀ (eV)', unit: 'eV', required: true, min: 1, max: 7 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const pc = problem.constraints?.photoelectric;
        if (!pc) throw new Error('photoelectric 模型需要 photoelectric 约束配置');

        const W0_eV = pc.workFunction;
        const W0_J = W0_eV * eV;
        const nu0 = W0_J / h; // 极限频率 (Hz)
        const nu0_THz = nu0 / 1e12;

        const freqMin = (pc.freqMinTHz ?? Math.max(0.9 * nu0_THz, 0.1)) * 1e12;
        const freqMax = (pc.freqMaxTHz ?? 2.5 * Math.max(nu0_THz, 2)) * 1e12;

        // U_c-ν 图：U_c = (h·ν − W₀)/e (ν ≥ ν₀), 否则无光电子
        const Uc_nu: ChartSeries = {
            xLabel: '入射光频率 ν (THz)',
            yLabel: '截止电压 U_c (V)',
            xUnit: 'THz',
            yUnit: 'V',
            points: []
        };
        const N = 200;
        for (let i = 0; i <= N; i++) {
            const nu = freqMin + ((freqMax - freqMin) * i) / N;
            if (nu >= nu0) {
                const Uc = (h * nu - W0_J) / e;
                Uc_nu.points.push({ x: parseFloat((nu / 1e12).toFixed(4)), y: parseFloat(Uc.toFixed(4)) });
            }
            // ν < ν₀ 时无光电子, 跳过该点 (U_c 不存在)
        }

        // E_k-ν 图：与 U_c-ν 相似, E_k = e·U_c = h·ν − W₀ (eV 单位)
        const Ek_nu: ChartSeries = {
            xLabel: '入射光频率 ν (THz)',
            yLabel: '最大初动能 E_k (eV)',
            xUnit: 'THz',
            yUnit: 'eV',
            points: []
        };
        for (let i = 0; i <= N; i++) {
            const nu = freqMin + ((freqMax - freqMin) * i) / N;
            if (nu >= nu0) {
                const Ek = (h * nu - W0_J) / eV;
                Ek_nu.points.push({ x: parseFloat((nu / 1e12).toFixed(4)), y: parseFloat(Ek.toFixed(4)) });
            }
        }

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '极限频率',
                t: 0,
                position: { x: parseFloat(nu0_THz.toFixed(3)), y: 0 },
                velocity: { x: 0, y: 0 },
                description: `极限频率 ν₀ = W₀/h = ${W0_eV}eV / h = ${nu0_THz.toFixed(1)} THz, 截止电压 0 V (红限)`
            },
            {
                label: '典型频率点',
                t: 0,
                position: {
                    x: parseFloat((nu0_THz * 1.3).toFixed(2)),
                    y: parseFloat(((h * nu0 * 1.3 - W0_J) / e).toFixed(2))
                },
                velocity: { x: 0, y: 0 },
                description: `ν=${(nu0_THz * 1.3).toFixed(0)}THz → hν=${((h * nu0 * 1.3) / eV).toFixed(2)}eV, E_k=${((h * nu0 * 1.3) / eV - W0_eV).toFixed(2)}eV, U_c=${((h * nu0 * 1.3 - W0_J) / e).toFixed(2)}V`
            }
        ];

        // 模拟轨迹 (1 点)
        const trajectory: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }
        ];

        const warnings: string[] = [];
        if (W0_eV < 2) warnings.push('逸出功较小, 低频光也能发生光电效应');
        if (W0_eV > 6) warnings.push('逸出功较大, 需要紫外光才能发生光电效应');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '极限频率 (红限)',
                formula: 'ν₀ = W₀ / h',
                calculation: `ν₀ = ${W0_eV} × ${eV.toExponential(2)} / ${h.toExponential(2)} = ${(nu0 / 1e12).toFixed(1)} THz`
            },
            {
                order: 2,
                description: '爱因斯坦光电方程',
                formula: 'hν = W₀ + E_k = W₀ + e·U_c',
                result: `频率高于 ${nu0_THz.toFixed(0)} THz 时, 电子才能逸出`
            },
            {
                order: 3,
                description: '普朗克常量测定',
                formula: 'h/e = ΔU_c / Δν',
                result: `U_c-ν 直线斜率 = h/e = ${(h / e).toExponential(2)} V·s, 实验测定 h ≈ 6.63×10⁻³⁴ J·s`
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t: Uc_nu, y_t: Ek_nu },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    workFunction_eV: W0_eV,
                    thresholdFrequency_THz: nu0_THz,
                    h,
                    e,
                    h_over_e: h / e,
                    slope_dUc_dnu: (h / eV) * 1e-12 // dUc/d(nu in THz)
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `光电效应: W₀=${W0_eV}eV, ν₀=${nu0_THz.toFixed(0)}THz, h/e=${(h / eV).toExponential(2)}V·s`,
                steps,
                formulas: [
                    {
                        name: '光电方程',
                        formula: 'hν = W₀ + eU_c',
                        variables: {
                            h: { value: h, unit: 'J·s' },
                            W0: { value: W0_eV, unit: 'eV' },
                            e: { value: e, unit: 'C' }
                        }
                    },
                    { name: '极限频率', formula: 'ν₀ = W₀/h', variables: { 'ν₀': { value: nu0_THz, unit: 'THz' } } }
                ]
            },
            errors: [],
            warnings
        };
    }
}

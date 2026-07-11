import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * LC 振荡模型 — 选必二 第四章
 *
 * 振荡频率: ω = 1/√(LC),  f = 1/(2π√(LC)),  T = 2π√(LC)
 * 电荷瞬时值: q(t) = Q₀·cos(ωt)
 * 电流瞬时值: i(t) = −Q₀·ω·sin(ωt) = −Iₘ·sin(ωt)
 * 电场能: E_e = q²/(2C) = Q₀²·cos²(ωt)/(2C)
 * 磁场能: E_m = Li²/2 = L·Iₘ²·sin²(ωt)/2
 * 总能量: E_total = Q₀²/(2C) = 常数 (无损耗)
 */

export class LCOscillatorModel extends PhysicsModelBase {
    readonly name = 'LC 电磁振荡';
    readonly version = '1.0.0';
    readonly description = 'T=2π√(LC), q=Q₀·cosωt, 电场能与磁场能相互转化';
    readonly modelType = 'lc-oscillator' as const;
    readonly assumptions = ['理想 LC 电路 (无电阻, 无能量损耗)', '电容和电感为集总参数'];
    readonly applicableRange = '射频范围 (kHz ~ MHz); 典型 L=1μH~100mH, C=1pF~1mF';
    readonly errorSources: string[] = [];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'capacitance', description: '电容 C (F)', unit: 'F', required: true, min: 1e-12, max: 1 },
        { name: 'inductance', description: '电感 L (H)', unit: 'H', required: true, min: 1e-9, max: 100 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const lc = problem.constraints?.lc;
        if (!lc) throw new Error('lc-oscillator 模型需要 lc 约束配置');

        const C = lc.capacitance;
        const L = lc.inductance;
        const Q0 = lc.initialCharge ?? 1e-6;
        const omega = 1 / Math.sqrt(L * C);
        const T = (2 * Math.PI) / omega;
        const f = omega / (2 * Math.PI);
        const Im = Q0 * omega; // 电流峰值
        const E_total = (Q0 * Q0) / (2 * C); // 系统总能量

        // q-t 和 i-t 曲线
        const q_t: ChartSeries = {
            xLabel: '时间 t (μs)',
            yLabel: '电荷 q (μC)',
            xUnit: 'μs',
            yUnit: 'μC',
            points: []
        };
        const i_t: ChartSeries = {
            xLabel: '时间 t (μs)',
            yLabel: '电流 i (mA)',
            xUnit: 'μs',
            yUnit: 'mA',
            points: []
        };
        const Ee_t: ChartSeries = {
            xLabel: '时间 t (μs)',
            yLabel: '电场能 (μJ)',
            xUnit: 'μs',
            yUnit: 'μJ',
            points: []
        };
        const Em_t: ChartSeries = {
            xLabel: '时间 t (μs)',
            yLabel: '磁场能 (μJ)',
            xUnit: 'μs',
            yUnit: 'μJ',
            points: []
        };

        const steps = 400;
        const tMax = 2 * T; // 展示 2 个周期
        for (let i = 0; i <= steps; i++) {
            const t = (tMax * i) / steps;
            const q = Q0 * Math.cos(omega * t);
            const cur = -Q0 * omega * Math.sin(omega * t);
            const Ee = (q * q) / (2 * C);
            const Em = (L * cur * cur) / 2;
            q_t.points.push({ x: parseFloat((t * 1e6).toFixed(2)), y: parseFloat((q * 1e6).toFixed(4)) });
            i_t.points.push({ x: parseFloat((t * 1e6).toFixed(2)), y: parseFloat((cur * 1e3).toFixed(4)) });
            Ee_t.points.push({ x: parseFloat((t * 1e6).toFixed(2)), y: parseFloat((Ee * 1e6).toFixed(4)) });
            Em_t.points.push({ x: parseFloat((t * 1e6).toFixed(2)), y: parseFloat((Em * 1e6).toFixed(4)) });
        }

        const keyframes: Keyframe[] = [
            {
                label: 't=0 (电容充满)',
                t: 0,
                position: { x: 0, y: Q0 * 1e6 },
                velocity: { x: 0, y: 0 },
                description: `q=Q₀=${(Q0 * 1e6).toFixed(1)}μC, i=0, 电场能最大 E=${(E_total * 1e6).toFixed(2)}μJ`
            },
            {
                label: 't=T/4 (电流最大)',
                t: T / 4,
                position: { x: (T / 4) * 1e6, y: 0 },
                velocity: { x: 0, y: -Im * 1e3 },
                description: `q=0, i_max=${(Im * 1e3).toFixed(2)}mA, 磁场能最大`
            },
            {
                label: 't=T/2 (反向充满)',
                t: T / 2,
                position: { x: (T / 2) * 1e6, y: -Q0 * 1e6 },
                velocity: { x: 0, y: 0 },
                description: `q=−Q₀, i=0, 电场能最大`
            }
        ];

        const trajectory: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }
        ];

        const stepsExpl: ExplanationStep[] = [
            {
                order: 1,
                description: '振荡周期',
                formula: 'T = 2π√(LC)',
                calculation: `T = 2π√(${L}×${C}) = ${(T * 1e6).toFixed(2)} μs`
            },
            {
                order: 2,
                description: '振荡频率',
                formula: 'f = 1/(2π√(LC))',
                calculation: `f = ${(f / 1e3).toFixed(2)} kHz`
            },
            {
                order: 3,
                description: '电荷与电流',
                formula: 'q=Q₀·cos(ωt), i=−Q₀ω·sin(ωt)',
                result: `Q₀=${(Q0 * 1e6).toFixed(1)}μC, Iₘ=${(Im * 1e3).toFixed(2)}mA`
            },
            {
                order: 4,
                description: '能量守恒',
                formula: 'E_total = Q₀²/(2C) = 常数',
                calculation: `E_total = ${(E_total * 1e6).toFixed(3)} μJ (电场能↔磁场能)`
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t: q_t, y_t: i_t, ke_t: Ee_t, pe_t: Em_t },
            diagnostics: {
                conservedQuantities: [
                    {
                        name: '电磁总能量',
                        law: '能量守恒 (理想 LC)',
                        initialValue: E_total,
                        finalValue: E_total,
                        maxDeviation: 0,
                        tolerance: 1e-20,
                        conserved: true
                    }
                ],
                maxValues: {
                    capacitance: C,
                    inductance: L,
                    omega,
                    frequency: f,
                    period: T,
                    maxCharge: Q0,
                    maxCurrent: Im,
                    totalEnergy: E_total
                },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `LC振荡: L=${L}H, C=${C}F → f=${(f / 1e3).toFixed(1)}kHz, T=${(T * 1e6).toFixed(1)}μs, E_total=${(E_total * 1e6).toFixed(2)}μJ`,
                steps: stepsExpl,
                formulas: [
                    {
                        name: '振荡周期',
                        formula: 'T=2π√(LC)',
                        variables: {
                            L: { value: L, unit: 'H' },
                            C: { value: C, unit: 'F' },
                            T: { value: T, unit: 's' }
                        }
                    },
                    {
                        name: '电荷',
                        formula: 'q=Q₀·cosωt',
                        variables: { Q0: { value: Q0, unit: 'C' }, ω: { value: omega, unit: 'rad/s' } }
                    }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

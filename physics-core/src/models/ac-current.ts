import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 交变电流模型 — 选必二 第三章
 *
 * 电动势/电压瞬时值: e = Eₘ·sin(ωt), u = Uₘ·sin(ωt)
 * 有效值: E_eff = Eₘ/√2, U_eff = Uₘ/√2
 * 频率: f = ω/(2π), T = 1/f
 *
 * 理想变压器: U₁/U₂ = n₁/n₂ (电压比 = 匝数比)
 * 功率传输: P₁ ≈ P₂ (不计损耗)
 */

export class ACCurrentModel extends PhysicsModelBase {
    readonly name = '交变电流';
    readonly version = '1.0.0';
    readonly description = 'e=Eₘ·sinωt, 有效值 E_eff=Eₘ/√2, 变压器 U₁/U₂=n₁/n₂';
    readonly modelType = 'ac-current' as const;
    readonly assumptions = ['理想交变电流 (纯正弦波形, 无谐波)', '理想变压器 (无损耗, 全耦合)'];
    readonly applicableRange = '50 Hz 市电至射频; 电压 0 - 100 kV';
    readonly errorSources: string[] = [];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'peakEmf', description: '峰值电动势 Eₘ (V)', unit: 'V', required: true, min: 0.1, max: 1e6 },
        { name: 'angularFreq', description: '角频率 ω (rad/s)', unit: 'rad/s', required: true, min: 1, max: 1e6 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const ac = problem.constraints?.ac;
        if (!ac) throw new Error('ac-current 模型需要 ac 约束配置');

        const Em = ac.peakEmf; // V
        const omega = ac.angularFreq; // rad/s
        const f = omega / (2 * Math.PI); // Hz
        const T = 1 / f; // s
        const turnsRatio = ac.turnsRatio ?? 0; // n2/n1 (0 = 无变压器)

        const Eeff = Em / Math.sqrt(2); // V
        const U2 = turnsRatio > 0 ? Em * turnsRatio : 0; // 次级峰值
        const U2eff = U2 / Math.sqrt(2);

        // e-t 曲线
        const e_t: ChartSeries = {
            xLabel: '时间 t (ms)',
            yLabel: '电动势 e (V)',
            xUnit: 'ms',
            yUnit: 'V',
            points: []
        };
        const steps = 200;
        for (let i = 0; i <= steps; i++) {
            const t = (2 * T * i) / steps; // 展示 2 个周期
            const e = Em * Math.sin(omega * t);
            e_t.points.push({ x: parseFloat((t * 1e3).toFixed(3)), y: parseFloat(e.toFixed(3)) });
        }

        // u₂-t 曲线 (次级)
        const u2_t: ChartSeries = {
            xLabel: '时间 t (ms)',
            yLabel: '次级电压 u₂ (V)',
            xUnit: 'ms',
            yUnit: 'V',
            points: []
        };
        if (turnsRatio > 0) {
            for (let i = 0; i <= steps; i++) {
                const t = (2 * T * i) / steps;
                const u2 = Em * turnsRatio * Math.sin(omega * t);
                u2_t.points.push({ x: parseFloat((t * 1e3).toFixed(3)), y: parseFloat(u2.toFixed(3)) });
            }
        }

        const keyframes: Keyframe[] = [
            {
                label: '峰值 Eₘ',
                t: T / 4,
                position: { x: (T / 4) * 1e3, y: Em },
                velocity: { x: 0, y: 0 },
                description: `Eₘ=${Em} V, E_eff=${Eeff.toFixed(2)} V, f=${f.toFixed(1)} Hz, T=${(T * 1e3).toFixed(2)} ms`
            },
            {
                label: '过零点',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: 'e=0, 方向即将改变'
            }
        ];
        if (turnsRatio > 0) {
            keyframes.push({
                label: '变压器次级峰值',
                t: T / 4,
                position: { x: (T / 4) * 1e3, y: U2 },
                velocity: { x: 0, y: 0 },
                description: `u₂_peak=${U2.toFixed(2)} V, U₂eff=${U2eff.toFixed(2)} V, 匝比 1:${turnsRatio.toFixed(2)}`
            });
        }

        const trajectory: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }
        ];

        const stepsExpl: ExplanationStep[] = [
            {
                order: 1,
                description: '交变电动势',
                formula: 'e = Eₘ·sin(ωt)',
                calculation: `Eₘ=${Em} V, ω=${omega} rad/s, f=${f.toFixed(1)} Hz`
            },
            {
                order: 2,
                description: '有效值',
                formula: 'E_eff = Eₘ/√2',
                calculation: `E_eff = ${Em}/1.414 = ${Eeff.toFixed(2)} V`
            }
        ];
        if (turnsRatio > 0) {
            stepsExpl.push({
                order: 3,
                description: '理想变压器',
                formula: 'U₁/U₂ = n₁/n₂',
                calculation: `U₂ = ${Em}×${turnsRatio.toFixed(2)} = ${U2.toFixed(2)} V`
            });
        }

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t: e_t, y_t: u2_t },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    peakEmf: Em,
                    angularFreq: omega,
                    frequency: f,
                    period: T,
                    effectiveEmf: Eeff,
                    turnsRatio,
                    secondaryPeak: U2,
                    secondaryEff: U2eff
                },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary:
                    turnsRatio > 0
                        ? `交流: f=${f.toFixed(0)}Hz, Eₘ=${Em}V, 变压器 1:${turnsRatio.toFixed(2)} → U₂=${U2.toFixed(1)}V`
                        : `交流: f=${f.toFixed(0)}Hz, Eₘ=${Em}V, E_eff=${Eeff.toFixed(1)}V`,
                steps: stepsExpl,
                formulas: [
                    {
                        name: '交变电流',
                        formula: 'e=Eₘ·sinωt',
                        variables: {
                            Em: { value: Em, unit: 'V' },
                            ω: { value: omega, unit: 'rad/s' },
                            f: { value: f, unit: 'Hz' }
                        }
                    },
                    { name: '有效值', formula: 'Eₘ=√2·E_eff', variables: { Eeff: { value: Eeff, unit: 'V' } } }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

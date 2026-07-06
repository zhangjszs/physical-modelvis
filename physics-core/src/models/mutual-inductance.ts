import type { PhysicsProblem } from '../types/problem.js';
import type {
    SimulationResult,
    TrajectoryPoint,
    Keyframe,
    ChartSeries,
    ConservedQuantity,
    ExplanationStep
} from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 互感现象模型 (选必二第三章 §2)
 *
 * 两个线圈之间的互感：
 *   M = k * sqrt(L1 * L2)      (k: 耦合系数, 0 <= k <= 1)
 *   E2 = -M * dI1/dt           (次级感生电动势)
 *
 * 当原线圈通交流电 I1(t) = I0 * sin(omega * t) 时：
 *   dI1/dt = I0 * omega * cos(omega * t)
 *   E2(t) = -M * I0 * omega * cos(omega * t)
 *
 * 物理意义：
 *   - 耦合系数 k 取决于线圈几何、相对位置、有无铁芯
 *   - 理想变压器 k -> 1
 *   - 松散耦合 k << 1
 */
export class MutualInductanceModel extends PhysicsModelBase {
    readonly name = '互感现象';
    readonly version = '1.0.0';
    readonly description = '两线圈互感：M=k*sqrt(L1*L2)，次级感生电动势 E2=-M*dI1/dt';
    readonly modelType = 'mutual-inductance';
    readonly assumptions = [
        '线圈电感 L1, L2 恒定 (无磁饱和)',
        '耦合系数 k 不随电流变化',
        '线圈电阻不计 (纯电感)',
        '磁场完全耦合在两线圈之间 (无漏磁以外的损耗)'
    ];
    readonly applicableRange = 'L1, L2 = 1e-6-100 H; k = 0-1; f = 0.1-1e6 Hz';
    readonly errorSources = [
        '磁芯饱和导致 L 随电流变化',
        '高频时分布电容效应',
        '漏磁通导致实际 M 小于理论值',
        '线圈电阻在低频时不可忽略'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'L1', description: '原线圈自感 L1 (H)', unit: 'H', required: true, min: 0, max: 1000 },
        { name: 'L2', description: '副线圈自感 L2 (H)', unit: 'H', required: true, min: 0, max: 1000 },
        { name: 'coupling', description: '耦合系数 k (0-1)', unit: '', required: true, min: 0, max: 1 },
        { name: 'frequency', description: '交流频率 f (Hz)', unit: 'Hz', required: true, min: 0, max: 1e9 },
        { name: 'primaryCurrent', description: '原线圈电流幅值 I0 (A)', unit: 'A', required: true, min: 0, max: 10000 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const mi = problem.constraints?.mutualInductance;
        if (!mi) throw new Error('mutualInductance 模型需要 mutualInductance 约束配置');

        const L1 = mi.L1; // H
        if (L1 <= 0) throw new Error('原线圈自感 L1 必须为正');

        const L2 = mi.L2; // H
        if (L2 <= 0) throw new Error('副线圈自感 L2 必须为正');

        const k = mi.coupling; // 耦合系数
        if (k < 0 || k > 1) throw new Error('耦合系数 coupling 必须在 [0, 1] 范围内');

        const f = mi.frequency; // Hz
        if (f <= 0) throw new Error('频率 frequency 必须为正');

        const I0 = mi.primaryCurrent; // A (电流幅值)
        if (I0 < 0) throw new Error('原线圈电流幅值 primaryCurrent 不能为负');

        // 互感 M = k * sqrt(L1 * L2)
        const M = k * Math.sqrt(L1 * L2); // H

        // 角频率 omega = 2*pi*f
        const omega = 2 * Math.PI * f; // rad/s

        // 原线圈电流 I1(t) = I0 * sin(omega * t)
        // dI1/dt = I0 * omega * cos(omega * t)
        // 次级感生电动势 E2(t) = -M * dI1/dt = -M * I0 * omega * cos(omega * t)
        const E2_amplitude = M * I0 * omega; // V (次级电动势幅值)

        const sampleCount = problem.timeConfig.sampleCount ?? 1000;
        const duration = problem.timeConfig.duration;
        const dt = duration / sampleCount;

        // 时间轨迹
        const trajectory: TrajectoryPoint[] = [];
        let maxE2 = 0;
        let maxI1 = 0;
        for (let i = 0; i <= sampleCount; i++) {
            const t = i * dt;
            const I1 = I0 * Math.sin(omega * t);
            const dI1_dt = I0 * omega * Math.cos(omega * t);
            const E2 = -M * dI1_dt;
            maxE2 = Math.max(maxE2, Math.abs(E2));
            maxI1 = Math.max(maxI1, Math.abs(I1));
            trajectory.push({
                t,
                position: { x: t, y: I1 }, // x: time (s), y: primary current (A)
                velocity: { x: 1, y: dI1_dt },
                acceleration: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            });
        }

        // 图表 1: 原线圈电流 vs 时间
        const primaryCurrentVsTime: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: '原线圈电流 I1 (A)',
            xUnit: 's',
            yUnit: 'A',
            points: trajectory.map(p => ({
                x: parseFloat(p.t.toFixed(6)),
                y: parseFloat(p.position.y.toFixed(6))
            }))
        };

        // 图表 2: 次级感生电动势 vs 时间
        const secondaryEmfVsTime: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: '次级电动势 E2 (V)',
            xUnit: 's',
            yUnit: 'V',
            points: trajectory.map(p => ({
                x: parseFloat(p.t.toFixed(6)),
                y: parseFloat((-M * p.velocity.y).toFixed(6))
            }))
        };

        // 关键帧
        const T = 1 / f; // 周期
        const keyframes: Keyframe[] = [
            {
                label: 'I1=0, dI1/dt 最大',
                t: T / 4,
                position: { x: T / 4, y: I0 },
                velocity: { x: 0, y: 0 },
                description: `I1=${I0}A (峰值), dI1/dt=0, E2=0`
            },
            {
                label: 'I1 过零, E2 最大',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: I0 * omega },
                description: `I1=0, dI1/dt=${(I0 * omega).toFixed(3)}A/s, E2=${(-E2_amplitude).toFixed(3)}V`
            },
            {
                label: 'I1 负峰值',
                t: (3 * T) / 4,
                position: { x: (3 * T) / 4, y: -I0 },
                velocity: { x: 0, y: 0 },
                description: `I1=${(-I0).toFixed(3)}A, dI1/dt=0, E2=0`
            }
        ];

        const warnings: string[] = [];
        if (k > 0.99) {
            warnings.push('耦合系数 k>0.99 接近理想变压器，实际漏磁不可完全消除');
        }
        if (k < 0.01 && I0 > 0) {
            warnings.push('耦合系数 k<0.01，互感效应极弱');
        }
        if (E2_amplitude > 1e6) {
            warnings.push(`次级电动势幅值 ${E2_amplitude.toExponential(2)}V 极大，注意绝缘`);
        }

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '互感系数',
                formula: 'M = k * sqrt(L1 * L2)',
                calculation: `M = ${k} × sqrt(${L1} × ${L2}) = ${M.toExponential(4)} H`
            },
            {
                order: 2,
                description: '原线圈电流',
                formula: 'I1(t) = I0 * sin(omega * t)',
                calculation: `I1(t) = ${I0} × sin(${omega.toFixed(3)} × t)`
            },
            {
                order: 3,
                description: '次级感生电动势',
                formula: 'E2 = -M * dI1/dt = -M * I0 * omega * cos(omega * t)',
                calculation: `E2_peak = ${M.toExponential(4)} × ${I0} × ${omega.toFixed(3)} = ${E2_amplitude.toFixed(3)} V`
            },
            {
                order: 4,
                description: '结论',
                formula: 'E2 与 M, I0, omega 均成正比',
                result: `M=${M.toExponential(3)}H, E2_peak=${E2_amplitude.toFixed(3)}V, 相位差 90°`
            }
        ];

        const conservedQuantities: ConservedQuantity[] = [];

        return {
            meta: {
                model: 'mutual-inductance',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: {
                primary_current_vs_time: primaryCurrentVsTime,
                secondary_emf_vs_time: secondaryEmfVsTime
            },
            diagnostics: {
                conservedQuantities,
                maxValues: {
                    M_H: M,
                    E2_amplitude_V: E2_amplitude,
                    I0_A: I0,
                    omega_rad_s: omega,
                    f_Hz: f,
                    L1_H: L1,
                    L2_H: L2,
                    k_coupling: k,
                    T_period_s: T
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `互感: L1=${L1}H, L2=${L2}H, k=${k}, M=${M.toExponential(3)}H, f=${f}Hz, I0=${I0}A → E2_peak=${E2_amplitude.toFixed(3)}V`,
                steps,
                formulas: [
                    {
                        name: '互感',
                        formula: 'M = k*sqrt(L1*L2)',
                        variables: {
                            k: { value: k, unit: '' },
                            L1: { value: L1, unit: 'H' },
                            L2: { value: L2, unit: 'H' },
                            M: { value: M, unit: 'H' }
                        }
                    },
                    {
                        name: '感生电动势',
                        formula: 'E2 = -M*dI1/dt',
                        variables: {
                            M: { value: M, unit: 'H' },
                            dI1dt: { value: I0 * omega, unit: 'A/s' },
                            E2: { value: E2_amplitude, unit: 'V' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

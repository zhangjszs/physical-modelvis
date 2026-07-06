import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 共振曲线模型 — 选必一 第二章 (共振)
 *
 * 受迫振动振幅 A 随驱动频率 f_d 变化的共振峰:
 *   A(f_d) = (F0/m) / sqrt((omega_0^2 - omega_d^2)^2 + (2*beta*omega_d)^2)
 *   其中 omega_0 = sqrt(k/m), omega_d = 2*pi*f_d
 *
 * 共振峰:
 *   - beta << omega_0 时峰频率 omega_peak = sqrt(omega_0^2 - 2*beta^2) ~ omega_0
 *   - 峰高 A_peak = (F0/m) / (2*beta*sqrt(omega_0^2 - beta^2))
 *   - 品质因数 Q = omega_0 / (2*beta)
 *
 * 支持多种阻尼值对比 (同一坐标系下画多条曲线).
 */
export class ResonanceModel extends PhysicsModelBase {
    readonly name = '共振曲线';
    readonly version = '1.0.0';
    readonly description = 'A-f 共振峰: 不同阻尼下的振幅-驱动频率曲线';
    readonly modelType = 'resonance' as const;
    readonly assumptions = [
        '线性弹簧振子 (胡克定律成立)',
        '粘滞阻尼 (正比于速度)',
        '驱动力幅值 F0 恒定 (不随 f_d 变化)'
    ];
    readonly applicableRange = 'naturalFreq: 0.5--15 Hz; beta: 0.02--3';
    readonly errorSources = [
        '实际阻尼非理想粘滞 (库仑阻尼、结构阻尼等)',
        '驱动力幅值 F0 在实际装置中随 f_d 变化',
        '悬簧质量不可忽略'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'mass', description: '振子质量 (kg)', unit: 'kg', required: true, min: 0.01, max: 10 },
        {
            name: 'springConstant',
            description: '弹簧劲度系数 k (N/m)',
            unit: 'N/m',
            required: true,
            min: 0.1,
            max: 1000
        },
        { name: 'forceAmplitude', description: '驱动力幅值 F0 (N)', unit: 'N', required: true, min: 0.01, max: 100 },
        { name: 'dampingBetas', description: '阻尼系数数组 (1/s), 例 [0.1, 0.3, 0.5]', unit: '1/s', required: true },
        { name: 'freqMin', description: '频率扫描下限 (Hz)', unit: 'Hz', required: true, min: 0.1 },
        { name: 'freqMax', description: '频率扫描上限 (Hz)', unit: 'Hz', required: true, min: 0.5 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.resonance;
        if (!c) throw new Error('resonance 模型需要 resonance 约束配置');

        const m = c.mass;
        const k = c.springConstant;
        const F0 = c.forceAmplitude;
        const betas: number[] = c.dampingBetas;
        const fMin = c.freqMin;
        const fMax = c.freqMax;

        const omega0 = Math.sqrt(k / m);
        const f0 = omega0 / (2 * Math.PI);
        const N = 120;

        // 默认阻尼为数组
        if (!Array.isArray(betas) || betas.length === 0) {
            throw new Error('dampingBetas 应为非空数组');
        }

        // 单一曲线 (使用第一组阻尼画完整的共振标志曲线)
        const betaRef = betas[0]!;
        const peakF = Math.sqrt(Math.max(0, omega0 * omega0 - 2 * betaRef * betaRef)) / (2 * Math.PI);
        const peakA =
            betaRef < omega0 / Math.sqrt(2)
                ? F0 / m / (2 * betaRef * Math.sqrt(omega0 * omega0 - betaRef * betaRef))
                : F0 / m / (omega0 * omega0);
        const Q = omega0 / (2 * betaRef);

        // 主共振曲线 (betaRef)
        const resonanceCurve: ChartSeries = {
            xLabel: '驱动频率 (Hz)',
            yLabel: '稳态振幅 A (m)',
            xUnit: 'Hz',
            yUnit: 'm',
            points: []
        };

        for (let i = 0; i <= N; i++) {
            const fi = fMin + ((fMax - fMin) * i) / N;
            const omegaI = 2 * Math.PI * fi;
            const denom = Math.sqrt((omega0 * omega0 - omegaI * omegaI) ** 2 + (2 * betaRef * omegaI) ** 2);
            const Ai = denom > 1e-12 ? F0 / m / denom : 0;
            resonanceCurve.points.push({
                x: parseFloat(fi.toFixed(4)),
                y: parseFloat(Ai.toFixed(6))
            });
        }

        // 多条阻尼曲线 (按 beta 分组画)
        const multiCurve: ChartSeries = {
            xLabel: '驱动频率 (Hz)',
            yLabel: 'A (m)',
            xUnit: 'Hz',
            yUnit: 'm',
            points: []
        };
        // 用离散点区分不同 beta (通过 y 值变化)
        for (let j = 0; j < betas.length; j++) {
            const bj = betas[j]!;
            for (let i = 0; i <= N; i++) {
                const fi = fMin + ((fMax - fMin) * i) / N;
                const omegaI = 2 * Math.PI * fi;
                const denom = Math.sqrt((omega0 * omega0 - omegaI * omegaI) ** 2 + (2 * bj * omegaI) ** 2);
                const Ai = denom > 1e-12 ? F0 / m / denom : 0;
                multiCurve.points.push({
                    x: parseFloat(fi.toFixed(4)),
                    y: parseFloat(Ai.toFixed(6))
                });
            }
        }

        // 静态轨迹 (空)
        const trajectory: TrajectoryPoint[] = [
            {
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            }
        ];

        const keyframes: Keyframe[] = [
            {
                label: '固有频率 f_0',
                t: 0,
                position: { x: f0, y: peakA },
                velocity: { x: 0, y: 0 },
                description: `f_0 = ${f0.toFixed(3)} Hz (理论共振峰位置)`
            },
            {
                label: '实际峰值',
                t: 0,
                position: { x: peakF, y: peakA },
                velocity: { x: 0, y: 0 },
                description: `peak_f = ${peakF.toFixed(3)} Hz, peak_A = ${peakA.toFixed(4)} m, beta=${betaRef}`
            },
            {
                label: '品质因数 Q',
                t: 0,
                position: { x: f0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `Q = omega_0/(2*beta) = ${Q.toFixed(2)}`
            }
        ];

        const betaDesc = betas.map((bk, idx) => `beta_${idx}=${bk}`).join(', ');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '固有频率',
                formula: 'omega_0 = sqrt(k/m), f_0 = omega_0/(2*pi)',
                calculation: `f_0 = sqrt(${k.toFixed(2)}/${m.toFixed(3)})/(2*pi) = ${f0.toFixed(4)} Hz`
            },
            {
                order: 2,
                description: 'A-f 公式',
                formula: 'A = (F0/m) / sqrt((omega_0^2 - omega_d^2)^2 + (2*beta*omega_d)^2)',
                result: '阻尼越小, 峰越高越尖'
            },
            {
                order: 3,
                description: '峰值位置',
                formula: 'f_peak = sqrt(omega_0^2 - 2*beta^2) / (2*pi)',
                calculation: `f_peak = ${peakF.toFixed(4)} Hz (beta=${betaRef})`
            },
            {
                order: 4,
                description: '品质因数',
                formula: 'Q = omega_0 / (2*beta)',
                calculation: `Q = ${Q.toFixed(2)}`
            }
        ];

        const warnings: string[] = [];
        if (peakA > 1) warnings.push('共振振幅过大, 超出小振幅假设');
        if (Q > 50) warnings.push('Q 值极高, 数值精度需注意');

        // betaValues 对象传递给 diagnostics
        const betaValues: Record<string, number> = {};
        betas.forEach((bk, idx) => {
            betaValues[`beta_${idx}`] = bk;
        });

        return {
            meta: {
                model: 'resonance',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: {
                A_f_drive: resonanceCurve,
                multi_damping_curves: multiCurve
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    f0,
                    peakF,
                    peakA,
                    Q,
                    betaRef,
                    ...betaValues
                },
                flags: {
                    hasMultipleDamping: betas.length > 1
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `共振: f_0=${f0.toFixed(3)}Hz; peak=${peakF.toFixed(3)}Hz; peak_A=${peakA.toFixed(4)}m; Q=${Q.toFixed(2)}; ${betaDesc}`,
                steps,
                formulas: [
                    {
                        name: '共振幅频',
                        formula: 'A(f) = (F0/m) / sqrt((omega_0^2 - omega^2)^2 + (2*beta*omega)^2)',
                        variables: {}
                    },
                    {
                        name: '峰值频率',
                        formula: 'omega_peak = sqrt(omega_0^2 - 2*beta^2)',
                        variables: { peakF: { value: peakF, unit: 'Hz' } }
                    },
                    { name: '品质因数', formula: 'Q = omega_0 / (2*beta)', variables: { Q: { value: Q, unit: '' } } }
                ]
            },
            errors: [],
            warnings
        };
    }
}

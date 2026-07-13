import { PhysicsModelBase } from './base.js';
import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, ChartSeries } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';

/**
 * 衰变统计规律模型 — 选必三 第五章 (泊松→高斯, σ≈√N̄)
 */
export class DecayStatisticsModel extends PhysicsModelBase {
    readonly name = '衰变统计规律';
    readonly version = '1.0.0';
    readonly description = '泊松分布(小N)→高斯分布(大N), σ≈√N̄';
    readonly modelType = 'decay-statistics' as const;
    readonly assumptions = ['独立性', '恒定概率', '大量样本'];
    readonly applicableRange = 'N̄: 1-1000; nTrials: 100-10000';
    readonly errorSources = ['探测器效率', '本底噪声'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'meanCount', unit: '', description: '平均计数 N̄', required: true, min: 1, max: 1000 },
        { name: 'nTrials', unit: '', description: '试验次数', required: true, min: 10, max: 10000 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);
        const c = problem.constraints?.decayStatistics;
        if (!c) throw new Error('decay-statistics 需要 decayStatistics 约束');
        const lambda = c.meanCount;
        const nTrials = c.nTrials;
        const N = c.sampleCount ?? 1000;

        const pseudoRand = (seed: number) => {
            let s = seed;
            return () => {
                s = (s * 1103515245 + 12345) & 0x7fffffff;
                return s / 0x7fffffff;
            };
        };
        const rng = pseudoRand(42);
        const poisson = (lam: number): number => {
            const L = Math.exp(-lam);
            let k = 0,
                p = 1;
            do {
                k++;
                p *= rng();
            } while (p > L);
            return k - 1;
        };

        const counts: number[] = [];
        for (let i = 0; i < N; i++) counts.push(poisson(lambda));
        const maxCount = Math.max(...counts, Math.ceil(lambda * 2));
        const histogram: number[] = Array.from({ length: maxCount + 1 }, () => 0);
        counts.forEach(n => {
            if (n <= maxCount) histogram[n]++;
        });

        const x_t: ChartSeries = { xLabel: 'N (计数)', yLabel: '频数', xUnit: '', yUnit: '', points: [] };
        const y_t: ChartSeries = { xLabel: 'N', yLabel: '高斯拟合', xUnit: '', yUnit: '', points: [] };
        const trajectory: TrajectoryPoint[] = [];
        const sigma = Math.sqrt(lambda);

        for (let n = 0; n <= maxCount; n++) {
            x_t.points.push({ x: n, y: histogram[n] ?? 0 });
            const gauss =
                N * (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-((n - lambda) ** 2) / (2 * sigma * sigma));
            y_t.points.push({ x: n, y: parseFloat(gauss.toFixed(1)) });
            if (n < 50)
                trajectory.push({ t: n * 0.01, position: { x: n, y: histogram[n] ?? 0 }, velocity: { x: 0, y: 0 } });
        }

        return {
            meta: this.makeMeta('numerical'),
            trajectories: [trajectory],
            keyframes: [
                {
                    label: '均值',
                    t: 0,
                    position: { x: lambda, y: histogram[Math.round(lambda)] ?? 0 },
                    velocity: { x: 0, y: 0 },
                    description: `N̄=${lambda}, σ=${sigma.toFixed(2)}`
                }
            ],
            charts: { x_t, y_t },
            diagnostics: {
                conservedQuantities: [],
                maxValues: { lambda, sigma, maxBin: Math.max(...histogram) },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `衰变统计: N̄=${lambda}, σ=${sigma.toFixed(2)}, n=${nTrials}次`,
                steps: [
                    { order: 1, description: '泊松分布', formula: 'P(N) = λ^N·e^(-λ)/N!', result: `λ=${lambda}` },
                    { order: 2, description: '标准差', formula: 'σ = √λ', result: `σ = ${sigma.toFixed(2)}` }
                ],
                formulas: [
                    {
                        name: '泊松',
                        formula: 'P(N)=λ^N·e^(-λ)/N!',
                        variables: { lambda: { value: lambda, unit: '' }, sigma: { value: sigma, unit: '' } }
                    }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

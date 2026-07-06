import { PhysicsModelBase } from './base.js';
import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, ChartSeries } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';

/**
 * 核裂变链式反应模型 — 选必三 第五章
 * k = 增殖因子: N_gen = N0 · k^gen
 * k=1 临界, k>1 超临界(指数增长), k<1 次临界(衰减)
 */
export interface FissionChainConstraint {
    readonly multiplicationFactor: number;
    readonly generations: number;
    readonly initialNeutrons?: number;
}

export class FissionChainModel extends PhysicsModelBase {
    readonly name = '核裂变链式反应';
    readonly version = '1.0.0';
    readonly description = 'k=临界, 链式反应指数 N_gen = N0·k^gen';
    readonly modelType = 'fission-chain' as const;
    readonly assumptions = ['瞬发中子', '无中子吸收', '无泄漏'];
    readonly applicableRange = 'k: 0.5-1.5; gen: 3-30';
    readonly errorSources = ['缓发中子', '热中子扩散', '控制棒'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'multiplicationFactor', unit: '', description: 'k (有效增殖因子)', required: true, min: 0.1, max: 2 },
        { name: 'generations', unit: '', description: '代数', required: true, min: 1, max: 50 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);
        const c = problem.constraints?.fissionChain;
        if (!c) throw new Error('fission-chain 需要 fissionChain 约束');
        const k = c.multiplicationFactor,
            genMax = c.generations,
            N0 = c.initialNeutrons ?? 1;

        const x_t: ChartSeries = { xLabel: '代数 g', yLabel: '中子数 N', xUnit: '', yUnit: '', points: [] };
        const y_t: ChartSeries = { xLabel: '代数 g', yLabel: '累计裂变数', xUnit: '', yUnit: '', points: [] };
        const trajectory: TrajectoryPoint[] = [];

        let total = 0;
        for (let g = 0; g <= genMax; g++) {
            const Ng = N0 * Math.pow(k, g);
            total += Ng;
            x_t.points.push({ x: g, y: parseFloat(Ng.toFixed(1)) });
            y_t.points.push({ x: g, y: parseFloat(total.toFixed(1)) });
            trajectory.push({ t: g * 0.1, position: { x: g, y: Ng }, velocity: { x: 0, y: 0 } });
        }

        const kStatus = Math.abs(k - 1) < 1e-6 ? '临界' : k > 1 ? '超临界(k>1)' : '次临界(k<1)';
        const E_tot = total * 200e6 * 1.602e-19;

        return {
            meta: {
                model: 'fission-chain',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes: [
                {
                    label: '当前状态',
                    t: 0,
                    position: { x: genMax, y: N0 * Math.pow(k, genMax) },
                    velocity: { x: 0, y: 0 },
                    description: `k=${k}, ${kStatus}`
                }
            ],
            charts: { x_t, y_t },
            diagnostics: {
                conservedQuantities: [],
                maxValues: { k, genMax, Nfinal: N0 * Math.pow(k, genMax), totalFissions: total },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `链式反应: k=${k}, N0=${N0}, gen=${genMax}, ${kStatus}, E≈${(E_tot / 1e6).toFixed(1)}MJ`,
                steps: [
                    {
                        order: 1,
                        description: '增殖公式',
                        formula: 'N_g = N0 · k^g',
                        result: `N_${genMax} = ${N0} × ${k}^${genMax} = ${(N0 * Math.pow(k, genMax)).toFixed(2)}`
                    },
                    { order: 2, description: '临界条件', formula: 'k=1 临界; k>1 超临界; k<1 次临界', result: kStatus }
                ],
                formulas: [
                    {
                        name: '增殖',
                        formula: 'N_g = N0·k^g',
                        variables: { k: { value: k, unit: '' }, genMax: { value: genMax, unit: '' } }
                    }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

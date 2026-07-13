import { PhysicsModelBase } from './base.js';
import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, ChartSeries } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';

/**
 * 放射线磁场偏转模型 — 选必三 第五章
 * α: 带正电, 偏转半径大; β: 带负电, 偏转半径小; γ: 不带电, 不偏转
 */
export class RadiationDeflectionModel extends PhysicsModelBase {
    readonly name = '放射线磁场偏转';
    readonly version = '1.0.0';
    readonly description = 'α/β/γ 在匀强磁场中的偏转轨迹对比';
    readonly modelType = 'radiation-deflection' as const;
    readonly assumptions = ['匀强磁场', '垂直入射', '非相对论近似'];
    readonly applicableRange = 'B: 0.01-5 T; E: 0.1-20 MeV';
    readonly errorSources = ['相对论效应(β 接近光速)', '磁场不均匀'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'Bfield', unit: 'T', description: '磁感应强度', required: true, min: 0.001, max: 10 },
        { name: 'particleEnergy', unit: 'MeV', description: '粒子动能', required: true, min: 0.01, max: 50 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);
        const c = problem.constraints?.radiationDeflection;
        if (!c) throw new Error('radiation-deflection 需要 radiationDeflection 约束');
        const B = c.Bfield,
            E_MeV = c.particleEnergy,
            type = c.particleType;
        const e = 1.602e-19,
            MeV_to_J = 1.602e-13;

        let m: number, q: number, label: string;
        if (type === 'alpha') {
            m = 4 * 1.66e-27;
            q = 2 * e;
            label = 'α';
        } else if (type === 'beta') {
            m = 9.109e-31;
            q = -e;
            label = 'β';
        } else {
            m = 1;
            q = 0;
            label = 'γ';
        }

        const E_J = E_MeV * MeV_to_J;
        const v = type === 'gamma' ? 3e8 : Math.sqrt((2 * E_J) / m);
        const r = q > 0 ? (m * v) / (q * B) : 0;

        const x_t: ChartSeries = { xLabel: 'x (m)', yLabel: 'y (m)', xUnit: 'm', yUnit: 'm', points: [] };
        const y_t: ChartSeries = { xLabel: 'x (m)', yLabel: 'y (m)', xUnit: 'm', yUnit: 'm', points: [] };
        const trajectory: TrajectoryPoint[] = [];

        if (type === 'gamma') {
            for (let i = 0; i <= 20; i++) {
                const x = i * 0.1;
                x_t.points.push({ x, y: 0 });
                trajectory.push({ t: i * 0.01, position: { x, y: 0 }, velocity: { x: 0, y: 0 } });
            }
        } else {
            const sign = type === 'alpha' ? 1 : -1;
            for (let i = 0; i <= 50; i++) {
                const phi = ((i / 50) * Math.PI) / 2;
                const x = sign * r * Math.sin(phi);
                const y = r * (1 - Math.cos(phi));
                x_t.points.push({ x: parseFloat(x.toFixed(4)), y: parseFloat(y.toFixed(4)) });
                trajectory.push({ t: i * 0.01, position: { x, y }, velocity: { x: 0, y: 0 } });
            }
        }

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes: [
                {
                    label: '入射',
                    t: 0,
                    position: { x: 0, y: 0 },
                    velocity: { x: v, y: 0 },
                    description: `${label} 粒子, E=${E_MeV}MeV, B=${B}T`
                }
            ],
            charts: { x_t, y_t },
            diagnostics: {
                conservedQuantities: [],
                maxValues: { B, E_MeV, v, r },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `${label} 射线: E=${E_MeV}MeV, B=${B}T, r=${r.toFixed(4)}m`,
                steps: [
                    {
                        order: 1,
                        description: '洛伦兹力',
                        formula: 'qvB = mv²/r',
                        result: `r = mv/(qB) = ${r.toFixed(4)} m`
                    },
                    { order: 2, description: '三种射线对比', result: 'α 偏转半径 > β; γ 不偏转' }
                ],
                formulas: [
                    {
                        name: '回旋半径',
                        formula: 'r = mv/(qB)',
                        variables: {
                            m: { value: m, unit: 'kg' },
                            v: { value: v, unit: 'm/s' },
                            r: { value: r, unit: 'm' }
                        }
                    }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

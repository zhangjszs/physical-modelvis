import { PhysicsModelBase } from './base.js';
import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, ChartSeries } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';

/**
 * α 粒子散射模型 — 选必三 第五章 (卢瑟福散射)
 * b = (q1*q2)/(4*pi*eps0*m*v^2) * cot(theta/2)
 */
export interface AlphaScatteringConstraint {
    readonly alphaEnergy: number; // MeV
    readonly targetZ: number; // 核电荷数
    readonly foilThickness?: number;
    readonly nParticles?: number;
    readonly impactParamMax?: number;
}

export class AlphaScatteringModel extends PhysicsModelBase {
    readonly name = 'α 粒子散射';
    readonly version = '1.0.0';
    readonly description = '卢瑟福核式结构: 绝大多数直线穿过, 极少数反弹';
    readonly modelType = 'alpha-scattering' as const;
    readonly assumptions = ['点电荷', '单次散射', '非相对论', '薄箔'];
    readonly applicableRange = 'E: 1-10 MeV; Z: 1-92';
    readonly errorSources = ['多次散射', '电子屏蔽'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'alphaEnergy', unit: 'MeV', description: 'α 粒子能量', required: true, min: 0.5, max: 15 },
        { name: 'targetZ', unit: '', description: '靶核电荷数', required: true, min: 1, max: 92 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);
        const c = problem.constraints?.alphaScattering;
        if (!c) throw new Error('alpha-scattering 需要 alphaScattering 约束');
        const E_MeV = c.alphaEnergy;
        const Z = c.targetZ;
        const eSq = 1.44; // MeV·fm
        const k = (2 * Z * eSq) / (E_MeV * 5.0); // 碰撞参数常数 (fm)
        const n = c.nParticles ?? 100;
        const bMax = c.impactParamMax ?? 50;

        const thetaDist: ChartSeries = {
            xLabel: '散射角 (度)',
            yLabel: '粒子数',
            xUnit: 'deg',
            yUnit: '',
            points: Array.from({ length: 18 }, (_, i) => ({ x: (i + 1) * 10, y: 0 }))
        };
        const x_t: ChartSeries = { xLabel: 'x (fm)', yLabel: 'y (fm)', xUnit: 'fm', yUnit: 'fm', points: [] };
        const y_t: ChartSeries = { xLabel: 'x (fm)', yLabel: 'y (fm)', xUnit: 'fm', yUnit: 'fm', points: [] };
        const trajectories: TrajectoryPoint[][] = [];

        for (let i = 0; i < n; i++) {
            const b = Math.random() * bMax;
            const theta = 2 * Math.atan2(k, b + 1e-6);
            const thetaDeg = (theta * 180) / Math.PI;
            const bin = Math.min(17, Math.floor(thetaDeg / 10));
            thetaDist.points[bin]!.y += 1;

            // trajectory for first few (每条粒子独立为一条 TrajectoryPoint[], t 单调非降)
            if (i < 5) {
                const x0 = -100,
                    y0 = b;
                const phi = Math.PI - theta;
                const track: TrajectoryPoint[] = [];
                for (let s = 0; s <= 20; s++) {
                    const t = s / 20;
                    let x: number, y: number;
                    if (t < 0.5) {
                        x = x0 + t * 2 * 100;
                        y = y0;
                    } else {
                        x = x0 + 100 + (t - 0.5) * 2 * 100 * Math.cos(phi);
                        y = y0 + (t - 0.5) * 2 * 100 * Math.sin(phi);
                    }
                    track.push({
                        t: s * 0.1,
                        position: { x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)) },
                        velocity: { x: 0, y: 0 }
                    });
                }
                trajectories.push(track);
                x_t.points.push({ x: parseFloat(x0.toFixed(1)), y: parseFloat(y0.toFixed(1)) });
                y_t.points.push({ x: parseFloat((x0 + 100).toFixed(1)), y: parseFloat(y0.toFixed(1)) });
            }
        }

        return {
            meta: {
                model: 'alpha-scattering',
                solver: 'numerical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: trajectories,
            keyframes: [
                {
                    label: '入射',
                    t: 0,
                    position: { x: -100, y: 0 },
                    velocity: { x: 1, y: 0 },
                    description: `n=${n}, E=${E_MeV}MeV, Z=${Z}`
                }
            ],
            charts: { x_t: thetaDist, y_t: x_t, v_t: y_t },
            diagnostics: {
                conservedQuantities: [],
                maxValues: { E_MeV, Z, k, n },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `α 散射: E=${E_MeV}MeV, Z=${Z}, k=${k.toFixed(2)}fm`,
                steps: [
                    {
                        order: 1,
                        description: '碰撞参数',
                        formula: 'b = (Z·e²)/(4πε₀·E) · cot(θ/2)',
                        result: `k=${k.toFixed(2)} fm`
                    },
                    { order: 2, description: '结论', formula: '绝大多数直线穿过', result: '说明原子核极小, 核式结构' }
                ],
                formulas: [
                    {
                        name: '碰撞参数',
                        formula: 'b = k·cot(θ/2)',
                        variables: { k: { value: parseFloat(k.toFixed(3)), unit: 'fm' } }
                    }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

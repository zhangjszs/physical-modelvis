import { PhysicsModelBase } from './base.js';
import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, ChartSeries } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';

/**
 * 宇宙射线模型 — 选必三 第五章 (μ 子计数率 vs 高度/屏蔽)
 */
export class CosmicRayModel extends PhysicsModelBase {
    readonly name = '宇宙射线';
    readonly version = '1.0.0';
    readonly description = 'μ 子计数率 vs 海拔高度 / 屏蔽材料';
    readonly modelType = 'cosmic-ray' as const;
    readonly assumptions = ['海平面率 ~1 cm^-2 min^-1', '各向同性'];
    readonly applicableRange = 'h: 0-30000 m; thickness: 0-200 cm';
    readonly errorSources = ['太阳活动', '气象变化'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'altitude', unit: 'm', description: '海拔高度', required: true, min: 0, max: 40000 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);
        const c = problem.constraints?.cosmicRay;
        if (!c) throw new Error('cosmic-ray 需要 cosmicRay 约束');
        const h = c.altitude,
            mode = c.shieldingMode,
            thick = c.shieldThickness ?? 50;

        const rateSeaLevel = 1.0; // per cm² per min
        const hScale = 1500; // 大气标高 (m)
        const rateAtAlt = rateSeaLevel * (h < hScale ? 1 + (h / 1000) * 0.5 : Math.exp((h - hScale) / hScale) * 1.5);

        let mu = 0.05;
        if (mode === 'lead') mu = 1.2;
        else if (mode === 'water') mu = 0.1;
        const rateShielded = rateAtAlt * Math.exp((-mu * thick) / 10);

        const x_t: ChartSeries = { xLabel: '海拔 (m)', yLabel: '相对计数率', xUnit: 'm', yUnit: '', points: [] };
        const y_t: ChartSeries = { xLabel: '屏蔽厚度 (cm)', yLabel: '透射率', xUnit: 'cm', yUnit: '', points: [] };
        const trajectory: TrajectoryPoint[] = [];

        for (let hi = 0; hi <= 30000; hi += 1000) {
            const rateHi =
                rateSeaLevel * (hi < hScale ? 1 + (hi / 1000) * 0.5 : Math.exp((hi - hScale) / hScale) * 1.5);
            x_t.points.push({ x: hi, y: parseFloat((rateHi / rateSeaLevel).toFixed(3)) });
        }
        for (let ti = 0; ti <= 200; ti += 5) {
            const trans = Math.exp((-mu * ti) / 10);
            y_t.points.push({ x: ti, y: parseFloat(trans.toFixed(4)) });
            if (ti < 50) trajectory.push({ t: ti * 0.01, position: { x: ti, y: trans }, velocity: { x: 0, y: 0 } });
        }

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes: [
                {
                    label: '当前',
                    t: 0,
                    position: { x: h, y: rateAtAlt },
                    velocity: { x: 0, y: 0 },
                    description: `h=${h}m, rate=${rateAtAlt.toFixed(2)}`
                }
            ],
            charts: { x_t, y_t },
            diagnostics: {
                conservedQuantities: [],
                maxValues: { h, rateAtAlt, rateShielded, mu },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `宇宙射线: h=${h}m, rate=${rateAtAlt.toFixed(2)}, shield=${mode}(${thick}cm), trans=${((rateShielded / rateAtAlt) * 100).toFixed(1)}%`,
                steps: [
                    {
                        order: 1,
                        description: '高度关系',
                        formula: 'I(h) ∝ exp(h/h_scale)',
                        result: `h_scale=${hScale}m`
                    },
                    { order: 2, description: '屏蔽衰减', formula: 'I = I0·exp(-μx)', result: `μ=${mu} cm⁻¹` }
                ],
                formulas: [
                    { name: '指数衰减', formula: 'I = I0·exp(-μx)', variables: { mu: { value: mu, unit: 'cm⁻¹' } } }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

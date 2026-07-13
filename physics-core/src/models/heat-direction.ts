import { PhysicsModelBase } from './base.js';
import { sampleTrajectory } from '../physics/kinematics.js';
import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, ChartSeries } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';

/**
 * 热传导方向性模型 — 选必三 第三章 (克劳修斯表述)
 * 热量自发从高温物体传向低温物体, 最终达到热平衡.
 */
export class HeatDirectionModel extends PhysicsModelBase {
    readonly name = '热传导方向性';
    readonly version = '1.0.0';
    readonly description = '克劳修斯表述: 热量自发从高温传向低温';
    readonly modelType = 'heat-direction' as const;
    readonly assumptions = ['两物体热容相同', '无环境热损失', '接触面积恒定'];
    readonly applicableRange = 'T: 200-500 K, k: 0.1-100 W/(m·K)';
    readonly errorSources = ['环境热交换', '温度测量误差'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'hotTemp', description: '高温 (K)', unit: 'K', required: true, min: 200, max: 600 },
        { name: 'coldTemp', description: '低温 (K)', unit: 'K', required: true, min: 100, max: 400 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);
        const c = problem.constraints?.heatDirection;
        if (!c) throw new Error('heat-direction 需要 heatDirection 约束');
        const T1 = c.hotTemp,
            T2 = c.coldTemp,
            k = c.thermalConductivity;
        const Teq = (T1 + T2) / 2;
        const tau = 10 / (k + 0.01);
        const N = c.sampleCount ?? 100;
        const dur = c.duration ?? 5 * tau;

        // 解析解采样: 热传导指数趋衡 T(t)=Teq+(T0-Teq)·e^{-t/τ} (公共脚手架 sampleTrajectory)
        const trajectory = sampleTrajectory({
            sampleCount: N,
            duration: dur,
            sampleAt: t => ({
                position: {
                    x: Teq + (T1 - Teq) * Math.exp(-t / tau),
                    y: Teq + (T2 - Teq) * Math.exp(-t / tau)
                },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            })
        });
        // ChartSeries 由 trajectory 派生 (保持与原来 parseFloat(·.toFixed(2)) 一致的格式化语义)
        const x_t: ChartSeries = {
            xLabel: 't (s)',
            yLabel: 'T_hot (K)',
            xUnit: 's',
            yUnit: 'K',
            points: trajectory.map(p => ({ x: p.t, y: parseFloat(p.position.x.toFixed(2)) }))
        };
        const y_t: ChartSeries = {
            xLabel: 't (s)',
            yLabel: 'T_cold (K)',
            xUnit: 's',
            yUnit: 'K',
            points: trajectory.map(p => ({ x: p.t, y: parseFloat(p.position.y.toFixed(2)) }))
        };

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes: [
                {
                    label: '初始',
                    t: 0,
                    position: { x: T1, y: T2 },
                    velocity: { x: 0, y: 0 },
                    description: `T_hot=${T1}K, T_cold=${T2}K`
                },
                {
                    label: '平衡',
                    t: dur,
                    position: { x: Teq, y: Teq },
                    velocity: { x: 0, y: 0 },
                    description: `T_eq=${Teq.toFixed(1)}K`
                }
            ],
            charts: { x_t, y_t },
            diagnostics: {
                conservedQuantities: [],
                maxValues: { T1, T2, Teq, k, tau },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `热传导: T_hot=${T1}K→${Teq.toFixed(1)}K, T_cold=${T2}K→${Teq.toFixed(1)}K`,
                steps: [
                    {
                        order: 1,
                        description: '克劳修斯表述',
                        formula: '热量自发从高温→低温',
                        result: `T_eq = (${T1}+${T2})/2 = ${Teq.toFixed(1)}K`
                    }
                ],
                formulas: [
                    {
                        name: '热平衡',
                        formula: 'T_eq = (T1+T2)/2',
                        variables: { T1: { value: T1, unit: 'K' }, T2: { value: T2, unit: 'K' } }
                    }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';
import { kineticEnergy, sampleTrajectory } from '../physics/kinematics.js';

/** 匀速直线运动模型 */
export class UniformLinearModel extends PhysicsModelBase {
    readonly name = '匀速直线运动';
    readonly version = '1.0.0';
    readonly description = '物体以恒定速度沿直线运动';
    readonly modelType = 'uniform-linear' as const;
    readonly assumptions = ['物体视为质点', '速度恒定 (加速度为零)', '无外力作用', '忽略空气阻力'];
    readonly applicableRange = '适用于任何匀速直线运动场景';
    readonly errorSources = ['实际场景中难以实现完全无摩擦', '测量速度时的仪器误差'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'initialVelocity', description: '初速度 (m/s)', unit: 'm/s', required: true },
        { name: 'duration', description: '运动时长 (s)', unit: 's', required: true, min: 0 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const body = problem.bodies[0];
        const v0 = body.velocity;
        const x0 = body.position;
        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 1000;
        const mass = body.mass.value;

        // 解析解采样: x = x₀ + v₀t (公共脚手架 sampleTrajectory)
        const trajectory = sampleTrajectory({
            sampleCount, duration,
            sampleAt: (t) => ({
                position: Vec2.add(x0, Vec2.scale(v0, t)),
                velocity: { ...v0 },
                acceleration: Vec2.zero(),
                kineticEnergy: kineticEnergy(mass, Vec2.magnitude(v0)),
                potentialEnergy: 0
            })
        });

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '起始点',
                t: 0,
                position: { ...x0 },
                velocity: { ...v0 },
                description: `物体从 (${x0.x}, ${x0.y}) 以速度 (${v0.x}, ${v0.y}) m/s 开始运动`
            },
            {
                label: '终点',
                t: duration,
                position: Vec2.add(x0, Vec2.scale(v0, duration)),
                velocity: { ...v0 },
                description: `物体在 t=${duration}s 时到达终点`
            }
        ];

        // 图表数据
        const x_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '位移',
            xUnit: 's',
            yUnit: 'm',
            points: trajectory.map(p => ({ x: p.t, y: Vec2.magnitude(Vec2.sub(p.position, x0)) }))
        };
        const v_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '速度',
            xUnit: 's',
            yUnit: 'm/s',
            points: trajectory.map(p => ({ x: p.t, y: Vec2.magnitude(p.velocity) }))
        };

        const speed = Vec2.magnitude(v0);

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t, v_t },
            diagnostics: {
                conservedQuantities: [
                    {
                        name: '动能',
                        law: '能量守恒',
                        initialValue: 0.5 * body.mass.value * speed * speed,
                        finalValue: 0.5 * body.mass.value * speed * speed,
                        maxDeviation: 0,
                        tolerance: 1e-10,
                        conserved: true
                    }
                ],
                maxValues: { speed, distance: speed * duration },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `物体以恒定速度 ${speed.toFixed(2)} m/s 做匀速直线运动，${duration} 秒后位移 ${(speed * duration).toFixed(2)} m`,
                steps: [
                    {
                        order: 1,
                        description: '匀速直线运动的速度恒定',
                        formula: 'v = v₀',
                        result: `v = ${speed.toFixed(2)} m/s`
                    },
                    {
                        order: 2,
                        description: '位移公式',
                        formula: 'x = x₀ + vt',
                        calculation: `x = ${x0.x} + ${speed.toFixed(2)} × ${duration}`,
                        result: `x = ${(x0.x + speed * duration).toFixed(2)} m`
                    }
                ],
                formulas: [
                    {
                        name: '匀速直线运动位移公式',
                        formula: 'x = x₀ + vt',
                        variables: {
                            'x₀': { value: x0.x, unit: 'm' },
                            v: { value: speed, unit: 'm/s' },
                            t: { value: duration, unit: 's' }
                        }
                    }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

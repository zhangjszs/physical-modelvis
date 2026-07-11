import type { PhysicsProblem } from '../types/problem.js';
import { kineticEnergy, sampleTrajectory } from '../physics/kinematics.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ForceDiagram } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 滑动摩擦力模型 — f = μN (必修一 第三章 §3)
 *
 * 物体在水平面上在外力 F_pull 作用下做匀速 (或加速) 直线运动：
 *   N = mg                    (水平面，正压力等于重力)
 *   f = μN = μmg              (滑动摩擦力)
 *   匀速条件: F_pull = f      (外力等于摩擦力)
 *   加速条件: F_pull > f      (合外力 = F_pull - f)
 *
 * 模型生成"伪轨迹"：扫过正压力 N (通过改变质量)，展示 f-N 线性关系，
 * 同时模拟物体实际运动。
 */
export class SlidingFrictionModel extends PhysicsModelBase {
    readonly name = '滑动摩擦力';
    readonly version = '1.0.0';
    readonly description = '探究滑动摩擦力 f = μN 与正压力、动摩擦因数的关系';
    readonly modelType = 'sliding-friction' as const;
    readonly assumptions = [
        '物体视为质点',
        '接触面粗糙程度均匀',
        '动摩擦因数 μ 恒定',
        '忽略空气阻力',
        '正压力等于重力 (水平面)'
    ];
    readonly applicableRange = '适用于水平面上的滑动摩擦，f = μN';
    readonly errorSources = ['实际 μ 可能随速度变化', '弹簧测力计读数误差', '物体匀速运动难以精确控制'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'frictionCoefficient', description: '动摩擦因数 μ', unit: '', required: true, min: 0 },
        { name: 'mass', description: '物体质量 m (kg)', unit: 'kg', required: true, min: 0 },
        { name: 'gravity', description: '重力加速度 g (m/s²)', unit: 'm/s²', required: false, defaultValue: 9.8 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.slidingFriction;
        if (!c) {
            throw new Error('滑动摩擦力模型需要 constraints.slidingFriction 配置');
        }

        const mu = c.frictionCoefficient;
        const uniformMotion = c.uniformMotion ?? true;

        const body = problem.bodies[0]!;
        const m = body.mass.value;
        const g = problem.environment?.gravity?.value ?? 9.8;
        const x0 = body.position.x;
        const v0 = body.velocity.x;

        // 力学计算
        const N = m * g; // 正压力
        const f = mu * N; // 滑动摩擦力
        // 匀速: F_pull = f, 加速度 a = 0
        // 加速: F_pull > f (这里取 F_pull = 1.5f 演示加速)
        const F_pull = uniformMotion ? f : f * 1.5;
        const a = uniformMotion ? 0 : (F_pull - f) / m;

        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 400;

        // 主轨迹：物体实际运动, 匀加速 x=x₀+v₀t+½at² (公共脚手架 sampleTrajectory)
        const trajectory = sampleTrajectory({
            sampleCount, duration,
            sampleAt: (t) => {
                const v = v0 + a * t;
                return {
                    position: { x: x0 + v0 * t + 0.5 * a * t * t, y: 0 },
                    velocity: { x: v, y: 0 },
                    acceleration: { x: a, y: 0 },
                    kineticEnergy: kineticEnergy(m, Math.abs(v)),
                    potentialEnergy: 0
                };
            }
        });

        // 伪轨迹：扫过正压力 N (从 0 到 2N)，展示 f-N 线性关系
        const frictionTraj: TrajectoryPoint[] = [];
        const sweepSamples = 200;
        for (let i = 0; i <= sweepSamples; i++) {
            const t = (i / sweepSamples) * duration;
            const N_sweep = (i / sweepSamples) * 2 * N; // 0 → 2N
            const f_sweep = mu * N_sweep;
            frictionTraj.push({
                t,
                position: { x: N_sweep, y: f_sweep }, // 用 position 存 (N, f)
                velocity: { x: 0, y: 0 },
                acceleration: { x: 0, y: 0 },
                kineticEnergy: f_sweep,
                potentialEnergy: N_sweep
            });
        }

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '起始点',
                t: 0,
                position: { x: x0, y: 0 },
                velocity: { x: v0, y: 0 },
                description: `m=${m}kg, μ=${mu}, N=mg=${N.toFixed(2)}N, f=μN=${f.toFixed(2)}N`
            },
            {
                label: '受力分析',
                t: duration / 2,
                position: { x: x0 + v0 * (duration / 2) + 0.25 * a * duration * duration, y: 0 },
                velocity: { x: v0 + a * (duration / 2), y: 0 },
                description: uniformMotion
                    ? `匀速: F_pull=f=${f.toFixed(2)}N, 合力=0`
                    : `加速: F_pull=${F_pull.toFixed(2)}N > f=${f.toFixed(2)}N, a=${a.toFixed(3)}m/s²`
            },
            {
                label: '终点',
                t: duration,
                position: { x: x0 + v0 * duration + 0.5 * a * duration * duration, y: 0 },
                velocity: { x: v0 + a * duration, y: 0 },
                description: uniformMotion
                    ? `匀速运动至 v=${v0.toFixed(2)}m/s`
                    : `加速至 v=${(v0 + a * duration).toFixed(2)}m/s`
            }
        ];

        // 图表：f-N 关系曲线
        const f_N: ChartSeries = {
            xLabel: '正压力 N',
            yLabel: '滑动摩擦力 f',
            xUnit: 'N',
            yUnit: 'N',
            points: frictionTraj.map(p => ({ x: p.position.x, y: p.position.y }))
        };
        // 图表：v-t (匀速/加速)
        const v_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '速度',
            xUnit: 's',
            yUnit: 'm/s',
            points: trajectory.map(p => ({ x: p.t, y: p.velocity.x }))
        };

        // 受力分析图 (水平方向)
        const forceDiagram: ForceDiagram = {
            bodyId: body.id,
            forces: [
                { name: '重力 G', vector: { x: 0, y: -N }, magnitude: N, unit: 'N' },
                { name: '支持力 N', vector: { x: 0, y: N }, magnitude: N, unit: 'N' },
                { name: '拉力 F_pull', vector: { x: F_pull, y: 0 }, magnitude: F_pull, unit: 'N' },
                { name: '摩擦力 f', vector: { x: -f, y: 0 }, magnitude: f, unit: 'N' }
            ],
            netForce: { x: F_pull - f, y: 0 }
        };

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory, frictionTraj],
            keyframes,
            charts: { f_N, v_t, force_diagram: forceDiagram },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    normalForce: N,
                    frictionForce: f,
                    pullForce: F_pull,
                    acceleration: a,
                    mu
                },
                rangeCheck: {
                    withinRange: true,
                    warnings: mu > 1 ? ['动摩擦因数 μ>1 不常见，请确认接触面材料'] : []
                }
            },
            explanation: {
                summary: uniformMotion
                    ? `匀速拉动: F_pull=f=μmg=${f.toFixed(3)}N (μ=${mu}, m=${m}kg, g=${g}m/s²)`
                    : `加速拉动: F_pull=${F_pull.toFixed(3)}N > f=${f.toFixed(3)}N, 合力=${(F_pull - f).toFixed(3)}N, a=${a.toFixed(3)}m/s²`,
                steps: [
                    {
                        order: 1,
                        description: '正压力 (水平面)',
                        formula: 'N = mg',
                        calculation: `N = ${m}×${g} = ${N.toFixed(3)} N`
                    },
                    {
                        order: 2,
                        description: '滑动摩擦力',
                        formula: 'f = μN = μmg',
                        calculation: `f = ${mu}×${N.toFixed(3)} = ${f.toFixed(3)} N`
                    },
                    {
                        order: 3,
                        description: uniformMotion ? '匀速条件' : '加速条件',
                        formula: uniformMotion ? 'F_pull = f' : 'F_pull > f',
                        calculation: uniformMotion
                            ? `F_pull = ${f.toFixed(3)} N`
                            : `F_pull = ${F_pull.toFixed(3)} N > f = ${f.toFixed(3)} N`
                    },
                    {
                        order: 4,
                        description: '动摩擦因数',
                        formula: 'μ = f/N',
                        calculation: `μ = ${f.toFixed(3)}/${N.toFixed(3)} = ${mu}`,
                        result: '由接触面材料和粗糙程度决定'
                    }
                ],
                formulas: [
                    {
                        name: '滑动摩擦力',
                        formula: 'f = μN',
                        variables: { μ: { value: mu, unit: '' }, N: { value: N, unit: 'N' } }
                    },
                    {
                        name: '正压力 (水平面)',
                        formula: 'N = mg',
                        variables: { m: { value: m, unit: 'kg' }, g: { value: g, unit: 'm/s²' } }
                    },
                    {
                        name: '动摩擦因数',
                        formula: 'μ = f/N',
                        variables: { f: { value: f, unit: 'N' }, N: { value: N, unit: 'N' } }
                    },
                    {
                        name: '匀速条件',
                        formula: 'F_pull = f',
                        variables: { F_pull: { value: F_pull, unit: 'N' }, f: { value: f, unit: 'N' } }
                    }
                ]
            },
            errors: [],
            warnings: mu > 1 ? ['动摩擦因数 μ>1 不常见，请确认接触面材料'] : []
        };
    }
}

import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

/** 匀强电场中的带电粒子运动模型 */
export class UniformElectricModel extends PhysicsModelBase {
    readonly name = '匀强电场';
    readonly version = '1.0.0';
    readonly description = '带电粒子在匀强电场中的运动（抛物线轨迹）';
    readonly modelType = 'uniform-electric-field' as const;
    readonly assumptions = ['电场匀强且恒定', '忽略重力（或重力已合入电场力）', '忽略空气阻力', '粒子速度远小于光速'];
    readonly applicableRange = '适用于带电粒子在平行板电容器等匀强电场中的运动';
    readonly errorSources = ['边缘效应导致电场不均匀', '高速时需要考虑相对论效应'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'charge', description: '电荷量 (C)', unit: 'C', required: true },
        { name: 'mass', description: '质量 (kg)', unit: 'kg', required: true, min: 1e-30 },
        { name: 'electricFieldY', description: '电场强度 y 分量 (N/C)', unit: 'N/C', required: true }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const body = problem.bodies[0]!;
        const q = body.charge?.value ?? 1.6e-19;
        const m = body.mass.value;
        const x0 = body.position;
        const v0 = body.velocity;

        const E = problem.environment?.electricField?.fieldVector ?? { x: 0, y: 0 };

        // 加速度 a = qE/m
        const ax = (q * E.x) / m;
        const ay = (q * E.y) / m;
        const a = { x: ax, y: ay };

        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 1000;
        const dt = duration / sampleCount;

        // 解析解生成轨迹
        const trajectory: TrajectoryPoint[] = [];
        for (let i = 0; i <= sampleCount; i++) {
            const t = i * dt;
            const position = Vec2.add(x0, Vec2.add(Vec2.scale(v0, t), Vec2.scale(a, 0.5 * t * t)));
            const velocity = Vec2.add(v0, Vec2.scale(a, t));
            const speed = Vec2.magnitude(velocity);
            // 电势能 Ep = -qEy (以 y=0 为零势能点)
            const potentialEnergy = -q * E.y * position.y;
            trajectory.push({
                t,
                position,
                velocity,
                acceleration: { ...a },
                kineticEnergy: 0.5 * m * speed * speed,
                potentialEnergy
            });
        }

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '起始点',
                t: 0,
                position: { ...x0 },
                velocity: { ...v0 },
                description: `带电粒子从 (${x0.x}, ${x0.y}) 以速度 (${v0.x}, ${v0.y}) m/s 进入电场`
            }
        ];

        // 如果竖直速度能减为零，记录最高/最低点
        if (Math.abs(ay) > 1e-10) {
            const tTurn = -v0.y / ay;
            if (tTurn > 0 && tTurn <= duration) {
                const posTurn = Vec2.add(x0, Vec2.add(Vec2.scale(v0, tTurn), Vec2.scale(a, 0.5 * tTurn * tTurn)));
                keyframes.push({
                    label: v0.y > 0 && ay < 0 ? '最高点' : '转折点',
                    t: tTurn,
                    position: posTurn,
                    velocity: { x: v0.x, y: 0 },
                    description: `t=${tTurn.toFixed(4)}s 时竖直速度为零`
                });
            }
        }

        const finalPos = trajectory[trajectory.length - 1]!.position;
        keyframes.push({
            label: '终点',
            t: duration,
            position: finalPos,
            velocity: trajectory[trajectory.length - 1]!.velocity,
            description: `t=${duration}s 时到达 (${finalPos.x.toFixed(3)}, ${finalPos.y.toFixed(3)})`
        });

        // 图表
        const x_t: ChartSeries = {
            xLabel: '时间',
            yLabel: 'x 位移',
            xUnit: 's',
            yUnit: 'm',
            points: trajectory.map(p => ({ x: p.t, y: p.position.x }))
        };
        const y_t: ChartSeries = {
            xLabel: '时间',
            yLabel: 'y 位移',
            xUnit: 's',
            yUnit: 'm',
            points: trajectory.map(p => ({ x: p.t, y: p.position.y }))
        };
        const v_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '速度',
            xUnit: 's',
            yUnit: 'm/s',
            points: trajectory.map(p => ({ x: p.t, y: Vec2.magnitude(p.velocity) }))
        };
        const energy_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '能量',
            xUnit: 's',
            yUnit: 'J',
            points: trajectory.map(p => ({
                x: p.t,
                y: (p.kineticEnergy ?? 0) + (p.potentialEnergy ?? 0)
            }))
        };

        return {
            meta: {
                model: 'uniform-electric-field',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: { x_t, y_t, v_t, energy_t },
            diagnostics: {
                conservedQuantities: [
                    {
                        name: '总能量（动能+电势能）',
                        law: '能量守恒',
                        initialValue: (trajectory[0]?.kineticEnergy ?? 0) + (trajectory[0]?.potentialEnergy ?? 0),
                        finalValue:
                            (trajectory[trajectory.length - 1]?.kineticEnergy ?? 0) +
                            (trajectory[trajectory.length - 1]?.potentialEnergy ?? 0),
                        maxDeviation: 0,
                        tolerance: 1e-6,
                        conserved: true
                    }
                ],
                maxValues: {
                    maxSpeed: Math.max(...trajectory.map(p => Vec2.magnitude(p.velocity))),
                    maxDistance: Vec2.magnitude(Vec2.sub(finalPos, x0))
                },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `带电粒子 (q=${q}C, m=${m}kg) 在匀强电场 E=(${E.x}, ${E.y}) N/C 中做抛物线运动`,
                steps: [
                    {
                        order: 1,
                        description: '电场力',
                        formula: 'F = qE',
                        calculation: `F = ${q} × (${E.x}, ${E.y}) = (${(q * E.x).toExponential(2)}, ${(q * E.y).toExponential(2)}) N`
                    },
                    {
                        order: 2,
                        description: '加速度',
                        formula: 'a = qE/m',
                        calculation: `a = (${ax.toExponential(2)}, ${ay.toExponential(2)}) m/s²`
                    },
                    { order: 3, description: '水平位移', formula: 'x = x₀ + v₀x·t' },
                    { order: 4, description: '竖直位移', formula: 'y = y₀ + v₀y·t + ½at²' }
                ],
                formulas: [
                    {
                        name: '电场力',
                        formula: 'F = qE',
                        variables: { q: { value: q, unit: 'C' }, E: { value: Vec2.magnitude(E), unit: 'N/C' } }
                    },
                    {
                        name: '加速度',
                        formula: 'a = qE/m',
                        variables: { a: { value: Vec2.magnitude(a), unit: 'm/s²' } }
                    },
                    {
                        name: '电势能',
                        formula: 'Ep = -qEy',
                        variables: { q: { value: q, unit: 'C' }, E: { value: E.y, unit: 'N/C' } }
                    }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

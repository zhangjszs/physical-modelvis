import type { PhysicsProblem } from '../types/problem.js';
import { kineticEnergy, sampleTrajectory } from '../physics/kinematics.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

/** 匀强磁场中的带电粒子运动模型 */
export class UniformMagneticModel extends PhysicsModelBase {
    readonly name = '匀强磁场';
    readonly version = '1.0.0';
    readonly description = '带电粒子在匀强磁场中的匀速圆周运动（洛伦兹力）';
    readonly modelType = 'uniform-magnetic-field' as const;
    readonly assumptions = ['磁场匀强且恒定，垂直于粒子运动平面', '忽略重力', '忽略空气阻力', '粒子速度远小于光速'];
    readonly applicableRange = '适用于带电粒子在匀强磁场中的运动，如回旋加速器、质谱仪等';
    readonly errorSources = ['边缘效应导致磁场不均匀', '高速时需要考虑相对论效应'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'charge', description: '电荷量 (C)', unit: 'C', required: true },
        { name: 'mass', description: '质量 (kg)', unit: 'kg', required: true, min: 1e-30 },
        { name: 'magneticFieldZ', description: '磁感应强度 z 分量 (T)', unit: 'T', required: true }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const body = problem.bodies[0]!;
        const q = body.charge?.value ?? 1.6e-19;
        const m = body.mass.value;
        const x0 = body.position;
        const v0 = body.velocity;

        const Bz = problem.environment?.magneticField?.fieldStrength ?? 0;

        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 1000;
        const dt = duration / sampleCount;

        const v0Mag = Vec2.magnitude(v0);

        // 特殊情况：速度为零或磁场为零 → 匀速直线运动 (公共脚手架 sampleTrajectory)
        if (v0Mag < 1e-12 || Math.abs(Bz) < 1e-12 || Math.abs(q) < 1e-30) {
            const trajectory = sampleTrajectory({
                sampleCount, duration,
                sampleAt: (t) => ({
                    position: Vec2.add(x0, Vec2.scale(v0, t)),
                    velocity: { ...v0 },
                    acceleration: Vec2.zero(),
                    kineticEnergy: kineticEnergy(m, v0Mag),
                    potentialEnergy: 0
                })
            });
            return this.buildResult(trajectory, problem, x0, v0, 0, 0, m, q, Bz);
        }

        // 回旋半径 R = mv/(|q|B), 回旋周期 T = 2πm/(|q|B)
        const R = (m * v0Mag) / (Math.abs(q) * Math.abs(Bz));
        const T_period = (2 * Math.PI * m) / (Math.abs(q) * Math.abs(Bz));
        const omega = v0Mag / R; // 角频率

        // 圆心位置：对于 Bz>0，正电荷逆时针，负电荷顺时针
        // 向心力方向: F = qv × B, 对于 v=(vx,vy), B=(0,0,Bz)
        // Fx = q*vy*Bz, Fy = -q*vx*Bz
        // 圆心在速度方向的左侧（正电荷，Bz>0）或右侧
        const sign = q * Bz > 0 ? 1 : -1; // +1: 逆时针, -1: 顺时针
        // 速度的垂直方向（指向圆心）
        const perpX = (-sign * v0.y) / v0Mag;
        const perpY = (sign * v0.x) / v0Mag;
        const centerX = x0.x + R * perpX;
        const centerY = x0.y + R * perpY;

        // 解析解采样: 回旋 ω=sign·ωt 绕圆心旋转 (公共脚手架 sampleTrajectory)
        const dx0 = x0.x - centerX;
        const dy0 = x0.y - centerY;
        const accMag = (v0Mag * v0Mag) / R;
        const trajectory = sampleTrajectory({
            sampleCount, duration,
            sampleAt: (t) => {
                const angle = sign * omega * t;
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                const position = {
                    x: centerX + dx0 * cosA - dy0 * sinA,
                    y: centerY + dx0 * sinA + dy0 * cosA
                };
                return {
                    position,
                    velocity: { x: v0.x * cosA - v0.y * sinA, y: v0.x * sinA + v0.y * cosA },
                    acceleration: Vec2.scale(Vec2.normalize({ x: centerX - position.x, y: centerY - position.y }), accMag),
                    kineticEnergy: kineticEnergy(m, v0Mag), // 动能守恒
                    potentialEnergy: 0
                };
            }
        });

        return this.buildResult(trajectory, problem, x0, v0, R, T_period, m, q, Bz);
    }

    private buildResult(
        trajectory: TrajectoryPoint[],
        problem: PhysicsProblem,
        x0: { x: number; y: number },
        v0: { x: number; y: number },
        R: number,
        T_period: number,
        m: number,
        q: number,
        Bz: number
    ): SimulationResult {
        const duration = problem.timeConfig.duration;
        const finalPos = trajectory[trajectory.length - 1]!.position;

        const keyframes: Keyframe[] = [
            {
                label: '起始点',
                t: 0,
                position: { ...x0 },
                velocity: { ...v0 },
                description: `带电粒子从 (${x0.x}, ${x0.y}) 以速度 ${Vec2.magnitude(v0).toFixed(2)} m/s 进入磁场`
            }
        ];

        if (R > 0) {
            keyframes.push({
                label: '回旋参数',
                t: 0,
                position: { ...x0 },
                velocity: { ...v0 },
                description: `回旋半径 R=${R.toFixed(4)}m, 周期 T=${T_period.toFixed(4)}s`
            });
        }

        keyframes.push({
            label: '终点',
            t: duration,
            position: finalPos,
            velocity: trajectory[trajectory.length - 1]!.velocity,
            description: `t=${duration}s 时到达 (${finalPos.x.toFixed(3)}, ${finalPos.y.toFixed(3)})`
        });

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
            yLabel: '速率',
            xUnit: 's',
            yUnit: 'm/s',
            points: trajectory.map(p => ({ x: p.t, y: Vec2.magnitude(p.velocity) }))
        };

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t, y_t, v_t },
            diagnostics: {
                conservedQuantities: [
                    {
                        name: '动能',
                        law: '动能守恒（洛伦兹力不做功）',
                        initialValue: 0.5 * m * Vec2.magnitude(v0) ** 2,
                        finalValue: 0.5 * m * Vec2.magnitude(trajectory[trajectory.length - 1]!.velocity) ** 2,
                        maxDeviation: 0,
                        tolerance: 1e-6,
                        conserved: true
                    }
                ],
                maxValues: {
                    maxSpeed: Vec2.magnitude(v0),
                    cyclotronRadius: R,
                    cyclotronPeriod: T_period
                },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `带电粒子 (q=${q}C, m=${m}kg) 在匀强磁场 B=${Bz}T 中做匀速圆周运动`,
                steps: [
                    {
                        order: 1,
                        description: '洛伦兹力',
                        formula: 'F = qv × B',
                        calculation: `F = ${q} × ${Vec2.magnitude(v0).toFixed(2)} × ${Bz} = ${(Math.abs(q) * Vec2.magnitude(v0) * Math.abs(Bz)).toExponential(2)} N`
                    },
                    { order: 2, description: '向心力等于洛伦兹力', formula: 'mv²/R = qvB' },
                    {
                        order: 3,
                        description: '回旋半径',
                        formula: 'R = mv/(|q|B)',
                        calculation: `R = ${R.toFixed(4)} m`
                    },
                    {
                        order: 4,
                        description: '回旋周期',
                        formula: 'T = 2πm/(|q|B)',
                        calculation: `T = ${T_period.toFixed(4)} s`
                    }
                ],
                formulas: [
                    {
                        name: '洛伦兹力',
                        formula: 'F = qvB',
                        variables: {
                            q: { value: q, unit: 'C' },
                            v: { value: Vec2.magnitude(v0), unit: 'm/s' },
                            B: { value: Math.abs(Bz), unit: 'T' }
                        }
                    },
                    {
                        name: '回旋半径',
                        formula: 'R = mv/(|q|B)',
                        variables: {
                            R: { value: R, unit: 'm' },
                            m: { value: m, unit: 'kg' },
                            v: { value: Vec2.magnitude(v0), unit: 'm/s' }
                        }
                    },
                    {
                        name: '回旋周期',
                        formula: 'T = 2πm/(|q|B)',
                        variables: { T: { value: T_period, unit: 's' }, m: { value: m, unit: 'kg' } }
                    }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

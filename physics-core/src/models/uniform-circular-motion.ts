import type { PhysicsProblem } from '../types/problem.js';
import { kineticEnergy, sampleTrajectory } from '../physics/kinematics.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ForceDiagram } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

export class UniformCircularMotionModel extends PhysicsModelBase {
    readonly name = '匀速圆周运动';
    readonly version = '1.0.0';
    readonly description = '物体在水平面内做匀速圆周运动，用于演示向心力、线速度、角速度关系';
    readonly modelType = 'uniform-circular-motion' as const;
    readonly assumptions = [
        '物体视为质点',
        '角速度大小恒定（匀速圆周运动）',
        '绳子质量可忽略、不可伸长',
        '忽略空气阻力'
    ];
    readonly applicableRange = '适用于水平面内的匀速圆周运动，如绳子拉小球旋转、圆锥摆等';
    readonly errorSources = [
        '实际中绳子有微小伸长',
        '空气阻力导致角速度衰减',
        '重力对竖直方向运动的影响（圆锥摆效应）'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'radius', description: '圆周运动半径 (m)', unit: 'm', required: true, min: 0 },
        { name: 'angularVelocity', description: '角速度 ω (rad/s)', unit: 'rad/s', required: true, min: 0 },
        { name: 'mass', description: '物体质量 (kg)', unit: 'kg', required: true, min: 0 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const body = problem.bodies[0]!;
        const cm = problem.constraints?.circularMotion;
        if (!cm) {
            throw new Error('匀速圆周运动模型需要 circularMotion 约束配置');
        }

        const center = cm.center;
        const phi0 = cm.initialAngle ?? 0;
        const mass = body.mass.value;

        // ===== 圆锥摆：由绳长 L 与摆角 θ 自动确定角速度 =====
        // 圆锥摆：mLω²·sinθ = mg·tanθ → ω = √(g / (L·cosθ))
        // 当 conicalAngleDeg>0 且 ropeLength>0 时，使用此 ω 覆盖原 ω
        const conicalMode = (cm.conicalAngleDeg ?? 0) > 0 && (cm.ropeLength ?? 0) > 0;
        let omega = cm.angularVelocity;
        let ropeLength = cm.ropeLength ?? cm.radius;
        let conicalAngleRad = 0;
        // 实际参与平面投影的圆周半径 (圆锥摆时 r=L·sinθ)
        let radius = cm.radius;
        if (conicalMode) {
            conicalAngleRad = (cm.conicalAngleDeg! * Math.PI) / 180;
            const g = problem.environment?.gravity?.value ?? 9.8;
            omega = Math.sqrt(g / (cm.ropeLength! * Math.cos(conicalAngleRad)));
            ropeLength = cm.ropeLength!;
            radius = ropeLength * Math.sin(conicalAngleRad);
        }

        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 1000;
        const dt = duration / sampleCount;

        const v = omega * radius;
        const aCentripetal = omega * omega * radius;
        const F = mass * aCentripetal;
        const period = (2 * Math.PI) / omega;
        const frequency = omega / (2 * Math.PI);

        // 解析解采样: 匀速圆周 φ=φ₀+ωt (公共脚手架 sampleTrajectory)
        const trajectory = sampleTrajectory({
            sampleCount, duration,
            sampleAt: (t) => {
                const angle = phi0 + omega * t;
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                const velocity = { x: -radius * omega * sinA, y: radius * omega * cosA };
                return {
                    position: { x: center.x + radius * cosA, y: center.y + radius * sinA },
                    velocity,
                    acceleration: { x: -radius * omega * omega * cosA, y: -radius * omega * omega * sinA },
                    kineticEnergy: kineticEnergy(mass, radius * omega),
                    potentialEnergy: 0
                };
            }
        });

        const keyframes: Keyframe[] = [];
        keyframes.push({
            label: '起始点',
            t: 0,
            position: trajectory[0]!.position,
            velocity: trajectory[0]!.velocity,
            description: conicalMode
                ? `圆锥摆：L=${ropeLength.toFixed(2)}m, θ=${((conicalAngleRad * 180) / Math.PI).toFixed(1)}°, ω=${omega.toFixed(2)}rad/s (g=9.8推导), v=${v.toFixed(2)}m/s, F=${F.toFixed(2)}N`
                : `物体在半径 ${radius}m 的圆周上以角速度 ω=${omega.toFixed(2)} rad/s 开始运动，线速度 v=${v.toFixed(2)} m/s，向心力 F=${F.toFixed(2)} N`
        });

        const quarters = Math.floor(duration / (period / 4));
        const labels = ['(1/4)周', '(1/2)周', '(3/4)周', '1周'];
        for (let q = 1; q <= Math.min(4, quarters); q++) {
            const tQ = (q * period) / 4;
            if (tQ > duration) break;
            const iQ = Math.round(tQ / dt);
            if (iQ < trajectory.length) {
                const pt = trajectory[iQ]!;
                keyframes.push({
                    label: labels[q - 1] ?? `${q}周`,
                    t: tQ,
                    position: pt.position,
                    velocity: pt.velocity,
                    description: `运动 ${labels[q - 1] ?? q + '周'}，位置 (${pt.position.x.toFixed(2)}, ${pt.position.y.toFixed(2)}) m`
                });
            }
        }

        keyframes.push({
            label: '终点',
            t: duration,
            position: trajectory[trajectory.length - 1]!.position,
            velocity: trajectory[trajectory.length - 1]!.velocity,
            description: `t=${duration.toFixed(2)}s 时，物体完成 ${(duration / period).toFixed(2)} 周运动`
        });

        // ===== 受力分析图 =====
        // 在 t=0 时刻：向心力指向圆心
        const forceDiagram: ForceDiagram = {
            bodyId: body.id,
            forces: [
                {
                    name: '向心力 F_c',
                    vector: { x: center.x - trajectory[0]!.position.x, y: center.y - trajectory[0]!.position.y },
                    magnitude: F,
                    unit: 'N'
                },
                { name: '线速度 v', vector: trajectory[0]!.velocity, magnitude: v, unit: 'm/s' }
            ],
            netForce: {
                x: ((center.x - trajectory[0]!.position.x) * F) / radius,
                y: ((center.y - trajectory[0]!.position.y) * F) / radius
            }
        };
        const F_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '向心力大小',
            xUnit: 's',
            yUnit: 'N',
            points: trajectory.map(p => ({ x: p.t, y: F }))
        };

        const theta_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '角度',
            xUnit: 's',
            yUnit: 'rad',
            points: trajectory.map(p => ({ x: p.t, y: phi0 + omega * p.t }))
        };
        const v_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '线速度大小',
            xUnit: 's',
            yUnit: 'm/s',
            points: trajectory.map(p => ({ x: p.t, y: Vec2.magnitude(p.velocity) }))
        };
        const a_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '向心加速度大小',
            xUnit: 's',
            yUnit: 'm/s²',
            points: trajectory.map(p => ({ x: p.t, y: aCentripetal }))
        };
        const x_t: ChartSeries = {
            xLabel: '时间',
            yLabel: 'x坐标',
            xUnit: 's',
            yUnit: 'm',
            points: trajectory.map(p => ({ x: p.t, y: p.position.x }))
        };
        const y_t: ChartSeries = {
            xLabel: '时间',
            yLabel: 'y坐标',
            xUnit: 's',
            yUnit: 'm',
            points: trajectory.map(p => ({ x: p.t, y: p.position.y }))
        };

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t, y_t, v_t, a_t, theta_t, F_t, force_diagram: forceDiagram },
            diagnostics: {
                conservedQuantities: [
                    {
                        name: '动能',
                        law: '匀速圆周运动动能守恒',
                        initialValue: kineticEnergy(mass, v),
                        finalValue: kineticEnergy(mass, v),
                        maxDeviation: 0,
                        tolerance: 1e-6,
                        conserved: true
                    },
                    {
                        name: '速率大小',
                        law: '匀速圆周运动速率不变',
                        initialValue: v,
                        finalValue: v,
                        maxDeviation: 0,
                        tolerance: 1e-6,
                        conserved: true
                    }
                ],
                maxValues: {
                    maxSpeed: v,
                    maxAcceleration: aCentripetal,
                    centripetalForce: F,
                    period,
                    frequency,
                    radius
                },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: conicalMode
                    ? `圆锥摆：L=${ropeLength.toFixed(2)}m, θ=${((conicalAngleRad * 180) / Math.PI).toFixed(1)}° → ω=${omega.toFixed(2)}rad/s (g推导), r=${radius.toFixed(2)}m, v=${v.toFixed(2)}m/s, a=${aCentripetal.toFixed(2)}m/s², F=${F.toFixed(2)}N`
                    : `质量 ${mass}kg 的物体在半径 ${radius}m 的圆周上以角速度 ω=${omega.toFixed(2)} rad/s 做匀速圆周运动，线速度 v=${v.toFixed(2)} m/s，向心加速度 a=${aCentripetal.toFixed(2)} m/s²，向心力 F=${F.toFixed(2)} N，周期 T=${period.toFixed(3)} s`,
                steps: conicalMode
                    ? [
                          {
                              order: 1,
                              description: '圆锥摆 ω 自动推导',
                              formula: 'ω = √(g / (L·cosθ))',
                              calculation: `ω = √(9.8 / (${ropeLength.toFixed(2)} × cos${((conicalAngleRad * 180) / Math.PI).toFixed(1)}°)) = ${omega.toFixed(3)} rad/s`
                          },
                          {
                              order: 2,
                              description: '有效圆周半径',
                              formula: 'r = L·sinθ',
                              calculation: `r = ${ropeLength.toFixed(2)} × sin${((conicalAngleRad * 180) / Math.PI).toFixed(1)}° = ${radius.toFixed(3)} m`
                          },
                          {
                              order: 3,
                              description: '线速度',
                              formula: 'v = ωr',
                              calculation: `v = ${omega.toFixed(2)} × ${radius.toFixed(3)} = ${v.toFixed(2)} m/s`
                          },
                          {
                              order: 4,
                              description: '向心加速度',
                              formula: 'a = ω²r',
                              calculation: `a = ${omega.toFixed(2)}² × ${radius.toFixed(3)} = ${aCentripetal.toFixed(2)} m/s²`
                          },
                          {
                              order: 5,
                              description: '向心力',
                              formula: 'F = ma',
                              calculation: `F = ${mass} × ${aCentripetal.toFixed(2)} = ${F.toFixed(2)} N`
                          }
                      ]
                    : [
                          {
                              order: 1,
                              description: '线速度与角速度关系',
                              formula: 'v = ωr',
                              calculation: `v = ${omega.toFixed(2)} × ${radius} = ${v.toFixed(2)} m/s`
                          },
                          {
                              order: 2,
                              description: '向心加速度',
                              formula: 'a = ω²r = v²/r',
                              calculation: `a = ${omega.toFixed(2)}² × ${radius} = ${aCentripetal.toFixed(2)} m/s²`
                          },
                          {
                              order: 3,
                              description: '向心力（牛顿第二定律）',
                              formula: 'F = ma = mω²r',
                              calculation: `F = ${mass} × ${aCentripetal.toFixed(2)} = ${F.toFixed(2)} N`
                          },
                          {
                              order: 4,
                              description: '周期',
                              formula: 'T = 2π/ω',
                              calculation: `T = 2π/${omega.toFixed(2)} = ${period.toFixed(3)} s`
                          },
                          {
                              order: 5,
                              description: '转速（频率）',
                              formula: 'f = 1/T = ω/(2π)',
                              calculation: `f = ${frequency.toFixed(3)} Hz (转/秒)`
                          }
                      ],
                formulas: [
                    {
                        name: '线速度-角速度关系',
                        formula: 'v = ωr',
                        variables: {
                            v: { value: v, unit: 'm/s' },
                            ω: { value: omega, unit: 'rad/s' },
                            r: { value: radius, unit: 'm' }
                        }
                    },
                    {
                        name: '向心加速度',
                        formula: 'a = ω²r = v²/r',
                        variables: {
                            a: { value: aCentripetal, unit: 'm/s²' },
                            ω: { value: omega, unit: 'rad/s' },
                            r: { value: radius, unit: 'm' }
                        }
                    },
                    {
                        name: '向心力公式',
                        formula: 'F = mω²r = mv²/r',
                        variables: {
                            F: { value: F, unit: 'N' },
                            m: { value: mass, unit: 'kg' },
                            ω: { value: omega, unit: 'rad/s' },
                            r: { value: radius, unit: 'm' }
                        }
                    },
                    {
                        name: '周期公式',
                        formula: 'T = 2π/ω = 2πr/v',
                        variables: { T: { value: period, unit: 's' }, ω: { value: omega, unit: 'rad/s' } }
                    }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

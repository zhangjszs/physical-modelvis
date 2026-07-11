import type { PhysicsProblem } from '../types/problem.js';
import { kineticEnergy, sampleTrajectory } from '../physics/kinematics.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ConservedQuantity } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

export class SpringOscillatorModel extends PhysicsModelBase {
    readonly name = '弹簧振子';
    readonly version = '1.0.0';
    readonly description = '弹簧连接质点的简谐/阻尼振动，支持一维和二维';
    readonly modelType = 'spring-oscillator' as const;
    readonly assumptions = [
        '弹簧质量忽略不计',
        '弹簧遵循胡克定律 (F = -kx)',
        '运动沿弹簧轴线方向 (一维)',
        '阻尼力与速度成正比 (F_damping = -cv)'
    ];
    readonly applicableRange = '适用于小振幅振动，弹簧处于弹性限度内';
    readonly errorSources = ['大振幅时弹簧可能超出弹性限度', '阻尼系数实际可能随速度变化', '弹簧质量被忽略'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'springConstant', description: '弹簧劲度系数 (N/m)', unit: 'N/m', required: true, min: 0 },
        { name: 'naturalLength', description: '弹簧自然长度 (m)', unit: 'm', required: true, min: 0 },
        { name: 'anchorPoint', description: '弹簧固定端坐标', unit: 'm', required: true }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const body = problem.bodies[0];
        const m = body.mass.value;
        const spring = problem.constraints?.spring;
        if (!spring) {
            throw new Error('弹簧振子模型需要 constraints.spring 配置');
        }

        const k = spring.springConstant;
        const L0 = spring.naturalLength;
        const anchor = spring.anchorPoint;
        const dampingCoeff = problem.environment?.airResistance?.enabled
            ? (problem.environment.airResistance.coefficient ?? 0)
            : 0;

        const dx0 = body.position.x - anchor.x;
        const dy0 = body.position.y - anchor.y;
        const v0x = body.velocity.x;
        const v0y = body.velocity.y;

        const x0 = Vec2.magnitude({ x: dx0, y: dy0 }) - L0;
        const axisLen = Vec2.magnitude({ x: dx0, y: dy0 });
        const axisDir = axisLen > 0 ? { x: dx0 / axisLen, y: dy0 / axisLen } : { x: 1, y: 0 };
        const v0 = v0x * axisDir.x + v0y * axisDir.y;

        const omega0 = Math.sqrt(k / m);
        const beta = dampingCoeff / (2 * m);

        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 1000;

        let maxSpeed = 0;
        let maxDisplacement = 0;

        const dampingType = this.getDampingType(omega0, beta);

        // 解析解采样: 4 支阻尼 (SHM/欠阻尼/临界/过阻尼) 均为 t 的闭式解 (公共脚手架 sampleTrajectory)
        const trajectory = sampleTrajectory({
            sampleCount, duration,
            sampleAt: (t) => {
                let x: number, v: number;

                if (beta === 0) {
                    const { amplitude, phase } = this.solveSHM(x0, v0, omega0);
                    x = amplitude * Math.cos(omega0 * t + phase);
                    v = -amplitude * omega0 * Math.sin(omega0 * t + phase);
                } else if (dampingType === 'underdamped') {
                    const omegaD = Math.sqrt(omega0 * omega0 - beta * beta);
                    const { amplitude, phase } = this.solveDamped(x0, v0, beta, omegaD);
                    const decay = Math.exp(-beta * t);
                    x = amplitude * decay * Math.cos(omegaD * t + phase);
                    v = amplitude * decay * (-beta * Math.cos(omegaD * t + phase) - omegaD * Math.sin(omegaD * t + phase));
                } else if (dampingType === 'critical') {
                    const C1 = x0;
                    const C2 = v0 + beta * x0;
                    x = (C1 + C2 * t) * Math.exp(-beta * t);
                    v = (C2 - beta * (C1 + C2 * t)) * Math.exp(-beta * t);
                } else {
                    const sqrtDisc = Math.sqrt(beta * beta - omega0 * omega0);
                    const lambda1 = -beta + sqrtDisc;
                    const lambda2 = -beta - sqrtDisc;
                    const C1 = (v0 - x0 * lambda2) / (lambda1 - lambda2);
                    const C2 = x0 - C1;
                    x = C1 * Math.exp(lambda1 * t) + C2 * Math.exp(lambda2 * t);
                    v = C1 * lambda1 * Math.exp(lambda1 * t) + C2 * lambda2 * Math.exp(lambda2 * t);
                }

                const speed = Math.abs(v);
                // 诊断累加器 (仅用于 maxValues, 不计入帧物理, frame 值与原循环逐位一致)
                if (speed > maxSpeed) maxSpeed = speed;
                if (Math.abs(x) > maxDisplacement) maxDisplacement = Math.abs(x);

                return {
                    position: Vec2.add(anchor, Vec2.scale(axisDir, L0 + x)),
                    velocity: Vec2.scale(axisDir, v),
                    acceleration: Vec2.scale(axisDir, (-k * x) / m),
                    kineticEnergy: kineticEnergy(m, v),
                    potentialEnergy: 0.5 * k * x * x
                };
            }
        });

        const keyframes: Keyframe[] = [];
        keyframes.push({
            label: '起始点',
            t: 0,
            position: trajectory[0].position,
            velocity: trajectory[0].velocity,
            description: `振子从位移 x₀=${x0.toFixed(4)}m，初速度 v₀=${v0.toFixed(4)}m/s 开始振动`
        });

        for (let i = 1; i < trajectory.length; i++) {
            const prev = trajectory[i - 1];
            const cur = trajectory[i];
            const prevX = Vec2.magnitude(Vec2.sub(prev.position, anchor)) - L0;
            const curX = Vec2.magnitude(Vec2.sub(cur.position, anchor)) - L0;
            if (prevX * curX < 0) {
                keyframes.push({
                    label: '平衡位置',
                    t: cur.t,
                    position: cur.position,
                    velocity: cur.velocity,
                    description: `振子在 t=${cur.t.toFixed(4)}s 经过平衡位置，速度 ${Math.abs(v0).toFixed(4)}m/s`
                });
                break;
            }
        }

        const maxIdx = trajectory.reduce((mi, p, i) => {
            const disp = Math.abs(Vec2.magnitude(Vec2.sub(p.position, anchor)) - L0);
            return disp > Math.abs(Vec2.magnitude(Vec2.sub(trajectory[mi].position, anchor)) - L0) ? i : mi;
        }, 0);
        if (maxIdx > 0 && maxIdx < trajectory.length) {
            const p = trajectory[maxIdx];
            keyframes.push({
                label: '最大位移',
                t: p.t,
                position: p.position,
                velocity: p.velocity,
                description: `振子在 t=${p.t.toFixed(4)}s 达到最大位移 ${(Vec2.magnitude(Vec2.sub(p.position, anchor)) - L0).toFixed(4)}m`
            });
        }

        keyframes.push({
            label: '终点',
            t: duration,
            position: trajectory[trajectory.length - 1].position,
            velocity: trajectory[trajectory.length - 1].velocity,
            description: `模拟结束，t=${duration}s`
        });

        const x_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '位移',
            xUnit: 's',
            yUnit: 'm',
            points: trajectory.map(p => ({ x: p.t, y: Vec2.magnitude(Vec2.sub(p.position, anchor)) - L0 }))
        };
        const v_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '速度',
            xUnit: 's',
            yUnit: 'm/s',
            points: trajectory.map(p => {
                const dir =
                    Vec2.magnitude(Vec2.sub(p.position, anchor)) > 0
                        ? Vec2.normalize(Vec2.sub(p.position, anchor))
                        : axisDir;
                return { x: p.t, y: Vec2.dot(p.velocity, dir) };
            })
        };
        const energy_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '能量',
            xUnit: 's',
            yUnit: 'J',
            points: trajectory.map(p => ({ x: p.t, y: (p.kineticEnergy ?? 0) + (p.potentialEnergy ?? 0) }))
        };

        const conservedQuantities: ConservedQuantity[] = [];
        if (beta === 0) {
            const energies = trajectory.map(p => (p.kineticEnergy ?? 0) + (p.potentialEnergy ?? 0));
            const E0 = energies[0];
            const maxDev = Math.max(...energies.map(e => Math.abs(e - E0)));
            conservedQuantities.push({
                name: '机械能',
                law: '机械能守恒 (无阻尼)',
                initialValue: E0,
                finalValue: energies[energies.length - 1],
                maxDeviation: maxDev,
                tolerance: E0 * 0.01,
                conserved: maxDev <= E0 * 0.01
            });
        }

        const dampingLabel =
            dampingType === 'none'
                ? '无阻尼'
                : dampingType === 'underdamped'
                  ? '欠阻尼'
                  : dampingType === 'critical'
                    ? '临界阻尼'
                    : '过阻尼';

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t, v_t, energy_t },
            diagnostics: {
                conservedQuantities,
                maxValues: { maxSpeed, maxDisplacement },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary:
                    beta === 0
                        ? `无阻尼弹簧振子: k=${k}N/m, m=${m}kg, ω=${omega0.toFixed(4)}rad/s, T=${((2 * Math.PI) / omega0).toFixed(4)}s`
                        : `${dampingLabel}弹簧振子: k=${k}N/m, m=${m}kg, c=${dampingCoeff}, β=${beta.toFixed(4)}, ω₀=${omega0.toFixed(4)}rad/s`,
                steps:
                    beta === 0
                        ? [
                              {
                                  order: 1,
                                  description: '角频率',
                                  formula: 'ω = √(k/m)',
                                  calculation: `ω = √(${k}/${m}) = ${omega0.toFixed(4)} rad/s`
                              },
                              { order: 2, description: '运动方程', formula: 'x(t) = A·cos(ωt + φ)' },
                              {
                                  order: 3,
                                  description: '周期',
                                  formula: 'T = 2π/ω',
                                  calculation: `T = ${((2 * Math.PI) / omega0).toFixed(4)} s`
                              }
                          ]
                        : dampingType === 'underdamped'
                          ? [
                                {
                                    order: 1,
                                    description: '阻尼系数',
                                    formula: 'β = c/(2m)',
                                    calculation: `β = ${dampingCoeff}/(2×${m}) = ${beta.toFixed(4)}`
                                },
                                { order: 2, description: '阻尼角频率', formula: 'ωd = √(ω₀² - β²)' },
                                { order: 3, description: '运动方程', formula: 'x(t) = A·e^(-βt)·cos(ωd·t + φ)' }
                            ]
                          : dampingType === 'critical'
                            ? [
                                  {
                                      order: 1,
                                      description: '临界阻尼条件',
                                      formula: 'β = ω₀',
                                      calculation: `β = ${beta.toFixed(4)}, ω₀ = ${omega0.toFixed(4)}`
                                  },
                                  { order: 2, description: '运动方程', formula: 'x(t) = (C₁ + C₂t)·e^(-βt)' }
                              ]
                            : [
                                  {
                                      order: 1,
                                      description: '过阻尼条件',
                                      formula: 'β > ω₀',
                                      calculation: `β = ${beta.toFixed(4)} > ω₀ = ${omega0.toFixed(4)}`
                                  },
                                  { order: 2, description: '运动方程', formula: 'x(t) = C₁·e^(λ₁t) + C₂·e^(λ₂t)' }
                              ],
                formulas:
                    beta === 0
                        ? [
                              {
                                  name: '角频率',
                                  formula: 'ω = √(k/m)',
                                  variables: { k: { value: k, unit: 'N/m' }, m: { value: m, unit: 'kg' } }
                              },
                              { name: '周期', formula: 'T = 2π/ω', variables: { ω: { value: omega0, unit: 'rad/s' } } },
                              { name: '弹性势能', formula: 'PE = ½kx²', variables: { k: { value: k, unit: 'N/m' } } }
                          ]
                        : [
                              {
                                  name: '阻尼系数',
                                  formula: 'β = c/(2m)',
                                  variables: { c: { value: dampingCoeff, unit: 'N·s/m' }, m: { value: m, unit: 'kg' } }
                              },
                              {
                                  name: '固有频率',
                                  formula: 'ω₀ = √(k/m)',
                                  variables: { k: { value: k, unit: 'N/m' }, m: { value: m, unit: 'kg' } }
                              }
                          ]
            },
            errors: [],
            warnings: []
        };
    }

    private getDampingType(omega0: number, beta: number): 'none' | 'underdamped' | 'critical' | 'overdamped' {
        if (beta === 0) return 'none';
        const diff = omega0 * omega0 - beta * beta;
        if (diff > 1e-12) return 'underdamped';
        if (diff > -1e-12) return 'critical';
        return 'overdamped';
    }

    private solveSHM(x0: number, v0: number, omega: number): { amplitude: number; phase: number } {
        const A = Math.sqrt(x0 * x0 + (v0 / omega) * (v0 / omega));
        const phase = Math.atan2(-v0 / (omega * A || 1), x0 / (A || 1));
        return { amplitude: A, phase };
    }

    private solveDamped(x0: number, v0: number, beta: number, omegaD: number): { amplitude: number; phase: number } {
        if (omegaD === 0) {
            return { amplitude: x0, phase: 0 };
        }
        const A = Math.sqrt(x0 * x0 + ((v0 + beta * x0) / omegaD) * ((v0 + beta * x0) / omegaD));
        const phase = Math.atan2(-(v0 + beta * x0) / (omegaD * (A || 1)), x0 / (A || 1));
        return { amplitude: A, phase };
    }
}

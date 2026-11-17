import type { PhysicsProblem } from '../types/problem.js';
import { kineticEnergy } from '../physics/kinematics.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ForceDiagram } from '../types/result.js';
import type { ParameterSpec, Vector2D } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { PHYSICS_CONSTANTS } from '../units/constants.js';
import { maxOf } from '../math/reduce.js';
import { integrateVerticalCircle, type VerticalCircleType } from './vertical-circle-integrator.js';

export type { VerticalCircleType };

/**
 * 竖直圆周运动模型 — 必修二 §2 (绳/杆/圆环)
 *
 * 绳模型 (rope):
 *   - 最高点临界: T = 0 → mg = mv²/r → v_min = √(gr), 底端临界 v₀ = √(5gr)
 *   - 只能提供指向圆心的拉力 (T ≥ 0)
 *   - 若 2gr < v₀² < 5gr，小球在 cosθ_det = (2gr − v₀²)/(3gr) 处脱离圆周做斜抛
 *
 * 杆模型 (rod):
 *   - 最高点临界: v_min = 0, 底端完整圆周临界 v₀ = √(4gr)
 *   - 在最高点 v=0 时 N = -mg (↑ 向上支持); 若 v₀ < √(4gr) 则在圆弧内摆动
 *
 * 圆环模型 (ring):
 *   - 外侧轨道只能提供指向圆心的单向约束 (v_min = √(gr), 底端临界 v₀ = √(5gr))
 *
 * 机械能守恒: ½mv₀² (最低点) = ½mv(θ)² + mgr(1-cosθ)
 *   → v(θ)² = v₀² - 2gr(1-cosθ)
 *   → 指向圆心为正的约束力:
 *     T(θ) = m[ v²/r + g·cosθ ]  (绳/环: 只能为非负 ≥ 0, 归零处脱离)
 *     N(θ) = m[ v²/r + g·cosθ ]  (杆: 双向约束, 正值=指向圆心拉力, 负值=背离圆心支持力)
 */

export class VerticalCircleModel extends PhysicsModelBase {
    readonly name = '竖直圆周最高点条件';
    readonly version = '1.0.0';
    readonly description = '绳/杆/圆环模型在竖直面内的圆周运动与最高点临界条件';
    readonly modelType = 'vertical-circle' as const;
    readonly assumptions = [
        '物体视为质点',
        '绳/杆/圆环光滑且质量可忽略',
        '机械能守恒 (无空气阻力)',
        '重力加速度恒定 g'
    ];
    readonly applicableRange = '游乐园大过山车、水流星、单杠回环、圆管内的质点等竖直圆周运动';
    readonly errorSources = ['实际杆/绳有质量、有弹性', '空气阻力耗能', '接触面实际存在摩擦'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'length', description: '绳/杆长 / 圆周半径 r (m)', unit: 'm', required: true, min: 0 },
        { name: 'mass', description: '物体质量 m (kg)', unit: 'kg', required: true, min: 0 },
        { name: 'modelType', description: '绳 rope | 杆 rod | 圆环 ring', unit: '', required: true },
        { name: 'initialSpeed', description: '最低点初速度 v₀ (m/s)', unit: 'm/s', required: true, min: 0 },
        {
            name: 'gravity',
            description: '重力加速度 (m/s²)',
            unit: 'm/s²',
            required: false,
            defaultValue: PHYSICS_CONSTANTS.g.value,
            min: 0
        }
    ];

    static vMin(ropeType: VerticalCircleType, r: number, g: number): number {
        switch (ropeType) {
            case 'rope':
            case 'ring':
                return Math.sqrt(g * r);
            case 'rod':
                return 0;
        }
    }

    static modelLabel(t: VerticalCircleType): string {
        switch (t) {
            case 'rope':
                return '绳模型';
            case 'rod':
                return '杆模型';
            case 'ring':
                return '圆环模型';
        }
    }

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.verticalCircle;
        if (!c) throw new Error('竖直圆周模型需要 constraints.verticalCircle 配置');

        const r = c.length;
        const m = c.mass;
        const v0 = c.initialSpeed;
        const g = c.gravity ?? PHYSICS_CONSTANTS.g.value;
        const modelType = c.modelType;
        const center: Vector2D = c.center ?? { x: 0, y: r }; // 圆心 (悬挂点)

        if (r <= 0) throw new Error('竖直圆周: 半径 length 必须为正');
        if (m <= 0) throw new Error('竖直圆周: 质量 mass 必须为正');
        if (v0 < 0) throw new Error('竖直圆周: initialSpeed 必须为非负');
        if (g <= 0) throw new Error('竖直圆周: gravity 必须为正');

        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 1000;

        const vMin = VerticalCircleModel.vMin(modelType, r, g);

        // 最高点速度 (仅当可到达最高点时成立): v_top² = v₀² - 4gr
        const vTopSq = v0 * v0 - 4 * g * r;
        const isRod = modelType === 'rod';
        const passesTop = isRod ? v0 * v0 >= 4 * g * r - 1e-9 : v0 * v0 >= 5 * g * r - 1e-9;
        const canComplete = passesTop;

        const integration = integrateVerticalCircle({
            r,
            g,
            v0,
            modelType,
            center,
            duration,
            sampleCount
        });

        const dtSample = duration / sampleCount;
        const trajectory: TrajectoryPoint[] = integration.frames.map((frame, i) => {
            const speed = Math.hypot(frame.velocity.x, frame.velocity.y);
            return {
                t: i * dtSample,
                position: frame.position,
                velocity: frame.velocity,
                acceleration: frame.acceleration,
                kineticEnergy: kineticEnergy(m, speed),
                potentialEnergy: m * g * (frame.position.y - (center.y - r)) // 最低点为零势面
            };
        });

        const sampleAtTime = (tEvent: number): { position: Vector2D; velocity: Vector2D } => {
            const raw = Math.max(0, Math.min(sampleCount, tEvent / dtSample));
            const idx = Math.min(sampleCount - 1, Math.floor(raw));
            const alpha = Math.max(0, Math.min(1, raw - idx));
            const a = trajectory[idx]!;
            const b = trajectory[Math.min(sampleCount, idx + 1)]!;
            return {
                position: {
                    x: a.position.x + alpha * (b.position.x - a.position.x),
                    y: a.position.y + alpha * (b.position.y - a.position.y)
                },
                velocity: {
                    x: a.velocity.x + alpha * (b.velocity.x - a.velocity.x),
                    y: a.velocity.y + alpha * (b.velocity.y - a.velocity.y)
                }
            };
        };

        // 关键点
        const bottomForce = m * ((v0 * v0) / r + g);
        const keyframes: Keyframe[] = [
            {
                label: '最低点 (起点)',
                t: 0,
                position: trajectory[0]!.position,
                velocity: trajectory[0]!.velocity,
                description: `v₀ = ${v0.toFixed(2)} m/s, ${isRod ? 'N₀' : 'T₀'} = ${bottomForce.toFixed(2)} N (指向圆心)`
            }
        ];

        if (integration.tHorizontalCross !== null) {
            const s = sampleAtTime(integration.tHorizontalCross);
            const vHoriz = Math.sqrt(Math.max(0, v0 * v0 - 2 * g * r));
            keyframes.push({
                label: '水平位置',
                t: integration.tHorizontalCross,
                position: s.position,
                velocity: s.velocity,
                description: `θ=90°, v=√${Math.max(0, v0 * v0 - 2 * g * r).toFixed(2)}=${vHoriz.toFixed(2)} m/s`
            });
        }

        const vTopActual = Math.sqrt(Math.max(0, vTopSq));
        if (passesTop && integration.tTopCross !== null) {
            const s = sampleAtTime(integration.tTopCross);
            keyframes.push({
                label: '最高点',
                t: integration.tTopCross,
                position: s.position,
                velocity: s.velocity,
                description: `v_top = ${vTopActual.toFixed(2)} m/s, v_min = ${vMin.toFixed(2)} m/s, ✓ 通过最高点`
            });
        } else if (!passesTop && integration.tDet !== null && integration.thetaDet !== null) {
            const s = sampleAtTime(integration.tDet);
            const cosDet = (2 * g * r - v0 * v0) / (3 * g * r);
            keyframes.push({
                label: '脱离圆周',
                t: integration.tDet,
                position: s.position,
                velocity: s.velocity,
                description: `v₀ < √(5gr)=${Math.sqrt(5 * g * r).toFixed(2)}, 在 θ=${integration.thetaDet.toFixed(2)}rad (cosθ=${cosDet.toFixed(2)}) 处约束归零脱离做斜抛`
            });
        } else if (!passesTop && integration.tOscPeak !== null && integration.thetaMaxOsc !== null) {
            const s = sampleAtTime(integration.tOscPeak);
            keyframes.push({
                label: '最高摆角折返',
                t: integration.tOscPeak,
                position: s.position,
                velocity: s.velocity,
                description: `未达完整圆周临界速度, 在 θ_max=${integration.thetaMaxOsc.toFixed(2)}rad 处速率归零并反向摆动`
            });
        }

        if (integration.tCatch !== null) {
            const s = sampleAtTime(integration.tCatch);
            keyframes.push({
                label: '落回约束',
                t: integration.tCatch,
                position: s.position,
                velocity: s.velocity,
                description: `斜抛落回距圆心 r=${r}m 处, 瞬间张紧停止`
            });
        }

        keyframes.push({
            label: '终点',
            t: trajectory[trajectory.length - 1]!.t,
            position: trajectory[trajectory.length - 1]!.position,
            velocity: trajectory[trajectory.length - 1]!.velocity,
            description: `t=${duration}s, ${passesTop ? '完成完整圆周运动' : integration.tDet !== null ? '脱离圆周斜抛' : v0 > 0 ? '圆弧内往复摆动' : '静止于最低点'}`
        });
        keyframes.sort((a, b) => a.t - b.t);

        // ===== 图表 =====

        // 1. vc_trajectory: 圆周轨迹 (x-y)
        const vc_trajectory: ChartSeries = {
            xLabel: 'x',
            xUnit: 'm',
            yLabel: 'y',
            yUnit: 'm',
            points: trajectory.map(p => ({ x: p.position.x, y: p.position.y }))
        };

        // 2. tension_angle: T(θ) 或 N(θ) vs θ (0=最低点, π=最高点, 2π=最低点)
        const thetaSteps = 200;
        const tension_angle: ChartSeries = {
            xLabel: '角度 θ (0=最低点, π=最高点)',
            xUnit: 'rad',
            yLabel: isRod ? '杆力 N (N)' : '绳张力 T (N)',
            yUnit: 'N',
            points: Array.from({ length: thetaSteps }, (_, i) => {
                const theta = (2 * Math.PI * i) / (thetaSteps - 1);
                const cosTheta = Math.cos(theta);
                const vSq = v0 * v0 - 2 * g * r * (1 - cosTheta);
                let force: number;
                // 统一约定: 正 = 指向圆心的力 (拉力), 负 = 背离圆心的支持力 (仅杆模型)
                if (vSq < -1e-9) {
                    force = 0; // 无法到达该角度
                } else if (isRod) {
                    force = m * (Math.max(0, vSq) / r + g * cosTheta);
                } else {
                    force = Math.max(0, m * (Math.max(0, vSq) / r + g * cosTheta));
                }
                return { x: theta, y: force };
            })
        };

        // 3. vc_speed_angle: v vs θ
        const vc_speed_angle: ChartSeries = {
            xLabel: '角度 θ',
            xUnit: 'rad',
            yLabel: '速率 v',
            yUnit: 'm/s',
            points: Array.from({ length: thetaSteps }, (_, i) => {
                const theta = (2 * Math.PI * i) / (thetaSteps - 1);
                const cosTheta = Math.cos(theta);
                const vSq = v0 * v0 - 2 * g * r * (1 - cosTheta);
                return { x: theta, y: Math.sqrt(Math.max(0, vSq)) };
            })
        };

        // 4. vc_energy_angle: 动能/势能/总能量 vs θ
        const vc_energy_angle: ChartSeries = {
            xLabel: '角度 θ',
            xUnit: 'rad',
            yLabel: '动能/势能',
            yUnit: 'J',
            points: Array.from({ length: thetaSteps }, (_, i) => {
                const theta = (2 * Math.PI * i) / (thetaSteps - 1);
                const cosTheta = Math.cos(theta);
                const vSq = v0 * v0 - 2 * g * r * (1 - cosTheta);
                return { x: theta, y: 0.5 * m * Math.max(0, vSq) };
            })
        };

        // 5. vmin_markers: 临界速度标记 — 静态示意图 (显示 √(gr) 参考线)
        const vmin_markers: ChartSeries = {
            xLabel: '半径 r',
            xUnit: 'm',
            yLabel: '临界速度 v_min',
            yUnit: 'm/s',
            points: Array.from({ length: 50 }, (_, i) => {
                const rr = 0.1 + ((5 - 0.1) * i) / 49;
                return { x: rr, y: isRod ? 0 : Math.sqrt(g * rr) };
            })
        };

        // 静态轨迹 (整个圆)
        const staticCircle: ChartSeries = {
            xLabel: 'x',
            xUnit: 'm',
            yLabel: 'y',
            yUnit: 'm',
            points: Array.from({ length: 128 }, (_, i) => {
                const a = (2 * Math.PI * i) / 127;
                return { x: center.x + r * Math.cos(a), y: center.y + r * Math.sin(a) };
            })
        };

        // 受力分析图: 最高点 (θ=π 处径向指向圆心为 -y)
        const topForceInward = passesTop ? m * (Math.max(0, vTopSq) / r - g) : 0;
        const topForceVectorY = -topForceInward;
        const forceDiagram: ForceDiagram = {
            bodyId: problem.bodies[0]?.id ?? 'ball',
            forces: [
                {
                    name: isRod ? '杆力 N' : '绳/环张力 T',
                    vector: { x: 0, y: topForceVectorY },
                    magnitude: Math.abs(topForceInward),
                    unit: 'N'
                },
                { name: '重力 mg', vector: { x: 0, y: -m * g }, magnitude: m * g, unit: 'N' }
            ],
            netForce: { x: 0, y: topForceVectorY - m * g }
        };

        // 机械能守恒校验 (在脱离落回约束发生非弹性碰撞前严格守恒)
        const conservedLimitT = integration.tCatch ?? duration + 1;
        const conservedFrames = trajectory.filter(p => p.t < conservedLimitT - 1e-6);
        const evalFrames = conservedFrames.length > 0 ? conservedFrames : trajectory;
        const energies = evalFrames.map(p => (p.kineticEnergy ?? 0) + (p.potentialEnergy ?? 0));
        const E0 = energies[0] ?? 0;
        const maxDev = energies.length > 0 ? maxOf(energies.map(e => Math.abs(e - E0))) : 0;
        const energyTol = Math.max(1e-6, E0 * 0.001);

        const modelLabel = VerticalCircleModel.modelLabel(modelType);
        const summary = `${modelLabel}: v₀=${v0.toFixed(2)}m/s, v_min=${vMin.toFixed(2)}m/s, v_top=${vTopActual.toFixed(2)}m/s, ${passesTop ? '能通过最高点' : '无法通过最高点'}`;
        const v0FullMin = Math.sqrt((isRod ? 4 : 5) * g * r);

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                vc_trajectory,
                tension_angle,
                vc_speed_angle,
                vc_energy_angle,
                vmin_markers,
                'static-diagram': staticCircle,
                force_diagram: forceDiagram
            },
            diagnostics: {
                conservedQuantities: [
                    {
                        name: '机械能 (无耗散)',
                        law: '机械能守恒',
                        initialValue: E0,
                        finalValue: energies[energies.length - 1] ?? 0,
                        maxDeviation: maxDev,
                        tolerance: energyTol,
                        conserved: maxDev <= energyTol
                    }
                ],
                maxValues: {
                    v0,
                    vMin,
                    vTop: vTopActual,
                    vTopSq,
                    r,
                    m,
                    g,
                    omega0: v0 / r,
                    period: v0 > 0 ? (2 * Math.PI * r) / v0 : 0, // v0=0 时物体不运动, 周期无意义 → 0
                    maxTension: tension_angle.points.reduce((mx, p) => Math.max(mx, p.y), 0)
                },
                flags: {
                    canComplete,
                    passesTop
                },
                rangeCheck: {
                    withinRange: v0 <= 50,
                    warnings: v0 > 50 ? [`初速度 v₀=${v0}m/s 过大, 超出教学范围`] : []
                }
            },
            explanation: {
                summary,
                steps: isRod
                    ? [
                          {
                              order: 1,
                              description: '杆模型: 指向圆心为正时 N(θ) = m(v²/r + g·cosθ)，负值表示向上/外侧支持力',
                              formula: 'N(θ) = m(v²/r + g·cosθ)'
                          },
                          {
                              order: 2,
                              description: '最高点 (θ=π) 临界条件: v_top = 0 时 N = −mg (↑), 刚好支撑',
                              formula: 'N_top = m(v_top²/r − g)',
                              calculation: passesTop
                                  ? `v_top = ${vTopActual.toFixed(2)} m/s, N_top(指向圆心) = ${topForceInward.toFixed(2)} N`
                                  : `v₀ = ${v0.toFixed(2)} m/s < √(4gr) = ${v0FullMin.toFixed(2)} m/s, 未能到达最高点`
                          },
                          {
                              order: 3,
                              description: '完成完整圆周的最低初速度 (杆模型): v₀ ≥ √(4gr)',
                              formula: 'v₀_min = √(4gr)',
                              calculation: `v₀_min = √(4·${g}·${r}) = ${v0FullMin.toFixed(2)} m/s, 当前 v₀ = ${v0.toFixed(2)} m/s`,
                              result: passesTop ? 'v₀ ≥ √(4gr) → 能通过最高点' : 'v₀ < √(4gr) → 在圆弧内摆动'
                          },
                          {
                              order: 4,
                              description: '机械能守恒',
                              formula: '½mv₀² = ½mv(θ)² + mgr(1−cosθ)',
                              result: passesTop ? '最高点 v = √(v₀² − 4gr)' : '最高点摆角 cosθ_max = 1 − v₀²/(2gr)'
                          }
                      ]
                    : [
                          {
                              order: 1,
                              description: `${modelLabel}: 约束只能提供指向圆心的单向作用力 (T ≥ 0)`,
                              formula: 'T(θ) = m(v²/r + g·cosθ) ≥ 0'
                          },
                          {
                              order: 2,
                              description: '最高点临界: T=0 → mg = mv²/r → v_min = √(gr)',
                              formula: 'v_min = √(gr)',
                              calculation: `v_min = √(${g}·${r}) = ${vMin.toFixed(2)} m/s`
                          },
                          {
                              order: 3,
                              description: '完成完整圆周的最低速度: v₀ ≥ √(5gr)',
                              formula: 'v₀_min = √(5gr)',
                              calculation: `v₀_min = √(5·${g}·${r}) = ${v0FullMin.toFixed(2)} m/s, 当前 v₀ = ${v0.toFixed(2)} m/s`
                          },
                          {
                              order: 4,
                              description: passesTop
                                  ? '当前状态: v₀ ≥ √(5gr) → 能通过最高点'
                                  : v0 * v0 > 2 * g * r
                                    ? '当前状态: √(2gr) < v₀ < √(5gr) → 在上半圆脱离做斜抛'
                                    : '当前状态: v₀ ≤ √(2gr) → 在下半圆摆动',
                              formula: passesTop
                                  ? `v_top = ${vTopActual.toFixed(2)} m/s ≥ v_min = ${vMin.toFixed(2)} m/s`
                                  : `v₀ = ${v0.toFixed(2)} m/s < √(5gr) = ${v0FullMin.toFixed(2)} m/s`
                          }
                      ],
                formulas: [
                    {
                        name: '最高点临界速度',
                        formula: isRod ? 'v_min = 0 (底端临界 v₀ = √(4gr))' : 'v_min = √(gr) (底端临界 v₀ = √(5gr))',
                        variables: {
                            v_min: { value: vMin, unit: 'm/s' },
                            g: { value: g, unit: 'm/s²' },
                            r: { value: r, unit: 'm' }
                        }
                    },
                    {
                        name: '机械能守恒',
                        formula: '½mv₀² = ½mv(θ)² + mgr(1−cosθ)',
                        variables: { 'v₀': { value: v0, unit: 'm/s' }, v_top: { value: vTopActual, unit: 'm/s' } }
                    },
                    {
                        name: isRod ? '杆力公式' : '绳张力公式',
                        formula: isRod ? 'N = m(v²/r + g·cosθ)' : 'T = m(v²/r + g·cosθ)',
                        variables: { m: { value: m, unit: 'kg' }, v_top: { value: vTopActual, unit: 'm/s' } }
                    }
                ]
            },
            errors: [],
            warnings:
                integration.tCatch !== null
                    ? ['绳/环松弛脱离后落回约束瞬间存在非弹性碰撞耗能 (机械能守恒仅统计碰撞前阶段)']
                    : []
        };
    }
}

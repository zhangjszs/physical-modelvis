import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ForceDiagram } from '../types/result.js';
import type { ParameterSpec, Vector2D } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 竖直圆周运动模型 — 必修二 §2 (绳/杆/圆环)
 *
 * 绳模型 (rope):
 *   - 最高点临界: T = 0 → mg = mv²/r → v_min = √(gr)
 *   - 只能提供指向圆心的拉力
 *   - 如果 v_top < √(gr)，小球无法完成完整圆周而先掉落
 *
 * 杆模型 (rod):
 *   - 最高点 v_min = 0 (杆可以提供支持力或拉力)
 *   - 在最高点 N = -mg  (↑) 刚好支持
 *
 * 圆环模型 (ring):
 *   - 类似绳 (只能提供单向约束: 外侧轨道只能提供指向圆心的支持力)
 *   - 但实际上内侧轨道可双向，常考 "光滑圆环内侧" = 绳模型 (单侧约束)
 *   - 此处实现与绳相同 (v_min = √(gr))
 *
 * 机械能守恒: ½mv₀² (最低点) = ½mv(θ)² + mgr(1-cosθ)
 *   → v(θ)² = v₀² - 2gr(1-cosθ)
 *   → T(θ) = m[ v₀²/r - 2g(1-cosθ) ] + mg·cosθ  (绳/环)
 *     N(θ) = m[ v₀²/r - 2g(1-cosθ) ] - mg·cosθ  (杆, 正值=拉力, 负值=支持力)
 */

export type VerticalCircleType = 'rope' | 'rod' | 'ring';

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
        { name: 'gravity', description: '重力加速度 (m/s²)', unit: 'm/s²', required: false, defaultValue: 9.8, min: 0 }
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
        const g = c.gravity ?? 9.8;
        const modelType = c.modelType;
        const center: Vector2D = c.center ?? { x: 0, y: r }; // 圆心 (悬挂点)

        if (r <= 0) throw new Error('竖直圆周: 半径 length 必须为正');
        if (m <= 0) throw new Error('竖直圆周: 质量 mass 必须为正');
        if (v0 < 0) throw new Error('竖直圆周: initialSpeed 必须为非负');
        if (g <= 0) throw new Error('竖直圆周: gravity 必须为正');

        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 1000;

        const vMin = VerticalCircleModel.vMin(modelType, r, g);

        // 最高点速度: 机械能守恒 ½mv₀² = ½mv_top² + mgr·(1-cosπ)= ½mv_top² + 2mgr
        // → v_top² = v₀² - 4gr
        const vTopSq = v0 * v0 - 4 * g * r;
        // 实际是否能够达最高
        const canComplete = vTopSq > 0;
        // 实际最高点的 v_top: modelType === 'rope'/'ring' 且 v₀² < 5gr → 做摆动而非完整圆周
        // 当 v₀ ≥ √(5gr) 时为完整圆周运动，最高点速度为 √(v₀² - 4gr)
        // 这里我们取 θ ∈ [0, 2π]，当 v(θ)² < 0 时停止 (做摆动)
        const isFullCircle =
            modelType === 'rod'
                ? v0 >= 0 // 杆总可完成圆周
                : v0 * v0 >= 5 * g * r; // 绳/环需 v₀ ≥ √(5gr) 才能做完整圆周

        // 轨迹生成 (θ=0 为最低点，θ=π 为最高点)
        const trajectory: TrajectoryPoint[] = [];
        const omega = v0 / r; // 初始角速度
        const phi0 = -Math.PI / 2; // 最低点时物体在 (0, y=0) 相对于圆心

        // 停止条件: 当 v²(θ) < 0 (无法继续向上) 即 θ_max
        // v²(θ) = v₀² - 2gr(1-cosθ), 临界 v=0 → cosθ_crit = 1 - v₀²/(2gr)
        const cosCrit = 1 - (v0 * v0) / (2 * g * r);
        const thetaMax = cosCrit >= -1 ? Math.acos(Math.max(-1, cosCrit)) : Math.PI;

        for (let i = 0; i <= sampleCount; i++) {
            const progress = i / sampleCount;
            const totalT = duration * progress;
            const theta = isFullCircle ? omega * totalT : progress * thetaMax;

            // 角度 (θ=0 最低点, θ=π 最高点)
            const phi = phi0 + theta; // phi = -π/2 + theta
            const cosPhi = Math.cos(phi);
            const sinPhi = Math.sin(phi);
            // 物体位置 (y 向上为正)
            const position: Vector2D = {
                x: center.x + r * cosPhi,
                y: center.y + r * sinPhi
            };

            // 速度沿切线方向 (垂直于 位矢)
            // v(θ)² = v₀² - 2gr(1-cosθ)
            const vSq = v0 * v0 - 2 * g * r * (1 - Math.cos(theta));
            const vActual = vSq > 0 ? Math.sqrt(vSq) : 0;
            // 切线方向: 沿 theta 增大的方向
            const tangentDir: Vector2D = { x: -sinPhi, y: cosPhi };
            const velocity: Vector2D = {
                x: tangentDir.x * vActual,
                y: tangentDir.y * vActual
            };

            // 向心加速度 a_c = v²/r
            const aCent = (vActual * vActual) / r;
            // 合加速度 (向心分量指向圆心)
            const acceleration: Vector2D = {
                x: -aCent * cosPhi,
                y: -aCent * sinPhi
            };

            trajectory.push({
                t: totalT,
                position,
                velocity,
                acceleration,
                kineticEnergy: 0.5 * m * vActual * vActual,
                potentialEnergy: m * g * (position.y - (center.y - r)) // 最低点为零势面
            });

            // 一旦到达 v_actual = 0 (摆动情形)，停止增加点
            if (!isFullCircle && vSq <= 0) {
                // 用当前点替换余下所有点
                for (let j = i + 1; j <= sampleCount; j++) {
                    trajectory.push({
                        t: duration * (j / sampleCount),
                        position: { ...position },
                        velocity: { x: 0, y: 0 },
                        acceleration: { x: 0, y: 0 },
                        kineticEnergy: 0,
                        potentialEnergy: m * g * (position.y - (center.y - r))
                    });
                }
                break;
            }
        }

        // 关键点
        const keyframes: Keyframe[] = [
            {
                label: '最低点 (起点)',
                t: 0,
                position: trajectory[0]!.position,
                velocity: trajectory[0]!.velocity,
                description: `v₀ = ${v0.toFixed(2)} m/s, T₀ = ${(m * ((v0 * v0) / r + g)).toFixed(2)} N (绳/环) / N₀ = ${(m * ((v0 * v0) / r - g)).toFixed(2)} N (杆)`
            }
        ];

        // 最高点 (θ=π)
        const topIdx = Math.round((Math.PI / (isFullCircle ? omega * duration : thetaMax)) * sampleCount);
        if (topIdx > 0 && topIdx < trajectory.length) {
            const topPt = trajectory[topIdx]!;
            const vTop = Math.max(0, Math.sqrt(vTopSq));
            keyframes.push({
                label: canComplete ? '最高点' : '未达最高点 (松手)',
                t: topPt.t,
                position: topPt.position,
                velocity: topPt.velocity,
                description: canComplete
                    ? `v_top = ${vTop.toFixed(2)} m/s, v_min = ${vMin.toFixed(2)} m/s, ${vTop >= vMin ? '✓ 绳/环未松弛' : '✗ 绳/环已松弛'}`
                    : `物体在 v₀ < √(5gr) = ${Math.sqrt(5 * g * r).toFixed(2)} 时无法完成圆周, 在 θ=${thetaMax.toFixed(2)}rad 脱离`
            });
        }

        // 水平位置 (θ=π/2)
        const halfIdx = Math.round((Math.PI / 2 / (isFullCircle ? omega * duration : thetaMax)) * sampleCount);
        if (halfIdx > 0 && halfIdx < trajectory.length && halfIdx !== topIdx) {
            const hp = trajectory[halfIdx]!;
            keyframes.push({
                label: '水平位置',
                t: hp.t,
                position: hp.position,
                velocity: hp.velocity,
                description: `θ=90°, v=√${(v0 * v0 - 2 * g * r).toFixed(2)}=${Math.sqrt(Math.max(0, v0 * v0 - 2 * g * r)).toFixed(2)} m/s`
            });
        }

        keyframes.push({
            label: '终点',
            t: trajectory[trajectory.length - 1].t,
            position: trajectory[trajectory.length - 1].position,
            velocity: trajectory[trajectory.length - 1].velocity,
            description: `t=${duration}s, ${isFullCircle ? '完整圆周运动' : '未完成完整圆周 (摆动)'}`
        });

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
            yLabel: modelType === 'rod' ? '杆力 N (N)' : '绳张力 T (N)',
            yUnit: 'N',
            points: Array.from({ length: thetaSteps }, (_, i) => {
                const theta = (2 * Math.PI * i) / (thetaSteps - 1);
                const cosTheta = Math.cos(theta);
                const vSq = v0 * v0 - 2 * g * r * (1 - cosTheta);
                let force: number;
                // 统一约定: 正 = 绳/杆指向圆心的力 (拉力), 负 = 杆向上支持力 (仅杆模型)
                if (modelType === 'rod') {
                    force = vSq > 0 ? m * (vSq / r + g * cosTheta) : -m * g * cosTheta; // 静止时杆提供支持力
                } else {
                    force = vSq > 0 ? m * (vSq / r + g * cosTheta) : 0;
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
                return { x: rr, y: modelType === 'rod' ? 0 : Math.sqrt(g * rr) };
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

        // 受力分析图: 最高点
        const topForce: number =
            modelType === 'rod' ? m * (Math.max(0, vTopSq) / r - g) : vTopSq > 0 ? m * (vTopSq / r + g) : 0;
        const forceDiagram: ForceDiagram = {
            bodyId: problem.bodies[0]?.id ?? 'ball',
            forces: [
                {
                    name: modelType === 'rod' ? '杆力 N' : '绳/环张力 T',
                    vector: { x: 0, y: topForce },
                    magnitude: Math.abs(topForce),
                    unit: 'N'
                },
                { name: '重力 mg', vector: { x: 0, y: -m * g }, magnitude: m * g, unit: 'N' }
            ],
            netForce: { x: 0, y: topForce - m * g }
        };

        // 机械能守恒校验
        const energies = trajectory.map(p => (p.kineticEnergy ?? 0) + (p.potentialEnergy ?? 0));
        const E0 = energies[0] ?? 0;
        const maxDev = energies.length > 0 ? Math.max(...energies.map(e => Math.abs(e - E0))) : 0;

        // 最高点参数
        const vTopActual = Math.sqrt(Math.max(0, vTopSq));
        const passesTop = modelType === 'rod' ? true : vTopActual >= vMin;

        const modelLabel = VerticalCircleModel.modelLabel(modelType);
        const summary = `${modelLabel}: v₀=${v0.toFixed(2)}m/s, v_min=${vMin.toFixed(2)}m/s, v_top=${vTopActual.toFixed(2)}m/s, ${passesTop ? '能通过最高点' : '无法通过最高点'}`;

        return {
            meta: {
                model: 'vertical-circle',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
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
                        tolerance: E0 * 0.001,
                        conserved: maxDev <= E0 * 0.001
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
                    period: (2 * Math.PI * r) / v0,
                    maxTension: tension_angle.points.reduce((m, p) => Math.max(m, p.y), 0)
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
                steps:
                    modelType === 'rod'
                        ? [
                              {
                                  order: 1,
                                  description: '杆模型: 杆对物体既可提供向下拉力也可提供向上支持力',
                                  formula: 'N(θ) = m(v²/r − g·cosθ)'
                              },
                              {
                                  order: 2,
                                  description: '最高点 (θ=π) 临界条件: v=0 时 N = −mg (↑), 刚好支持',
                                  formula: 'N_top = m(v_top²/r − g)',
                                  calculation: `v_top = ${vTopActual.toFixed(2)} m/s, N_top = ${topForce.toFixed(2)} N`
                              },
                              {
                                  order: 3,
                                  description: '最小速度 (杆模型): v_min = 0',
                                  formula: 'v_min = 0',
                                  result: '杆总可以让物体完成完整圆周'
                              },
                              {
                                  order: 4,
                                  description: '机械能守恒验证',
                                  formula: '½mv₀² = ½mv(θ)² + mgr(1−cosθ)',
                                  result: '最高点 v = √(v₀² − 4gr)'
                              }
                          ]
                        : [
                              {
                                  order: 1,
                                  description: `${modelLabel}: 约束只能提供指向圆心的拉力/支持力`,
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
                                  calculation: `v₀_min = √(5·${g}·${r}) = ${Math.sqrt(5 * g * r).toFixed(2)} m/s, 当前 v₀ = ${v0.toFixed(2)} m/s`
                              },
                              {
                                  order: 4,
                                  description: `当前状态: ${passesTop ? 'v_top ≥ v_min → 能过最高点' : 'v_top < v_min → 松手做斜抛'}`,
                                  formula: `v_top = ${vTopActual.toFixed(2)} m/s ${passesTop ? '≥' : '<'} v_min = ${vMin.toFixed(2)} m/s`
                              }
                          ],
                formulas: [
                    {
                        name: '最高点临界速度',
                        formula: modelType === 'rod' ? 'v_min = 0' : 'v_min = √(gr)',
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
                        name: modelType === 'rod' ? '杆力公式' : '绳张力公式',
                        formula: modelType === 'rod' ? 'N = m(v²/r − g·cosθ)' : 'T = m(v²/r + g·cosθ)',
                        variables: { m: { value: m, unit: 'kg' }, v_top: { value: vTopActual, unit: 'm/s' } }
                    }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

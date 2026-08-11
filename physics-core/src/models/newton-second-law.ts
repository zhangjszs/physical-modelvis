import type { PhysicsProblem } from '../types/problem.js';
import { kineticEnergy } from '../physics/kinematics.js';
import type {
    SimulationResult,
    TrajectoryPoint,
    Keyframe,
    ChartSeries,
    ForceDiagram,
    ExplanationStep
} from '../types/result.js';
import type { ParameterSpec, Vector2D } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

/**
 * 牛顿第二定律模型 — F = ma (必修一 第四章 §2)
 *
 * 物体在恒定合外力作用下做匀变速运动：
 *   a = F / m
 *   v(t) = v₀ + at
 *   x(t) = x₀ + v₀t + ½at²
 *
 * 支持一维 (force 为标量，沿 x 轴) 或二维向量。
 * 可选考虑地面摩擦力 (environment.ground.friction)。
 *
 * 图表输出：x-t, v-t, a-t, F-t；受力分析图；关键帧。
 */
export class NewtonSecondLawModel extends PhysicsModelBase {
    readonly name = '牛顿第二定律';
    readonly version = '1.0.0';
    readonly description = '物体在恒定合外力作用下的匀变速运动 (F=ma)';
    readonly modelType = 'newton-second-law' as const;
    readonly assumptions = ['物体视为质点', '合外力恒定不变', '经典力学范畴 (低速、宏观)', '接触面平坦'];
    readonly applicableRange = '适用于恒力作用下的直线或平面加速运动，如水平拉车、推车、牵引等';
    readonly errorSources = [
        '实际外力可能随时间变化',
        '接触面并非理想光滑，摩擦系数可能变化',
        '高速时空气阻力不可忽略'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'force', description: '合外力 (N)', unit: 'N', required: true },
        { name: 'mass', description: '物体质量 (kg)', unit: 'kg', required: true, min: 0 },
        { name: 'duration', description: '模拟时长 (s)', unit: 's', required: true, min: 0 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const body = problem.bodies[0];
        const m = body.mass.value;
        const x0 = body.position;
        const v0 = body.velocity;
        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 500;
        const dt = duration / sampleCount;

        // 解析合外力：支持标量 (沿 x 轴) 或向量
        const constraint = problem.constraints?.newtonSecondLaw;
        let F: Vector2D;
        if (constraint) {
            F = typeof constraint.force === 'number' ? { x: constraint.force, y: 0 } : constraint.force;
        } else {
            F = { x: 0, y: 0 };
        }

        // 可选考虑地面滑动摩擦 (一维水平面, 仅影响 x 方向)
        // 运动按速度反向点分段, 摩擦方向随运动方向翻转:
        //   phase 1: 沿初速度方向运动 (若 v₀=0 且 |F|≤μmg, 静摩擦平衡, 静止不动)
        //   phase 2: 速度减到零后, |F|>μmg 则反向加速 (摩擦翻转), 否则停在原地
        const mu = problem.environment?.ground?.friction ?? 0;
        const g = problem.environment?.gravity?.value ?? 9.8;
        const includeFriction = constraint?.includeFriction ?? false;
        const fK = mu > 0 ? mu * m * g : 0; // 滑动摩擦力大小
        const applyFriction = mu > 0 && includeFriction && fK > 0;

        interface MotionPhase {
            t0: number;
            t1: number;
            a: number;
            x0: number;
            v0: number;
        }
        const phases: MotionPhase[] = [];
        const v0x = v0.x;

        if (!applyFriction || Math.abs(v0x) < 1e-12) {
            if (applyFriction && Math.abs(F.x) <= fK) {
                // 静摩擦足够大: 物体保持静止
                phases.push({ t0: 0, t1: duration, a: 0, x0: x0.x, v0: 0 });
            } else {
                // 无摩擦, 或 v₀=0 且推力超过最大静摩擦 → 沿 F 方向加速
                const dir = Math.sign(F.x) || 1;
                const a0 = applyFriction ? (F.x - dir * fK) / m : F.x / m;
                phases.push({ t0: 0, t1: duration, a: a0, x0: x0.x, v0: v0x });
            }
        } else {
            // v₀≠0: 初始摩擦与速度反向
            const dir = Math.sign(v0x);
            const a1 = (F.x - dir * fK) / m;
            const tTurn = -v0x / a1;
            if (!isFinite(tTurn) || tTurn <= 0 || tTurn >= duration) {
                // 速度不会在模拟区间内减到零
                phases.push({ t0: 0, t1: duration, a: a1, x0: x0.x, v0: v0x });
            } else {
                // 速度在 tTurn 处减到零
                phases.push({ t0: 0, t1: tTurn, a: a1, x0: x0.x, v0: v0x });
                const xTurn = x0.x + v0x * tTurn + 0.5 * a1 * tTurn * tTurn;
                if (Math.abs(F.x) <= fK) {
                    // 反向推不动: 停在原地
                    phases.push({ t0: tTurn, t1: duration, a: 0, x0: xTurn, v0: 0 });
                } else {
                    // 反向加速, 摩擦方向翻转
                    const a2 = (F.x + dir * fK) / m;
                    phases.push({ t0: tTurn, t1: duration, a: a2, x0: xTurn, v0: 0 });
                }
            }
        }

        /** 按分段求 t 时刻的位置/速度/加速度 */
        const phaseAt = (t: number): MotionPhase => {
            const last = phases[phases.length - 1]!;
            return phases.find(ph => t >= ph.t0 && t <= ph.t1) ?? last;
        };

        // 生成轨迹
        const trajectory: TrajectoryPoint[] = [];
        let maxSpeed = 0;
        for (let i = 0; i <= sampleCount; i++) {
            const t = i * dt;
            const ph = phaseAt(t);
            const dtp = t - ph.t0;
            const positionX = ph.x0 + ph.v0 * dtp + 0.5 * ph.a * dtp * dtp;
            const velocityX = ph.v0 + ph.a * dtp;
            const position = Vec2.add(x0, { x: positionX - x0.x, y: 0 });
            const velocity = Vec2.add(v0, { x: velocityX - v0.x, y: 0 });
            const speed = Math.abs(velocityX);
            maxSpeed = Math.max(maxSpeed, speed);
            trajectory.push({
                t,
                position,
                velocity,
                acceleration: { x: ph.a, y: F.y / m },
                kineticEnergy: kineticEnergy(m, speed),
                potentialEnergy: 0
            });
        }

        // 关键帧
        const keyframes: Keyframe[] = [];
        const a1 = phases[0]!.a; // 初始分段加速度 (含摩擦修正)
        const netF1 = a1 * m; // 初始分段合外力 (x 方向)
        keyframes.push({
            label: '起始点',
            t: 0,
            position: { ...x0 },
            velocity: { ...v0 },
            description: `物体 m=${m}kg 从 (${x0.x}, ${x0.y})m 以 v=(${v0.x}, ${v0.y})m/s 开始，受合力 F=(${netF1.toFixed(2)}, ${F.y.toFixed(2)})N`
        });

        // 速度方向反转点 (第一分段减速到零时)
        const ph1 = phases[0]!;
        if (ph1.a !== 0 && v0x !== 0 && Math.sign(ph1.a) !== Math.sign(v0x)) {
            const tTurn = -v0x / ph1.a;
            if (tTurn > 0 && tTurn <= duration) {
                const posTurn = Vec2.add(x0, { x: ph1.x0 + ph1.v0 * tTurn + 0.5 * ph1.a * tTurn * tTurn - x0.x, y: 0 });
                const stopFriction = phases.length > 1 && Math.abs(F.x) <= fK;
                keyframes.push({
                    label: '速度反向点',
                    t: tTurn,
                    position: posTurn,
                    velocity: { x: 0, y: 0 },
                    description: `t=${tTurn.toFixed(3)}s 时速度为零，${stopFriction ? '此后静止 (静摩擦平衡)' : '即将反向加速'}`
                });
            }
        }

        const finalFrame = trajectory[trajectory.length - 1];
        keyframes.push({
            label: '终点',
            t: duration,
            position: finalFrame.position,
            velocity: finalFrame.velocity,
            description: `t=${duration}s 时 v=(${finalFrame.velocity.x.toFixed(2)}, ${finalFrame.velocity.y.toFixed(2)})m/s`
        });

        // 图表
        const x_t: ChartSeries = {
            xLabel: '时间',
            xUnit: 's',
            yLabel: 'x 方向位移',
            yUnit: 'm',
            points: trajectory.map(p => ({ x: p.t, y: p.position.x - x0.x }))
        };
        const v_t: ChartSeries = {
            xLabel: '时间',
            xUnit: 's',
            yLabel: 'x 方向速度',
            yUnit: 'm/s',
            points: trajectory.map(p => ({ x: p.t, y: p.velocity.x }))
        };
        const a_t: ChartSeries = {
            xLabel: '时间',
            xUnit: 's',
            yLabel: '加速度',
            yUnit: 'm/s²',
            points: trajectory.map(p => ({ x: p.t, y: p.acceleration!.x }))
        };
        const F_t: ChartSeries = {
            xLabel: '时间',
            xUnit: 's',
            yLabel: '合力',
            yUnit: 'N',
            points: trajectory.map(p => ({ x: p.t, y: p.acceleration!.x * m }))
        };
        const ke_t: ChartSeries = {
            xLabel: '时间',
            xUnit: 's',
            yLabel: '动能',
            yUnit: 'J',
            points: trajectory.map(p => ({ x: p.t, y: p.kineticEnergy! }))
        };

        // 受力分析图
        const netFVec: Vector2D = { x: netF1, y: F.y };
        const forceDiagram: ForceDiagram = {
            bodyId: body.id,
            forces: [{ name: '合外力 F', vector: netFVec, magnitude: Vec2.magnitude(netFVec), unit: 'N' }],
            netForce: netFVec
        };

        // 步骤说明
        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '由牛顿第二定律求加速度',
                formula: 'a = F / m',
                calculation: `a = ${netF1.toFixed(2)}N / ${m}kg = ${a1.toFixed(3)} m/s²`,
                result: `a = (${a1.toFixed(3)}, ${(F.y / m).toFixed(3)}) m/s²`
            },
            {
                order: 2,
                description: '速度变化规律',
                formula: 'v = v₀ + at',
                calculation: `v = ${v0.x} + ${a1.toFixed(3)} × ${duration}`,
                result: `v = ${(v0.x + a1 * duration).toFixed(3)} m/s`
            },
            {
                order: 3,
                description: '位移变化规律',
                formula: 'x = x₀ + v₀t + ½at²',
                calculation: `Δx = ${v0.x} × ${duration} + ½ × ${a1.toFixed(3)} × ${duration}²`,
                result: `Δx = ${(v0.x * duration + 0.5 * a1 * duration * duration).toFixed(3)} m`
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t, v_t, a_t, F_t, ke_t, force_diagram: forceDiagram },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    acceleration: Math.max(...phases.map(ph => Vec2.magnitude({ x: ph.a, y: F.y / m }))),
                    maxSpeed,
                    finalKineticEnergy: finalFrame.kineticEnergy!,
                    displacement: Vec2.magnitude(Vec2.sub(finalFrame.position, x0))
                },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `物体 m=${m}kg 受合力 F=(${netF1.toFixed(2)}, ${F.y.toFixed(2)})N 作用，产生加速度 a=(${a1.toFixed(3)}, ${(F.y / m).toFixed(3)})m/s²`,
                steps,
                formulas: [
                    {
                        name: '牛顿第二定律',
                        formula: 'a = F/m',
                        variables: {
                            F: { value: Vec2.magnitude(netFVec), unit: 'N' },
                            m: { value: m, unit: 'kg' },
                            a: { value: Math.abs(a1), unit: 'm/s²' }
                        }
                    },
                    {
                        name: '速度公式',
                        formula: 'v = v₀ + at',
                        variables: {
                            'v₀': { value: Vec2.magnitude(v0), unit: 'm/s' },
                            a: { value: Math.abs(a1), unit: 'm/s²' },
                            t: { value: duration, unit: 's' }
                        }
                    },
                    {
                        name: '位移公式',
                        formula: 'x = x₀ + v₀t + ½at²',
                        variables: {
                            'v₀': { value: Vec2.magnitude(v0), unit: 'm/s' },
                            a: { value: Math.abs(a1), unit: 'm/s²' },
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

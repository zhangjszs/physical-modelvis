import type { PhysicsProblem, ModelType } from '../types/problem.js';
import { kineticEnergy, sampleTrajectory } from '../physics/kinematics.js';
import type {
    SimulationResult,
    Keyframe,
    ChartSeries,
    ConservedQuantity,
    ExplanationStep,
    FormulaUsage
} from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/** 一维碰撞模型 (弹性 / 非弹性) */
export class CollisionModel extends PhysicsModelBase {
    readonly name: string = '一维碰撞';
    readonly version = '1.0.0';
    readonly description: string = '两个物体在一维方向上发生碰撞（弹性或非弹性）';
    readonly modelType: ModelType = 'collision-elastic' as ModelType;
    readonly assumptions = ['碰撞为一维 (沿 x 轴)', '碰撞瞬间完成，不考虑碰撞持续时间', '无外力作用', '物体视为质点'];
    readonly applicableRange = '适用于一维弹性碰撞和非弹性碰撞，如小球碰撞、滑块碰撞等';
    readonly errorSources = ['实际碰撞有能量损失 (声音、热)', '碰撞并非瞬间完成', '可能存在摩擦力'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'm1', description: '物体1质量 (kg)', unit: 'kg', required: true, min: 0.001 },
        { name: 'm2', description: '物体2质量 (kg)', unit: 'kg', required: true, min: 0.001 },
        { name: 'v1', description: '物体1初速度 (m/s)', unit: 'm/s', required: true },
        { name: 'v2', description: '物体2初速度 (m/s)', unit: 'm/s', required: true }
    ];

    private isInelastic(problem: PhysicsProblem): boolean {
        return problem.model === 'collision-inelastic';
    }

    private getCoefficientOfRestitution(problem: PhysicsProblem): number {
        if (!this.isInelastic(problem)) return 1;
        const restitution = problem.constraints?.collision?.restitution;
        if (restitution !== undefined) return restitution;
        return 0;
    }

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const body1 = problem.bodies[0];
        const body2 = problem.bodies[1];
        const m1 = body1.mass.value;
        const m2 = body2.mass.value;
        const v1i = body1.velocity.x;
        const v2i = body2.velocity.x;
        const x1i = body1.position.x;
        const x2i = body2.position.x;

        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 1000;

        const isInelastic = this.isInelastic(problem);
        const e = this.getCoefficientOfRestitution(problem);

        const v1f = ((m1 - e * m2) * v1i + (1 + e) * m2 * v2i) / (m1 + m2);
        const v2f = ((m2 - e * m1) * v2i + (1 + e) * m1 * v1i) / (m1 + m2);

        const relativeSpeed = v1i - v2i;
        let collisionTime: number;
        if (Math.abs(x2i - x1i) < 1e-12) {
            collisionTime = 0;
        } else if (Math.abs(relativeSpeed) < 1e-12) {
            collisionTime = Infinity;
        } else {
            collisionTime = (x2i - x1i) / relativeSpeed;
        }
        const collisionOccurs = collisionTime >= 0 && collisionTime <= duration;

        // 解析解 sampling: 两体碰撞 — 碰前匀速 + 碰后匀速 (公共脚手架 sampleTrajectory)
        const traj1 = sampleTrajectory({
            sampleCount,
            duration,
            sampleAt: t => {
                const beforeCollision = !collisionOccurs || t < collisionTime;
                const vel1 = beforeCollision ? v1i : v1f;
                const pos1 = beforeCollision ? x1i + v1i * t : x1i + v1i * collisionTime + v1f * (t - collisionTime);
                const speed1 = Math.abs(vel1);
                return {
                    position: { x: pos1, y: 0 },
                    velocity: { x: vel1, y: 0 },
                    acceleration: { x: 0, y: 0 },
                    kineticEnergy: kineticEnergy(m1, speed1),
                    potentialEnergy: 0
                };
            }
        });
        const traj2 = sampleTrajectory({
            sampleCount,
            duration,
            sampleAt: t => {
                const beforeCollision = !collisionOccurs || t < collisionTime;
                const vel2 = beforeCollision ? v2i : v2f;
                const pos2 = beforeCollision ? x2i + v2i * t : x2i + v2i * collisionTime + v2f * (t - collisionTime);
                const speed2 = Math.abs(vel2);
                return {
                    position: { x: pos2, y: 0 },
                    velocity: { x: vel2, y: 0 },
                    acceleration: { x: 0, y: 0 },
                    kineticEnergy: kineticEnergy(m2, speed2),
                    potentialEnergy: 0
                };
            }
        });

        const keyframes: Keyframe[] = [];
        keyframes.push({
            label: '初始状态',
            t: 0,
            position: { x: x1i, y: 0 },
            velocity: { x: v1i, y: 0 },
            description: `物体1: x=${x1i}m, v=${v1i}m/s; 物体2: x=${x2i}m, v=${v2i}m/s`
        });

        if (collisionOccurs) {
            const xCollide = x1i + v1i * collisionTime;
            keyframes.push({
                label: '碰撞瞬间',
                t: collisionTime,
                position: { x: xCollide, y: 0 },
                velocity: { x: v1i, y: 0 },
                description: `碰撞前: v₁=${v1i.toFixed(4)}m/s, v₂=${v2i.toFixed(4)}m/s; 碰撞后: v₁'=${v1f.toFixed(4)}m/s, v₂'=${v2f.toFixed(4)}m/s`
            });
        }

        const finalPos1 = traj1[traj1.length - 1].position;
        const finalPos2 = traj2[traj2.length - 1].position;
        keyframes.push({
            label: '终点',
            t: duration,
            position: finalPos1,
            velocity: traj1[traj1.length - 1].velocity,
            description: `物体1: x=${finalPos1.x.toFixed(3)}m, v=${(collisionOccurs ? v1f : v1i).toFixed(3)}m/s; 物体2: x=${finalPos2.x.toFixed(3)}m, v=${(collisionOccurs ? v2f : v2i).toFixed(3)}m/s`
        });

        const v_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '速度',
            xUnit: 's',
            yUnit: 'm/s',
            points: [...traj1.map(p => ({ x: p.t, y: p.velocity.x }))]
        };
        const p_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '动量',
            xUnit: 's',
            yUnit: 'kg·m/s',
            points: traj1.map((p, i) => ({
                x: p.t,
                y: m1 * p.velocity.x + m2 * traj2[i].velocity.x
            }))
        };
        const ke_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '总动能',
            xUnit: 's',
            yUnit: 'J',
            points: traj1.map((p, i) => ({
                x: p.t,
                y: p.kineticEnergy! + traj2[i].kineticEnergy!
            }))
        };

        const pInit = m1 * v1i + m2 * v2i;
        const pFinal = m1 * (collisionOccurs ? v1f : v1i) + m2 * (collisionOccurs ? v2f : v2i);
        const keInit = kineticEnergy(m1, v1i) + kineticEnergy(m2, v2i);
        const keFinal = 0.5 * m1 * (collisionOccurs ? v1f : v1i) ** 2 + 0.5 * m2 * (collisionOccurs ? v2f : v2i) ** 2;

        const conservedQuantities: ConservedQuantity[] = [
            {
                name: '总动量',
                law: '动量守恒定律',
                initialValue: pInit,
                finalValue: pFinal,
                maxDeviation: Math.abs(pFinal - pInit),
                tolerance: 1e-10,
                conserved: Math.abs(pFinal - pInit) < 1e-10
            }
        ];

        if (e === 1) {
            conservedQuantities.push({
                name: '总动能',
                law: '动能守恒 (弹性碰撞)',
                initialValue: keInit,
                finalValue: keFinal,
                maxDeviation: Math.abs(keFinal - keInit),
                tolerance: 1e-10,
                conserved: Math.abs(keFinal - keInit) < 1e-10
            });
        }

        const collisionType = isInelastic ? `非弹性碰撞 (e=${e})` : '弹性碰撞';
        const steps: ExplanationStep[] = [
            { order: 1, description: '碰撞类型', formula: collisionType },
            { order: 2, description: '动量守恒', formula: "m₁v₁ + m₂v₂ = m₁v₁' + m₂v₂'" },
            {
                order: 3,
                description: '物体1碰后速度',
                formula: isInelastic
                    ? "v₁' = ((m₁-e·m₂)v₁ + (1+e)m₂v₂) / (m₁+m₂)"
                    : "v₁' = ((m₁-m₂)v₁ + 2m₂v₂) / (m₁+m₂)",
                calculation: `v₁' = ${v1f.toFixed(4)} m/s`
            },
            {
                order: 4,
                description: '物体2碰后速度',
                formula: isInelastic
                    ? "v₂' = ((m₂-e·m₁)v₂ + (1+e)m₁v₁) / (m₁+m₂)"
                    : "v₂' = (2m₁v₁ + (m₂-m₁)v₂) / (m₁+m₂)",
                calculation: `v₂' = ${v2f.toFixed(4)} m/s`
            }
        ];

        const formulas: FormulaUsage[] = [
            {
                name: '动量守恒',
                formula: "m₁v₁ + m₂v₂ = m₁v₁' + m₂v₂'",
                variables: {
                    m1: { value: m1, unit: 'kg' },
                    m2: { value: m2, unit: 'kg' },
                    v1: { value: v1i, unit: 'm/s' },
                    v2: { value: v2i, unit: 'm/s' }
                }
            },
            {
                name: "碰后速度v₁'",
                formula: isInelastic
                    ? "v₁' = ((m₁-e·m₂)v₁ + (1+e)m₂v₂) / (m₁+m₂)"
                    : "v₁' = ((m₁-m₂)v₁ + 2m₂v₂) / (m₁+m₂)",
                variables: {
                    m1: { value: m1, unit: 'kg' },
                    m2: { value: m2, unit: 'kg' },
                    v1: { value: v1i, unit: 'm/s' },
                    v2: { value: v2i, unit: 'm/s' }
                }
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [traj1, traj2],
            keyframes,
            charts: { v_t, p_t, ke_t },
            diagnostics: {
                conservedQuantities,
                maxValues: {
                    maxSpeed1: Math.max(...traj1.map(p => Math.abs(p.velocity.x))),
                    maxSpeed2: Math.max(...traj2.map(p => Math.abs(p.velocity.x))),
                    collisionTime: collisionOccurs ? collisionTime : -1
                },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `两物体发生${collisionType}，动量守恒`,
                steps,
                formulas
            },
            errors: [],
            warnings: []
        };
    }
}

export class InelasticCollisionModel extends CollisionModel {
    override readonly name = '一维非弹性碰撞';
    override readonly description = '两个物体在一维方向上发生非弹性碰撞，恢复系数 e ∈ [0,1)';
    override readonly modelType = 'collision-inelastic' as const;
    override readonly assumptions = [
        '碰撞为一维 (沿 x 轴)',
        '碰撞瞬间完成，不考虑碰撞持续时间',
        '无外力作用',
        '物体视为质点',
        '碰撞为非弹性，动能不守恒'
    ];
}

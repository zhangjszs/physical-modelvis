import type { PhysicsProblem } from '../types/problem.js';
import { kineticEnergy, sampleTrajectory } from '../physics/kinematics.js';
import type { SimulationResult, Keyframe, ChartSeries, ForceDiagram, ConservedQuantity } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 牛顿第三定律模型 — 作用力与反作用力 (必修一 第三章 §5)
 *
 * F_AB = -F_BA (大小相等、方向相反、作用在两个物体上)。
 * 光滑水平面自由双体相互作用 (#177 修正):
 *   - allowMotion=false: 两物体静止, 仅展示 F_AB = -F_BA。
 *   - allowMotion=true (无外力, 内力 F_AB 恒定):
 *       A 受 F_BA = -F_AB → a_A = -F_AB/m_A;  B 受 F_AB → a_B = +F_AB/m_B。
 *       系统总动量恒守恒: m_A·v_A(t) + m_B·v_B(t) ≡ m_A·v_A0 + m_B·v_B0 (质心不动/匀速)。
 *       F_AB > 0: 互推背向分离;  F_AB < 0: 互拉相向靠拢, 相遇接触后以质心速度
 *       v_cm 共同运动 (初速为 0 时停在质心), 绝不互相穿透。
 */
export class NewtonThirdLawModel extends PhysicsModelBase {
    readonly name = '牛顿第三定律';
    readonly version = '1.1.0';
    readonly description = '作用力与反作用力大小相等、方向相反、作用在两个物体上';
    readonly modelType = 'newton-third-law' as const;
    readonly assumptions = [
        '两物体视为质点',
        '接触面光滑 (无摩擦、无外力)',
        '作用力恒定',
        '作用力与反作用力同时产生、同时消失'
    ];
    readonly applicableRange = '验证 F_AB = -F_BA 与系统动量守恒，适用于静止与自由双体相互作用';
    readonly errorSources = ['弹簧测力计本身的示值误差', '运动状态下读数困难'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'forceAB', description: 'A 对 B 的作用力 (N)', unit: 'N', required: true },
        { name: 'massA', description: '物体 A 质量 (kg)', unit: 'kg', required: true, min: 0 },
        { name: 'massB', description: '物体 B 质量 (kg)', unit: 'kg', required: true, min: 0 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.newtonThirdLaw;
        if (!c) {
            throw new Error('牛顿第三定律模型需要 constraints.newtonThirdLaw 配置');
        }

        const forceAB = c.forceAB;
        const allowMotion = c.allowMotion ?? false;

        const bodies = problem.bodies;
        if (bodies.length < 2) {
            throw new Error('牛顿第三定律模型需要两个物体 (A 与 B)');
        }

        const mA = bodies[0]!.mass.value;
        const mB = bodies[1]!.mass.value;
        const xA0 = bodies[0]!.position.x;
        const xB0 = bodies[1]!.position.x;
        const vA0 = bodies[0]!.velocity.x;
        const vB0 = bodies[1]!.velocity.x;

        const F_AB = forceAB;
        const F_BA = -forceAB;

        // 自由双体内力加速度 (无外力, 质心加速度恒为 0)
        const aA = allowMotion ? -F_AB / mA : 0;
        const aB = allowMotion ? F_AB / mB : 0;
        const vCM = (mA * vA0 + mB * vB0) / (mA + mB);

        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 500;

        // 相向接触时刻 (F_AB < 0 互拉靠拢): 解 xA(t)=xB(t) 的最小正根
        let tContact = Infinity;
        if (allowMotion && F_AB < 0) {
            const qa = 0.5 * (aA - aB);
            const qb = vA0 - vB0;
            const qc = xA0 - xB0;
            const roots: number[] = [];
            if (Math.abs(qa) < 1e-12) {
                if (Math.abs(qb) > 1e-12) roots.push(-qc / qb);
            } else {
                const disc = qb * qb - 4 * qa * qc;
                if (disc >= 0) {
                    const sq = Math.sqrt(disc);
                    roots.push((-qb - sq) / (2 * qa), (-qb + sq) / (2 * qa));
                }
            }
            const positive = roots.filter(t => t > 1e-9).sort((x, y) => x - y);
            tContact = positive[0] ?? Infinity;
        }
        const contactInWindow = tContact <= duration;
        const xContact = xA0 + vA0 * tContact + 0.5 * aA * tContact * tContact;

        /** 分段解析: 接触前各自匀加速, 接触后以 v_cm 共同运动 (不穿透) */
        const stateAt = (t: number, x0: number, v0: number, a: number, m: number) => {
            if (contactInWindow && t >= tContact) {
                const x = xContact + vCM * (t - tContact);
                return {
                    position: { x, y: 0 },
                    velocity: { x: vCM, y: 0 },
                    acceleration: { x: 0, y: 0 },
                    kineticEnergy: kineticEnergy(m, Math.abs(vCM)),
                    potentialEnergy: 0
                };
            }
            const v = v0 + a * t;
            const x = x0 + v0 * t + 0.5 * a * t * t;
            return {
                position: { x, y: 0 },
                velocity: { x: v, y: 0 },
                acceleration: { x: a, y: 0 },
                kineticEnergy: kineticEnergy(m, Math.abs(v)),
                potentialEnergy: 0
            };
        };

        const trajA = sampleTrajectory({
            sampleCount,
            duration,
            sampleAt: t => stateAt(t, xA0, vA0, aA, mA)
        });
        const trajB = sampleTrajectory({
            sampleCount,
            duration,
            sampleAt: t => stateAt(t, xB0, vB0, aB, mB)
        });

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '初始状态',
                t: 0,
                position: { x: xA0, y: 0 },
                velocity: { x: vA0, y: 0 },
                description: `A (m=${mA}kg, x=${xA0}m) 与 B (m=${mB}kg, x=${xB0}m), A 对 B 施加 ${F_AB}N`
            },
            {
                label: '作用力与反作用力',
                t: duration / 2,
                position: { x: (xA0 + xB0) / 2, y: 0 },
                velocity: { x: vCM, y: 0 },
                description: `F_AB=${F_AB}N, F_BA=${F_BA}N，大小相等方向相反，分别作用在 B 与 A 上`
            }
        ];
        if (contactInWindow) {
            keyframes.push({
                label: '相向接触',
                t: tContact,
                position: { x: xContact, y: 0 },
                velocity: { x: vCM, y: 0 },
                description: `两体于 t=${tContact.toFixed(3)}s 在 x=${xContact.toFixed(3)}m (质心) 接触，之后以质心速度 v_cm=${vCM.toFixed(3)}m/s 共同运动，绝不穿透`
            });
        }
        const lastA = trajA[trajA.length - 1]!;
        const lastB = trajB[trajB.length - 1]!;
        keyframes.push({
            label: '终点',
            t: duration,
            position: lastA.position,
            velocity: lastA.velocity,
            description: allowMotion
                ? `t=${duration}s: v_A=${lastA.velocity.x.toFixed(3)}m/s, v_B=${lastB.velocity.x.toFixed(3)}m/s, 系统总动量 P=${(mA * lastA.velocity.x + mB * lastB.velocity.x).toFixed(3)}kg·m/s (守恒)`
                : '两物体保持静止，作用力与反作用力依然存在'
        });

        // 图表：F_AB 与 F_BA 随时间变化 (互为相反数)
        const F_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '力',
            xUnit: 's',
            yUnit: 'N',
            points: trajA.map(p => ({ x: p.t, y: F_AB }))
        };
        const v_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '速度 (A)',
            xUnit: 's',
            yUnit: 'm/s',
            points: trajA.map(p => ({ x: p.t, y: p.velocity.x }))
        };

        // 受力分析图 (作用在 B 上的 F_AB 与作用在 A 上的 F_BA)
        const forceDiagram: ForceDiagram = {
            bodyId: 'system',
            forces: [
                { name: 'F_AB (A 对 B)', vector: { x: F_AB, y: 0 }, magnitude: Math.abs(F_AB), unit: 'N' },
                { name: 'F_BA (B 对 A)', vector: { x: F_BA, y: 0 }, magnitude: Math.abs(F_BA), unit: 'N' }
            ],
            netForce: { x: 0, y: 0 } // 系统内力抵消, ΣF_ext = 0
        };

        // 守恒量: 作用力=反作用力 + 系统总动量守恒
        const p0 = mA * vA0 + mB * vB0;
        let maxDev = 0;
        for (let i = 0; i < trajA.length; i++) {
            const p = mA * trajA[i]!.velocity.x + mB * trajB[i]!.velocity.x;
            maxDev = Math.max(maxDev, Math.abs(p - p0));
        }
        const conservedQuantities: ConservedQuantity[] = [
            {
                name: '作用力 = 反作用力',
                law: '牛顿第三定律',
                initialValue: Math.abs(F_AB),
                finalValue: Math.abs(F_BA),
                maxDeviation: 0,
                tolerance: 1e-10,
                conserved: Math.abs(Math.abs(F_AB) - Math.abs(F_BA)) < 1e-10
            },
            {
                name: '系统总动量守恒',
                law: '动量守恒 (ΣF_ext = dP/dt = 0)',
                initialValue: p0,
                finalValue: mA * lastA.velocity.x + mB * lastB.velocity.x,
                maxDeviation: maxDev,
                tolerance: 1e-9,
                conserved: maxDev < 1e-9
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajA, trajB],
            keyframes,
            charts: { F_t, v_t, force_diagram: forceDiagram },
            diagnostics: {
                conservedQuantities,
                maxValues: {
                    forceAB: Math.abs(F_AB),
                    forceBA: Math.abs(F_BA),
                    acceleration: 0, // 系统质心加速度: 内力不改变质心运动
                    accelA: aA,
                    accelB: aB
                },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: allowMotion
                    ? `自由双体内力作用: a_A=-F_AB/m_A=${aA.toFixed(3)}m/s², a_B=F_AB/m_B=${aB.toFixed(3)}m/s², 系统总动量 P=${p0.toFixed(3)}kg·m/s 守恒${contactInWindow ? `, 两体于 t=${tContact.toFixed(3)}s 相向接触` : ''}`
                    : `A 与 B 静止，F_AB=${F_AB}N 与 F_BA=${F_BA}N 大小相等、方向相反`,
                steps: [
                    {
                        order: 1,
                        description: '作用力与反作用力大小',
                        formula: '|F_AB| = |F_BA|',
                        calculation: `|F_AB|=${Math.abs(F_AB)}N, |F_BA|=${Math.abs(F_BA)}N`
                    },
                    { order: 2, description: '方向关系', formula: 'F_AB = -F_BA', result: '方向相反，沿同一直线' },
                    {
                        order: 3,
                        description: '作用对象',
                        formula: 'F_AB 作用在 B 上，F_BA 作用在 A 上',
                        result: '不能抵消 (不同于平衡力)'
                    },
                    {
                        order: 4,
                        description: allowMotion ? '各自加速度 (牛顿第二定律)' : '静止条件',
                        formula: allowMotion ? 'a_A = -F_AB/m_A, a_B = F_AB/m_B' : 'ΣF = 0',
                        calculation: allowMotion
                            ? `a_A = -${F_AB}/${mA} = ${aA.toFixed(3)} m/s², a_B = ${F_AB}/${mB} = ${aB.toFixed(3)} m/s²`
                            : '外力为零，两物体保持静止'
                    },
                    {
                        order: 5,
                        description: '系统动量守恒 (内力不改变质心运动)',
                        formula: 'm_A·v_A + m_B·v_B = const, ΣF_ext = dP/dt = 0',
                        calculation: `P = ${p0.toFixed(3)} kg·m/s 恒定, 质心加速度 = 0`
                    }
                ],
                formulas: [
                    {
                        name: '牛顿第三定律',
                        formula: 'F_AB = -F_BA',
                        variables: { F_AB: { value: F_AB, unit: 'N' }, F_BA: { value: F_BA, unit: 'N' } }
                    },
                    {
                        name: '大小相等',
                        formula: '|F_AB| = |F_BA|',
                        variables: {
                            '|F_AB|': { value: Math.abs(F_AB), unit: 'N' },
                            '|F_BA|': { value: Math.abs(F_BA), unit: 'N' }
                        }
                    },
                    {
                        name: '各自加速度',
                        formula: 'a_A = -F_AB/m_A, a_B = F_AB/m_B',
                        variables: { a_A: { value: aA, unit: 'm/s²' }, a_B: { value: aB, unit: 'm/s²' } }
                    },
                    {
                        name: '系统总动量守恒',
                        formula: 'm_A·v_A + m_B·v_B = const',
                        variables: { P: { value: p0, unit: 'kg·m/s' } }
                    },
                    { name: '同时性', formula: '同时产生、同时变化、同时消失', variables: {} },
                    { name: '系统性', formula: '作用在两个不同物体上', variables: {} }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

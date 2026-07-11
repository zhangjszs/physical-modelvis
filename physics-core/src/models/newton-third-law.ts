import type { PhysicsProblem } from '../types/problem.js';
import { kineticEnergy } from '../physics/kinematics.js';
import type {
    SimulationResult,
    TrajectoryPoint,
    Keyframe,
    ChartSeries,
    ForceDiagram,
    ConservedQuantity
} from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 牛顿第三定律模型 — 作用力与反作用力 (必修一 第三章 §5)
 *
 * 两个物体 A、B 在光滑水平面上通过细绳连接，A 用恒力 F 拉 B (或互相推)：
 *   F_AB = -F_BA  (大小相等、方向相反、作用在两个物体上)
 *
 * 模式：
 *   - allowMotion=true:  两物体在光滑水平面上加速运动 (a = F/(mA+mB))
 *   - allowMotion=false: 两物体固定 (静止状态下展示作用力与反作用力)
 *
 * 模型生成两条轨迹 (A、B 各一条)，并把 F_AB、F_BA 随时间的变化存入图表。
 */
export class NewtonThirdLawModel extends PhysicsModelBase {
    readonly name = '牛顿第三定律';
    readonly version = '1.0.0';
    readonly description = '作用力与反作用力大小相等、方向相反、作用在两个物体上';
    readonly modelType = 'newton-third-law' as const;
    readonly assumptions = [
        '两物体视为质点',
        '接触面光滑 (无摩擦)',
        '作用力恒定',
        '作用力与反作用力同时产生、同时消失'
    ];
    readonly applicableRange = '验证 F_AB = -F_BA，适用于静止、匀速、加速运动状态';
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

        // F_AB = +forceAB (A 推/拉 B 沿 +x 方向)
        // F_BA = -forceAB (B 推/拉 A 沿 -x 方向)
        const F_AB = forceAB;
        const F_BA = -forceAB;

        // 加速度 (仅当 allowMotion=true 时两物体一起加速)
        // A 受 -F_AB 力 (反作用)，B 受 +F_AB 力，但二者用绳连接时整体加速度 a = F_AB/(mA+mB)
        // 这里采用"绳连接整体加速"模型，更贴近课堂演示
        const aSystem = allowMotion ? F_AB / (mA + mB) : 0;

        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 500;
        const dt = duration / sampleCount;

        const trajA: TrajectoryPoint[] = [];
        const trajB: TrajectoryPoint[] = [];

        for (let i = 0; i <= sampleCount; i++) {
            const t = i * dt;
            const v = vA0 + aSystem * t;
            const dxA = vA0 * t + 0.5 * aSystem * t * t;
            const xA = xA0 + dxA;
            const xB = xB0 + dxA; // 绳连接：两物体同步运动
            const keA = kineticEnergy(mA, v);
            const keB = kineticEnergy(mB, v);

            trajA.push({
                t,
                position: { x: xA, y: 0 },
                velocity: { x: v, y: 0 },
                acceleration: { x: aSystem, y: 0 },
                kineticEnergy: keA,
                potentialEnergy: 0
            });
            trajB.push({
                t,
                position: { x: xB, y: 0 },
                velocity: { x: v, y: 0 },
                acceleration: { x: aSystem, y: 0 },
                kineticEnergy: keB,
                potentialEnergy: 0
            });
        }

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '初始状态',
                t: 0,
                position: { x: xA0, y: 0 },
                velocity: { x: vA0, y: 0 },
                description: `A (m=${mA}kg) 与 B (m=${mB}kg) 静止，A 用 ${F_AB}N 拉 B`
            },
            {
                label: '作用力与反作用力',
                t: duration / 2,
                position: { x: (xA0 + xB0) / 2, y: 0 },
                velocity: { x: vA0 + aSystem * (duration / 2), y: 0 },
                description: `F_AB=${F_AB}N, F_BA=${F_BA}N，大小相等方向相反`
            },
            {
                label: '终点',
                t: duration,
                position: { x: xA0 + vA0 * duration + 0.5 * aSystem * duration * duration, y: 0 },
                velocity: { x: vA0 + aSystem * duration, y: 0 },
                description: allowMotion
                    ? `两物体共同加速到 v=${(vA0 + aSystem * duration).toFixed(3)} m/s`
                    : '两物体保持静止，作用力反作用力依然存在'
            }
        ];

        // 图表：F_AB 与 F_BA 随时间变化 (互为相反数)
        const F_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '力',
            xUnit: 's',
            yUnit: 'N',
            points: trajA.map((p, i) => ({
                x: p.t,
                y: i % 2 === 0 ? F_AB : F_AB // 恒力，曲线为水平直线
            }))
        };
        const v_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '速度',
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
            netForce: { x: 0, y: 0 } // 系统内力抵消
        };

        // 守恒量：作用力反作用力大小相等
        const conservedQuantities: ConservedQuantity[] = [
            {
                name: '作用力 = 反作用力',
                law: '牛顿第三定律',
                initialValue: Math.abs(F_AB),
                finalValue: Math.abs(F_BA),
                maxDeviation: 0,
                tolerance: 1e-10,
                conserved: Math.abs(Math.abs(F_AB) - Math.abs(F_BA)) < 1e-10
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
                    acceleration: aSystem
                },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: allowMotion
                    ? `A (m=${mA}kg) 与 B (m=${mB}kg) 在 ${F_AB}N 拉力下共同加速 a=F/(mA+mB)=${aSystem.toFixed(3)} m/s²，F_AB=${F_AB}N=-F_BA`
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
                        description: allowMotion ? '系统加速度' : '静止条件',
                        formula: allowMotion ? 'a = F/(mA+mB)' : 'ΣF_A = 0',
                        calculation: allowMotion
                            ? `a = ${F_AB}/(${mA}+${mB}) = ${aSystem.toFixed(3)} m/s²`
                            : '外力为零，两物体保持静止'
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
                    { name: '同时性', formula: '同时产生、同时变化、同时消失', variables: {} },
                    { name: '系统性', formula: '作用在两个不同物体上', variables: {} }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

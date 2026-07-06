import type { PhysicsProblem } from '../types/problem.js';
import type {
    SimulationResult,
    TrajectoryPoint,
    Keyframe,
    ChartSeries,
    ConservedQuantity,
    ExplanationStep
} from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 平抛验证动量守恒模型 — 选必一 第一章 实验
 *
 * 入射小球 (m1) 从斜轨末端平抛, 击中静止的等质量/不等质量被撞小球 (m2);
 * 碰撞后两球同时平抛落地, 落点分别为 OM 和 ON (水平射程).
 *
 * 验证: m1 * OP = m1 * OM + m2 * ON
 *   - OP: 入射球单独平抛射程 (碰前)
 *   - OM: 入射球碰后射程
 *   - ON: 被撞球碰后射程
 *   - h: 实验台高度 (平抛高度)
 *
 * 解析处理:
 *   - 平抛时间: t_fall = sqrt(2h/g)
 *   - 完全弹性碰撞: v1' = (m1-m2)/(m1+m2)*v1, v2' = 2*m1/(m1+m2)*v1
 *   - 完全非弹性碰撞: v' = m1/(m1+m2)*v1 (两球合一)
 *   - 一般弹性系数 e: v1' = (m1-e*m2)/(m1+m2)*v1, v2' = (1+e)*m1/(m1+m2)*v1
 *
 * 默认弹性系数 e=1 (完全弹性).
 */
export class ProjectileCollisionModel extends PhysicsModelBase {
    readonly name = '平抛验证动量守恒';
    readonly version = '1.0.0';
    readonly description = '平抛等时性 + 动量守恒验证: m1*OP = m1*OM + m2*ON';
    readonly modelType = 'projectile-collision' as const;
    readonly assumptions = [
        '两球同时平抛, 下落时间相同 (等时性)',
        '斜轨末端水平 (平抛初速水平)',
        '碰撞时间极短, 忽略重力冲量',
        '水平面光滑, 碰后两球做匀速直线运动'
    ];
    readonly applicableRange = 'm1,m2: 0.01--1 kg; v1Initial: 0.5--10 m/s; tableHeight: 0.3--2 m';
    readonly errorSources = [
        '斜轨末端不完全水平',
        '碰撞时有能量损失 (空气阻力)',
        '落点位置测量误差',
        '多次碰撞取平均落点位置不精确'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'm1', description: '入射球质量 (kg)', unit: 'kg', required: true, min: 0.01, max: 2 },
        { name: 'm2', description: '被撞球质量 (kg)', unit: 'kg', required: true, min: 0.01, max: 2 },
        { name: 'v1Initial', description: '入射球碰前速度 (m/s)', unit: 'm/s', required: true, min: 0.1, max: 20 },
        { name: 'tableHeight', description: '实验台高度 (m)', unit: 'm', required: true, min: 0.1, max: 5 },
        {
            name: 'restitution',
            description: '弹性系数 e (1=完全弹性, 0=完全非弹性)',
            unit: '',
            required: false,
            min: 0,
            max: 1
        },
        { name: 'gravity', description: '重力加速度 (m/s^2)', unit: 'm/s^2', required: false, min: 1, max: 20 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.projectileCollision;
        if (!c) throw new Error('projectile-collision 模型需要 projectileCollision 约束配置');

        const m1 = c.m1;
        const m2 = c.m2;
        const v1 = c.v1Initial;
        const h = c.tableHeight;
        const e = c.restitution ?? 1;
        const g = c.gravity ?? 9.8;

        // 平抛下落时间
        const tFall = Math.sqrt((2 * h) / g);

        // 碰前射程 (入射球单独平抛)
        const OP = v1 * tFall;

        // 碰后速度 (沿入射方向, 一维弹性碰撞)
        const v1After = ((m1 - e * m2) / (m1 + m2)) * v1;
        const v2After = (((1 + e) * m1) / (m1 + m2)) * v1;

        // 碰后射程
        const OM = Math.abs(v1After) * tFall;
        const ON = Math.abs(v2After) * tFall;

        // 动量守恒验证
        const pBefore = m1 * v1;
        const pAfter = m1 * v1After + m2 * v2After;
        const momentumError = Math.abs(pAfter - pBefore);
        const momentumRelErr = pBefore > 0 ? momentumError / pBefore : 0;

        // 动能变化
        const KE1Before = 0.5 * m1 * v1 * v1;
        const KE1After = 0.5 * m1 * v1After * v1After;
        const KE2After = 0.5 * m2 * v2After * v2After;
        const KETotalBefore = KE1Before;
        const KETotalAfter = KE1After + KE2After;
        const KEloss = KETotalBefore - KETotalAfter;

        // 静态轨迹 (按时间, 两球的水平位置)
        const sampleCount = problem.timeConfig.sampleCount ?? 200;
        const trajectory: TrajectoryPoint[] = [];
        for (let i = 0; i <= sampleCount; i++) {
            const t = (i / sampleCount) * tFall;
            // 使用质心参考, 轨迹取 m1 的水平射程
            trajectory.push({
                t,
                position: { x: v1 * t, y: h - 0.5 * g * t * t },
                velocity: { x: v1, y: -g * t },
                acceleration: { x: 0, y: -g },
                kineticEnergy: 0.5 * m1 * (v1 * v1 + g * t * (g * t)),
                potentialEnergy: m1 * g * (h - 0.5 * g * t * t)
            });
        }

        const collisionPoint = { x: 0, y: h }; // 碰撞点 (以轨道末端为原点)

        const keyframes: Keyframe[] = [
            {
                label: '入射球单独平抛 (碰前)',
                t: 0,
                position: { x: 0, y: h },
                velocity: { x: v1, y: 0 },
                description: `m1=${m1}kg, v1=${v1}m/s, 射程 OP=${OP.toFixed(3)}m, 下落时间 t=${tFall.toFixed(3)}s`
            },
            {
                label: '碰撞瞬间',
                t: 0,
                position: collisionPoint,
                velocity: { x: v1, y: 0 },
                description: `完全弹性(e=${e}), 碰前动量 p=${pBefore.toFixed(3)} kg*m/s`
            },
            {
                label: '入射球碰后落点 (OM)',
                t: tFall,
                position: { x: OM, y: 0 },
                velocity: { x: v1After, y: -g * tFall },
                description: `碰后速度 v1'=${v1After.toFixed(3)}m/s, 射程 OM=${OM.toFixed(3)}m`
            },
            {
                label: '被撞球碰后落点 (ON)',
                t: tFall,
                position: { x: ON, y: 0 },
                velocity: { x: v2After, y: -g * tFall },
                description: `碰后速度 v2'=${v2After.toFixed(3)}m/s, 射程 ON=${ON.toFixed(3)}m`
            }
        ];

        // 图表: 射程标记图 (静态示意图)
        const rangeDiagram: ChartSeries = {
            xLabel: '落点水平距离 (m)',
            yLabel: '标记',
            xUnit: 'm',
            yUnit: '',
            points: [
                { x: 0, y: 0 },
                { x: OP, y: 2 },
                { x: OM, y: 1.5 },
                { x: ON, y: 1 },
                { x: Math.max(OP, OM, ON) * 1.1, y: 0 }
            ]
        };

        // 图表: v1-v2 速度扫描 (不同质量比 m2/m1)
        const velocityChart: ChartSeries = {
            xLabel: '质量比 m2/m1',
            yLabel: '碰后速度 (m/s)',
            xUnit: '',
            yUnit: 'm/s',
            points: []
        };
        for (let i = 0; i <= 20; i++) {
            const ratio = i / 10; // 0.0 ~ 2.0
            const mb = m1 * ratio;
            const va = ((m1 - e * mb) / (m1 + mb)) * v1;
            velocityChart.points.push({ x: ratio, y: va });
        }

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '平抛下落时间',
                formula: 't_fall = sqrt(2h/g)',
                calculation: `t = sqrt(2*${h}/${g}) = ${tFall.toFixed(4)}s`
            },
            {
                order: 2,
                description: '碰前射程 OP',
                formula: 'OP = v1 * t_fall',
                calculation: `OP = ${v1} * ${tFall.toFixed(4)} = ${OP.toFixed(3)}m`
            },
            {
                order: 3,
                description: '动量守恒 + 碰后速度',
                formula: "m1*v1 = m1*v1' + m2*v2'",
                calculation: `v1' = ${(m1 - e * m2).toFixed(3)}/${(m1 + m2).toFixed(3)} * ${v1} = ${v1After.toFixed(3)}m/s, v2' = ${v2After.toFixed(3)}m/s`
            },
            {
                order: 4,
                description: '动量守恒验证',
                formula: 'm1*OP = m1*OM + m2*ON',
                calculation: `${m1.toFixed(2)}*${OP.toFixed(3)} = ${(m1 * OP).toFixed(4)}; ${m1.toFixed(2)}*${OM.toFixed(3)} + ${m2.toFixed(2)}*${ON.toFixed(3)} = ${(m1 * OM + m2 * ON).toFixed(4)}; 相对误差=${(momentumRelErr * 100).toFixed(3)}%`
            },
            {
                order: 5,
                description: '动能变化',
                formula: 'DeltaKE = 0.5*m1*v1^2 - (0.5*m1*v1_prime^2 + 0.5*m2*v2_prime^2)',
                calculation: `DeltaKE = ${KETotalBefore.toFixed(4)} - ${KETotalAfter.toFixed(4)} = ${KEloss.toFixed(4)} J`
            }
        ];

        const warnings: string[] = [];
        if (e < 1 && KEloss > 0.1 * KETotalBefore) warnings.push('非弹性碰撞损失较多动能');
        if (Math.abs(v1After) > v1) warnings.push('碰后入射球速度增大 — 检查质量比');
        if (tFall > 1) warnings.push('下落时间过长, 空气阻力不可忽略');

        const conservedQuantities: ConservedQuantity[] = [
            {
                name: '水平动量',
                law: '动量守恒 (水平方向不受外力)',
                initialValue: pBefore,
                finalValue: pAfter,
                maxDeviation: momentumError,
                tolerance: pBefore * 1e-6,
                conserved: momentumError < pBefore * 1e-6
            }
        ];

        return {
            meta: {
                model: 'projectile-collision',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: {
                range_diagram: rangeDiagram,
                velocity_ratio_scan: velocityChart
            },
            diagnostics: {
                conservedQuantities,
                maxValues: {
                    OP,
                    OM,
                    ON,
                    tFall,
                    v1,
                    v1After,
                    v2After,
                    m1,
                    m2,
                    e,
                    pBefore,
                    pAfter,
                    momentumRelErr,
                    KETotalBefore,
                    KETotalAfter,
                    KEloss
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `平抛动量守恒: m1=${m1}kg, m2=${m2}kg, v1=${v1}m/s, e=${e}; OP=${OP.toFixed(3)}m, OM=${OM.toFixed(3)}m, ON=${ON.toFixed(3)}m; 动量相对误差 ${(momentumRelErr * 100).toFixed(4)}%`,
                steps,
                formulas: [
                    {
                        name: '平抛时间',
                        formula: 't_fall = sqrt(2h/g)',
                        variables: {
                            h: { value: h, unit: 'm' },
                            g: { value: g, unit: 'm/s^2' },
                            t_fall: { value: tFall, unit: 's' }
                        }
                    },
                    {
                        name: '动量守恒',
                        formula: 'm1*v1 = m1*v1_prime + m2*v2_prime',
                        variables: { m1: { value: m1, unit: 'kg' }, m2: { value: m2, unit: 'kg' } }
                    },
                    { name: '射程', formula: 'R = v * t_fall', variables: {} }
                ]
            },
            errors: [],
            warnings
        };
    }
}

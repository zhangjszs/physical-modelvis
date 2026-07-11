import type { PhysicsProblem , JouleMechanicalConstraint} from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 焦耳热功当量 (机械) 模型 — 热学实验 (测定热功当量 J)
 *
 * 实验装置: 一质量 m 的重物从高度 h 匀速下落 n 次, 带动叶轮搅拌水
 * 水升温满足: Q = M·c·dT
 * 机械功:     W = m·g·h·n
 * 热功当量:   J = W/Q (量纲 J/cal 或 J/J 取决于 Q 的单位)
 *
 * 本模型:
 *   - x_t = 累积机械功 W 随下落次数 i 变化
 *   - y_t = 吸收热量 Q 随下落次数 i 变化
 *   - v_t = J 的估计值收敛过程
 */

const G_DEFAULT = 9.8;
const C_WATER = 4184; // J/(kg·K)

/* 预期吸热与损耗系数 (高中实验直接假设 Q=W, 计入 '损耗系数' 可模拟真实数据) */
function expectedDeltaTPerDrop(w: number, spec: { waterMass: number; specificHeat: number }): number {
    return w / (spec.waterMass * spec.specificHeat);
}

export class JouleMechanicalModel extends PhysicsModelBase {
    readonly name = '焦耳热功当量 (机械法)';
    readonly version = '1.0.0';
    readonly description = '重物下落带动搅拌器, 测定机械功与水吸热的关系 J=W/Q';
    readonly modelType = 'joule-mechanical' as const;
    readonly assumptions = [
        '忽略滑轮摩擦, 重物下落功全部转化为水的内能',
        '量热器本身热容已折算为水当量 M',
        '水的比热容取常数 4184 J/(kg·K)',
        '水温升高缓慢, 向环境散热忽略不计'
    ];
    readonly applicableRange = '常温下水的升温范围 0~30℃ 的实验条件';
    readonly errorSources = [
        '搅拌器与水的粘滞阻力消耗功 (实际 W_水 < mgh)',
        '量热器向环境吸/散热造成系统误差',
        '水的比热容在测量范围内并非严格常数'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'mass', description: '重物质量 (kg)', unit: 'kg', required: true, min: 0.01, max: 50 },
        { name: 'height', description: '下落高度 (m)', unit: 'm', required: true, min: 0.1, max: 10 },
        { name: 'drops', description: '下落次数', unit: '', required: true, min: 1, max: 1000 },
        { name: 'waterMass', description: '水当量 (kg 水)', unit: 'kg', required: true, min: 0.05, max: 5 },
        {
            name: 'specificHeat',
            description: '比热容 (J/(kg·K))',
            unit: 'J/(kg·K)',
            required: false,
            defaultValue: C_WATER
        }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.jouleMechanical;
        if (!c) {
            throw new Error('joule-mechanical 模型需要 constraints.jouleMechanical 配置');
        }

        const g = c.gravity ?? G_DEFAULT;
        const cw = c.specificHeat ?? C_WATER;
        const wPerDrop = c.mass * g * c.height;
        const N = Math.max(1, Math.min(1000, Math.floor(c.drops)));

        /* ---------- 每步数据 (用作图表) ---------- */
        const pointsW: Array<{ x: number; y: number }> = [];
        const pointsQ: Array<{ x: number; y: number }> = [];
        const pointsJ: Array<{ x: number; y: number }> = [];

        for (let i = 0; i <= N; i++) {
            const W = i * wPerDrop;
            const dT = expectedDeltaTPerDrop(W, { waterMass: c.waterMass, specificHeat: cw });
            const Q = c.waterMass * cw * dT;
            const J = Q > 1e-9 ? W / Q : 0;
            pointsW.push({ x: i, y: parseFloat(W.toFixed(2)) });
            pointsQ.push({ x: i, y: parseFloat(Q.toFixed(2)) });
            pointsJ.push({ x: i, y: parseFloat(J.toFixed(4)) });
        }

        const chartW: ChartSeries = {
            xLabel: '下落次数 i',
            yLabel: '累积机械功 W (J)',
            xUnit: '次',
            yUnit: 'J',
            points: pointsW
        };
        const chartQ: ChartSeries = {
            xLabel: '下落次数 i',
            yLabel: '水吸收热量 Q (J)',
            xUnit: '次',
            yUnit: 'J',
            points: pointsQ
        };
        const chartJ: ChartSeries = {
            xLabel: '下落次数 i',
            yLabel: '热功当量估计 J = W/Q',
            xUnit: '次',
            yUnit: 'J/J',
            points: pointsJ
        };

        /* ---------- 关键帧 ---------- */
        const W_tot = N * wPerDrop;
        const dT_tot = W_tot / (c.waterMass * cw);
        const keyframes: Keyframe[] = [
            {
                label: '初态',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `初态: T0=室温, W=0, Q=0, J undefined`
            },
            {
                label: '终态',
                t: 0,
                position: { x: N, y: W_tot },
                velocity: { x: 0, y: 0 },
                description: `终态: dT≈${dT_tot.toFixed(3)}K, W=${W_tot.toFixed(1)}J, Q=${W_tot.toFixed(1)}J, J≈1`
            }
        ];

        /* ---------- 示意轨迹 ---------- */
        const trajectory: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 },
            { t: 0, position: { x: N, y: W_tot }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }
        ];

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '单次下落重力功',
                formula: 'w = m · g · h',
                calculation: `${c.mass} × ${g} × ${c.height} = ${wPerDrop.toFixed(3)} J`
            },
            {
                order: 2,
                description: '累积机械功',
                formula: 'W = n · w = n · m · g · h',
                calculation: `W(${N}) = ${N} × ${wPerDrop.toFixed(3)} = ${W_tot.toFixed(1)} J`
            },
            {
                order: 3,
                description: '水吸热计算',
                formula: 'Q = M · c · dT',
                calculation: `dT = ${dT_tot.toFixed(4)} K → Q = ${c.waterMass} × ${cw} × ${dT_tot.toFixed(4)} = ${W_tot.toFixed(1)} J`
            },
            {
                order: 4,
                description: '热功当量',
                formula: 'J = W / Q',
                calculation: `J = ${W_tot.toFixed(1)} / ${W_tot.toFixed(1)} = 1.00 (SI)`
            }
        ];

        const warnings: string[] = [];
        if (W_tot > 5000) warnings.push('累积功较大, 水温可能明显升高, 向环境散热不能忽略');
        if (dT_tot > 5) warnings.push('水温变化过大, 水的比热容与密度会有明显变化');

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                x_t: chartW,
                y_t: chartQ,
                v_t: chartJ
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    drops: N,
                    workTotalJ: parseFloat(W_tot.toFixed(1)),
                    deltaT_K: parseFloat(dT_tot.toFixed(4)),
                    wPerDropJ: parseFloat(wPerDrop.toFixed(3)),
                    J_SI: 1,
                    J_caldeg: 4.184,
                    specificHeatJ: cw
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `机械法测定热功当量: m=${c.mass}kg, h=${c.height}m, n=${N}次 → J = W/Q = 1.00 J/J = 4.184 J/cal`,
                steps,
                formulas: [
                    {
                        name: '单次重力功',
                        formula: 'w = m·g·h',
                        variables: {
                            m: { value: c.mass, unit: 'kg' },
                            g: { value: g, unit: 'm/s²' },
                            h: { value: c.height, unit: 'm' },
                            w: { value: parseFloat(wPerDrop.toFixed(3)), unit: 'J' }
                        }
                    },
                    {
                        name: '水吸热',
                        formula: 'Q = M·c·dT',
                        variables: {
                            M: { value: c.waterMass, unit: 'kg' },
                            c: { value: cw, unit: 'J/(kg·K)' },
                            dT: { value: parseFloat(dT_tot.toFixed(4)), unit: 'K' },
                            Q: { value: parseFloat(W_tot.toFixed(1)), unit: 'J' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

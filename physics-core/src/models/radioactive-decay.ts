import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 放射性衰变模型 — 指数衰变 + 粒子径迹 (选必三 第五章 §2)
 *
 * 衰变规律：N(t) = N₀·e^(−λt),  λ = ln2 / T₁/₂
 * 半衰期：T₁/₂ = ln2 / λ
 * 活度 (衰变率)：A(t) = λ·N(t)
 *
 * α/β/γ 粒子径迹模拟 (简化统计模型)：
 *   α: 短而直, λ_track ~ 5 cm, 高电离
 *   β: 长而弯, λ_track ~ 30 cm, 中电离
 *   γ: 无直接径迹, 次级电子间断
 *
 * 注：粒子运动使用确定性伪随机 (可重现的轨迹，非真随机)：
 *   用 sin(i·seed) 类技巧避免 Math.random() (保证 Vitest 可重现)
 */

export class RadioactiveDecayModel extends PhysicsModelBase {
    readonly name = '放射性衰变';
    readonly version = '1.0.0';
    readonly description = '指数衰变 N=N₀e^(−λt)、半衰期、云室粒子径迹';
    readonly modelType = 'radioactive-decay' as const;
    readonly assumptions = [
        '衰变是独立随机事件',
        '大样本统计 (原子数较多时指数规律成立)',
        '半衰期不随物理化学条件变化'
    ];
    readonly applicableRange = '放射性核素衰变统计, 半衰期 1s ~ 10¹⁷s';
    readonly errorSources: string[] = [];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'initialAtoms', description: '初始原子数 N₀', unit: '个', required: true, min: 1, max: 1e6 },
        { name: 'halfLife', description: '半衰期 T₁/₂ (s)', unit: 's', required: true, min: 0.001, max: 1e20 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const rc = problem.constraints?.radioactive;
        if (!rc) throw new Error('radioactive-decay 模型需要 radioactive 约束配置');

        const N0 = rc.initialAtoms;
        const halfLife = rc.halfLife;
        const duration = rc.duration ?? 5 * halfLife;
        const radiationType = rc.radiationType ?? 'alpha';
        const lambda = Math.LN2 / halfLife;

        // N(t) 衰变曲线
        const N_t: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: '剩余原子数 N(t)',
            xUnit: 's',
            yUnit: '个',
            points: []
        };
        const A_t: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: '活度 A (Bq)',
            xUnit: 's',
            yUnit: 'Bq',
            points: []
        };
        const N = 200;
        for (let i = 0; i <= N; i++) {
            const t = (duration * i) / N;
            const N_t_i = N0 * Math.exp(-lambda * t);
            const A_t_i = lambda * N_t_i;
            N_t.points.push({ x: parseFloat(t.toFixed(3)), y: parseFloat(N_t_i.toFixed(1)) });
            A_t.points.push({ x: parseFloat(t.toFixed(3)), y: parseFloat(A_t_i.toFixed(2)) });
        }

        // 粒子径迹模拟 (云室)
        // 每个粒子独立为一条 trajectory (TrajectoryPoint[]), t 在单条轨迹内单调非降;
        // 之前曾把所有粒子拼接进同一条轨迹, 导致粒子之间 t 回退 (0..L-1, 0..L-1...), 违反时间序。
        const trajectories: TrajectoryPoint[][] = [];
        const nToShow = Math.min(20, Math.ceil(N0 * 0.1)); // 只展示部分粒子
        for (let k = 0; k < nToShow; k++) {
            // 伪随机 (种子 = 粒子编号, 保证可重现)
            const seed = k + 1;
            const r1 = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;

            // 粒子从原点出发，沿 θ 角方向走 L 步
            let x = 0,
                y = 0;
            let theta = r1 * 2 * Math.PI;
            const L = radiationType === 'alpha' ? 40 : radiationType === 'beta' ? 80 : 30; // 步数
            const stepLen = radiationType === 'alpha' ? 2 : radiationType === 'beta' ? 1.5 : 1;
            const straightness = radiationType === 'alpha' ? 0.98 : radiationType === 'beta' ? 0.88 : 0.95;

            const track: TrajectoryPoint[] = [];
            track.push({
                t: 0,
                position: { x, y },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            }); // 起点

            for (let s = 0; s < L; s++) {
                // 偏转：高 straightness 走直线，低 straightness 多次散射
                if (Math.sin(seed * s * 0.3) > straightness) {
                    theta += Math.cos(seed * s * 0.7) * 0.5 - 0.25;
                }
                x += stepLen * Math.cos(theta);
                y += stepLen * Math.sin(theta);
                track.push({
                    t: s,
                    position: { x, y },
                    velocity: { x: stepLen * Math.cos(theta), y: stepLen * Math.sin(theta) },
                    kineticEnergy: 0,
                    potentialEnergy: 0
                });
            }
            trajectories.push(track);
        }

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '初态',
                t: 0,
                position: { x: 0, y: N0 },
                velocity: { x: 0, y: 0 },
                description: `N₀=${N0}, T₁/₂=${halfLife}s, λ=${lambda.toExponential(2)} s⁻¹`
            },
            {
                label: '1 个半衰期',
                t: halfLife,
                position: { x: halfLife, y: N0 / 2 },
                velocity: { x: 0, y: 0 },
                description: `t=T₁/₂ → N=N₀/2=${(N0 / 2).toFixed(0)}, A=λ·N₀/2=${((lambda * N0) / 2).toFixed(1)} Bq`
            },
            {
                label: '3 个半衰期',
                t: 3 * halfLife,
                position: { x: 3 * halfLife, y: N0 / 8 },
                velocity: { x: 0, y: 0 },
                description: `t=3T₁/₂ → N=N₀/8=${(N0 / 8).toFixed(0)}`
            }
        ];

        const N_final = N0 * Math.exp(-lambda * duration);
        const warnings: string[] = [];
        if (halfLife < 1) warnings.push('半衰期极短, 需注意辐射防护');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '衰变常数',
                formula: 'λ = ln2 / T₁/₂',
                calculation: `λ = 0.693 / ${halfLife} = ${lambda.toExponential(2)} s⁻¹`
            },
            {
                order: 2,
                description: '指数衰变规律',
                formula: 'N(t) = N₀·e^(−λt)',
                calculation: `t=${duration}s → N=${N_final.toFixed(0)} (N₀=${N0})`
            },
            {
                order: 3,
                description: '活度',
                formula: 'A(t) = λ·N(t)',
                result: `A(0) = λ·N₀ = ${(lambda * N0).toFixed(1)} Bq`
            }
        ];

        // 射线类型说明
        const rayTypeZh =
            radiationType === 'alpha'
                ? 'α 粒子 (He 核, 电离强)'
                : radiationType === 'beta'
                  ? 'β 粒子 (电子, 电离中)'
                  : 'γ 光子 (电离弱)';
        steps.push({
            order: 4,
            description: '射线类型',
            formula: radiationType === 'alpha' ? '⁴₂He' : radiationType === 'beta' ? 'e⁻' : 'γ',
            result: rayTypeZh
        });

        return {
            meta: this.makeMeta('analytical'),
            trajectories: trajectories,
            keyframes,
            charts: { x_t: N_t, y_t: A_t },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    initialAtoms: N0,
                    halfLife,
                    decayConstant: lambda,
                    duration,
                    finalAtoms: N_final,
                    initialActivity: lambda * N0,
                    radiationTypeCode: radiationType === 'alpha' ? 1 : radiationType === 'beta' ? 2 : 3
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `放射性衰变: N₀=${N0}, T₁/₂=${halfLife}s, λ=${lambda.toExponential(2)}s⁻¹, ${duration}s 后 N=${N_final.toFixed(0)}, 射线=${rayTypeZh}`,
                steps,
                formulas: [
                    {
                        name: '衰变定律',
                        formula: 'N=N₀e^(−λt)',
                        variables: {
                            N0: { value: N0, unit: '个' },
                            λ: { value: lambda, unit: 's⁻¹' },
                            'T₁/₂': { value: halfLife, unit: 's' }
                        }
                    },
                    { name: '半衰期', formula: 'T₁/₂ = ln2/λ', variables: { 'T₁/₂': { value: halfLife, unit: 's' } } }
                ]
            },
            errors: [],
            warnings
        };
    }
}

import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 绝热压缩点火模型 — 汽油机压缩冲程 (活塞式点火演示)
 *
 * 物理原理 (准静态绝热过程):
 *   - p·V^gamma = const    (gamma = Cp/Cv: 空气约 1.40, 双原子气体)
 *   - T·V^(gamma-1) = const  ->  T2 = T1 * (V1/V2)^(gamma-1)
 *   - p2 = p1 * (V1/V2)^gamma
 *   - 压缩比 r = V1/V2
 *
 * 本模型:
 *   - x_t = T 随压缩比 r (1~20) 变化
 *   - y_t = p 随 V 变化 (绝热曲线, 横轴 V 纵轴 p)
 *   - v_t = p·V^gamma 守恒校验曲线 (应为常数)
 */

export interface AdiabaticCompressionConstraint {
    /** 初始温度 (K) */
    readonly initialTemp: number;
    /** 压缩比 V1/V2 */
    readonly compressionRatio: number;
    /** 绝热指数 gamma (默认 1.40 为双原子空气) */
    readonly gamma?: number;
    /** 气体类型 (argon/nitrogen/air 等, 仅作显示与扩展) */
    readonly gasType?: string;
    /** 气体物质的量 (mol), 默认 1 */
    readonly moles?: number;
    /** 采样点数 */
    readonly sampleCount?: number;
}

const GAMMA_AIR = 1.4; // 双原子空气
const R_GAS = 8.314; // J/(mol·K)
const P1_STD = 1.013e5; // Pa (大气压)

export class AdiabaticCompressionModel extends PhysicsModelBase {
    readonly name = '绝热压缩点火';
    readonly version = '1.0.0';
    readonly description = '压缩冲程绝热过程: T2=T1*r^(gamma-1), p2=p1*r^gamma, 验证 p*V^gamma=常数';
    readonly modelType = 'adiabatic-compression' as const;
    readonly assumptions = [
        '准静态绝热过程 (过程无限缓慢, 与外界无热交换)',
        '理想气体, 比热容比 gamma 为常数',
        '封闭气缸, 物质量不变',
        '无摩擦, 准静态过程'
    ];
    readonly applicableRange = '压缩比 1~20, 初始温度 270~400 K 的准静态绝热';
    readonly errorSources = [
        '真实压缩非绝热 (壁面散热导致温升偏低)',
        '气体并非理想 (高温高压偏差)',
        'gamma 随温度升高增加 (非双原子理想化)'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'initialTemp', description: '初始温度 (K)', unit: 'K', required: true, min: 100, max: 1000 },
        { name: 'compressionRatio', description: '压缩比 r = V1/V2', unit: '', required: true, min: 1, max: 30 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.adiabaticCompression;
        if (!c) {
            throw new Error('adiabatic-compression 模型需要 constraints.adiabaticCompression 配置');
        }

        const gamma = c.gamma ?? GAMMA_AIR;
        const r_max = Math.max(1, Math.min(30, c.compressionRatio));
        const T1 = c.initialTemp;
        const N = Math.max(5, Math.min(80, c.sampleCount ?? 40));
        const n = c.moles ?? 1;
        const V1 = (n * R_GAS * T1) / P1_STD; // m^3, 由理想气体 pV=nRT 推导

        /* ---------- x_t = 温度 vs 压缩比 ---------- */
        const pointsT: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= N; i++) {
            const r = 1 + ((r_max - 1) * i) / N;
            const T = T1 * Math.pow(r, gamma - 1);
            pointsT.push({ x: parseFloat(r.toFixed(3)), y: parseFloat(T.toFixed(2)) });
        }
        const chartT: ChartSeries = {
            xLabel: '压缩比 r = V1/V2',
            yLabel: '温度 T (K)',
            xUnit: '',
            yUnit: 'K',
            points: pointsT
        };

        /* ---------- y_t = p 随 V 变化的绝热曲线 ---------- */
        const pointsP: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= N; i++) {
            const frac = 0.01 + 0.99 * (1 - i / N); // V 从 V1 向 V1/20 移动
            const V = V1 * frac;
            const p = P1_STD * Math.pow(V1 / V, gamma);
            pointsP.push({ x: parseFloat((V * 1e3).toFixed(3)), y: parseFloat((p / 1e3).toFixed(2)) });
        }
        const chartP: ChartSeries = {
            xLabel: '体积 V (L)',
            yLabel: '压强 p (kPa)',
            xUnit: 'L',
            yUnit: 'kPa',
            points: pointsP
        };

        /* ---------- v_t = p*V^gamma 校验 ---------- */
        const pointsCheck: Array<{ x: number; y: number }> = [];
        for (const p of pointsP) {
            const V_m3 = p.x / 1e3;
            const Pa = p.y * 1e3;
            const Y = Pa * Math.pow(Math.max(V_m3, 1e-9), gamma);
            pointsCheck.push({ x: p.x, y: parseFloat((Y / 1e3).toFixed(2)) });
        }
        const chartCheck: ChartSeries = {
            xLabel: '体积 V (L)',
            yLabel: 'p * V^gamma (kPa . L^gamma)',
            xUnit: 'L',
            yUnit: 'kPa',
            points: pointsCheck
        };

        /* ---------- keyframes ---------- */
        const T2 = T1 * Math.pow(r_max, gamma - 1);
        const p2 = P1_STD * Math.pow(r_max, gamma);
        const V2 = V1 / r_max;
        const T_celsius = T2 - 273.15;
        const isIgnition = T2 > 600; // 约 327 °C (柴油自燃点)

        const keyframes: Keyframe[] = [
            {
                label: '初态',
                t: 0,
                position: { x: V1 * 1e3, y: P1_STD / 1e3 },
                velocity: { x: 0, y: 0 },
                description: `初态: T1=${T1.toFixed(1)}K, p1=${(P1_STD / 1e3).toFixed(1)}kPa`
            },
            {
                label: '终态',
                t: 0,
                position: { x: V2 * 1e3, y: p2 / 1e3 },
                velocity: { x: 0, y: 0 },
                description: `终态: r=${r_max}, T2=${T2.toFixed(1)}K (${T_celsius.toFixed(0)}C), p2=${(p2 / 1e3).toFixed(0)}kPa`
            }
        ];

        /* ---------- 示意轨迹 ---------- */
        const trajectory: TrajectoryPoint[] = [
            {
                t: 0,
                position: { x: V1 * 1e3, y: P1_STD / 1e3 },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            },
            {
                t: 0,
                position: { x: V2 * 1e3, y: p2 / 1e3 },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            }
        ];

        /* ---------- explanation ---------- */
        const V_ratio_val = 1 / r_max;
        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '绝热方程 (泊松)',
                formula: 'T * V^(gamma-1) = const',
                calculation: `T2 = T1 * r^(gamma-1) = ${T1} * ${r_max}^(${(gamma - 1).toFixed(2)}) = ${T2.toFixed(1)} K`
            },
            {
                order: 2,
                description: '终态压强',
                formula: 'p * V^gamma = const',
                calculation: `p2 = p1 * r^gamma = ${(P1_STD / 1e3).toFixed(1)} * ${r_max}^${gamma.toFixed(2)} = ${(p2 / 1e3).toFixed(0)} kPa`
            },
            {
                order: 3,
                description: '绝热压缩功',
                formula: 'W = (p2*V2 - p1*V1) / (gamma - 1)',
                calculation: `V_ratio = ${V_ratio_val.toFixed(3)}`
            },
            {
                order: 4,
                description: '点火判定',
                formula: 'T2 > T_ignition (约 600K 柴油自燃)',
                result: `T2 = ${T_celsius.toFixed(0)}C  ${isIgnition ? '-> 可以自燃' : '-> 不足以自燃'}`
            }
        ];

        const warnings: string[] = [];
        if (r_max > 20) warnings.push('压缩比过大, 实际燃烧室受设计限制');
        if (T2 > 1200) warnings.push('终态温度远超自燃点, 可能引起爆震');

        return {
            meta: {
                model: 'adiabatic-compression',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: {
                x_t: chartT,
                y_t: chartP,
                v_t: chartCheck
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    gamma,
                    compressionRatio: r_max,
                    T1_K: T1,
                    T2_K: parseFloat(T2.toFixed(2)),
                    p1_Pa: P1_STD,
                    p2_Pa: parseFloat(p2.toFixed(2)),
                    V1_L: parseFloat((V1 * 1e3).toFixed(3)),
                    V2_L: parseFloat((V2 * 1e3).toFixed(4)),
                    ignitionPossible: isIgnition ? 1 : 0
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `绝热压缩: r=${r_max}, gamma=${gamma}, T1=${T1.toFixed(1)}K -> T2=${T2.toFixed(1)}K (${T_celsius.toFixed(0)}C)${isIgnition ? ' -> 可自燃' : ''}`,
                steps,
                formulas: [
                    {
                        name: 'Adiabatic temperature',
                        formula: 'T2 = T1 * r^(gamma-1)',
                        variables: {
                            T1: { value: T1, unit: 'K' },
                            r: { value: r_max, unit: '' },
                            gammaMinus1: { value: parseFloat((gamma - 1).toFixed(3)), unit: '' },
                            T2: { value: parseFloat(T2.toFixed(2)), unit: 'K' }
                        }
                    },
                    {
                        name: 'Adiabatic pressure',
                        formula: 'p2 = p1 * r^gamma',
                        variables: {
                            p1: { value: P1_STD, unit: 'Pa' },
                            r: { value: r_max, unit: '' },
                            gamma: { value: gamma, unit: '' },
                            p2: { value: parseFloat(p2.toFixed(2)), unit: 'Pa' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

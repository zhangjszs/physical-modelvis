import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 晶体熔化曲线约束 — 选必三 物质状态
 *
 * 晶体: 在 T_m 处温度不变, 平台
 * 非晶体: 温度连续上升, 无平台
 */
export interface MeltingCurveConstraint {
    /** 模式: 晶体或非晶体 */
    readonly mode: 'crystal' | 'noncrystal';
    /** 熔点 (°C), 仅晶体 */
    readonly meltingPoint: number;
    /** 加热速率 (°C/min) */
    readonly heatingRate: number;
    /** 采样点数, 默认 200 */
    readonly sampleCount?: number;
    /** 初始温度 (°C), 默认 0 */
    readonly initialTemp?: number;
    /** 总时长 (min), 默认 20 */
    readonly durationMin?: number;
    /** 熔化潜热 (J/g) */
    readonly latentHeat?: number;
}

/**
 * 晶体熔化曲线模型 — 选必三 物质状态
 *
 * 物理原理：
 *   晶体: T < T_m 时升温; T = T_m 时不变 (平台); 全部熔化后继续升温
 *   非晶体: 温度连续升高, 无平台 (软化过渡)
 *   加热功率恒定, 平台期间热量用于相变 (Q = m·L)
 */
export class MeltingCurveModel extends PhysicsModelBase {
    readonly name = '晶体熔化曲线';
    readonly version = '1.0.0';
    readonly description = '晶体熔化平台 (T=T_m), 非晶体连续软化';
    readonly modelType = 'melting-curve' as const;
    readonly assumptions = ['加热功率恒定', '热容量在固/液相内恒定', '忽略热损失 (绝热系统)', '熔化潜热恒定'];
    readonly applicableRange = '常见晶体 (冰 0°C, 海波 48°C, 金属 >1000°C)';
    readonly errorSources = [
        '实际加热功率可能有波动',
        '热滞后 (过冷/过热现象)',
        '温度测量点不均匀',
        '样品纯度影响熔点'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'mode', description: '晶体(crystal)/非晶体(noncrystal)', unit: '', required: true },
        { name: 'meltingPoint', description: '熔点 T_m (°C)', unit: '°C', required: true, min: -50, max: 2000 },
        { name: 'heatingRate', description: '加热速率 (°C/min)', unit: '°C/min', required: true, min: 0.1, max: 50 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const mc = problem.constraints?.meltingCurve;
        if (!mc) throw new Error('melting-curve 模型需要 meltingCurve 约束配置');

        const mode = mc.mode;
        const Tm = mc.meltingPoint;
        const rate = mc.heatingRate;
        const sampleCount = mc.sampleCount ?? 200;
        const T0 = mc.initialTemp ?? 0;
        const durationMin = mc.durationMin ?? 20;
        const L = mc.latentHeat ?? 334; // J/g (冰)

        const totalTime = durationMin * 60; // s

        // 温度-时间曲线
        const tempCurve: ChartSeries = {
            xLabel: '时间 t (min)',
            yLabel: '温度 T (°C)',
            xUnit: 'min',
            yUnit: '°C',
            points: []
        };
        // 加热功率 (恒定)
        const powerCurve: ChartSeries = {
            xLabel: '时间 t (min)',
            yLabel: '加热功率 P (W)',
            xUnit: 'min',
            yUnit: 'W',
            points: []
        };
        // 相分数 (0=全固, 1=全液)
        const phaseCurve: ChartSeries = {
            xLabel: '时间 t (min)',
            yLabel: '液相分数',
            xUnit: 'min',
            yUnit: '',
            points: []
        };

        const P0 = (rate / 60) * 10; // 加热功率 (W, 模拟值)
        const tMeltDuration = mode === 'crystal' ? L / P0 : 0; // 相变时间

        for (let i = 0; i <= sampleCount; i++) {
            const t = (totalTime * i) / sampleCount;
            const tMin = t / 60;
            let T: number;
            let phase: number;

            if (mode === 'crystal') {
                if (T0 >= Tm) {
                    // 已经超过熔点
                    T = T0 + rate * tMin;
                    phase = 1;
                } else if (tMin < (Tm - T0) / rate) {
                    // 加热到熔点前
                    T = T0 + rate * tMin;
                    phase = 0;
                } else if (tMin < (Tm - T0) / rate + tMeltDuration / 60) {
                    // 熔化平台
                    T = Tm;
                    phase = (tMin - (Tm - T0) / rate) / (tMeltDuration / 60);
                } else {
                    // 熔化完成, 继续升温
                    T = Tm + rate * (tMin - (Tm - T0) / rate - tMeltDuration / 60);
                    phase = 1;
                }
            } else {
                // 非线性晶体: 连续升温, 带轻微非线性 (模拟软化)
                T = T0 + rate * tMin + 0.01 * rate * tMin * tMin;
                phase = Math.min(1, Math.max(0, (T - Tm + 5) / 10)); // 软化区间 ~5°C
            }

            tempCurve.points.push({
                x: parseFloat(tMin.toFixed(4)),
                y: parseFloat(T.toFixed(4))
            });
            powerCurve.points.push({
                x: parseFloat(tMin.toFixed(4)),
                y: parseFloat(P0.toFixed(4))
            });
            phaseCurve.points.push({
                x: parseFloat(tMin.toFixed(4)),
                y: parseFloat(phase.toFixed(4))
            });
        }

        // 静态轨迹 (单帧)
        const trajectory: TrajectoryPoint[] = [
            {
                t: 0,
                position: { x: 0, y: T0 },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            }
        ];

        const keyframes: Keyframe[] = [
            {
                label: '起始',
                t: 0,
                position: { x: 0, y: T0 },
                velocity: { x: 0, y: 0 },
                description: `T₀=${T0}°C, 加热速率 ${rate}°C/min`
            },
            {
                label: mode === 'crystal' ? '熔点' : '软化点',
                t: mode === 'crystal' ? ((Tm - T0) / rate) * 60 : totalTime / 2,
                position: {
                    x:
                        mode === 'crystal'
                            ? parseFloat(((Tm - T0) / rate).toFixed(2))
                            : parseFloat((durationMin / 2).toFixed(2)),
                    y: mode === 'crystal' ? Tm : parseFloat((T0 + (rate * durationMin) / 2).toFixed(2))
                },
                velocity: { x: 0, y: 0 },
                description:
                    mode === 'crystal'
                        ? `晶体平台: T_m=${Tm}°C, 相变潜热 L=${L}J/g`
                        : `非晶体: 软化区间 T≈${Tm - 5}~${Tm + 5}°C`
            }
        ];

        if (mode === 'crystal') {
            keyframes.push({
                label: '完全熔化',
                t: parseFloat((totalTime * 0.8).toFixed(1)),
                position: { x: parseFloat((durationMin * 0.8).toFixed(2)), y: parseFloat((Tm + 10).toFixed(1)) },
                velocity: { x: 0, y: 0 },
                description: `熔化完成, 液相继续升温, L=${L}J/g`
            });
        }

        const warnings: string[] = [];
        if (rate > 10) warnings.push('加热速率过快, 温度滞后效应显著');
        if (Tm < 0) warnings.push('熔点低于 0°C, 需低温加热');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: mode === 'crystal' ? '晶体熔化特点' : '非晶体熔化特点',
                formula: mode === 'crystal' ? 'T = T_m (平台, 固液共存)' : 'T 连续升高 (无平台)',
                result: mode === 'crystal' ? `温度恒定在 ${Tm}°C, 吸热用于相变` : '温度连续升高, 逐渐软化'
            },
            {
                order: 2,
                description: '加热功率',
                formula: 'P = const',
                calculation: `P = ${P0.toFixed(2)} W, 熔化时间 ≈ ${tMeltDuration.toFixed(1)} s`
            },
            {
                order: 3,
                description: '相变潜热',
                formula: 'Q = m·L',
                calculation: `L = ${L} J/g (示例: 冰 334 J/g)`,
                result: '吸收热量用于破坏晶格, 温度不变'
            }
        ];

        return {
            meta: {
                model: 'melting-curve',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: { x_t: tempCurve, y_t: powerCurve, v_t: phaseCurve },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    modeCode: mode === 'crystal' ? 1 : 0,
                    meltingPoint: Tm,
                    heatingRate: rate,
                    initialTemp: T0,
                    durationMin,
                    latentHeat: L,
                    heatingPower: P0,
                    tMeltDuration,
                    finalTemp: tempCurve.points[tempCurve.points.length - 1].y,
                    finalPhase: phaseCurve.points[phaseCurve.points.length - 1].y
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `熔化曲线: ${mode === 'crystal' ? '晶体' : '非晶体'}, T_m=${Tm}°C, 速率 ${rate}°C/min, 时长 ${durationMin}min`,
                steps,
                formulas: [
                    {
                        name: '加热公式',
                        formula: 'T = T₀ + r·t (T<T_m)',
                        variables: { T0: { value: T0, unit: '°C' }, r: { value: rate, unit: '°C/min' } }
                    },
                    { name: '相变潜热', formula: 'Q = m·L', variables: { L: { value: L, unit: 'J/g' } } }
                ]
            },
            errors: [],
            warnings
        };
    }
}

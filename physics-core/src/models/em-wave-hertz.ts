import type { PhysicsProblem, HertzExperimentConstraint } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 赫兹电磁波实验模型 — 必修三 §13
 *
 * 物理:
 *   (1) 发射端: LC 振荡 + 振子火花放电 → 电磁波辐射
 *       振荡频率 f = 1/(2π√(LC))
 *       振荡电流 i(t) = I_m·sin(2πft)
 *
 *   (2) 接收端: 环形天线感应电动势 ∝ 距离⁻²
 *       ε_rec = k·N·f·A / d²
 *       (k: 与发射功率和天线效率相关的常数)
 *
 *   (3) 驻波: 两列相干电磁波叠加 → 驻波波形
 *       y = 2A·cos(2πx/λ)·cos(2πft)
 *
 * 本模型生成 LC 振荡电流波形、接收电动势-距离关系、驻波图示
 */
export class HertzExperimentModel extends PhysicsModelBase {
    readonly name = '赫兹电磁波实验';
    readonly version = '1.0.0';
    readonly description = 'LC振荡+振子火花放电; 接收电动势∝距离⁻²; 驻波图示';
    readonly modelType = 'em-wave-hertz' as const;
    readonly assumptions = [
        'LC 振荡近似无阻尼 (忽略辐射损耗)',
        '接收天线为半波偶极子 (与发射频率谐振)',
        '电磁波在自由空间传播 (无反射/折射)',
        '距离 d 远大于波长 (远场近似)'
    ];
    readonly applicableRange = 'f: 10 kHz ~ 100 MHz; d: 0.5 ~ 100 m; 火花间隙 0.1 ~ 10 mm';
    readonly errorSources = [
        '实际 LC 电路有电阻损耗',
        '近场效应 (d < λ/2π 时远场公式失效)',
        '环境反射干扰驻波测量',
        '火花放电非线性 (非正弦)'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'frequency', description: '振荡频率 (Hz)', unit: 'Hz', required: true, min: 1e3, max: 1e8 },
        { name: 'turns', description: '线圈匝数', unit: '匝', required: true, min: 1, max: 100 },
        { name: 'sparkGap', description: '火花间隙 (mm)', unit: 'mm', required: true, min: 0.1, max: 10 },
        { name: 'distance', description: '接收端距离 (m)', unit: 'm', required: true, min: 0.5, max: 100 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const hc = problem.constraints?.hertzExperiment as HertzExperimentConstraint | undefined;
        if (!hc) throw new Error('em-wave-hertz 模型需要 hertzExperiment 约束配置');

        const f = hc.frequency;
        const turns = hc.turns;
        const sparkGap = hc.sparkGap;
        const distance = hc.distance;
        const omega = 2 * Math.PI * f;
        const T = 1 / f;
        const lambda = 3e8 / f; // 波长

        // 等效 LC 参数 (由频率反推)
        // 假设 L = 1e-4 H (100 μH), 则 C = 1/(L·ω²)
        const L = 1e-4; // H
        const C = 1 / (L * omega * omega);
        const Q0 = 1e-6; // 初始电荷 C
        const Im = Q0 * omega; // 电流峰值

        // LC 振荡电流波形 (展示 3 个周期)
        const currentWave: ChartSeries = {
            xLabel: '时间 t (μs)',
            yLabel: '振荡电流 i (mA)',
            xUnit: 'μs',
            yUnit: 'mA',
            points: Array.from({ length: 300 }, (_, i) => {
                const t = (3 * T * i) / 299;
                const current = Im * Math.sin(omega * t);
                return { x: parseFloat((t * 1e6).toFixed(3)), y: parseFloat((current * 1e3).toFixed(4)) };
            })
        };

        // 接收端感应电动势 vs 距离 (ε ∝ N·f·A / d²)
        // 系数 k 设为归一化: ε = k0 × N × f / d², 其中 k0 = 1e-4 V·m²/(Hz·匝)
        const k0 = 1e-4;
        const emfDistance: ChartSeries = {
            xLabel: '距离 d (m)',
            yLabel: '接收电动势 ε (mV)',
            xUnit: 'm',
            yUnit: 'mV',
            points: Array.from({ length: 100 }, (_, i) => {
                const d = 0.5 + ((50 - 0.5) * i) / 99; // 0.5 ~ 50 m
                const emf = (k0 * turns * f) / (d * d);
                return { x: parseFloat(d.toFixed(2)), y: parseFloat((emf * 1e3).toFixed(4)) };
            })
        };

        // 驻波图示: y = 2A·cos(2πx/λ)·cos(2πft), 固定 t=0
        // 显示 2 个波长
        const standingWave: ChartSeries = {
            xLabel: '位置 x (m)',
            yLabel: '合成振幅 (归一化)',
            xUnit: 'm',
            yUnit: '',
            points: Array.from({ length: 200 }, (_, i) => {
                const x = (2 * lambda * i) / 199;
                const envelope = 2 * Math.cos((2 * Math.PI * x) / lambda);
                return { x: parseFloat(x.toFixed(3)), y: parseFloat(envelope.toFixed(4)) };
            })
        };

        // 包络线
        const envelope: ChartSeries = {
            xLabel: '位置 x (m)',
            yLabel: '包络',
            xUnit: 'm',
            yUnit: '',
            points: Array.from({ length: 100 }, (_, i) => {
                const x = (2 * lambda * i) / 99;
                const env = 2 * Math.abs(Math.cos((2 * Math.PI * x) / lambda));
                return { x: parseFloat(x.toFixed(3)), y: parseFloat(env.toFixed(4)) };
            })
        };

        // 当前工作点的接收电动势
        const currentEmf = (k0 * turns * f) / (distance * distance);

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: 'LC 振荡源',
                t: 0,
                position: { x: f / 1e6, y: Im * 1e3 },
                velocity: { x: 0, y: 0 },
                description: `LC 振荡: f=${(f / 1e6).toFixed(2)}MHz, λ=${lambda.toFixed(1)}m, I_m=${(Im * 1e3).toFixed(2)}mA`
            },
            {
                label: '接收端',
                t: 0,
                position: { x: distance, y: currentEmf * 1e3 },
                velocity: { x: 0, y: 0 },
                description: `接收端: d=${distance}m, ε=${(currentEmf * 1e3).toFixed(4)}mV (ε∝d⁻²)`
            }
        ];

        const trajectory: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }
        ];

        const warnings: string[] = [];
        if (distance < lambda / (2 * Math.PI)) {
            warnings.push(`距离 d < λ/(2π), 近场效应显著, 远场 1/d² 公式不适用`);
        }
        if (f > 300e6) warnings.push('频率 > 300 MHz, 进入微波频段, 实验装置需重新设计');
        if (f < 300e3) warnings.push('频率 < 300 kHz, 波长 > 1000 m, 实验需要极大空间');
        if (sparkGap > 5) warnings.push('火花间隙 > 5 mm, 需要高压才能击穿');
        if (currentEmf * 1e3 < 0.001) warnings.push('接收电动势 < 1 μV, 可能无法检测');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: 'LC 振荡频率',
                formula: 'f = 1/(2π√(LC))',
                calculation: `由 f=${(f / 1e6).toFixed(2)}MHz → 等效 C=${(C * 1e12).toFixed(2)}pF (L=${(L * 1e6).toFixed(0)}μH)`
            },
            {
                order: 2,
                description: '电磁波波长',
                formula: 'λ = c/f',
                calculation: `λ = 3×10⁸ / ${f} = ${lambda.toFixed(1)} m`
            },
            {
                order: 3,
                description: '振子放电',
                formula: '当电压 > 击穿电压时, 间隙放电产生高频振荡',
                result: `火花间隙=${sparkGap}mm, 高压脉冲激发射频振荡`
            },
            {
                order: 4,
                description: '接收端感应电动势',
                formula: 'ε ∝ N·f / d²',
                calculation: `ε = k₀ × ${turns} × ${f} / ${distance}² = ${(currentEmf * 1e3).toFixed(4)} mV`
            },
            {
                order: 5,
                description: '电磁波叠加形成驻波',
                formula: 'y = 2A·cos(2πx/λ)·cos(2πft)',
                result: `两列相干反向波叠加 → 波节 (始终为 0) 和波腹 (振幅最大)`
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                x_t: currentWave,
                y_t: emfDistance,
                vx_t: standingWave,
                ke_t: envelope
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    frequency: f,
                    omega,
                    period: T,
                    wavelength: lambda,
                    inductance: L,
                    capacitance: C,
                    maxCurrent: Im,
                    turns,
                    sparkGap,
                    distance,
                    currentEmf,
                    currentEmf_mV: currentEmf * 1e3,
                    farFieldThreshold: lambda / (2 * Math.PI)
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `赫兹实验: f=${(f / 1e6).toFixed(1)}MHz, λ=${lambda.toFixed(1)}m, d=${distance}m → ε=${(currentEmf * 1e3).toFixed(3)}mV`,
                steps,
                formulas: [
                    {
                        name: 'LC 振荡频率',
                        formula: 'f=1/(2π√(LC))',
                        variables: { f: { value: f, unit: 'Hz' }, λ: { value: lambda, unit: 'm' } }
                    },
                    {
                        name: '接收电动势',
                        formula: 'ε∝N·f/d²',
                        variables: { ε: { value: currentEmf, unit: 'V' }, d: { value: distance, unit: 'm' } }
                    },
                    {
                        name: '驻波',
                        formula: 'y=2A·cos(2πx/λ)·cos(2πft)',
                        variables: { λ: { value: lambda, unit: 'm' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * RC 暂态电路模型 — 必修三 第十一章 (电容充放电)
 *
 * 充电 (U_c 从 0 开始):
 *   U_c(t) = E·(1 − e^(−t/τ))
 *   I(t)  = (E/R)·e^(−t/τ)
 *   Q(t)  = C·E·(1 − e^(−t/τ))
 *
 * 放电 (U_c 从 E 开始):
 *   U_c(t) = E·e^(−t/τ)
 *   I(t)  = −(E/R)·e^(−t/τ)  (电流反向)
 *   Q(t)  = C·E·e^(−t/τ)
 *   ln U_c = ln E − t/τ      (直线, 斜率 = −1/τ)
 *
 * 时间常数 τ = RC
 *   1τ → 充电到 63.2% / 放电到 36.8%
 *   5τ → 充/放电完成 99.3%
 */
export class CapacitorChargeModel extends PhysicsModelBase {
    readonly name = '电容充放电';
    readonly version = '1.0.0';
    readonly description = 'RC 暂态电路: 充电/放电指数曲线, 时间常数 τ=RC, ln(U_c)-t 直线验证';
    readonly modelType = 'capacitor-charge' as const;
    readonly assumptions = [
        '电容为理想电容 (无漏电, 无寄生电感)',
        '电阻为线性时不变',
        '电源内阻忽略',
        '开关动作瞬时完成'
    ];
    readonly applicableRange = 'R: 1 Ω – 1 MΩ; C: 1 pF – 1 F; τ: 1 ps – 10⁶ s';
    readonly errorSources = ['实际电容存在漏电阻', '大电流下电阻温升导致 R 变化', '电源内阻在高频下不可忽略'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'resistance', description: '电阻 (Ω)', unit: 'Ω', required: true, min: 1, max: 1e6 },
        { name: 'capacitance', description: '电容 (F)', unit: 'F', required: true, min: 1e-12, max: 1 },
        { name: 'emf', description: '电动势 (V)', unit: 'V', required: true, min: 0.1, max: 100 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const cc = problem.constraints?.capacitor;
        if (!cc) throw new Error('capacitor-charge 模型需要 capacitor 约束配置');

        const R = cc.resistance;
        const C = cc.capacitance;
        const E = cc.emf;
        const mode = cc.mode;
        const sampleCount = cc.sampleCount ?? 120;
        const timeSpanTau = cc.timeSpanTau ?? 5;

        if (R <= 0) throw new Error('电阻必须为正');
        if (C <= 0) throw new Error('电容必须为正');
        if (E <= 0) throw new Error('电动势必须为正');
        if (mode !== 'charge' && mode !== 'discharge') throw new Error('mode 必须为 charge 或 discharge');

        const tau = R * C;
        const tMax = tau * timeSpanTau;
        const dt = tMax / sampleCount;

        // 工作点 (t=0 时刻)
        const Uc0 = mode === 'charge' ? 0 : E;
        const I0 = mode === 'charge' ? E / R : -E / R;
        const Q0 = mode === 'charge' ? 0 : C * E;

        // 图表 1: U_c-t 指数曲线
        const Uc_t: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: '电容电压 U_c (V)',
            xUnit: 's',
            yUnit: 'V',
            points: []
        };
        // 图表 2: I-t 指数衰减
        const I_t: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: '电流 I (A)',
            xUnit: 's',
            yUnit: 'A',
            points: []
        };
        // 图表 3: Q-t (充电累积) 或 ln(U_c)-t (放电直线)
        const Q_t: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: '电荷 Q (C)',
            xUnit: 's',
            yUnit: 'C',
            points: []
        };
        const lnUc_t: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: 'ln(U_c) (V)',
            xUnit: 's',
            yUnit: '',
            points: []
        };

        for (let i = 0; i <= sampleCount; i++) {
            const t = i * dt;
            const expTerm = Math.exp(-t / tau);

            let Uc: number, I: number, Q: number;
            if (mode === 'charge') {
                Uc = E * (1 - expTerm);
                I = (E / R) * expTerm;
                Q = C * E * (1 - expTerm);
            } else {
                Uc = E * expTerm;
                I = -(E / R) * expTerm;
                Q = C * E * expTerm;
            }

            Uc_t.points.push({ x: parseFloat(t.toFixed(6)), y: parseFloat(Uc.toFixed(6)) });
            I_t.points.push({ x: parseFloat(t.toFixed(6)), y: parseFloat(I.toFixed(6)) });
            Q_t.points.push({ x: parseFloat(t.toFixed(6)), y: parseFloat(Q.toFixed(9)) });

            // ln(U_c)-t 仅放电时有意义 (U_c 从 E 衰减到 0)
            if (mode === 'discharge' && Uc > 1e-12) {
                lnUc_t.points.push({ x: parseFloat(t.toFixed(6)), y: parseFloat(Math.log(Uc).toFixed(6)) });
            }
        }

        // 关键帧 (τ, 2τ, 3τ, 4τ, 5τ)
        const keyframes: Keyframe[] = [];
        for (const k of [1, 2, 3, 4, 5]) {
            const t = k * tau;
            const expTerm = Math.exp(-k);
            const Uc = mode === 'charge' ? E * (1 - expTerm) : E * expTerm;
            const I = (E / R) * expTerm;
            const Q = mode === 'charge' ? C * E * (1 - expTerm) : C * E * expTerm;
            const pct = mode === 'charge' ? ((1 - expTerm) * 100).toFixed(1) : (expTerm * 100).toFixed(1);
            keyframes.push({
                label: `${k}τ`,
                t,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `t=${k}τ: U_c=${Uc.toFixed(3)}V (${pct}%${mode === 'charge' ? '充电' : '剩余'}), I=${I.toFixed(4)}A, Q=${Q.toExponential(2)}C`
            });
        }

        // 轨迹 (仅 1 个点, 用于渲染端点)
        const trajectory: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }
        ];

        const warnings: string[] = [];
        if (tau < 1e-6) warnings.push('时间常数过小 (τ<1μs), 实际电路需考虑寄生参数');
        if (tau > 100) warnings.push('时间常数过大 (τ>100s), 实际电容漏电不可忽略');
        if (I0 > 10) warnings.push('初始电流较大, 注意电阻功率');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '时间常数',
                formula: 'τ = R·C',
                calculation: `τ = ${R} × ${C} = ${tau.toExponential(3)} s`
            },
            {
                order: 2,
                description: mode === 'charge' ? '充电方程' : '放电方程',
                formula:
                    mode === 'charge'
                        ? 'U_c(t) = E·(1−e^(−t/τ)), I(t) = (E/R)·e^(−t/τ)'
                        : 'U_c(t) = E·e^(−t/τ), I(t) = −(E/R)·e^(−t/τ)',
                calculation:
                    mode === 'charge'
                        ? `U_c(τ) = ${E}·(1−e⁻¹) = ${(E * (1 - Math.exp(-1))).toFixed(3)} V (63.2% E)`
                        : `U_c(τ) = ${E}·e⁻¹ = ${(E * Math.exp(-1)).toFixed(3)} V (36.8% E)`
            },
            {
                order: 3,
                description: '充/放电完成时间',
                formula: '5τ → 完成 99.3%',
                calculation: `5τ = ${(5 * tau).toExponential(3)} s`
            }
        ];

        if (mode === 'discharge') {
            steps.push({
                order: 4,
                description: 'ln(U_c)-t 直线验证',
                formula: 'ln U_c = ln E − t/τ',
                calculation: `斜率 = −1/τ = ${(-1 / tau).toExponential(3)} s⁻¹, 截距 = ln E = ${Math.log(E).toFixed(3)}`
            });
        }

        return {
            meta: {
                model: 'capacitor-charge',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: {
                x_t: Uc_t,
                y_t: I_t,
                vx_t: Q_t,
                v_t: lnUc_t,
                Uc_t,
                I_t,
                Q_t,
                lnUc_t
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    resistance: R,
                    capacitance: C,
                    emf: E,
                    tau,
                    tMax,
                    initialCurrent: Math.abs(I0),
                    initialVoltage: Uc0,
                    initialCharge: Q0,
                    finalVoltage: mode === 'charge' ? Uc_t.points[Uc_t.points.length - 1]!.y : 0,
                    finalCharge: mode === 'charge' ? Q_t.points[Q_t.points.length - 1]!.y : 0,
                    modeCode: mode === 'charge' ? 1 : 0
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `RC ${mode === 'charge' ? '充电' : '放电'}: R=${R}Ω, C=${C}F, E=${E}V, τ=${tau.toExponential(3)}s, 5τ=${(5 * tau).toExponential(3)}s`,
                steps,
                formulas: [
                    {
                        name: '时间常数',
                        formula: 'τ = RC',
                        variables: {
                            R: { value: R, unit: 'Ω' },
                            C: { value: C, unit: 'F' },
                            τ: { value: tau, unit: 's' }
                        }
                    },
                    {
                        name: mode === 'charge' ? '充电电压' : '放电电压',
                        formula: mode === 'charge' ? 'U_c = E(1−e^(−t/τ))' : 'U_c = E·e^(−t/τ)',
                        variables: { E: { value: E, unit: 'V' } }
                    },
                    {
                        name: '电流',
                        formula: 'I = (E/R)·e^(−t/τ)',
                        variables: { E: { value: E, unit: 'V' }, R: { value: R, unit: 'Ω' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

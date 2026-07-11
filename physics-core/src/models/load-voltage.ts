import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 路端电压与负载模型 — 必修三 第十一章 (闭合电路欧姆定律)
 *
 * 全电路欧姆定律:
 *   I = E / (R + r)             (R: 负载电阻, r: 内阻)
 *   U = E − I·r = E·R / (R + r)  (路端电压)
 *
 * 两种关系曲线:
 *   (1) U-R 曲线: U = E·R/(R+r), R=0→0, R→∞→E, 单调递增, 渐近 E
 *   (2) U-I 直线: U = E − I·r,  截距=E, 斜率=−r
 *
 * 线性拟合 (U-I 数据): χ = a + b·I, 则
 *   E_exp = a (截距), r_exp = −b (负斜率)
 */
export class LoadVoltageModel extends PhysicsModelBase {
    readonly name = '路端电压与负载';
    readonly version = '1.0.0';
    readonly description = '闭合电路欧姆定律 U=E−Ir: U-R 曲线与 U-I 直线, 拟合 E 和 r';
    readonly modelType = 'load-voltage' as const;
    readonly assumptions = [
        '电源电动势 E 恒定',
        '内阻 r 恒定 (不随电流、温度变化)',
        '负载为线性纯电阻',
        '导线电阻忽略不计'
    ];
    readonly applicableRange = 'E: 0.1 – 50 V; r: 0 – 100 Ω; R: 0.1 Ω – 100 kΩ';
    readonly errorSources = ['大电流下内阻因温升而增大', '电池电动势随电量下降', '接触电阻在低负载时不可忽略'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'emf', description: '电动势 (V)', unit: 'V', required: true, min: 0.1, max: 50 },
        { name: 'internalResistance', description: '内阻 (Ω)', unit: 'Ω', required: true, min: 0, max: 100 },
        { name: 'loadRange', description: '负载电阻范围 (Ω)', unit: 'Ω', required: true }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const cc = problem.constraints?.loadVoltage;
        if (!cc) throw new Error('load-voltage 模型需要 loadVoltage 约束配置');

        const E = cc.emf;
        const r = cc.internalResistance;
        const [Rmin, Rmax] = cc.loadRange;
        const sampleCount = cc.sampleCount ?? 60;

        if (E <= 0) throw new Error('电动势必须为正');
        if (r < 0) throw new Error('内阻不能为负');
        if (Rmin <= 0 || Rmax <= Rmin) throw new Error('负载范围需满足 0 < R_min < R_max');

        // 工作点 (使用负载中点作为代表)
        const R0 = Math.sqrt(Rmin * Rmax); // 几何平均
        const I0 = E / (R0 + r);
        const U0 = (E * R0) / (R0 + r);

        // 图表 1: U-R 曲线 (U = E·R/(R+r))
        const U_R: ChartSeries = {
            xLabel: '负载电阻 R (Ω)',
            yLabel: '路端电压 U (V)',
            xUnit: 'Ω',
            yUnit: 'V',
            points: []
        };
        // 图表 2: U-I 直线 (U = E − I·r) — 关键点: 严格线性
        const U_I: ChartSeries = {
            xLabel: '电流 I (A)',
            yLabel: '路端电压 U (V)',
            xUnit: 'A',
            yUnit: 'V',
            points: []
        };
        // 图表 3: I-R 曲线 (I = E/(R+r))
        const I_R: ChartSeries = {
            xLabel: '负载电阻 R (Ω)',
            yLabel: '电流 I (A)',
            xUnit: 'Ω',
            yUnit: 'A',
            points: []
        };

        // 对数采样 (兼顾小电阻和大电阻区域的分辨率)
        const logMin = Math.log(Rmin);
        const logMax = Math.log(Rmax);
        let sumX = 0,
            sumY = 0,
            sumXY = 0,
            sumX2 = 0;
        const n = sampleCount + 1;

        for (let i = 0; i <= sampleCount; i++) {
            const R = Math.exp(logMin + (logMax - logMin) * (i / sampleCount));
            const I = E / (R + r);
            const U = (E * R) / (R + r);

            U_R.points.push({ x: parseFloat(R.toFixed(4)), y: parseFloat(U.toFixed(5)) });
            U_I.points.push({ x: parseFloat(I.toFixed(5)), y: parseFloat(U.toFixed(5)) });
            I_R.points.push({ x: parseFloat(R.toFixed(4)), y: parseFloat(I.toFixed(5)) });

            // 线性拟合用数据 (U-I 拟合)
            sumX += I;
            sumY += U;
            sumXY += I * U;
            sumX2 += I * I;
        }

        // 线性拟合 U = a + b·I → 从 U-I 图拟合 E_exp, r_exp
        // 公式: b = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²),  a = (Σy − b·Σx) / n
        const denom = n * sumX2 - sumX * sumX;
        let E_exp = E; // 默认 (退化情况)
        let r_exp = r;
        let rSquared = 1;
        if (Math.abs(denom) > 1e-20) {
            const b = (n * sumXY - sumX * sumY) / denom;
            const a = (sumY - b * sumX) / n;
            E_exp = a;
            r_exp = -b;
            // R² 计算
            const ssRes = U_I.points.reduce((acc, p) => {
                const yHat = a + b * p.x;
                return acc + (p.y - yHat) ** 2;
            }, 0);
            const yMean = sumY / n;
            const ssTot = U_I.points.reduce((acc, p) => acc + (p.y - yMean) ** 2, 0);
            rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 1;
        }

        // 关键帧
        const I_short = E / r; // 短路电流 (R=0)
        const keyframes: Keyframe[] = [
            {
                label: '开路 (R→∞)',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `I→0, U→E=${E}V (路端电压 = 电动势, 测量 E 的原理)`
            },
            {
                label: 'R = r (临界)',
                t: 1,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `R=r=${r}Ω → U=E/2=${(E / 2).toFixed(3)}V, 输出功率最大 η=50%`
            },
            {
                label: 'R=0 (短路)',
                t: 2,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `U=0, I_max=E/r=${r > 0 ? I_short.toFixed(3) : '∞'}A`
            },
            {
                label: 'U-I 拟合',
                t: 3,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `拟合: E_exp=${E_exp.toFixed(3)}V, r_exp=${r_exp.toFixed(3)}Ω, R²=${rSquared.toFixed(6)}`
            }
        ];

        const trajectory: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }
        ];

        const warnings: string[] = [];
        if (r === 0) warnings.push('内阻为 0, 短路电流无穷大, 图中 R→0 时电流会很大');
        if (U0 < E * 0.5) warnings.push('工作点电压小于 E/2, 内阻占比大');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '全电路欧姆定律',
                formula: 'I = E / (R + r)',
                calculation: `工作点 R=${R0.toFixed(2)}Ω → I₀=${I0.toFixed(3)}A`
            },
            {
                order: 2,
                description: '路端电压 (U-R)',
                formula: 'U = E·R/(R+r)',
                calculation: `U₀=${E}×${R0.toFixed(2)}/(${R0.toFixed(2)}+${r})=${U0.toFixed(3)}V`
            },
            {
                order: 3,
                description: 'U-I 直线',
                formula: 'U = E − I·r',
                calculation: `截距=E=${E}V, 斜率=−r=${r}Ω, 短路电流=E/r=${r > 0 ? (E / r).toFixed(3) : '∞'}A`
            },
            {
                order: 4,
                description: '线性拟合验证',
                formula: 'U_I 拟合: E_exp=截距, r_exp=−斜率',
                calculation: `E_exp=${E_exp.toFixed(3)}V (输入=${E}V), r_exp=${r_exp.toFixed(3)}Ω (输入=${r}Ω), R²=${rSquared.toFixed(6)}`
            }
        ];

        if (r > 0) {
            steps.push({
                order: 5,
                description: '最大功率传输',
                formula: 'R=r 时输出功率最大, P_max=E²/(4r)',
                calculation: `P_max=${E}²/(4×${r})=${((E * E) / (4 * r)).toFixed(3)}W`
            });
        }

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                x_t: U_R,
                y_t: U_I,
                vx_t: I_R,
                U_R,
                U_I,
                I_R
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    emf: E,
                    internalResistance: r,
                    loadResistanceMin: Rmin,
                    loadResistanceMax: Rmax,
                    operatingCurrent: I0,
                    operatingVoltage: U0,
                    fittedEmf: E_exp,
                    fittedInternalResistance: r_exp,
                    rSquared,
                    shortCircuitCurrent: r > 0 ? E / r : Infinity,
                    maxOutputPower: r > 0 ? (E * E) / (4 * r) : Infinity,
                    efficiencyAtOperatingPoint: R0 / (R0 + r)
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `路端电压: E=${E}V, r=${r}Ω, R∈[${Rmin},${Rmax}]Ω → 拟合 E_exp=${E_exp.toFixed(3)}V, r_exp=${r_exp.toFixed(3)}Ω (R²=${rSquared.toFixed(4)})`,
                steps,
                formulas: [
                    {
                        name: '全电路欧姆定律',
                        formula: 'I = E/(R+r)',
                        variables: {
                            E: { value: E, unit: 'V' },
                            R: { value: R0, unit: 'Ω' },
                            r: { value: r, unit: 'Ω' },
                            I: { value: I0, unit: 'A' }
                        }
                    },
                    { name: '路端电压', formula: 'U = E·R/(R+r) = E−Ir', variables: { U: { value: U0, unit: 'V' } } },
                    {
                        name: 'U-I 线性',
                        formula: 'U = E − Ir',
                        variables: { E: { value: E_exp, unit: 'V' }, r: { value: r_exp, unit: 'Ω' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

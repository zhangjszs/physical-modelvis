import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 直流电路模型 — 串并联电路 (必修三 第十一章)
 *
 * 串并联总电阻计算：
 *   串联：R_eq = ΣR_i
 *   并联：1/R_eq = Σ(1/R_i)
 *
 * 电路分析 (含内阻 r)：
 *   电流 I = E / (R_eq + r)      (全电路欧姆定律)
 *   路端电压 U = E − I·r = I·R_eq
 *   输出功率 P_out = I²·R_eq = U·I
 *   总功率 P_total = I²·(R_eq + r) = E·I
 *   效率 η = R_eq / (R_eq + r) = U / E
 *
 * 测绘小灯泡伏安特性曲线 (简化分段)：
 *   灯泡电阻随温度升高而增大 → R 随 U 增大 (非线性)
 *   本模型使用 R = R0·(1 + α·|V|) 近似, α 为温度系数
 */
export class CircuitModel extends PhysicsModelBase {
    readonly name = '直流电路分析';
    readonly version = '1.0.0';
    readonly description = '串并联电阻、全电路欧姆定律、电功率、小灯泡伏安特性';
    readonly modelType = 'circuit' as const;
    readonly assumptions = [
        '内阻恒定',
        '电路在稳态下分析 (暂态忽略)',
        '导线电阻忽略不计',
        '小灯泡伏安特性使用线性近似 (α≪1)'
    ];
    readonly applicableRange = '恒流直流电路；串并联组合；电阻值 0.1 Ω – 100 kΩ';
    readonly errorSources = [
        '实际电池内阻随放电变化',
        '大电流下导线电阻不可忽略',
        '小灯泡电阻与温度相关 → 非线性伏安曲线'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'emf', description: '电动势 (V)', unit: 'V', required: true, min: 0.1, max: 50 },
        { name: 'internalResistance', description: '内阻 (Ω)', unit: 'Ω', required: false, min: 0, max: 10 },
        { name: 'resistance', description: '外电阻 (Ω)', unit: 'Ω', required: true, min: 0.1, max: 1e5 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const cc = problem.constraints?.circuit;
        if (!cc) throw new Error('circuit 模型需要 circuit 约束配置');

        const E = cc.emf;
        const r = cc.internalResistance ?? 0;
        const resistors = cc.resistors;

        if (resistors.length === 0) {
            throw new Error('circuit 模型至少需要一个电阻');
        }

        // 计算总外电阻 R_eq (左折叠)
        // 约定：resistors[0].connection 永远为 'series' (起始级)
        // 后续 resistors[i]：
        //   - 'series'：等效电阻 = 当前结果 + R_i
        //   - 'parallel'：等效电阻 = 1 / (1/当前结果 + 1/R_i)   (R_i 与当前结果整体并联)
        // 物理意义示例：[10s, 10p] → 10Ω 串 (并联) 10Ω = 1/(1/10+1/10) = 5Ω
        // 注意：此简化拓扑无法表达任意嵌套串并联, 仅覆盖高中物理常见拓扑
        let req = resistors[0]!.resistance;
        for (let i = 1; i < resistors.length; i++) {
            const { resistance, connection } = resistors[i]!;
            if (connection === 'series') {
                req = req + resistance;
            } else {
                // 并联：1/Req = 1/Req + 1/R_i
                if (req === 0 || resistance === 0) {
                    req = 0;
                } else {
                    req = 1 / (1 / req + 1 / resistance);
                }
            }
        }

        // 全电路欧姆定律
        const I = E / (req + r);
        const U = E - I * r; // 路端电压
        const Pout = I * I * req; // 输出功率
        const Ptotal = E * I; // 总功率
        const efficiency = req / (req + r); // 效率

        // 各电阻上的电压/电流 (简化：仅支持纯串联或纯并联)
        // 混合拓扑时, 仅报告总电流和总电压
        const isPureSeries = resistors.every((_, i) => i === 0 || resistors[i]!.connection === 'series');
        const isPureParallel = resistors.every((_, i) => i === 0 || resistors[i]!.connection === 'parallel');

        // 图表 1：路端电压 U 随外电阻 R 变化 (U = E·R/(R+r))
        const U_R_curve: ChartSeries = {
            xLabel: '外电阻 R (Ω)',
            yLabel: '路端电压 U (V)',
            xUnit: 'Ω',
            yUnit: 'V',
            points: []
        };
        for (let R = 0.1; R <= Math.max(req * 3, 100); R *= 1.05) {
            const u = (E * R) / (R + r);
            U_R_curve.points.push({ x: parseFloat(R.toFixed(2)), y: parseFloat(u.toFixed(3)) });
        }

        // 图表 2：输出功率 P_out 随外电阻 R 变化 (P = E²·R/(R+r)²)
        // 当 R = r 时输出功率最大 (最大功率传输定理)
        const P_R_curve: ChartSeries = {
            xLabel: '外电阻 R (Ω)',
            yLabel: '输出功率 P (W)',
            xUnit: 'Ω',
            yUnit: 'W',
            points: []
        };
        let pMax = 0;
        let rOpt = 0;
        for (let R = 0.1; R <= Math.max(req * 3, 100); R *= 1.05) {
            const p = (E * E * R) / ((R + r) * (R + r));
            P_R_curve.points.push({ x: parseFloat(R.toFixed(2)), y: parseFloat(p.toFixed(4)) });
            if (p > pMax) {
                pMax = p;
                rOpt = R;
            }
        }

        // 图表 3：小灯泡伏安特性曲线 (非线性, R = R0·(1 + α·|V|))
        // 使用当前外电阻作为 R0, α=0.01 (典型小灯泡温度系数)
        const alpha = 0.01;
        const R0 = req;
        const VI_curve: ChartSeries = {
            xLabel: '电压 U (V)',
            yLabel: '电流 I (A)',
            xUnit: 'V',
            yUnit: 'A',
            points: []
        };
        for (let v = 0; v <= E; v += E / 50) {
            const rHot = R0 * (1 + alpha * v);
            const i = v / (rHot + r);
            VI_curve.points.push({ x: parseFloat(v.toFixed(3)), y: parseFloat(i.toFixed(4)) });
        }

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '电路工作点',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `E=${E}V, r=${r}Ω, R_eq=${req.toFixed(2)}Ω → I=${I.toFixed(3)}A, U=${U.toFixed(2)}V, P=${Pout.toFixed(2)}W, η=${(efficiency * 100).toFixed(1)}%`
            }
        ];

        // 构造示意轨迹 (仅 1 个点, 用于渲染端点)
        const trajectory: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }
        ];

        const warnings: string[] = [];
        if (r > 0 && Math.abs(req - r) / Math.max(req, r) < 0.05) {
            warnings.push('外电阻接近内阻 → 输出功率接近最大值 (η=50%)');
        }
        if (I > 10) warnings.push('电流较大, 实际电路需考虑导线电阻和散热');
        if (req < 0.5) warnings.push('外电阻过小, 可能短路');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '等效电阻',
                formula:
                    resistors.length === 1
                        ? 'R_eq = R₁'
                        : isPureSeries
                          ? 'R_eq = ΣR_i (串联)'
                          : isPureParallel
                            ? '1/R_eq = Σ(1/R_i) (并联)'
                            : '串并联混合计算',
                calculation: `R_eq = ${req.toFixed(2)} Ω (${resistors.map(r => r.resistance + 'Ω').join(isPureSeries ? ' + ' : ' ∥ ')})`
            },
            {
                order: 2,
                description: '全电路欧姆定律',
                formula: 'I = E / (R_eq + r)',
                calculation: `I = ${E} / (${req.toFixed(2)} + ${r}) = ${I.toFixed(3)} A`
            },
            {
                order: 3,
                description: '路端电压',
                formula: 'U = E − I·r = I·R_eq',
                calculation: `U = ${E} − ${I.toFixed(3)}×${r} = ${U.toFixed(2)} V`
            },
            {
                order: 4,
                description: '输出功率与效率',
                formula: 'P_out = I²·R_eq, η = R_eq/(R_eq+r)',
                calculation: `P_out = ${Pout.toFixed(2)} W, η = ${(efficiency * 100).toFixed(1)}%`
            }
        ];

        if (r > 0) {
            steps.push({
                order: 5,
                description: '最大功率传输',
                formula: '当 R_eq = r 时 P_out 最大',
                calculation: `R=r=${r}Ω 时 P_max = E²/(4r) = ${((E * E) / (4 * r)).toFixed(2)} W`
            });
        }

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t: U_R_curve, y_t: P_R_curve, vx_t: VI_curve },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    emf: E,
                    internalResistance: r,
                    equivalentResistance: req,
                    current: I,
                    terminalVoltage: U,
                    outputPower: Pout,
                    totalPower: Ptotal,
                    efficiency,
                    maxPower: pMax,
                    optimalResistance: rOpt,
                    isPureSeries: isPureSeries ? 1 : 0,
                    isPureParallel: isPureParallel ? 1 : 0
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `电路: E=${E}V, r=${r}Ω, R_eq=${req.toFixed(2)}Ω → I=${I.toFixed(3)}A, U=${U.toFixed(2)}V, P=${Pout.toFixed(2)}W, η=${(efficiency * 100).toFixed(1)}%`,
                steps,
                formulas: [
                    {
                        name: '全电路欧姆定律',
                        formula: 'I = E/(R+r)',
                        variables: {
                            E: { value: E, unit: 'V' },
                            R: { value: req, unit: 'Ω' },
                            r: { value: r, unit: 'Ω' },
                            I: { value: I, unit: 'A' }
                        }
                    },
                    { name: '路端电压', formula: 'U = E − Ir', variables: { U: { value: U, unit: 'V' } } },
                    { name: '输出功率', formula: 'P = I²R = UI', variables: { P: { value: Pout, unit: 'W' } } }
                ]
            },
            errors: [],
            warnings
        };
    }
}

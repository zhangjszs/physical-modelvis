import { PhysicsModelBase } from './base.js';
import type { PhysicsProblem } from '../types/problem.js';
import type {
    SimulationResult,
    TrajectoryPoint,
    Keyframe,
    ChartSeries,
    ExplanationStep,
    FormulaUsage
} from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';

/** 热敏电阻类型: NTC (负温度系数) 或 PTC (正温度系数) */
export type ThermistorMode = 'NTC' | 'PTC';

/**
 * 热敏电阻约束 — 选必二 第十一章 传感器 (热敏电阻与温控原理)
 *
 * NTC (Negative Temperature Coefficient):
 *   半导体材料, 电阻随温度升高而下降
 *   R(T) = R0 * exp(B * (1/T - 1/T0))   (T 为绝对温度 K)
 *   B 为材料常数 (典型值 3000~5000 K), R0 为 T0 (298.15 K = 25 C) 时的电阻
 *
 * PTC (Positive Temperature Coefficient):
 *   正温度系数材料 (如 BaTiO3 半导体陶瓷)
 *   低于居里点 (Tc) 时电阻近似恒定, 超过居里点后电阻急剧上升 (指数级)
 *   简化模型: R(T) = R0                     , T <= Tc
 *             R(T) = R0 * exp(BPTC*(T-Tc)/Tc), T >  Tc
 */
/**
 * 热敏电阻模型 — 选必二 传感器 (热敏电阻、NTC/PTC 阻温特性)
 *
 * 物理:
 *   NTC: 半导体能带结构, 温度升高 → 载流子浓度指数上升 → R 指数下降
 *        公式: R(T) = R0 * exp(B * (1/T - 1/T0))
 *        二端 B 值定义: B = ln(R/R0) / (1/T - 1/T0)
 *   PTC: BaTiO3 铁电半导体, 居里点自发极化消失 → 晶界势垒突增
 *        简化: T <= Tc 时 R 近似不变; T > Tc 时 R 指数上升
 *
 * 教学应用:
 *   - 温控电路: NTC + 电压比较器 + 继电器
 *   - 空调/电饭煲温度传感器原理
 *   - 过流保护: PTC 自恢复保险丝
 */
export class ThermistorModel extends PhysicsModelBase {
    readonly name = '热敏电阻';
    readonly version = '1.0.0';
    readonly description = 'NTC / PTC 热敏电阻阻温特性曲线、温控应用原理';
    readonly modelType = 'thermistor' as const;
    readonly assumptions = [
        'NTC 模型使用 Steinhart-Hart 的 B 方程近似 (三常数方程)',
        'PTC 模型为简化线性-指数复合, 非真实居里-外斯定律',
        '温度变化缓慢, 电阻处于热平衡',
        '表面漏电流可忽略'
    ];
    readonly applicableRange = 'NTC: 200~500 K; B 值: 2000~6000 K; R0: 1 Ω~1 MΩ; PTC: 300~600 K';
    readonly errorSources = [
        '实际 B 值随温度非线性变化 (宽温度范围)',
        'NTC 自热效应: 电流通过发热 → 测量值偏高',
        'PTC 居里点附近滞回曲线: 升降温读数不同',
        '材料批次离散导致 B 值公差 +-5%'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'temperature', description: '目标温度 (K)', unit: 'K', required: true, min: 200, max: 600 },
        { name: 'R0', description: '基准电阻 R0 (Ω)', unit: 'Ω', required: true, min: 1, max: 1e6 },
        { name: 'BValue', description: '材料常数 B (K)', unit: 'K', required: true, min: 1000, max: 8000 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const ic = problem.constraints?.thermistor;
        if (!ic) throw new Error('thermistor 模型需要 thermistor 约束配置');

        const Ttarget = ic.temperature;
        const mode = ic.mode;
        const R0 = ic.R0;
        const B = ic.BValue;
        const T0 = 298.15; // 25 C 基准
        const sampleCount = ic.sampleCount ?? 120;
        const tempMin = ic.tempMin ?? 250;
        const tempMax = ic.tempMax ?? 400;
        const curieTemp = ic.curieTemp ?? 380;
        const ptcCoeff = ic.ptcCoeff ?? 15;

        // — 标况下电阻 (N 点采样) —
        const resistanceVsTemp: ChartSeries = {
            xLabel: '温度 T (K)',
            yLabel: '电阻 R (Ω)',
            xUnit: 'K',
            yUnit: 'Ω',
            points: []
        };
        for (let i = 0; i <= sampleCount; i++) {
            const T = tempMin + ((tempMax - tempMin) * i) / sampleCount;
            const R = this.computeR(T, mode, R0, B, curieTemp, ptcCoeff);
            resistanceVsTemp.points.push({
                x: parseFloat(T.toFixed(2)),
                y: parseFloat(R.toFixed(4))
            });
        }

        // — 目标温度下的电阻值 —
        const Rtarget = this.computeR(Ttarget, mode, R0, B, curieTemp, ptcCoeff);

        // — dR/dT — (中心差分, K^-1)
        const dT = 0.01;
        const rPlus = this.computeR(Ttarget + dT, mode, R0, B, curieTemp, ptcCoeff);
        const rMinus = this.computeR(Ttarget - dT, mode, R0, B, curieTemp, ptcCoeff);
        const dRdT = (rPlus - rMinus) / (2 * dT);

        // — tempCoef C^-1 (1/R dR/dT) —
        const alpha = Rtarget > 0 ? (1 / Rtarget) * dRdT : 0;

        // — 温度区间采样: ln(R) vs 1/T (NTC 验证线性) —
        const lnRvsInvT: ChartSeries = {
            xLabel: '1/T (K⁻¹)',
            yLabel: 'ln(R)',
            xUnit: '1/K',
            yUnit: '',
            points: []
        };
        if (mode === 'NTC') {
            for (let i = 0; i <= 80; i++) {
                const T = tempMin + ((tempMax - tempMin) * i) / 80;
                const R = this.computeR(T, mode, R0, B, curieTemp, ptcCoeff);
                if (R > 0) {
                    lnRvsInvT.points.push({
                        x: parseFloat((1 / T).toFixed(6)),
                        y: parseFloat(Math.log(R).toFixed(4))
                    });
                }
            }
        }

        // — 关键点: 目标温度处 —
        const keyframes: Keyframe[] = [
            {
                label: '目标温度',
                t: 0,
                position: { x: Ttarget, y: Rtarget },
                velocity: { x: 0, y: 0 },
                description: `${mode} 热敏电阻, T=${Ttarget.toFixed(1)}K (${(Ttarget - 273.15).toFixed(1)}°C), R=${Rtarget.toFixed(2)}Ω, dR/dT=${dRdT.toFixed(3)}Ω/K, α=${(alpha * 100).toFixed(3)}%/K`
            },
            {
                label: '基准温度',
                t: 0,
                position: { x: T0, y: R0 },
                velocity: { x: 0, y: 0 },
                description: `${mode} 基准温度 T0=${T0.toFixed(2)}K (25°C), R0=${R0}Ω, B=${B}K`
            }
        ];

        if (mode === 'PTC') {
            keyframes.push({
                label: '居里点',
                t: 0,
                position: { x: curieTemp, y: this.computeR(curieTemp, mode, R0, B, curieTemp, ptcCoeff) },
                velocity: { x: 0, y: 0 },
                description: `PTC 居里温度 Tc=${curieTemp}K, 此处电阻特性转折`
            });
        }

        // — 轨迹 (伪轨迹: T 为 x, R 为 y) —
        const points: TrajectoryPoint[] = [];
        for (let i = 0; i <= sampleCount; i++) {
            const T = tempMin + ((tempMax - tempMin) * i) / sampleCount;
            const R = this.computeR(T, mode, R0, B, curieTemp, ptcCoeff);
            points.push({ t: 0, position: { x: T, y: R }, velocity: { x: 0, y: 0 } });
        }

        const warnings: string[] = [];
        if (Ttarget < 200 || Ttarget > 600) warnings.push('目标温度超出常规热敏电阻范围');
        if (mode === 'NTC' && (B < 2000 || B > 6000)) warnings.push('B 值不在典型 NTC 范围 (2000~6000 K)');
        if (Rtarget < 0.01) warnings.push('电阻阻值过小, 自热效应不可忽略');
        if (Rtarget > 1e9) warnings.push('电阻阻值极大, 建议确认参数');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '模型选型与参数确认',
                formula:
                    mode === 'NTC'
                        ? 'R(T) = R0 * exp(B * (1/T - 1/T0))'
                        : 'PTC: R=R0 (T<=Tc); R=R0*exp(C*(T-Tc)/Tc) (T>Tc)',
                calculation: `模式=${mode}, R0=${R0}Ω, B=${B}K, T0=${T0}K, 目标温度 T=${Ttarget}K`
            },
            {
                order: 2,
                description: '计算目标温度电阻',
                formula:
                    mode === 'NTC'
                        ? 'R(T) = R0 * exp(B * (1/T - 1/T0))'
                        : Ttarget <= curieTemp
                          ? 'R = R0'
                          : 'R = R0 * exp(C * (T - Tc) / Tc)',
                calculation: `R=${R0} * exp(...) = ${Rtarget.toFixed(4)}Ω`,
                result: `T=${Ttarget}K 时电阻 = ${Rtarget.toFixed(4)}Ω`
            },
            {
                order: 3,
                description: '温度系数 α = (1/R) dR/dT',
                formula: 'α(T) = (1/R) · dR/dT',
                calculation:
                    mode === 'NTC'
                        ? `α ≈ -B/T² = ${((-B / (Ttarget * Ttarget)) * 100).toFixed(4)} %/K`
                        : `PTC 在居里点附近温度系数急剧变号`,
                result: `当前 α=${(alpha * 100).toFixed(4)} %/K`
            },
            {
                order: 4,
                description: '应用场景说明',
                formula: 'NTC 温控: 比较器阈值 V_ref = E · R_NTC / (R_NTC + R_fix)',
                result:
                    mode === 'NTC'
                        ? '温度升高 → R 降低 → 分压变化 → 比较器翻转 → 继电器动作'
                        : 'PTC 自恢复保险丝: 过流 → 发热 → 超过 Tc → 电阻激增 → 限流保护'
            }
        ];

        const formulas: FormulaUsage[] = [
            {
                name: mode === 'NTC' ? 'NTC B 方程' : 'PTC 简化模型',
                formula:
                    mode === 'NTC'
                        ? 'R(T) = R0 * exp(B * (1/T - 1/T0))'
                        : 'R(T) = R0 (T <= Tc) 或 R0*exp(C*(T-Tc)/Tc) (T > Tc)',
                variables: {
                    R0: { value: R0, unit: 'Ω' },
                    T0: { value: T0, unit: 'K' },
                    B: { value: B, unit: 'K' },
                    T: { value: Ttarget, unit: 'K' },
                    R: { value: parseFloat(Rtarget.toFixed(4)), unit: 'Ω' }
                }
            },
            {
                name: '温度系数',
                formula: 'alpha = (1/R) * dR/dT',
                variables: {
                    alpha: { value: parseFloat((alpha * 100).toFixed(4)), unit: '%/K' },
                    T: { value: Ttarget, unit: 'K' }
                }
            }
        ];

        // 组装 charts (NTC 使用 lnRvsInvT, PTC 使用空位图)
        const charts: Record<string, ChartSeries> = { x_t: resistanceVsTemp };
        if (mode === 'NTC') {
            charts['y_t'] = lnRvsInvT;
        }

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [points],
            keyframes,
            charts,
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    temperatureK: Ttarget,
                    resistance: Rtarget,
                    dRdT,
                    alphaOver100: alpha * 100,
                    BValue: B,
                    baseResistance: R0,
                    modeFlag: mode === 'NTC' ? 0 : 1,
                    curieTemp
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `${mode} 热敏电阻 (${ic.BValue}K): T=${Ttarget}K 时 R=${Rtarget.toFixed(2)}Ω, 温度系数 α=${(alpha * 100).toFixed(3)}%/K`,
                steps,
                formulas
            },
            errors: [],
            warnings
        };
    }

    /** 辅助方法: 根据模式计算电阻 */
    private computeR(
        T: number,
        mode: ThermistorMode,
        R0: number,
        B: number,
        curieTemp: number,
        ptcCoeff: number
    ): number {
        const T0 = 298.15;
        if (mode === 'NTC') {
            return R0 * Math.exp(B * (1 / T - 1 / T0));
        }
        if (T <= curieTemp) return R0;
        return R0 * Math.exp((ptcCoeff * (T - curieTemp)) / curieTemp);
    }

    protected requiresValidation(): boolean {
        return false;
    }
}

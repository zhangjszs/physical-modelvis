import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 液晶光学性质模型 — 选必三: 液晶的光电效应 (液晶显示器原理)
 *
 * 物理原理:
 *   - 液晶是介于液体与晶体之间的中间相 (介晶相), 分子具有取向有序性
 *   - 向列型 (nematic): 分子长轴大致平行排列, 无层状结构
 *   - 胆甾型 (cholesteric): 分子螺旋排列, 自然螺距 P (um 量级)
 *   - 光通过液晶时透射率 T 随温度与电压的变化关系 (本模型简化拟合)
 *
 *   - 温度效应: T > Tc (清亮点) 时液晶变为各向同性液体, 双折射消失
 *   - 电压效应: 阈值电压 Vth 之上分子重新取向, 双折射 Δn 降低
 *
 * 本模型:
 *   - x_t = 透射率 vs 温度曲线 (在 V 固定下)
 *   - y_t = 透射率 vs 电压曲线 (在 T 固定下)
 *   - v_t = 颜色偏移 (chromaticity shift Δλ)
 */

/* 材料示例参数 (以 5CB 向列液晶为原型) */
const DEFAULT_TC = 35; // ℃
const DEFAULT_VTH = 2.0; // V
const DEFAULT_PITCH = 0.4; // um (胆甾型可见光螺距)

/* 折射率各向异性 Δn(T) / Δn(0) 的简化经验公式 (Norsten-Tarasov) */
function birefringenceRatio(temp: number, tc: number): number {
    if (temp >= tc) return 0;
    const tau = 1 - temp / tc;
    return Math.pow(tau, 0.22);
}

/* 电压导致的取向重排 (Freedericksz 简化) */
function voltageBirefringence(v: number, vth: number): number {
    if (v <= vth) return 1;
    const x = vth / v;
    return 1 - x * x;
}

/* 透射率简化: T = T0 * sin²(πΔn*d/λ) — 只取前半部分为近似 */
function transmittance(deltaN: number): number {
    return Math.sin(Math.PI * deltaN * 0.25) ** 2;
}

/* 颜色偏移 (波长单位 nm), Δn 增加等效于红移 */
function chromaticShift(deltaN: number, pitchUm: number): number {
    if (pitchUm > 0) {
        return 580 + 120 * deltaN * (0.4 / pitchUm);
    }
    return 580 + 30 * deltaN;
}

export class LiquidCrystalModel extends PhysicsModelBase {
    readonly name = '液晶光学性质';
    readonly version = '1.0.0';
    readonly description = '向列/胆甾液晶的透射率随温度/电压变化曲线 + 颜色偏移';
    readonly modelType = 'liquid-crystal' as const;
    readonly assumptions = [
        '简化液晶向列型本构, 忽略真实弹性常数梯度',
        '温度效应使用 Tarasov 经验公式 Δn(T)/Δn(0)=(1-T/Tc)^0.22',
        '电压效应使用 Freedericksz 近似 Δn(V)=Δn(0)*(1-(Vth/V)²)',
        '透过率使用双光束干涉简化模型 T=sin²(πΔn·d/λ)'
    ];
    readonly applicableRange = '向列型液晶常用温度 -10℃ ~ 80℃, 电压 0~20V';
    readonly errorSources = [
        '实际透过率曲线受偏振片夹角影响',
        '阈值电压受频率/波形影响',
        '螺距温度依赖性 (dP/dT ≈ 数 nm/℃) 未计入'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'temperature', description: '环境温度 (℃)', unit: '℃', required: true, min: -20, max: 120 },
        { name: 'voltage', description: '驱动电压 (V)', unit: 'V', required: true, min: 0, max: 30 },
        { name: 'mode', description: '液晶模式 (nematic / cholesteric)', unit: '', required: true }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.liquidCrystal;
        if (!c) {
            throw new Error('liquid-crystal 模型需要 constraints.liquidCrystal 配置');
        }

        const tc = c.clearingPoint ?? DEFAULT_TC;
        const vth = c.thresholdVoltage ?? DEFAULT_VTH;
        const pitchUm = c.pitchUm ?? DEFAULT_PITCH;

        /* ---------- 当前状态透射率 ---------- */
        const tempRatio = birefringenceRatio(c.temperature, tc);
        const voltRatio = voltageBirefringence(c.voltage, vth);
        const deltaN0 = 0.2; // 5CB 典型值
        const deltaN = deltaN0 * tempRatio * voltRatio;
        const T = transmittance(deltaN);
        const lambda = chromaticShift(deltaN, c.mode === 'cholesteric' ? pitchUm : 0);

        /* ---------- x_t = 透射率 vs 温度 (固定电压) ---------- */
        const N_T = 60;
        const pointsTemp: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= N_T; i++) {
            const t = -10 + (100 * i) / N_T;
            const r = birefringenceRatio(t, tc);
            const dn = deltaN0 * r * voltRatio;
            pointsTemp.push({ x: parseFloat(t.toFixed(2)), y: parseFloat(transmittance(dn).toFixed(4)) });
        }
        const chartTemp: ChartSeries = {
            xLabel: '温度 (℃)',
            yLabel: '透射率',
            xUnit: '℃',
            yUnit: '',
            points: pointsTemp
        };

        /* ---------- y_t = 透射率 vs 电压 (固定温度) ---------- */
        const N_V = 80;
        const pointsVolt: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= N_V; i++) {
            const v = (25 * i) / N_V;
            const r = voltageBirefringence(v, vth);
            const dn = deltaN0 * tempRatio * r;
            pointsVolt.push({ x: parseFloat(v.toFixed(2)), y: parseFloat(transmittance(dn).toFixed(4)) });
        }
        const chartVolt: ChartSeries = {
            xLabel: '驱动电压 (V)',
            yLabel: '透射率',
            xUnit: 'V',
            yUnit: '',
            points: pointsVolt
        };

        /* ---------- v_t = 颜色偏移 (波长) vs 温度 ---------- */
        const pointsColor: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= N_T; i++) {
            const t = -10 + (100 * i) / N_T;
            const r = birefringenceRatio(t, tc);
            const dn = deltaN0 * r * voltRatio;
            pointsColor.push({
                x: parseFloat(t.toFixed(2)),
                y: parseFloat(chromaticShift(dn, c.mode === 'cholesteric' ? pitchUm : 0).toFixed(2))
            });
        }
        const chartColor: ChartSeries = {
            xLabel: '温度 (℃)',
            yLabel: '主波长 (nm)',
            xUnit: '℃',
            yUnit: 'nm',
            points: pointsColor
        };

        /* ---------- keyframes ---------- */
        const keyframes: Keyframe[] = [
            {
                label: '当前工作点',
                t: 0,
                position: { x: c.temperature, y: T },
                velocity: { x: 0, y: 0 },
                description: `T=${c.temperature}℃, V=${c.voltage}V, mode=${c.mode}, T=${(T * 100).toFixed(1)}%, λ=${lambda.toFixed(0)}nm`
            }
        ];

        /* ---------- 示意轨迹 ---------- */
        const trajectory: TrajectoryPoint[] = [
            {
                t: 0,
                position: { x: c.temperature, y: T },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            }
        ];

        const modeZh = c.mode === 'nematic' ? '向列型' : '胆甾型';

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '折射率温度依赖性',
                formula: 'Δn(T)/Δn(0) = (1 − T/Tc)^0.22',
                calculation: `(1 − ${c.temperature}/${tc})^0.22 = ${tempRatio.toFixed(3)}`
            },
            {
                order: 2,
                description: '电压引起的 Freedericksz 双折射衰减',
                formula: 'Δn(V) = Δn(0) · (1 − (Vth/V)²)   (V > Vth)',
                calculation: `${c.voltage}V > ${vth}V → 取向比 = ${voltRatio.toFixed(3)}`
            },
            {
                order: 3,
                description: '透射率与颜色偏移',
                formula: 'T = sin²(π·Δn·d/λ) ;  λ ≈ 580nm + k·Δn·P0/P',
                result: `T = ${(T * 100).toFixed(1)}%, λ = ${lambda.toFixed(0)} nm`
            }
        ];

        const warnings: string[] = [];
        if (c.temperature > tc) warnings.push(`温度超过清亮点 Tc=${tc}℃, 液晶变为各向同性液体, 光学效应消失`);
        if (c.temperature < -10) warnings.push('温度过低可能使液晶结晶, 模型假设不再成立');

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                x_t: chartTemp,
                y_t: chartVolt,
                v_t: chartColor
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    temperatureDegC: c.temperature,
                    voltageV: c.voltage,
                    clearingPointDegC: tc,
                    thresholdVoltageV: vth,
                    transmittancePct: parseFloat((T * 100).toFixed(2)),
                    dominantWavelengthNm: parseFloat(lambda.toFixed(1)),
                    modeCode: c.mode === 'nematic' ? 0 : 1
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `${modeZh}液晶在 T=${c.temperature}℃, V=${c.voltage}V 下透射率 ${(T * 100).toFixed(1)}%, 主波长 ${lambda.toFixed(0)}nm`,
                steps,
                formulas: [
                    {
                        name: 'Norsten-Tarasov',
                        formula: 'Δn(T) = Δn(0) · (1 − T/Tc)^0.22',
                        variables: {
                            deltaN0: { value: deltaN0, unit: '' },
                            T: { value: c.temperature, unit: '℃' },
                            Tc: { value: tc, unit: '℃' },
                            ratio: { value: parseFloat(tempRatio.toFixed(4)), unit: '' }
                        }
                    },
                    {
                        name: 'Freedericksz',
                        formula: 'Δn(V) = Δn(0) · [1 − (Vth/V)²]',
                        variables: {
                            V: { value: c.voltage, unit: 'V' },
                            Vth: { value: vth, unit: 'V' },
                            ratio: { value: parseFloat(voltRatio.toFixed(4)), unit: '' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

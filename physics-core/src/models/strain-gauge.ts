import { PhysicsModelBase } from './base.js';
import type { PhysicsProblem , StrainGaugeConstraint} from '../types/problem.js';
import type {
    SimulationResult,
    TrajectoryPoint,
    Keyframe,
    ChartSeries,
    ExplanationStep,
    FormulaUsage
} from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';

/**
 * 电阻应变片约束 — 选必二 传感器 (应变片、全桥测量电路)
 *
 * 原理:
 *   金属或半导体材料受机械形变 → 几何尺寸变化 + 电阻率变化 → ΔR
 *   应变: ε = ΔL / L  (无量纲, 微应变 με = 1e-6)
 *   灵敏系数 K = (ΔR/R) / ε
 *
 * 电桥电路 (全桥):
 *   ΔU ≈ U_K * K * ε / 4        (小应变近似)
 *   其中 U_K 为桥路供电电压 (V)
 *
 * 场景:
 *   - 电子秤: 应变片贴在弹性体 → 压力 → 应变 → R 变化 → ΔU
 *   - 加速度传感器
 *   - 应力/应变实验 (杨氏模量测量)
 */
/**
 * 电阻应变片模型 — 选必二 传感器
 *
 * 物理:
 *   金属应变片: ΔR/R ≈ K * ε
 *   K 受几何效应 (长度+截面积) 与压阻效应共同贡献
 *   小应变下线性近似很好 (|ε| << 1)
 *
 * 全桥电路 (四片应变片):
 *   ΔU = U_K * K * (ε1 - ε2 + ε3 - ε4) / 4
 *   对称布置: ε1=ε3=+ε, ε2=ε4=-ε → ΔU = U_K * K * ε / 4
 *   (比半桥灵敏度提高一倍)
 */
export class StrainGaugeModel extends PhysicsModelBase {
    readonly name = '电阻应变片';
    readonly version = '1.0.0';
    readonly description = '电阻应变片 ΔR/R-Kε 关系、全桥电路输出、应力应变测量';
    readonly modelType = 'strain-gauge' as const;
    readonly assumptions = [
        '小应变下 ΔR/R 与 ε 线性关系 (|ε| < 5000 με 线性)',
        '全桥四片 K 值完全一致 (忽略 K 分散性)',
        '应变片粘贴理想, 无蠕变/延迟',
        '温度补偿已做 (对称桥臂)'
    ];
    readonly applicableRange = '金属 K=2~4; 半导体 K=50~200; ε: -5000~5000 με; 桥路 5~24 V';
    readonly errorSources = [
        '大应变非线性: 电阻丝屈服导致 K 变化',
        '温度效应: 热膨胀引起虚假应变',
        '横向效应: 应变片对横向应变敏感',
        '桥路供电纹波: 直接影响 ΔU 读数',
        '放大器零漂和温漂'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'strain', description: '应变 (με 微应变)', unit: 'με', required: true, min: -20000, max: 20000 },
        { name: 'gaugeFactor', description: '灵敏系数 K (无量纲)', unit: '', required: true, min: 1, max: 300 },
        { name: 'bridgeVoltage', description: '桥路供电电压 (V)', unit: 'V', required: true, min: 0.5, max: 30 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const ic = problem.constraints?.strainGauge;
        if (!ic) throw new Error('strain-gauge 模型需要 strainGauge 约束配置');

        const eps = ic.strain; // 微应变 με
        const epsSI = eps * 1e-6; // 无量纲 ε
        const K = ic.gaugeFactor;
        const UK = ic.bridgeVoltage;
        const epsMin = ic.strainMin ?? -2000;
        const epsMax = ic.strainMax ?? 2000;
        const sampleCount = ic.sampleCount ?? 100;

        // — ΔR/R = K * ε (无量纲应变) —
        const deltaROverR = K * epsSI;
        // — 全桥电路输出 ΔU = U_K * K * ε / 4 —
        const deltaU = (UK * epsSI * K) / 4;

        // — 图1: ΔR vs 应变 —
        const deltaRVsStrain: ChartSeries = {
            xLabel: '应变 ε (με)',
            yLabel: 'ΔR/R (×1e-3)',
            xUnit: 'με',
            yUnit: '',
            points: []
        };
        for (let i = 0; i <= sampleCount; i++) {
            const e = epsMin + ((epsMax - epsMin) * i) / sampleCount;
            deltaRVsStrain.points.push({
                x: parseFloat(e.toFixed(1)),
                y: parseFloat((K * e * 1e-6 * 1e3).toFixed(6))
            });
        }

        // — 图2: bridge_output vs 应变 —
        const bridgeOutVsStrain: ChartSeries = {
            xLabel: '应变 ε (με)',
            yLabel: 'ΔU (mV)',
            xUnit: 'με',
            yUnit: 'mV',
            points: []
        };
        for (let i = 0; i <= sampleCount; i++) {
            const e = epsMin + ((epsMax - epsMin) * i) / sampleCount;
            const dU = ((UK * e * 1e-6 * K) / 4) * 1000; // mV
            bridgeOutVsStrain.points.push({
                x: parseFloat(e.toFixed(1)),
                y: parseFloat(dU.toFixed(6))
            });
        }

        // — 图3: K 值对 ΔU 影响扫描 —
        const kScan: ChartSeries = {
            xLabel: '灵敏系数 K',
            yLabel: 'ΔU (mV)',
            xUnit: '',
            yUnit: 'mV',
            points: []
        };
        const kMin = 2;
        const kMax = 200;
        for (let i = 0; i <= 50; i++) {
            const kk = kMin + ((kMax - kMin) * i) / 50;
            const dU = ((UK * epsSI * kk) / 4) * 1000;
            kScan.points.push({
                x: parseFloat(kk.toFixed(1)),
                y: parseFloat(dU.toFixed(4))
            });
        }

        // — 关键点 —
        const keyframes: Keyframe[] = [
            {
                label: '当前工况',
                t: 0,
                position: { x: eps, y: deltaROverR },
                velocity: { x: 0, y: 0 },
                description: `ε=${eps}με, K=${K}, ΔR/R=${(deltaROverR * 1e3).toFixed(4)}×10⁻³, ΔU=${(deltaU * 1e3).toFixed(4)}mV`
            },
            {
                label: '零点',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: '零点: 无应变 → ΔR/R=0, ΔU=0, 电桥平衡'
            }
        ];

        // — 轨迹 (ε 为 x, ΔR/R 为 y) —
        const trajectory: TrajectoryPoint[] = [];
        for (let i = 0; i <= sampleCount; i++) {
            const e = epsMin + ((epsMax - epsMin) * i) / sampleCount;
            trajectory.push({
                t: 0,
                position: { x: e, y: K * e * 1e-6 },
                velocity: { x: 0, y: 0 }
            });
        }

        const warnings: string[] = [];
        if (Math.abs(eps) > 5000) warnings.push('应变较大 ( >5000 με), 线性公式偏差增大');
        if (K < 1.5) warnings.push('K 值过小, 请确认是否为金属片 (K≈2~4)');
        if (K > 250) warnings.push('K 值过大, 半导体应变片范围');
        if (UK <= 0) warnings.push('桥路电压必须为正');
        if (Math.abs(deltaU) > UK) warnings.push('ΔU 已超过供电电压上限, 请确认参数');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '应变片工作原理',
                formula: 'ΔR/R = K · ε  (ε = ΔL/L)',
                calculation: `ΔR/R = ${K} × ${epsSI.toExponential(3)} = ${deltaROverR.toExponential(3)}`,
                result: '灵敏系数 K 综合反映几何效应 + 压阻效应'
            },
            {
                order: 2,
                description: '全桥电路输出',
                formula: 'ΔU = U_K · K · ε / 4  (四个应变片全桥)',
                calculation: `ΔU = ${UK}V × ${K} × ${epsSI.toExponential(3)} / 4 = ${(deltaU * 1e3).toFixed(4)}mV`,
                result: '全桥灵敏度 = U_K · K / 4, 半桥 = U_K · K / 2, 单臂 = U_K · K'
            },
            {
                order: 3,
                description: '温度补偿说明',
                formula: '对称桥臂消除温度效应: ΔU ∝ (ε1 - ε2 + ε3 - ε4)',
                result: '若 ε1=ε2=ε3=ε4=ε_T (同向温度应变) → ΔU=0, 温度影响抵消'
            },
            {
                order: 4,
                description: '应用场景',
                formula: '电子秤: 压力 → 弹性体应变 → ΔU → ADC → 数字显示',
                result: `当前应变 ${eps}με → ΔU=${(deltaU * 1e3).toFixed(3)}mV → 可由 24 位 ADC 采样分辨`
            }
        ];

        const formulas: FormulaUsage[] = [
            {
                name: '应变定义',
                formula: 'ε = ΔL / L',
                variables: {
                    deltaL_over_L: { value: epsSI, unit: '' },
                    muEps: { value: eps, unit: 'με' }
                }
            },
            {
                name: '应变片灵敏系数',
                formula: 'K = (ΔR/R) / ε',
                variables: {
                    K: { value: K, unit: '' },
                    deltaR_over_R: { value: deltaROverR, unit: '' },
                    eps: { value: epsSI, unit: '' }
                }
            },
            {
                name: '全桥输出',
                formula: 'ΔU = U_K · K · ε / 4',
                variables: {
                    UK: { value: UK, unit: 'V' },
                    K: { value: K, unit: '' },
                    eps: { value: epsSI, unit: '' },
                    deltaU: { value: parseFloat((deltaU * 1e3).toFixed(4)), unit: 'mV' }
                }
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                x_t: deltaRVsStrain,
                y_t: bridgeOutVsStrain
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    strainMuEps: eps,
                    gaugeFactor: K,
                    bridgeVoltageV: UK,
                    deltaROverR: deltaROverR,
                    deltaUMV: deltaU * 1e3,
                    sensitivityPerEps: (UK * K) / 4, // V per unit strain
                    kMax,
                    kMin
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `应变片 K=${K}, ε=${eps}με → ΔR/R=${(deltaROverR * 1e3).toFixed(3)}×10⁻³, 全桥输出 ΔU=${(deltaU * 1e3).toFixed(4)}mV`,
                steps,
                formulas
            },
            errors: [],
            warnings
        };
    }

    protected requiresValidation(): boolean {
        return false;
    }
}

import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 光敏电阻约束 — 选必二 (光电传感器)
 *
 * 光敏电阻: 半导体材料在光照下产生光电导效应, 电阻值随光强增加而减小。
 * 典型公式: R = R_dark * exp(-k * E)
 *   R_dark: 暗电阻 (无光照, E=0)
 *   k: 灵敏度系数 (与材料、禁带宽度有关)
 *   E: 光照度 (lx)
 */
export interface PhotoresistorConstraint {
    /** 光照度 E (lx), 作为参考工作点 */
    readonly lightIntensity: number;
    /** 暗电阻 R_dark (Ohm), 无光照时的电阻 */
    readonly darkResistance: number;
    /** 灵敏度 k (1/lx), 控制电阻下降速度 */
    readonly sensitivity: number;
    /** 温度 (摄氏度), 可选 (影响暗电阻) */
    readonly temperatureCelsius?: number;
}

/**
 * 光敏电阻模型 — 选必二 (光电传感器 / 光电导效应)
 *
 * 工作原理 (内光电效应/光电导效应):
 *   - 半导体吸收光子, 价带电子跃迁到导带, 产生电子-空穴对
 *   - 载流子浓度增加, 电导率上升, 宏观表现为电阻减小
 *   - 光越强, 产生载流子越多, 电阻越小
 *
 * 数学模型:
 *   R(E) = R_dark * exp(-k * E)          --- 指数衰减模型
 *   或近似: 1/R = sigma ∝ G (光电导 G 与光强近似线性)
 *   log(R) = log(R_dark) - k*E            --- 半对数线性
 *
 * 典型参数:
 *   R_dark: 1 MOhm ~ 10 MOhm
 *   R_亮:   1 kOhm ~ 10 kOhm @ 1000 lx
 *   k:      5e-4 ~ 5e-3 1/lx
 *
 * 应用: 光控开关 (路灯自动亮灭)、烟雾报警器、光强度计等
 */
export class PhotoresistorModel extends PhysicsModelBase {
    readonly name = '光敏电阻';
    readonly version = '1.0.0';
    readonly description = '光电导效应: R=R_dark*exp(-k*E), 光照越强电阻越小';
    readonly modelType = 'photoresistor' as const;
    readonly assumptions = [
        '指数衰减模型 (R = R_dark * exp(-k*E))',
        '温度恒定 (或可通过温度参数简单修正)',
        '光照均匀, 全表面受光',
        '弱光区近似, 强光下可能趋于饱和'
    ];
    readonly applicableRange = '光照: 0 ~ 1e5 lx; 暗电阻: 1e4 ~ 1e8 Ohm; 灵敏度: 1e-5 ~ 1e-1 1/lx';
    readonly errorSources = [
        '实际 R-E 关系不完全符合指数模型 (尤其是饱和区)',
        '温度对暗电阻影响显著 (温度升高暗电阻下降)',
        '光照历史效应 (光惰性): 惯性时间 ms ~ s',
        '老化导致灵敏度衰减'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'darkResistance', description: '暗电阻 R_dark (Ohm)', unit: 'Ohm', required: true, min: 1e3, max: 1e9 },
        { name: 'sensitivity', description: '灵敏度 k (1/lx)', unit: '1/lx', required: true, min: 1e-6, max: 0.1 },
        { name: 'lightIntensity', description: '工作点光照度 E (lx)', unit: 'lx', required: true, min: 0, max: 1e6 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const raw = problem.constraints as unknown as { readonly photoresistor?: PhotoresistorConstraint } | undefined;
        const c = raw?.photoresistor;
        if (!c) throw new Error('photoresistor 模型需要 photoresistor 约束配置');

        const R_dark = c.darkResistance; // Ohm
        const k = c.sensitivity; // 1/lx
        const E0 = c.lightIntensity; // lx (工作点)
        const T = c.temperatureCelsius ?? 25; // 摄氏度

        // 温度修正: 暗电阻随温度升高而下降 (典型 -2%/K, 每度 -0.02)
        // R_dark(T) = R_dark(25C) * exp(-alpha * (T - 25)), alpha=0.02
        const TEMP_COEFF = 0.02;
        const R_dark_T = R_dark * Math.exp(-TEMP_COEFF * (T - 25));

        // 工作点电阻
        const R0 = R_dark_T * Math.exp(-k * E0);
        // 工作点电导
        const G0 = 1 / R0;
        // 工作点电流 (假设两端加 5V 测试电压, 方便示教)
        const V_test = 5;
        const I0 = V_test / R0;
        // 功率
        const P0 = (V_test * V_test) / R0;

        // ===== R vs E 曲线 (主图) =====
        const N = 200;
        const Emax = Math.max(E0 * 5, 1e4);
        const Emin = 0.01;
        const logEmin = Math.log10(Emin);
        const logEmax = Math.log10(Emax);
        const resistanceVsLight: ChartSeries = {
            xLabel: '光照度 E (lx)',
            yLabel: '电阻 R (Ohm)',
            xUnit: 'lx',
            yUnit: 'Ohm',
            points: []
        };
        for (let i = 0; i <= N; i++) {
            const logE = logEmin + (logEmax - logEmin) * (i / N);
            const E = Math.pow(10, logE);
            const R = R_dark_T * Math.exp(-k * E);
            resistanceVsLight.points.push({
                x: parseFloat(E.toFixed(3)),
                y: parseFloat(R.toFixed(3))
            });
        }

        // ===== log(R) vs E 曲线 (验证半对数线性) =====
        const logRVsE: ChartSeries = {
            xLabel: '光照度 E (lx)',
            yLabel: 'ln(R) (ln Ohm)',
            xUnit: 'lx',
            yUnit: 'ln Ohm',
            points: []
        };
        for (let i = 0; i <= N; i++) {
            const logE = logEmin + (logEmax - logEmin) * (i / N);
            const E = Math.pow(10, logE);
            const R = R_dark_T * Math.exp(-k * E);
            logRVsE.points.push({
                x: parseFloat(E.toFixed(3)),
                y: parseFloat(Math.log(R).toFixed(4))
            });
        }

        // ===== G-V 特性 (光电流 vs 外加电压, 固定 E0) =====
        // I = V/R0 (欧姆定律, 光电流随电压线性增长, 斜率 = 1/R0)
        const N_v = 100;
        const Vmax = V_test;
        const I_V_Curve: ChartSeries = {
            xLabel: '外加电压 U (V)',
            yLabel: '电流 I (mA)',
            xUnit: 'V',
            yUnit: 'mA',
            points: []
        };
        for (let i = 0; i <= N_v; i++) {
            const v = (Vmax * i) / N_v;
            const i_mA = (v / R0) * 1e3;
            I_V_Curve.points.push({
                x: parseFloat(v.toFixed(3)),
                y: parseFloat(i_mA.toFixed(4))
            });
        }

        // ===== 电阻表 (关键工作点) =====
        // 一系列典型光照下的电阻表 (光敏电阻产品规格常见)
        const tablePoints: Array<{ E: number; R: number; G: number; I: number }> = [];
        const sampleEs = [0, 1, 10, 100, 1000, 10000, 100000];
        for (const E of sampleEs) {
            if (E > Emax) break;
            const R = R_dark_T * Math.exp(-k * E);
            tablePoints.push({ E, R, G: 1 / R, I: V_test / R });
        }

        // ===== 工作点轨迹 (稳定性分析) =====
        // x: 光照度 (噪声起伏), y: 电阻
        const N_noise = 50;
        const operationTraj: TrajectoryPoint[] = [];
        // 模拟 E0 ± 10% 的波动下, 电阻变化与光电流稳定性
        for (let i = 0; i <= N_noise; i++) {
            const ratio = i / N_noise;
            const E_var = E0 * (0.9 + 0.2 * ratio); // 0.9*E0 ~ 1.1*E0
            const R_var = R_dark_T * Math.exp(-k * E_var);
            operationTraj.push({
                t: E_var,
                position: { x: E_var, y: R_var },
                velocity: { x: 1, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            });
        }

        // ===== 关键帧 =====
        const keyframes: Keyframe[] = [
            {
                label: '暗态 (E=0)',
                t: 0,
                position: { x: 0, y: R_dark_T },
                velocity: { x: 0, y: 0 },
                description: `暗电阻 R_dark(T=${T}C)=${R_dark_T.toExponential(2)} Ohm`
            },
            {
                label: `工作点 E=${E0} lx`,
                t: 0,
                position: { x: E0, y: R0 },
                velocity: { x: 1 / R0, y: 0 },
                description: `R=${R0.toExponential(2)} Ohm, G=${G0.toExponential(2)} S, I=${(I0 * 1e3).toFixed(3)} mA @5V, P=${(P0 * 1e3).toFixed(3)} mW`
            },
            {
                label: '强光区 (饱和)',
                t: 0,
                position: { x: Emax, y: R_dark_T * Math.exp(-k * Emax) },
                velocity: { x: 0, y: 0 },
                description: `强光下电阻趋于最小值 ${(R_dark_T * Math.exp(-k * Emax)).toFixed(2)} Ohm`
            }
        ];

        // ===== 警告 =====
        const warnings: string[] = [];
        if (k * E0 > 10) {
            warnings.push(`工作点电阻极小 (${R0.toExponential(2)} Ohm), 注意电流不得超过元件额定值`);
        }
        if (k * E0 < 0.1) {
            warnings.push('工作点电阻接近暗电阻, 建议提高光照度以获得显著电阻变化');
        }
        if (T > 50 || T < -10) {
            warnings.push('工作温度超出常规范围 (-10C ~ 50C), 暗电阻漂移显著');
        }
        if (R_dark_T > 1e7) {
            warnings.push('暗电阻很大, 工作电流可能过小, 需要考虑测量电路输入阻抗');
        }

        // ===== 解释步骤 =====
        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '光电导效应',
                formula: '价带电子吸光子跃迁到导带 -> 载流子增加 -> 电导率上升',
                result: '宏观表现: 电阻 R 随光照度 E 增大而减小'
            },
            {
                order: 2,
                description: '电阻-光照模型',
                formula: 'R(E) = R_dark * exp(-k * E)',
                calculation: `R_dark(T=${T}C)=${R_dark_T.toExponential(2)} Ohm, k=${k} 1/lx`
            },
            {
                order: 3,
                description: '工作点计算',
                formula: 'R = R_dark * exp(-k * E)',
                calculation: `R @ ${E0} lx = ${R_dark_T.toExponential(2)} * exp(-${k} * ${E0}) = ${R0.toExponential(2)} Ohm`
            },
            {
                order: 4,
                description: '应用: 光控开关',
                formula: '比较器阈值: 设定 E_th, E>E_th 时 R<R_th -> 输出低电平 -> 继电器闭合',
                result: `本例: V=5V 时, I=${(I0 * 1e3).toFixed(3)} mA, P=${(P0 * 1e3).toFixed(3)} mW`
            },
            {
                order: 5,
                description: '半对数线性验证',
                formula: 'ln(R) = ln(R_dark) - k * E  -> 斜率 = -k',
                result: 'ln(R) 与 E 成线性关系, 半对数坐标图为直线'
            }
        ];

        return {
            meta: {
                model: 'photoresistor',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [operationTraj],
            keyframes,
            charts: {
                x_t: resistanceVsLight,
                y_t: logRVsE,
                v_t: I_V_Curve
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    darkResistance_Ohm: R_dark,
                    darkResistanceAtT_Ohm: R_dark_T,
                    sensitivityPerLx: k,
                    workLightIntensity_lx: E0,
                    workResistance_Ohm: R0,
                    workConductance_S: G0,
                    workCurrent_mA: I0 * 1e3,
                    workPower_mW: P0 * 1e3,
                    temperatureC: T,
                    // 代表区间的最小电阻
                    minResistanceAtMaxE: R_dark_T * Math.exp(-k * Emax)
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `光敏电阻: R_dark=${R_dark_T.toExponential(2)} Ohm, k=${k} 1/lx, 工作点 E=${E0} lx -> R=${R0.toExponential(2)} Ohm, I(@5V)=${(I0 * 1e3).toFixed(3)} mA`,
                steps,
                formulas: [
                    {
                        name: '电阻-光照',
                        formula: 'R = R_dark * exp(-k * E)',
                        variables: {
                            R_dark: { value: R_dark_T, unit: 'Ohm' },
                            k: { value: k, unit: '1/lx' },
                            E: { value: E0, unit: 'lx' },
                            R: { value: R0, unit: 'Ohm' }
                        }
                    },
                    {
                        name: '欧姆定律 (5V)',
                        formula: 'I = U / R',
                        variables: {
                            U: { value: V_test, unit: 'V' },
                            I: { value: I0, unit: 'A' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

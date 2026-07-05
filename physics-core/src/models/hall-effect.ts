import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 霍尔元件约束 — 选必二 第一章 (霍尔效应)
 *
 * 霍尔效应: 置于磁场中的载流导体, 在垂直于电流和磁场方向产生电势差
 *
 * 公式:
 *   霍尔电压: UH = I * B / (n * q * t) = RH * I * B / t
 *   霍尔系数: RH = 1 / (n * q)
 */
export interface HallEffectConstraint {
  /** 控制电流 I (A) */
  readonly current: number;
  /** 磁感应强度 B (T) */
  readonly magneticField: number;
  /** 载流子浓度 n (个 / m^3), 典型半导体 1e21 ~ 1e24 */
  readonly chargeDensity: number;
  /** 元件厚度 t (m) */
  readonly thickness: number;
  /** 载流子类型: 'electron' (电子, n 型) 或 'hole' (空穴, p 型) */
  readonly carrierType?: 'electron' | 'hole';
}

/**
 * 霍尔元件模型 — 选必二 第一章 (霍尔效应与应用)
 *
 * 霍尔效应: 当电流垂直于外磁场通过半导体时, 载流子受洛伦兹力偏转,
 * 在垂直于电流和磁场的方向形成电荷积累, 产生横向电场力 (霍尔电场).
 * 当电场力与洛伦兹力平衡时:
 *   q * E_H = q * v * B  =>  E_H = v * B
 *   UH = E_H * w (w 为元件宽度)
 *   结合 I = n * q * v * A (A = w * t 为截面积) 得:
 *   UH = I * B / (n * q * t)
 *
 * RH = 1/(n*q) 为霍尔系数, 符号反映载流子类型 (电子为负, 空穴为正)
 *
 * 教学要点:
 *   - UH 正比于 I 和 B
 *   - UH 与厚度 t 成反比 (薄型元件灵敏度高)
 *   - UH 的极性反映半导体类型 (N 型 / P 型)
 *   - 应用: 磁强计、电流传感器、霍尔电机换向
 */
export class HallEffectModel extends PhysicsModelBase {
  readonly name = '霍尔元件';
  readonly version = '1.0.0';
  readonly description = '霍尔效应: UH = I*B/(n*q*t), 霍尔系数 RH = 1/(n*q)';
  readonly modelType = 'hall-effect' as const;
  readonly assumptions = [
    '电流恒定且均匀通过元件',
    '磁场均匀且垂直于电流方向',
    '元件为矩形薄板, 边缘效应忽略',
    '载流子浓度 n 恒定 (弱场, 低注入)',
    '元件宽度远大于厚度, 可视为无限大平板',
  ];
  readonly applicableRange = '电流: 0 ~ 100 A; 磁场: 0 ~ 5 T; 载流子浓度: 1e20 ~ 1e25 m^-3';
  readonly errorSources = [
    '不等位电势 (几何不对称引起零偏)',
    '温漂 (载流子浓度 n 随温度变化)',
    '强场下 RH 的磁阻修正',
    '自热效应 (大电流下元件发热)',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'current', description: '控制电流 I (A)', unit: 'A', required: true, min: 0, max: 100 },
    { name: 'magneticField', description: '磁感应强度 B (T)', unit: 'T', required: true, min: 0, max: 5 },
    { name: 'chargeDensity', description: '载流子浓度 n (m^-3)', unit: 'm^-3', required: true, min: 1e18, max: 1e28 },
    { name: 'thickness', description: '元件厚度 t (m)', unit: 'm', required: true, min: 1e-7, max: 1e-2 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const raw = problem.constraints as unknown as { readonly hallEffect?: HallEffectConstraint } | undefined;
    const c = raw?.hallEffect;
    if (!c) throw new Error('hall-effect 模型需要 hallEffect 约束配置');

    const I = c.current;                       // A
    const B = c.magneticField;               // T
    const n = c.chargeDensity;                // m^-3
    const t = c.thickness;                    // m
    const carrier = c.carrierType ?? 'electron';

    // 元电荷
    const Q_E = 1.602176634e-19;              // C
    // 霍尔系数
    const RH = 1 / (n * Q_E);                 // m^3/C
    // 霍尔极性: 电子为负, 空穴为正
    const polaritySign = carrier === 'hole' ? 1 : -1;
    // 霍尔电压
    const UH_0 = (I * B) / (n * Q_E * t);     // V
    const UH = polaritySign * UH_0;            // 带极性

    // ===== UH vs I 曲线 (B 固定, I 变化) =====
    const Imax = I * 1.2;
    const N_I = 100;
    const UH_vs_I: ChartSeries = {
      xLabel: '电流 I (A)',
      yLabel: '霍尔电压 UH (mV)',
      xUnit: 'A',
      yUnit: 'mV',
      points: [],
    };
    for (let i = 0; i <= N_I; i++) {
      const iVal = (Imax * i) / N_I;
      const uhVal = (iVal * B) / (n * Q_E * t) * polaritySign * 1e3; // mV
      UH_vs_I.points.push({
        x: parseFloat(iVal.toFixed(4)),
        y: parseFloat(uhVal.toFixed(4)),
      });
    }

    // ===== UH vs B 曲线 (I 固定, B 变化) =====
    const Bmax = B * 1.2;
    const N_B = 100;
    const UH_vs_B: ChartSeries = {
      xLabel: '磁感应强度 B (T)',
      yLabel: '霍尔电压 UH (mV)',
      xUnit: 'T',
      yUnit: 'mV',
      points: [],
    };
    for (let i = 0; i <= N_B; i++) {
      const bVal = (Bmax * i) / N_B;
      const uhVal = (I * bVal) / (n * Q_E * t) * polaritySign * 1e3;
      UH_vs_B.points.push({
        x: parseFloat(bVal.toFixed(4)),
        y: parseFloat(uhVal.toFixed(4)),
      });
    }

    // ===== UH vs 厚度 t 曲线 (I, B 固定) =====
    const tMax = t * 3;
    const tMin = t / 100;
    const N_t = 100;
    const UH_vs_t: ChartSeries = {
      xLabel: '厚度 t (mm)',
      yLabel: '霍尔电压 UH (mV)',
      xUnit: 'mm',
      yUnit: 'mV',
      points: [],
    };
    // 对数采样
    const logTmin = Math.log10(tMin);
    const logTmax = Math.log10(tMax);
    for (let i = 0; i <= N_t; i++) {
      const logT = logTmin + (logTmax - logTmin) * (i / N_t);
      const tVal = Math.pow(10, logT);
      const uhVal = (I * B) / (n * Q_E * tVal) * polaritySign * 1e3;
      UH_vs_t.points.push({
        x: parseFloat((tVal * 1e3).toFixed(6)),
        y: parseFloat(uhVal.toFixed(4)),
      });
    }

    // ===== 元件结构示意轨迹 (伪) =====
    const bodyTraj: TrajectoryPoint[] = [];
    const widthM = 0.01; // 假设元件宽度 1 cm
    const Nbody = 50;
    // 载流子在元件截面内的分布示意 (x 为电流方向, y 为宽度方向)
    for (let i = 0; i <= Nbody; i++) {
      const ratio = i / Nbody;
      // 电流沿+x, 霍尔电压沿+y (假设电子, 极性使下表面为正)
      bodyTraj.push({
        t: ratio * 1e-6, // 伪时间
        position: { x: ratio * widthM * 100, y: carrier === 'electron' ? -ratio * 0.01 : ratio * 0.01 },
        velocity: { x: 1, y: 0 }, // 电流方向
        kineticEnergy: 0,
        potentialEnergy: 0,
      });
    }

    // ===== 关键帧 =====
    const keyframes: Keyframe[] = [
      {
        label: '零场 (B=0)',
        t: 0,
        position: { x: I, y: 0 },
        velocity: { x: 0, y: 0 },
        description: 'B=0 时 UH=0, 仅有不等位电势 (理想情况为 0)',
      },
      {
        label: '平衡态 (qEH = qvB)',
        t: 0,
        position: { x: I, y: B },
        velocity: { x: 0, y: UH * 1e3 },
        description: `平衡时霍尔电场力 = 洛伦兹力, UH=${(UH * 1e3).toFixed(3)} mV, B=${B} T, I=${I} A`,
      },
    ];

    // ===== 载流子类型判定 (极性) =====
    const carrierTraj: TrajectoryPoint[] = [
      {
        t: 0,
        position: { x: 0, y: polaritySign > 0 ? 1 : -1 },
        velocity: { x: 1, y: 0 },
        kineticEnergy: 0,
        potentialEnergy: 0,
      },
    ];

    // ===== 警告 =====
    const warnings: string[] = [];
    if (I * B / (n * Q_E * t) > 1) {
      warnings.push('霍尔电压 > 1 V, 大信号状态下需注意自热功耗');
    }
    if (n < 1e18) {
      warnings.push('载流子浓度过低, 可能为高阻材料, 需考虑漏电流');
    }
    if (t > 1e-3) {
      warnings.push('元件较厚, 霍尔电压较小, 建议减薄以提高灵敏度');
    }
    if (B > 3) {
      warnings.push('强磁场工作, 需考虑磁阻修正');
    }

    // ===== 解释步骤 =====
    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '洛伦兹力使载流子偏转',
        formula: 'F_L = q * v * B (方向由左手定则判断, 注意电子 q<0)',
        result: carrier === 'electron' ? '电子偏转到下表面 (q<0, 与正电荷相反)' : '空穴偏转到下表面',
      },
      {
        order: 2,
        description: '电荷积累形成霍尔电场',
        formula: 'E_H = v * B (平衡时 q*E_H = q*v*B)',
        calculation: `v = I / (n*q*A), A = w*t (w = 元件宽度)`,
      },
      {
        order: 3,
        description: '霍尔电压公式',
        formula: 'UH = I*B / (n*q*t) = RH * I * B / t',
        calculation: `RH=${RH.toExponential(3)} m^3/C, UH=${(UH * 1e3).toFixed(3)} mV`,
      },
      {
        order: 4,
        description: '极性判断 (N 型 / P 型)',
        formula: 'UH 符号由载流子电荷符号决定',
        result: `载流子: ${carrier}, 极性: ${polaritySign > 0 ? '正 (p 型 / 空穴)' : '负 (n 型 / 电子)'}`,
      },
    ];

    return {
      meta: {
        model: 'hall-effect',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [bodyTraj, carrierTraj],
      keyframes,
      charts: {
        x_t: UH_vs_I,
        y_t: UH_vs_B,
        v_t: UH_vs_t,
      },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          hallVoltage_mV: parseFloat((UH * 1e3).toFixed(4)),
          hallVoltageAbs_mV: parseFloat((UH_0 * 1e3).toFixed(4)),
          hallCoefficient: RH,
          chargeDensity_m3: n,
          thickness_m: t,
          current_A: I,
          magneticField_T: B,
          polaritySign,
        },
        rangeCheck: { withinRange: warnings.length === 0, warnings },
      },
      explanation: {
        summary: `霍尔效应: I=${I} A, B=${B} T, n=${n.toExponential(2)} m^-3, t=${t * 1e3} mm, UH=${(UH * 1e3).toFixed(3)} mV (${carrier}, RH=${RH.toExponential(2)} m^3/C)`,
        steps,
        formulas: [
          {
            name: '霍尔电压',
            formula: 'UH = I*B / (n*q*t)',
            variables: {
              I: { value: I, unit: 'A' },
              B: { value: B, unit: 'T' },
              n: { value: n, unit: 'm^-3' },
              q: { value: Q_E, unit: 'C' },
              t: { value: t, unit: 'm' },
              UH: { value: UH, unit: 'V' },
            },
          },
          {
            name: '霍尔系数',
            formula: 'RH = 1 / (n*q)',
            variables: {
              n: { value: n, unit: 'm^-3' },
              q: { value: Q_E, unit: 'C' },
              RH: { value: RH, unit: 'm^3/C' },
            },
          },
        ],
      },
      errors: [],
      warnings,
    };
  }
}

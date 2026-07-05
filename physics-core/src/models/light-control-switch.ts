import { PhysicsModelBase } from './base.js';
import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep, FormulaUsage } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';

/**
 * 光控开关约束 — 选必二 传感器 (光敏电阻 + 三极管 + 继电器)
 *
 * 物理原理:
 *   光敏电阻 (LDR / CdS 光导管):
 *     - 光照强度 L ↑ → 光敏电阻 R_LDR ↓ (半导体光电导效应)
 *     - 典型: 白天 R_LDR ≈ 1~10 kΩ, 夜晚 R_LDR ≈ 1~10 MΩ
 *
 *   分压电路:
 *     V_B = E · R_LDR / (R_LDR + R_fix)
 *     - 白天: R_LDR 小 → V_B 低 → 三极管截止 → 继电器释放 → 灯灭
 *     - 夜晚: R_LDR 大 → V_B 高 → 三极管导通 → 继电器吸合 → 灯亮
 *
 *   注: 实际路灯控制逻辑是 "天黑 → 灯亮", 与上述一致
 *
 * 参数:
 *   - lightIntensity: 光照强度 (lux), 白天 10000~100000 lux, 夜晚 0.001~1 lux
 *   - threshold: 触发阈值 (lux), 默认 10 lux
 *   - Rfix: 分压电阻 (Ω), 默认 10 kΩ
 *   - Esupply: 电源电压 (V), 默认 12 V
 *   - Vbe_on: 三极管导通阈值 (V), 默认 0.7 V
 */
export interface LightControlSwitchConstraint {
  /** 当前光照强度 (lux) */
  lightIntensity: number;
  /** 触发阈值 (lux), 默认 10 */
  threshold?: number;
  /** 分压电阻 R_fix (Ω), 默认 10000 */
  Rfix?: number;
  /** 电源电压 (V), 默认 12 */
  Esupply?: number;
  /** 三极管导通阈值 Vbe (V), 默认 0.7 */
  VbeOn?: number;
  /** 光敏电阻暗电阻 (Ω), 默认 1e6 */
  Rdark?: number;
  /** 光敏电阻亮电阻 (Ω), 默认 5e3 */
  Rbright?: number;
  /** 时间扫描范围 (h), 默认 24 */
  timeSpanH?: number;
  /** 采样点数, 默认 240 */
  sampleCount?: number;
}

/**
 * 光控开关模型 — 选必二 传感器 (光敏电阻 + 三极管驱动 + 继电器)
 *
 * 教学要点:
 *   1. 光敏电阻: 光照强度 → 电阻值 (非线性, 近似 R ∝ L^(-gamma))
 *   2. 分压电路: 将 R 变化 → V_B 变化
 *   3. 三极管开关: V_B > Vbe_on → 导通 → 继电器线圈得电
 *   4. 继电器: 小电流控制大电流负载 (路灯)
 *
 * 应用场景:
 *   - 路灯自动开关
 *   - 楼道声光控延时灯
 *   - 光控窗帘
 */
export class LightControlSwitchModel extends PhysicsModelBase {
  readonly name = '光控开关';
  readonly version = '1.0.0';
  readonly description = '光敏电阻 + 分压 + 三极管驱动 + 继电器 光控开关原理';
  readonly modelType = 'light-control-switch' as const;
  readonly assumptions = [
    '光敏电阻 R 与光照 L 关系: R = R_dark * (L / L_ref)^(-gamma), gamma≈0.7',
    '三极管为理想开关: V_B > Vbe_on → 饱和导通; V_B < Vbe_on → 截止',
    '继电器吸合电压 = 线圈额定电压, 无回差',
    '光照强度随时间按余弦规律变化 (模拟日夜交替)',
  ];
  readonly applicableRange = '光照: 0.001~100000 lux; 阈值: 0.1~1000 lux; 电源: 5~24 V';
  readonly errorSources = [
    '光敏电阻响应延迟 (CdS 约 100 ms)',
    '温度对暗电阻影响大',
    '灰尘/老化导致灵敏度下降',
    '三极管漏电流导致弱光下误触发',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'lightIntensity', description: '光照强度 (lux)', unit: 'lux', required: true, min: 0.0001, max: 200000 },
    { name: 'threshold', description: '触发阈值 (lux)', unit: 'lux', required: false, min: 0.01, max: 10000 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const cc = problem.constraints as unknown as { lightControlSwitch?: LightControlSwitchConstraint } | undefined;
    const ic = cc?.lightControlSwitch;
    if (!ic) throw new Error('light-control-switch 模型需要 lightControlSwitch 约束配置');

    const L = ic.lightIntensity;
    const threshold = ic.threshold ?? 10;
    const Rfix = ic.Rfix ?? 10000;
    const E = ic.Esupply ?? 12;
    const VbeOn = ic.VbeOn ?? 0.7;
    const Rdark = ic.Rdark ?? 1e6;
    const Rbright = ic.Rbright ?? 5000;
    const timeSpanH = ic.timeSpanH ?? 24;
    const sampleCount = ic.sampleCount ?? 240;

    // — 光敏电阻 R_LDR 计算 (幂律模型) —
    const gamma = 0.7;
    const Lref = 1;  // 参考光照 1 lux
    const rLdr = Rdark * Math.pow(L / Lref, -gamma);
    // — 分压 V_B —
    const vB = E * rLdr / (rLdr + Rfix);
    // — 三极管状态 —
    const transistorOn = vB >= VbeOn;
    // — 继电器吸合 —
    const relayEngaged = transistorOn;
    // — 灯亮 —
    const lightOn = relayEngaged;

    // — 图1: 光照强度 vs 时间 (模拟 24h 变化) —
    const lightVsTime: ChartSeries = {
      xLabel: '时间 t (h)', yLabel: '光照强度 L (lux)', xUnit: 'h', yUnit: 'lux',
      points: [],
    };
    // 光照模型: 白天 12h 正弦, 夜晚 0.1 lux
    for (let i = 0; i <= sampleCount; i++) {
      const t = (timeSpanH * i) / sampleCount;
      // 6:00~18:00 白天, 18:00~次日6:00 夜晚
      let Lval: number;
      if (t >= 6 && t <= 18) {
        const phase = (t - 6) / 12 * Math.PI; // 0~π
        Lval = 50000 * Math.sin(phase) + 100;   // 峰值 50100 lux
      } else {
        Lval = 0.5;  // 夜晚
      }
      lightVsTime.points.push({
        x: parseFloat(t.toFixed(2)),
        y: parseFloat(Lval.toFixed(2)),
      });
    }

    // — 图2: 开关状态 vs 时间 —
    const switchStateVsTime: ChartSeries = {
      xLabel: '时间 t (h)', yLabel: '开关状态 (1=灯亮, 0=灯灭)', xUnit: 'h', yUnit: '',
      points: [],
    };
    for (let i = 0; i <= sampleCount; i++) {
      const t = (timeSpanH * i) / sampleCount;
      let Lval: number;
      if (t >= 6 && t <= 18) {
        const phase = (t - 6) / 12 * Math.PI;
        Lval = 50000 * Math.sin(phase) + 100;
      } else {
        Lval = 0.5;
      }
      const r = Rdark * Math.pow(Lval / Lref, -gamma);
      const v = E * r / (r + Rfix);
      const on = v >= VbeOn ? 1 : 0;
      switchStateVsTime.points.push({
        x: parseFloat(t.toFixed(2)),
        y: on,
      });
    }

    // — 图3: 三极管基极电流 vs 光照 —
    const transistorCurrentVsLight: ChartSeries = {
      xLabel: '光照强度 L (lux)', yLabel: '基极电流 I_B (μA)', xUnit: 'lux', yUnit: 'μA',
      points: [],
    };
    const lMin = 0.01;
    const lMax = 100000;
    for (let i = 0; i <= 100; i++) {
      const Lval = lMin * Math.pow(lMax / lMin, i / 100);
      const r = Rdark * Math.pow(Lval / Lref, -gamma);
      const v = E * r / (r + Rfix);
      const iB = v >= VbeOn ? (v - VbeOn) / 1000 * 1e6 : 0;  // μA (假设基极电阻 1k)
      transistorCurrentVsLight.points.push({
        x: parseFloat(Lval.toFixed(4)),
        y: parseFloat(iB.toFixed(4)),
      });
    }

    // — 关键点 —
    const keyframes: Keyframe[] = [
      {
        label: '当前状态',
        t: 0,
        position: { x: L, y: lightOn ? 1 : 0 },
        velocity: { x: 0, y: 0 },
        description: `光照=${L}lux, R_LDR=${rLdr.toFixed(0)}Ω, V_B=${vB.toFixed(3)}V, 三极管=${transistorOn ? '导通' : '截止'}, 灯=${lightOn ? '亮' : '灭'}`,
      },
      {
        label: '阈值点',
        t: 0,
        position: { x: threshold, y: 0.5 },
        velocity: { x: 0, y: 0 },
        description: `阈值=${threshold}lux, 超过此值三极管状态翻转, 灯状态切换`,
      },
      {
        label: '白天典型',
        t: 0,
        position: { x: 50000, y: 0 },
        velocity: { x: 0, y: 0 },
        description: '白天光照强 → R_LDR 小 → V_B 低 → 三极管截止 → 灯灭',
      },
      {
        label: '夜晚典型',
        t: 0,
        position: { x: 0.5, y: 1 },
        velocity: { x: 0, y: 0 },
        description: '夜晚光照弱 → R_LDR 大 → V_B 高 → 三极管导通 → 灯亮',
      },
    ];

    // — 轨迹 (L 为 x, 灯状态为 y) —
    const trajectory: TrajectoryPoint[] = [];
    for (let i = 0; i <= 100; i++) {
      const Lval = lMin * Math.pow(lMax / lMin, i / 100);
      const r = Rdark * Math.pow(Lval / Lref, -gamma);
      const v = E * r / (r + Rfix);
      const on = v >= VbeOn ? 1 : 0;
      trajectory.push({
        t: 0,
        position: { x: Lval, y: on },
        velocity: { x: 0, y: 0 },
      });
    }

    const warnings: string[] = [];
    if (L < 0.001) warnings.push('光照强度极低, 可能低于传感器下限');
    if (L > 150000) warnings.push('光照强度极高, 可能超出传感器量程');
    if (threshold < 0.1) warnings.push('阈值过低, 易受杂散光干扰');
    if (threshold > 1000) warnings.push('阈值过高, 可能导致白天误亮灯');
    if (rLdr < 100) warnings.push('光敏电阻过小, 可能已损坏或过曝');

    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '光敏电阻特性',
        formula: 'R_LDR = R_dark · (L / L_ref)^(-γ), γ≈0.7',
        calculation: `R_LDR = ${Rdark} × (${L} / 1)^(-0.7) = ${rLdr.toFixed(0)}Ω`,
        result: '光照越强 → R_LDR 越小 (负光电导特性)',
      },
      {
        order: 2,
        description: '分压电路求基极电压',
        formula: 'V_B = E · R_LDR / (R_LDR + R_fix)',
        calculation: `V_B = ${E} × ${rLdr.toFixed(0)} / (${rLdr.toFixed(0)} + ${Rfix}) = ${vB.toFixed(3)}V`,
        result: `V_B=${vB.toFixed(3)}V ${vB >= VbeOn ? '≥' : '<'} Vbe_on=${VbeOn}V`,
      },
      {
        order: 3,
        description: '三极管开关判定',
        formula: 'V_B ≥ Vbe_on → BJT 饱和导通 → 继电器线圈得电 → 灯亮',
        calculation: `V_B=${vB.toFixed(3)}V ${transistorOn ? '≥' : '<'} ${VbeOn}V → 三极管${transistorOn ? '导通' : '截止'} → 灯${lightOn ? '亮' : '灭'}`,
      },
      {
        order: 4,
        description: '应用说明',
        formula: '路灯自动控制: 天黑 → 灯亮; 天亮 → 灯灭',
        result: '光控开关 = 光敏传感器 + 比较/驱动电路 + 执行机构 (继电器+灯)',
      },
    ];

    const formulas: FormulaUsage[] = [
      {
        name: '光敏电阻',
        formula: 'R_LDR = R_dark * (L / L_ref)^(-gamma)',
        variables: {
          R_dark: { value: Rdark, unit: 'Ω' },
          L: { value: L, unit: 'lux' },
          L_ref: { value: Lref, unit: 'lux' },
          gamma: { value: gamma, unit: '' },
          R_LDR: { value: parseFloat(rLdr.toFixed(0)), unit: 'Ω' },
        },
      },
      {
        name: '分压电路',
        formula: 'V_B = E * R_LDR / (R_LDR + R_fix)',
        variables: {
          E: { value: E, unit: 'V' },
          R_LDR: { value: parseFloat(rLdr.toFixed(0)), unit: 'Ω' },
          R_fix: { value: Rfix, unit: 'Ω' },
          V_B: { value: parseFloat(vB.toFixed(3)), unit: 'V' },
        },
      },
      {
        name: '三极管开关',
        formula: 'BJT_ON = (V_B >= Vbe_on)',
        variables: {
          V_B: { value: parseFloat(vB.toFixed(3)), unit: 'V' },
          Vbe_on: { value: VbeOn, unit: 'V' },
          BJT_ON: { value: transistorOn ? 1 : 0, unit: '1=导通' },
          light: { value: lightOn ? 1 : 0, unit: '1=灯亮' },
        },
      },
    ];

    return {
      meta: {
        model: 'light-control-switch',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: {
        'x_t': lightVsTime,
        'y_t': switchStateVsTime,
        'v_t': transistorCurrentVsLight,
      },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          lightIntensity: L,
          threshold,
          rLdr,
          vB,
          transistorOnFlag: transistorOn ? 1 : 0,
          relayEngagedFlag: relayEngaged ? 1 : 0,
          lightOnFlag: lightOn ? 1 : 0,
          Rdark,
          Rbright,
          Rfix,
          Esupply: E,
          VbeOn,
        },
        rangeCheck: { withinRange: warnings.length === 0, warnings },
      },
      explanation: {
        summary: `光控开关: L=${L}lux, R_LDR=${rLdr.toFixed(0)}Ω, V_B=${vB.toFixed(3)}V, 三极管=${transistorOn ? '导通' : '截止'}, 灯=${lightOn ? '亮' : '灭'}`,
        steps,
        formulas,
      },
      errors: [],
      warnings,
    };
  }

  validate(problem: PhysicsProblem): ReturnType<PhysicsModelBase['validate']> {
    return { valid: true, errors: [], warnings: [] };
  }

}

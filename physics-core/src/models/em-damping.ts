import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ConservedQuantity, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 电磁阻尼 / 电磁驱动模型 (选必二第一章 §4)
 *
 * 导体在磁场中运动 (或磁场变化) 时，感生涡流受到安培力阻碍相对运动：
 *
 * 电磁阻尼:
 *   导体棒以角速度 omega 在磁场 B 中转动
 *   阻尼力矩: tau = -k * B^2 * omega  (k 与导体几何、电阻率相关)
 *   运动方程: J * domega/dt = -k * B^2 * omega
 *   => omega(t) = omega_0 * exp(-k * B^2 * t / J)
 *
 * 电磁驱动:
 *   磁场以角速度 omega_0 旋转，带动导体盘跟随
 *   驱动力矩: tau = k * B^2 * (omega_0 - omega)  (滑动差速)
 *   运动方程: J * domega/dt = k * B^2 * (omega_0 - omega)
 *   => omega(t) = omega_0 * (1 - exp(-k * B^2 * t / J))
 */
export class EMDampingModel extends PhysicsModelBase {
  readonly name = '电磁阻尼/驱动';
  readonly version = '1.0.0';
  readonly description = '电磁阻尼 (涡流转矩衰减) 与电磁驱动 (异步加速)';
  readonly modelType = 'em-damping';
  readonly assumptions = [
    '匀强磁场，B 恒定',
    '导体电导率均匀、各向同性',
    '磁路不饱和，mu≈mu_0',
    'J (转动惯量) 恒定，无外部机械负载',
    '一维旋转方程适用',
  ];
  readonly applicableRange = 'B = 0.01-2 T; omega_0 = 0-1000 rad/s; J = 1e-6-1 kg·m^2';
  readonly errorSources = [
    '磁场非均匀导致力矩计算偏差',
    '电导率随温度变化导致 k 不稳定',
    '机械摩擦力矩未计入',
    '高频时位移电流、自感效应',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'mode', description: '模式: damping 或 drive', unit: '', required: true },
    { name: 'magneticField', description: '磁感应强度 B (T)', unit: 'T', required: true, min: 0, max: 5 },
    { name: 'angularSpeed', description: '角速度 omega_0 (rad/s)', unit: 'rad/s', required: true, min: 0, max: 5000 },
    { name: 'conductivity', description: '电导率 sigma (S/m)', unit: 'S/m', required: true, min: 1e3, max: 1e8 },
    { name: 'inertia', description: '转动惯量 J (kg·m^2)', unit: 'kg·m^2', required: true, min: 1e-9, max: 100 },
    { name: 'radius', description: '导体盘半径 R (m)', unit: 'm', required: false, min: 0, max: 10 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const emd = problem.constraints?.emDamping;
    if (!emd) throw new Error('emDamping 模型需要 emDamping 约束配置');

    const mode = emd.mode;
    if (mode !== 'damping' && mode !== 'drive') {
      throw new Error(`emDamping 模式必须是 'damping' 或 'drive'，收到: ${mode}`);
    }

    const B = emd.magneticField;        // T
    if (B <= 0) throw new Error('磁感应强度 B 必须为正');

    const omega0 = emd.angularSpeed;    // rad/s
    if (omega0 < 0) throw new Error('角速度 angularSpeed 不能为负');

    const sigma = emd.conductivity;     // S/m
    if (sigma <= 0) throw new Error('电导率 conductivity 必须为正');

    const J = emd.inertia ?? 0.01;      // kg·m^2
    if (J <= 0) throw new Error('转动惯量 inertia 必须为正');

    const R = ((emd as unknown as Record<string, unknown>).radius as number) ?? 0.1; // m

    // 涡流力矩系数 k (简化): k ∝ sigma * R^4 / 2
    // 量纲: [k] = N·m·s = kg·m^2/s
    const k = 0.5 * sigma * Math.pow(R, 4); // 简化比例系数

    // 特征时间常数 tau_c = J / (k * B^2)
    const tauC = J / (k * B * B + 1e-30); // s

    const sampleCount = problem.timeConfig.sampleCount ?? 500;
    const duration = problem.timeConfig.duration;
    const dt = duration / sampleCount;

    // 时间轨迹
    const trajectory: TrajectoryPoint[] = [];
    let omegaMax = 0;
    for (let i = 0; i <= sampleCount; i++) {
      const t = i * dt;
      let omega: number;
      if (mode === 'damping') {
        // omega(t) = omega_0 * exp(-t/tau_c)
        omega = omega0 * Math.exp(-t / tauC);
      } else {
        // drive: omega(t) = omega_0 * (1 - exp(-t/tau_c))
        omega = omega0 * (1 - Math.exp(-t / tauC));
      }
      omegaMax = Math.max(omegaMax, Math.abs(omega));
      trajectory.push({
        t,
        position: { x: t, y: omega },   // x: time (s), y: angular velocity (rad/s)
        velocity: { x: 1, y: 0 },
        acceleration: { x: 0, y: 0 },
        kineticEnergy: 0.5 * J * omega * omega,
        potentialEnergy: 0,
      });
    }

    // 图表: 角速度 vs 时间
    const angularVelocityVsTime: ChartSeries = {
      xLabel: '时间 t (s)',
      yLabel: '角速度 omega (rad/s)',
      xUnit: 's',
      yUnit: 'rad/s',
      points: trajectory.map((p) => ({
        x: parseFloat(p.t.toFixed(4)),
        y: parseFloat(p.position.y.toFixed(4)),
      })),
    };

    // 关键帧
    const keyframes: Keyframe[] = [
      {
        label: '初始时刻',
        t: 0,
        position: { x: 0, y: mode === 'damping' ? omega0 : 0 },
        velocity: { x: 0, y: 0 },
        description: mode === 'damping'
          ? `omega_0=${omega0.toFixed(2)}rad/s, tau_c=${tauC.toFixed(4)}s, B=${B}T`
          : `omega_target=${omega0.toFixed(2)}rad/s, tau_c=${tauC.toFixed(4)}s, B=${B}T`,
      },
      {
        label: '1倍时间常数',
        t: tauC,
        position: { x: tauC, y: mode === 'damping' ? omega0 / Math.E : omega0 * (1 - 1 / Math.E) },
        velocity: { x: 0, y: 0 },
        description: mode === 'damping'
          ? `omega=${(omega0 / Math.E).toFixed(3)}rad/s (衰减到 36.8%)`
          : `omega=${(omega0 * (1 - 1 / Math.E)).toFixed(3)}rad/s (达到 63.2%)`,
      },
      {
        label: '5倍时间常数 (稳态)',
        t: 5 * tauC,
        position: { x: 5 * tauC, y: mode === 'damping' ? omega0 * Math.exp(-5) : omega0 * (1 - Math.exp(-5)) },
        velocity: { x: 0, y: 0 },
        description: mode === 'damping'
          ? `omega≈${(omega0 * Math.exp(-5)).toFixed(4)}rad/s (衰减到 0.7%)`
          : `omega≈${(omega0 * (1 - Math.exp(-5))).toFixed(4)}rad/s (达到 99.3%)`,
      },
    ];

    const warnings: string[] = [];
    if (tauC < 0.01) {
      warnings.push(`时间常数 tau_c=${tauC.toFixed(4)}s 极小，系统响应极快`);
    }
    if (tauC > duration) {
      warnings.push(`时间常数 tau_c=${tauC.toFixed(2)}s 大于模拟时长 ${duration}s，过程未达稳态`);
    }
    if (mode === 'damping' && omega0 * 0.5 * J > 100) {
      warnings.push('初始转动动能较大，涡流产热显著');
    }

    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '涡流力矩系数',
        formula: 'k ∝ sigma * R^4',
        calculation: `k = 0.5 × ${sigma} × ${R}^4 = ${k.toExponential(3)} (比例系数)`,
      },
      {
        order: 2,
        description: '特征时间常数',
        formula: 'tau_c = J / (k * B^2)',
        calculation: `tau_c = ${J} / (${k.toExponential(3)} × ${B}^2) = ${tauC.toFixed(4)} s`,
      },
      {
        order: 3,
        description: mode === 'damping' ? '阻尼衰减' : '驱动加速',
        formula: mode === 'damping'
          ? 'omega(t) = omega_0 * exp(-t/tau_c)'
          : 'omega(t) = omega_0 * (1 - exp(-t/tau_c))',
        calculation: mode === 'damping'
          ? `omega(t) = ${omega0} * exp(-t/${tauC.toFixed(4)})`
          : `omega(t) = ${omega0} * (1 - exp(-t/${tauC.toFixed(4)}))`,
      },
      {
        order: 4,
        description: '结论',
        formula: mode === 'damping'
          ? '5*tau_c 后 omega < 1% omega_0'
          : '5*tau_c 后 omega > 99% omega_0',
        result: mode === 'damping'
          ? `阻尼衰减: tau_c=${tauC.toFixed(4)}s, 5tau_c=${(5 * tauC).toFixed(3)}s 后接近停止`
          : `驱动加速: tau_c=${tauC.toFixed(4)}s, 5tau_c=${(5 * tauC).toFixed(3)}s 后接近同步`,
      },
    ];

    const conservedQuantities: ConservedQuantity[] = [];

    return {
      meta: {
        model: 'em-damping',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: {
        angular_velocity_vs_time: angularVelocityVsTime,
      },
      diagnostics: {
        conservedQuantities,
        maxValues: {
          omega0_rad_s: omega0,
          tauC_s: tauC,
          omegaMax_rad_s: omegaMax,
          k_coefficient: k,
          magneticField_T: B,
          inertia_J: J,
          conductivity_S_per_m: sigma,
          radius_m: R,
        },
        rangeCheck: { withinRange: warnings.length === 0, warnings },
      },
      explanation: {
        summary: `${mode === 'damping' ? '电磁阻尼' : '电磁驱动'}: B=${B}T, omega_0=${omega0}rad/s, J=${J}kg·m^2, tau_c=${tauC.toFixed(4)}s`,
        steps,
        formulas: [
          { name: '时间常数', formula: 'tau_c = J/(k*B^2)', variables: { J: { value: J, unit: 'kg·m^2' }, k: { value: k, unit: '' }, B: { value: B, unit: 'T' }, tau_c: { value: tauC, unit: 's' } } },
          { name: mode === 'damping' ? '阻尼方程' : '驱动方程', formula: mode === 'damping' ? 'omega=omega_0*exp(-t/tau_c)' : 'omega=omega_0*(1-exp(-t/tau_c))', variables: { omega_0: { value: omega0, unit: 'rad/s' }, tau_c: { value: tauC, unit: 's' } } },
        ],
      },
      errors: [],
      warnings,
    };
  }
}

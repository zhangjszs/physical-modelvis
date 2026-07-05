import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 能量守恒与转化模型 — 摆、发电机、光伏电池
 *
 * 三种典型能量转化演示情境:
 *   - 单摆:        势能 ↔ 动能 (忽略阻尼 / 设阻尼参数 efficiency 加以损耗)
 *   - 发电机:      机械能 → 电能 (效率 η < 1)
 *   - 光伏电池:    光能 → 电能 (效率 η ≈ 0.20, 单晶硅)
 *
 * 能量守恒:
 *   - 输入能量 Ein = Eout + Eloss
 *   - 转化效率 η = Eout / Ein
 *
 * 本模型:
 *   - x_t = 能量柱状图 (Ein, E_out, E_loss)
 *   - y_t = 能量流转桑基近似 (source → sink list)
 *   - v_t = 效率 η 随输入变化的曲线
 */

export interface EnergyTransformationConstraint {
  /** 实验模式 */
  readonly mode: 'pendulum' | 'generator' | 'photovoltaic';
  /** 输入能量 (J) */
  readonly inputEnergy: number;
  /** 转化效率 (0~1, 默认 0.85) */
  readonly efficiency?: number;
  /** 摆长 (m, 仅 pendulum), 默认 1 */
  readonly length?: number;
}


export class EnergyTransformationModel extends PhysicsModelBase {
  readonly name = '能量守恒与转化';
  readonly version = '1.0.0';
  readonly description = '三种能量转化 (摆 / 发电机 / 光伏) 的能量柱 + 效率曲线';
  readonly modelType = 'energy-transformation' as const;
  readonly assumptions = [
    '输入能量全部按要求路径传递, 不存在其他耗散路径',
    '单摆模式下阻尼系数 ≈ 1-η (抽象)',
    '发电机模式机械功率完全给出 (效率恒定)',
    '光伏电池单结, 典型效率 20%',
  ];
  readonly applicableRange = '输入能量 0.1~1e6 J, 效率 0~1';
  readonly errorSources = [
    '单摆阻尼并非严格比例于能量损失 (空气阻力与速度非线性)',
    '发电机实际效率随负载变化',
    '光伏电池效率随光强/光谱变化',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'mode', description: '实验模式 (pendulum / generator / photovoltaic)', unit: '', required: true },
    { name: 'inputEnergy', description: '输入能量 (J)', unit: 'J', required: true, min: 0.01, max: 1e7 },
    { name: 'efficiency', description: '转化效率 (0~1)', unit: '', required: false, defaultValue: 0.85, min: 0, max: 1 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const c = problem.constraints?.energyTransformation;
    if (!c) {
      throw new Error('energy-transformation 模型需要 constraints.energyTransformation 配置');
    }

    const Ein = c.inputEnergy;
    const eta = c.efficiency ?? 0.85;
    const Eout = Ein * eta;
    const Eloss = Ein - Eout;

    /* ---------- x_t = 能量柱状 (输入/输出/损耗) ---------- */
    const barChart: ChartSeries = {
      xLabel: '能量环节',
      yLabel: '能量 (J)',
      xUnit: '',
      yUnit: 'J',
      points: [
        { x: 1, y: parseFloat(Ein.toFixed(3)) },
        { x: 2, y: parseFloat(Eout.toFixed(3)) },
        { x: 3, y: parseFloat(Eloss.toFixed(3)) },
      ],
    };

    /* ---------- y_t = 能量流转 (桑基近似) ---------- */
    const flowChart: ChartSeries = {
      xLabel: '能量形式',
      yLabel: '转变后能量 (J)',
      xUnit: '',
      yUnit: 'J',
      points: [
        { x: 1, y: parseFloat((Ein * 0.5).toFixed(3)) },
        { x: 2, y: parseFloat((Ein * (1 - eta) * 0.3).toFixed(3)) },
        { x: 3, y: parseFloat((Ein * (1 - eta) * 0.7).toFixed(3)) },
      ],
    };

    /* ---------- v_t = 效率 η 随输入变化曲线 (模式不同特征不同) ---------- */
    const effCurve: ChartSeries = {
      xLabel: '输入能量 (J)',
      yLabel: '效率 η',
      xUnit: 'J',
      yUnit: '',
      points: [],
    };
    const N_eff = 25;
    for (let i = 1; i <= N_eff; i++) {
      const Ein_i = (i / N_eff) * Math.max(Ein, 100);
      let eta_i: number;
      if (c.mode === 'pendulum') {
        /* 单摆: 高能量对应大幅摆动, 空气阻力 ~ v², 效率略低 */
        eta_i = Math.max(0.1, eta - 0.05 * Math.log10(1 + Ein_i / 10));
      } else if (c.mode === 'generator') {
        /* 发电机: 高效率平台 */
        eta_i = Math.min(0.98, 0.70 + 0.30 * (1 - Math.exp(-Ein_i / 500)));
      } else {
        /* 光伏: 弱光效率高 (Shockley-Queisser 简化), 强光略降 */
        eta_i = 0.22 - 0.02 * Math.log10(1 + Ein_i / 1000);
      }
      effCurve.points.push({ x: parseFloat(Ein_i.toFixed(3)), y: parseFloat(eta_i.toFixed(4)) });
    }

    /* ---------- 模式具体解释 ---------- */
    const modeZh = c.mode === 'pendulum' ? '单摆' : c.mode === 'generator' ? '发电机' : '光伏电池';
    const sourceZh = c.mode === 'pendulum' ? '重力势能' : c.mode === 'generator' ? '机械能' : '光能';
    const sinkZh = c.mode === 'pendulum' ? '动能 ↔ 内能' : c.mode === 'generator' ? '电能' : '电能';
    const lossZh = c.mode === 'pendulum' ? '空气阻力散热' : c.mode === 'generator' ? '线圈/铁损' : '热化 + 反射';

    const keyframes: Keyframe[] = [
      {
        label: '输入',
        t: 0,
        position: { x: 1, y: Ein },
        velocity: { x: 0, y: 0 },
        description: `${sourceZh} Ein = ${Ein.toFixed(2)}J`,
      },
      {
        label: '输出',
        t: 0,
        position: { x: 2, y: Eout },
        velocity: { x: 0, y: 0 },
        description: `${sinkZh} Eout = ${Eout.toFixed(2)}J (η=${eta.toFixed(3)})`,
      },
      {
        label: '损耗',
        t: 0,
        position: { x: 3, y: Eloss },
        velocity: { x: 0, y: 0 },
        description: `${lossZh} Eloss = ${Eloss.toFixed(2)}J`,
      },
    ];

    /* ---------- 示意轨迹 ---------- */
    const trajectory: TrajectoryPoint[] = [
      { t: 0, position: { x: 1, y: Ein }, velocity: { x: 0, y: 0 }, kineticEnergy: Ein, potentialEnergy: 0 },
      { t: 0, position: { x: 2, y: Eout }, velocity: { x: 0, y: 0 }, kineticEnergy: Eout, potentialEnergy: 0 },
    ];

    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '模式说明',
        result: `${modeZh} (${sourceZh} → ${sinkZh})`,
      },
      {
        order: 2,
        description: '能量守恒',
        formula: 'Ein = Eout + Eloss',
        calculation: `${Ein.toFixed(2)} = ${Eout.toFixed(2)} + ${Eloss.toFixed(2)}`,
      },
      {
        order: 3,
        description: '转化效率',
        formula: 'η = Eout / Ein',
        calculation: `η = ${(eta * 100).toFixed(1)}%`,
      },
    ];

    const warnings: string[] = [];
    if (eta > 0.99 && c.mode !== 'pendulum') warnings.push('效率 99% 以上在近室温下违反热力学第二定律');
    if (Ein > 1e5) warnings.push('输入能量数量级大, 实际装置的损耗会有所不同');

    return {
      meta: {
        model: 'energy-transformation',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: {
        'x_t': barChart,
        'y_t': flowChart,
        'energy_t': barChart,
        'v_t': effCurve,
      },
      diagnostics: {
        conservedQuantities: [
          {
            name: `${modeZh} 能量`,
            law: '能量守恒定律',
            initialValue: Ein,
            finalValue: Ein,
            maxDeviation: 0,
            tolerance: 1e-6,
            conserved: true,
          },
        ],
        maxValues: {
          Ein_J: parseFloat(Ein.toFixed(3)),
          Eout_J: parseFloat(Eout.toFixed(3)),
          Eloss_J: parseFloat(Eloss.toFixed(3)),
          eta: parseFloat(eta.toFixed(4)),
          modeCode: c.mode === 'pendulum' ? 0 : c.mode === 'generator' ? 1 : 2,
        },
        rangeCheck: { withinRange: warnings.length === 0, warnings },
      },
      explanation: {
        summary: `${modeZh} 能量转化: Ein=${Ein.toFixed(2)}J → Eout=${Eout.toFixed(2)}J, η=${(eta * 100).toFixed(1)}%`,
        steps,
        formulas: [
          {
            name: '能量守恒',
            formula: 'Ein = Eout + Eloss',
            variables: {
              Ein: { value: parseFloat(Ein.toFixed(3)), unit: 'J' },
              Eout: { value: parseFloat(Eout.toFixed(3)), unit: 'J' },
              Eloss: { value: parseFloat(Eloss.toFixed(3)), unit: 'J' },
            },
          },
          {
            name: '效率',
            formula: 'η = Eout / Ein',
            variables: {
              eta: { value: parseFloat(eta.toFixed(4)), unit: '' },
              Eout: { value: parseFloat(Eout.toFixed(3)), unit: 'J' },
              Ein: { value: parseFloat(Ein.toFixed(3)), unit: 'J' },
            },
          },
        ],
      },
      errors: [],
      warnings,
    };
  }
}

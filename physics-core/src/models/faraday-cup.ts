import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 法拉第圆筒模型 — 必修三 第十二章
 *
 * 空腔导体电荷仅分布在外表面 (法拉第定律).
 *   内壁 (内表面) 电荷 = 0
 *   外壁 (外表面) 电荷 = totalCharge
 *
 * 用验电器接触内壁 vs 外壁, 测量结果不同 (内壁不带电)
 * 扫描探针接触位置, 得到位置-电荷曲线
 */
export class FaradayCupModel extends PhysicsModelBase {
  readonly name = '法拉第圆筒';
  readonly version = '1.0.0';
  readonly description = '空腔导体电荷仅分布外表面; 探针接触内/外壁测量结果对比';
  readonly modelType = 'faraday-cup' as const;
  readonly assumptions = [
    '圆筒为良导体且达到静电平衡',
    '内表面电荷密度为零 (法拉第定律)',
    '所有净电荷分布在外表面',
    '探针接触时测量接触位置的电荷',
  ];
  readonly applicableRange = 'totalCharge: 0.1–50 μC; probeDepth: 0–1';
  readonly errorSources = [
    '实际圆筒有厚度, 不完全是等势体',
    '边缘效应导致局部电荷非零',
    '探针接触时电荷重新分布',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'innerProbeDepth', description: '内壁探针深度 (0=刚好内壁, 1=腔体深处)', unit: '', required: true, min: 0, max: 1 },
    { name: 'outerProbeDepth', description: '外壁探针接触深度 (0=刚好表面, 1=外侧)', unit: '', required: true, min: 0, max: 1 },
    { name: 'totalCharge', description: '圆筒总电荷 (μC)', unit: 'μC', required: true, min: 0.1, max: 100 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const c = problem.constraints?.faradayCup;
    if (!c) throw new Error('faraday-cup 模型需要 faradayCup 约束配置');

    const innerDepth: number = c.innerProbeDepth ?? 0;
    const outerDepth: number = c.outerProbeDepth ?? 1;
    const Q: number = c.totalCharge;
    const sampleCount = problem.timeConfig.sampleCount ?? 50;
    const duration = problem.timeConfig.duration;

    // 内壁探针 → 处处 0 (内表面无电荷)
    const innerMeasurement = 0;
    // 外壁探针 → totalCharge (外表面全部电荷)
    const outerMeasurement = Q;

    // 扫描: 沿圆筒壁剖面 (0=内壁 ~ 1=外表面 ~ 2=外侧空间)
    const probe_position_charge: ChartSeries = {
      xLabel: '探针位置 (0=内壁, 1=外表面)', yLabel: '测量电荷 (μC)', xUnit: '', yUnit: 'μC',
      points: Array.from({ length: sampleCount + 1 }, (_, i) => {
        const x = i / sampleCount;
        let qMeas: number;
        if (x < 0.95) {
          // 内腔内部: 电荷为 0
          qMeas = 0;
        } else if (x < 1.0) {
          // 内表面 → 外表面过渡: 从 0 跳到 Q (阶跃)
          qMeas = 0;
        } else {
          // 外表面及外侧: 全部 Q
          qMeas = Q;
        }
        return { x, y: qMeas };
      }),
    };

    // 静态轨迹 (单帧)
    const trajectory: TrajectoryPoint[] = [{
      t: 0,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      kineticEnergy: 0,
      potentialEnergy: 0,
    }];

    const keyframes: Keyframe[] = [
      {
        label: '内壁测量 (法拉第定律)',
        t: 0,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        description: `探针接触内壁: 测量值 = ${innerMeasurement} μC (内表面无电荷)`,
      },
      {
        label: '外壁测量',
        t: duration,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        description: `探针接触外壁: 测量值 = ${outerMeasurement} μC (外表面全部电荷)`,
      },
    ];

    const steps: ExplanationStep[] = [
      { order: 1, description: '法拉第定律', formula: '空腔导体电荷仅分布外表面', result: `Q_内表面=0, Q_外表面=${Q} μC` },
      { order: 2, description: '内壁探针测量', formula: 'q_内探针 = 0 (内表面无电荷)', calculation: `测量值=${innerMeasurement} μC` },
      { order: 3, description: '外壁探针测量', formula: 'q_外探针 = Q_总', calculation: `测量值=${outerMeasurement} μC` },
      { order: 4, description: '结论', formula: '空腔导体起到静电屏蔽作用', result: '内部电荷全部转移到外表面' },
    ];

    return {
      meta: { model: 'faraday-cup', solver: 'analytical', computationTime: 0, timestamp: new Date().toISOString(), version: this.version },
      trajectories: [trajectory],
      keyframes,
      charts: { 'probe_position_charge': probe_position_charge },
      diagnostics: {
        conservedQuantities: [],
        maxValues: { innerMeasurement, outerMeasurement, Q, innerDepth, outerDepth },
        rangeCheck: { withinRange: Q <= 100, warnings: Q > 80 ? ['总电荷量较大, 导体可能放电'] : [] },
      },
      explanation: {
        summary: `法拉第圆筒: 内壁=${innerMeasurement} μC, 外壁=${outerMeasurement} μC, 验证电荷仅分布外表面`,
        steps,
        formulas: [
          { name: '法拉第定律', formula: 'Q_内表面 = 0, Q_外表面 = Q_总', variables: { Q: { value: Q, unit: 'μC' } } },
        ],
      },
      errors: [],
      warnings: [],
    };
  }
}

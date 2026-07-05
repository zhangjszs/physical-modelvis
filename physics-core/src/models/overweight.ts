import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ForceDiagram, ExplanationStep, FormulaUsage } from '../types/result.js';
import type { ParameterSpec, Vector2D } from '../types/common.js';
import type { OverweightMode } from '../types/problem.js';
import { PhysicsModelBase } from './base.js';

/**
 * 超重与失重模型 — 必修一 第四章 运动和力的关系
 *
 * 电梯内质量为 m 的物体，受重力 mg（向下）和支持力 N（向上）。
 * 以向上为正方向，合力满足牛顿第二定律:
 *     N − mg = m·a_y   →   N = m·(g + a_y)
 *
 * 加速度方向约定 (向上为正):
 *   - upStart   向上加速  → a_y = +A  → N > mg (超重)
 *   - upStop    向上减速  → a_y = −A  → N < mg (失重)
 *   - downStart 向下加速  → a_y = −A  → N < mg (失重)
 *   - downStop  向下减速  → a_y = +A  → N > mg (超重)
 *
 * 完全失重: 当 a_y = −g 时 N = 0 (自由落体或抛体)。
 *
 * 图表输出: y-t, v_y-t, a_y-t, F_N-t, F_N-a_y。
 * 其中 F_N-a_y 直线斜率 = m，截距 = mg，直观演示线性关系。
 */
export class OverweightModel extends PhysicsModelBase {
  readonly name = '超重与失重';
  readonly version = '1.0.0';
  readonly description = '电梯加速/减速过程中的超重与失重现象 (N = m(g+a_y))';
  readonly modelType = 'overweight' as const;
  readonly assumptions = [
    '电梯沿竖直方向运动 (一维)',
    '加速度大小恒定',
    '物体与电梯底板始终保持接触 (N ≥ 0)',
    '不考虑空气阻力',
    '向上为正方向',
  ];
  readonly applicableRange = '电梯、升降机、火箭发射等竖直加速系统的视重分析';
  readonly errorSources = [
    '实际电梯加速度非阶跃 (有平滑过渡)',
    '地球自转影响微小重力偏差',
    '测量仪器精度限制',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'mass', description: '物体质量 m (kg)', unit: 'kg', required: true, min: 0 },
    { name: 'accMagnitude', description: '加速度大小 A (m/s²)', unit: 'm/s²', required: true, min: 0 },
    { name: 'mode', description: '电梯阶段 (upStart | upStop | downStart | downStop)', unit: '', required: true },
    { name: 'duration', description: '模拟时长 (s)', unit: 's', required: true, min: 0 },
    { name: 'gravity', description: '重力加速度 g (m/s²)', unit: 'm/s²', required: false, defaultValue: 9.8, min: 0 },
  ];

  /** 由 mode 推导加速度 a_y (向上为正) */
  private static accFromMode(mode: OverweightMode, aMag: number): number {
    switch (mode) {
      case 'upStart':   return +aMag;   // 向上加速
      case 'upStop':    return -aMag;   // 向上减速
      case 'downStart': return -aMag;   // 向下加速
      case 'downStop':  return +aMag;   // 向下减速
    }
  }

  /** 当前阶段的中文描述 */
  private static modeDescription(mode: OverweightMode): string {
    switch (mode) {
      case 'upStart':   return '向上加速 (a↑)';
      case 'upStop':    return '向上减速 (a↓)';
      case 'downStart': return '向下加速 (a↓)';
      case 'downStop':  return '向下减速 (a↑)';
    }
  }

  /** 当前阶段类型标签 */
  private static phaseLabel(mode: OverweightMode): string {
    switch (mode) {
      case 'upStart':   return '加速上升';
      case 'upStop':    return '减速上升';
      case 'downStart': return '加速下降';
      case 'downStop':  return '减速下降';
    }
  }

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const c = problem.constraints?.overweight;
    if (!c) {
      throw new Error('超重/失重模型需要 constraints.overweight 配置');
    }

    const m = c.mass ?? 1;
    const aMag = c.accMagnitude ?? 2;
    const g = c.gravity ?? 9.8;
    const mode = c.mode;
    const duration = problem.timeConfig.duration;
    const sampleCount = problem.timeConfig.sampleCount ?? 500;
    const dt = duration / sampleCount;

    if (m <= 0) throw new Error('超重/失重模型: mass 必须为正数');
    if (aMag < 0) throw new Error('超重/失重模型: accMagnitude 必须为非负数');
    if (duration <= 0) throw new Error('超重/失重模型: duration 必须为正数');
    if (g <= 0) throw new Error('超重/失重模型: gravity 必须为正数');

    // 加速度 (向上为正)
    const aY = OverweightModel.accFromMode(mode, aMag);
    // 支持力 (恒定，因 a_y 恒定)
    const N = m * (g + aY);
    // 完全失重判定: N ≈ 0
    const isCompleteWeightlessness = Math.abs(N) < 1e-9;
    const isOverweight = N > m * g;
    const isWeightless = N < m * g && !isCompleteWeightlessness;

    // 初始位置和速度
    const y0 = problem.bodies[0]?.position ?? { x: 0, y: 0 };
    const v0: Vector2D = { x: 0, y: 0 };

    // 轨迹 (仅竖直方向有意义)
    const trajectory: TrajectoryPoint[] = [];
    let maxY = -Infinity;
    let minY = Infinity;
    for (let i = 0; i <= sampleCount; i++) {
      const t = i * dt;
      const y = y0.y + v0.y * t + 0.5 * aY * t * t;
      const vy = v0.y + aY * t;
      maxY = Math.max(maxY, y);
      minY = Math.min(minY, y);
      trajectory.push({
        t,
        position: { x: 0, y },
        velocity: { x: 0, y: vy },
        acceleration: { x: 0, y: aY },
        kineticEnergy: 0.5 * m * vy * vy,
        // 重力势能: U = mgy (零点 y=0 处)
        potentialEnergy: m * g * y,
      });
    }

    // 关键帧 (4 个分界: 起点、阶段中点展示 a_y、速度零点展示 N<mg、终点)
    const keyframes: Keyframe[] = [];
    keyframes.push({
      label: '阶段起点',
      t: 0,
      position: { x: 0, y: y0.y },
      velocity: { ...v0 },
      description: `${OverweightModel.phaseLabel(mode)} 起点 — ${OverweightModel.modeDescription(mode)}，N=${N.toFixed(2)} N ${isOverweight ? '(超重)' : isWeightless ? '(失重)' : isCompleteWeightlessness ? '(完全失重)' : ''}`,
    });

    // 速度最大/最小点 (v_y 过零点仅当 aY 与 v0.y 反号，此处 v0.y=0 故无过零，省略)
    // 加速度特定点: 中点时刻展示 N
    const tMid = duration / 2;
    const yMid = y0.y + v0.y * tMid + 0.5 * aY * tMid * tMid;
    keyframes.push({
      label: '阶段中段',
      t: tMid,
      position: { x: 0, y: yMid },
      velocity: { x: 0, y: v0.y + aY * tMid },
      description: `${tMid.toFixed(2)}s 时，a_y=${aY.toFixed(2)} m/s²，N=${N.toFixed(2)} N，mg=${(m * g).toFixed(2)} N`,
    });

    const finalFrame = trajectory[trajectory.length - 1];
    keyframes.push({
      label: '阶段终点',
      t: duration,
      position: finalFrame.position,
      velocity: finalFrame.velocity,
      description: `${duration}s 时到达 y=${finalFrame.position.y.toFixed(3)} m，v_y=${finalFrame.velocity.y.toFixed(3)} m/s`,
    });

    // y-t 曲线 (位置随时间，抛物线)
    const y_t: ChartSeries = {
      xLabel: '时间', xUnit: 's', yLabel: '高度', yUnit: 'm',
      points: trajectory.map(p => ({ x: p.t, y: p.position.y })),
    };
    // v_y-t 曲线 (速度随时间，线性)
    const vy_t: ChartSeries = {
      xLabel: '时间', xUnit: 's', yLabel: '竖直速度', yUnit: 'm/s',
      points: trajectory.map(p => ({ x: p.t, y: p.velocity.y })),
    };
    // a_y-t 阶梯曲线 (恒定 a_y，水平线)
    const a_y_t: ChartSeries = {
      xLabel: '时间', xUnit: 's', yLabel: '竖直加速度 a_y', yUnit: 'm/s²',
      points: trajectory.map(p => ({ x: p.t, y: aY })),
    };
    // F_N-t 阶梯线 vs mg 参考线
    const FN_t: ChartSeries = {
      xLabel: '时间', xUnit: 's', yLabel: '支持力 N', yUnit: 'N',
      points: trajectory.map(p => ({ x: p.t, y: N })),
    };
    // mg 参考线系列 (weight reference line)
    const mgRef_t: ChartSeries = {
      xLabel: '时间', xUnit: 's', yLabel: 'mg 参考', yUnit: 'N',
      points: trajectory.map(p => ({ x: p.t, y: m * g })),
    };
    // F_N-a_y 线性关系图 (斜率=m, 截距=mg)
    // 采样 a_y 从 -g 到 +aMax (覆盖完全失重区间)
    const aMax = Math.max(aMag, g);
    const aSamples = 25;
    const FN_a_y: ChartSeries = {
      xLabel: '竖直加速度 a_y', xUnit: 'm/s²', yLabel: '支持力 N', yUnit: 'N',
      points: Array.from({ length: aSamples }, (_, i) => {
        const a = -g + (2 * aMax) * i / (aSamples - 1);
        return { x: a, y: m * (g + a) };
      }),
    };

    // 受力分析图 (竖直方向)
    const forceDiagram: ForceDiagram = {
      bodyId: problem.bodies[0]?.id ?? 'mass',
      forces: [
        { name: '支持力 N', vector: { x: 0, y: N }, magnitude: N, unit: 'N' },
        { name: '重力 mg', vector: { x: 0, y: -m * g }, magnitude: m * g, unit: 'N' },
      ],
      netForce: { x: 0, y: m * aY },
    };

    // 5 步说明
    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '电梯模型建立：取物体为研究对象，受支持力 N（向上）和重力 mg（向下）',
        formula: '受力: N↑, mg↓',
        calculation: `m = ${m} kg, g = ${g} m/s², mg = ${(m * g).toFixed(2)} N`,
        result: `重力 mg = ${(m * g).toFixed(2)} N`,
      },
      {
        order: 2,
        description: `当前阶段: ${OverweightModel.phaseLabel(mode)} — ${OverweightModel.modeDescription(mode)}`,
        formula: 'a_y = ' + (aY >= 0 ? '+' : '') + `${aY.toFixed(2)} m/s²`,
        calculation: `${OverweightModel.phaseLabel(mode)}: a_y = ${aY >= 0 ? '+' : ''}${aY.toFixed(2)} m/s²`,
        result: `a_y = ${aY >= 0 ? '+' : ''}${aY.toFixed(2)} m/s²`,
      },
      {
        order: 3,
        description: '牛顿第二定律: N − mg = m·a_y → N = m(g + a_y)',
        formula: 'N = m(g + a_y)',
        calculation: `N = ${m} × (${g} + (${aY.toFixed(2)})) = ${N.toFixed(2)} N`,
        result: `N = ${N.toFixed(2)} N`,
      },
      {
        order: 4,
        description: isOverweight
          ? '超重条件: a_y > 0 → N > mg'
          : isWeightless
            ? '失重条件: a_y < 0 → N < mg'
            : isCompleteWeightlessness
              ? '完全失重: a_y = −g → N = 0'
              : '平衡状态: a_y = 0 → N = mg',
        formula: isOverweight ? 'N > mg (超重)' : isWeightless ? 'N < mg (失重)' : 'N = mg',
        calculation: isOverweight
          ? `${N.toFixed(2)} N > ${(m * g).toFixed(2)} N`
          : isWeightless
            ? `${N.toFixed(2)} N < ${(m * g).toFixed(2)} N`
            : `${N.toFixed(2)} N = ${(m * g).toFixed(2)} N`,
        result: isOverweight ? '超重状态' : isWeightless ? '失重状态' : isCompleteWeightlessness ? '完全失重' : '平衡状态',
      },
      {
        order: 5,
        description: '应用: 体重计、磅秤示数反映支持力 — 电梯加速时可观察到示数变化',
        formula: '示数 = N/g 单位 (kg)',
        calculation: `等效质量读数 = ${N.toFixed(2)} / ${g} = ${(N / g).toFixed(3)} kg`,
        result: `体重计读得 ${m} kg 物体为 ${(N / g).toFixed(3)} kg ${isOverweight ? '(偏重)' : isWeightless ? '(偏轻)' : ''}`,
      },
    ];

    const formulas: FormulaUsage[] = [
      { name: '支持力公式', formula: 'N = m(g + a_y)', variables: { m: { value: m, unit: 'kg' }, g: { value: g, unit: 'm/s²' }, 'a_y': { value: aY, unit: 'm/s²' }, N: { value: N, unit: 'N' } } },
      { name: '牛顿第二定律(竖直)', formula: 'N − mg = m·a_y', variables: { N: { value: N, unit: 'N' }, mg: { value: m * g, unit: 'N' }, 'm·a_y': { value: m * aY, unit: 'N' } } },
    ];

    const modeLabel = OverweightModel.phaseLabel(mode);
    const stateLabel = isOverweight ? '超重' : isWeightless ? '失重' : isCompleteWeightlessness ? '完全失重' : '平衡';
    const summary = `电梯${modeLabel}阶段 (${OverweightModel.modeDescription(mode)})，m=${m} kg，a_y=${aY >= 0 ? '+' : ''}${aY.toFixed(2)} m/s²，N=${N.toFixed(2)} N，mg=${(m * g).toFixed(2)} N —— ${stateLabel}`;

    return {
      meta: {
        model: 'overweight',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: { y_t, vy_t, a_y_t, FN_t, mg_ref_t: mgRef_t, FN_a_y, force_diagram: forceDiagram },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          normalForce: N,
          weight: m * g,
          accY: aY,
          velocityYMax: Math.max(...trajectory.map(p => p.velocity.y)),
          velocityYMin: Math.min(...trajectory.map(p => p.velocity.y)),
          heightMax: maxY,
          heightMin: minY,
          overweightRatio: N / (m * g),
        },
        rangeCheck: withinRangeCheck(isCompleteWeightlessness, aMag, g),
      },
      explanation: {
        summary,
        steps,
        formulas,
      },
      errors: [],
      warnings: buildWarnings(m, g, aMag, N),
    };
  }
}

function withinRangeCheck(isCompleteWeightlessness: boolean, aMag: number, g: number): { withinRange: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (aMag >= g) {
    warnings.push(`加速度 A=${aMag} m/s² ≥ g=${g} m/s²: 若电梯向下加速将处于完全失重状态 (N ≤ 0)`);
  }
  if (isCompleteWeightlessness) {
    warnings.push('完全失重 (N=0) — 物体与底板之间无挤压力');
  }
  return { withinRange: warnings.length === 0, warnings };
}

function buildWarnings(m: number, g: number, aMag: number, N: number): string[] {
  const warnings: string[] = [];
  if (aMag >= g) {
    warnings.push(`加速度 ${aMag} m/s² ≥ g: 向下加速减速阶段可能出现 N < 0 (已截断至 0)`);
  }
  if (N < 0) {
    warnings.push(`支持力 N=${N.toFixed(2)} N 为负值，意味着物体已脱离底板，完全失重 (模型展示 N=0)`);
  }
  if (m * g < 0.5) {
    warnings.push('质量过小，数值精度可能受影响');
  }
  return warnings;
}

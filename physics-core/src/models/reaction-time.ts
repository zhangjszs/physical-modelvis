import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 测反应时间模型 — 自由落体法 (互动实验)
 *
 * 物理原理: 自由落体位移公式 h = ½gt² → 反应时间 t = √(2h/g)
 *
 * 实验方法 (人教版高中物理必修一 第一章):
 *   - 测试者竖直手持刻度尺 (0 刻度在下方)
 *   - 被测者突然抓住刻度尺 (手指初始在 0 刻度)
 *   - 记录被抓处刻度 h (下落距离, m)
 *   - 计算: t = √(2h/g)
 *
 * 模型功能:
 *   - 给定下落距离 h, 计算反应时间 t = √(2h/g)
 *   - 模拟尺子下落过程 y(t) = h - ½gt² (y=0 为被抓位置, y 轴向上)
 *   - 绘制 h-t 曲线 (抛物线) 验证 h = ½gt²
 *   - 绘制 t-√h 直线验证 t ∝ √h 线性关系
 *
 * 坐标系约定: y 轴向上为正，被抓位置 y=0，初始时刻尺子顶部在 y=h
 *   位置: y(t) = h - ½gt²  (t ∈ [0, √(2h/g)])
 *   速度: v(t) = -gt (向下)
 *   加速度: a = -g
 */
export class ReactionTimeModel extends PhysicsModelBase {
  /** 公式常量 */
  static readonly REACTION_TIME_FORMULA = 't = √(2h/g)';

  readonly name = '测反应时间';
  readonly version = '1.0.0';
  readonly description = '利用自由落体位移公式 h = ½gt² 测量被测者反应时间';
  readonly modelType = 'reaction-time' as const;
  readonly assumptions = [
    '尺子视为自由落体 (无初速度释放)',
    '忽略空气阻力',
    '重力加速度恒定',
    '被抓瞬时判定为反应时间终点',
  ];
  readonly applicableRange = '下落距离 h ∈ [0.05, 0.5] m (对应 t ∈ [0.1, 0.32] s)';
  readonly errorSources = [
    '下落距离 h 的读数误差 (毫米刻度尺 ±1mm)',
    '测试者是否无初速度释放刻度尺',
    '被抓位置判读误差',
    '空气阻力 (h 较小时可忽略)',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'distance', description: '尺子下落距离 h (m)', unit: 'm', required: true, min: 0.01 },
    { name: 'sampleCount', description: '轨迹采样点数', unit: '', required: false, defaultValue: 100 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const c = problem.constraints?.reactionTime;
    if (!c) {
      throw new Error('测反应时间模型需要 constraints.reactionTime 配置');
    }

    const h = c.distance;
    const g = c.gravity ?? 9.8;

    if (h <= 0) {
      throw new Error('下落距离 h 必须为正数');
    }
    if (g <= 0) {
      throw new Error('重力加速度 g 必须为正数');
    }

    // 反应时间: t = √(2h/g)
    const reactionTime = Math.sqrt(2 * h / g);

    const duration = problem.timeConfig.duration > 0 ? problem.timeConfig.duration : reactionTime;
    const totalTime = Math.max(duration, reactionTime * 1.1); // 确保至少覆盖 1.1 倍反应时间
    const sampleCount = problem.timeConfig.sampleCount ?? 200;
    const dt = totalTime / sampleCount;

    const mass = problem.bodies[0]!.mass.value;

    // 生成轨迹: y(t) = h - ½gt², v(t) = -gt, a = -g
    const trajectory: TrajectoryPoint[] = [];
    for (let i = 0; i <= sampleCount; i++) {
      const t = i * dt;
      // 限制位置不被抓后 (y≥0 即 h - ½gt² ≥ 0)
      // t ≤ √(2h/g) = reactionTime; 超过后让 y=0, v=0 (已抓住)
      const isCaught = t > reactionTime;
      const y = isCaught ? 0 : h - 0.5 * g * t * t;
      const vy = isCaught ? 0 : -g * t;
      const ay = isCaught ? 0 : -g;
      const speed = Math.abs(vy);
      // 重力势能 (零点 y=0): U = mgy (当 y>0)
      const potentialEnergy = mass * g * Math.max(y, 0);
      const kineticEnergy = 0.5 * mass * speed * speed;

      trajectory.push({
        t,
        position: { x: 0, y: Math.max(y, 0) },
        velocity: { x: 0, y: vy },
        acceleration: { x: 0, y: ay },
        kineticEnergy,
        potentialEnergy,
      });
    }

    // 关键帧: 起点(y=h), 中点, 被抓点(y=0)
    const keyframes: Keyframe[] = [
      {
        label: '释放点 (t=0)',
        t: 0,
        position: { x: 0, y: h },
        velocity: { x: 0, y: 0 },
        description: `刻度尺 0 刻度位于手指处，从静止释放，y₀ = ${h.toFixed(3)} m`,
      },
      {
        label: '中途',
        t: reactionTime / 2,
        position: { x: 0, y: h - 0.5 * g * (reactionTime / 2) * (reactionTime / 2) },
        velocity: { x: 0, y: -g * reactionTime / 2 },
        description: `下落距离 = ${(h / 4).toFixed(3)} m，速度 = ${(g * reactionTime / 2).toFixed(2)} m/s`,
      },
      {
        label: '被抓点 (t = √(2h/g))',
        t: reactionTime,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: -g * reactionTime },
        description: `下落距离 h = ${h.toFixed(3)} m, 反应时间 t = ${reactionTime.toFixed(3)} s`,
      },
      {
        label: '模拟终点',
        t: totalTime,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        description: `已抓住刻度尺，模拟时长 ${totalTime.toFixed(3)} s`,
      },
    ];

    // h-t 曲线: 下落距离随时间变化 h(t) = ½gt², t ∈ [0, reactionTime]
    const h_t_series: ChartSeries = {
      xLabel: '时间 t', yLabel: '下落距离 h', xUnit: 's', yUnit: 'm',
      points: trajectory
        .filter(p => p.t <= reactionTime * 1.01)
        .map(p => ({ x: p.t, y: 0.5 * g * p.t * p.t })),
    };

    // t-√h 直线: 不同 h 值对应的反应时间 t = √(2h/g)
    // 扫描 h ∈ [0.01, 0.6] m，计算对应 t，描绘 t ∝ √h 线性关系
    const t_sqrt_h_series: ChartSeries = {
      xLabel: '√h', yLabel: '反应时间 t', xUnit: '√m', yUnit: 's',
      points: (() => {
        const pts: Array<{ x: number; y: number }> = [];
        const sqrtHMax = Math.sqrt(0.6);
        const sqrtHMin = Math.sqrt(0.01);
        const n = 50;
        for (let i = 0; i <= n; i++) {
          const sqrtH = sqrtHMin + (sqrtHMax - sqrtHMin) * (i / n);
          const hh = sqrtH * sqrtH;
          const t = Math.sqrt(2 * hh / g);
          pts.push({ x: sqrtH, y: t });
        }
        return pts;
      })(),
    };

    // v-t 曲线: 速度随时间变化
    const v_t_series: ChartSeries = {
      xLabel: '时间 t', yLabel: '速度大小 |v|', xUnit: 's', yUnit: 'm/s',
      points: trajectory.map(p => ({ x: p.t, y: Math.abs(p.velocity.y) })),
    };

    // 下落距离-时间 曲线 (尺子竖直位置 y 随时间变化)
    const y_t_series: ChartSeries = {
      xLabel: '时间 t', yLabel: '尺子顶端位置 y', xUnit: 's', yUnit: 'm',
      points: trajectory.map(p => ({ x: p.t, y: p.position.y })),
    };

    // diagnostics
    const maxSpeed = g * reactionTime;
    const finalKE = 0.5 * mass * maxSpeed * maxSpeed;
    const initialPE = mass * g * h;
    const eRatio = initialPE > 0 ? finalKE / initialPE : 1;

    // 不确定度传递: t = √(2h/g), dt/dh = 1/√(2hg)
    // σ_t = |dt/dh|·σ_h, 假设 σ_h = 0.001 m (毫米读数误差)
    const sigmaH = 0.001;
    const sigmaT = (1 / Math.sqrt(2 * h * g)) * sigmaH;

    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '识别运动模型: 自由落体 (初速度为零的匀加速直线运动)',
        formula: 'h = ½gt²',
        calculation: 'h = ½ × g × t²',
      },
      {
        order: 2,
        description: '由下落距离 h 推导出反应时间 t',
        formula: 't = √(2h/g)',
        calculation: `t = √(2 × ${h.toFixed(3)} / ${g})`,
      },
      {
        order: 3,
        description: '代入数据计算',
        calculation: `t = √(${(2 * h).toFixed(3)} / ${g}) = √${((2 * h) / g).toFixed(5)}`,
        result: `t ≈ ${reactionTime.toFixed(3)} s`,
      },
      {
        order: 4,
        description: '不确定度估计 (毫米读数误差)',
        formula: 'σ_t = (∂t/∂h)·σ_h = σ_h / √(2hg)',
        calculation: `σ_t = ${sigmaH} / √(2 × ${h} × ${g}) = ±${sigmaT.toFixed(4)} s`,
        result: `t = (${(reactionTime).toFixed(3)} ± ${sigmaT.toFixed(3)}) s`,
      },
    ];

    return {
      meta: {
        model: 'reaction-time',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: {
        h_t: h_t_series,
        t_sqrt_h: t_sqrt_h_series,
        v_t: v_t_series,
        y_t: y_t_series,
      },
      diagnostics: {
        conservedQuantities: [
          {
            name: '机械能',
            law: '自由落体机械能守恒 (仅重力做功)',
            initialValue: initialPE,
            finalValue: finalKE,
            maxDeviation: Math.abs(initialPE - finalKE),
            tolerance: 1e-9,
            conserved: Math.abs(initialPE - finalKE) < 1e-6,
          },
        ],
        maxValues: {
          reactionTime,
          distance: h,
          gravity: g,
          maxSpeed,
          finalKineticEnergy: finalKE,
          initialPotentialEnergy: initialPE,
          sigmaTime: sigmaT,
          sigmaDistance: sigmaH,
          energyRatio: eRatio,
        },
        rangeCheck: {
          withinRange: h >= 0.05 && h <= 0.5,
          warnings: (h < 0.05 || h > 0.5)
            ? [`下落距离 h=${h}m 超出推荐范围 [0.05, 0.5] m，结果仅供参考`]
            : [],
        },
      },
      explanation: {
        summary: `测反应时间: h=${h.toFixed(3)}m, g=${g}m/s² → t=√(2h/g)=${reactionTime.toFixed(3)}s (反应速度${reactionTime < 0.15 ? '极快' : reactionTime < 0.2 ? '较快' : reactionTime < 0.3 ? '一般' : '较慢'})`,
        steps,
        formulas: [
          { name: '自由落体位移', formula: 'h = ½gt²', variables: { h: { value: h, unit: 'm' }, g: { value: g, unit: 'm/s²' }, t: { value: reactionTime, unit: 's' } } },
          { name: '反应时间', formula: ReactionTimeModel.REACTION_TIME_FORMULA, variables: { h: { value: h, unit: 'm' }, g: { value: g, unit: 'm/s²' }, t: { value: reactionTime, unit: 's' } } },
          { name: '末速度', formula: 'v = gt = √(2gh)', variables: { g: { value: g, unit: 'm/s²' }, t: { value: reactionTime, unit: 's' }, v: { value: maxSpeed, unit: 'm/s' } } },
          { name: '不确定度传递', formula: 'σ_t = σ_h / √(2hg)', variables: { sigma_h: { value: sigmaH, unit: 'm' }, h: { value: h, unit: 'm' }, g: { value: g, unit: 'm/s²' }, sigma_t: { value: sigmaT, unit: 's' } } },
        ],
      },
      errors: [],
      warnings: (h < 0.05 || h > 0.5)
        ? [`下落距离 h=${h}m 超出推荐范围 [0.05, 0.5] m, 结果仅供参考`]
        : [],
    };
  }
}

import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep, FormulaUsage } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

/** 匀变速直线运动模型 */
export class UniformAcceleratedModel extends PhysicsModelBase {
  readonly name = '匀变速直线运动';
  readonly version = '1.0.0';
  readonly description = '物体以恒定加速度沿直线运动';
  readonly modelType = 'uniform-accelerated' as const;
  readonly assumptions = [
    '物体视为质点',
    '加速度恒定',
    '沿直线运动 (一维或二维但加速度方向与速度方向共线)',
  ];
  readonly applicableRange = '适用于加速度恒定的直线运动，如自由落体、刹车减速等';
  readonly errorSources = [
    '实际加速度可能因摩擦变化',
    '空气阻力会导致加速度不恒定',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'initialVelocity', description: '初速度 (m/s)', unit: 'm/s', required: true },
    { name: 'acceleration', description: '加速度 (m/s²)', unit: 'm/s²', required: true },
    { name: 'duration', description: '运动时长 (s)', unit: 's', required: true, min: 0 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const body = problem.bodies[0];
    const v0 = body.velocity;
    const x0 = body.position;

    // 从环境配置中提取加速度，或从问题参数推断
    // 对于匀变速运动，加速度需要通过 constraints 或 environment 提供
    // 这里我们从 body 的第一个"力"推导，或者直接用零加速度
    // 实际使用时由 SolverRouter 调用，问题中应包含加速度信息
    const a = this.extractAcceleration(problem);
    // 坐标系约定: 本引擎 y 轴向上为正 (数学标准)
    // uniform-accelerated 提取重力加速度 a = {x:0, y:−g}
    // 地面 y=groundY (通常 0), 物体下落时 y↓ (即 y 减小)
    // 重力势能 U = m·g·(y − groundY), 零点在地面
    const gAmp = Vec2.magnitude(a);
    const groundY = problem.environment?.ground?.y ?? 0;
    const mass = body.mass.value;

    const duration = problem.timeConfig.duration;
    const sampleCount = problem.timeConfig.sampleCount ?? 1000;
    const dt = duration / sampleCount;

    // 生成轨迹: x = x₀ + v₀t + ½at², v = v₀ + at
    const trajectory: TrajectoryPoint[] = [];
    for (let i = 0; i <= sampleCount; i++) {
      const t = i * dt;
      const position = Vec2.add(x0, Vec2.add(Vec2.scale(v0, t), Vec2.scale(a, 0.5 * t * t)));
      const velocity = Vec2.add(v0, Vec2.scale(a, t));
      const speed = Vec2.magnitude(velocity);
      // 重力势能 (零点在地面, 地面以上 U 为正)
      const potentialEnergy = gAmp > 0 ? mass * gAmp * (position.y - groundY) : 0;
      trajectory.push({
        t,
        position,
        velocity,
        acceleration: { ...a },
        kineticEnergy: 0.5 * mass * speed * speed,
        potentialEnergy,
      });
    }

    // 关键帧: 速度为零的时刻 (如果存在)
    const keyframes: Keyframe[] = [];
    keyframes.push({
      label: '起始点',
      t: 0,
      position: { ...x0 },
      velocity: { ...v0 },
      description: `物体从 (${x0.x}, ${x0.y}) 以速度 (${v0.x}, ${v0.y}) m/s 开始运动，加速度 (${a.x}, ${a.y}) m/s²`,
    });

    // 检查速度是否能减为零 (仅当加速度与初速度反向时)
    const aMag = Vec2.magnitude(a);
    const v0Mag = Vec2.magnitude(v0);
    if (aMag > 0 && v0Mag > 0) {
      const cosAngle = Vec2.dot(v0, a) / (v0Mag * aMag);
      if (cosAngle < 0) {
        // 加速度与速度反向，存在速度为零的时刻
        const tStop = v0Mag / aMag;
        if (tStop > 0 && tStop <= duration) {
          const posAtStop = Vec2.add(x0, Vec2.add(Vec2.scale(v0, tStop), Vec2.scale(a, 0.5 * tStop * tStop)));
          keyframes.push({
            label: '速度为零',
            t: tStop,
            position: posAtStop,
            velocity: Vec2.zero(),
            description: `物体在 t=${tStop.toFixed(3)}s 时速度减为零，位置 (${posAtStop.x.toFixed(3)}, ${posAtStop.y.toFixed(3)})`,
          });
        }
      }
    }

    const finalPos = trajectory[trajectory.length - 1].position;
    keyframes.push({
      label: '终点',
      t: duration,
      position: finalPos,
      velocity: trajectory[trajectory.length - 1].velocity,
      description: `物体在 t=${duration}s 时到达 (${finalPos.x.toFixed(3)}, ${finalPos.y.toFixed(3)})`,
    });

    // 图表数据
    const x_t: ChartSeries = {
      xLabel: '时间', yLabel: '竖直位移', xUnit: 's', yUnit: 'm',
      points: trajectory.map(p => ({ x: p.t, y: Vec2.sub(p.position, x0).y })),
    };
    const v_t: ChartSeries = {
      xLabel: '时间', yLabel: '速度', xUnit: 's', yUnit: 'm/s',
      points: trajectory.map(p => ({ x: p.t, y: Vec2.magnitude(p.velocity) })),
    };
    const ke_t: ChartSeries = {
      xLabel: '时间', yLabel: '动能', xUnit: 's', yUnit: 'J',
      points: trajectory.map(p => ({ x: p.t, y: p.kineticEnergy ?? 0 })),
    };
    const pe_t: ChartSeries = {
      xLabel: '时间', yLabel: '势能', xUnit: 's', yUnit: 'J',
      points: trajectory.map(p => ({ x: p.t, y: p.potentialEnergy ?? 0 })),
    };
    const energy_t: ChartSeries = {
      xLabel: '时间', yLabel: '机械能', xUnit: 's', yUnit: 'J',
      points: trajectory.map(p => ({ x: p.t, y: (p.kineticEnergy ?? 0) + (p.potentialEnergy ?? 0) })),
    };

    return {
      meta: {
        model: 'uniform-accelerated',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: { x_t, v_t, ke_t, pe_t, energy_t },
      diagnostics: {
        conservedQuantities: [], // 匀变速运动不守恒
        maxValues: {
          maxSpeed: Math.max(...trajectory.map(p => Vec2.magnitude(p.velocity))),
          maxDistance: Vec2.magnitude(Vec2.sub(finalPos, x0)),
        },
        rangeCheck: { withinRange: true, warnings: [] },
      },
      explanation: {
        summary: `物体以恒定加速度 (${a.x.toFixed(2)}, ${a.y.toFixed(2)}) m/s² 做匀变速直线运动`,
        steps: [
          { order: 1, description: '速度公式', formula: 'v = v₀ + at', calculation: `v = ${v0Mag.toFixed(2)} + ${aMag.toFixed(2)} × ${duration}` },
          { order: 2, description: '位移公式', formula: 'x = x₀ + v₀t + ½at²' },
          { order: 3, description: '速度-位移公式', formula: 'v² = v₀² + 2a(x - x₀)' },
        ],
        formulas: [
          { name: '速度公式', formula: 'v = v₀ + at', variables: { 'v₀': { value: v0Mag, unit: 'm/s' }, a: { value: aMag, unit: 'm/s²' }, t: { value: duration, unit: 's' } } },
          { name: '位移公式', formula: 'x = x₀ + v₀t + ½at²', variables: { 'x₀': { value: Vec2.magnitude(x0), unit: 'm' }, 'v₀': { value: v0Mag, unit: 'm/s' }, a: { value: aMag, unit: 'm/s²' }, t: { value: duration, unit: 's' } } },
          { name: '速度-位移公式', formula: 'v² = v₀² + 2a(x - x₀)', variables: { 'v₀': { value: v0Mag, unit: 'm/s' }, a: { value: aMag, unit: 'm/s²' } } },
        ],
      },
      errors: [],
      warnings: [],
    };
  }

  /** 从问题配置中提取加速度 */
  private extractAcceleration(problem: PhysicsProblem): { x: number; y: number } {
    if (problem.constraints?.inclinedPlane) {
      const angle = problem.constraints.inclinedPlane.angle * Math.PI / 180;
      const mu = problem.constraints.inclinedPlane.frictionCoefficient ?? 0;
      const g = problem.environment?.gravity?.value ?? 9.8;
      const a = g * (Math.sin(angle) - mu * Math.cos(angle));
      return { x: a * Math.cos(angle), y: -a * Math.sin(angle) };
    }

    if (problem.environment?.gravity?.enabled !== false) {
      const g = problem.environment?.gravity?.value ?? 9.8;
      return { x: 0, y: -g };
    }

    return { x: 0, y: 0 };
  }
}

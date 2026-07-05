import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ForceDiagram, ExplanationStep } from '../types/result.js';
import type { ParameterSpec, Vector2D } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

/**
 * 牛顿第二定律模型 — F = ma (必修一 第四章 §2)
 *
 * 物体在恒定合外力作用下做匀变速运动：
 *   a = F / m
 *   v(t) = v₀ + at
 *   x(t) = x₀ + v₀t + ½at²
 *
 * 支持一维 (force 为标量，沿 x 轴) 或二维向量。
 * 可选考虑地面摩擦力 (environment.ground.friction)。
 *
 * 图表输出：x-t, v-t, a-t, F-t；受力分析图；关键帧。
 */
export class NewtonSecondLawModel extends PhysicsModelBase {
  readonly name = '牛顿第二定律';
  readonly version = '1.0.0';
  readonly description = '物体在恒定合外力作用下的匀变速运动 (F=ma)';
  readonly modelType = 'newton-second-law' as const;
  readonly assumptions = [
    '物体视为质点',
    '合外力恒定不变',
    '经典力学范畴 (低速、宏观)',
    '接触面平坦',
  ];
  readonly applicableRange = '适用于恒力作用下的直线或平面加速运动，如水平拉车、推车、牵引等';
  readonly errorSources = [
    '实际外力可能随时间变化',
    '接触面并非理想光滑，摩擦系数可能变化',
    '高速时空气阻力不可忽略',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'force', description: '合外力 (N)', unit: 'N', required: true },
    { name: 'mass', description: '物体质量 (kg)', unit: 'kg', required: true, min: 0 },
    { name: 'duration', description: '模拟时长 (s)', unit: 's', required: true, min: 0 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const body = problem.bodies[0];
    const m = body.mass.value;
    const x0 = body.position;
    const v0 = body.velocity;
    const duration = problem.timeConfig.duration;
    const sampleCount = problem.timeConfig.sampleCount ?? 500;
    const dt = duration / sampleCount;

    // 解析合外力：支持标量 (沿 x 轴) 或向量
    const constraint = problem.constraints?.newtonSecondLaw;
    let F: Vector2D;
    if (constraint) {
      F = typeof constraint.force === 'number'
        ? { x: constraint.force, y: 0 }
        : constraint.force;
    } else {
      F = { x: 0, y: 0 };
    }

    // 可选考虑摩擦力
    const mu = problem.environment?.ground?.friction ?? 0;
    const g = problem.environment?.gravity?.value ?? 9.8;
    if (mu > 0 && (constraint?.includeFriction ?? false)) {
      const N = m * g;
      const fK = mu * N; // 滑动摩擦力大小
      // 摩擦力方向与运动方向相反
      const vDir = v0.x !== 0 ? Math.sign(v0.x) : Math.sign(F.x);
      F = { x: F.x - vDir * fK, y: F.y };
    }

    // 加速度 a = F/m
    const a = Vec2.scale(F, 1 / m);

    // 生成轨迹
    const trajectory: TrajectoryPoint[] = [];
    let maxSpeed = 0;
    for (let i = 0; i <= sampleCount; i++) {
      const t = i * dt;
      const position = Vec2.add(x0, Vec2.add(Vec2.scale(v0, t), Vec2.scale(a, 0.5 * t * t)));
      const velocity = Vec2.add(v0, Vec2.scale(a, t));
      const speed = Vec2.magnitude(velocity);
      maxSpeed = Math.max(maxSpeed, speed);
      trajectory.push({
        t,
        position,
        velocity,
        acceleration: { ...a },
        kineticEnergy: 0.5 * m * speed * speed,
        potentialEnergy: 0,
      });
    }

    // 关键帧
    const keyframes: Keyframe[] = [];
    keyframes.push({
      label: '起始点',
      t: 0,
      position: { ...x0 },
      velocity: { ...v0 },
      description: `物体 m=${m}kg 从 (${x0.x}, ${x0.y})m 以 v=(${v0.x}, ${v0.y})m/s 开始，受合力 F=(${F.x.toFixed(2)}, ${F.y.toFixed(2)})N`,
    });

    // 速度方向反转点 (仅当 F.x 与 v0.x 反向时)
    if (a.x !== 0 && v0.x !== 0 && Math.sign(a.x) !== Math.sign(v0.x)) {
      const tTurn = -v0.x / a.x;
      if (tTurn > 0 && tTurn <= duration) {
        const posTurn = Vec2.add(x0, Vec2.add(Vec2.scale(v0, tTurn), Vec2.scale(a, 0.5 * tTurn * tTurn)));
        keyframes.push({
          label: '速度反向点',
          t: tTurn,
          position: posTurn,
          velocity: { ...Vec2.add(v0, Vec2.scale(a, tTurn)) },
          description: `t=${tTurn.toFixed(3)}s 时速度为零，即将反向加速`,
        });
      }
    }

    const finalFrame = trajectory[trajectory.length - 1];
    keyframes.push({
      label: '终点',
      t: duration,
      position: finalFrame.position,
      velocity: finalFrame.velocity,
      description: `t=${duration}s 时 v=(${finalFrame.velocity.x.toFixed(2)}, ${finalFrame.velocity.y.toFixed(2)})m/s`,
    });

    // 图表
    const x_t: ChartSeries = {
      xLabel: '时间', xUnit: 's', yLabel: 'x 方向位移', yUnit: 'm',
      points: trajectory.map(p => ({ x: p.t, y: p.position.x - x0.x })),
    };
    const v_t: ChartSeries = {
      xLabel: '时间', xUnit: 's', yLabel: 'x 方向速度', yUnit: 'm/s',
      points: trajectory.map(p => ({ x: p.t, y: p.velocity.x })),
    };
    const a_t: ChartSeries = {
      xLabel: '时间', xUnit: 's', yLabel: '加速度', yUnit: 'm/s²',
      points: trajectory.map(p => ({ x: p.t, y: a.x })),
    };
    const F_t: ChartSeries = {
      xLabel: '时间', xUnit: 's', yLabel: '合力', yUnit: 'N',
      points: trajectory.map(p => ({ x: p.t, y: F.x })),
    };
    const ke_t: ChartSeries = {
      xLabel: '时间', xUnit: 's', yLabel: '动能', yUnit: 'J',
      points: trajectory.map(p => ({ x: p.t, y: p.kineticEnergy! })),
    };

    // 受力分析图
    const forceDiagram: ForceDiagram = {
      bodyId: body.id,
      forces: [
        { name: '合外力 F', vector: F, magnitude: Vec2.magnitude(F), unit: 'N' },
      ],
      netForce: F,
    };

    // 步骤说明
    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '由牛顿第二定律求加速度',
        formula: 'a = F / m',
        calculation: `a = ${F.x.toFixed(2)}N / ${m}kg = ${a.x.toFixed(3)} m/s²`,
        result: `a = (${a.x.toFixed(3)}, ${a.y.toFixed(3)}) m/s²`,
      },
      {
        order: 2,
        description: '速度变化规律',
        formula: 'v = v₀ + at',
        calculation: `v = ${v0.x} + ${a.x.toFixed(3)} × ${duration}`,
        result: `v = ${(v0.x + a.x * duration).toFixed(3)} m/s`,
      },
      {
        order: 3,
        description: '位移变化规律',
        formula: 'x = x₀ + v₀t + ½at²',
        calculation: `Δx = ${v0.x} × ${duration} + ½ × ${a.x.toFixed(3)} × ${duration}²`,
        result: `Δx = ${(v0.x * duration + 0.5 * a.x * duration * duration).toFixed(3)} m`,
      },
    ];

    return {
      meta: {
        model: 'newton-second-law',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: { x_t, v_t, a_t, F_t, ke_t, force_diagram: forceDiagram },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          acceleration: Vec2.magnitude(a),
          maxSpeed,
          finalKineticEnergy: finalFrame.kineticEnergy!,
          displacement: Vec2.magnitude(Vec2.sub(finalFrame.position, x0)),
        },
        rangeCheck: { withinRange: true, warnings: [] },
      },
      explanation: {
        summary: `物体 m=${m}kg 受合力 F=(${F.x.toFixed(2)}, ${F.y.toFixed(2)})N 作用，产生加速度 a=(${a.x.toFixed(3)}, ${a.y.toFixed(3)})m/s²`,
        steps,
        formulas: [
          { name: '牛顿第二定律', formula: 'a = F/m', variables: { F: { value: Vec2.magnitude(F), unit: 'N' }, m: { value: m, unit: 'kg' }, a: { value: Vec2.magnitude(a), unit: 'm/s²' } } },
          { name: '速度公式', formula: 'v = v₀ + at', variables: { 'v₀': { value: Vec2.magnitude(v0), unit: 'm/s' }, a: { value: Vec2.magnitude(a), unit: 'm/s²' }, t: { value: duration, unit: 's' } } },
          { name: '位移公式', formula: 'x = x₀ + v₀t + ½at²', variables: { 'v₀': { value: Vec2.magnitude(v0), unit: 'm/s' }, a: { value: Vec2.magnitude(a), unit: 'm/s²' }, t: { value: duration, unit: 's' } } },
        ],
      },
      errors: [],
      warnings: [],
    };
  }
}

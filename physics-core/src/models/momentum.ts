import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ConservedQuantity, ExplanationStep, FormulaUsage } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

/**
 * 动量定理与反冲模型 — 选必一 第一章
 *
 * 两种模式 (由 constraint.mode 决定)：
 *
 * 1. impulse (动量定理)：恒力 F 作用 Δt 时间，展示 F·Δt = Δp = m·Δv
 *    - 输入: force, mass, duration
 *    - 输出: 力-时间图、动量变化、冲量 = 面积
 *
 * 2. recoil (反冲/火箭)：两物体 (M 与 m) 初始静止，内力推开
 *    - 输入: m1 (主体), m2 (喷出物), v2 (喷出物相对速度)
 *    - 输出: 两物体反向运动，总动量守恒 = 0
 *    - 典型: 火箭 (M≫m) 获得向前速度
 */
export class MomentumModel extends PhysicsModelBase {
  readonly name = '动量定理与反冲';
  readonly version = '1.0.0';
  readonly description = '动量定理 F·Δt = Δp 与反冲现象 (动量守恒)';
  readonly modelType = 'momentum' as const;
  readonly assumptions = [
    '系统不受外力 (或外力远小于内力)',
    '一维运动 (沿 x 轴)',
    '碰撞/作用瞬间完成',
  ];
  readonly applicableRange = '动量定理 (恒力冲量)、反冲运动 (火箭、喷气)';
  readonly errorSources = [
    '实际外力 (摩擦、重力) 可能影响动量守恒',
    '喷出物速度分布非均匀',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'mode', description: '模式 (0=动量定理 1=反冲)', unit: '', required: true },
    { name: 'mass', description: '物体质量 (kg)', unit: 'kg', required: true, min: 0 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const mc = problem.constraints?.momentum;
    if (!mc) throw new Error('momentum 模型需要 constraints.momentum 配置');

    if (mc.mode === 'impulse') return this.solveImpulse(problem, mc);
    return this.solveRecoil(problem, mc);
  }

  /** 动量定理：恒力 F 持续 Δt → Δp = F·Δt */
  private solveImpulse(problem: PhysicsProblem, mc: NonNullable<PhysicsProblem['constraints']>['momentum'] & object): SimulationResult {
    const body = problem.bodies[0];
    const m = body.mass.value;
    const F = mc.force ?? 10;
    const v0 = body.velocity.x;
    const duration = problem.timeConfig.duration;
    const sampleCount = problem.timeConfig.sampleCount ?? 500;
    const dt = duration / sampleCount;

    const trajectory: TrajectoryPoint[] = [];
    const pInit = m * v0;
    let pFinal = pInit;

    for (let i = 0; i <= sampleCount; i++) {
      const t = i * dt;
      const v = v0 + (F / m) * t;
      const p = m * v;
      pFinal = p;
      trajectory.push({
        t,
        position: { x: body.position.x + v0 * t + 0.5 * (F / m) * t * t, y: 0 },
        velocity: { x: v, y: 0 },
        acceleration: { x: F / m, y: 0 },
        kineticEnergy: 0.5 * m * v * v,
        potentialEnergy: 0,
      });
    }

    const impulse = F * duration;
    const deltaP = pFinal - pInit;

    const keyframes: Keyframe[] = [
      { label: '起始', t: 0, position: { ...body.position }, velocity: { x: v0, y: 0 }, description: `v₀=${v0.toFixed(2)}m/s, p₀=${pInit.toFixed(2)}kg·m/s` },
      { label: '终点', t: duration, position: trajectory[trajectory.length - 1].position, velocity: { x: v0 + F * duration / m, y: 0 }, description: `v=${(v0 + F * duration / m).toFixed(2)}m/s, Δp=${deltaP.toFixed(2)}kg·m/s` },
    ];

    const F_t: ChartSeries = { xLabel: '时间', yLabel: '力 F', xUnit: 's', yUnit: 'N', points: trajectory.map(p => ({ x: p.t, y: F })) };
    const p_t: ChartSeries = { xLabel: '时间', yLabel: '动量 p', xUnit: 's', yUnit: 'kg·m/s', points: trajectory.map(p => ({ x: p.t, y: m * p.velocity.x })) };
    const v_t: ChartSeries = { xLabel: '时间', yLabel: '速度 v', xUnit: 's', yUnit: 'm/s', points: trajectory.map(p => ({ x: p.t, y: p.velocity.x })) };
    const impulse_t: ChartSeries = {
      xLabel: '时间', yLabel: '累积冲量 J', xUnit: 's', yUnit: 'N·s',
      points: trajectory.map(p => ({ x: p.t, y: F * p.t })),
    };

    return {
      meta: { model: 'momentum', solver: 'analytical', computationTime: 0, timestamp: new Date().toISOString(), version: this.version },
      trajectories: [trajectory],
      keyframes,
      charts: { F_t, p_t, v_t, impulse_t },
      diagnostics: {
        conservedQuantities: [],
        maxValues: { impulse, deltaP, finalMomentum: pFinal, initialMomentum: pInit },
        rangeCheck: { withinRange: true, warnings: [] },
      },
      explanation: {
        summary: `动量定理: F=${F}N 作用 Δt=${duration}s, 冲量 J=${impulse.toFixed(2)}N·s = Δp=${deltaP.toFixed(2)}kg·m/s`,
        steps: [
          { order: 1, description: '冲量定义', formula: 'J = F·Δt', calculation: `J = ${F} × ${duration} = ${impulse.toFixed(2)} N·s` },
          { order: 2, description: '动量定理', formula: 'J = Δp = m·Δv', calculation: `${impulse.toFixed(2)} = ${m} × (${(v0 + F * duration / m).toFixed(2)} - ${v0})` },
          { order: 3, description: '末速度', formula: 'v = v₀ + F·t/m', calculation: `v = ${v0} + ${impulse.toFixed(2)}/${m} = ${(v0 + F * duration / m).toFixed(2)} m/s` },
        ],
        formulas: [
          { name: '动量定理', formula: 'F·Δt = m·Δv', variables: { F: { value: F, unit: 'N' }, 'Δt': { value: duration, unit: 's' }, m: { value: m, unit: 'kg' } } },
          { name: '冲量', formula: 'J = ∫F·dt', variables: { J: { value: impulse, unit: 'N·s' } } },
        ],
      },
      errors: [],
      warnings: [],
    };
  }

  /** 反冲：两物体静止，内力推开 → 总动量守恒 = 0
   * 契约：scene 输入 v2 (物体2碰后速度)；model 内部由 m1·v1 + m2·v2 = 0 推导 v1 (物体1碰后速度)
   * body[0].velocity.x (入参) 被忽略，以模型计算结果为权威值 */
  private solveRecoil(problem: PhysicsProblem, _mc: NonNullable<PhysicsProblem['constraints']>['momentum'] & object): SimulationResult {
    const bodies = problem.bodies;
    if (bodies.length < 2) throw new Error('反冲模式需要两个物体');
    const m1 = bodies[0]!.mass.value;
    const m2 = bodies[1]!.mass.value;
    const v2Final = bodies[1]!.velocity.x; // 物体2碰后速度 (scene 预设
    // 动量守恒: m1·v1 + m2·v2 = 0 → v1 = −m2·v2 / m1
    const v1Final = -(m2 * v2Final) / m1;

    const duration = problem.timeConfig.duration;
    const sampleCount = problem.timeConfig.sampleCount ?? 500;
    const dt = duration / sampleCount;

    const traj1: TrajectoryPoint[] = [];
    const traj2: TrajectoryPoint[] = [];
    const x1Init = bodies[0]!.position.x;
    const x2Init = bodies[1]!.position.x;

    for (let i = 0; i <= sampleCount; i++) {
      const t = i * dt;
      const x1 = x1Init + v1Final * t;
      const x2 = x2Init + v2Final * t;
      traj1.push({ t, position: { x: x1, y: 0 }, velocity: { x: v1Final, y: 0 }, acceleration: { x: 0, y: 0 }, kineticEnergy: 0.5 * m1 * v1Final * v1Final, potentialEnergy: 0 });
      traj2.push({ t, position: { x: x2, y: 0 }, velocity: { x: v2Final, y: 0 }, acceleration: { x: 0, y: 0 }, kineticEnergy: 0.5 * m2 * v2Final * v2Final, potentialEnergy: 0 });
    }

    const keyframes: Keyframe[] = [
      { label: '初始静止', t: 0, position: { x: x1Init, y: 0 }, velocity: { x: 0, y: 0 }, description: `两物体静止: m₁=${m1}kg, m₂=${m2}kg` },
      { label: '分离后', t: duration, position: { x: x1Init + v1Final * duration, y: 0 }, velocity: { x: v1Final, y: 0 }, description: `v₁=${v1Final.toFixed(3)}m/s, v₂=${v2Final.toFixed(3)}m/s, 总动量=0` },
    ];

    const p_t: ChartSeries = {
      xLabel: '时间', yLabel: '总动量', xUnit: 's', yUnit: 'kg·m/s',
      points: traj1.map((p, i) => ({ x: p.t, y: m1 * p.velocity.x + m2 * traj2[i]!.velocity.x })),
    };
    const v1_t: ChartSeries = { xLabel: '时间', yLabel: '物体1速度', xUnit: 's', yUnit: 'm/s', points: traj1.map(p => ({ x: p.t, y: p.velocity.x })) };
    const v2_t: ChartSeries = { xLabel: '时间', yLabel: '物体2速度', xUnit: 's', yUnit: 'm/s', points: traj2.map(p => ({ x: p.t, y: p.velocity.x })) };
    const ke_t: ChartSeries = {
      xLabel: '时间', yLabel: '总动能', xUnit: 's', yUnit: 'J',
      points: traj1.map((p, i) => ({ x: p.t, y: p.kineticEnergy! + traj2[i]!.kineticEnergy! })),
    };

    const conservedQuantities: ConservedQuantity[] = [{
      name: '总动量',
      law: '动量守恒 (系统初始动量为零)',
      initialValue: 0,
      finalValue: m1 * v1Final + m2 * v2Final,
      maxDeviation: Math.abs(m1 * v1Final + m2 * v2Final),
      tolerance: 1e-10,
      conserved: Math.abs(m1 * v1Final + m2 * v2Final) < 1e-10,
    }];

    return {
      meta: { model: 'momentum', solver: 'analytical', computationTime: 0, timestamp: new Date().toISOString(), version: this.version },
      trajectories: [traj1, traj2],
      keyframes,
      charts: { p_t, v_t: v1_t, v1_t, v2_t, ke_t },
      diagnostics: {
        conservedQuantities,
        maxValues: { v1Final, v2Final, massRatio: m1 / m2 },
        rangeCheck: { withinRange: true, warnings: [] },
      },
      explanation: {
        summary: `反冲运动: m₁=${m1}kg 获得 v₁=${v1Final.toFixed(3)}m/s, m₂=${m2}kg 获得 v₂=${v2Final.toFixed(3)}m/s, 总动量守恒 = 0`,
        steps: [
          { order: 1, description: '动量守恒', formula: 'm₁v₁ + m₂v₂ = 0 (初始静止)', calculation: `${m1}×(${v1Final.toFixed(3)}) + ${m2}×${v2Final.toFixed(3)} = 0` },
          { order: 2, description: '速度比', formula: 'v₁/v₂ = −m₂/m₁', calculation: `${v1Final.toFixed(3)}/${v2Final.toFixed(3)} = ${(-m2/m1).toFixed(3)}` },
          { order: 3, description: '动能比', formula: 'E₁/E₂ = m₂/m₁', result: '质量小的物体获得更多动能' },
        ],
        formulas: [
          { name: '动量守恒', formula: 'm₁v₁ + m₂v₂ = 0', variables: { m1: { value: m1, unit: 'kg' }, m2: { value: m2, unit: 'kg' } } },
          { name: '速度比', formula: 'v₁/v₂ = −m₂/m₁', variables: { 'm₂/m₁': { value: m2 / m1, unit: '' } } },
        ],
      },
      errors: [],
      warnings: [],
    };
  }
}

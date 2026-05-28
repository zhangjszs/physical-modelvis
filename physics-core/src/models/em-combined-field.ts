import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

/** 电磁复合场中的带电粒子运动模型 (Lorentz force: F = qE + qv x B) */
export class EMCombinedFieldModel extends PhysicsModelBase {
  readonly name = '电磁复合场';
  readonly version = '1.0.0';
  readonly description = '带电粒子在匀强电场与匀强磁场复合场中的运动（洛伦兹力）';
  readonly modelType = 'em-combined-field' as const;
  readonly assumptions = [
    '电场和磁场均为匀强场且恒定',
    '磁场垂直于运动平面（z 方向）',
    '忽略重力',
    '忽略空气阻力',
    '粒子速度远小于光速',
  ];
  readonly applicableRange = '适用于速度选择器、电磁偏转等复合场场景';
  readonly errorSources = [
    '边缘效应导致场不均匀',
    '高速时需要考虑相对论效应',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'charge', description: '电荷量 (C)', unit: 'C', required: true },
    { name: 'mass', description: '质量 (kg)', unit: 'kg', required: true, min: 1e-30 },
    { name: 'electricFieldY', description: '电场强度 y 分量 (N/C)', unit: 'N/C', required: true },
    { name: 'magneticFieldZ', description: '磁感应强度 z 分量 (T)', unit: 'T', required: true },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const body = problem.bodies[0]!;
    const q = body.charge?.value ?? 1.6e-19;
    const m = body.mass.value;
    const x0 = body.position;
    const v0 = body.velocity;

    const E = problem.environment?.electricField?.fieldVector ?? { x: 0, y: 0 };
    const Bz = problem.environment?.magneticField?.fieldStrength ?? 0;

    const duration = problem.timeConfig.duration;
    const sampleCount = problem.timeConfig.sampleCount ?? 1000;
    const dt = duration / sampleCount;

    const isPureElectric = Math.abs(Bz) < 1e-12;
    const isPureMagnetic = Math.abs(E.x) < 1e-12 && Math.abs(E.y) < 1e-12;
    const isVelocitySelector = !isPureElectric && !isPureMagnetic
      && Math.abs(E.x) < 1e-12 && Math.abs(Bz) > 1e-12;

    // Velocity selector: v = E/B -> straight line when v perp B and E perp v
    if (isVelocitySelector) {
      return this.solveVelocitySelector(problem, q, m, x0, v0, E, Bz, duration, sampleCount, dt);
    }

    // General case: Boris algorithm numerical integration
    return this.solveBoris(problem, q, m, x0, v0, E, Bz, duration, sampleCount, dt);
  }

  /** Velocity selector: E perp B, particle with v = E/B goes straight */
  private solveVelocitySelector(
    problem: PhysicsProblem,
    q: number,
    m: number,
    x0: { x: number; y: number },
    v0: { x: number; y: number },
    E: { x: number; y: number },
    Bz: number,
    duration: number,
    sampleCount: number,
    dt: number,
  ): SimulationResult {
    const vSelector = Math.abs(E.y / Bz);

    // Check if initial velocity matches selector speed
    const vxMatch = Math.abs(v0.x - vSelector) < vSelector * 0.01
      || Math.abs(v0.x + vSelector) < vSelector * 0.01;
    const vySmall = Math.abs(v0.y) < vSelector * 0.01;
    const goesStraight = vxMatch && vySmall;

    if (!goesStraight) {
      return this.solveBoris(problem, q, m, x0, v0, E, Bz, duration, sampleCount, dt);
    }

    // Straight line at constant velocity
    const trajectory: TrajectoryPoint[] = [];
    for (let i = 0; i <= sampleCount; i++) {
      const t = i * dt;
      const position = Vec2.add(x0, Vec2.scale(v0, t));
      trajectory.push({
        t,
        position,
        velocity: { ...v0 },
        acceleration: Vec2.zero(),
        kineticEnergy: 0.5 * m * Vec2.magnitude(v0) ** 2,
        potentialEnergy: -q * E.y * position.y,
      });
    }

    const finalPos = trajectory[trajectory.length - 1]!.position;
    const keyframes: Keyframe[] = [
      {
        label: '起始点',
        t: 0,
        position: { ...x0 },
        velocity: { ...v0 },
        description: `带电粒子以速度 (${v0.x.toFixed(2)}, ${v0.y.toFixed(2)}) m/s 进入速度选择器`,
      },
      {
        label: '速度选择条件',
        t: 0,
        position: { ...x0 },
        velocity: { ...v0 },
        description: `v = E/B = ${vSelector.toFixed(2)} m/s，粒子做匀速直线运动`,
      },
      {
        label: '终点',
        t: duration,
        position: finalPos,
        velocity: trajectory[trajectory.length - 1]!.velocity,
        description: `t=${duration}s 时到达 (${finalPos.x.toFixed(3)}, ${finalPos.y.toFixed(3)})`,
      },
    ];

    return this.buildResult(trajectory, keyframes, 'analytical', q, m, x0, v0, E, Bz, duration);
  }

  /**
   * Boris algorithm for general E+B fields.
   *
   * The Boris integrator is a symplectic, second-order method:
   *   1. v- = v_n + (q/m)*E * dt/2           (half electric kick)
   *   2. t  = (q/m)*B * dt/2                  (rotation vector)
   *   3. s  = 2t / (1 + t*t)                  (rotation factor)
   *   4. v' = v- + (v- x t)                   (first cross product)
   *   5. v+ = v- + (v' x s)                   (second cross product)
   *   6. v_{n+1} = v+ + (q/m)*E * dt/2       (half electric kick)
   *
   * For B = (0,0,Bz) in 2D:
   *   v x t = (vy*tz, -vx*tz)
   */
  private solveBoris(
    _problem: PhysicsProblem,
    q: number,
    m: number,
    x0: { x: number; y: number },
    v0: { x: number; y: number },
    E: { x: number; y: number },
    Bz: number,
    duration: number,
    sampleCount: number,
    dt: number,
  ): SimulationResult {
    const halfDt = 0.5 * dt;
    const qm = q / m;
    const tz = qm * Bz * halfDt;
    const sz = (2 * tz) / (1 + tz * tz);

    let px = x0.x;
    let py = x0.y;
    let vx = v0.x;
    let vy = v0.y;

    const trajectory: TrajectoryPoint[] = [];

    for (let i = 0; i <= sampleCount; i++) {
      const t = i * dt;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const pe = -q * (E.x * px + E.y * py);

      trajectory.push({
        t,
        position: { x: px, y: py },
        velocity: { x: vx, y: vy },
        acceleration: {
          x: qm * (E.x + vy * Bz),
          y: qm * (E.y - vx * Bz),
        },
        kineticEnergy: 0.5 * m * speed * speed,
        potentialEnergy: pe,
      });

      if (i === sampleCount) break;

      // Step 1: half electric kick -> v-
      let vMinusX = vx + qm * E.x * halfDt;
      let vMinusY = vy + qm * E.y * halfDt;

      // Step 2-3: rotation via Boris (B along z)
      // v' = v- + (v- x t), where v x t = (vy*tz, -vx*tz)
      const vPrimeX = vMinusX + vMinusY * tz;
      const vPrimeY = vMinusY - vMinusX * tz;

      // v+ = v- + (v' x s)
      const vPlusX = vMinusX + vPrimeY * sz;
      const vPlusY = vMinusY - vPrimeX * sz;

      // Step 4: half electric kick -> v_{n+1}
      vx = vPlusX + qm * E.x * halfDt;
      vy = vPlusY + qm * E.y * halfDt;

      // Update position
      px += vx * dt;
      py += vy * dt;
    }

    const finalPos = trajectory[trajectory.length - 1]!.position;
    const v0Mag = Vec2.magnitude(v0);

    const keyframes: Keyframe[] = [
      {
        label: '起始点',
        t: 0,
        position: { ...x0 },
        velocity: { ...v0 },
        description: `带电粒子从 (${x0.x}, ${x0.y}) 以速度 ${v0Mag.toFixed(2)} m/s 进入电磁复合场`,
      },
    ];

    // Detect turning points if there is a y-electric field component
    if (Math.abs(qm * E.y) > 1e-10) {
      const tTurn = -v0.y / (qm * E.y);
      if (tTurn > 0 && tTurn <= duration) {
        keyframes.push({
          label: 'y 方向转折点',
          t: tTurn,
          position: x0,
          velocity: { x: v0.x, y: 0 },
          description: `t≈${tTurn.toFixed(4)}s 时竖直速度分量趋近零`,
        });
      }
    }

    keyframes.push({
      label: '终点',
      t: duration,
      position: finalPos,
      velocity: trajectory[trajectory.length - 1]!.velocity,
      description: `t=${duration}s 时到达 (${finalPos.x.toFixed(3)}, ${finalPos.y.toFixed(3)})`,
    });

    return this.buildResult(trajectory, keyframes, 'numerical', q, m, x0, v0, E, Bz, duration);
  }

  private buildResult(
    trajectory: TrajectoryPoint[],
    keyframes: Keyframe[],
    solver: 'analytical' | 'numerical',
    q: number,
    m: number,
    x0: { x: number; y: number },
    v0: { x: number; y: number },
    E: { x: number; y: number },
    Bz: number,
    duration: number,
  ): SimulationResult {
    const finalPos = trajectory[trajectory.length - 1]!.position;
    const initialKE = trajectory[0]?.kineticEnergy ?? 0;
    const initialPE = trajectory[0]?.potentialEnergy ?? 0;
    const finalKE = trajectory[trajectory.length - 1]?.kineticEnergy ?? 0;
    const finalPE = trajectory[trajectory.length - 1]?.potentialEnergy ?? 0;
    const initialTotal = initialKE + initialPE;
    const finalTotal = finalKE + finalPE;
    const maxDeviation = Math.abs(finalTotal - initialTotal) / (Math.abs(initialTotal) || 1);

    const x_t: ChartSeries = {
      xLabel: '时间', yLabel: 'x 位移', xUnit: 's', yUnit: 'm',
      points: trajectory.map(p => ({ x: p.t, y: p.position.x })),
    };
    const y_t: ChartSeries = {
      xLabel: '时间', yLabel: 'y 位移', xUnit: 's', yUnit: 'm',
      points: trajectory.map(p => ({ x: p.t, y: p.position.y })),
    };
    const v_t: ChartSeries = {
      xLabel: '时间', yLabel: '速率', xUnit: 's', yUnit: 'm/s',
      points: trajectory.map(p => ({ x: p.t, y: Vec2.magnitude(p.velocity) })),
    };
    const energy_t: ChartSeries = {
      xLabel: '时间', yLabel: '能量', xUnit: 's', yUnit: 'J',
      points: trajectory.map(p => ({
        x: p.t,
        y: (p.kineticEnergy ?? 0) + (p.potentialEnergy ?? 0),
      })),
    };

    const E_mag = Vec2.magnitude(E);
    const vSelector = Math.abs(Bz) > 1e-12 ? Math.abs(E.y / Bz) : 0;
    const tolerance = solver === 'analytical' ? 1e-6 : 1e-2;

    return {
      meta: {
        model: 'em-combined-field',
        solver,
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: { x_t, y_t, v_t, energy_t },
      diagnostics: {
        conservedQuantities: [
          {
            name: '总能量（动能+电势能）',
            law: '能量守恒（磁场力不做功）',
            initialValue: initialTotal,
            finalValue: finalTotal,
            maxDeviation,
            tolerance,
            conserved: maxDeviation < tolerance,
          },
        ],
        maxValues: {
          maxSpeed: Math.max(...trajectory.map(p => Vec2.magnitude(p.velocity))),
          maxDistance: Vec2.magnitude(Vec2.sub(finalPos, x0)),
          ...(vSelector > 0 ? { velocitySelectorSpeed: vSelector } : {}),
        },
        rangeCheck: { withinRange: true, warnings: [] },
      },
      explanation: {
        summary: `带电粒子 (q=${q}C, m=${m}kg) 在电磁复合场中运动：E=(${E.x}, ${E.y}) N/C, B=${Bz}T`,
        steps: [
          { order: 1, description: '电场力', formula: 'Fe = qE', calculation: `Fe = (${(q * E.x).toExponential(2)}, ${(q * E.y).toExponential(2)}) N` },
          { order: 2, description: '洛伦兹力', formula: 'F = qE + qv x B' },
          { order: 3, description: '运动方程', formula: 'ma = qE + qv x B', calculation: solver === 'analytical' ? '解析解（速度选择器）' : 'Boris 算法数值积分' },
          ...(vSelector > 0 ? [{ order: 4, description: '速度选择器', formula: 'v = E/B', calculation: `v = ${vSelector.toFixed(4)} m/s` }] : []),
        ],
        formulas: [
          { name: '洛伦兹力', formula: 'F = qE + qv x B', variables: { q: { value: q, unit: 'C' }, E: { value: E_mag, unit: 'N/C' }, B: { value: Math.abs(Bz), unit: 'T' } } },
          { name: '加速度', formula: 'a = (qE + qv x B) / m', variables: { a: { value: initialAccelMag(E, v0, Bz, q, m), unit: 'm/s^2' } } },
          ...(vSelector > 0 ? [{ name: '速度选择器', formula: 'v = E/B', variables: { v: { value: vSelector, unit: 'm/s' }, E: { value: Math.abs(E.y), unit: 'N/C' }, B: { value: Math.abs(Bz), unit: 'T' } } }] : []),
        ],
      },
      errors: [],
      warnings: [],
    };
  }
}

function initialAccelMag(E: { x: number; y: number }, v: { x: number; y: number }, Bz: number, q: number, m: number): number {
  const fx = q * E.x + q * v.y * Bz;
  const fy = q * E.y - q * v.x * Bz;
  return Math.sqrt(fx * fx + fy * fy) / m;
}

import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries } from '../types/result.js';
import type { ParameterSpec, Vector2D } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

/**
 * 万有引力与航天模型 — 行星/卫星轨道 (必修二 第三章)
 *
 * 牛顿万有引力 F = G·M·m / r²
 * 运动方程：a = −G·M / r³ · r_vec (指向地心)
 *
 * 采用 Velocity Verlet 数值积分 (辛积分，长期能量漂移小)
 *
 * 关键物理量：
 *   轨道速度 (圆轨道)：v = √(GM / r)
 *   逃逸速度：v_e = √(2GM / r)
 *   轨道周期 (圆)：T = 2π√(r³ / GM)
 *   第一宇宙速度 (近地圆轨道)：v₁ = √(gR) ≈ 7.9 km/s
 *   第二宇宙速度 (地表逃逸)：v₂ = √(2gR) ≈ 11.2 km/s
 */
export class OrbitalModel extends PhysicsModelBase {
  readonly name = '万有引力与航天';
  readonly version = '1.0.0';
  readonly description = '天体在万有引力作用下的轨道运动 (牛顿万万有引力定律)';
  readonly modelType = 'orbital' as const;
  readonly assumptions = [
    '中心天体静止 (M ≫ m)',
    '只考虑万有引力 (忽略其他天体摄动)',
    '质点模型 (r ≫ 天体自身半径时)',
    '经典力学 (v ≪ c)',
  ];
  readonly applicableRange = '行星/卫星绕中心天体的运动、宇宙速度计算、开普勒定律演示';
  readonly errorSources = [
    '实际轨道受其他天体引力摄动',
    '中心天体非球对称引力场 (地球扁率等)',
    '高速下相对论效应微弱但存在',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'GM', description: '中心天体引力参数 (m³/s²)', unit: 'm³/s²', required: true },
    { name: 'radius', description: '初始距离 (m)', unit: 'm', required: true, min: 0 },
    { name: 'v0', description: '初始切向速度 (m/s)', unit: 'm/s', required: true },
    { name: 'duration', description: '模拟时长 (s)', unit: 's', required: true, min: 0 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const body = problem.bodies[0];
    const m = body.mass.value;
    const r0 = body.position;
    const v0 = body.velocity;
    const duration = problem.timeConfig.duration;
    const sampleCount = problem.timeConfig.sampleCount ?? 1000;
    const dt = duration / sampleCount;

    // 引力参数 GM (从约束获取或默认地球)
    const oc = problem.constraints?.orbital;
    const GM = oc?.GM ?? 3.986e14; // 地球 GM (m³/s²)

    // ===== Velocity Verlet 数值积分 =====
    // a(r) = −GM / r³ · r_vec
    const accel = (r: Vector2D): Vector2D => {
      const rMag = Vec2.magnitude(r);
      if (rMag < 1) return { x: 0, y: 0 };
      const factor = -GM / (rMag * rMag * rMag);
      return { x: r.x * factor, y: r.y * factor };
    };

    const trajectory: TrajectoryPoint[] = [];
    let r: Vector2D = { ...r0 };
    let v: Vector2D = { ...v0 };
    let a = accel(r);
    let minR = Vec2.magnitude(r0);
    let maxR = minR;
    let minV = Vec2.magnitude(v0);
    let maxV = minV;

    for (let i = 0; i <= sampleCount; i++) {
      const t = i * dt;
      const speed = Vec2.magnitude(v);
      const rMag = Vec2.magnitude(r);
      const ke = 0.5 * m * speed * speed;
      const pe = -GM * m / rMag; // 引力势能零点选在无穷远
      minR = Math.min(minR, rMag);
      maxR = Math.max(maxR, rMag);
      minV = Math.min(minV, speed);
      maxV = Math.max(maxV, speed);

      trajectory.push({
        t,
        position: { ...r },
        velocity: { ...v },
        acceleration: { ...a },
        kineticEnergy: ke,
        potentialEnergy: pe,
      });

      // Velocity Verlet 步进
      if (i < sampleCount) {
        // r(t+dt) = r(t) + v(t)·dt + ½a(t)·dt²
        r = Vec2.add(r, Vec2.add(Vec2.scale(v, dt), Vec2.scale(a, 0.5 * dt * dt)));
        const aNew = accel(r);
        // v(t+dt) = v(t) + ½(a(t) + a(t+dt))·dt
        v = Vec2.add(v, Vec2.scale(Vec2.add(a, aNew), 0.5 * dt));
        a = aNew;
      }
    }

    // 近地点 / 远地点 (通过 r 的局部极值)
    const keyframes: Keyframe[] = [];
    keyframes.push({
      label: '初始位置',
      t: 0,
      position: trajectory[0]!.position,
      velocity: trajectory[0]!.velocity,
      description: `初始距离 r₀=${(Vec2.magnitude(r0)/1000).toFixed(1)}km, v₀=${(Vec2.magnitude(v0)/1000).toFixed(2)}km/s`,
    });

    // 检测近地点与远地点
    if (trajectory.length > 2) {
      for (let i = 1; i < trajectory.length - 1; i++) {
        const rPrev = Vec2.magnitude(trajectory[i - 1]!.position);
        const rCurr = Vec2.magnitude(trajectory[i]!.position);
        const rNext = Vec2.magnitude(trajectory[i + 1]!.position);
        if (rCurr < rPrev && rCurr < rNext) {
          const p = trajectory[i]!;
          const vMag = Vec2.magnitude(p.velocity);
          keyframes.push({
            label: keyframes.some(k => k.label === '近地点') ? '近地点2' : '近地点',
            t: p.t,
            position: p.position,
            velocity: p.velocity,
            description: `近地点: r_min=${(rCurr/1000).toFixed(1)}km, v_max=${(vMag/1000).toFixed(2)}km/s (开普勒第二定律:近地点速度最大)`,
          });
        } else if (rCurr > rPrev && rCurr > rNext) {
          const p = trajectory[i]!;
          const vMag = Vec2.magnitude(p.velocity);
          keyframes.push({
            label: keyframes.some(k => k.label.startsWith('远地点')) ? '远地点2' : '远地点',
            t: p.t,
            position: p.position,
            velocity: p.velocity,
            description: `远地点: r_max=${(rCurr/1000).toFixed(1)}km, v_min=${(vMag/1000).toFixed(2)}km/s`,
          });
        }
      }
    }

    const last = trajectory[trajectory.length - 1];
    keyframes.push({
      label: '模拟终点',
      t: duration,
      position: last.position,
      velocity: last.velocity,
      description: `t=${duration}s 时位置 (${(last.position.x/1000).toFixed(1)}, ${(last.position.y/1000).toFixed(1)}) km`,
    });

    // 宇宙速度参考
    const r0Mag = Vec2.magnitude(r0);
    const vOrbit = Math.sqrt(GM / r0Mag);
    const vEscape = Math.sqrt(2 * GM / r0Mag);
    const TOrbit = 2 * Math.PI * Math.sqrt(r0Mag * r0Mag * r0Mag / GM);

    // 图表
    const r_t: ChartSeries = {
      xLabel: '时间', yLabel: '距离', xUnit: 's', yUnit: 'km',
      points: trajectory.map(p => ({ x: p.t, y: Vec2.magnitude(p.position) / 1000 })),
    };
    const v_t: ChartSeries = {
      xLabel: '时间', yLabel: '速度', xUnit: 's', yUnit: 'km/s',
      points: trajectory.map(p => ({ x: p.t, y: Vec2.magnitude(p.velocity) / 1000 })),
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
      meta: { model: 'orbital', solver: 'numerical', computationTime: 0, timestamp: new Date().toISOString(), version: this.version },
      trajectories: [trajectory],
      keyframes,
      charts: { r_t, v_t, ke_t, pe_t, energy_t },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          vOrbit: vOrbit / 1000,
          vEscape: vEscape / 1000,
          orbitPeriod: TOrbit,
          minR: minR / 1000,
          maxR: maxR / 1000,
          maxSpeed: maxV / 1000,
          minSpeed: minV / 1000,
        },
        rangeCheck: { withinRange: true, warnings: [] },
      },
      explanation: {
        summary: `万有引力作用下轨道运动: r₀=${(r0Mag/1000).toFixed(0)}km, 宇宙轨道速度 v=${(vOrbit/1000).toFixed(2)}km/s, 逃逸速度 v_e=${(vEscape/1000).toFixed(2)}km/s, 参考周期 T=${(TOrbit/60).toFixed(1)}min`,
        steps: [
          { order: 1, description: '近地圆轨道速度', formula: 'v₁ = √(gR)', calculation: `v₁ = √(9.8 × 6.371×10⁶) ≈ 7.9 km/s`, result: '第一宇宙速度 ≈ 7.9 km/s (航天器入轨最低速度)' },
          { order: 2, description: '逃逸速度', formula: 'v_e = √(2GM/r)', calculation: `v_e = √(2×${(GM).toExponential(2)}/${r0Mag.toExponential(2)})`, result: `v_e = ${(vEscape/1000).toFixed(2)} km/s` },
          { order: 3, description: '圆轨道周期', formula: 'T = 2π√(r³/GM)', calculation: `T = 2π√(${r0Mag.toExponential(2)}³/${(GM).toExponential(2)})`, result: `T = ${(TOrbit/60).toFixed(1)} min` },
          { order: 4, description: '开普勒第二定律', formula: '近地点速度大, 远地点速度小', calculation: `v_max=${(maxV/1000).toFixed(2)}km/s (近地点), v_min=${(minV/1000).toFixed(2)}km/s (远地点)` },
        ],
        formulas: [
          { name: '万有引力', formula: 'F = GMm/r²', variables: { GM: { value: GM, unit: 'm³/s²' } } },
          { name: '轨道速度', formula: 'v = √(GM/r)', variables: { v: { value: vOrbit, unit: 'm/s' } } },
          { name: '逃逸速度', formula: 'v_e = √(2GM/r)', variables: { 'v_e': { value: vEscape, unit: 'm/s' } } },
          { name: '轨道周期', formula: 'T = 2π√(r³/GM)', variables: { T: { value: TOrbit, unit: 's' } } },
        ],
      },
      errors: [],
      warnings: [],
    };
  }
}

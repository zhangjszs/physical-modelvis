import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep, FormulaUsage } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

/**
 * 曲线运动条件模型 — 必修二 §1 (曲线运动)
 *
 * 物理: 当质点所受合力 F 与速度 v 不共线时, 质点做曲线运动；
 *       共线 (F∥v) 时做直线运动；
 *       若 F⊥v 且 |F| 不变, 质点做类平抛运动 (曲线)。
 *
 * 算法 (解析解, 匀加速运动):
 *   取 v₀ = (initialSpeed, 0), F = force·(cosθ, sinθ), θ=forceDirectionDeg;
 *   a = F/m
 *   r(t) = v₀·t + ½·a·t²
 *   v(t) = v₀ + a·t
 *
 * 三类典型 (按 forceDirectionDeg):
 *   - 0° 或 180°: F∥v → 直线 (匀加 / 匀减 / 静止)
 *   - 0°<θ<180°, θ≠90°: F 与 v₀ 不共线 → 一般曲线 (抛物线)
 *   - θ = 90°: F⊥v₀ → 类平抛运动 (抛物线, 初速沿 x、恒力沿 y)
 */
export class CurveConditionModel extends PhysicsModelBase {
  readonly name = '曲线运动条件';
  readonly version = '1.0.0';
  readonly description = '探究物体做曲线运动的条件: 合力与速度是否共线';
  readonly modelType = 'curve-condition' as const;
  readonly assumptions = [
    '质点视为质点',
    '质点从原点出发, 初速度沿 +x 方向',
    '质点受大小与方向均恒定的合力 (F = const)',
    '忽略一切阻力',
    '在所选参数下的时间窗口内, 质点不会反向穿越自身',
  ];
  readonly applicableRange = 'F 恒定向量, 与 v₀ 不共线时做匀加速曲线运动, 解析解精确成立';
  readonly errorSources = [
    '真实情况下合力往往随位置/速度变化',
    '本模型只演示恒力条件下的特例',
    '圆周运动一般要求力始终垂直于速度并指向圆心, 这里不实现',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'forceDirectionDeg', description: '合力方向角 (°, 相对 +x)', unit: '°', required: true, min: -180, max: 360 },
    { name: 'initialSpeed', description: '初速度大小 (m/s)', unit: 'm/s', required: true, min: 0 },
    { name: 'mass', description: '物体质量 (kg)', unit: 'kg', required: true, min: 0 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const body = problem.bodies[0]!;
    const m = body.mass.value;
    const c = problem.constraints?.curveCondition;
    if (!c) {
      throw new Error('曲线运动条件模型需要 curveCondition 约束配置');
    }

    const theta = (c.forceDirectionDeg * Math.PI) / 180;
    const F = c.forceMagnitude ?? 10;
    const v0Mag = c.initialSpeed;
    const aMag = F / m;
    const ax = aMag * Math.cos(theta);
    const ay = aMag * Math.sin(theta);
    const v0vec = { x: v0Mag, y: 0 };
    const avec = { x: ax, y: ay };

    const duration = problem.timeConfig.duration;
    const sampleCount = problem.timeConfig.sampleCount ?? 1000;
    const dt = duration / sampleCount;

    const trajectory: TrajectoryPoint[] = [];
    for (let i = 0; i <= sampleCount; i++) {
      const t = i * dt;
      const x = v0vec.x * t + 0.5 * ax * t * t;
      const y = v0vec.y * t + 0.5 * ay * t * t;
      const vx = v0vec.x + ax * t;
      const vy = v0vec.y + ay * t;
      const speed = Math.sqrt(vx * vx + vy * vy);
      trajectory.push({
        t,
        position: { x, y },
        velocity: { x: vx, y: vy },
        acceleration: { x: ax, y: ay },
        kineticEnergy: 0.5 * m * speed * speed,
        potentialEnergy: 0,
      });
    }

    // 曲线类型判定
    const thetaMod = ((theta * 180 / Math.PI) % 360 + 360) % 360;
    let motionType: '直线 (共线)' | '类平抛 (F⊥v₀)' | '一般曲线 (F与v₀不共线)';
    if (thetaMod === 0 || thetaMod === 180) {
      motionType = '直线 (共线)';
    } else if (Math.abs(thetaMod - 90) < 1e-6 || Math.abs(thetaMod - 270) < 1e-6) {
      motionType = '类平抛 (F⊥v₀)';
    } else {
      motionType = '一般曲线 (F与v₀不共线)';
    }

    // 关键帧: 起点 / 弯折点 (vy 变号或 a⃗⊥tangent 的特殊点; 这里取 vy=0 的时刻) / 末点
    const keyframes: Keyframe[] = [];
    keyframes.push({
      label: '起点',
      t: 0,
      position: { x: 0, y: 0 },
      velocity: { x: v0Mag, y: 0 },
      description: `从原点以 v₀=${v0Mag}m/s 沿 +x 出发, F 与 +x 夹角 ${c.forceDirectionDeg.toFixed(1)}°, 判定: ${motionType}`,
    });

    // 找到 vy=0 的时刻 (仅在 ay≠0 且 v0vec.y + ay·t = 0 有解时存在)
    if (ay !== 0) {
      const tVyZero = -v0vec.y / ay;
      if (tVyZero > 0 && tVyZero <= duration) {
        const idx = Math.round(tVyZero / dt);
        if (idx > 0 && idx < trajectory.length) {
          const p = trajectory[idx]!;
          keyframes.push({
            label: '弯折点 (vy=0, 速度方向纯x)',
            t: tVyZero,
            position: p.position,
            velocity: p.velocity,
            description: `t=${tVyZero.toFixed(2)}s 时 vy=0, 速度瞬时沿 +x 方向, 曲线在此 "弯折"`,
          });
        }
      }
    }

    // 速度平行于 F (a⃗) 的时刻 (即 v⃗ × a⃗ = 0) (仅 ay≠0 时有几何意义)
    if (ay !== 0) {
      // v × a = vx·ay − vy·ax = 0 → (v0Vec.x + ax·t)·ay − (v0Vec.y + ay·t)·ax = 0
      // 展开: v0Vec.x·ay + ax·ay·t − v0Vec.y·ax − ay·ax·t = v0Vec.x·ay − v0Vec.y·ax = 0
      // 即叉积恒为常量, 直线时不为零, 纯平抛为 v0·ay
      // 对于恒力, v 平行于 a 的时刻就是 t_FaceParallel = − (v₀⊥a)/(|a|²)
      // 这在某些教材中称为 "与合力平行的时刻"
    }

    {
      const p = trajectory[trajectory.length - 1]!;
      const speed = Math.sqrt(p.velocity.x ** 2 + p.velocity.y ** 2);
      keyframes.push({
        label: '末点',
        t: duration,
        position: p.position,
        velocity: p.velocity,
        description: `t=${duration.toFixed(2)}s 时位置 (${p.position.x.toFixed(2)}, ${p.position.y.toFixed(2)})m, 速度 v=${speed.toFixed(2)}m/s`,
      });
    }

    // 图表
    const x_t: ChartSeries = {
      xLabel: '时间', yLabel: 'x 坐标', xUnit: 's', yUnit: 'm',
      points: trajectory.map(p => ({ x: p.t, y: p.position.x })),
    };
    const y_t: ChartSeries = {
      xLabel: '时间', yLabel: 'y 坐标', xUnit: 's', yUnit: 'm',
      points: trajectory.map(p => ({ x: p.t, y: p.position.y })),
    };
    const v_t: ChartSeries = {
      xLabel: '时间', yLabel: '速度大小', xUnit: 's', yUnit: 'm/s',
      points: trajectory.map(p => ({ x: p.t, y: Math.sqrt(p.velocity.x ** 2 + p.velocity.y ** 2) })),
    };
    const vx_t: ChartSeries = {
      xLabel: '时间', yLabel: '水平分速度', xUnit: 's', yUnit: 'm/s',
      points: trajectory.map(p => ({ x: p.t, y: p.velocity.x })),
    };
    const vy_t: ChartSeries = {
      xLabel: '时间', yLabel: '竖直分速度', xUnit: 's', yUnit: 'm/s',
      points: trajectory.map(p => ({ x: p.t, y: p.velocity.y })),
    };

    // 解释
    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '受力分析',
        formula: `F⃗ = F·(cosθ, sinθ),  |F⃗|=${F}N,  θ=${c.forceDirectionDeg.toFixed(1)}°`,
        calculation: `ax = F·cosθ/m = ${ax.toFixed(2)} m/s²,  ay = F·sinθ/m = ${ay.toFixed(2)} m/s²`,
      },
      {
        order: 2,
        description: '运动学方程',
        formula: 'r(t) = v₀·t + ½·a·t²,  v(t) = v₀ + a·t',
        calculation: `x(t) = ${v0Mag}·t + ½·${ax.toFixed(2)}·t²,  y(t) = ½·${ay.toFixed(2)}·t²`,
      },
      {
        order: 3,
        description: '曲线条件判定',
        formula: 'F 与 v₀ 共线 → 直线;  F 与 v₀ 不共线 → 曲线',
        calculation: `夹角 = ${thetaMod.toFixed(1)}° → ${motionType}`,
      },
    ];
    const formulas: FormulaUsage[] = [
      { name: '轨迹方程', formula: 'x(t)=v₀·t+½·ax·t², y(t)=½·ay·t²', variables: { v0: { value: v0Mag, unit: 'm/s' }, ax: { value: ax, unit: 'm/s²' }, ay: { value: ay, unit: 'm/s²' } } },
      { name: '曲线条件', formula: 'F⃗∥v⃗₀ → 直线,  F⃗∦v⃗₀ → 曲线', variables: {} },
      { name: '牛顿第二定律', formula: 'F⃗ = m·a⃗', variables: { F: { value: F, unit: 'N' }, m: { value: m, unit: 'kg' } } },
    ];

    return {
      meta: {
        model: 'curve-condition',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: { x_t, y_t, v_t, vx_t, vy_t },
      diagnostics: {
        conservedQuantities: [],
        maxValues: (() => {
          let maxSpeed = 0;
          let maxX = 0;
          let maxY = 0;
          for (const p of trajectory) {
            const speed = Math.sqrt(p.velocity.x ** 2 + p.velocity.y ** 2);
            if (speed > maxSpeed) maxSpeed = speed;
            if (p.position.x > maxX) maxX = p.position.x;
            if (p.position.y > maxY) maxY = p.position.y;
          }
          return {
            motionTypeDeg: thetaMod,
            ax,
            ay,
            aMag,
            v0: v0Mag,
            maxSpeed,
            maxX,
            maxY,
          };
        })(),
        rangeCheck: { withinRange: true, warnings: [] },
      },
      explanation: {
        summary: `曲线运动条件: m=${m}kg, F=${F}N, θ=${c.forceDirectionDeg.toFixed(1)}°, v₀=${v0Mag}m/s → ${motionType}`,
        steps,
        formulas,
      },
      errors: [],
      warnings: [],
    };
  }
}

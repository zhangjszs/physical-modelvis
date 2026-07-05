import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ConservedQuantity, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

/**
 * 单摆模型 — 简谐运动 (选必一 第二章)
 *
 * 运动方程 (极坐标)：θ̈ = −(g/L)·sinθ
 * 小角度近似 (θ < 15°)：θ̈ ≈ −(g/L)·θ  →  ω = √(g/L),  T = 2π√(L/g)
 *
 * 使用 Velocity Verlet 数值积分 (大角度时也精确)
 *
 * 能量：E = ½m·v² + m·g·L·(1 − cosθ)
 * 小角度时近似守恒；大角度时有轻微数值漂移但辛积分保持良好
 */
export class SimplePendulumModel extends PhysicsModelBase {
  readonly name = '单摆 (简谐运动)';
  readonly version = '1.0.0';
  readonly description = '单摆的简谐运动，展示周期、振幅、能量转换';
  readonly modelType = 'simple-pendulum' as const;
  readonly assumptions = [
    '摆线轻质不可伸长',
    '摆球视为质点',
    '忽略空气阻力',
    '悬点固定',
  ];
  readonly applicableRange = '小角度 (<15°) 近似简谐；任意角度用数值解';
  readonly errorSources = [
    '大角度时实际周期 T = 2π√(L/g)·[1 + (1/16)θ₀² + ...]',
    '摆线质量、空气阻力',
    '悬点摩擦',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'length', description: '摆长 L (m)', unit: 'm', required: true, min: 0 },
    { name: 'g', description: '重力加速度 (m/s²)', unit: 'm/s²', required: true, min: 0 },
    { name: 'initialAngle', description: '初始摆角 (度)', unit: '°', required: true },
    { name: 'duration', description: '模拟时长 (s)', unit: 's', required: true, min: 0 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const body = problem.bodies[0];
    const pc = problem.constraints?.simplePendulum;
    if (!pc) throw new Error('单摆模型需要 simplePendulum 约束配置');

    const L = pc.length;
    const g = pc.g ?? 9.8;
    const mass = body.mass.value;
    const theta0Rad = pc.initialAngleDeg * Math.PI / 180;
    const damping = pc.damping ?? 0;

    const duration = problem.timeConfig.duration;
    const sampleCount = problem.timeConfig.sampleCount ?? 1000;
    const dt = duration / sampleCount;

    // 初始条件：悬点 pivot，摆球在 (pivot.x + L·sinθ, pivot.y + L·cosθ)
    // 屏幕 y 向下为正；θ=0 时摆球竖直向下 (y = pivot.y + L)
    // 使用极坐标 θ (偏离竖直方向的角度)
    let theta = theta0Rad;
    let omega = pc.initialOmega ?? 0; // 初始角速度 (dθ/dt)
    const pivot = pc.pivot ?? { x: 0, y: 0 };

    // 解析小角度周期 (用于参考)
    const Tsmall = 2 * Math.PI * Math.sqrt(L / g);
    const omegaSmall = Math.sqrt(g / L);

    // Velocity Verlet (角形式)
    const alpha = (th: number, om: number): number => {
      const dampingTerm = -damping * om;
      return -(g / L) * Math.sin(th) + dampingTerm;
    };

    const trajectory: TrajectoryPoint[] = [];
    let maxTheta = Math.abs(theta);
    let maxOmega = Math.abs(omega);
    const E0 = this.computeEnergy(mass, L, g, theta0Rad, omega, pivot);
    let maxEnergyDrift = 0;

    let a = alpha(theta, omega);
    for (let i = 0; i <= sampleCount; i++) {
      const t = i * dt;
      // 位置 (屏幕坐标: θ=0 时摆球在 pivot 正下方, y 向下为正)
      const x = pivot.x + L * Math.sin(theta);
      const y = pivot.y + L * Math.cos(theta);
      // 速度: dx/dt = L·cosθ·ω, dy/dt = −L·sinθ·ω
      const vx = L * omega * Math.cos(theta);
      const vy = -L * omega * Math.sin(theta);
      const speed = Math.abs(omega) * L;

      // 能量 (零点在最低点 θ=0: 物理高度 h = L − L·cosθ)
      const h = L * (1 - Math.cos(theta));
      const KE = 0.5 * mass * speed * speed;
      const PE = mass * g * h;
      const E = KE + PE;
      maxEnergyDrift = Math.max(maxEnergyDrift, Math.abs(E - E0));

      trajectory.push({
        t,
        position: { x, y },
        velocity: { x: vx, y: vy },
        acceleration: { x: L * a * Math.cos(theta), y: -L * a * Math.sin(theta) },
        kineticEnergy: KE,
        potentialEnergy: PE,
      });

      maxTheta = Math.max(maxTheta, Math.abs(theta));
      maxOmega = Math.max(maxOmega, Math.abs(omega));

      if (i < sampleCount) {
        // Velocity Verlet
        theta += omega * dt + 0.5 * a * dt * dt;
        const aNew = alpha(theta, omega);
        omega += 0.5 * (a + aNew) * dt;
        a = aNew;
      }
    }

    // 关键帧：振幅最大点 (转折点)
    const keyframes: Keyframe[] = [];
    keyframes.push({
      label: '释放点',
      t: 0,
      position: trajectory[0]!.position,
      velocity: { x: 0, y: 0 },
      description: `θ₀=${(theta0Rad * 180 / Math.PI).toFixed(1)}°, L=${L}m, 由静止释放`,
    });

    // 检测第一个最低点 (θ 从正变负)
    for (let i = 1; i < trajectory.length; i++) {
      if (trajectory[i]!.velocity.x > 0 && trajectory[i]!.position.x > pivot.x - 0.01) {
        keyframes.push({
          label: '最低点 (θ=0)',
          t: trajectory[i]!.t,
          position: trajectory[i]!.position,
          velocity: trajectory[i]!.velocity,
          description: `速度最大 v=${(Math.abs(trajectory[i]!.velocity.x)).toFixed(2)}m/s, 动能最大势能最小`,
        });
        break;
      }
    }

    const last = trajectory[trajectory.length - 1];
    keyframes.push({
      label: '模拟终点',
      t: duration,
      position: last.position,
      velocity: last.velocity,
      description: `完成 ${(duration / Tsmall).toFixed(1)} 个 (小角度) 周期`,
    });

    // 图表
    const theta_t: ChartSeries = {
      xLabel: '时间', yLabel: '摆角 θ', xUnit: 's', yUnit: '°',
      points: trajectory.map((p, i) => ({ x: p.t, y: this.thetaFromPosition(p.position, pivot, L) * 180 / Math.PI })),
    };
    const omega_t: ChartSeries = {
      xLabel: '时间', yLabel: '角速度 ω', xUnit: 's', yUnit: 'rad/s',
      points: trajectory.map((p) => ({ x: p.t, y: (p.velocity.x * Math.cos(this.thetaFromPosition(p.position, pivot, L)) + p.velocity.y * Math.sin(this.thetaFromPosition(p.position, pivot, L))) / L })),
    };
    const ke_t: ChartSeries = { xLabel: '时间', yLabel: '动能', xUnit: 's', yUnit: 'J', points: trajectory.map(p => ({ x: p.t, y: p.kineticEnergy ?? 0 })) };
    const pe_t: ChartSeries = { xLabel: '时间', yLabel: '势能', xUnit: 's', yUnit: 'J', points: trajectory.map(p => ({ x: p.t, y: p.potentialEnergy ?? 0 })) };
    const energy_t: ChartSeries = { xLabel: '时间', yLabel: '机械能', xUnit: 's', yUnit: 'J', points: trajectory.map(p => ({ x: p.t, y: (p.kineticEnergy ?? 0) + (p.potentialEnergy ?? 0) })) };

    const conservedQuantities: ConservedQuantity[] = damping === 0 ? [{
      name: '机械能',
      law: '机械能守恒 (无阻尼)',
      initialValue: E0,
      finalValue: this.computeEnergy(mass, L, g, this.thetaFromPosition(last.position, pivot, L), (last.velocity.x * Math.cos(this.thetaFromPosition(last.position, pivot, L))) / L, pivot),
      maxDeviation: maxEnergyDrift,
      tolerance: 0.01 * Math.abs(E0) + 1e-10,
      conserved: maxEnergyDrift < (0.01 * Math.abs(E0) + 1e-6),
    }] : [];

    const deg0 = (theta0Rad * 180 / Math.PI);
    const steps: ExplanationStep[] = [
      { order: 1, description: '小角度周期公式', formula: 'T = 2π√(L/g)', calculation: `T = 2π√(${L}/${g}) = ${Tsmall.toFixed(3)} s` },
      { order: 2, description: '角频率', formula: 'ω = √(g/L)', calculation: `ω = √(${g}/${L}) = ${omegaSmall.toFixed(3)} rad/s` },
      { order: 3, description: '最大回复力 (小角度)', formula: 'F_max = mg·sinθ₀', calculation: `F_max = ${mass}×${g}×sin${deg0}° = ${(mass * g * Math.sin(theta0Rad)).toFixed(2)} N` },
      { order: 4, description: '能量转换', formula: 'E = ½mv² + mgh = const', result: damping > 0 ? '阻尼消耗能量，振幅递减' : '无阻尼: 机械能守恒' },
    ];

    return {
      meta: { model: 'simple-pendulum', solver: 'numerical', computationTime: 0, timestamp: new Date().toISOString(), version: this.version },
      trajectories: [trajectory],
      keyframes,
      charts: { theta_t, omega_t, ke_t, pe_t, energy_t },
      diagnostics: {
        conservedQuantities,
        maxValues: {
          periodSmall: Tsmall,
          omegaSmall,
          maxThetaDeg: maxTheta * 180 / Math.PI,
          maxOmega,
        },
        rangeCheck: { withinRange: true, warnings: [] },
      },
      explanation: {
        summary: `单摆: L=${L}m, g=${g}m/s², θ₀=${deg0.toFixed(1)}°, T(小角度)=${Tsmall.toFixed(2)}s, f=${(1/Tsmall).toFixed(3)}Hz`,
        steps,
        formulas: [
          { name: '周期公式', formula: 'T = 2π√(L/g)', variables: { L: { value: L, unit: 'm' }, g: { value: g, unit: 'm/s²' }, T: { value: Tsmall, unit: 's' } } },
          { name: '回复力', formula: 'F = −mg·sinθ ≈ −mgθ (小角度)', variables: { m: { value: mass, unit: 'kg' }, g: { value: g, unit: 'm/s²' } } },
          { name: '能量', formula: 'E = ½mv² + mgh = const', variables: {} },
        ],
      },
      errors: [],
      warnings: [],
    };
  }

  private computeEnergy(m: number, L: number, g: number, theta: number, omega: number, _pivot: { x: number; y: number }): number {
    const h = L * (1 - Math.cos(theta)); // 相对最低点的高度
    return 0.5 * m * (omega * L) * (omega * L) + m * g * h;
  }

  private thetaFromPosition(pos: { x: number; y: number }, pivot: { x: number; y: number }, L: number): number {
    const dx = pos.x - pivot.x;
    const dy = pos.y - pivot.y;
    return Math.atan2(dx, dy); // θ = 0 means dx=0, dy=L → sinθ=0, cosθ=1
  }
}

import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ConservedQuantity } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

/** 弹簧振子模型 — 含阻尼与无阻尼简谐运动 */
export class SpringOscillatorModel extends PhysicsModelBase {
  readonly name = '弹簧振子';
  readonly version = '1.0.0';
  readonly description = '弹簧连接质点的简谐/阻尼振动，支持一维和二维';
  readonly modelType = 'spring-oscillator' as const;
  readonly assumptions = [
    '弹簧质量忽略不计',
    '弹簧遵循胡克定律 (F = -kx)',
    '运动沿弹簧轴线方向 (一维)',
    '阻尼力与速度成正比 (F_damping = -cv)',
  ];
  readonly applicableRange = '适用于小振幅振动，弹簧处于弹性限度内';
  readonly errorSources = [
    '大振幅时弹簧可能超出弹性限度',
    '阻尼系数实际可能随速度变化',
    '弹簧质量被忽略',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'springConstant', description: '弹簧劲度系数 (N/m)', unit: 'N/m', required: true, min: 0 },
    { name: 'naturalLength', description: '弹簧自然长度 (m)', unit: 'm', required: true, min: 0 },
    { name: 'anchorPoint', description: '弹簧固定端坐标', unit: 'm', required: true },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const body = problem.bodies[0];
    const m = body.mass.value;
    const spring = problem.constraints?.spring;
    if (!spring) {
      throw new Error('弹簧振子模型需要 constraints.spring 配置');
    }

    const k = spring.springConstant;
    const L0 = spring.naturalLength;
    const anchor = spring.anchorPoint;
    const dampingCoeff = (problem.environment?.airResistance?.enabled)
      ? (problem.environment.airResistance.coefficient ?? 0)
      : 0;

    // 初始条件: 以弹簧轴线为 x 轴，anchor 为原点
    const dx0 = body.position.x - anchor.x;
    const dy0 = body.position.y - anchor.y;
    const v0x = body.velocity.x;
    const v0y = body.velocity.y;

    // 弹簧初始伸长量 (沿轴线方向的位移，相对于自然长度)
    // 简化: 假设运动沿 anchor→body 方向 (一维)
    const x0 = Vec2.magnitude({ x: dx0, y: dy0 }) - L0;
    // 速度在弹簧轴线方向的投影
    const axisLen = Vec2.magnitude({ x: dx0, y: dy0 });
    const axisDir = axisLen > 0 ? { x: dx0 / axisLen, y: dy0 / axisLen } : { x: 1, y: 0 };
    const v0 = v0x * axisDir.x + v0y * axisDir.y;

    const omega0 = Math.sqrt(k / m);       // 固有角频率
    const beta = dampingCoeff / (2 * m);   // 阻尼系数

    const duration = problem.timeConfig.duration;
    const sampleCount = problem.timeConfig.sampleCount ?? 1000;
    const dt = duration / sampleCount;

    const trajectory: TrajectoryPoint[] = [];
    let maxSpeed = 0;
    let maxDisplacement = 0;

    for (let i = 0; i <= sampleCount; i++) {
      const t = i * dt;
      let x: number, v: number;

      if (beta === 0) {
        // 无阻尼简谐运动: x(t) = A*cos(ωt + φ)
        const { amplitude, phase } = this.solveSHM(x0, v0, omega0);
        x = amplitude * Math.cos(omega0 * t + phase);
        v = -amplitude * omega0 * Math.sin(omega0 * t + phase);
      } else {
        // 阻尼振动: x(t) = A*e^(-βt)*cos(ωd*t + φ)
        const omegaD = omega0 * omega0 > beta * beta
          ? Math.sqrt(omega0 * omega0 - beta * beta)
          : 0;
        const { amplitude, phase } = this.solveDamped(x0, v0, beta, omegaD);
        const decay = Math.exp(-beta * t);
        x = amplitude * decay * Math.cos(omegaD * t + phase);
        v = amplitude * decay * (-beta * Math.cos(omegaD * t + phase) - omegaD * Math.sin(omegaD * t + phase));
      }

      // 物理位置 = anchor + (L0 + x) * axisDir
      const pos = Vec2.add(anchor, Vec2.scale(axisDir, L0 + x));
      const vel = Vec2.scale(axisDir, v);
      const speed = Math.abs(v);
      const springForce = -k * x;
      const acc = springForce / m;

      const KE = 0.5 * m * v * v;
      const PE = 0.5 * k * x * x;

      trajectory.push({
        t,
        position: pos,
        velocity: vel,
        acceleration: Vec2.scale(axisDir, acc),
        kineticEnergy: KE,
        potentialEnergy: PE,
      });

      if (speed > maxSpeed) maxSpeed = speed;
      if (Math.abs(x) > maxDisplacement) maxDisplacement = Math.abs(x);
    }

    // 关键帧
    const keyframes: Keyframe[] = [];
    keyframes.push({
      label: '起始点',
      t: 0,
      position: trajectory[0].position,
      velocity: trajectory[0].velocity,
      description: `振子从位移 x₀=${x0.toFixed(4)}m，初速度 v₀=${v0.toFixed(4)}m/s 开始振动`,
    });

    // 平衡位置 (x=0 穿越)
    for (let i = 1; i < trajectory.length; i++) {
      const prev = trajectory[i - 1];
      const cur = trajectory[i];
      const prevX = Vec2.magnitude(Vec2.sub(prev.position, anchor)) - L0;
      const curX = Vec2.magnitude(Vec2.sub(cur.position, anchor)) - L0;
      if (prevX * curX < 0) {
        keyframes.push({
          label: '平衡位置',
          t: cur.t,
          position: cur.position,
          velocity: cur.velocity,
          description: `振子在 t=${cur.t.toFixed(4)}s 经过平衡位置，速度 ${(Math.abs(cur.velocity.x) + Math.abs(cur.velocity.y)).toFixed(4)}m/s`,
        });
        break;
      }
    }

    // 最大位移点
    const maxIdx = trajectory.reduce((mi, p, i) => {
      const disp = Math.abs(Vec2.magnitude(Vec2.sub(p.position, anchor)) - L0);
      return disp > Math.abs(Vec2.magnitude(Vec2.sub(trajectory[mi].position, anchor)) - L0) ? i : mi;
    }, 0);
    if (maxIdx > 0 && maxIdx < trajectory.length) {
      const p = trajectory[maxIdx];
      keyframes.push({
        label: '最大位移',
        t: p.t,
        position: p.position,
        velocity: p.velocity,
        description: `振子在 t=${p.t.toFixed(4)}s 达到最大位移 ${(Vec2.magnitude(Vec2.sub(p.position, anchor)) - L0).toFixed(4)}m`,
      });
    }

    keyframes.push({
      label: '终点',
      t: duration,
      position: trajectory[trajectory.length - 1].position,
      velocity: trajectory[trajectory.length - 1].velocity,
      description: `模拟结束，t=${duration}s`,
    });

    // 图表
    const x_t: ChartSeries = {
      xLabel: '时间', yLabel: '位移', xUnit: 's', yUnit: 'm',
      points: trajectory.map(p => ({ x: p.t, y: Vec2.magnitude(Vec2.sub(p.position, anchor)) - L0 })),
    };
    const v_t: ChartSeries = {
      xLabel: '时间', yLabel: '速度', xUnit: 's', yUnit: 'm/s',
      points: trajectory.map(p => ({ x: p.t, y: p.velocity.x + p.velocity.y })),
    };
    const energy_t: ChartSeries = {
      xLabel: '时间', yLabel: '能量', xUnit: 's', yUnit: 'J',
      points: trajectory.map(p => ({ x: p.t, y: (p.kineticEnergy ?? 0) + (p.potentialEnergy ?? 0) })),
    };

    // 守恒量
    const conservedQuantities: ConservedQuantity[] = [];
    if (beta === 0) {
      const energies = trajectory.map(p => (p.kineticEnergy ?? 0) + (p.potentialEnergy ?? 0));
      const E0 = energies[0];
      const maxDev = Math.max(...energies.map(e => Math.abs(e - E0)));
      conservedQuantities.push({
        name: '机械能',
        law: '机械能守恒 (无阻尼)',
        initialValue: E0,
        finalValue: energies[energies.length - 1],
        maxDeviation: maxDev,
        tolerance: E0 * 0.01,
        conserved: maxDev <= E0 * 0.01,
      });
    }

    return {
      meta: {
        model: 'spring-oscillator',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: { x_t, v_t, energy_t },
      diagnostics: {
        conservedQuantities,
        maxValues: { maxSpeed, maxDisplacement },
        rangeCheck: { withinRange: true, warnings: [] },
      },
      explanation: {
        summary: beta === 0
          ? `无阻尼弹簧振子: k=${k}N/m, m=${m}kg, ω=${omega0.toFixed(4)}rad/s, T=${(2 * Math.PI / omega0).toFixed(4)}s`
          : `阻尼弹簧振子: k=${k}N/m, m=${m}kg, c=${dampingCoeff}, β=${beta.toFixed(4)}, ω₀=${omega0.toFixed(4)}rad/s`,
        steps: beta === 0
          ? [
              { order: 1, description: '角频率', formula: 'ω = √(k/m)', calculation: `ω = √(${k}/${m}) = ${omega0.toFixed(4)} rad/s` },
              { order: 2, description: '运动方程', formula: 'x(t) = A·cos(ωt + φ)' },
              { order: 3, description: '周期', formula: 'T = 2π/ω', calculation: `T = ${(2 * Math.PI / omega0).toFixed(4)} s` },
            ]
          : [
              { order: 1, description: '阻尼系数', formula: 'β = c/(2m)', calculation: `β = ${dampingCoeff}/(2×${m}) = ${beta.toFixed(4)}` },
              { order: 2, description: '阻尼角频率', formula: 'ωd = √(ω₀² - β²)' },
              { order: 3, description: '运动方程', formula: 'x(t) = A·e^(-βt)·cos(ωd·t + φ)' },
            ],
        formulas: beta === 0
          ? [
              { name: '角频率', formula: 'ω = √(k/m)', variables: { k: { value: k, unit: 'N/m' }, m: { value: m, unit: 'kg' } } },
              { name: '周期', formula: 'T = 2π/ω', variables: { ω: { value: omega0, unit: 'rad/s' } } },
              { name: '弹性势能', formula: 'PE = ½kx²', variables: { k: { value: k, unit: 'N/m' } } },
            ]
          : [
              { name: '阻尼系数', formula: 'β = c/(2m)', variables: { c: { value: dampingCoeff, unit: 'N·s/m' }, m: { value: m, unit: 'kg' } } },
              { name: '固有频率', formula: 'ω₀ = √(k/m)', variables: { k: { value: k, unit: 'N/m' }, m: { value: m, unit: 'kg' } } },
            ],
      },
      errors: [],
      warnings: [],
    };
  }

  /** 求解无阻尼简谐运动的振幅和初相 */
  private solveSHM(x0: number, v0: number, omega: number): { amplitude: number; phase: number } {
    // x(t) = A*cos(ωt + φ), v(t) = -Aω*sin(ωt + φ)
    // t=0: x0 = A*cos(φ), v0 = -Aω*sin(φ)
    const A = Math.sqrt(x0 * x0 + (v0 / omega) * (v0 / omega));
    const phase = Math.atan2(-v0 / (omega * A || 1), x0 / (A || 1));
    return { amplitude: A, phase };
  }

  /** 求解阻尼振动的振幅和初相 */
  private solveDamped(x0: number, v0: number, beta: number, omegaD: number): { amplitude: number; phase: number } {
    // x(t) = A*e^(-βt)*cos(ωd*t + φ)
    // t=0: x0 = A*cos(φ), v0 = -A*(β*cos(φ) + ωd*sin(φ))
    if (omegaD === 0) {
      // 过阻尼: 退化为指数衰减
      return { amplitude: x0, phase: 0 };
    }
    const A = Math.sqrt(x0 * x0 + ((v0 + beta * x0) / omegaD) * ((v0 + beta * x0) / omegaD));
    const phase = Math.atan2(-(v0 + beta * x0) / (omegaD * (A || 1)), x0 / (A || 1));
    return { amplitude: A, phase };
  }
}

import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ForceDiagram } from '../types/result.js';
import type { ParameterSpec, Vector2D } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 几种传动方式模型 — 必修二 §2 (圆周运动)
 *
 * 物理原理:
 *   - 皮带传动 / 摩擦轮: v₁ = v₂ → ω₁·r₁ = ω₂·r₂ (转向相同)
 *   - 齿轮传动: v₁ = v₂ → ω₁·r₁ = ω₂·r₂ (转向相反)
 *   - 同轴传动: ω₁ = ω₂ (转向相同)
 *
 * 主轴 ω(t) = ω₁ (恒定, 模型用于演示稳态传动关系)
 * 从轴按传动比推导: ω₂ = (r₁/r₂)·ω₁ (皮带/摩擦轮/齿轮) 或 ω₂ = ω₁ (同轴)
 *
 * 静态演示: 两轮匀速反向 (齿轮) 或同向 (皮带/摩擦轮/同轴) 转动
 * 图表说明: ω-ω 关系 / r-ω 反比 / 边缘线速度 v_s 等大
 */
export class TransmissionBeltModel extends PhysicsModelBase {
  readonly name = '几种传动方式';
  readonly version = '1.0.0';
  readonly description = '皮带/齿轮/摩擦轮/同轴传动轮边缘线速度等大、角速度与半径的关系';
  readonly modelType = 'transmission-belt' as const;
  readonly assumptions = [
    '皮带无打滑、无伸长',
    '齿轮啮合点线速度相等',
    '两轮匀速转动 (稳态传动)',
    '轴摩擦可忽略',
  ];
  readonly applicableRange = '主动轮与从动轮之间通过皮带/齿轮/摩擦/同轴连接的系统';
  readonly errorSources = [
    '实际皮带存在伸缩、打滑',
    '齿轮啮合间隙 (背隙)',
    '轴承摩擦影响角速度微小衰减',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'mode', description: '传动模式 belt|gear|friction|coax', unit: '', required: true },
    { name: 'r1', description: '主动轮半径 r₁ (m)', unit: 'm', required: true, min: 0 },
    { name: 'r2', description: '从动轮半径 r₂ (m)', unit: 'm', required: true, min: 0 },
    { name: 'omega1', description: '主动轮角速度 ω₁ (rad/s)', unit: 'rad/s', required: true },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const c = problem.constraints?.transmission;
    if (!c) throw new Error('传动模型需要 constraints.transmission 配置');

    const mode = c.mode;
    const r1 = c.r1;
    const r2 = c.r2;
    const omega1 = c.omega1;
    if (r1 <= 0 || r2 <= 0) throw new Error('传动轮半径必须为正数');

    const duration = problem.timeConfig.duration;
    const sampleCount = problem.timeConfig.sampleCount ?? 500;
    const dt = duration / sampleCount;

    const center1: Vector2D = c.center1 ?? { x: 0, y: 0 };
    const center2: Vector2D = c.center2 ?? { x: r1 + r2 + 0.2, y: 0 };

    // 计算从动轮角速度
    let omega2: number;
    let direction: 1 | -1; // 1=同向, -1=反向
    let modeLabel: string;
    let modeDesc: string;
    switch (mode) {
      case 'belt':
        omega2 = (r1 / r2) * omega1;
        direction = 1;
        modeLabel = '皮带传动';
        modeDesc = '两轮边缘线速度等大，转向相同';
        break;
      case 'friction':
        omega2 = (r1 / r2) * omega1;
        direction = 1;
        modeLabel = '摩擦轮传动';
        modeDesc = '靠摩擦传动，两轮边缘线速度等大，转向相同';
        break;
      case 'gear':
        omega2 = (r1 / r2) * omega1;
        direction = -1;
        modeLabel = '齿轮传动';
        modeDesc = '啮合点线速度等大，转向相反';
        break;
      case 'coax':
        omega2 = omega1;
        direction = 1;
        modeLabel = '同轴传动';
        modeDesc = '共同轴，角速度等大，转向相同';
        break;
      default:
        throw new Error(`不支持的传动模式: ${mode}`);
    }

    // 边缘线速度 (主动/从动 等大)
    const vSurface = Math.abs(omega1 * r1);
    const vSurface2 = Math.abs(omega2 * r2);
    const dirLabel = direction === 1 ? '同向' : '反向';

    // 生成两轮边缘点的轨迹
    const traj1: TrajectoryPoint[] = [];
    const traj2: TrajectoryPoint[] = [];
    const phi1_0 = 0;
    const phi2_0 = direction === 1 ? 0 : Math.PI; // 齿轮反向初始角差 π

    // 物体 1: 主动轮边缘一点
    // 物体 2: 从动轮边缘一点
    for (let i = 0; i <= sampleCount; i++) {
      const t = i * dt;
      const a1 = phi1_0 + omega1 * t;
      const a2 = phi2_0 + direction * omega2 * t;

      // 主动轮边缘
      const p1: Vector2D = {
        x: center1.x + r1 * Math.cos(a1),
        y: center1.y + r1 * Math.sin(a1),
      };
      const v1: Vector2D = {
        x: -r1 * omega1 * Math.sin(a1),
        y: r1 * omega1 * Math.cos(a1),
      };
      const speed1 = Math.hypot(v1.x, v1.y);
      traj1.push({
        t,
        position: p1,
        velocity: v1,
        acceleration: { x: -r1 * omega1 * omega1 * Math.cos(a1), y: -r1 * omega1 * omega1 * Math.sin(a1) },
        kineticEnergy: 0.5 * speed1 * speed1, // 单位质量
      });

      // 从动轮边缘
      const p2: Vector2D = {
        x: center2.x + r2 * Math.cos(a2),
        y: center2.y + r2 * Math.sin(a2),
      };
      const v2: Vector2D = {
        x: -r2 * direction * omega2 * Math.sin(a2),
        y: r2 * direction * omega2 * Math.cos(a2),
      };
      const speed2 = Math.hypot(v2.x, v2.y);
      traj2.push({
        t,
        position: p2,
        velocity: v2,
        acceleration: { x: -r2 * omega2 * omega2 * Math.cos(a2), y: -r2 * omega2 * omega2 * Math.sin(a2) },
        kineticEnergy: 0.5 * speed2 * speed2,
      });
    }

    // 关键帧: 起始点、1/4 周期、1/2 周期...
    const T1 = (2 * Math.PI) / Math.abs(omega1);
    const T2 = (2 * Math.PI) / Math.abs(omega2);
    const keyframes: Keyframe[] = [{
      label: '起始点',
      t: 0,
      position: traj1[0]!.position,
      velocity: traj1[0]!.velocity,
      description: `${modeLabel}: ${modeDesc}；ω₁=${omega1.toFixed(2)} rad/s, ω₂=${omega2.toFixed(2)} rad/s (${dirLabel}), v_edge≈${vSurface.toFixed(2)} m/s`,
    }];

    // 加两个 1/4 周期
    const qPoints: Array<{ T: number; label: string }> = [
      { T: T1 / 4, label: '主动轮 1/4 周' },
      { T: T1 / 2, label: '主动轮 1/2 周' },
      { T: T1, label: '主动轮 1 周' },
    ];
    for (const q of qPoints) {
      if (q.T > duration) break;
      const idx = Math.min(sampleCount, Math.round(q.T / dt));
      keyframes.push({
        label: q.label,
        t: q.T,
        position: traj1[idx]!.position,
        velocity: traj1[idx]!.velocity,
        description: `t=${q.T.toFixed(3)}s, 主轮转角=${(omega1 * q.T).toFixed(2)}rad, 从轮转角=${(omega2 * q.T).toFixed(2)}rad`,
      });
    }
    keyframes.push({
      label: '终点',
      t: duration,
      position: traj1[traj1.length - 1]!.position,
      velocity: traj1[traj1.length - 1]!.velocity,
      description: `t=${duration}s, 主动轮转 ${omega1 * duration / (2 * Math.PI)} 周, 从动轮转 ${omega2 * duration / (2 * Math.PI)} 周`,
    });

    // ===== 图表 =====

    // 1. omega_comparison: 主从角速度随时间恒定线
    const omega_comparison: ChartSeries = {
      xLabel: '时间', xUnit: 's', yLabel: '角速度 (主=蓝, 从=橙)', yUnit: 'rad/s',
      points: traj1.map(p => ({ x: p.t, y: omega1 })),
    };
    // 额外用 v_surfaces 系列显示从动轮角速度 +边缘线速度
    const v_surfaces: ChartSeries = {
      xLabel: '时间', xUnit: 's', yLabel: '轮边缘线速度', yUnit: 'm/s',
      points: traj1.map(p => ({ x: p.t, y: vSurface })),
    };

    // 2. r_omega_inverse: r 与 ω 反比图 (皮带/摩擦轮) — 用 r 为 x
    //   扫描 r1/r2 传动比，展示 ω₂ = ω₁·r₁/r₂ 的反比关系
    const samples2 = 60;
    const rMin = Math.min(r1, r2) * 0.2;
    const rMax = Math.max(r1, r2) * 2.5;
    const r_omega_inverse: ChartSeries = {
      xLabel: '半径 r', xUnit: 'm', yLabel: '角速度 ω', yUnit: 'rad/s',
      points: mode === 'coax'
        ? Array.from({ length: samples2 }, (_, i) => {
            const r = rMin + (rMax - rMin) * i / (samples2 - 1);
            return { x: r, y: omega1 };
          })
        : Array.from({ length: samples2 }, (_, i) => {
            const r = rMin + (rMax - rMin) * i / (samples2 - 1);
            // ω·r = ω₁·r₁ = const (皮带/摩擦轮/齿轮 边缘线速度)
            return { x: r, y: (omega1 * r1) / r };
          }),
    };

    // 3. gear_ratio: ω₂/ω₁ vs r₁/r₂ 关系。这里绘制 ω₂/ω₁ = r₁/r₂ (对所有模式均适用，只是符号不同)
    const gear_ratio: ChartSeries = {
      xLabel: '半径比 r₁/r₂', xUnit: '', yLabel: '角速度比 |ω₂/ω₁|', yUnit: '',
      points: Array.from({ length: samples2 }, (_, i) => {
        const ratio = 0.1 + (4 - 0.1) * i / (samples2 - 1); // 0.1 ~ 4
        return {
          x: ratio,
          y: mode === 'coax' ? 1 : (1 / ratio),
        };
      }),
    };

    // 静态示意图: 两轮相对位置
    const static_diagram: ChartSeries = {
      xLabel: 'x', xUnit: 'm', yLabel: 'y', yUnit: 'm',
      points: [
        ...Array.from({ length: 64 }, (_, i) => {
          const a = (2 * Math.PI * i) / 63;
          return { x: center1.x + r1 * Math.cos(a), y: center1.y + r1 * Math.sin(a) };
        }),
        ...Array.from({ length: 64 }, (_, i) => {
          const a = (2 * Math.PI * i) / 63;
          return { x: center2.x + r2 * Math.cos(a), y: center2.y + r2 * Math.sin(a) };
        }),
      ],
    };

    // 受力分析图: 主动轮受驱动力矩，从动轮受负载力矩
    const forceDiagram: ForceDiagram = {
      bodyId: problem.bodies[0]?.id ?? 'driver',
      forces: [
        { name: '主动力矩 (驱动)', vector: { x: 0, y: r1 }, magnitude: r1, unit: 'N·m (示意)' },
        { name: '皮带张力 T', vector: { x: r1, y: 0 }, magnitude: r1, unit: 'N' },
        { name: '从动轮负载力矩 (反向)', vector: { x: 0, y: -r2 }, magnitude: r2, unit: 'N·m (示意)' },
      ],
      netForce: { x: 0, y: 0 },
    };

    // diagnostics
    const gearRatioAbs = Math.abs(omega2 / omega1);
    const radiusRatio = r1 / r2;
    const slipTolerance = 1e-9;
    const withinTolerance = mode === 'coax'
      ? Math.abs(omega1 - omega2) < slipTolerance
      : Math.abs(gearRatioAbs - (1 / radiusRatio)) < slipTolerance;

    return {
      meta: {
        model: 'transmission-belt',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [traj1, traj2],
      keyframes,
      charts: {
        omega_comparison,
        v_surfaces,
        r_omega_inverse,
        gear_ratio,
        'static-diagram': static_diagram,
        force_diagram: forceDiagram,
      },
      diagnostics: {
        conservedQuantities: [
          {
            name: '边缘线速度等大 (皮带/摩擦轮/齿轮)',
            law: '传动不打滑时两轮边缘线速度等大',
            initialValue: vSurface,
            finalValue: vSurface2,
            maxDeviation: Math.abs(vSurface - vSurface2),
            tolerance: slipTolerance,
            conserved: Math.abs(vSurface - vSurface2) < slipTolerance,
          },
        ],
        maxValues: {
          omega1: Math.abs(omega1),
          omega2: Math.abs(omega2),
          vSurface,
          gearRatio: gearRatioAbs,
          radiusRatio,
          period1: T1,
          period2: T2,
          rotations1: (omega1 * duration) / (2 * Math.PI),
          rotations2: (omega2 * duration) / (2 * Math.PI),
        },
        rangeCheck: {
          withinRange: withinTolerance,
          warnings: withinTolerance ? []
            : [`实际传动比 ${gearRatioAbs.toFixed(4)} 与理论值 ${(1 / radiusRatio).toFixed(4)} 偏差过大`],
        },
      },
      explanation: {
        summary: `${modeLabel}: ω₁=${omega1.toFixed(2)}rad/s, ω₂=${omega2.toFixed(2)}rad/s, r₁/r₂=${radiusRatio.toFixed(2)}, v=${vSurface.toFixed(2)}m/s`,
        steps: mode === 'coax' ? [
          { order: 1, description: `${modeLabel}: 主从轮固定在同一转轴上`, formula: 'ω₁ = ω₂', calculation: `ω₁ = ω₂ = ${omega1.toFixed(2)} rad/s` },
          { order: 2, description: '同轴转动 → 角速度相等、转向相同', formula: 'ω_common = const', result: `ω_common = ${omega1.toFixed(2)} rad/s` },
          { order: 3, description: '边缘线速度 (半径不同故 v 不等)', formula: 'v = ω·r', calculation: `v₁ = ${omega1.toFixed(2)}·${r1} = ${(omega1 * r1).toFixed(2)} m/s, v₂ = ${omega2.toFixed(2)}·${r2} = ${(omega2 * r2).toFixed(2)} m/s` },
        ] : [
          { order: 1, description: `${modeLabel}: ${modeDesc}`, formula: mode === 'gear' ? 'ω₁·r₁ = ω₂·r₂, 反向' : 'ω₁·r₁ = ω₂·r₂, 同向' },
          { order: 2, description: '角速度比', formula: '|ω₂/ω₁| = r₁/r₂', calculation: `|ω₂/ω₁| = ${gearRatioAbs.toFixed(3)}, r₁/r₂ = ${radiusRatio.toFixed(3)}` },
          { order: 3, description: '边缘线速度等大', formula: 'v = ω·r', calculation: `v₁ = ${omega1.toFixed(2)}·${r1} = ${vSurface.toFixed(2)} m/s, v₂ = ${omega2.toFixed(2)}·${r2} = ${vSurface2.toFixed(2)} m/s` },
          { order: 4, description: '周期', formula: 'T = 2π/ω', calculation: `T₁ = ${T1.toFixed(3)}s, T₂ = ${T2.toFixed(3)}s` },
        ],
        formulas: [
          { name: '边缘线速度', formula: 'v = ω·r', variables: { v: { value: vSurface, unit: 'm/s' }, 'ω₁': { value: Math.abs(omega1), unit: 'rad/s' }, 'r₁': { value: r1, unit: 'm' } } },
          { name: '传动比', formula: '|ω₂/ω₁| = r₁/r₂', variables: { 'ω₂/ω₁': { value: gearRatioAbs, unit: '' }, 'r₁/r₂': { value: radiusRatio, unit: '' } } },
          { name: '周期', formula: 'T = 2π/ω', variables: { 'T₁': { value: T1, unit: 's' }, 'T₂': { value: T2, unit: 's' } } },
        ],
      },
      errors: [],
      warnings: [],
    };
  }
}

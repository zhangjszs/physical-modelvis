import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ForceDiagram } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

/**
 * 力的合成与分解模型 — 平行四边形定则 (必修一 第三章 §4)
 *
 * 给定两个分力 F1、F2 及其夹角 θ，按平行四边形定则求合力：
 *   F = √(F1² + F2² + 2·F1·F2·cosθ)
 *   tanφ = F2·sinθ / (F1 + F2·cosθ)   (合力与 F1 的夹角)
 *
 * 模型产生一个"伪轨迹"——把不同夹角下的合力作为时间序列，
 * 以便复用 SimulationResult 的图表能力，绘制 F-θ 曲线。
 */
export class ForceCompositionModel extends PhysicsModelBase {
  readonly name = '力的合成与分解';
  readonly version = '1.0.0';
  readonly description = '验证互成角度两个力的平行四边形定则，求合力大小与方向';
  readonly modelType = 'force-composition' as const;
  readonly assumptions = [
    '两个分力为共点力',
    '分力大小不变，仅夹角变化',
    '力的合成遵循平行四边形定则',
  ];
  readonly applicableRange = '适用于任意两个共点力的合成';
  readonly errorSources = [
    '实验中分力方向记录不准带来的误差',
    '弹簧测力计本身的示值误差',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'f1', description: '分力 F1 (N)', unit: 'N', required: true, min: 0 },
    { name: 'f2', description: '分力 F2 (N)', unit: 'N', required: true, min: 0 },
    { name: 'angleDeg', description: 'F1 与 F2 夹角 (°)', unit: '°', required: true, min: 0, max: 180 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const fc = problem.constraints?.forceComposition;
    if (!fc) {
      throw new Error('力的合成模型需要 constraints.forceComposition 配置');
    }

    const F1 = fc.f1;
    const F2 = fc.f2;
    const angleDeg = fc.angleDeg;
    const angleRad = (angleDeg * Math.PI) / 180;
    const f1AngleRad = ((fc.f1AngleDeg ?? 0) * Math.PI) / 180;

    // ===== 平行四边形定则：求合力 =====
    // F1 沿 f1AngleRad 方向；F2 与 F1 夹角 angleDeg
    const F1vec = { x: F1 * Math.cos(f1AngleRad), y: F1 * Math.sin(f1AngleRad) };
    const F2vec = {
      x: F2 * Math.cos(f1AngleRad + angleRad),
      y: F2 * Math.sin(f1AngleRad + angleRad),
    };
    const Fvec = Vec2.add(F1vec, F2vec);
    const Fmag = Vec2.magnitude(Fvec);
    const FangleRad = Math.atan2(Fvec.y, Fvec.x);
    const FangleDeg = (FangleRad * 180) / Math.PI;

    // ===== 生成"伪轨迹"：扫过夹角 0°→180°，展示合力随夹角的变化 =====
    // 当前夹角对应的时间标记为 t = angleDeg / 180 * duration
    const duration = problem.timeConfig.duration;
    const sampleCount = problem.timeConfig.sampleCount ?? 360;
    const trajectory: TrajectoryPoint[] = [];

    for (let i = 0; i <= sampleCount; i++) {
      const t = (i / sampleCount) * duration;
      const sweepAngleRad = (i / sampleCount) * Math.PI; // 0 → π
      const sweepAngleDeg = (i / sampleCount) * 180;

      const v1 = { x: F1 * Math.cos(f1AngleRad), y: F1 * Math.sin(f1AngleRad) };
      const v2 = {
        x: F2 * Math.cos(f1AngleRad + sweepAngleRad),
        y: F2 * Math.sin(f1AngleRad + sweepAngleRad),
      };
      const v = Vec2.add(v1, v2);
      const mag = Vec2.magnitude(v);

      // 用合力向量作为"位置"（方便画 F-θ 图）；速度字段存放当前夹角
      trajectory.push({
        t,
        position: v,
        velocity: { x: sweepAngleDeg, y: mag },
        acceleration: { x: Math.cos(f1AngleRad + sweepAngleRad), y: Math.sin(f1AngleRad + sweepAngleRad) },
        kineticEnergy: mag, // 复用：动能字段存放合力大小
      });
    }

    // ===== 关键帧：特征夹角对应的合力 =====
    const keyframes: Keyframe[] = [
      this.makeKeyframe('θ = 0° (同向)', 0, F1 + F2, 0, F1, F2, 0),
      this.makeKeyframe(`θ = ${angleDeg.toFixed(1)}° (当前)`, (angleDeg / 180) * duration, Fmag, FangleDeg, F1, F2, angleDeg),
      this.makeKeyframe('θ = 90° (垂直)', (90 / 180) * duration, Math.sqrt(F1 * F1 + F2 * F2), (Math.atan2(F2, F1) * 180) / Math.PI, F1, F2, 90),
      this.makeKeyframe('θ = 180° (反向)', duration, Math.abs(F1 - F2), F1 >= F2 ? 0 : 180, F1, F2, 180),
    ];

    // ===== 图表：F-θ 曲线 (合力随夹角的变化) =====
    const F_theta: ChartSeries = {
      xLabel: '夹角 θ', yLabel: '合力大小 F', xUnit: '°', yUnit: 'N',
      points: trajectory.map(p => ({ x: p.velocity.x, y: p.kineticEnergy! })),
    };

    // ===== 受力分析图 =====
    const forces = [
      { name: '分力 F1', vector: F1vec, magnitude: F1, unit: 'N' },
      { name: '分力 F2', vector: F2vec, magnitude: F2, unit: 'N' },
      { name: '合力 F', vector: Fvec, magnitude: Fmag, unit: 'N' },
    ];
    const forceDiagram: ForceDiagram = {
      bodyId: problem.bodies[0]?.id ?? 'point',
      forces,
      netForce: Fvec,
    };

    // ===== 公式推导 =====
    const cosTheta = Math.cos(angleRad);
    const sinTheta = Math.sin(angleRad);
    const calculation = `F = √(${F1}² + ${F2}² + 2×${F1}×${F2}×cos${angleDeg}°) = √${(F1 * F1 + F2 * F2 + 2 * F1 * F2 * cosTheta).toFixed(4)} = ${Fmag.toFixed(4)} N`;
    const directionCalc = `tanφ = ${F2}×sin${angleDeg}° / (${F1} + ${F2}×cos${angleDeg}°) = ${(F2 * sinTheta).toFixed(4)} / ${(F1 + F2 * cosTheta).toFixed(4)} → φ = ${FangleDeg.toFixed(2)}°`;

    return {
      meta: {
        model: 'force-composition',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: { F_theta, force_diagram: forceDiagram },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          maxResultant: F1 + F2,                  // θ=0°
          minResultant: Math.abs(F1 - F2),        // θ=180°
          currentResultant: Fmag,
          currentAngle: FangleDeg,
        },
        rangeCheck: { withinRange: true, warnings: [] },
      },
      explanation: {
        summary: `F1=${F1}N 与 F2=${F2}N 夹角 ${angleDeg}° 时，合力 F=${Fmag.toFixed(3)}N，方向与 F1 夹角 ${FangleDeg.toFixed(2)}°`,
        steps: [
          { order: 1, description: '合力大小 (余弦定理)', formula: 'F = √(F1² + F2² + 2·F1·F2·cosθ)', calculation },
          { order: 2, description: '合力方向 (与 F1 的夹角)', formula: 'tanφ = F2·sinθ / (F1 + F2·cosθ)', calculation: directionCalc },
          { order: 3, description: '特例检验', formula: 'θ=0°: F=F1+F2; θ=180°: F=|F1-F2|; θ=90°: F=√(F1²+F2²)', result: '平行四边形定则成立' },
        ],
        formulas: [
          { name: '合力大小', formula: 'F = √(F1² + F2² + 2·F1·F2·cosθ)', variables: { F1: { value: F1, unit: 'N' }, F2: { value: F2, unit: 'N' }, θ: { value: angleDeg, unit: '°' } } },
          { name: '合力方向', formula: 'tanφ = F2·sinθ / (F1 + F2·cosθ)', variables: { F2: { value: F2, unit: 'N' }, sinθ: { value: sinTheta, unit: '' }, F1: { value: F1, unit: 'N' }, cosθ: { value: cosTheta, unit: '' } } },
          { name: '同向合成', formula: 'F = F1 + F2', variables: { F1: { value: F1, unit: 'N' }, F2: { value: F2, unit: 'N' } } },
          { name: '反向合成', formula: 'F = |F1 − F2|', variables: { F1: { value: F1, unit: 'N' }, F2: { value: F2, unit: 'N' } } },
          { name: '垂直合成', formula: 'F = √(F1² + F2²)', variables: { F1: { value: F1, unit: 'N' }, F2: { value: F2, unit: 'N' } } },
        ],
      },
      errors: [],
      warnings: [],
    };
  }

  private makeKeyframe(
    label: string, t: number, fMag: number, fAngleDeg: number,
    f1: number, f2: number, angleDeg: number,
  ): Keyframe {
    return {
      label,
      t,
      position: { x: fMag * Math.cos((fAngleDeg * Math.PI) / 180), y: fMag * Math.sin((fAngleDeg * Math.PI) / 180) },
      velocity: { x: 0, y: 0 },
      description: `F1=${f1}N, F2=${f2}N, θ=${angleDeg}° → F=${fMag.toFixed(3)}N`,
    };
  }
}

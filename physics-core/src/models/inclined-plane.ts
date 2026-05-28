import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ForceDiagram } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

/** 斜面运动模型 */
export class InclinedPlaneModel extends PhysicsModelBase {
  readonly name = '斜面运动';
  readonly version = '1.0.0';
  readonly description = '物体在斜面上受重力、支持力和摩擦力作用的运动';
  readonly modelType = 'inclined-plane' as const;
  readonly assumptions = [
    '物体视为质点',
    '斜面为刚性平面',
    '重力加速度恒定',
    '摩擦系数恒定',
    '忽略空气阻力',
  ];
  readonly applicableRange = '适用于物体在斜面上的运动，含或不含摩擦力';
  readonly errorSources = [
    '实际摩擦系数可能随速度变化',
    '斜面可能非理想刚性',
    '空气阻力被忽略',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'angle', description: '斜面倾角 (°)', unit: '°', required: true, min: 0, max: 90 },
    { name: 'frictionCoefficient', description: '动摩擦系数 μ', unit: '', required: false, min: 0, defaultValue: 0 },
    { name: 'gravity', description: '重力加速度', unit: 'm/s²', required: false, defaultValue: 9.8 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const body = problem.bodies[0];
    const m = body.mass.value;
    const v0 = body.velocity;
    const x0 = body.position;

    const angleDeg = problem.constraints?.inclinedPlane?.angle ?? 30;
    const angleRad = angleDeg * Math.PI / 180;
    const mu = problem.constraints?.inclinedPlane?.frictionCoefficient ?? 0;
    const g = problem.environment?.gravity?.value ?? 9.8;

    const sinTheta = Math.sin(angleRad);
    const cosTheta = Math.cos(angleRad);

    // 力的分解
    const gravityParallel = m * g * sinTheta;   // F∥ = mg sinθ (沿斜面向下)
    const normalForce = m * g * cosTheta;       // N = mg cosθ
    const frictionForce = mu * normalForce;     // f = μN

    // 加速度: a = g(sinθ - μcosθ) 沿斜面方向
    const a = g * (sinTheta - mu * cosTheta);
    const isStationary = a < 1e-10;

    // 沿斜面方向的单位向量 (向下为正)
    const inclineDir = { x: cosTheta, y: -sinTheta };
    // 垂直斜面方向 (指向斜面上方)
    const normalDir = { x: sinTheta, y: cosTheta };

    const duration = problem.timeConfig.duration;
    const sampleCount = problem.timeConfig.sampleCount ?? 1000;
    const dt = duration / sampleCount;

    // 生成轨迹
    const trajectory: TrajectoryPoint[] = [];
    const effectiveAccel = isStationary ? 0 : a;

    for (let i = 0; i <= sampleCount; i++) {
      const t = i * dt;

      // 沿斜面的位移和速度
      const s = isStationary
        ? 0
        : Vec2.dot(v0, inclineDir) * t + 0.5 * effectiveAccel * t * t;
      const vAlongIncline = isStationary
        ? 0
        : Vec2.dot(v0, inclineDir) + effectiveAccel * t;

      // 位置 = 初始位置 + 沿斜面位移
      const position = Vec2.add(x0, Vec2.scale(inclineDir, s));
      // 速度 = 沿斜面速度 (假设物体从静止或沿斜面方向释放)
      const velocity = Vec2.scale(inclineDir, vAlongIncline);
      const speed = Math.abs(vAlongIncline);

      // 加速度向量
      const accelVec = isStationary ? Vec2.zero() : Vec2.scale(inclineDir, effectiveAccel);

      trajectory.push({
        t,
        position,
        velocity,
        acceleration: accelVec,
        kineticEnergy: 0.5 * m * speed * speed,
        potentialEnergy: m * g * position.y,
      });
    }

    // 斜面几何: 起点 (0, h), 终点 (h/tanθ, 0)
    const h = Math.abs(x0.y) || 10;
    const inclineEndX = h / Math.tan(angleRad);

    // 关键帧
    const keyframes: Keyframe[] = [];
    keyframes.push({
      label: '起始点',
      t: 0,
      position: { ...x0 },
      velocity: { ...v0 },
      description: `物体在斜面顶端，倾角 ${angleDeg}°，摩擦系数 μ=${mu}`,
    });

    if (isStationary) {
      keyframes.push({
        label: '物体静止',
        t: duration,
        position: { ...x0 },
        velocity: Vec2.zero(),
        description: `tanθ = ${sinTheta.toFixed(4)} < μ = ${mu}，物体保持静止`,
      });
    } else {
      // 检查物体是否到达斜面底端
      const totalInclineLength = h / sinTheta;
      const sAtEnd = Vec2.dot(v0, inclineDir);
      // 用运动学公式求到达底端的时间: s = v0*t + 0.5*a*t²
      if (effectiveAccel > 0) {
        const aHalf = 0.5 * effectiveAccel;
        const discriminant = sAtEnd * sAtEnd + 4 * aHalf * totalInclineLength;
        if (discriminant >= 0) {
          const tEnd = (-sAtEnd + Math.sqrt(discriminant)) / (2 * aHalf);
          if (tEnd > 0 && tEnd <= duration) {
            const posAtEnd = Vec2.add(x0, Vec2.scale(inclineDir, totalInclineLength));
            const vAtEnd = Math.sqrt(sAtEnd * sAtEnd + 2 * effectiveAccel * totalInclineLength);
            keyframes.push({
              label: '到达底端',
              t: tEnd,
              position: posAtEnd,
              velocity: Vec2.scale(inclineDir, vAtEnd),
              description: `物体在 t=${tEnd.toFixed(3)}s 到达斜面底端，速度 ${vAtEnd.toFixed(2)} m/s`,
            });
          }
        }
      }
    }

    const finalPos = trajectory[trajectory.length - 1].position;
    keyframes.push({
      label: '终点',
      t: duration,
      position: finalPos,
      velocity: trajectory[trajectory.length - 1].velocity,
      description: `t=${duration}s 时位置 (${finalPos.x.toFixed(3)}, ${finalPos.y.toFixed(3)})`,
    });

    // 图表数据
    const x_t: ChartSeries = {
      xLabel: '时间', yLabel: '沿斜面位移', xUnit: 's', yUnit: 'm',
      points: trajectory.map(p => ({
        x: p.t,
        y: Vec2.dot(Vec2.sub(p.position, x0), inclineDir),
      })),
    };
    const v_t: ChartSeries = {
      xLabel: '时间', yLabel: '沿斜面速度', xUnit: 's', yUnit: 'm/s',
      points: trajectory.map(p => ({
        x: p.t,
        y: Vec2.dot(p.velocity, inclineDir),
      })),
    };
    const a_t: ChartSeries = {
      xLabel: '时间', yLabel: '沿斜面加速度', xUnit: 's', yUnit: 'm/s²',
      points: trajectory.map(p => ({
        x: p.t,
        y: p.acceleration ? Vec2.dot(p.acceleration, inclineDir) : 0,
      })),
    };

    // 受力分析图
    const forces = [
      { name: '重力分量(F∥)', vector: Vec2.scale(inclineDir, gravityParallel), magnitude: gravityParallel, unit: 'N' },
      { name: '支持力(N)', vector: Vec2.scale(normalDir, normalForce), magnitude: normalForce, unit: 'N' },
      { name: '摩擦力(f)', vector: Vec2.scale(inclineDir, -frictionForce), magnitude: frictionForce, unit: 'N' },
    ];
    const netForceMag = isStationary ? 0 : gravityParallel - frictionForce;
    const forceDiagram: ForceDiagram = {
      bodyId: body.id,
      forces,
      netForce: Vec2.scale(inclineDir, netForceMag),
    };

    // 临界角
    const criticalAngle = mu > 0 ? Math.atan(mu) * 180 / Math.PI : 0;

    return {
      meta: {
        model: 'inclined-plane',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: { x_t, v_t, a_t, force_diagram: forceDiagram },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          maxSpeed: Math.max(...trajectory.map(p => Vec2.magnitude(p.velocity))),
          maxAcceleration: effectiveAccel,
          normalForce,
          frictionForce,
          criticalAngle,
        },
        rangeCheck: {
          withinRange: true,
          warnings: isStationary
            ? [`tanθ = ${sinTheta.toFixed(4)} ≤ μ = ${mu}，物体可能不会下滑`]
            : [],
        },
      },
      explanation: {
        summary: isStationary
          ? `倾角 ${angleDeg}° ≤ 临界角 ${criticalAngle.toFixed(1)}° (tanθ = ${sinTheta.toFixed(4)} ≤ μ = ${mu})，物体静止`
          : `物体沿 ${angleDeg}° 斜面下滑，加速度 a = g(sinθ - μcosθ) = ${effectiveAccel.toFixed(2)} m/s²`,
        steps: [
          { order: 1, description: '分解重力', formula: 'F∥ = mg sinθ, N = mg cosθ', calculation: `F∥ = ${m}×${g}×sin${angleDeg}° = ${gravityParallel.toFixed(2)} N, N = ${m}×${g}×cos${angleDeg}° = ${normalForce.toFixed(2)} N` },
          { order: 2, description: '计算摩擦力', formula: 'f = μN', calculation: `f = ${mu}×${normalForce.toFixed(2)} = ${frictionForce.toFixed(2)} N` },
          { order: 3, description: '计算加速度', formula: 'a = g(sinθ - μcosθ)', calculation: `a = ${g}×(sin${angleDeg}° - ${mu}×cos${angleDeg}°) = ${effectiveAccel.toFixed(2)} m/s²` },
          { order: 4, description: '临界角条件', formula: 'tanθ = μ', calculation: `θ_critical = arctan(${mu}) = ${criticalAngle.toFixed(1)}°` },
        ],
        formulas: [
          { name: '重力分量', formula: 'F∥ = mg sinθ', variables: { m: { value: m, unit: 'kg' }, g: { value: g, unit: 'm/s²' }, θ: { value: angleDeg, unit: '°' } } },
          { name: '支持力', formula: 'N = mg cosθ', variables: { m: { value: m, unit: 'kg' }, g: { value: g, unit: 'm/s²' }, θ: { value: angleDeg, unit: '°' } } },
          { name: '摩擦力', formula: 'f = μN', variables: { μ: { value: mu, unit: '' }, N: { value: normalForce, unit: 'N' } } },
          { name: '加速度', formula: 'a = g(sinθ - μcosθ)', variables: { g: { value: g, unit: 'm/s²' }, sinθ: { value: sinTheta, unit: '' }, μcosθ: { value: mu * cosTheta, unit: '' } } },
          { name: '临界角', formula: 'tanθ = μ', variables: { μ: { value: mu, unit: '' }, θ_critical: { value: criticalAngle, unit: '°' } } },
        ],
      },
      errors: [],
      warnings: isStationary ? [`物体在 ${angleDeg}° 斜面上因摩擦力大于重力分量而保持静止`] : [],
    };
  }
}

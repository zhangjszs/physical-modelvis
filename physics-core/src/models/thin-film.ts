import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 薄膜干涉模型 — 选必一 第四章 (薄膜干涉)
 *
 * 等厚干涉: 薄膜 (n_film) 上下表面反射光叠加.
 *   光程差 (垂直入射): Delta = 2 * n * d + lambda/2 (半波损失)
 *   明纹条件: Delta = m * lambda (m = 0, 1, 2, ...)
 *   暗纹条件: Delta = (m + 1/2) * lambda
 *
 * 楔形膜时, 不同厚度对应不同颜色.
 *
 * 增透膜: 上下表面反射光相消, 条件 2nd = (m + 1/2) * lambda
 * 增反膜: 上下表面反射光相长, 条件 2nd = m * lambda
 */
export class ThinFilmModel extends PhysicsModelBase {
  readonly name = '薄膜干涉';
  readonly version = '1.0.0';
  readonly description = '薄膜等厚干涉: 膜厚-颜色/反射率关系';
  readonly modelType = 'thin-film' as const;
  readonly assumptions = [
    '薄膜厚度 d 远小于横向尺度',
    '入射光为单色 (或分立波长)',
    '薄膜两面平行 (或已知楔形角)',
    '垂直入射 (垂直方向余弦近似)',
  ];
  readonly applicableRange = 'thickness: 50--1000 nm; refIndex: 1.2--2.5; wavelength: 380--780 nm';
  readonly errorSources = [
    '实际薄膜厚度不均匀',
    '入射光并非严格单色',
    '表面粗糙度导致散射',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'thickness', description: '薄膜中心厚度 d (nm)', unit: 'nm', required: true, min: 10, max: 5000 },
    { name: 'refIndex', description: '薄膜折射率 n', unit: '', required: true, min: 1, max: 3 },
    { name: 'wavelength', description: '入射光波长 (nm)', unit: 'nm', required: true, min: 380, max: 780 },
    { name: 'incidentAngle', description: '入射角 (度, 相对法线)', unit: 'deg', required: true, min: 0, max: 90 },
    { name: 'substrateIndex', description: '基片折射率 (薄膜下方介质)', unit: '', required: false, min: 1, max: 4 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const c = problem.constraints?.thinFilm;
    if (!c) throw new Error('thin-film 模型需要 thinFilm 约束配置');

    const d = c.thickness;
    const n = c.refIndex;
    const lambda = c.wavelength;
    const thetaDeg = c.incidentAngle;
    const thetaRad = thetaDeg * Math.PI / 180;
    const nSub = c.substrateIndex ?? 1.5; // 默认玻璃

    // 薄膜干涉 (考虑折射角 theta_t)
    const sinT = Math.sin(thetaRad) / n; // Snell 定律
    if (Math.abs(sinT) >= 1) throw new Error('全反射: 入射角超出临界角');
    const cosT = Math.sqrt(1 - sinT * sinT);
    const delta = 2 * n * d * cosT + lambda / 2; // 光程差 + 半波损失
    const m = delta / lambda; // 干涉级次
    const isConstructive = Math.abs(m - Math.round(m)) < 0.05;
    const isDestructive = Math.abs(m - (Math.round(m) + 0.5)) < 0.05;

    // 反射率 (简化: 单一波长, 正入射, 两道反射光的叠加)
    const r1sq = ((1 - n) / (1 + n)) ** 2; // 空气-膜界面
    const r2sq = ((n - nSub) / (n + nSub)) ** 2; // 膜-基底界面
    const phi = (2 * Math.PI * delta) / lambda;
    const R = r1sq + r2sq + 2 * Math.sqrt(r1sq * r2sq) * Math.cos(phi);
    const Rnorm = Math.min(1, Math.max(0, R));

    // 膜厚扫描 (改变 d 看反射率变化)
    const thicknessScan: ChartSeries = {
      xLabel: '膜厚 d (nm)',
      yLabel: '反射率 R',
      xUnit: 'nm',
      yUnit: '',
      points: [],
    };
    for (let di = 50; di <= 1500; di += 2) {
      const deltaI = 2 * n * di * cosT + lambda / 2;
      const phiI = (2 * Math.PI * deltaI) / lambda;
      const Ri = r1sq + r2sq + 2 * Math.sqrt(r1sq * r2sq) * Math.cos(phiI);
      thicknessScan.points.push({ x: di, y: parseFloat(Math.min(1, Math.max(0, Ri)).toFixed(4)) });
    }

    // 波长扫描 (改变 lambda)
    const wavelengthScan: ChartSeries = {
      xLabel: '波长 lambda (nm)',
      yLabel: '反射率 R',
      xUnit: 'nm',
      yUnit: '',
      points: [],
    };
    for (let w = 380; w <= 780; w += 4) {
      const deltaW = 2 * n * d * cosT + w / 2;
      const phiW = (2 * Math.PI * deltaW) / w;
      const Rw = r1sq + r2sq + 2 * Math.sqrt(r1sq * r2sq) * Math.cos(phiW);
      wavelengthScan.points.push({ x: w, y: parseFloat(Math.min(1, Math.max(0, Rw)).toFixed(4)) });
    }

    const trajectory: TrajectoryPoint[] = [];
    for (let i = 0; i <= 50; i++) {
      const t = (i / 50) * 10;
      trajectory.push({
        t,
        position: { x: d, y: i },
        velocity: { x: 0, y: 0 },
        kineticEnergy: 0,
        potentialEnergy: 0,
      });
    }

    const keyframes: Keyframe[] = [
      {
        label: '入射光',
        t: 0,
        position: { x: -10, y: 0 },
        velocity: { x: 0, y: 0 },
        description: `lambda=${lambda}nm, theta=${thetaDeg}deg, n_film=${n}`,
      },
      {
        label: '反射光叠加',
        t: 0,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        description: `Delta=${delta.toFixed(1)}nm, m=${m.toFixed(3)}, ${isConstructive ? '相长干涉 (反射增强)' : isDestructive ? '相消干涉 (反射减弱)' : '介于两者之间'}`,
      },
      {
        label: '反射率 R',
        t: 0,
        position: { x: 10, y: 0 },
        velocity: { x: 0, y: 0 },
        description: `R=${(Rnorm * 100).toFixed(2)}%, ${Rnorm < 0.1 ? '增透效果' : Rnorm > 0.5 ? '增反效果' : '普通反射'}`,
      },
    ];

    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '光程差',
        formula: 'Delta = 2*n*d*cos(theta_t) + lambda/2',
        calculation: `Delta = 2*${n}*${d}*${cosT.toFixed(3)} + ${lambda}/2 = ${delta.toFixed(1)}nm`,
      },
      {
        order: 2,
        description: '干涉判定',
        formula: 'Delta = m*lambda (明纹); Delta = (m+1/2)*lambda (暗纹)',
        result: isConstructive ? '明纹 (反射增强)' : isDestructive ? '暗纹 (反射减弱)' : '介于两者之间',
      },
      {
        order: 3,
        description: '反射率',
        formula: 'R ~ cos^2(phi/2)',
        calculation: `R = ${(Rnorm * 100).toFixed(2)}%`,
      },
      {
        order: 4,
        description: '增透/增反',
        result: Rnorm < 0.05 ? '接近完全增透' : Rnorm > 0.5 ? '增反效果' : '普通薄膜',
      },
    ];

    const warnings: string[] = [];
    if (thetaDeg > 60) warnings.push('入射角过大, 半波损失条件可能变化');
    if (d > 4 * lambda) warnings.push('厚度较大, 相干长度可能不足');

    return {
      meta: {
        model: 'thin-film',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: {
        thickness_scan: thicknessScan,
        wavelength_scan: wavelengthScan,
      },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          d, n, lambda,
          delta, m,
          Rnorm,
          cosT,
        },
        flags: {
          isConstructive, isDestructive,
          isAntiReflective: Rnorm < 0.05,
          isHighReflective: Rnorm > 0.5,
        },
        rangeCheck: { withinRange: warnings.length === 0, warnings },
      },
      explanation: {
        summary: `薄膜干涉: d=${d}nm, n=${n}, lambda=${lambda}nm; Delta=${delta.toFixed(1)}nm, m=${m.toFixed(2)}, R=${(Rnorm * 100).toFixed(2)}%`,
        steps,
        formulas: [
          { name: '光程差', formula: 'Delta = 2*n*d*cos(theta_t) + lambda/2', variables: { d: { value: d, unit: 'nm' }, n: { value: n, unit: '' }, lambda: { value: lambda, unit: 'nm' } } },
          { name: '反射率', formula: 'R = r1^2 + r2^2 + 2*r1*r2*cos(phi)', variables: { R: { value: Rnorm, unit: '' } } },
        ],
      },
      errors: [],
      warnings,
    };
  }
}

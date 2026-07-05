import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 光栅衍射模型 — 选必一 第四章 (光栅衍射)
 *
 * 光栅方程: d * sin(theta) = k * lambda (k = 0, +-1, +-2, ...)
 *   其中 d = 光栅常数 (相邻狭缝中距), lambda = 波长
 *
 * 主极大锐度 (谱线细亮):
 *   I(theta) = I_0 * (sin(alpha)/alpha)^2 * (sin(N*beta)/sin(beta))^2
 *   alpha = pi*a*sin(theta)/lambda    — 单缝衍射包络
 *   beta  = pi*d*sin(theta)/lambda    — 多缝干涉峰
 *
 * 缺级条件: k/d = m/a 即 d/a 为整数比时 k = +-m*(d/a) 缺级
 */
export class DiffractionGratingModel extends PhysicsModelBase {
  readonly name = '光栅衍射';
  readonly version = '1.0.0';
  readonly description = '光栅主极大谱线: d*sin(theta)=k*lambda, 缺级分析';
  readonly modelType = 'diffraction-grating' as const;
  readonly assumptions = [
    '大量平行等距狭缝 (N >> 1)',
    '垂直入射, 平行单色光',
    '远场条件 (L >> d)',
  ];
  readonly applicableRange = 'gratingConstant: 1--10 um; wavelength: 380--780 nm; orderMax: 0--5';
  readonly errorSources = [
    '实际光栅缺陷, 鬼线',
    '高级次谱线强度弱',
    '缝宽 a 接近 d 时缺级',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'gratingConstant', description: '光栅常数 d (um, 相邻狭缝距离)', unit: 'um', required: true, min: 0.5, max: 20 },
    { name: 'slitWidth', description: '缝宽 a (um)', unit: 'um', required: true, min: 0.2, max: 10 },
    { name: 'wavelength', description: '光波长 (nm)', unit: 'nm', required: true, min: 380, max: 780 },
    { name: 'orderMax', description: '最大衍射级次', unit: '', required: true, min: 1, max: 10 },
    { name: 'slitCount', description: '光栅总缝数 N', unit: '', required: true, min: 10, max: 10000 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const c = problem.constraints?.diffractionGrating;
    if (!c) throw new Error('diffraction-grating 模型需要 diffractionGrating 约束配置');

    const d = c.gratingConstant * 1e-6; // m
    const a = c.slitWidth * 1e-6; // m
    const lambda = c.wavelength * 1e-9; // m;
    const kMax = c.orderMax;
    const N = c.slitCount;

    // 各主极大位置 (光栅方程)
    const principalMaxima: Array<{ k: number; thetaDeg: number; x: number }> = [];
    let numVisibleOrders = 0;
    for (let k = 0; k <= kMax; k++) {
      const sinT = (k * lambda) / d;
      if (Math.abs(sinT) > 1) break;
      const theta = Math.asin(sinT);
      const thetaDeg = theta * 180 / Math.PI;
      const x = Math.tan(theta); // 归一化坐标 (L=1m时 x 即为位置)
      principalMaxima.push({ k, thetaDeg: parseFloat(thetaDeg.toFixed(4)), x: parseFloat(x.toFixed(6)) });
      numVisibleOrders++;
    }

    // 缺级分析: k = m * (d/a)
    const ratio = d / a;
    const missingOrders: number[] = [];
    for (let k = 1; k <= kMax; k++) {
      if (Math.abs(k / ratio - Math.round(k / ratio)) < 1e-6) {
        missingOrders.push(k);
      }
    }

    // 衍射图样 I(theta)
    const N_sample = 800;
    const thetaMax = Math.max(30, principalMaxima.length > 0 ? principalMaxima[principalMaxima.length - 1]!.thetaDeg + 5 : 30) * Math.PI / 180;
    const intensityCurve: ChartSeries = {
      xLabel: '衍射角 theta (度)',
      yLabel: '相对光强 (归一化)',
      xUnit: 'deg',
      yUnit: '',
      points: [],
    };

    for (let i = 0; i <= N_sample; i++) {
      const theta = -thetaMax + (2 * thetaMax * i) / N_sample;
      const sinT = Math.sin(theta);
      const alpha = Math.PI * a * sinT / lambda;
      const beta = Math.PI * d * sinT / lambda;

      // 单缝衍射包络
      let singleSlit: number;
      if (Math.abs(alpha) < 1e-12) singleSlit = 1;
      else {
        const sa = Math.sin(alpha) / alpha;
        singleSlit = sa * sa;
      }

      // 多缝干涉峰
      let multiSlit: number;
      if (Math.abs(beta) < 1e-12) multiSlit = N * N;
      else {
        const ns = Math.sin(N * beta) / Math.sin(beta);
        multiSlit = ns * ns;
      }

      const I = singleSlit * multiSlit / (N * N); // 归一化到 I(0)=1
      intensityCurve.points.push({
        x: parseFloat((theta * 180 / Math.PI).toFixed(5)),
        y: parseFloat(I.toFixed(6)),
      });
    }

    // 全可见光范围扫描 (400--700nm)
    const spectrumCurve: ChartSeries = {
      xLabel: '衍射角 theta (度)',
      yLabel: '相对光强 (彩色叠加)',
      xUnit: 'deg',
      yUnit: '',
      points: intensityCurve.points.map(p => ({ x: p.x, y: p.y })),
    };

    const trajectory: TrajectoryPoint[] = [];
    for (let i = 0; i <= 50; i++) {
      const t = (i / 50) * 10;
      trajectory.push({
        t,
        position: { x: 0, y: i },
        velocity: { x: 0, y: 0 },
        kineticEnergy: 0,
        potentialEnergy: 0,
      });
    }

    const keyframes: Keyframe[] = [
      {
        label: '0 级主极大 (中央)',
        t: 0,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        description: `k=0, theta=0, 所有波长重叠`,
      },
      {
        label: '1 级主极大',
        t: 0,
        position: { x: principalMaxima.length > 1 ? principalMaxima[1]!.x : 0, y: 0 },
        velocity: { x: 0, y: 0 },
        description: `k=1, theta=${principalMaxima.length > 1 ? principalMaxima[1]!.thetaDeg.toFixed(2) : 0}deg, d*sin(theta)=lambda`,
      },
      {
        label: `缺级数=${missingOrders.length}`,
        t: 0,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        description: missingOrders.length > 0 ? `缺级 k=${missingOrders.join(',')}` : '无缺级',
      },
    ];

    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '光栅方程',
        formula: 'd * sin(theta) = k * lambda',
        result: `d=${c.gratingConstant}um, a=${c.slitWidth}um, lambda=${c.wavelength}nm`,
      },
      {
        order: 2,
        description: '可见级次',
        formula: 'k_max = floor(d/lambda)',
        calculation: `可见级次 k=0..${numVisibleOrders - 1}, 共 ${numVisibleOrders} 条谱线`,
      },
      {
        order: 3,
        description: '缺级条件',
        formula: 'k = m * (d/a), m = +-1, +-2, ...',
        result: missingOrders.length > 0 ? `缺级 k = ${missingOrders.join(', ')} (ratio d/a = ${ratio.toFixed(2)})` : '无缺级',
      },
      {
        order: 4,
        description: '角色散',
        formula: 'D = dtheta/dlambda = k/(d*cos(theta))',
        calculation: `D(k=1) ~ ${(1 / (d * Math.sqrt(1 - (lambda / d) ** 2)) * 1e-6).toFixed(3) } rad/nm`,
      },
    ];

    const warnings: string[] = [];
    if (numVisibleOrders <= 1) warnings.push('仅可见中央主极大, 高级次全缺');
    if (d / a > 5) warnings.push('d/a 比值过大, 大部分级次缺级');
    if (N < 100) warnings.push('缝数较少, 谱线不够锐利');

    return {
      meta: {
        model: 'diffraction-grating',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: {
        grating_intensity: intensityCurve,
        spectrum_curve: spectrumCurve,
      },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          dUm: c.gratingConstant,
          aUm: c.slitWidth,
          lambdaNm: c.wavelength,
          ratioDA: parseFloat(ratio.toFixed(3)),
          orderMax: numVisibleOrders - 1,
          N: N,
          missingOrderCount: missingOrders.length,
        },
        flags: {
          hasMissingOrders: missingOrders.length > 0,
        },
        rangeCheck: { withinRange: warnings.length === 0, warnings },
      },
      explanation: {
        summary: `光栅: d=${c.gratingConstant}um, a=${c.slitWidth}um, N=${N}, lambda=${c.wavelength}nm; 级次k=0..${numVisibleOrders - 1}, 缺级数=${missingOrders.length}`,
        steps,
        formulas: [
          { name: '光栅方程', formula: 'd*sin(theta) = k*lambda', variables: { d: { value: c.gratingConstant, unit: 'um' }, lambda: { value: c.wavelength, unit: 'nm' } } },
          { name: '缺级条件', formula: 'k = m*(d/a)', variables: { 'd/a': { value: parseFloat(ratio.toFixed(3)), unit: '' } } },
        ],
      },
      errors: [],
      warnings,
    };
  }
}

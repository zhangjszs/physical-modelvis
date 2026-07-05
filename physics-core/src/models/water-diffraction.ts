import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 水波衍射模型 — 选必一 第三章 (水波衍射)
 *
 * 平面水波遇到障碍物狭缝时, 衍射现象的明显度取决于:
 *   - 缝宽 a 与波长 lambda 的比值 a/lambda
 *   - a/lambda << 1: 明显衍射 (缝相当于新波源)
 *   - a/lambda >> 1: 几乎无衍射 (直线传播)
 *
 * 简化模型: 远场条件下, 衍射图样为
 *   I(theta) = I_0 * (sin(alpha) / alpha)^2
 *   alpha = pi * a * sin(theta) / lambda
 *
 * a = 缝宽, lambda = 波长, theta = 衍射角.
 */
export class WaterDiffractionModel extends PhysicsModelBase {
  readonly name = '水波衍射';
  readonly version = '1.0.0';
  readonly description = '水波通过狭缝的衍射图样: 缝宽与波长之比决定衍射明显度';
  readonly modelType = 'water-diffraction' as const;
  readonly assumptions = [
    '狭缝无限长 (二维问题)',
    '远场条件 (缝到屏距离 >> 缝宽)',
    '波源单色 (单一波长)',
    '狭缝为理想点扰动传播',
  ];
  readonly applicableRange = 'wavelength: 1--50 cm; slitWidth: 1--100 cm';
  readonly errorSources = [
    '实际水波有衰减, 非线性效应',
    '近场 (菲涅耳) 衍射公式更复杂',
    '水槽边界反射干扰',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'wavelength', description: '水波波长 (cm)', unit: 'cm', required: true, min: 0.5, max: 50 },
    { name: 'slitWidth', description: '狭缝宽度 a (cm)', unit: 'cm', required: true, min: 0.5, max: 100 },
    { name: 'screenDist', description: '缝到挡板距离 L (cm)', unit: 'cm', required: true, min: 5, max: 200 },
    { name: 'waveAmplitude', description: '入射波振幅 (cm)', unit: 'cm', required: true, min: 0.1, max: 5 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const c = problem.constraints?.waterDiffraction;
    if (!c) throw new Error('water-diffraction 模型需要 waterDiffraction 约束配置');

    const lambda = c.wavelength;
    const a = c.slitWidth;
    const L = c.screenDist;
    const A0 = c.waveAmplitude;

    const ratio = a / lambda;
    // 衍射明显度: ratio < 1 明显, 1-5 逐渐消失, > 5 基本直线
    let diffractionStrength: string;
    if (ratio < 1) diffractionStrength = 'strong';
    else if (ratio < 3) diffractionStrength = 'moderate';
    else if (ratio < 8) diffractionStrength = 'weak';
    else diffractionStrength = 'negligible';

    // 衍射图样 I(theta) = (sin(alpha)/alpha)^2, alpha = pi*a*sin(theta)/lambda
    const N = 200;
    const thetaMax = Math.PI / 3;
    const intensityCurve: ChartSeries = {
      xLabel: '衍射角 theta (度)',
      yLabel: '相对振幅',
      xUnit: 'deg',
      yUnit: '',
      points: [],
    };

    let maxI = 0;
    let maxTheta = 0;
    const minimaAngles: number[] = [];

    for (let i = 0; i <= N; i++) {
      const theta = -thetaMax + (2 * thetaMax * i) / N;
      const sinT = Math.sin(theta);
      const alpha = Math.PI * a * sinT / lambda;
      let I: number;
      if (Math.abs(alpha) < 1e-12) {
        I = A0;
      } else {
        const s = Math.sin(alpha) / alpha;
        I = A0 * s * s;
      }
      intensityCurve.points.push({
        x: parseFloat((theta * 180 / Math.PI).toFixed(3)),
        y: parseFloat(I.toFixed(4)),
      });
      if (I > maxI) {
        maxI = I;
        maxTheta = theta;
      }
      // 检测极小值
      if (i > 1) {
        const prev = intensityCurve.points[i - 1]!.y;
        const prev2 = intensityCurve.points[i - 2]!.y;
        if (prev < prev2 && prev < I && prev < 0.1 * A0) {
          minimaAngles.push(parseFloat((theta * 180 / Math.PI).toFixed(2)));
        }
      }
    }

    // 中央主极大宽度 (极小值间距)
    const halfWidthAngle = a > 0 ? Math.asin(Math.min(1, lambda / a)) * 180 / Math.PI : 45;

    // 侧向扫描: 不同缝宽时的中央主极大相对高度
    const slitScan: ChartSeries = {
      xLabel: '缝宽 a (cm)',
      yLabel: '中央主极大相对高度',
      xUnit: 'cm',
      yUnit: '',
      points: [],
    };
    for (let ai = 1; ai <= 50; ai++) {
      const Icenter = A0; // 中央主极大恒为 A0
      slitScan.points.push({ x: ai, y: parseFloat(Icenter.toFixed(3)) });
    }

    const trajectory: TrajectoryPoint[] = [];
    for (let i = 0; i <= 50; i++) {
      const x = (i / 50) * (L * 2);
      trajectory.push({
        t: x,
        position: { x, y: 0 },
        velocity: { x: 0, y: 0 },
        kineticEnergy: 0,
        potentialEnergy: 0,
      });
    }

    const keyframes: Keyframe[] = [
      {
        label: '入射平面波',
        t: 0,
        position: { x: -L, y: 0 },
        velocity: { x: 0, y: 0 },
        description: `lambda=${lambda}cm, a=${a}cm, a/lambda=${ratio.toFixed(2)}, 衍射强度=${diffractionStrength}`,
      },
      {
        label: '狭缝 (衍射源)',
        t: L / 2,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        description: `a/lambda=${ratio.toFixed(2)}: ${diffractionStrength} diffraction`,
      },
      {
        label: '中央主极大峰值方向',
        t: L,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        description: `主极大宽度 2*halfWidth=${(2 * halfWidthAngle).toFixed(1)} deg`,
      },
    ];

    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '缝宽波长比',
        formula: 'ratio = a / lambda',
        calculation: `a/lambda = ${a}/${lambda} = ${ratio.toFixed(2)}`,
      },
      {
        order: 2,
        description: '衍射明显度判定',
        formula: 'ratio < 1 强; 1-3 中; 3-8 弱; >8 可忽略',
        result: diffractionStrength,
      },
      {
        order: 3,
        description: '中央主极大半宽度',
        formula: 'sin(theta) = lambda / a (极小值位置)',
        calculation: `half-width angle = ${halfWidthAngle.toFixed(2)} deg`,
      },
    ];

    const warnings: string[] = [];
    if (ratio > 10) warnings.push('缝宽远大于波长, 衍射现象不明显');
    if (ratio < 0.5) warnings.push('缝宽小于波长, 等效于单一波源');

    return {
      meta: {
        model: 'water-diffraction',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: {
        intensity_angle: intensityCurve,
        slit_scan: slitScan,
      },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          ratio, maxI, halfWidthAngle,
          maxThetaDeg: parseFloat((maxTheta * 180 / Math.PI).toFixed(2)),
          firstMinimaDeg: minimaAngles.length > 0 ? minimaAngles[0]! : 0,
        },
        flags: {
          isStrong: diffractionStrength === 'strong',
          isModerate: diffractionStrength === 'moderate',
          isWeak: diffractionStrength === 'weak',
          isNegligible: diffractionStrength === 'negligible',
        },
        rangeCheck: { withinRange: warnings.length === 0, warnings },
      },
      explanation: {
        summary: `水波衍射: lambda=${lambda}cm, a=${a}cm, ratio=a/lambda=${ratio.toFixed(2)}, 衍射强度=${diffractionStrength}, 半宽=${halfWidthAngle.toFixed(1)} deg`,
        steps,
        formulas: [
          { name: '衍射强度', formula: 'I(theta) = (sin(alpha)/alpha)^2, alpha = pi*a*sin(theta)/lambda', variables: { a: { value: a, unit: 'cm' }, lambda: { value: lambda, unit: 'cm' } } },
          { name: '半宽度', formula: 'theta_min = arcsin(lambda/a)', variables: { halfWidthAngle: { value: halfWidthAngle, unit: 'deg' } } },
        ],
      },
      errors: [],
      warnings,
    };
  }
}

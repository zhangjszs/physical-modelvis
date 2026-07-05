import { PhysicsModelBase } from './base.js';
import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';

/**
 * 黑体辐射模型 — 选必三 第四章 (维恩位移律 λT=b, 斯特藩-玻尔兹曼 E=σT⁴)
 */
export interface BlackBodyConstraint {
  readonly temperature: number;   // K
  readonly freqMin?: number;      // Hz
  readonly freqMax?: number;      // Hz
  readonly sampleCount?: number;
}

export class BlackBodyModel extends PhysicsModelBase {
  readonly name = '黑体辐射';
  readonly version = '1.0.0';
  readonly description = '普朗克黑体辐射: 维恩位移律+斯特藩-玻尔兹曼定律';
  readonly modelType = 'black-body' as const;
  readonly assumptions = ['理想黑体', '热平衡'];
  readonly applicableRange = 'T: 300-10000 K';
  readonly errorSources = ['实际物体非理想黑体', '温度不均匀'];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'temperature', unit: 'K', description: '黑体温度', required: true, min: 100, max: 20000 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);
    const c = problem.constraints?.blackBody;
    if (!c) throw new Error('black-body 需要 blackBody 约束');
    const T = c.temperature;
    const h = 6.626e-34, kB = 1.381e-23, cLight = 3e8, sigma = 5.67e-8, bWien = 2.898e-3;
    const fMin = c.freqMin ?? 1e12;
    const fMax = c.freqMax ?? 5e15;
    const N = c.sampleCount ?? 200;

    const x_t: ChartSeries = { xLabel: '频率 (Hz)', yLabel: '光谱辐射出射度', xUnit: 'Hz', yUnit: 'W/(m²·Hz)', points: [] };
    const trajectory: TrajectoryPoint[] = [];
    let maxI = 0;

    for (let i = 0; i <= N; i++) {
      const f = fMin * Math.pow(fMax / fMin, i / N);
      const expTerm = Math.exp(h * f / (kB * T)) - 1;
      const u = (8 * Math.PI * h * f * f * f) / (cLight * cLight * cLight) / (expTerm);
      const I = Math.max(0, u);
      if (I > maxI) maxI = I;
      x_t.points.push({ x: f, y: I });
      trajectory.push({ t: i * 0.01, position: { x: f, y: I }, velocity: { x: 0, y: 0 } });
    }

    const lambdaPeak = bWien / T;
    const totalPower = sigma * T * T * T * T;

    return {
      meta: { model: 'black-body', solver: 'analytical', computationTime: 0, timestamp: new Date().toISOString(), version: this.version },
      trajectories: [trajectory], keyframes: [
        { label: '峰值', t: 0, position: { x: cLight / lambdaPeak, y: maxI }, velocity: { x: 0, y: 0 }, description: `λ_peak=${(lambdaPeak * 1e9).toFixed(0)}nm, T=${T}K` },
      ],
      charts: { x_t },
      diagnostics: { conservedQuantities: [], maxValues: { T, lambdaPeak: lambdaPeak * 1e6, totalPower: totalPower / 1000, maxI }, rangeCheck: { withinRange: true, warnings: [] } },
      explanation: { summary: `黑体 T=${T}K, λ_peak=${(lambdaPeak * 1e6).toFixed(0)}μm, E_total=${(totalPower / 1000).toFixed(1)} kW/m²`, steps: [
        { order: 1, description: '维恩位移律', formula: 'λ_peak · T = b = 2.898×10⁻³ m·K', result: `λ_peak = ${(lambdaPeak * 1e6).toFixed(1)} μm` },
        { order: 2, description: '斯特藩-玻尔兹曼', formula: 'E = σ·T⁴', result: `E = ${(totalPower / 1000).toFixed(1)} kW/m²` },
      ], formulas: [{ name: '维恩', formula: 'λ_peak = b/T', variables: { T: { value: T, unit: 'K' }, lambda_peak: { value: lambdaPeak * 1e6, unit: 'μm' } } }] },
      errors: [], warnings: [],
    };
  }
}

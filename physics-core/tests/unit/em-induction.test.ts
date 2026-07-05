import { describe, it, expect } from 'vitest';
import { EMInductionModel } from '../../src/models/em-induction.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new EMInductionModel();

function makeProblem(overrides: {
  magneticField?: number;
  area?: number;
  turns?: number;
  angleDeg?: number;
  cuttingLength?: number;
  cuttingVelocity?: number;
} = {}): PhysicsProblem {
  const { magneticField = 0.5, area = 0.01, turns, angleDeg, cuttingLength, cuttingVelocity } = overrides;
  const ec: { magneticField: number; area: number; turns?: number; angleDeg?: number; cuttingLength?: number; cuttingVelocity?: number } = { magneticField, area };
  if (turns !== undefined) ec.turns = turns;
  if (angleDeg !== undefined) ec.angleDeg = angleDeg;
  if (cuttingLength !== undefined) ec.cuttingLength = cuttingLength;
  if (cuttingVelocity !== undefined) ec.cuttingVelocity = cuttingVelocity;
  return {
    id: 'ec-test',
    model: 'em-induction',
    bodies: [{ id: 'coil', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { emInduction: ec },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('EMInductionModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('em-induction');
    expect(model.name).toBe('电磁感应');
  });

  it('磁通量: B=0.5T, A=0.01m², θ=0° → Φ=0.005 Wb', () => {
    const r = model.solve(makeProblem({ magneticField: 0.5, area: 0.01, angleDeg: 0 }));
    expect(r.diagnostics.maxValues.flux).toBeCloseTo(0.005, 5);
  });

  it('磁通量 θ=90° → Φ=0', () => {
    const r = model.solve(makeProblem({ magneticField: 0.5, area: 0.01, angleDeg: 90 }));
    expect(r.diagnostics.maxValues.flux).toBeCloseTo(0, 10);
  });

  it('N 匝磁通量是 1 匝的 N 倍', () => {
    const r1 = model.solve(makeProblem({ turns: 1 }));
    const rN = model.solve(makeProblem({ turns: 10 }));
    expect(rN.diagnostics.maxValues.fluxTotal).toBeCloseTo(10 * r1.diagnostics.maxValues.flux, 5);
  });

  it('切割电动势: B=0.1T, L=0.5m, v=2m/s → ε=0.1V', () => {
    const r = model.solve(makeProblem({ magneticField: 0.1, cuttingLength: 0.5, cuttingVelocity: 2 }));
    expect(r.diagnostics.maxValues.emfCutting).toBeCloseTo(0.1, 5);
  });

  it('交变磁通量曲线 = B·A·cos(ωt), 峰值 = BA', () => {
    const r = model.solve(makeProblem({ magneticField: 1, area: 0.1 }));
    const chart = r.charts.x_t!;
    // 峰值点 y ≈ BA (mWb) = 1 × 0.1 × 1e3 = 100 mWb
    const maxPt = chart.points.reduce((a, b) => b.y > a.y ? b : a);
    expect(maxPt.y).toBeCloseTo(100, 1);
  });

  it('感应电动势峰值 = N·B·A·ω', () => {
    const r = model.solve(makeProblem({ magneticField: 1, area: 0.1, turns: 10 }));
    const omega = 2 * Math.PI * 50;
    expect(r.diagnostics.maxValues.emfPeak).toBeCloseTo(10 * 1 * 0.1 * omega, 5);
  });

  it('Φ-t 与 ε-t 相位差 90° (ε 超前 Φ)', () => {
    const r = model.solve(makeProblem({ magneticField: 0.5, area: 0.01 }));
    const fluxChart = r.charts.x_t!;
    const emfChart = r.charts.y_t!;
    // Φ(0) 为峰值; ε(T/4) 为峰值
    const maxFluxIdx = fluxChart.points.reduce((best, p, i) => p.y > fluxChart.points[best]!.y ? i : best, 0);
    const maxEmfIdx = emfChart.points.reduce((best, p, i) => p.y > emfChart.points[best]!.y ? i : best, 0);
    // 两者相差 T/4 / T * steps ≈ steps/4
    const steps = fluxChart.points.length;
    expect(Math.abs(maxEmfIdx - maxFluxIdx)).toBeCloseTo(steps / 4, 0);
  });
});

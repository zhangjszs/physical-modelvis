import { describe, it, expect } from 'vitest';
import { ACCurrentModel } from '../../src/models/ac-current.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new ACCurrentModel();

function makeProblem(overrides: {
  peakEmf?: number;
  angularFreq?: number;
  turnsRatio?: number;
} = {}): PhysicsProblem {
  const { peakEmf = 220, angularFreq = 2 * Math.PI * 50, turnsRatio } = overrides;
  const ac: { peakEmf: number; angularFreq: number; turnsRatio?: number } = { peakEmf, angularFreq };
  if (turnsRatio !== undefined) ac.turnsRatio = turnsRatio;
  return {
    id: 'ac-test',
    model: 'ac-current',
    bodies: [{ id: 'circuit', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { ac },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('ACCurrentModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('ac-current');
    expect(model.name).toBe('交变电流');
  });

  it('有效值 E_eff = Eₘ/√2', () => {
    const r = model.solve(makeProblem({ peakEmf: 220 * Math.sqrt(2) }));
    expect(r.diagnostics.maxValues.effectiveEmf).toBeCloseTo(220, 5);
  });

  it('频率 f = ω/(2π)', () => {
    const r = model.solve(makeProblem({ angularFreq: 2 * Math.PI * 50 }));
    expect(r.diagnostics.maxValues.frequency).toBeCloseTo(50, 5);
  });

  it('周期 T = 1/f = 20ms (50Hz)', () => {
    const r = model.solve(makeProblem({ angularFreq: 2 * Math.PI * 50 }));
    expect(r.diagnostics.maxValues.period).toBeCloseTo(0.02, 5);
  });

  it('变压器降压: 匝比 0.1 → U₂ = 0.1·Eₘ', () => {
    const r = model.solve(makeProblem({ peakEmf: 311, turnsRatio: 0.1 }));
    expect(r.diagnostics.maxValues.secondaryPeak).toBeCloseTo(31.1, 5);
  });

  it('变压器升压: 匝比 2 → U₂ = 2·Eₘ', () => {
    const r = model.solve(makeProblem({ peakEmf: 100, turnsRatio: 2 }));
    expect(r.diagnostics.maxValues.secondaryPeak).toBeCloseTo(200, 5);
  });

  it('e-t 曲线在 t=0 时 e=0', () => {
    const r = model.solve(makeProblem({ peakEmf: 100 }));
    const chart = r.charts.x_t!;
    expect(chart.points[0]!.y).toBeCloseTo(0, 5);
  });

  it('e-t 曲线峰值 = Eₘ', () => {
    const r = model.solve(makeProblem({ peakEmf: 200 }));
    const chart = r.charts.x_t!;
    const maxPt = chart.points.reduce((a, b) => Math.abs(b.y) > Math.abs(a.y) ? b : a);
    expect(Math.abs(maxPt.y)).toBeCloseTo(200, 1);
  });

  it('summary 包含频率和峰值', () => {
    const r = model.solve(makeProblem({ peakEmf: 311 }));
    expect(r.explanation.summary).toContain('50Hz');
    expect(r.explanation.summary).toContain('Eₘ=311');
  });
});

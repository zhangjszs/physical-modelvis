import { describe, it, expect } from 'vitest';
import { CapacitorChargeModel } from '../../src/models/capacitor-charge.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new CapacitorChargeModel();

function makeProblem(overrides: {
  resistance?: number;
  capacitance?: number;
  emf?: number;
  mode?: 'charge' | 'discharge';
  sampleCount?: number;
  timeSpanTau?: number;
} = {}): PhysicsProblem {
  const {
    resistance = 1000,
    capacitance = 1e-6,
    emf = 10,
    mode = 'charge',
    sampleCount = 100,
    timeSpanTau = 5,
  } = overrides;
  return {
    id: 'cap-test',
    model: 'capacitor-charge',
    bodies: [{ id: 'cap', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { capacitor: { resistance, capacitance, emf, mode, sampleCount, timeSpanTau } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('CapacitorChargeModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('capacitor-charge');
    expect(model.name).toBe('电容充放电');
  });

  it('充电: τ=RC=1ms, t=0 时 U_c=0, I=E/R=0.01A', () => {
    const r = model.solve(makeProblem({ resistance: 1000, capacitance: 1e-6, emf: 10, mode: 'charge' }));
    expect(r.diagnostics.maxValues.tau).toBeCloseTo(1e-3, 6);
    expect(r.diagnostics.maxValues.initialVoltage).toBeCloseTo(0, 6);
    expect(r.diagnostics.maxValues.initialCurrent).toBeCloseTo(0.01, 6);
  });

  it('充电: t→∞ 时 U_c→E=10V', () => {
    const r = model.solve(makeProblem({ resistance: 1000, capacitance: 1e-6, emf: 10, mode: 'charge' }));
    const lastUc = r.charts.Uc_t!.points[r.charts.Uc_t!.points.length - 1]!.y;
    expect(lastUc).toBeGreaterThan(9.9);  // 5τ → 99.3%
  });

  it('放电: t=0 时 U_c=E=10V, t→∞ 时 U_c→0', () => {
    const r = model.solve(makeProblem({ resistance: 1000, capacitance: 1e-6, emf: 10, mode: 'discharge' }));
    expect(r.diagnostics.maxValues.initialVoltage).toBeCloseTo(10, 6);
    const lastUc = r.charts.Uc_t!.points[r.charts.Uc_t!.points.length - 1]!.y;
    expect(lastUc).toBeLessThan(0.1);
  });

  it('放电: ln(U_c)-t 直线斜率 = −1/τ', () => {
    const r = model.solve(makeProblem({ resistance: 1000, capacitance: 1e-6, emf: 10, mode: 'discharge' }));
    const chart = r.charts.lnUc_t!;
    expect(chart.points.length).toBeGreaterThan(10);
    // 取首尾两点计算斜率
    const p0 = chart.points[0]!;
    const p1 = chart.points[chart.points.length - 1]!;
    const slope = (p1.y - p0.y) / (p1.x - p0.x);
    expect(slope).toBeCloseTo(-1000, -1);  // −1/τ = −1000
  });

  it('充电: Q-t 曲线最终 Q≈CE (5τ 时达 99.3%)', () => {
    const r = model.solve(makeProblem({ resistance: 1000, capacitance: 1e-6, emf: 10, mode: 'charge' }));
    const lastQ = r.charts.Q_t!.points[r.charts.Q_t!.points.length - 1]!.y;
    // 5τ → 99.3% → Q≈9.93e-6
    expect(lastQ).toBeGreaterThan(9.9e-6);
    expect(lastQ).toBeLessThan(1e-5);
  });

  it('关键帧包含 1τ~5τ', () => {
    const r = model.solve(makeProblem());
    expect(r.keyframes.length).toBe(5);
    expect(r.keyframes[0]!.label).toBe('1τ');
    expect(r.keyframes[4]!.label).toBe('5τ');
  });

  it('τ 过小触发 warning', () => {
    const r = model.solve(makeProblem({ resistance: 1, capacitance: 1e-9 }));
    expect(r.warnings.some(w => w.includes('时间常数'))).toBe(true);
  });

  it('summary 包含 τ 和 5τ', () => {
    const r = model.solve(makeProblem());
    expect(r.explanation.summary).toContain('τ=');
    expect(r.explanation.summary).toContain('5τ=');
  });
});

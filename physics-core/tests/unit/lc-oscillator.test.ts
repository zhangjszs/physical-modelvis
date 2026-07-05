import { describe, it, expect } from 'vitest';
import { LCOscillatorModel } from '../../src/models/lc-oscillator.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new LCOscillatorModel();

function makeProblem(overrides: {
  capacitance?: number;
  inductance?: number;
  initialCharge?: number;
} = {}): PhysicsProblem {
  const { capacitance = 100e-12, inductance = 10e-6, initialCharge = 1e-6 } = overrides;
  return {
    id: 'lc-test',
    model: 'lc-oscillator',
    bodies: [{ id: 'lc', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { lc: { capacitance, inductance, initialCharge } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('LCOscillatorModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('lc-oscillator');
    expect(model.name).toBe('LC 电磁振荡');
  });

  it('振荡周期 T = 2π√(LC)', () => {
    const r = model.solve(makeProblem({ capacitance: 100e-12, inductance: 10e-6 }));
    const C = 100e-12, L = 10e-6;
    const T = 2 * Math.PI * Math.sqrt(L * C);
    expect(r.diagnostics.maxValues.period).toBeCloseTo(T, 10);
  });

  it('振荡频率 f = 1/(2π√(LC))', () => {
    const r = model.solve(makeProblem({ capacitance: 100e-12, inductance: 10e-6 }));
    const C = 100e-12, L = 10e-6;
    const f = 1 / (2 * Math.PI * Math.sqrt(L * C));
    expect(r.diagnostics.maxValues.frequency).toBeCloseTo(f, 5);
  });

  it('C=100pF, L=10μH → f≈5 MHz', () => {
    const r = model.solve(makeProblem({ capacitance: 100e-12, inductance: 10e-6 }));
    expect(r.diagnostics.maxValues.frequency / 1e6).toBeCloseTo(5.03, 1);
  });

  it('总能量守恒 (理想 LC)', () => {
    const r = model.solve(makeProblem({ initialCharge: 2e-6, capacitance: 100e-12, inductance: 10e-6 }));
    const conserved = r.diagnostics.conservedQuantities[0];
    expect(conserved).toBeDefined();
    expect(conserved!.conserved).toBe(true);
    expect(conserved!.initialValue).toBeCloseTo(conserved!.finalValue, 15);
  });

  it('总能量 E_total = Q₀²/(2C)', () => {
    const r = model.solve(makeProblem({ initialCharge: 1e-6, capacitance: 1e-6 }));
    expect(r.diagnostics.maxValues.totalEnergy).toBeCloseTo((1e-6) ** 2 / (2 * 1e-6), 15);
  });

  it('q-t 曲线在 t=0 时 q=Q₀', () => {
    const r = model.solve(makeProblem({ initialCharge: 1e-6, capacitance: 100e-12, inductance: 10e-6 }));
    const chart = r.charts.x_t!;
    expect(chart.points[0]!.y).toBeCloseTo(1, 3); // Q0=1e-6, display=1μC
  });

  it('i-t 曲线在 t=0 时 i=0', () => {
    const r = model.solve(makeProblem({ initialCharge: 1e-6, capacitance: 100e-12, inductance: 10e-6 }));
    const chart = r.charts.y_t!;
    expect(Math.abs(chart.points[0]!.y)).toBeLessThan(0.01);
  });

  it('磁场能与电场能互补：总能量恒定', () => {
    const r = model.solve(makeProblem({ initialCharge: 1e-6, capacitance: 100e-12, inductance: 10e-6 }));
    const EeChart = r.charts.ke_t!;
    const EmChart = r.charts.pe_t!;
    // 任一点 Ee + Em = total
    const total = r.diagnostics.maxValues.totalEnergy * 1e6;
    for (let i = 0; i < EeChart.points.length; i += 20) {
      const sum = EeChart.points[i]!.y + EmChart.points[i]!.y;
      expect(sum).toBeCloseTo(total, 2);
    }
  });

  it('summary 包含振荡频率', () => {
    const r = model.solve(makeProblem({ capacitance: 100e-12, inductance: 10e-6 }));
    expect(r.explanation.summary).toContain('T=');
    expect(r.explanation.summary).toContain('E_total=');
  });
});

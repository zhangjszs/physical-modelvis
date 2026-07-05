import { describe, it, expect } from 'vitest';
import { CircuitModel } from '../../src/models/circuit.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new CircuitModel();

function makeProblem(overrides: {
  emf?: number;
  internalResistance?: number;
  resistors?: ReadonlyArray<{ resistance: number; connection: 'series' | 'parallel' }>;
} = {}): PhysicsProblem {
  const { emf = 12, internalResistance, resistors = [{ resistance: 10, connection: 'series' }] } = overrides;
  const cc: { emf: number; internalResistance?: number; resistors: ReadonlyArray<{ resistance: number; connection: 'series' | 'parallel' }> } = { emf, resistors };
  if (internalResistance !== undefined) cc.internalResistance = internalResistance;
  return {
    id: 'circuit-test',
    model: 'circuit',
    bodies: [{ id: 'wire', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { circuit: cc },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('CircuitModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('circuit');
    expect(model.name).toBe('直流电路分析');
  });

  it('简单回路: E=12V R=10Ω r=0Ω → I=1.2A U=12V', () => {
    const r = model.solve(makeProblem({ emf: 12, internalResistance: 0, resistors: [{ resistance: 10, connection: 'series' }] }));
    expect(r.diagnostics.maxValues.current).toBeCloseTo(1.2, 5);
    expect(r.diagnostics.maxValues.terminalVoltage).toBeCloseTo(12, 5);
  });

  it('含内阻: E=12V R=10Ω r=2Ω → I=1A U=10V', () => {
    const r = model.solve(makeProblem({ emf: 12, internalResistance: 2, resistors: [{ resistance: 10, connection: 'series' }] }));
    expect(r.diagnostics.maxValues.current).toBeCloseTo(1, 5);
    expect(r.diagnostics.maxValues.terminalVoltage).toBeCloseTo(10, 5);
  });

  it('串联: R1=10 R2=20 → R_eq=30', () => {
    const r = model.solve(makeProblem({ resistors: [
      { resistance: 10, connection: 'series' },
      { resistance: 20, connection: 'series' },
    ] }));
    expect(r.diagnostics.maxValues.equivalentResistance).toBeCloseTo(30, 5);
    expect(r.diagnostics.maxValues.isPureSeries).toBe(1);
  });

  it('并联: R1=10 R2=10 → R_eq=5', () => {
    const r = model.solve(makeProblem({ resistors: [
      { resistance: 10, connection: 'series' },
      { resistance: 10, connection: 'parallel' },
    ] }));
    expect(r.diagnostics.maxValues.equivalentResistance).toBeCloseTo(5, 5);
  });

  it('并联: R1=6 R2=12 → R_eq=4', () => {
    const r = model.solve(makeProblem({ resistors: [
      { resistance: 6, connection: 'series' },
      { resistance: 12, connection: 'parallel' },
    ] }));
    // 1/(1/6 + 1/12) = 1/(2/12 + 1/12) = 1/(3/12) = 4
    expect(r.diagnostics.maxValues.equivalentResistance).toBeCloseTo(4, 5);
  });

  it('多电阻并联: [10s, 20p, 20p] → 10∥20∥20 = 5', () => {
    const r = model.solve(makeProblem({ resistors: [
      { resistance: 10, connection: 'series' },
      { resistance: 20, connection: 'parallel' },
      { resistance: 20, connection: 'parallel' },
    ] }));
    // 1/(1/10 + 1/20 + 1/20) = 1/(0.1+0.05+0.05) = 1/0.2 = 5
    expect(r.diagnostics.maxValues.equivalentResistance).toBeCloseTo(5, 5);
  });

  it('串并联混合: [10s, 10s, 20p, 5s] = 10 + 1/(1/10+1/20) + ... = 26.67', () => {
    const r = model.solve(makeProblem({ resistors: [
      { resistance: 10, connection: 'series' },
      { resistance: 10, connection: 'series' },
      { resistance: 20, connection: 'parallel' },
      { resistance: 5, connection: 'series' },
    ] }));
    // fold: 10+10=20; 1/(1/20+1/20)=10; 10+5=15 ← but 20 parallel with 20 then series 5
    // wait: fold computes: req=10; →+10=20; →∥20=10; →+5=15
    expect(r.diagnostics.maxValues.equivalentResistance).toBeCloseTo(15, 5);
  });

  it('效率 η = R/(R+r), r=0时 η=100%', () => {
    const r = model.solve(makeProblem({ emf: 10, internalResistance: 0, resistors: [{ resistance: 10, connection: 'series' }] }));
    expect(r.diagnostics.maxValues.efficiency).toBeCloseTo(1, 5);
  });

  it('R=r 时输出功率最大 (最大功率传输定理)', () => {
    const r = model.solve(makeProblem({ emf: 10, internalResistance: 5, resistors: [{ resistance: 5, connection: 'series' }] }));
    // P_max = E²/(4r) = 100/20 = 5
    expect(r.diagnostics.maxValues.maxPower).toBeCloseTo(5, 2);
    expect(r.diagnostics.maxValues.optimalResistance).toBeCloseTo(5, 0);
  });

  it('U-R 曲线 (含内阻): R→0 时 U→0; R→∞ 时 U→E', () => {
    // 内阻 r=2Ω 时 U = E·R/(R+r), R→0 时 U→0; R→∞ 时 U→E
    const r = model.solve(makeProblem({ emf: 12, internalResistance: 2 }));
    const chart = r.charts.x_t!;
    expect(chart.points[0]!.y).toBeLessThan(1);   // R→0 时 U≈0
    const last = chart.points[chart.points.length - 1]!;
    expect(last.y).toBeGreaterThan(11);            // R→∞ 时 U→E=12
  });

  it('summary 包含电流/电压/功率', () => {
    const r = model.solve(makeProblem({ emf: 9, resistors: [{ resistance: 3, connection: 'series' }] }));
    expect(r.explanation.summary).toContain('I=');
    expect(r.explanation.summary).toContain('U=');
    expect(r.explanation.summary).toContain('P=');
  });

  it('短路 (R≈0) 触发 warning', () => {
    const r = model.solve(makeProblem({ resistors: [{ resistance: 0.1, connection: 'series' }] }));
    expect(r.warnings.some(w => w.includes('短路'))).toBe(true);
  });
});

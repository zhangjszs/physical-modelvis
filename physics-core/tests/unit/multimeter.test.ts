import { describe, it, expect } from 'vitest';
import { MultimeterModel } from '../../src/models/multimeter.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new MultimeterModel();

function makeProblem(overrides: {
  mode?: 'DCV' | 'ACV' | 'Ohm' | 'DCA';
  range?: number;
  testValue?: number;
} = {}): PhysicsProblem {
  const { mode = 'DCV', range = 10, testValue = 5 } = overrides;
  return {
    id: 'multi-test',
    model: 'multimeter',
    bodies: [{ id: 'obj', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { multimeter: { mode, range, testValue } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('MultimeterModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('multimeter');
    expect(model.name).toBe('多用电表使用');
  });

  it('DCV: 5V (10V量程) → 偏转 50%', () => {
    const r = model.solve(makeProblem({ mode: 'DCV', range: 10, testValue: 5 }));
    expect(r.diagnostics.maxValues.deflection).toBeCloseTo(0.5, 5);
  });

  it('DCV: 0V → 偏转 0%', () => {
    const r = model.solve(makeProblem({ mode: 'DCV', range: 10, testValue: 0 }));
    expect(r.diagnostics.maxValues.deflection).toBeCloseTo(0, 5);
  });

  it('DCV: 满量程 → 偏转 100%', () => {
    const r = model.solve(makeProblem({ mode: 'DCV', range: 10, testValue: 10 }));
    expect(r.diagnostics.maxValues.deflection).toBeCloseTo(1, 5);
  });

  it('DCA: 1.5A (2A量程) → 偏转 75%', () => {
    const r = model.solve(makeProblem({ mode: 'DCA', range: 2, testValue: 1.5 }));
    expect(r.diagnostics.maxValues.deflection).toBeCloseTo(0.75, 5);
  });

  it('Ohm: Rx=0 → 满偏 (100%)', () => {
    const r = model.solve(makeProblem({ mode: 'Ohm', range: 1000, testValue: 0 }));
    expect(r.diagnostics.maxValues.deflection).toBeCloseTo(1, 5);
  });

  it('Ohm: Rx 很大 (∞) → 偏转接近 0', () => {
    const r = model.solve(makeProblem({ mode: 'Ohm', range: 1000, testValue: 1e9 }));
    expect(r.diagnostics.maxValues.deflection).toBeCloseTo(0, 2);
  });

  it('Ohm: Rx = 中值电阻 → 偏转 50%', () => {
    const r = model.solve(makeProblem({ mode: 'Ohm', range: 1000, testValue: 1000 }));
    expect(r.diagnostics.maxValues.deflection).toBeCloseTo(0.5, 2);
  });

  it('偏转接近满偏 → warning', () => {
    const r = model.solve(makeProblem({ mode: 'DCV', range: 10, testValue: 9.9 }));
    expect(r.warnings.some(w => w.includes('满偏'))).toBe(true);
  });

  it('偏转接近 0 → warning', () => {
    const r = model.solve(makeProblem({ mode: 'DCV', range: 10, testValue: 0.01 }));
    expect(r.warnings.some(w => w.includes('偏转很小'))).toBe(true);
  });

  it('summary 包含档位的被测量', () => {
    const r = model.solve(makeProblem({ mode: 'DCV', range: 250, testValue: 12 }));
    expect(r.explanation.summary).toContain('12');
    expect(r.explanation.summary).toContain('DCV');
  });

  it('static-diagram 存在且有点', () => {
    const r = model.solve(makeProblem());
    const chart = r.charts['static-diagram'];
    expect(chart).toBeDefined();
    expect(chart!.points.length).toBeGreaterThan(0);
  });
});

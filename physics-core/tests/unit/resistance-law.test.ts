import { describe, it, expect } from 'vitest';
import { ResistanceLawModel } from '../../src/models/resistance-law.js';
import type { PhysicsProblem, ResistanceMaterial } from '../../src/types/problem.js';
import { RESISTIVITY } from '../../src/types/problem.js';

const model = new ResistanceLawModel();

function makeProblem(overrides: {
  length?: number;
  diameter?: number;
  material?: ResistanceMaterial;
  sampleCount?: number;
} = {}): PhysicsProblem {
  const {
    length = 1,
    diameter = 1,
    material = 'Cu',
    sampleCount = 50,
  } = overrides;
  return {
    id: 'rl-test',
    model: 'resistance-law',
    bodies: [{ id: 'wire', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { resistanceLaw: { length, diameter, material, sampleCount } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('ResistanceLawModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('resistance-law');
    expect(model.name).toBe('电阻定律');
  });

  it('基准: L=1m, d=1mm, Cu=1.68e-8', () => {
    const r = model.solve(makeProblem({ length: 1, diameter: 1, material: 'Cu' }));
    const rho = RESISTIVITY.Cu;
    const d = 1 / 1000;
    const S = Math.PI * (d / 2) ** 2;
    const expectedR = rho * 1 / S;
    expect(r.diagnostics.maxValues.baseResistance).toBeCloseTo(expectedR, 10);
  });

  it('R-L 线性: 长度加倍 → 电阻加倍', () => {
    const r1 = model.solve(makeProblem({ length: 1, diameter: 1, material: 'Cu' }));
    const r2 = model.solve(makeProblem({ length: 2, diameter: 1, material: 'Cu' }));
    expect(r2.diagnostics.maxValues.baseResistance).toBeCloseTo(
      r1.diagnostics.maxValues.baseResistance * 2, 10,
    );
  });

  it('R-S 反比: 直径加倍 (面积×4) → 电阻 1/4', () => {
    const r1 = model.solve(makeProblem({ length: 1, diameter: 1, material: 'Cu' }));
    const r2 = model.solve(makeProblem({ length: 1, diameter: 2, material: 'Cu' }));
    expect(r2.diagnostics.maxValues.baseResistance).toBeCloseTo(
      r1.diagnostics.maxValues.baseResistance / 4, 10,
    );
  });

  it('材料电阻率: Cu < Fe < Nichrome', () => {
    const rCu = model.solve(makeProblem({ material: 'Cu' }));
    const rFe = model.solve(makeProblem({ material: 'Fe' }));
    const rNi = model.solve(makeProblem({ material: 'Nichrome' }));
    expect(rCu.diagnostics.maxValues.baseResistance).toBeLessThan(rFe.diagnostics.maxValues.baseResistance);
    expect(rFe.diagnostics.maxValues.baseResistance).toBeLessThan(rNi.diagnostics.maxValues.baseResistance);
  });

  it('电阻率数值与 RESISTIVITY 表一致', () => {
    expect(RESISTIVITY.Cu).toBeCloseTo(1.68e-8, 12);
    expect(RESISTIVITY.Fe).toBeCloseTo(1.0e-7, 10);
    expect(RESISTIVITY.Nichrome).toBeCloseTo(1.1e-6, 8);
  });

  it('材料比较图覆盖三种材料', () => {
    const r = model.solve(makeProblem());
    expect(r.charts.R_material!.points.length).toBe(3);
  });

  it('R 过小触发 warning', () => {
    const r = model.solve(makeProblem({ length: 0.01, diameter: 10 }));
    expect(r.warnings.some(w => w.includes('接触电阻'))).toBe(true);
  });

  it('summary 包含 R₀', () => {
    const r = model.solve(makeProblem());
    expect(r.explanation.summary).toContain('R₀=');
  });
});

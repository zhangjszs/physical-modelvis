import { describe, it, expect } from 'vitest';
import { ParallelPlateCapacitorModel } from '../../src/models/parallel-plate-capacitor.js';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { PHYSICS_CONSTANTS } from '../../src/units/constants.js';

const model = new ParallelPlateCapacitorModel();

function makeProblem(overrides: {
  area?: number;
  distance?: number;
  epsilonR?: number;
  sampleCount?: number;
} = {}): PhysicsProblem {
  const {
    area = 0.01,
    distance = 0.001,
    epsilonR = 1,
    sampleCount = 50,
  } = overrides;
  return {
    id: 'ppc-test',
    model: 'parallel-plate-capacitor',
    bodies: [{ id: 'plate', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { parallelPlate: { area, distance, epsilonR, sampleCount } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('ParallelPlateCapacitorModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('parallel-plate-capacitor');
    expect(model.name).toBe('平行板电容器因素');
  });

  it('基准: S=0.01m², d=0.001m, εr=1 → C=εrε₀S/d', () => {
    const r = model.solve(makeProblem({ area: 0.01, distance: 0.001, epsilonR: 1 }));
    const eps0 = PHYSICS_CONSTANTS.epsilon0.value;
    const expected = eps0 * 1 * 0.01 / 0.001;
    expect(r.diagnostics.maxValues.baseCapacitance).toBeCloseTo(expected, 15);
  });

  it('C-1/d 线性: 斜率 = εr·ε₀·S (固定 S, εr)', () => {
    const r = model.solve(makeProblem({ area: 0.01, distance: 0.001, epsilonR: 1 }));
    const chart = r.charts.C_inv_d!;
    expect(chart.points.length).toBeGreaterThan(5);
    const p0 = chart.points[0]!;
    const p1 = chart.points[chart.points.length - 1]!;
    const slope = (p1.y - p0.y) / (p1.x - p0.x);
    const eps0 = PHYSICS_CONSTANTS.epsilon0.value;
    expect(slope).toBeCloseTo(eps0 * 1 * 0.01, 14);
  });

  it('C-S 线性: 斜率 = εr·ε₀/d (固定 d, εr)', () => {
    const r = model.solve(makeProblem({ area: 0.01, distance: 0.001, epsilonR: 2 }));
    const eps0 = PHYSICS_CONSTANTS.epsilon0.value;
    expect(r.diagnostics.maxValues.slope_C_S).toBeCloseTo(2 * eps0 / 0.001, 10);
  });

  it('C-εr 线性: 斜率 = ε₀·S/d (固定 S, d)', () => {
    const r = model.solve(makeProblem({ area: 0.01, distance: 0.001, epsilonR: 1 }));
    const eps0 = PHYSICS_CONSTANTS.epsilon0.value;
    expect(r.diagnostics.maxValues.slope_C_epsilonR).toBeCloseTo(eps0 * 0.01 / 0.001, 10);
  });

  it('相对介电常数加倍 → 电容加倍', () => {
    const r1 = model.solve(makeProblem({ area: 0.01, distance: 0.001, epsilonR: 1 }));
    const r2 = model.solve(makeProblem({ area: 0.01, distance: 0.001, epsilonR: 2 }));
    expect(r2.diagnostics.maxValues.baseCapacitance).toBeCloseTo(
      r1.diagnostics.maxValues.baseCapacitance * 2, 15,
    );
  });

  it('极板距离加倍 → 电容减半', () => {
    const r1 = model.solve(makeProblem({ area: 0.01, distance: 0.001, epsilonR: 1 }));
    const r2 = model.solve(makeProblem({ area: 0.01, distance: 0.002, epsilonR: 1 }));
    expect(r2.diagnostics.maxValues.baseCapacitance).toBeCloseTo(
      r1.diagnostics.maxValues.baseCapacitance / 2, 15,
    );
  });

  it('极板面积加倍 → 电容加倍', () => {
    const r1 = model.solve(makeProblem({ area: 0.01, distance: 0.001, epsilonR: 1 }));
    const r2 = model.solve(makeProblem({ area: 0.02, distance: 0.001, epsilonR: 1 }));
    expect(r2.diagnostics.maxValues.baseCapacitance).toBeCloseTo(
      r1.diagnostics.maxValues.baseCapacitance * 2, 15,
    );
  });

  it('d 过小触发 warning', () => {
    const r = model.solve(makeProblem({ distance: 1e-5 }));
    expect(r.warnings.some(w => w.includes('击穿'))).toBe(true);
  });

  it('summary 包含基准电容', () => {
    const r = model.solve(makeProblem());
    expect(r.explanation.summary).toContain('C₀=');
  });
});

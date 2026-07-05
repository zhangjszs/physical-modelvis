import { describe, it, expect } from 'vitest';
import { AmpereForceModel } from '../../src/models/ampere-force.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new AmpereForceModel();

function makeProblem(overrides: {
  B?: number;
  I?: number;
  L?: number;
  angle?: number;
} = {}): PhysicsProblem {
  const { B = 0.5, I = 2, L = 0.1, angle = 90 } = overrides;
  return {
    id: 'af-test',
    model: 'ampere-force',
    bodies: [{ id: 'wire', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { ampereForce: { B, I, L, angle } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('AmpereForceModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('ampere-force');
    expect(model.name).toBe('安培力因素');
  });

  it('F = BIL: B=0.5T I=2A L=0.1m θ=90° → F=0.1N', () => {
    const r = model.solve(makeProblem({ B: 0.5, I: 2, L: 0.1, angle: 90 }));
    expect(r.diagnostics.maxValues.F).toBeCloseTo(0.1, 5);
  });

  it('θ=0° → F=0 (平行磁场)', () => {
    const r = model.solve(makeProblem({ angle: 0 }));
    expect(r.diagnostics.maxValues.F).toBeCloseTo(0, 10);
    expect(r.warnings.some(w => w.includes('平行'))).toBe(true);
  });

  it('θ=30° → F = BIL·sin30° = BIL/2', () => {
    const r = model.solve(makeProblem({ B: 1, I: 3, L: 0.2, angle: 30 }));
    expect(r.diagnostics.maxValues.F).toBeCloseTo(0.3, 5);
  });

  it('F-I 图斜率 = B·L·sinθ', () => {
    const r = model.solve(makeProblem({ B: 0.4, I: 1, L: 0.3, angle: 60 }));
    const expected = 0.4 * 0.3 * Math.sin(60 * Math.PI / 180);
    expect(r.diagnostics.maxValues.slope_F_I).toBeCloseTo(expected, 3);
  });

  it('F-L 图斜率 = B·I·sinθ', () => {
    const r = model.solve(makeProblem({ B: 0.4, I: 1, L: 0.3, angle: 60 }));
    const expected = 0.4 * 1 * Math.sin(60 * Math.PI / 180);
    expect(r.diagnostics.maxValues.slope_F_L).toBeCloseTo(expected, 3);
  });

  it('F-sinθ 图斜率 = B·I·L (线性)', () => {
    const B = 0.5, I = 2, L = 0.1;
    const r = model.solve(makeProblem({ B, I, L, angle: 90 }));
    expect(r.diagnostics.maxValues.slope_F_sinTheta).toBeCloseTo(B * I * L, 5);
  });

  it('F-I 图第一点 I=0 → F=0 (直线过原点)', () => {
    const r = model.solve(makeProblem());
    const firstPt = r.charts.x_t!.points[0]!;
    expect(firstPt.x).toBeCloseTo(0, 5);
    expect(firstPt.y).toBeCloseTo(0, 5);
  });

  it('F-I 图最后一点的 I ≈ 2×设置值', () => {
    const r = model.solve(makeProblem({ I: 2 }));
    const lastPt = r.charts.x_t!.points[r.charts.x_t!.points.length - 1]!;
    expect(lastPt.x).toBeCloseTo(4, 1);
  });

  it('summary 包含安培力结果', () => {
    const r = model.solve(makeProblem({ B: 0.5, I: 2, L: 0.1 }));
    expect(r.explanation.summary).toContain('0.5T');
    expect(r.explanation.summary).toContain('F=');
  });

  it('steps 包含控制变量法', () => {
    const r = model.solve(makeProblem());
    const stepDescs = r.explanation.steps.map(s => s.description);
    expect(stepDescs.some(d => d.includes('控制变量'))).toBe(true);
    expect(stepDescs.some(d => d.includes('左手定则'))).toBe(true);
  });
});

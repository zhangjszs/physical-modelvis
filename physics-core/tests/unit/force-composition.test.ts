import { describe, it, expect } from 'vitest';
import { ForceCompositionModel } from '../../src/models/force-composition.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new ForceCompositionModel();

function makeProblem(overrides: Partial<{ f1: number; f2: number; angleDeg: number; f1AngleDeg: number }> = {}): PhysicsProblem {
  const { f1 = 3, f2 = 4, angleDeg = 90, f1AngleDeg = 0 } = overrides;
  return {
    id: 'force-composition-test',
    model: 'force-composition',
    bodies: [{ id: 'point', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { forceComposition: { f1, f2, angleDeg, f1AngleDeg } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 360 },
  };
}

describe('ForceCompositionModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('force-composition');
    expect(model.name).toBe('力的合成与分解');
  });

  it('θ=90°, F1=3N, F2=4N → F=5N (3-4-5 直角三角形)', () => {
    const r = model.solve(makeProblem({ f1: 3, f2: 4, angleDeg: 90 }));
    const F = r.diagnostics.maxValues.currentResultant;
    expect(F).toBeCloseTo(5, 4);
  });

  it('θ=0° (同向) → F = F1 + F2', () => {
    const r = model.solve(makeProblem({ f1: 3, f2: 4, angleDeg: 0 }));
    const F = r.diagnostics.maxValues.currentResultant;
    expect(F).toBeCloseTo(7, 4);
  });

  it('θ=180° (反向) → F = |F1 - F2|', () => {
    const r = model.solve(makeProblem({ f1: 3, f2: 4, angleDeg: 180 }));
    const F = r.diagnostics.maxValues.currentResultant;
    expect(F).toBeCloseTo(1, 4);
  });

  it('θ=60°, F1=F2=1N → F = √3', () => {
    // F = √(1 + 1 + 2cos60°) = √(2 + 1) = √3
    const r = model.solve(makeProblem({ f1: 1, f2: 1, angleDeg: 60 }));
    const F = r.diagnostics.maxValues.currentResultant;
    expect(F).toBeCloseTo(Math.sqrt(3), 4);
  });

  it('合力最大值 = F1 + F2 (θ=0°)', () => {
    const r = model.solve(makeProblem({ f1: 3, f2: 4, angleDeg: 90 }));
    expect(r.diagnostics.maxValues.maxResultant).toBe(7);
    expect(r.diagnostics.maxValues.minResultant).toBe(1);
  });

  it('生成 F-θ 曲线 (合力随夹角变化)', () => {
    const r = model.solve(makeProblem({ f1: 3, f2: 4, angleDeg: 90 }));
    expect(r.charts.F_theta).toBeDefined();
    const points = r.charts.F_theta!.points;
    expect(points.length).toBe(361); // sampleCount + 1
    // 第一个点 (θ=0°): F = 7
    expect(points[0]!.y).toBeCloseTo(7, 4);
    // 中间点 (θ=90°): F ≈ 5 (索引 = 361/2 = 180)
    const midPoint = points[180]!;
    expect(midPoint.y).toBeCloseTo(5, 4);
    // 最后点 (θ=180°): F = 1
    expect(points[points.length - 1]!.y).toBeCloseTo(1, 4);
  });

  it('生成受力分析图，包含 F1、F2、合力 F', () => {
    const r = model.solve(makeProblem({ f1: 3, f2: 4, angleDeg: 90 }));
    expect(r.charts.force_diagram).toBeDefined();
    const fd = r.charts.force_diagram!;
    expect(fd.forces).toHaveLength(3);
    expect(fd.forces[0]!.name).toContain('F1');
    expect(fd.forces[1]!.name).toContain('F2');
    expect(fd.forces[2]!.name).toContain('合力');
  });

  it('公式说明包含平行四边形定则', () => {
    const r = model.solve(makeProblem({ f1: 3, f2: 4, angleDeg: 60 }));
    const formulaNames = r.explanation.formulas.map(f => f.name);
    expect(formulaNames).toContain('合力大小');
    expect(formulaNames).toContain('同向合成');
    expect(formulaNames).toContain('反向合成');
    expect(formulaNames).toContain('垂直合成');
  });

  it('合力方向角 φ 计算正确 (θ=90°, F1=F2 → φ=45°)', () => {
    const r = model.solve(makeProblem({ f1: 1, f2: 1, angleDeg: 90 }));
    const phi = r.diagnostics.maxValues.currentAngle;
    expect(phi).toBeCloseTo(45, 1);
  });
});

import { describe, it, expect } from 'vitest';
import { NewtonThirdLawModel } from '../../src/models/newton-third-law.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new NewtonThirdLawModel();

function makeProblem(overrides: Partial<{ forceAB: number; massA: number; massB: number; allowMotion: boolean }> = {}): PhysicsProblem {
  const { forceAB = 5, massA = 1, massB = 2, allowMotion = false } = overrides;
  return {
    id: 'newton-third-law-test',
    model: 'newton-third-law',
    bodies: [
      { id: 'A', mass: { value: massA, unit: 'kg' }, position: { x: -1, y: 0 }, velocity: { x: 0, y: 0 } },
      { id: 'B', mass: { value: massB, unit: 'kg' }, position: { x: 1, y: 0 }, velocity: { x: 0, y: 0 } },
    ],
    constraints: { newtonThirdLaw: { forceAB, allowMotion } },
    environment: {},
    timeConfig: { duration: 2, sampleCount: 200 },
  };
}

describe('NewtonThirdLawModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('newton-third-law');
    expect(model.name).toBe('牛顿第三定律');
  });

  it('F_AB 与 F_BA 大小相等、方向相反', () => {
    const r = model.solve(makeProblem({ forceAB: 5 }));
    expect(r.diagnostics.maxValues.forceAB).toBe(5);
    expect(r.diagnostics.maxValues.forceBA).toBe(5); // |F_BA| = |F_AB|
    // 力的方向相反 (F_AB = +5, F_BA = -5)
    const forces = r.charts.force_diagram!.forces;
    expect(forces[0]!.vector.x).toBe(5);   // F_AB
    expect(forces[1]!.vector.x).toBe(-5);  // F_BA
  });

  it('守恒量: 作用力 = 反作用力', () => {
    const r = model.solve(makeProblem({ forceAB: 8 }));
    expect(r.diagnostics.conservedQuantities).toHaveLength(1);
    const cq = r.diagnostics.conservedQuantities[0]!;
    expect(cq.name).toBe('作用力 = 反作用力');
    expect(cq.conserved).toBe(true);
    expect(cq.maxDeviation).toBe(0);
  });

  it('allowMotion=false: 两物体保持静止 (a=0)', () => {
    const r = model.solve(makeProblem({ allowMotion: false }));
    expect(r.diagnostics.maxValues.acceleration).toBe(0);
    // 末时刻速度仍为 0
    const trajA = r.trajectories[0]!;
    const finalA = trajA[trajA.length - 1]!;
    expect(finalA.velocity.x).toBe(0);
  });

  it('allowMotion=true: 两物体共同加速 a = F/(mA+mB)', () => {
    const r = model.solve(makeProblem({ forceAB: 6, massA: 1, massB: 2, allowMotion: true }));
    const expectedA = 6 / (1 + 2); // = 2 m/s²
    expect(r.diagnostics.maxValues.acceleration).toBeCloseTo(expectedA, 4);
  });

  it('两物体保持相对位置不变 (绳连接)', () => {
    const r = model.solve(makeProblem({ allowMotion: true, forceAB: 6 }));
    const trajA = r.trajectories[0]!;
    const trajB = r.trajectories[1]!;
    const lastA = trajA[trajA.length - 1]!;
    const lastB = trajB[trajB.length - 1]!;
    // 初始位置 xA=-1, xB=1, 相距 2
    expect(lastB.position.x - lastA.position.x).toBeCloseTo(2, 4);
  });

  it('生成 F-t 图表', () => {
    const r = model.solve(makeProblem({ forceAB: 5 }));
    expect(r.charts.F_t).toBeDefined();
    // F_AB 恒为 5
    expect(r.charts.F_t!.points[0]!.y).toBe(5);
    expect(r.charts.F_t!.points[r.charts.F_t!.points.length - 1]!.y).toBe(5);
  });

  it('公式说明包含 F_AB = -F_BA', () => {
    const r = model.solve(makeProblem({ forceAB: 5 }));
    const formulaNames = r.explanation.formulas.map(f => f.name);
    expect(formulaNames).toContain('牛顿第三定律');
    expect(formulaNames).toContain('大小相等');
    expect(formulaNames).toContain('同时性');
    expect(formulaNames).toContain('系统性');
  });

  it('需要两个物体 (单物体抛错)', () => {
    const problem: PhysicsProblem = {
      id: 'fail',
      model: 'newton-third-law',
      bodies: [{ id: 'only', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
      constraints: { newtonThirdLaw: { forceAB: 5 } },
      environment: {},
      timeConfig: { duration: 1, sampleCount: 100 },
    };
    expect(() => model.solve(problem)).toThrow('两个物体');
  });

  it('缺少 newtonThirdLaw 约束抛错', () => {
    const problem: PhysicsProblem = {
      id: 'fail',
      model: 'newton-third-law',
      bodies: [
        { id: 'A', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
        { id: 'B', mass: { value: 1, unit: 'kg' }, position: { x: 1, y: 0 }, velocity: { x: 0, y: 0 } },
      ],
      constraints: {},
      environment: {},
      timeConfig: { duration: 1, sampleCount: 100 },
    };
    expect(() => model.solve(problem)).toThrow('newtonThirdLaw');
  });
});

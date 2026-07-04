import { describe, it, expect } from 'vitest';
import { SlidingFrictionModel } from '../../src/models/sliding-friction.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new SlidingFrictionModel();

function makeProblem(overrides: Partial<{ mu: number; mass: number; g: number; uniformMotion: boolean }> = {}): PhysicsProblem {
  const { mu = 0.3, mass = 1, g = 9.8, uniformMotion = true } = overrides;
  return {
    id: 'sliding-friction-test',
    model: 'sliding-friction',
    bodies: [{ id: 'block', mass: { value: mass, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0.5, y: 0 } }],
    constraints: { slidingFriction: { frictionCoefficient: mu, uniformMotion } },
    environment: { gravity: { enabled: true, value: g } },
    timeConfig: { duration: 2, sampleCount: 200 },
  };
}

describe('SlidingFrictionModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('sliding-friction');
    expect(model.name).toBe('滑动摩擦力');
  });

  it('正压力 N = mg', () => {
    const r = model.solve(makeProblem({ mu: 0.3, mass: 2, g: 10 }));
    expect(r.diagnostics.maxValues.normalForce).toBeCloseTo(20, 4); // 2 * 10
  });

  it('滑动摩擦力 f = μN = μmg', () => {
    const r = model.solve(makeProblem({ mu: 0.5, mass: 2, g: 10 }));
    // f = 0.5 * 2 * 10 = 10 N
    expect(r.diagnostics.maxValues.frictionForce).toBeCloseTo(10, 4);
  });

  it('匀速运动: F_pull = f, 加速度 = 0', () => {
    const r = model.solve(makeProblem({ mu: 0.3, mass: 1, g: 9.8, uniformMotion: true }));
    expect(r.diagnostics.maxValues.acceleration).toBe(0);
    expect(r.diagnostics.maxValues.pullForce).toBeCloseTo(r.diagnostics.maxValues.frictionForce, 4);
  });

  it('加速运动: F_pull > f, a = (F_pull - f)/m > 0', () => {
    const r = model.solve(makeProblem({ mu: 0.3, mass: 1, g: 9.8, uniformMotion: false }));
    expect(r.diagnostics.maxValues.pullForce).toBeGreaterThan(r.diagnostics.maxValues.frictionForce);
    expect(r.diagnostics.maxValues.acceleration).toBeGreaterThan(0);
  });

  it('动摩擦因数 μ > 1 时给出警告', () => {
    const r = model.solve(makeProblem({ mu: 1.5 }));
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.diagnostics.rangeCheck.withinRange).toBe(true);
  });

  it('生成 f-N 关系曲线 (线性，斜率 = μ)', () => {
    const r = model.solve(makeProblem({ mu: 0.4, mass: 1, g: 9.8 }));
    expect(r.charts.f_N).toBeDefined();
    const points = r.charts.f_N!.points;
    expect(points.length).toBeGreaterThan(100);
    // 第一个点 (N=0): f=0
    expect(points[0]!.y).toBeCloseTo(0, 4);
    // 中间点: f/N ≈ μ
    const midIdx = Math.floor(points.length / 2);
    const mid = points[midIdx]!;
    expect(mid.y / mid.x).toBeCloseTo(0.4, 2);
  });

  it('受力分析图包含重力、支持力、拉力、摩擦力', () => {
    const r = model.solve(makeProblem({ mu: 0.3, mass: 1, g: 9.8 }));
    const fd = r.charts.force_diagram!;
    expect(fd.forces).toHaveLength(4);
    const names = fd.forces.map(f => f.name);
    expect(names.some(n => n.includes('重力'))).toBe(true);
    expect(names.some(n => n.includes('支持力'))).toBe(true);
    expect(names.some(n => n.includes('拉力'))).toBe(true);
    expect(names.some(n => n.includes('摩擦力'))).toBe(true);
  });

  it('公式说明包含 f = μN', () => {
    const r = model.solve(makeProblem({ mu: 0.3, mass: 1, g: 9.8 }));
    const formulaNames = r.explanation.formulas.map(f => f.name);
    expect(formulaNames).toContain('滑动摩擦力');
    expect(formulaNames).toContain('正压力 (水平面)');
    expect(formulaNames).toContain('动摩擦因数');
    expect(formulaNames).toContain('匀速条件');
  });

  it('缺少 slidingFriction 约束抛错', () => {
    const problem: PhysicsProblem = {
      id: 'fail',
      model: 'sliding-friction',
      bodies: [{ id: 'b', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
      constraints: {},
      environment: {},
      timeConfig: { duration: 1, sampleCount: 100 },
    };
    expect(() => model.solve(problem)).toThrow('slidingFriction');
  });

  it('匀速运动时合力为零', () => {
    const r = model.solve(makeProblem({ mu: 0.3, mass: 1, g: 9.8, uniformMotion: true }));
    expect(r.charts.force_diagram!.netForce.x).toBeCloseTo(0, 4);
  });
});

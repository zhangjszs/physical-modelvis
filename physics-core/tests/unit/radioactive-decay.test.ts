import { describe, it, expect } from 'vitest';
import { RadioactiveDecayModel } from '../../src/models/radioactive-decay.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new RadioactiveDecayModel();

function makeProblem(overrides: {
  initialAtoms?: number;
  halfLife?: number;
  duration?: number;
  radiationType?: 'alpha' | 'beta' | 'gamma';
} = {}): PhysicsProblem {
  const { initialAtoms = 1000, halfLife = 10, duration, radiationType } = overrides;
  const rc: { initialAtoms: number; halfLife: number; duration?: number; radiationType?: 'alpha' | 'beta' | 'gamma' } = { initialAtoms, halfLife };
  if (duration !== undefined) rc.duration = duration;
  if (radiationType !== undefined) rc.radiationType = radiationType;
  return {
    id: 'ra-test',
    model: 'radioactive-decay',
    bodies: [{ id: 'nuclei', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { radioactive: rc },
    environment: {},
    timeConfig: { duration: duration ?? 50, sampleCount: 10 },
  };
}

describe('RadioactiveDecayModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('radioactive-decay');
    expect(model.name).toBe('放射性衰变');
  });

  it('衰变常数 λ = ln2 / T₁/₂', () => {
    const r = model.solve(makeProblem({ halfLife: 10 }));
    expect(r.diagnostics.maxValues.decayConstant).toBeCloseTo(Math.LN2 / 10, 15);
  });

  it('1 个半衰期后 N = N₀/2', () => {
    const r = model.solve(makeProblem({ initialAtoms: 1000, halfLife: 10, duration: 10 }));
    const chart = r.charts.x_t!; // N-t 曲线
    // 最后一点近似于 t = duration
    const lastPoint = chart.points[chart.points.length - 1]!;
    expect(lastPoint.y).toBeCloseTo(500, 0); // 允许 ±1
  });

  it('3 个半衰期后 N = N₀/8', () => {
    const r = model.solve(makeProblem({ initialAtoms: 1000, halfLife: 10, duration: 30 }));
    const chart = r.charts.x_t!;
    const lastPoint = chart.points[chart.points.length - 1]!;
    expect(lastPoint.y).toBeCloseTo(125, 1); // ±1
  });

  it('活度曲线 A(t) = λ·N(t)', () => {
    const r = model.solve(makeProblem({ initialAtoms: 1000, halfLife: 5 }));
    const N_chart = r.charts.x_t!;
    const A_chart = r.charts.y_t!;
    const lambda = r.diagnostics.maxValues.decayConstant;
    // 选取中间点验证
    const idx = Math.floor(N_chart.points.length / 2);
    const N = N_chart.points[idx]!.y;
    const A = A_chart.points[idx]!.y;
    expect(A).toBeCloseTo(lambda * N, 3);
  });

  it('初始活度 A₀ = λ·N₀', () => {
    const r = model.solve(makeProblem({ initialAtoms: 500, halfLife: 8 }));
    const expected = (Math.LN2 / 8) * 500;
    expect(r.diagnostics.maxValues.initialActivity).toBeCloseTo(expected, 3);
  });

  it('半衰期越短, 初始活度越大 (λ 越大)', () => {
    const r1 = model.solve(makeProblem({ halfLife: 10 }));
    const r2 = model.solve(makeProblem({ halfLife: 1 }));
    expect(r2.diagnostics.maxValues.initialActivity).toBeGreaterThan(
      r1.diagnostics.maxValues.initialActivity
    );
  });

  it('粒子径迹存在 (轨迹长度 > 1)', () => {
    const r = model.solve(makeProblem({ radiationType: 'alpha', initialAtoms: 10 }));
    const track = r.trajectories[0]!;
    expect(track.length).toBeGreaterThan(5); // 至少起点+若干步
    // α 粒子径迹较短：最后点距原点的距离应有限
    const last = track[track.length - 1]!;
    const dist = Math.sqrt(last.position.x ** 2 + last.position.y ** 2);
    expect(dist).toBeLessThan(200); // α 径迹不会无限延伸
  });

  it('α 与 β 径迹长度不同 (α短β长)', () => {
    const rAlpha = model.solve(makeProblem({ radiationType: 'alpha', duration: 50 }));
    const rBeta = model.solve(makeProblem({ radiationType: 'beta', duration: 50 }));
    const aLast = rAlpha.trajectories[0]![rAlpha.trajectories[0]!.length - 1]!;
    const bLast = rBeta.trajectories[0]![rBeta.trajectories[0]!.length - 1]!;
    const aDist = Math.sqrt(aLast.position.x ** 2 + aLast.position.y ** 2);
    const bDist = Math.sqrt(bLast.position.x ** 2 + bLast.position.y ** 2);
    expect(bDist).toBeGreaterThan(aDist); // β 走得更远
  });

  it('summary 包含 N₀, T₁/₂, 射线类型', () => {
    const r = model.solve(makeProblem({ radiationType: 'alpha' }));
    expect(r.explanation.summary).toContain('N₀=');
    expect(r.explanation.summary).toContain('T₁/₂=');
    expect(r.explanation.summary).toContain('α');
  });
});

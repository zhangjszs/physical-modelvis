import { describe, it, expect } from 'vitest';
import { CurveConditionModel } from '../../src/models/curve-condition.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new CurveConditionModel();

function makeProblem(overrides: Partial<{
  forceDirectionDeg: number;
  initialSpeed: number;
  mass: number;
  forceMagnitude: number;
  duration: number;
  sampleCount: number;
}> = {}): PhysicsProblem {
  const {
    forceDirectionDeg = 90,
    initialSpeed = 10,
    mass = 1,
    forceMagnitude = 10,
    duration = 3,
    sampleCount = 600,
  } = overrides;
  return {
    id: 'curve-cond-test',
    title: '曲线运动条件',
    model: 'curve-condition',
    bodies: [{ id: 'p', mass: { value: mass, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: initialSpeed, y: 0 } }],
    constraints: { curveCondition: { forceDirectionDeg, initialSpeed, mass, forceMagnitude } },
    timeConfig: { duration, sampleCount },
  };
}

describe('CurveConditionModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('curve-condition');
    expect(model.name).toBe('曲线运动条件');
  });

  it('力方向 90° (F⊥v₀): 水平速度恒定为 v₀', () => {
    const r = model.solve(makeProblem({ forceDirectionDeg: 90, initialSpeed: 10, mass: 1, forceMagnitude: 10 }));
    const traj = r.trajectories[0]!;
    for (const p of traj) {
      expect(p.velocity.x).toBeCloseTo(10, 5);
    }
  });

  it('力方向 90°: y 分量满足 y=½·(F/m)·t²', () => {
    const r = model.solve(makeProblem({ forceDirectionDeg: 90, initialSpeed: 10, mass: 2, forceMagnitude: 10 }));
    const traj = r.trajectories[0]!;
    // ay = F/m = 5 m/s²
    const p = traj[300]!;
    const expectedY = 0.5 * 5 * p.t * p.t;
    expect(p.position.y).toBeCloseTo(expectedY, 4);
  });

  it('力方向 90°: vy = ay·t', () => {
    const r = model.solve(makeProblem({ forceDirectionDeg: 90, initialSpeed: 10, mass: 2, forceMagnitude: 10 }));
    const traj = r.trajectories[0]!;
    const ay = 10 / 2;
    const p = traj[100]!;
    expect(p.velocity.y).toBeCloseTo(ay * p.t, 5);
  });

  it('力方向 0° (F∥v₀ 同向): 轨迹是直线 (y恒为 0)', () => {
    const r = model.solve(makeProblem({ forceDirectionDeg: 0, initialSpeed: 5, mass: 1, forceMagnitude: 10 }));
    const traj = r.trajectories[0]!;
    for (const p of traj) {
      expect(p.position.y).toBeCloseTo(0, 5);
    }
  });

  it('力方向 180° (F∥v₀ 反向): y 也恒为 0', () => {
    const r = model.solve(makeProblem({ forceDirectionDeg: 180, initialSpeed: 10, mass: 1, forceMagnitude: 10 }));
    const traj = r.trajectories[0]!;
    for (const p of traj) {
      expect(p.position.y).toBeCloseTo(0, 5);
    }
  });

  it('力方向 45°: 一般曲线, y 分量 > 0', () => {
    const r = model.solve(makeProblem({ forceDirectionDeg: 45, initialSpeed: 5, mass: 1, forceMagnitude: 10 }));
    const last = r.trajectories[0][r.trajectories[0].length - 1]!;
    expect(last.position.y).toBeGreaterThan(0);
  });

  it('缺少约束时抛出', () => {
    const p = makeProblem();
    (p as any).constraints = undefined;
    expect(() => model.solve(p)).toThrow(/curveCondition/);
  });

  it('抛出 INVALID_MASS 当 mass <= 0', () => {
    expect(() => model.solve(makeProblem({ mass: 0 }))).toThrow();
    expect(() => model.solve(makeProblem({ mass: -1 }))).toThrow();
  });

  it('图表 x_t / y_t / v_t / vx_t / vy_t 都存在', () => {
    const r = model.solve(makeProblem());
    expect(r.charts.x_t).toBeDefined();
    expect(r.charts.y_t).toBeDefined();
    expect(r.charts.v_t).toBeDefined();
    expect(r.charts.vx_t).toBeDefined();
    expect(r.charts.vy_t).toBeDefined();
  });

  it('起点在原点, 初速度沿 +x', () => {
    const r = model.solve(makeProblem());
    expect(r.trajectories[0][0]!.position.x).toBeCloseTo(0, 5);
    expect(r.trajectories[0][0]!.position.y).toBeCloseTo(0, 5);
    expect(r.trajectories[0][0]!.velocity.x).toBeCloseTo(10, 5);
    expect(r.trajectories[0][0]!.velocity.y).toBeCloseTo(0, 5);
  });

  it('关键帧至少有 2 个 (起点+末点)', () => {
    const r = model.solve(makeProblem());
    expect(r.keyframes.length).toBeGreaterThanOrEqual(2);
  });

  it('解释中包含 "曲线条件" 概念', () => {
    const r = model.solve(makeProblem());
    const text = r.explanation.summary + r.explanation.steps.map(s => s.description + (s.formula ?? '')).join('');
    expect(text).toContain('曲线');
  });

  it('90° 时判定为 "类平抛"', () => {
    const r = model.solve(makeProblem({ forceDirectionDeg: 90 }));
    expect(r.explanation.summary).toContain('类平抛');
  });

  it('0° 时判定为 "直线 (共线)"', () => {
    const r = model.solve(makeProblem({ forceDirectionDeg: 0 }));
    expect(r.explanation.summary).toContain('直线');
  });

  it('maxValues 包含 ax / ay / maxSpeed', () => {
    const r = model.solve(makeProblem({ forceDirectionDeg: 30, mass: 1, forceMagnitude: 10, initialSpeed: 10 }));
    expect(r.diagnostics.maxValues.ax).toBeDefined();
    expect(r.diagnostics.maxValues.ay).toBeDefined();
    expect(r.diagnostics.maxValues.maxSpeed).toBeGreaterThan(10);
  });
});

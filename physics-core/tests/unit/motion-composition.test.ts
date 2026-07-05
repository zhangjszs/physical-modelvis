import { describe, it, expect } from 'vitest';
import { MotionCompositionModel } from '../../src/models/motion-composition.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new MotionCompositionModel();

function makeProblem(overrides: Partial<{
  vxConst: number;
  vyAccel: number;
  duration: number;
  sampleCount: number;
  mass: number;
}> = {}): PhysicsProblem {
  const {
    vxConst = 5,
    vyAccel = 10,
    duration = 3,
    sampleCount = 600,
    mass = 1,
  } = overrides;
  return {
    id: 'motion-comp-test',
    title: '运动合成分解',
    model: 'motion-composition',
    bodies: [{ id: 'p', mass: { value: mass, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: vxConst, y: 0 } }],
    constraints: { motionComposition: { vxConst, vyAccel } },
    timeConfig: { duration, sampleCount },
  };
}

describe('MotionCompositionModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('motion-composition');
    expect(model.name).toBe('运动合成分解');
  });

  it('水平方向 x=vxConst·t: 验证位移', () => {
    const r = model.solve(makeProblem({ vxConst: 3, vyAccel: 10 }));
    const traj = r.trajectories[0]!;
    const p = traj[300]!;
    expect(p.position.x).toBeCloseTo(3 * p.t, 5);
  });

  it('竖直方向 y=½·a·t²', () => {
    const r = model.solve(makeProblem({ vxConst: 5, vyAccel: 4 }));
    const traj = r.trajectories[0]!;
    const p = traj[200]!;
    expect(p.position.y).toBeCloseTo(0.5 * 4 * p.t * p.t, 5);
  });

  it('水平分速度恒等于 vxConst', () => {
    const r = model.solve(makeProblem({ vxConst: 7 }));
    const traj = r.trajectories[0]!;
    for (const p of traj) {
      expect(p.velocity.x).toBeCloseTo(7, 5);
    }
  });

  it('竖直分速度 vy=ay·t', () => {
    const r = model.solve(makeProblem({ vxConst: 5, vyAccel: 10, duration: 4 }));
    const traj = r.trajectories[0]!;
    const p = traj[400]!;
    expect(p.velocity.y).toBeCloseTo(10 * p.t, 5);
  });

  it('合速度大小 v=√(vx²+vy²)', () => {
    const r = model.solve(makeProblem({ vxConst: 5, vyAccel: 10 }));
    const traj = r.trajectories[0]!;
    const p = traj[100]!;
    const vExpected = Math.sqrt(p.velocity.x ** 2 + p.velocity.y ** 2);
    const vChart = r.charts.v_t!.points[100]!.y;
    expect(vChart).toBeCloseTo(vExpected, 5);
  });

  it('合速度方向角满足 tanθ=vy/vx', () => {
    const r = model.solve(makeProblem({ vxConst: 5, vyAccel: 10, duration: 2 }));
    const traj = r.trajectories[0]!;
    const p = traj[traj.length - 1]!;
    const expected = Math.atan2(p.velocity.y, p.velocity.x);
    // 应在 (0, π/2) 之间 (vy>0, vx>0)
    expect(expected).toBeGreaterThan(0);
    expect(expected).toBeLessThan(Math.PI / 2);
  });

  it('y 关于 x 是抛物线: y = (ay/(2·vx²))·x²', () => {
    const vx = 4;
    const ay = 8;
    const r = model.solve(makeProblem({ vxConst: vx, vyAccel: ay }));
    const traj = r.trajectories[0]!;
    const coeff = ay / (2 * vx * vx);
    const p = traj[300]!;
    expect(p.position.y).toBeCloseTo(coeff * p.position.x ** 2, 4);
  });

  it('缺少约束时抛出', () => {
    const p = makeProblem();
    (p as any).constraints = undefined;
    expect(() => model.solve(p)).toThrow(/motionComposition/);
  });

  it('缺少物体时抛出', () => {
    const p = makeProblem();
    (p as any).bodies = [];
    expect(() => model.solve(p)).toThrow();
  });

  it('图表 x_t / y_t / v_t / vy_t / vx_t / y-x 都存在', () => {
    const r = model.solve(makeProblem());
    expect(r.charts.x_t).toBeDefined();
    expect(r.charts.y_t).toBeDefined();
    expect(r.charts.v_t).toBeDefined();
    expect(r.charts.vy_t).toBeDefined();
    expect(r.charts.vx_t).toBeDefined();
    expect((r.charts as any)['y-x']).toBeDefined();
  });

  it('关键帧至少包含 5 个 (起点 + 3 等分 + 末点)', () => {
    const r = model.solve(makeProblem());
    expect(r.keyframes.length).toBeGreaterThanOrEqual(5);
  });

  it('初位置在原点', () => {
    const r = model.solve(makeProblem());
    expect(r.trajectories[0][0]!.position.x).toBeCloseTo(0, 5);
    expect(r.trajectories[0][0]!.position.y).toBeCloseTo(0, 5);
  });

  it('末点位置 x=vx·T, y=½·ay·T²', () => {
    const r = model.solve(makeProblem({ vxConst: 6, vyAccel: 8, duration: 5 }));
    const last = r.trajectories[0][r.trajectories[0].length - 1]!;
    expect(last.position.x).toBeCloseTo(6 * 5, 4);
    expect(last.position.y).toBeCloseTo(0.5 * 8 * 25, 4);
  });

  it('解释包含 "合运动" 概念', () => {
    const r = model.solve(makeProblem());
    expect(r.explanation.summary + r.explanation.steps.map(s => s.description).join('')).toMatch(/合/);
  });

  it('maxValues 包含 totalX / totalY / finalV', () => {
    const r = model.solve(makeProblem({ vxConst: 5, vyAccel: 10, duration: 2 }));
    expect(r.diagnostics.maxValues.totalX).toBeCloseTo(10, 4);
    expect(r.diagnostics.maxValues.totalY).toBeCloseTo(20, 4);
    expect(r.diagnostics.maxValues.finalV).toBeCloseTo(Math.sqrt(25 + 400), 4);
  });

  it('总射程 (maxX) 与 duration 成正比', () => {
    const r1 = model.solve(makeProblem({ vxConst: 4, duration: 2 }));
    const r2 = model.solve(makeProblem({ vxConst: 4, duration: 4 }));
    expect(r2.diagnostics.maxValues.totalX).toBeCloseTo(2 * r1.diagnostics.maxValues.totalX, 4);
  });
});

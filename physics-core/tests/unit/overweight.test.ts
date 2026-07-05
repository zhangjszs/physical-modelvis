import { describe, it, expect } from 'vitest';
import { OverweightModel } from '../../src/models/overweight.js';
import type { PhysicsProblem } from '../../src/types/problem.js';
import type { OverweightMode } from '../../src/types/problem.js';

const model = new OverweightModel();

/** 构造一个超重/失重问题 */
function makeProblem(opts: {
  mass?: number;
  accMagnitude?: number;
  mode?: OverweightMode;
  gravity?: number;
  duration?: number;
  sampleCount?: number;
} = {}): PhysicsProblem {
  const {
    mass = 1,
    accMagnitude = 2,
    mode = 'upStart',
    gravity = 9.8,
    duration = 5,
    sampleCount = 500,
  } = opts;
  return {
    id: 'overweight-test',
    title: '超重/失重',
    model: 'overweight',
    bodies: [{
      id: 'person',
      mass: { value: mass, unit: 'kg' },
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
    }],
    constraints: { overweight: { mass, accMagnitude, mode, gravity } },
    timeConfig: { duration, sampleCount },
  };
}

describe('OverweightModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('overweight');
    expect(model.name).toBe('超重与失重');
    expect(model.version).toBe('1.0.0');
    expect(model.requiredParameters.length).toBeGreaterThanOrEqual(5);
  });

  it('upStart (向上加速) m=1, a=2 → N = 11.8 N > mg (超重)', () => {
    const r = model.solve(makeProblem({ mass: 1, accMagnitude: 2, mode: 'upStart' }));
    expect(r.diagnostics.maxValues.normalForce).toBeCloseTo(11.8, 5);
    expect(r.diagnostics.maxValues.weight).toBeCloseTo(9.8, 5);
    // N > mg → 超重
    expect(r.diagnostics.maxValues.normalForce).toBeGreaterThan(r.diagnostics.maxValues.weight);
    expect(r.explanation.summary).toContain('超重');
  });

  it('upStop (向上减速= a_y=-2) → N = 7.8 N < mg (失重)', () => {
    const r = model.solve(makeProblem({ mass: 1, accMagnitude: 2, mode: 'upStop' }));
    expect(r.diagnostics.maxValues.normalForce).toBeCloseTo(7.8, 5); // N = 1*(9.8-2)
    expect(r.diagnostics.maxValues.normalForce).toBeLessThan(r.diagnostics.maxValues.weight);
    expect(r.explanation.summary).toContain('失重');
  });

  it('downStart (向下加速= a_y=-2) → N = 7.8 N < mg (失重)', () => {
    const r = model.solve(makeProblem({ mass: 1, accMagnitude: 2, mode: 'downStart' }));
    expect(r.diagnostics.maxValues.normalForce).toBeCloseTo(7.8, 5);
    expect(r.diagnostics.maxValues.normalForce).toBeLessThan(r.diagnostics.maxValues.weight);
    expect(r.explanation.summary).toContain('失重');
  });

  it('downStop (向下减速= a_y=+2) → N = 11.8 N > mg (超重)', () => {
    const r = model.solve(makeProblem({ mass: 1, accMagnitude: 2, mode: 'downStop' }));
    expect(r.diagnostics.maxValues.normalForce).toBeCloseTo(11.8, 5);
    expect(r.diagnostics.maxValues.normalForce).toBeGreaterThan(r.diagnostics.maxValues.weight);
    expect(r.explanation.summary).toContain('超重');
  });

  it('m=3, a=2.5 upStart → N = 3*(9.8+2.5) = 36.9', () => {
    const r = model.solve(makeProblem({ mass: 3, accMagnitude: 2.5, mode: 'upStart' }));
    expect(r.diagnostics.maxValues.normalForce).toBeCloseTo(3 * (9.8 + 2.5), 5);
  });

  it('完全失重: a=g=9.8, downStart → N = m*(g-g) = 0', () => {
    const m = 2;
    const g = 9.8;
    const r = model.solve(makeProblem({ mass: m, accMagnitude: g, mode: 'downStart', gravity: g }));
    expect(r.diagnostics.maxValues.normalForce).toBeCloseTo(0, 5);
    // 完全失重标志
    expect(r.diagnostics.rangeCheck.warnings.length).toBeGreaterThanOrEqual(1);
    expect(r.explanation.summary).toContain('完全失重');
  });

  it('自定义重力加速度 g=10', () => {
    const r = model.solve(makeProblem({ mass: 1, accMagnitude: 2, mode: 'upStart', gravity: 10 }));
    expect(r.diagnostics.maxValues.normalForce).toBeCloseTo(12, 5); // 1*(10+2)
    expect(r.diagnostics.maxValues.weight).toBeCloseTo(10, 5);
  });

  it('F_N-a_y 图呈线性: 斜率=m，截距=mg', () => {
    const r = model.solve(makeProblem({ mass: 2.5, accMagnitude: 3, mode: 'upStart' }));
    const fnChart = r.charts.FN_a_y;
    expect(fnChart).toBeDefined();
    const pts = fnChart!.points;
    expect(pts.length).toBeGreaterThan(0);
    // 计算最后两点之间的斜率，应当等于 m=2.5
    const p1 = pts[pts.length - 2];
    const p2 = pts[pts.length - 1];
    const slope = (p2.y - p1.y) / (p2.x - p1.x);
    expect(slope).toBeCloseTo(2.5, 5);
  });

  it('a_y-t 恒为恒定值 (阶梯)', () => {
    const r = model.solve(makeProblem({ accMagnitude: 3, mode: 'upStart' }));
    const pts = r.charts.a_y_t!.points;
    expect(pts.every(p => Math.abs(p.y - 3) < 1e-9)).toBe(true);
  });

  it('FN_t 恒为恒定值 (恒定 a_y → 恒定 N)', () => {
    const r = model.solve(makeProblem({ mass: 1, accMagnitude: 4, mode: 'upStop' }));
    const expected = 1 * (9.8 - 4); // 5.8
    const pts = r.charts.FN_t!.points;
    expect(pts.every(p => Math.abs(p.y - expected) < 1e-9)).toBe(true);
  });

  it('轨迹点数 = sampleCount + 1', () => {
    const r = model.solve(makeProblem({ sampleCount: 400 }));
    expect(r.trajectories[0].length).toBe(401);
  });

  it('生成至少 2 个关键帧', () => {
    const r = model.solve(makeProblem({ mode: 'upStart' }));
    expect(r.keyframes.length).toBeGreaterThanOrEqual(2);
    expect(r.keyframes[0].label).toContain('起点');
  });

  it('生成所有要求的图表 (y_t, vy_t, a_y_t, FN_t, mg_ref_t, FN_a_y, force_diagram)', () => {
    const r = model.solve(makeProblem());
    expect(r.charts.y_t).toBeDefined();
    expect(r.charts.vy_t).toBeDefined();
    expect(r.charts.a_y_t).toBeDefined();
    expect(r.charts.FN_t).toBeDefined();
    expect(r.charts.mg_ref_t).toBeDefined();
    expect(r.charts.FN_a_y).toBeDefined();
    expect(r.charts.force_diagram).toBeDefined();
  });

  it('受力分析图包含支持力和重力两个力', () => {
    const r = model.solve(makeProblem({ mass: 2 }));
    const fd = r.charts.force_diagram!;
    expect(fd.forces.length).toBe(2);
    const n = fd.forces.find(f => f.name === '支持力 N')!;
    const mg = fd.forces.find(f => f.name === '重力 mg')!;
    expect(n.magnitude).toBeCloseTo(2 * (9.8 + 2), 5); // upStart acc=+2
    expect(mg.magnitude).toBeCloseTo(2 * 9.8, 5);
    // 合力 = ma_y
    expect(fd.netForce.y).toBeCloseTo(2 * 2, 5);
  });

  it('explanation 包含 5 个步骤', () => {
    const r = model.solve(makeProblem());
    expect(r.explanation.steps.length).toBe(5);
    expect(r.explanation.steps[0].order).toBe(1);
    expect(r.explanation.steps[4].order).toBe(5);
  });

  it('overweightRatio = N/(mg) 正确', () => {
    const r = model.solve(makeProblem({ mass: 2, accMagnitude: 3, mode: 'upStart' }));
    const ratio = r.diagnostics.maxValues.overweightRatio as number;
    expect(ratio).toBeCloseTo((2 * (9.8 + 3)) / (2 * 9.8), 5);
  });

  it('轨迹终点速度与理论一致 (v_y = a_y*t)', () => {
    const r = model.solve(makeProblem({ accMagnitude: 2, mode: 'upStart', duration: 5 }));
    const traj = r.trajectories[0];
    const last = traj[traj.length - 1];
    expect(last.velocity.y).toBeCloseTo(2 * 5, 2); // a_y * t = 2*5
    expect(last.position.y).toBeCloseTo(0.5 * 2 * 25, 2); // 0.5*a*t² = 25
  });
});

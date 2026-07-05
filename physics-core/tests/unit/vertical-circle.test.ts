import { describe, it, expect } from 'vitest';
import { VerticalCircleModel, type VerticalCircleType } from '../../src/models/vertical-circle.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new VerticalCircleModel();

function makeProblem(opts: {
  length?: number;
  mass?: number;
  modelType?: VerticalCircleType;
  initialSpeed?: number;
  gravity?: number;
  duration?: number;
  sampleCount?: number;
} = {}): PhysicsProblem {
  const {
    length = 1,
    mass = 1,
    modelType = 'rope',
    initialSpeed = 7,
    gravity = 9.8,
    duration = 5,
    sampleCount = 500,
  } = opts;
  return {
    id: 'vertical-circle-test',
    model: 'vertical-circle',
    bodies: [
      {
        id: 'ball',
        mass: { value: mass, unit: 'kg' },
        position: { x: 0, y: 0 },
        velocity: { x: initialSpeed, y: 0 },
      },
    ],
    constraints: { verticalCircle: { length, mass, modelType, initialSpeed, gravity } },
    timeConfig: { duration, sampleCount },
  };
}

describe('VerticalCircleModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('vertical-circle');
    expect(model.name).toBe('竖直圆周最高点条件');
  });

  it('vMin: rope v_min = √(gr), rod v_min = 0, ring v_min = √(gr)', () => {
    expect(VerticalCircleModel.vMin('rope', 1, 9.8)).toBeCloseTo(Math.sqrt(9.8), 6);
    expect(VerticalCircleModel.vMin('rod', 1, 9.8)).toBe(0);
    expect(VerticalCircleModel.vMin('ring', 1, 9.8)).toBeCloseTo(Math.sqrt(9.8), 6);
  });

  it('rope 通过最高点: v₀² ≥ 5gr 时能通过', () => {
    const r = model.solve(makeProblem({ modelType: 'rope', length: 1, initialSpeed: 7.5 }));
    // v₀² = 56.25, 5gr = 49 → 能通过
    expect(r.diagnostics.flags!.passesTop).toBe(true);
    expect(r.diagnostics.maxValues.vTop).toBeGreaterThan(0);
  });

  it('rope 不能过最高点: v₀² < 5gr 时不通过', () => {
    const r = model.solve(makeProblem({ modelType: 'rope', length: 1, initialSpeed: 6 }));
    // v₀² = 36, 5gr = 49 → 不能
    expect(r.diagnostics.flags!.passesTop).toBe(false);
  });

  it('rod 总能通过: v₀ = 0 时 v_top = 0 但能通过', () => {
    const r = model.solve(makeProblem({ modelType: 'rod', length: 1, initialSpeed: 0.5 }));
    expect(r.diagnostics.flags!.passesTop).toBe(true);
  });

  it('最高点速度 v_top = √(v₀² − 4gr)', () => {
    const r = model.solve(makeProblem({ modelType: 'rope', length: 1, initialSpeed: 7 }));
    // v_top² = 49 - 39.2 = 9.8
    expect(r.diagnostics.maxValues.vTopSq).toBeCloseTo(9.8, 6);
    expect(r.diagnostics.maxValues.vTop).toBeCloseTo(Math.sqrt(9.8), 6);
  });

  it('最高点张力 T = m(v²/r + g·cosθ), 临界 v₀²=5gr 时 T_top≈0', () => {
    // v₀² = 5gr = 49 → 通过临界; v_top² = gr = 9.8
    const res = model.solve(makeProblem({ modelType: 'rope', length: 1, initialSpeed: Math.sqrt(5 * 9.8) }));
    const pts = res.charts.tension_angle!.points;
    // 图表采样 θ ∈ [0, 2π], 最高点 (θ=π) 在中间
    const topIdx = Math.floor(pts.length / 2);
    const topPt = pts[topIdx]!;
    // T_top = m(v_top²/r + g·cosπ) = 1·(gr/r + g·(−1)) = g·r/r − g = 0
    expect(Math.abs(topPt.y)).toBeLessThan(0.1);
  });

  it('tension_angle 图最高点附近 T > 0 (通过)', () => {
    const r = model.solve(makeProblem({ modelType: 'rope', initialSpeed: 8 }));
    const pts = r.charts.tension_angle!.points;
    const topPt = pts.find(p => Math.abs(p.x - Math.PI) < 0.05);
    expect(topPt!.y).toBeGreaterThan(0);
  });

  it('rod 最高点附近 N 可能为 0 或负 (支持力)', () => {
    const r = model.solve(makeProblem({ modelType: 'rod', length: 1, initialSpeed: Math.sqrt(4 * 9.8) }));
    // v_top = 0, N_top = m·(0 - g) = -mg (向上支持)
    const pts = r.charts.tension_angle!.points;
    const topPt = pts.find(p => Math.abs(p.x - Math.PI) < 0.05);
    expect(topPt).toBeDefined();
    // 负值 = 支持力
    expect(topPt!.y).toBeLessThan(0);
  });

  it('轨迹点数 = sampleCount + 1', () => {
    const r = model.solve(makeProblem({ sampleCount: 400 }));
    expect(r.trajectories[0]!.length).toBe(401);
  });

  it('机械能近似守恒', () => {
    const r = model.solve(makeProblem({ modelType: 'rod' }));
    const cq = r.diagnostics.conservedQuantities.find(c => c.name.includes('机械能'));
    expect(cq).toBeDefined();
    expect(cq!.conserved).toBe(true);
  });

  it('静态示意图为半径等于 length 的圆', () => {
    const r = model.solve(makeProblem({ length: 2 }));
    const pts = r.charts['static-diagram']!.points;
    // 所有点到原点 (0, r=2) 的距离 ≈ 2
    expect(pts.length).toBe(128);
    for (const p of pts) {
      const dist = Math.hypot(p.x, p.y - 2);
      expect(Math.abs(dist - 2)).toBeLessThan(1e-6);
    }
  });

  it('vc_speed_angle 图: v 在最低点 (θ=0) 最大, 最高点 (θ=π) 最小', () => {
    const r = model.solve(makeProblem({ initialSpeed: 8 }));
    const pts = r.charts.vc_speed_angle!.points;
    const lowPt = pts.find(p => Math.abs(p.x) < 0.05)!;
    const topPt = pts.find(p => Math.abs(p.x - Math.PI) < 0.05)!;
    expect(lowPt.y).toBeGreaterThan(topPt.y);
  });

  it('vmin_markers 图: √r 关系 (非杆)', () => {
    const r = model.solve(makeProblem({ modelType: 'rope', length: 1 }));
    const pts = r.charts.vmin_markers!.points;
    // 对每一点 (r, √(gr))
    for (const p of pts) {
      expect(Math.abs(p.y - Math.sqrt(9.8 * p.x))).toBeLessThan(1e-6);
    }
  });

  it('受力分析图: 包含重力与张力/杆力', () => {
    const r = model.solve(makeProblem());
    const fd = r.charts.force_diagram!;
    expect(fd.forces.length).toBe(2);
    const hasGravity = fd.forces.some(f => f.name.includes('重力'));
    expect(hasGravity).toBe(true);
  });

  it('explanation 摘要包含 v₀ 与 v_min', () => {
    const r = model.solve(makeProblem({ modelType: 'rope', length: 1 }));
    expect(r.explanation.summary).toContain('v₀=');
    expect(r.explanation.summary).toContain('v_min=');
  });

  it('rope 最高点张力最小点出现在 θ=π', () => {
    const r = model.solve(makeProblem({ modelType: 'rope', initialSpeed: 8 }));
    const pts = r.charts.tension_angle!.points;
    // 在下半圆采样 T, 最小应该出现在接近 π
    const minPt = pts.reduce((min, p) => p.y < min.y ? p : min, pts[0]!);
    expect(Math.abs(minPt.x - Math.PI)).toBeLessThan(0.3);
  });

  it('无效参数抛出错误', () => {
    expect(() => model.solve(makeProblem({ initialSpeed: -1 }))).toThrow();
    expect(() => model.solve(makeProblem({ length: 0 }))).toThrow();
    expect(() => model.solve(makeProblem({ mass: -1 }))).toThrow();
  });
});

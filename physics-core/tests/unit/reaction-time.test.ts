import { describe, it, expect } from 'vitest';
import { ReactionTimeModel } from '../../src/models/reaction-time.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new ReactionTimeModel();

function makeProblem(overrides: { distance?: number; gravity?: number; duration?: number } = {}): PhysicsProblem {
  const { distance = 0.2, gravity = 9.8, duration = 0.5 } = overrides;
  return {
    id: 'reaction-time-test',
    model: 'reaction-time',
    bodies: [{
      id: 'ruler',
      mass: { value: 0.1, unit: 'kg' },
      position: { x: 0, y: distance },
      velocity: { x: 0, y: 0 },
    }],
    constraints: { reactionTime: { distance, gravity } },
    environment: { gravity: { enabled: true, value: gravity, unit: 'm/s²' } },
    timeConfig: { duration, sampleCount: 200 },
  };
}

describe('ReactionTimeModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('reaction-time');
    expect(model.name).toBe('测反应时间');
    expect(model.version).toBe('1.0.0');
    expect(model.description).toContain('自由落体');
    expect(model.assumptions.length).toBeGreaterThan(0);
    expect(model.requiredParameters.length).toBeGreaterThan(0);
  });

  it('正例: h=0.2, g=9.8 → t ≈ 0.202 s', () => {
    const r = model.solve(makeProblem({ distance: 0.2, gravity: 9.8 }));
    expect(r.diagnostics.maxValues.reactionTime).toBeCloseTo(0.202, 2);
    // 精确值: √(2·0.2/9.8) = √(0.0408163) ≈ 0.2020304...
    const expectedT = Math.sqrt(2 * 0.2 / 9.8);
    expect(r.diagnostics.maxValues.reactionTime).toBeCloseTo(expectedT, 6);
  });

  it('正例: h=0.05 → t ≈ 0.101 s', () => {
    const r = model.solve(makeProblem({ distance: 0.05, gravity: 9.8 }));
    const expectedT = Math.sqrt(2 * 0.05 / 9.8);
    expect(r.diagnostics.maxValues.reactionTime).toBeCloseTo(expectedT, 5);
  });

  it('边界: h→0 (极小值) → t→0', () => {
    const r = model.solve(makeProblem({ distance: 0.001, gravity: 9.8 }));
    expect(r.diagnostics.maxValues.reactionTime).toBeGreaterThan(0);
    expect(r.diagnostics.maxValues.reactionTime).toBeLessThan(0.05);
  });

  it('边界: h 很大 → t 增大', () => {
    const r1 = model.solve(makeProblem({ distance: 0.1, gravity: 9.8 }));
    const r2 = model.solve(makeProblem({ distance: 0.4, gravity: 9.8 }));
    expect(r2.diagnostics.maxValues.reactionTime).toBeGreaterThan(r1.diagnostics.maxValues.reactionTime);
    // h 变为 4 倍 → t 变为 2 倍 (t ∝ √h)
    expect(r2.diagnostics.maxValues.reactionTime / r1.diagnostics.maxValues.reactionTime).toBeCloseTo(2, 5);
  });

  it('计算正确性: 解出的 t 满足 ½gt² = h', () => {
    const distance = 0.3;
    const g = 9.8;
    const r = model.solve(makeProblem({ distance, gravity: g }));
    const t = r.diagnostics.maxValues.reactionTime;
    const computedH = 0.5 * g * t * t;
    expect(computedH).toBeCloseTo(distance, 10);
  });

  it('轨迹起点在 y=h (释放点)', () => {
    const distance = 0.25;
    const r = model.solve(makeProblem({ distance }));
    expect(r.trajectories[0]![0]!.position.y).toBeCloseTo(distance, 6);
    // t=0 时 v=0 (IEEE 754 可能产生 -0, 用 toBeCloseTo 或 == 检查)
    expect(r.trajectories[0]![0]!.velocity.y == 0).toBe(true);
  });

  it('轨迹被抓时刻 y=0 (最后几点有 y=0)', () => {
    const r = model.solve(makeProblem({ distance: 0.2 }));
    const t = r.diagnostics.maxValues.reactionTime;
    // 找到反应时间之后的第一个采样点 (t > reactionTime), 它应 y=0 (已被抓)
    const afterCatch = r.trajectories[0].find(p => p.t > t + 1e-9);
    expect(afterCatch).toBeDefined();
    expect(afterCatch!.position.y).toBe(0);
    expect(afterCatch!.velocity.y).toBe(0);
    // 反应时间之前的最后一个采样点, y 应接近 0 (但 > 0)
    const beforeCatch = r.trajectories[0].filter(p => p.t <= t + 1e-9).pop();
    expect(beforeCatch).toBeDefined();
    expect(beforeCatch!.position.y).toBeGreaterThanOrEqual(0);
  });

  it('包含 h-t 曲线与 t-√h 图表', () => {
    const r = model.solve(makeProblem());
    expect(r.charts.h_t).toBeDefined();
    expect(r.charts.t_sqrt_h).toBeDefined();
    expect(r.charts.h_t!.points.length).toBeGreaterThan(0);
    expect(r.charts.t_sqrt_h!.points.length).toBeGreaterThan(0);
    // h-t 曲线第一点: (0, 0)
    expect(r.charts.h_t!.points[0]!.x).toBe(0);
    expect(r.charts.h_t!.points[0]!.y).toBe(0);
    // h-t 曲线最后一点应接近 (t_reaction, h)
    const lastHp = r.charts.h_t!.points[r.charts.h_t!.points.length - 1]!;
    expect(lastHp.y).toBeCloseTo(0.2, 2);
  });

  it('t-√h 图表呈现线性 (每段差分近似恒定)', () => {
    const r = model.solve(makeProblem());
    const pts = r.charts.t_sqrt_h!.points;
    expect(pts.length).toBeGreaterThan(2);
    // 取相邻三点验证线性
    const i = Math.floor(pts.length / 3);
    const slope1 = (pts[i + 1]!.y - pts[i]!.y) / (pts[i + 1]!.x - pts[i]!.x);
    const slope2 = (pts[i + 2]!.y - pts[i + 1]!.y) / (pts[i + 2]!.x - pts[i + 1]!.x);
    expect(slope1).toBeGreaterThan(0);
    expect(Math.abs(slope1 - slope2) / slope1).toBeLessThan(0.01); // 相对偏差 <1%
  });

  it('keyframes 包含释放点与被抓点', () => {
    const r = model.solve(makeProblem());
    expect(r.keyframes.length).toBeGreaterThanOrEqual(3);
    const labels = r.keyframes.map(k => k.label);
    expect(labels.some(l => l.includes('释放'))).toBe(true);
    expect(labels.some(l => l.includes('被抓'))).toBe(true);
  });

  it('机械能近似守恒', () => {
    const r = model.solve(makeProblem({ distance: 0.2 }));
    const conserved = r.diagnostics.conservedQuantities[0];
    expect(conserved).toBeDefined();
    expect(conserved!.conserved).toBe(true);
  });

  it('解释步骤包含 4 步', () => {
    const r = model.solve(makeProblem());
    expect(r.explanation.steps.length).toBe(4);
    expect(r.explanation.steps[0]!.description).toContain('自由落体');
    expect(r.explanation.steps[1]!.formula).toContain('√(2h/g)');
    expect(r.explanation.steps[2]!.result).toBeDefined();
    expect(r.explanation.steps[3]!.description).toContain('不确定度');
  });

  it('summary 包含反应速度评价', () => {
    const r = model.solve(makeProblem({ distance: 0.15, gravity: 9.8 }));
    // t ≈ √(2·0.15/9.8) ≈ 0.175 s — 应在"较快"/"一般"档
    expect(r.explanation.summary).toContain('测反应时间');
    expect(r.explanation.summary).toMatch(/一般|较快|极快|较慢/);
  });

  it('g 不确定度传递合理 (t = √(2h/g), dt 关系)', () => {
    const r = model.solve(makeProblem({ distance: 0.2, gravity: 9.8 }));
    const sigmaT = r.diagnostics.maxValues.sigmaTime;
    const sigmaH = r.diagnostics.maxValues.sigmaDistance;
    expect(sigmaT).toBeGreaterThan(0);
    // 验证: σ_t = σ_h / √(2hg)
    const expectedSigmaT = sigmaH / Math.sqrt(2 * 0.2 * 9.8);
    expect(sigmaT).toBeCloseTo(expectedSigmaT, 6);
  });

  it('不同 g (月球 g≈1.6) 产生更长反应时间', () => {
    const rEarth = model.solve(makeProblem({ distance: 0.2, gravity: 9.8 }));
    const rMoon = model.solve(makeProblem({ distance: 0.2, gravity: 1.6 }));
    expect(rMoon.diagnostics.maxValues.reactionTime).toBeGreaterThan(rEarth.diagnostics.maxValues.reactionTime);
    // t_moon / t_earth = √(9.8/1.6)
    expect(rMoon.diagnostics.maxValues.reactionTime / rEarth.diagnostics.maxValues.reactionTime)
      .toBeCloseTo(Math.sqrt(9.8 / 1.6), 5);
  });

  it('rangeCheck 在 [0.05, 0.5] 范围给出警告', () => {
    const rShort = model.solve(makeProblem({ distance: 0.02 }));
    expect(rShort.diagnostics.rangeCheck.withinRange).toBe(false);
    expect(rShort.warnings.length).toBeGreaterThan(0);
  });

  it('rangeCheck 在 [0.05, 0.5] 范围无警告', () => {
    const rNormal = model.solve(makeProblem({ distance: 0.2 }));
    expect(rNormal.diagnostics.rangeCheck.withinRange).toBe(true);
    expect(rNormal.warnings.length).toBe(0);
  });

  it('默认 g=9.8 (当约束未提供 gravity)', () => {
    const r = model.solve({
      id: 'default-g',
      model: 'reaction-time',
      bodies: [{ id: 'ruler', mass: { value: 0.1, unit: 'kg' }, position: { x: 0, y: 0.2 }, velocity: { x: 0, y: 0 } }],
      constraints: { reactionTime: { distance: 0.2 } },
      environment: {},
      timeConfig: { duration: 0.5, sampleCount: 100 },
    });
    const t = r.diagnostics.maxValues.reactionTime;
    expect(t).toBeCloseTo(Math.sqrt(2 * 0.2 / 9.8), 6);
  });
});

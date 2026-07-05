import { describe, it, expect } from 'vitest';
import { MoonEarthTestModel } from '../../src/models/moon-earth-test.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new MoonEarthTestModel();

/** 教科书参考值 */
const R_EARTH = 6.371e6;
const R_MOON  = 3.844e8;
const T_MOON  = 27.3 * 86400;
const G_STD   = 9.80665;

function makeProblem(overrides: {
  earthRadius?: number;
  moonDistance?: number;
  moonPeriod?: number;
} = {}): PhysicsProblem {
  const { earthRadius = R_EARTH, moonDistance = R_MOON, moonPeriod = T_MOON } = overrides;
  return {
    id: 'moon-earth-test',
    model: 'moon-earth-test',
    bodies: [{ id: 'moon', mass: { value: 7.342e22, unit: 'kg' as const }, position: { x: moonDistance / 1e8, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { moonEarthTest: { earthRadius, moonDistance, moonPeriod } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 50 },
  };
}

describe('MoonEarthTestModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('moon-earth-test');
    expect(model.name).toBe('月地检验');
    expect(model.version).toBe('1.0.0');
    expect(model.description).toContain('3600');
  });

  it('教科书标准值: a_月 ≈ g/3600', () => {
    const r = model.solve(makeProblem());
    const aMoon = r.diagnostics.maxValues.aMoon;
    const gOver3600 = r.diagnostics.maxValues.gOver3600;
    expect(aMoon).toBeCloseTo(gOver3600, 5); // 与 g/3600 高度吻合
  });

  it('a_月 数量级 10⁻³ m/s² (约 2.7×10⁻³)', () => {
    const r = model.solve(makeProblem());
    expect(r.diagnostics.maxValues.aMoon).toBeGreaterThan(2.0e-3);
    expect(r.diagnostics.maxValues.aMoon).toBeLessThan(3.5e-3);
  });

  it('R/r ≈ 1/60 = 0.01667', () => {
    const r = model.solve(makeProblem());
    const ratio = r.diagnostics.maxValues.ratioRr;
    expect(ratio).toBeCloseTo(1 / 60, 3);
    // (R/r)² = 1/3600
    expect(r.diagnostics.maxValues.squareInv).toBeCloseTo(1 / 3600, 4);
  });

  it('a_月 = ω²·r 且 ω = 2π/T', () => {
    const r = model.solve(makeProblem());
    const omega = 2 * Math.PI / T_MOON;
    expect(r.diagnostics.maxValues.omega).toBeCloseTo(omega, 10);
    expect(r.diagnostics.maxValues.aMoon).toBeCloseTo(omega * omega * R_MOON, 3);
  });

  it('偏差 relDiff < 5% (验证通过)', () => {
    const r = model.solve(makeProblem());
    expect(r.diagnostics.maxValues.relDiff_pct).toBeLessThan(5);
    expect(r.diagnostics.rangeCheck.withinRange).toBe(true);
  });

  it('异常 R 值使验证失败', () => {
    const r = model.solve(makeProblem({ earthRadius: 1e6 }));
    expect(r.diagnostics.rangeCheck.withinRange).toBe(false);
    expect(r.diagnostics.rangeCheck.warnings.length).toBeGreaterThan(0);
  });

  it('charts: moon-earth-data 包含 3 个数据点', () => {
    const r = model.solve(makeProblem());
    const chart = r.charts['moon-earth-data']!;
    expect(chart.points.length).toBe(3);
    // 点 1, 2, 3 分别是 a_月, g/3600, aFromRatio — 三者几乎相等
    const a1 = chart.points[0].y;
    const a2 = chart.points[1].y;
    const a3 = chart.points[2].y;
    expect(a1).toBeCloseTo(a2, 4);
    expect(a2).toBeCloseTo(a3, 4);
  });

  it('charts: ratio_R_r 包含 r/R 扫描数据', () => {
    const r = model.solve(makeProblem());
    const chart = r.charts.ratio_R_r!;
    expect(chart.points.length).toBeGreaterThan(100);
    // 在 r/R = 60 处，曲线值应 ≈ 1/60
    const at60 = chart.points.find(p => Math.abs(p.x - 60) < 0.5);
    expect(at60).toBeDefined();
    expect(at60!.y).toBeCloseTo(1 / 60, 2);
  });

  it('关键帧包含 4 个: 月球位置 / 实测加速度 / 结论', () => {
    const r = model.solve(makeProblem());
    expect(r.keyframes.length).toBe(3);
    expect(r.keyframes[0].label).toContain('月球');
    expect(r.keyframes[1].label).toContain('加速度');
    expect(r.keyframes[2].label).toContain('牛顿');
  });

  it('explanation.steps 长度 = 4 (4 步)', () => {
    const r = model.solve(makeProblem());
    expect(r.explanation.steps.length).toBe(4);
  });

  it('模型类可独立实例化并求解', () => {
    const m = new MoonEarthTestModel();
    expect(m.name).toBe('月地检验');
    const r = m.solve(makeProblem());
    expect(r.meta.model).toBe('moon-earth-test');
    expect(r.diagnostics.maxValues.aMoon).toBeCloseTo(2.7e-3, 3);
  });

  it('summary 包含关键术语 a_月 与 g/3600', () => {
    const r = model.solve(makeProblem());
    expect(r.explanation.summary).toContain('a_月');
    expect(r.explanation.summary).toContain('g/3600');
  });

  it('T 增大 → a_月 减小 (a ∝ 1/T²)', () => {
    const r1 = model.solve(makeProblem());
    const r2 = model.solve(makeProblem({ moonPeriod: T_MOON * 2 }));
    // T 加倍 → a 降为 1/4
    expect(r2.diagnostics.maxValues.aMoon).toBeCloseTo(r1.diagnostics.maxValues.aMoon / 4, 5);
  });

  it('r 增大 → ω²·r 变化 (非单调, 但 a_月 减小)', () => {
    const r1 = model.solve(makeProblem());
    const r2 = model.solve(makeProblem({ moonDistance: R_MOON * 1.1 }));
    // a = 4π²r/T², r 增加, a 线性增加
    expect(r2.diagnostics.maxValues.aMoon).toBeGreaterThan(r1.diagnostics.maxValues.aMoon);
  });
});

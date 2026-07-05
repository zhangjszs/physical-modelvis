import { describe, it, expect } from 'vitest';
import { CavendishModel } from '../../src/models/cavendish.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new CavendishModel();

/** G 标准值（N·m²/kg²） */
const G_STD = 6.674e-11;

function makeProblem(overrides: {
  m1?: number;
  m2?: number;
  distance?: number;
  torsionConst?: number;
  mirrorDist?: number;
  armLength?: number;
} = {}): PhysicsProblem {
  // 典型桌面演示用参数 (与原卡文迪什实验数量级相近)
  const { m1 = 10, m2 = 0.5, distance = 0.1, torsionConst = 1e-3, mirrorDist = 5, armLength = 1 } = overrides;
  return {
    id: 'cavendish-test',
    model: 'cavendish',
    bodies: [{ id: 'small-ball', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { cavendish: { m1, m2, distance, torsionConst, mirrorDist, armLength } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 50 },
  };
}

describe('CavendishModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('cavendish');
    expect(model.name).toBe('卡文迪什扭秤');
    expect(model.version).toBe('1.0.0');
    expect(model.description).toContain('三次放大');
  });

  it('三次放大链关系: F → τ → θ → Δspot', () => {
    const r = model.solve(makeProblem({ m1: 10, m2: 0.5, distance: 0.1, torsionConst: 1e-3, mirrorDist: 5, armLength: 1 }));
    const d = r.diagnostics.maxValues;
    expect(d.F).toBeCloseTo(G_STD * 10 * 0.5 / (0.1 * 0.1), 12);
    expect(d.torque).toBeCloseTo(d.F * 1, 9);
    expect(d.theta_rad).toBeCloseTo(d.torque / 1e-3, 6);
  });

  it('扭转角 θ 量纲为 rad, 值极小 (< 1e-3 rad)', () => {
    const r = model.solve(makeProblem());
    expect(r.diagnostics.maxValues.theta_rad).toBeGreaterThan(0);
    expect(r.diagnostics.maxValues.theta_rad).toBeLessThan(1e-3);
  });

  it('光点位移 Δspot = 2D·tan(2θ) 精确 ≈ 4D·θ (小角近似, θ<0.01 时 <1%)', () => {
    // 默认 k=1e-3 使 θ ≈ 3.3e-4 rad, 小角近似 < 0.01%
    const r = model.solve(makeProblem());
    const { D, theta_rad, deltaSpot_m } = r.diagnostics.maxValues;
    const approx = 4 * D * theta_rad;
    expect(theta_rad).toBeLessThan(0.01);
    expect(Math.abs(deltaSpot_m - approx) / approx).toBeLessThan(0.01);
  });

  it('拟合 G 与标准 G 一致 (用它求解自己)', () => {
    const r = model.solve(makeProblem());
    expect(Math.abs(r.diagnostics.maxValues.relativeError_pct)).toBeLessThan(1e-6);
    expect(r.diagnostics.maxValues.G_fit).toBeCloseTo(G_STD, 14);
  });

  it('放大系数 = 2D·L/k', () => {
    const D = 5, L = 0.5, k = 1e-8;
    const r = model.solve(makeProblem({ mirrorDist: D, armLength: L, torsionConst: k }));
    expect(r.diagnostics.maxValues.amplification).toBeCloseTo(2 * D * L / k, 6);
  });

  it('巨大力矩示例: 大 m₁、小 r 导致 θ 可达 μrad 级', () => {
    // 较大 m₁ = 10 kg, 较小 r = 0.05, 较低 k = 1e-9 → θ 在 μrad 量级
    const r = model.solve(makeProblem({ m1: 10, m2: 0.5, distance: 0.1, torsionConst: 1e-4, armLength: 1 }));
    expect(r.diagnostics.maxValues.theta_rad).toBeGreaterThan(1e-9);
    expect(r.diagnostics.maxValues.theta_rad).toBeLessThan(1e-2);
  });

  it(' charts: displacement_sin 与 static-diagram-cavendish 都存在', () => {
    const r = model.solve(makeProblem());
    expect(r.charts.displacement_sin).toBeDefined();
    expect(r.charts['static-diagram-cavendish']).toBeDefined();
  });

  it('charts.displacement_sin 为线性 (τ-θ 线性)', () => {
    const r = model.solve(makeProblem());
    const pts = r.charts.displacement_sin!.points;
    expect(pts.length).toBeGreaterThan(100);
    // 线性相关系数接近 1 — 用首尾斜率/中间点检验
    const p1 = pts[1]!;
    const p2 = pts[pts.length - 1]!;
    const mid = pts[Math.floor(pts.length / 2)]!;
    const slope = (p2.y - p1.y) / (p2.x - p1.x);
    const expectedMidY = p1.y + slope * (mid.x - p1.x);
    expect(Math.abs(mid.y - expectedMidY)).toBeLessThan(1e-15);
  });

  it('关键帧包含 3 个阶段', () => {
    const r = model.solve(makeProblem());
    expect(r.keyframes.length).toBe(3);
    expect(r.keyframes[0].label).toContain('大球');
    expect(r.keyframes[1].label).toContain('扭转');
    expect(r.keyframes[2].label).toContain('G');
  });

  it('explanation.steps 长度 = 5 (5 步)', () => {
    const r = model.solve(makeProblem());
    expect(r.explanation.steps.length).toBe(5);
  });

  it('模型类可独立实例化并求解', () => {
    const m = new CavendishModel();
    expect(m.name).toBe('卡文迪什扭秤');
    const problem = makeProblem();
    const r = m.solve(problem);
    expect(r.meta.model).toBe('cavendish');
    // F = G·m₁·m₂/r²
    expect(r.diagnostics.maxValues.F).toBeCloseTo(G_STD * 10 * 0.5 / (0.1 * 0.1), 12);
  });

  it('m₁ 越大, θ 越大 (正比)', () => {
    const r1 = model.solve(makeProblem({ m1: 0.25 }));
    const r2 = model.solve(makeProblem({ m1: 0.5 }));
    expect(r2.diagnostics.maxValues.theta_rad).toBeCloseTo(2 * r1.diagnostics.maxValues.theta_rad, 10);
  });
});

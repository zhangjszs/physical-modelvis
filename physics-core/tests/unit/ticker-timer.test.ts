import { describe, it, expect } from 'vitest';
import { TickerTimerModel } from '../../src/models/ticker-timer.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new TickerTimerModel();

interface TickerOpts {
  frequency?: number;
  acceleration?: number;
  frictionCoefficient?: number;
  initialVelocity?: number;
}

function makeProblem(opts: TickerOpts = {}): PhysicsProblem {
  return {
    id: 'tt-test',
    model: 'ticker-timer',
    bodies: [{ id: 'cart', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { tickerTimer: opts },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('TickerTimerModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('ticker-timer');
    expect(model.name).toContain('打点计时器');
    expect(model.version).toBe('1.0.0');
    expect(model.requiredParameters.length).toBeGreaterThanOrEqual(2);
  });

  it('正例: f=50, a=2 → 39 段, R² > 0.999, 逐差法 â ≈ 2', () => {
    const r = model.solve(makeProblem({ frequency: 50, acceleration: 2 }));
    const N = r.diagnostics.maxValues.tickCount as number;
    expect(N).toBe(40);

    // x_t (纸带点) 应有 N 个点
    expect(r.charts.x_t!.points.length).toBe(N);

    // v_t 应有 N - 1 = 39 个点
    expect(r.charts.v_t!.points.length).toBe(N - 1);

    // y_t (Δx) 应有 N - 1 = 39 个点
    expect(r.charts.y_t!.points.length).toBe(N - 1);

    // R² > 0.999 (实际上因无噪声应 R² ≈ 1)
    const r2 = r.diagnostics.maxValues.vt_r_squared as number;
    expect(r2).toBeGreaterThan(0.999);

    // 逐差法 â ≈ 2
    const aHat = r.diagnostics.maxValues.a_from_discrete_method as number;
    expect(aHat).toBeCloseTo(2, 6);
    expect(Math.abs(aHat - 2)).toBeLessThan(1e-9);
  });

  it('a = 0 (匀速) → Δx 全部相等', () => {
    const r = model.solve(makeProblem({ frequency: 50, acceleration: 0, initialVelocity: 5 }));
    const dxChart = r.charts.y_t!;
    // 所有 Δx 应相等 (= v₀ · T)
    const T = 1 / 50;
    const expectedDx = 5 * T;
    const allEqual = dxChart.points.every(p => Math.abs(p.y - expectedDx) < 1e-9);
    expect(allEqual).toBe(true);
    // â 应接近 0
    const aHat = r.diagnostics.maxValues.a_from_discrete_method as number;
    expect(Math.abs(aHat)).toBeLessThan(1e-12);
    // R² 无意义 — v 为常数 — 我们接受 0 或 NaN 的退化
    const r2 = r.diagnostics.maxValues.vt_r_squared as number;
    expect(Number.isFinite(r2)).toBe(true);
  });

  it('边界 — 极低频率 (< 10 Hz) 应触发生成警告但继续运行', () => {
    const r = model.solve(makeProblem({ frequency: 5, acceleration: 2 }));
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toContain('Hz');
    // 但仍应生成合法结果
    expect(r.diagnostics.maxValues.tickCount).toBe(40);
    expect(r.diagnostics.maxValues.a_from_discrete_method).toBeCloseTo(2, 6);
  });

  it('守恒: 末速度 − 初速度 = a·t', () => {
    const f = 100;
    const a = 3;
    const v0 = 1;
    const r = model.solve(makeProblem({ frequency: f, acceleration: a, initialVelocity: v0 }));
    const T_val = r.diagnostics.maxValues.tickInterval_s as number;
    const totalTime = r.diagnostics.maxValues.totalTime as number;
    const finalV = r.diagnostics.maxValues.finalVelocity as number;
    // totalTime = (N - 1) / f
    expect(totalTime).toBeCloseTo(39 / f, 9);
    // v_f = v₀ + a·t
    expect(finalV).toBeCloseTo(v0 + a * totalTime, 6);
  });

  it('中间时刻速度公式 — 第一段 v_mid ≈ v₀ + 0.5·a·T', () => {
    const f = 50;
    const a = 4;
    const v0 = 1;
    const r = model.solve(makeProblem({ frequency: f, acceleration: a, initialVelocity: v0 }));
    const T = 1 / f;
    const firstVMid = r.charts.v_t!.points[0]!.y;
    expect(firstVMid).toBeCloseTo(v0 + 0.5 * a * T, 9);
  });

  it('Δx 判据 — 相邻 Δx 之差 = a·T²', () => {
    const f = 50;
    const a = 2.5;
    const r = model.solve(makeProblem({ frequency: f, acceleration: a }));
    const T = 1 / f;
    const expectedDelta = a * T * T;
    const dxChart = r.charts.y_t!;
    // 取前 5 个 Δx, 验证相邻差
    for (let i = 1; i < Math.min(5, dxChart.points.length); i++) {
      const got = dxChart.points[i]!.y - dxChart.points[i - 1]!.y;
      expect(got).toBeCloseTo(expectedDelta, 9);
    }
  });

  it('最少 5 步 explanation', () => {
    const r = model.solve(makeProblem({ frequency: 50, acceleration: 2 }));
    expect(r.explanation.steps.length).toBeGreaterThanOrEqual(5);
    expect(r.explanation.steps[0]!.description).toContain('原理');
    expect(r.explanation.steps[4]!.description).toContain('误差');
  });

  it('summary 含关键物理量 (f, a, R²)', () => {
    const r = model.solve(makeProblem({ frequency: 50, acceleration: 2 }));
    const s = r.explanation.summary;
    expect(s).toContain('f=');
    expect(s).toContain('a=');
    expect(s).toContain('R²=');
  });
});

import { describe, it, expect } from 'vitest';
import { HertzExperimentModel } from '../../src/models/em-wave-hertz.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new HertzExperimentModel();

function makeProblem(overrides: {
  frequency?: number;
  turns?: number;
  sparkGap?: number;
  distance?: number;
} = {}): PhysicsProblem {
  const { frequency = 1e6, turns = 10, sparkGap = 1, distance = 5 } = overrides;
  return {
    id: 'hertz-test',
    model: 'em-wave-hertz',
    bodies: [{ id: 'antenna', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { hertzExperiment: { frequency, turns, sparkGap, distance } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('HertzExperimentModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('em-wave-hertz');
    expect(model.name).toBe('赫兹电磁波实验');
  });

  it('波长 λ = c/f: f=1MHz → λ=300m', () => {
    const r = model.solve(makeProblem({ frequency: 1e6 }));
    expect(r.diagnostics.maxValues.wavelength).toBeCloseTo(300, 0);
  });

  it('f=100MHz → λ=3m', () => {
    const r = model.solve(makeProblem({ frequency: 100e6 }));
    expect(r.diagnostics.maxValues.wavelength).toBeCloseTo(3, 0);
  });

  it('接收电动势 ∝ 1/d²', () => {
    const r1 = model.solve(makeProblem({ distance: 5 }));
    const r2 = model.solve(makeProblem({ distance: 10 }));
    const ratio = r1.diagnostics.maxValues.currentEmf / r2.diagnostics.maxValues.currentEmf;
    expect(ratio).toBeCloseTo(4, 1); // (10/5)² = 4
  });

  it('接收电动势 ∝ N (匝数)', () => {
    const r1 = model.solve(makeProblem({ turns: 10 }));
    const r2 = model.solve(makeProblem({ turns: 20 }));
    const ratio = r2.diagnostics.maxValues.currentEmf / r1.diagnostics.maxValues.currentEmf;
    expect(ratio).toBeCloseTo(2, 1);
  });

  it('接收电动势 ∝ f (频率)', () => {
    const r1 = model.solve(makeProblem({ frequency: 1e6 }));
    const r2 = model.solve(makeProblem({ frequency: 2e6 }));
    const ratio = r2.diagnostics.maxValues.currentEmf / r1.diagnostics.maxValues.currentEmf;
    expect(ratio).toBeCloseTo(2, 1);
  });

  it('LC 振荡电流波形存在且有正负有', () => {
    const r = model.solve(makeProblem());
    const wave = r.charts.x_t!;
    expect(wave.points.length).toBeGreaterThan(0);
    const maxY = Math.max(...wave.points.map(p => p.y));
    const minY = Math.min(...wave.points.map(p => p.y));
    expect(maxY).toBeGreaterThan(0);
    expect(minY).toBeLessThan(0);
  });

  it('LC 电流峰值 > 0', () => {
    const r = model.solve(makeProblem({ frequency: 1e6 }));
    expect(r.diagnostics.maxValues.maxCurrent).toBeGreaterThan(0);
  });

  it('emf-distance 图第一点距离为 0.5m', () => {
    const r = model.solve(makeProblem());
    const firstPt = r.charts.y_t!.points[0]!;
    expect(firstPt.x).toBeCloseTo(0.5, 1);
  });

  it('emf-distance 图距离越大 emf 越小', () => {
    const r = model.solve(makeProblem());
    const chart = r.charts.y_t!;
    const first = chart.points[0]!.y;
    const last = chart.points[chart.points.length - 1]!.y;
    expect(first).toBeGreaterThan(last);
  });

  it('近场 (d < λ/2π) 触发 warning', () => {
    // f=1MHz → λ=300m, λ/2π ≈ 47.7m, 设 d=1m (近场)
    const r = model.solve(makeProblem({ frequency: 1e6, distance: 1 }));
    expect(r.warnings.some(w => w.includes('近场'))).toBe(true);
  });

  it('远场时不触发近场 warning', () => {
    const r = model.solve(makeProblem({ frequency: 1e6, distance: 100 }));
    expect(r.warnings.some(w => w.includes('近场'))).toBe(false);
  });

  it('summary 包含频率和距离', () => {
    const r = model.solve(makeProblem({ frequency: 5e6, distance: 10 }));
    expect(r.explanation.summary).toContain('5.0MHz');
    expect(r.explanation.summary).toContain('10m');
  });

  it('steps 包含 5 个主要物理过程', () => {
    const r = model.solve(makeProblem());
    expect(r.explanation.steps.length).toBeGreaterThanOrEqual(5);
  });
});

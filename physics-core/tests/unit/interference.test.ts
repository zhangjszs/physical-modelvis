import { describe, it, expect } from 'vitest';
import { InterferenceModel } from '../../src/models/interference.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new InterferenceModel();

function makeProblem(overrides: {
  wavelengthNm?: number;
  slitSeparationMm?: number;
  screenDistanceM?: number;
  filmThicknessUm?: number;
  filmN?: number;
} = {}): PhysicsProblem {
  const {
    wavelengthNm = 600,
    slitSeparationMm = 0.5,
    screenDistanceM = 2.0,
    filmThicknessUm,
    filmN,
  } = overrides;
  const ic: { wavelengthNm: number; slitSeparationMm: number; screenDistanceM: number; filmThicknessUm?: number; filmN?: number } = {
    wavelengthNm, slitSeparationMm, screenDistanceM,
  };
  if (filmThicknessUm !== undefined) ic.filmThicknessUm = filmThicknessUm;
  if (filmN !== undefined) ic.filmN = filmN;
  return {
    id: 'interference-test',
    model: 'interference',
    bodies: [{ id: 'light', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { interference: ic },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('InterferenceModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('interference');
    expect(model.name).toBe('双缝干涉');
  });

  it('条纹间距 Δy = λ·L/d (600nm, 0.5mm, 2m → Δy = 2.4mm)', () => {
    const r = model.solve(makeProblem({ wavelengthNm: 600, slitSeparationMm: 0.5, screenDistanceM: 2 }));
    const deltaYmm = r.diagnostics.maxValues.deltaYmm;
    expect(deltaYmm).toBeCloseTo(2.4, 5); // 600e-9 * 2 / 0.5e-3 = 0.0024 m = 2.4 mm
  });

  it('增大 d → Δy 减小 (反比关系)', () => {
    const r1 = model.solve(makeProblem({ slitSeparationMm: 0.5 }));
    const r2 = model.solve(makeProblem({ slitSeparationMm: 1.0 }));
    expect(r2.diagnostics.maxValues.deltaYmm).toBeCloseTo(r1.diagnostics.maxValues.deltaYmm / 2, 5);
  });

  it('增大 λ → Δy 增大 (正比关系)', () => {
    const r1 = model.solve(makeProblem({ wavelengthNm: 400 }));
    const r2 = model.solve(makeProblem({ wavelengthNm: 700 }));
    expect(r2.diagnostics.maxValues.deltaYmm).toBeGreaterThan(r1.diagnostics.maxValues.deltaYmm);
  });

  it('光强曲线中央 (x=0) 为峰值 (=1)', () => {
    const r = model.solve(makeProblem({ wavelengthNm: 600, slitSeparationMm: 0.5, screenDistanceM: 2 }));
    const chart = r.charts.x_t!;
    // 中间点 x ≈ 0
    const midIdx = Math.floor(chart.points.length / 2);
    expect(chart.points[midIdx]!.y).toBeCloseTo(1, 3);
  });

  it('光强曲线峰值等间距 (Δx = Δy)', () => {
    const r = model.solve(makeProblem({ wavelengthNm: 600, slitSeparationMm: 0.5, screenDistanceM: 2 }));
    const chart = r.charts.x_t!;
    // 找每个明纹峰值的"中心" (y=1 附近的中点)
    // 取所有 y>0.99 的点, 按 x 聚类：相邻点 x 差 > 0.2mm 视为不同峰
    const highPoints = chart.points.filter(p => p.y > 0.99);
    const peaks: number[] = [];
    let lastX = -Infinity;
    for (const p of highPoints) {
      if (p.x - lastX > 0.2) {
        peaks.push(p.x);
        lastX = p.x;
      }
    }
    // 应有 ≥3 个明纹 (k=0, ±1, ±2 中至少 3 个 y>0.99)
    expect(peaks.length).toBeGreaterThanOrEqual(3);
    // 相邻峰间距 ≈ 2.4mm，检查所有间距大致相等
    if (peaks.length >= 3) {
      const d1 = peaks[1]! - peaks[0]!;
      const d2 = peaks[2]! - peaks[1]!;
      expect(Math.abs(d1 - d2)).toBeLessThan(0.3); // 等间距
      expect(d1).toBeGreaterThan(1.5);
      expect(d1).toBeLessThan(3.0);
    }
  });

  it('summary 包含条纹间距', () => {
    const r = model.solve(makeProblem({ wavelengthNm: 500, slitSeparationMm: 0.25, screenDistanceM: 1.5 }));
    expect(r.explanation.summary).toContain('Δy=');
    expect(r.explanation.summary).toContain('λ=');
  });

  it('薄膜干涉：增透条件 (2nd = (m+½)λ)', () => {
    // λ=600nm, n=1.38 (MgF2), d=108.7nm → nd ≈ λ/4 (m=0 增透)
    const r = model.solve(makeProblem({ filmThicknessUm: 0.1087, filmN: 1.38, wavelengthNm: 600 }));
    expect(r.diagnostics.maxValues.isAntiReflective).toBe(1);
  });

  it('薄膜干涉：增反条件 (2nd = mλ)', () => {
    // λ=600nm, n=1.5, d=200nm → 2nd = 600nm = 1λ
    const r = model.solve(makeProblem({ filmThicknessUm: 0.2, filmN: 1.5, wavelengthNm: 600 }));
    expect(r.diagnostics.maxValues.isHighReflective).toBe(1);
  });
});

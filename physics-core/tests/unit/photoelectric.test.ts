import { describe, it, expect } from 'vitest';
import { PhotoelectricModel } from '../../src/models/photoelectric.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new PhotoelectricModel();

function makeProblem(overrides: {
  workFunction?: number;
  freqMinTHz?: number;
  freqMaxTHz?: number;
} = {}): PhysicsProblem {
  const { workFunction = 2.3, freqMinTHz, freqMaxTHz } = overrides;
  const pc: { workFunction: number; freqMinTHz?: number; freqMaxTHz?: number } = { workFunction };
  if (freqMinTHz !== undefined) pc.freqMinTHz = freqMinTHz;
  if (freqMaxTHz !== undefined) pc.freqMaxTHz = freqMaxTHz;
  return {
    id: 'pe-test',
    model: 'photoelectric',
    bodies: [{ id: 'electron', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { photoelectric: pc },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('PhotoelectricModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('photoelectric');
    expect(model.name).toBe('光电效应');
  });

  it('钠 (W₀=2.28eV) → 极限频率 ≈ 555 THz', () => {
    const r = model.solve(makeProblem({ workFunction: 2.28 }));
    const nu0 = r.diagnostics.maxValues.thresholdFrequency_THz;
    expect(nu0).toBeCloseTo(555, -1); // 误差 ±10
  });

  it('ν < ν₀ 时无光电子 (U_c-ν 曲线在极限频率以上才有值)', () => {
    const r = model.solve(makeProblem({ workFunction: 2.5, freqMinTHz: 100, freqMaxTHz: 500 }));
    // ν_max = 500 THz, ν₀ ≈ 605 THz → 全为亚阈值, 应该无数据点或全部都是过滤后
    const chart = r.charts.x_t!;
    // chart 的点应该全部满足 ν ≥ ν₀; 若 ν₀ > freqMaxTHz，则曲线应为空
    const nu0 = r.diagnostics.maxValues.thresholdFrequency_THz;
    if (nu0 > 500) {
      expect(chart.points.length).toBe(0);
    } else {
      // 所有点的 x (THz) 应该 ≥ nu0
      chart.points.forEach(p => {
        expect(p.x).toBeGreaterThanOrEqual(nu0 - 0.01);
      });
    }
  });

  it('截止电压线性：斜率 = h/e (≈ 4.14×10⁻¹⁵ V·s)', () => {
    const r = model.solve(makeProblem({ workFunction: 2.0, freqMinTHz: 500, freqMaxTHz: 1500 }));
    const chart = r.charts.x_t!;
    // 计算斜率 ΔU_c / Δν
    if (chart.points.length >= 10) {
      const p1 = chart.points[1]!, p2 = chart.points[chart.points.length - 2]!;
      const dUc = p2.y - p1.y;
      const dNu = (p2.x - p1.x) * 1e12; // THz → Hz
      const slope = dUc / dNu;
      // h/e = 6.626e-34 / 1.602e-19 ≈ 4.136e-15
      expect(slope).toBeCloseTo(4.14e-15, 16);
    }
  });

  it('逸出功越大, 极限频率越高 (正相关)', () => {
    const r1 = model.solve(makeProblem({ workFunction: 2.0 }));
    const r2 = model.solve(makeProblem({ workFunction: 4.0 }));
    expect(r2.diagnostics.maxValues.thresholdFrequency_THz).toBeGreaterThan(
      r1.diagnostics.maxValues.thresholdFrequency_THz
    );
  });

  it('h/e 常量验证', () => {
    const r = model.solve(makeProblem({ workFunction: 2.5 }));
    const h = 6.626e-34, e = 1.602e-19;
    expect(r.diagnostics.maxValues.h_over_e).toBeCloseTo(h / e, 17);
  });

  it('summary 包含逸出功和极限频率', () => {
    const r = model.solve(makeProblem({ workFunction: 2.3 }));
    expect(r.explanation.summary).toContain('W₀=');
    expect(r.explanation.summary).toContain('ν₀=');
  });
});

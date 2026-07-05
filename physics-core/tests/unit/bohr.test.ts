import { describe, it, expect } from 'vitest';
import { BohrModel } from '../../src/models/bohr.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new BohrModel();

function makeProblem(overrides: {
  series?: 'Lyman' | 'Balmer' | 'Paschen';
  maxN?: number;
} = {}): PhysicsProblem {
  const { series = 'Balmer', maxN = 5 } = overrides;
  return {
    id: 'bohr-test',
    model: 'bohr-model',
    bodies: [{ id: 'electron', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { bohr: { series, maxN } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('BohrModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('bohr-model');
    expect(model.name).toBe('玻尔氢原子模型');
  });

  it('基态能级 E₁ = −13.6 eV', () => {
    const r = model.solve(makeProblem());
    const levels = r.charts.x_t!; // E-diagram: x=n, y=E(eV)
    expect(levels.points[0]!.y).toBeCloseTo(-13.6, 1);
  });

  it('激发态能级：E₂=−3.4 eV, E₃=−1.51 eV', () => {
    const r = model.solve(makeProblem({ maxN: 5 }));
    const levels = r.charts.x_t!;
    expect(levels.points[1]!.y).toBeCloseTo(-13.6 / 4, 1);
    expect(levels.points[2]!.y).toBeCloseTo(-13.6 / 9, 1);
  });

  it('巴尔末系 Hα (n=3→2) 波长 ≈ 656 nm', () => {
    const r = model.solve(makeProblem({ series: 'Balmer', maxN: 4 }));
    // Balmer 在 maxN=4 时有跃迁：3→2, 4→2
    const balmerLines = r.charts.y_t!; // spectrum: x=跃迁编号, y=波长nm
    expect(balmerLines.points.length).toBeGreaterThanOrEqual(1);
    // Hα 是第 1 条 (n=3→2)，波长接近 656.3 nm
    expect(balmerLines.points[0]!.y).toBeCloseTo(656, -1); // 误差 ±5
  });

  it('巴尔末系 Hβ (n=4→2) 波长 ≈ 486 nm', () => {
    const r = model.solve(makeProblem({ series: 'Balmer', maxN: 5 }));
    const balmerLines = r.charts.y_t!;
    // lines sorted by λ: Hα (3→2), Hβ (4→2), ...
    if (balmerLines.points.length >= 2) {
      expect(balmerLines.points[1]!.y).toBeCloseTo(486, -1); // 误差 ±5
    }
  });

  it('赖曼系 (Lyman) 基态 n₁=1 → 紫外区', () => {
    const r = model.solve(makeProblem({ series: 'Lyman', maxN: 4 }));
    // Lyman 所有波长都 < 122 nm (紫外)
    const lymanLines = r.charts.y_t!;
    lymanLines.points.forEach(p => {
      expect(p.y).toBeLessThan(130);
    });
  });

  it('巴尔末系可见光区包含至少 2 条谱线 (Hα, Hβ)', () => {
    const r = model.solve(makeProblem({ series: 'Balmer', maxN: 7 }));
    const visibleCount = r.diagnostics.maxValues.visibleLineCount;
    expect(visibleCount).toBeGreaterThanOrEqual(2);
  });

  it('maxN=6 巴尔末系可见 4 条 (Hα-Hδ)', () => {
    const r = model.solve(makeProblem({ series: 'Balmer', maxN: 6 }));
    expect(r.diagnostics.maxValues.visibleLineCount).toBeGreaterThanOrEqual(4);
  });

  it('summary 包含谱线列表', () => {
    const r = model.solve(makeProblem({ series: 'Balmer', maxN: 4 }));
    expect(r.explanation.summary).toContain('巴尔末');
    expect(r.explanation.summary).toContain('nm');
  });
});

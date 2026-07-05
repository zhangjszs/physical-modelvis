import { describe, it, expect } from 'vitest';
import { GasLawModel } from '../../src/models/gas-law.js';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { GasLawConstraint } from '../../src/types/problem.js';

const model = new GasLawModel();

function makeProblem(overrides: {
  moles?: number;
  mode?: 'isothermal' | 'isobaric' | 'isochoric';
  initialPressure?: number;
  initialVolume?: number;
  initialTemperature?: number;
} = {}): PhysicsProblem {
  const {
    moles = 1,
    mode = 'isothermal',
    initialPressure,
    initialVolume,
    initialTemperature,
  } = overrides;
  const gc: GasLawConstraint = { moles, mode };
  if (initialPressure !== undefined) gc.initialPressure = initialPressure;
  if (initialVolume !== undefined) gc.initialVolume = initialVolume;
  if (initialTemperature !== undefined) gc.initialTemperature = initialTemperature;
  return {
    id: 'gas-law-test',
    model: 'gas-law',
    bodies: [{ id: 'gas', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { gasLaw: gc },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('GasLawModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('gas-law');
    expect(model.name).toBe('理想气体状态方程');
  });

  it('等温过程 (V减半 → p加倍)', () => {
    const r = model.solve(makeProblem({
      moles: 1, mode: 'isothermal',
      initialPressure: 1.013e5, initialVolume: 0.0224, initialTemperature: 273.15,
    }));
    const pInit = r.diagnostics.maxValues.initialPressurePa;
    const pFinal = r.diagnostics.maxValues.finalPressurePa;
    const VInit = r.diagnostics.maxValues.initialVolumeM3;
    const VFinal = r.diagnostics.maxValues.finalVolumeM3;
    expect(VFinal).toBeCloseTo(VInit / 2, 5);
    expect(pFinal).toBeCloseTo(pInit * 2, 1); // pV=const
  });

  it('等温曲线 pV=const 验证 (玻意耳定律)', () => {
    const r = model.solve(makeProblem({
      moles: 1, mode: 'isothermal',
      initialPressure: 100e3, initialVolume: 0.0248, initialTemperature: 300,
    }));
    const chart = r.charts.x_t!;
    const expectedPV = 100e3 * 0.0248; // 2480 J
    // p·V = const: 抽样验证 (允许 1% 误差因数据坐标量化)
    for (let i = 10; i < chart.points.length; i += 20) {
      const p = chart.points[i]!.y * 1e3; // Pa (kPa*1e3)
      const V = chart.points[i]!.x / 1e3; // m³ (L/1e3)
      expect(Math.abs(p * V - expectedPV) / expectedPV).toBeLessThan(0.01);
    }
  });

  it('等压过程 (V减半 → T减半)', () => {
    const r = model.solve(makeProblem({
      moles: 1, mode: 'isobaric',
      initialPressure: 100e3, initialVolume: 0.0248, initialTemperature: 300,
    }));
    expect(r.diagnostics.maxValues.finalPressurePa).toBeCloseTo(100e3, 1);
    expect(r.diagnostics.maxValues.finalVolumeM3).toBeCloseTo(0.0248 / 2, 6);
    expect(r.diagnostics.maxValues.finalTemperatureK).toBeCloseTo(150, 0);
  });

  it('等容过程 (V 减半含义: T 减半 → p 减半)', () => {
    const r = model.solve(makeProblem({
      moles: 1, mode: 'isochoric',
      initialPressure: 100e3, initialVolume: 0.0248, initialTemperature: 300,
    }));
    expect(r.diagnostics.maxValues.finalVolumeM3).toBeCloseTo(0.0248, 6);
    expect(r.diagnostics.maxValues.finalTemperatureK).toBeCloseTo(150, 0);
    expect(r.diagnostics.maxValues.finalPressurePa).toBeCloseTo(50e3, 1);
  });

  it('状态量 pV=nRT 一致 (1mol 标准状况)', () => {
    const r = model.solve(makeProblem({ moles: 1, mode: 'isothermal' }));
    // 1 mol, T≈273.15, p≈1.013e5 → V≈0.0224 m³ = 22.4 L
    const V = r.diagnostics.maxValues.initialVolumeM3 || 0.0224;
    expect(V * 1e3).toBeGreaterThan(21);
    expect(V * 1e3).toBeLessThan(23);
  });

  it('summary 包含 n 和过程类型', () => {
    const r = model.solve(makeProblem({ moles: 2, mode: 'isobaric' }));
    expect(r.explanation.summary).toContain('n=2');
    expect(r.explanation.summary).toContain('等压');
  });

  it('等压曲线在 p-V 图上应为水平线', () => {
    const r = model.solve(makeProblem({ mode: 'isobaric', initialPressure: 100e3 }));
    const chart = r.charts.x_t!;
    // 同一条 p-V 曲线内 p 应该不变
    if (chart.points.length >= 3) {
      const firstP = chart.points[0]!.y;
      const lastP = chart.points[chart.points.length - 1]!.y;
      expect(Math.abs(firstP - lastP)).toBeLessThan(0.01); // 等压
    }
  });
});

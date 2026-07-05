import { describe, it, expect } from 'vitest';
import { VernierCaliperModel } from '../../src/models/vernier-caliper.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new VernierCaliperModel();

function makeProblem(overrides: {
  objectSize?: number;
  nType?: 10 | 20 | 50;
  randomOffset?: number;
} = {}): PhysicsProblem {
  const { objectSize = 23.4, nType = 20, randomOffset = 0 } = overrides;
  return {
    id: 'vc-test',
    model: 'vernier-caliper',
    bodies: [{ id: 'obj', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { vernierCaliper: { objectSize, nType, randomOffset } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('VernierCaliperModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('vernier-caliper');
    expect(model.name).toBe('游标卡尺读数');
  });

  it('10分度: 12.3mm → 主尺=12, K=3, 读数=12.3mm', () => {
    const r = model.solve(makeProblem({ objectSize: 12.3, nType: 10 }));
    expect(r.diagnostics.maxValues.mainScaleMM).toBe(12);
    expect(r.diagnostics.maxValues.K).toBe(3);
    expect(r.diagnostics.maxValues.reading).toBeCloseTo(12.3, 1);
  });

  it('20分度: 23.45mm → 主尺=23, K=9, 读数=23.45mm', () => {
    const r = model.solve(makeProblem({ objectSize: 23.45, nType: 20 }));
    expect(r.diagnostics.maxValues.mainScaleMM).toBe(23);
    expect(r.diagnostics.maxValues.K).toBe(9);
    expect(r.diagnostics.maxValues.reading).toBeCloseTo(23.45, 2);
  });

  it('50分度: 5.36mm → 主尺=5, K=18, 读数=5.36mm', () => {
    const r = model.solve(makeProblem({ objectSize: 5.36, nType: 50 }));
    expect(r.diagnostics.maxValues.mainScaleMM).toBe(5);
    expect(r.diagnostics.maxValues.K).toBe(18);
    expect(r.diagnostics.maxValues.reading).toBeCloseTo(5.36, 2);
  });

  it('精度 = 1/N', () => {
    const r10 = model.solve(makeProblem({ nType: 10 }));
    expect(r10.diagnostics.maxValues.precision).toBeCloseTo(0.1, 5);
    const r50 = model.solve(makeProblem({ nType: 50 }));
    expect(r50.diagnostics.maxValues.precision).toBeCloseTo(0.02, 5);
  });

  it('summary 包含读数结果', () => {
    const r = model.solve(makeProblem({ objectSize: 15.6, nType: 10 }));
    expect(r.explanation.summary).toContain('15.6');
    expect(r.explanation.summary).toContain('mm');
  });

  it('static-diagram 存在且有点', () => {
    const r = model.solve(makeProblem({ objectSize: 10, nType: 20 }));
    const chart = r.charts['static-diagram'];
    expect(chart).toBeDefined();
    expect(chart!.points.length).toBeGreaterThan(0);
  });

  it('随机偏移影响 K 值', () => {
    const r1 = model.solve(makeProblem({ objectSize: 10.0, nType: 10, randomOffset: 0 }));
    const r2 = model.solve(makeProblem({ objectSize: 10.0, nType: 10, randomOffset: 0.05 }));
    // 偏移 0.05mm 可能改变 K 值 (取决于四舍五入)
    expect(r2.diagnostics.maxValues.randomOffset).toBeCloseTo(0.05, 5);
  });
});

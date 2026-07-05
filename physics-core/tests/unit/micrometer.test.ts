import { describe, it, expect } from 'vitest';
import { MicrometerModel } from '../../src/models/micrometer.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new MicrometerModel();

function makeProblem(overrides: {
  thickness?: number;
  randomAngle?: number;
} = {}): PhysicsProblem {
  const { thickness = 5.75, randomAngle = 0 } = overrides;
  return {
    id: 'micro-test',
    model: 'micrometer',
    bodies: [{ id: 'obj', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { micrometer: { thickness, randomAngle } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('MicrometerModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('micrometer');
    expect(model.name).toBe('螺旋测微器读数');
  });

  it('读数 5.75mm: a=5.5, b=0, n=25, 读数=5.75mm', () => {
    const r = model.solve(makeProblem({ thickness: 5.75, randomAngle: 0 }));
    expect(r.diagnostics.maxValues.a).toBeCloseTo(5.5, 1);
    expect(r.diagnostics.maxValues.b).toBeCloseTo(0, 1);
    expect(r.diagnostics.maxValues.n).toBe(25);
    expect(r.diagnostics.maxValues.reading).toBeCloseTo(5.75, 2);
  });

  it('读数在合理范围内', () => {
    for (let t = 0.1; t < 10; t += 0.37) {
      const r = model.solve(makeProblem({ thickness: t, randomAngle: 45 }));
      expect(r.diagnostics.maxValues.reading).toBeGreaterThan(0);
      expect(r.diagnostics.maxValues.reading).toBeLessThan(30);
    }
  });

  it('固定刻度 a 是 0.5 mm 的倍数', () => {
    const r = model.solve(makeProblem({ thickness: 3.25, randomAngle: 0 }));
    const a = r.diagnostics.maxValues.a;
    expect(a * 2).toBe(Math.round(a * 2)); // a * 2 必须是整数
  });

  it('可动刻度 n 在 0~49 范围内', () => {
    const r = model.solve(makeProblem({ thickness: 7.83, randomAngle: 0 }));
    const n = r.diagnostics.maxValues.n;
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThanOrEqual(49);
  });

  it('summary 包含读数结果', () => {
    const r = model.solve(makeProblem({ thickness: 5.75 }));
    expect(r.explanation.summary).toContain('mm');
  });

  it('static-diagram 存在且有点', () => {
    const r = model.solve(makeProblem({ thickness: 3.5 }));
    const chart = r.charts['static-diagram'];
    expect(chart).toBeDefined();
    expect(chart!.points.length).toBeGreaterThan(0);
  });

  it('不同随机角度产生不同的 angleDelta', () => {
    const r0 = model.solve(makeProblem({ thickness: 5.0, randomAngle: 0 }));
    const r180 = model.solve(makeProblem({ thickness: 5.0, randomAngle: 180 }));
    expect(r0.diagnostics.maxValues.angleDelta).toBeCloseTo(0, 5);
    expect(r180.diagnostics.maxValues.angleDelta).toBeCloseTo(0.25, 2);
  });

  it('超过 25mm 触发 warning', () => {
    const r = model.solve(makeProblem({ thickness: 26 }));
    expect(r.warnings.some(w => w.includes('量程'))).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { InclinedPlaneModel } from '../../src/models/inclined-plane.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new InclinedPlaneModel();

function makeProblem(
  angle: number,
  mu: number = 0,
  m: number = 1,
  g: number = 9.8,
  duration: number = 5,
  sampleCount: number = 200,
): PhysicsProblem {
  return {
    id: 'test-incline',
    model: 'inclined-plane',
    bodies: [{ id: 'block', mass: { value: m, unit: 'kg' }, position: { x: 0, y: 10 }, velocity: { x: 0, y: 0 } }],
    constraints: { inclinedPlane: { angle, frictionCoefficient: mu } },
    environment: { gravity: { enabled: true, value: g } },
    timeConfig: { duration, sampleCount },
  };
}

describe('InclinedPlaneModel', () => {
  it('无摩擦30度斜面: a = g sin30° = 4.9 m/s²', () => {
    const result = model.solve(makeProblem(30, 0));
    const a_t = result.charts.a_t!;
    const aValues = a_t.points.map(p => p.y);
    const a = aValues[1]; // t=0 加速度为0 (初始帧), 取 t>0
    expect(a).toBeCloseTo(9.8 * Math.sin(Math.PI / 6), 4);
  });

  it('无摩擦45度斜面: a = g sin45°', () => {
    const g = 10;
    const result = model.solve(makeProblem(45, 0, 1, g));
    const a = result.charts.a_t!.points[1].y;
    expect(a).toBeCloseTo(g * Math.sin(Math.PI / 4), 4);
  });

  it('有摩擦30度斜面: a = g(sinθ - μcosθ)', () => {
    const g = 10;
    const mu = 0.2;
    const angle = 30;
    const expected = g * (Math.sin(angle * Math.PI / 180) - mu * Math.cos(angle * Math.PI / 180));
    const result = model.solve(makeProblem(angle, mu, 1, g));
    const a = result.charts.a_t!.points[1].y;
    expect(a).toBeCloseTo(expected, 4);
  });

  it('临界角: tanθ = μ 时物体静止', () => {
    const mu = 0.5;
    const criticalAngle = Math.atan(mu) * 180 / Math.PI; // ≈26.57°
    const result = model.solve(makeProblem(criticalAngle, mu, 1, 10, 5, 100));
    // 加速度应为0或负值, 物体静止
    const v_t = result.charts.v_t!;
    for (const pt of v_t.points) {
      expect(pt.y).toBeCloseTo(0, 4);
    }
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('临界角以下: 物体不下滑', () => {
    const mu = 0.5;
    const angle = 20; // < arctan(0.5) ≈ 26.57°
    const result = model.solve(makeProblem(angle, mu));
    const v_t = result.charts.v_t!;
    for (const pt of v_t.points) {
      expect(pt.y).toBeCloseTo(0, 4);
    }
  });

  it('受力分析: 力的数量和名称正确', () => {
    const result = model.solve(makeProblem(30, 0.1));
    const fd = result.charts.force_diagram!;
    expect(fd.bodyId).toBe('block');
    expect(fd.forces).toHaveLength(3);
    const names = fd.forces.map(f => f.name);
    expect(names).toContain('重力分量(F∥)');
    expect(names).toContain('支持力(N)');
    expect(names).toContain('摩擦力(f)');
  });

  it('支持力 N = mg cosθ', () => {
    const m = 2, g = 10, angle = 30;
    const result = model.solve(makeProblem(angle, 0, m, g));
    const fd = result.charts.force_diagram!;
    const normalForce = fd.forces.find(f => f.name === '支持力(N)')!;
    expect(normalForce.magnitude).toBeCloseTo(m * g * Math.cos(angle * Math.PI / 180), 4);
  });

  it('摩擦力 f = μN', () => {
    const m = 2, g = 10, angle = 30, mu = 0.3;
    const result = model.solve(makeProblem(angle, mu, m, g));
    const fd = result.charts.force_diagram!;
    const frictionForce = fd.forces.find(f => f.name === '摩擦力(f)')!;
    const expectedFriction = mu * m * g * Math.cos(angle * Math.PI / 180);
    expect(frictionForce.magnitude).toBeCloseTo(expectedFriction, 4);
  });

  it('diagnostics 包含临界角', () => {
    const mu = 0.4;
    const result = model.solve(makeProblem(30, mu));
    const criticalAngle = result.diagnostics.maxValues.criticalAngle;
    expect(criticalAngle).toBeCloseTo(Math.atan(mu) * 180 / Math.PI, 2);
  });

  it('解析精度: v² = 2as 验证', () => {
    const g = 10, angle = 30, duration = 4;
    const result = model.solve(makeProblem(angle, 0, 1, g, duration));
    const v_t = result.charts.v_t!;
    const finalV = v_t.points[v_t.points.length - 1].y;
    const x_t = result.charts.x_t!;
    const finalS = x_t.points[x_t.points.length - 1].y;
    const a = g * Math.sin(angle * Math.PI / 180);
    // v² = v₀² + 2as, v₀ = 0
    expect(finalV * finalV).toBeCloseTo(2 * a * finalS, 0);
  });

  it('关键帧包含起始点和终点', () => {
    const result = model.solve(makeProblem(30, 0));
    const labels = result.keyframes.map(k => k.label);
    expect(labels).toContain('起始点');
    expect(labels).toContain('终点');
  });

  it('静止情况的关键帧', () => {
    const result = model.solve(makeProblem(20, 0.5));
    const labels = result.keyframes.map(k => k.label);
    expect(labels).toContain('物体静止');
  });

  it('meta 信息正确', () => {
    const result = model.solve(makeProblem(30, 0));
    expect(result.meta.model).toBe('inclined-plane');
    expect(result.meta.solver).toBe('analytical');
    expect(result.meta.version).toBe('1.0.0');
  });

  it('explanation 包含公式', () => {
    const result = model.solve(makeProblem(30, 0.1));
    expect(result.explanation.formulas.length).toBeGreaterThanOrEqual(4);
    const formulaNames = result.explanation.formulas.map(f => f.name);
    expect(formulaNames).toContain('重力分量');
    expect(formulaNames).toContain('加速度');
    expect(formulaNames).toContain('临界角');
  });

  it('校验失败: 模型类型不匹配', () => {
    const problem: PhysicsProblem = {
      id: 'bad', model: 'uniform-linear',
      bodies: [{ id: 'b1', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
      timeConfig: { duration: 1 },
    };
    const v = model.validate(problem);
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.code === 'MODEL_MISMATCH')).toBe(true);
  });
});

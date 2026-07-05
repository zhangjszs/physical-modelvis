import { describe, it, expect } from 'vitest';
import { TransmissionBeltModel } from '../../src/models/transmission-belt.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new TransmissionBeltModel();

function makeProblem(opts: {
  mode?: 'belt' | 'gear' | 'friction' | 'coax';
  r1?: number;
  r2?: number;
  omega1?: number;
  duration?: number;
  sampleCount?: number;
} = {}): PhysicsProblem {
  const {
    mode = 'belt',
    r1 = 0.4,
    r2 = 0.2,
    omega1 = 4,
    duration = 2,
    sampleCount = 500,
  } = opts;
  return {
    id: 'transmission-test',
    model: 'transmission-belt',
    bodies: [
      {
        id: 'driver',
        mass: { value: 1, unit: 'kg' },
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
      },
    ],
    constraints: { transmission: { mode, r1, r2, omega1 } },
    timeConfig: { duration, sampleCount },
  };
}

describe('TransmissionBeltModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('transmission-belt');
    expect(model.name).toBe('几种传动方式');
    expect(model.version).toBe('1.0.0');
  });

  it('皮带传动: 两轮边缘线速度等大, 转向相同', () => {
    const r = model.solve(makeProblem({ mode: 'belt', r1: 0.4, r2: 0.2, omega1: 4 }));
    // ω₁·r₁ = 4·0.4 = 1.6, ω₂ = 1.6/0.2 = 8
    expect(r.diagnostics.maxValues.omega2).toBeCloseTo(8, 6);
    expect(r.diagnostics.maxValues.vSurface).toBeCloseTo(1.6, 6);
    // 保守量: v_s1 = v_s2
    expect(r.diagnostics.conservedQuantities[0]!.conserved).toBe(true);
  });

  it('齿轮传动: 两轮边缘线速度等大, 线速度保守量校验正确', () => {
    const r = model.solve(makeProblem({ mode: 'gear', r1: 0.3, r2: 0.5, omega1: 6 }));
    expect(r.diagnostics.maxValues.omega2).toBeCloseTo(3.6, 6); // 6·0.3/0.5
    expect(r.diagnostics.maxValues.vSurface).toBeCloseTo(1.8, 6); // 6·0.3
  });

  it('摩擦轮: 与皮带类似 (线速度等大, 角速度与半径反比)', () => {
    const r = model.solve(makeProblem({ mode: 'friction', r1: 0.5, r2: 0.25, omega1: 10 }));
    expect(r.diagnostics.maxValues.omega2).toBeCloseTo(20, 6);
    expect(r.diagnostics.maxValues.vSurface).toBeCloseTo(5, 6);
  });

  it('同轴传动: 角速度等大', () => {
    const r = model.solve(makeProblem({ mode: 'coax', r1: 0.3, r2: 0.7, omega1: 5 }));
    expect(r.diagnostics.maxValues.omega2).toBeCloseTo(5, 6);
  });

  it('传动比 = r₁/r₂ (半径比)', () => {
    const r = model.solve(makeProblem({ mode: 'belt', r1: 0.6, r2: 0.15, omega1: 2 }));
    // gearRatio = ω₂/ω₁ = r₁/r₂ = 4
    expect(r.diagnostics.maxValues.gearRatio).toBeCloseTo(4, 6);
    expect(r.diagnostics.maxValues.radiusRatio).toBeCloseTo(4, 6);
  });

  it('r-ω 反比图: ω·r 保持恒定 (皮带/摩擦)', () => {
    const r = model.solve(makeProblem({ mode: 'belt', r1: 0.4, r2: 0.2, omega1: 4 }));
    const pts = r.charts.r_omega_inverse!.points;
    // 对每一点 r·ω 应 == ω₁·r₁ = 1.6
    const vEdge = 1.6;
    for (const p of pts) {
      expect(Math.abs(p.x * p.y - vEdge)).toBeLessThan(1e-9);
    }
  });

  it('gear_ratio 图: ω₂/ω₁ 随 r₁/r₂ 反比变化', () => {
    const r = model.solve(makeProblem({ mode: 'belt', r1: 0.4, r2: 0.2, omega1: 4 }));
    const pts = r.charts.gear_ratio!.points;
    expect(pts.length).toBeGreaterThan(0);
    // 验证最后一点 ratio≈4 → y=0.25
    const last = pts[pts.length - 1]!;
    expect(Math.abs(last.y - 1 / last.x)).toBeLessThan(1e-9);
  });

  it('关键点包含 "起始点" 与 "终点"', () => {
    const r = model.solve(makeProblem());
    const labels = r.keyframes.map(k => k.label);
    expect(labels).toContain('起始点');
    expect(labels).toContain('终点');
  });

  it('轨迹点数 = sampleCount + 1', () => {
    const r = model.solve(makeProblem({ sampleCount: 400 }));
    expect(r.trajectories[0]!.length).toBe(401);
    expect(r.trajectories[1]!.length).toBe(401); // 两圈
  });

  it('静态示意图 包含两轮轮廓', () => {
    const r = model.solve(makeProblem());
    const pts = r.charts['static-diagram']!.points;
    expect(pts.length).toBeGreaterThanOrEqual(128);
  });

  it('omega_comparison 展示从动轮角速度', () => {
    const r = model.solve(makeProblem({ mode: 'belt', r1: 0.4, r2: 0.2, omega1: 4 }));
    const pts = r.charts.omega_comparison!.points;
    // 主轮角速度 = ω₁ = 4 (时间序列)
    expect(pts[0]!.y).toBeCloseTo(4, 6);
    expect(pts[pts.length - 1]!.y).toBeCloseTo(4, 6);
  });

  it('v_surfaces 展示边缘线速度 (恒定)', () => {
    const r = model.solve(makeProblem({ mode: 'belt', r1: 0.4, r2: 0.2, omega1: 5 }));
    const expected = 2; // ω₁·r₁ = 5·0.4
    const pts = r.charts.v_surfaces!.points;
    expect(pts.every(p => Math.abs(p.y - expected) < 1e-9)).toBe(true);
  });

  it('受力分析图包含驱动力矩与皮带张力', () => {
    const r = model.solve(makeProblem({ mode: 'belt', r1: 0.4, r2: 0.2, omega1: 4 }));
    const fd = r.charts.force_diagram!;
    expect(fd.forces.length).toBeGreaterThanOrEqual(2);
    const hasTension = fd.forces.some(f => f.name.includes('张力') || f.name.includes('力矩'));
    expect(hasTension).toBe(true);
  });

  it('explanation 包含 4 个步骤 (非 coaxial) / 3 步 (coax)', () => {
    const belt = model.solve(makeProblem({ mode: 'belt' }));
    expect(belt.explanation.steps.length).toBe(4);

    const coax = model.solve(makeProblem({ mode: 'coax' }));
    expect(coax.explanation.steps.length).toBe(3);
  });

  it('半径为负时抛出错误', () => {
    expect(() => model.solve(makeProblem({ r1: -0.1 }))).toThrow();
  });
});

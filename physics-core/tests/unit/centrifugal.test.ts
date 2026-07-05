import { describe, it, expect } from 'vitest';
import { CentrifugalModel } from '../../src/models/centrifugal.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new CentrifugalModel();

function makeProblem(opts: {
  mass?: number;
  radius?: number;
  angularSpeed?: number;
  frictionCoeff?: number;
  gravity?: number;
  duration?: number;
  sampleCount?: number;
} = {}): PhysicsProblem {
  const {
    mass = 1,
    radius = 0.5,
    angularSpeed = 2,
    frictionCoeff = 0.3,
    gravity = 9.8,
    duration = 5,
    sampleCount = 500,
  } = opts;
  return {
    id: 'centrifugal-test',
    model: 'centrifugal',
    bodies: [
      {
        id: 'block',
        mass: { value: mass, unit: 'kg' },
        position: { x: radius, y: 0 },
        velocity: { x: 0, y: 0 },
      },
    ],
    constraints: { centrifugal: { mass, radius, angularSpeed, frictionCoeff, gravity } },
    timeConfig: { duration, sampleCount },
  };
}

describe('CentrifugalModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('centrifugal');
    expect(model.name).toBe('离心现象');
  });

  it('小 ω: 不离心, F_需 ≤ F_实,max', () => {
    // m=1, r=0.5, ω=2, μ=0.3, g=9.8
    // F_需 = 1·4·0.5 = 2, F_实,max = μmg = 0.3·1·9.8 = 2.94 → 不离心
    const r = model.solve(makeProblem({ angularSpeed: 2 }));
    expect(r.diagnostics.rangeCheck.warnings.length).toBe(0);
    expect(r.explanation.summary).toContain('不离心');
  });

  it('大 ω: 离心, F_需 > F_实,max', () => {
    // ω=4: F_需 = 1·16·0.5 = 8, F_实,max = 2.94 → 离心
    const r = model.solve(makeProblem({ angularSpeed: 4 }));
    expect(r.diagnostics.rangeCheck.warnings.length).toBeGreaterThanOrEqual(1);
    expect(r.explanation.summary).toContain('离心运动');
  });

  it('临界角速度 ω_crit = √(μ·g/r)', () => {
    // μ=0.3, g=9.8, r=0.5 → ω_crit = √(0.3·9.8/0.5) = √5.88 ≈ 2.425
    const r = model.solve(makeProblem({ angularSpeed: 2.4 }));
    expect(r.diagnostics.maxValues.omegaCrit).toBeCloseTo(Math.sqrt(5.88), 6);
    // ω=2.4 < ω_crit → 不离心
    expect(r.diagnostics.rangeCheck.warnings.length).toBe(0);
  });

  it('安全系数 = F_实,max / F_需 (≥1 安全)', () => {
    const r = model.solve(makeProblem({ angularSpeed: 2 }));
    // sf = 2.94 / 2 = 1.47
    expect(r.diagnostics.maxValues.safetyFactor).toBeCloseTo(2.94 / 2, 6);
  });

  it('slip_diagnostics 图: 安全系数 < 1 = 离心', () => {
    const r = model.solve(makeProblem({ angularSpeed: 2 }));
    const pts = r.charts.slip_diagnostics!.points;
    // sf = F_fricMax / (m·ω²·r) = 2.94 / r 随 r 增大而减小
    // r=0.5 时 sf=2.94/(1·4·0.5)=2.94/2=1.47
    const testR = pts.find(p => Math.abs(p.x - 0.5) < 0.05)!;
    expect(testR.y).toBeCloseTo(1.47, 0);
  });

  it('omega_critical_curve: ω_crit = √(μ·g/r)', () => {
    const r = makeProblem_omegaChart();
    // 实际上直接查看图表点
    const model = new CentrifugalModel();
    const res = model.solve(makeProblem({ angularSpeed: 1, frictionCoeff: 0.3, radius: 0.5 }));
    const pts = res.charts.omega_critical_curve!.points;
    // 验证: 对每一点 r, ω_crit = √(μ·g/r)
    for (const p of pts) {
      expect(Math.abs(p.y - Math.sqrt(0.3 * 9.8 / p.x))).toBeLessThan(1e-6);
    }
  });

  it('不离心时: 轨迹为半径 = r₀ 的圆', () => {
    const res = model.solve(makeProblem({ angularSpeed: 2 }));
    const traj = res.trajectories[0]!;
    // 所有点到原点距离 ≈ r₀
    for (const p of traj) {
      const dist = Math.hypot(p.position.x, p.position.y);
      expect(Math.abs(dist - 0.5)).toBeLessThan(1e-6);
    }
  });

  it('离心时: 轨迹后期离开转盘 (半径增大)', () => {
    const res = model.solve(makeProblem({ angularSpeed: 4 }));
    const traj = res.trajectories[0]!;
    const firstR = Math.hypot(traj[0]!.position.x, traj[0]!.position.y);
    const lastR = Math.hypot(traj[traj.length - 1]!.position.x, traj[traj.length - 1]!.position.y);
    expect(lastR).toBeGreaterThan(firstR);
  });

  it('required_vs_provided: F_需 = m·ω²·r 随 r 线性增长', () => {
    const res = model.solve(makeProblem({ angularSpeed: 3 }));
    const pts = res.charts.required_vs_provided!.points;
    // F_需 = 1·9·r = 9r
    for (const p of pts) {
      expect(Math.abs(p.y - 9 * p.x)).toBeLessThan(1e-6);
    }
  });

  it('关键点包含 "起点" 与 "终点"', () => {
    const res = model.solve(makeProblem());
    const labels = res.keyframes.map(k => k.label);
    expect(labels).toContain('起点');
    expect(labels).toContain('终点');
  });

  it('离心时关键点包含 "开始滑动"', () => {
    const res = model.solve(makeProblem({ angularSpeed: 5 }));
    const labels = res.keyframes.map(k => k.label);
    expect(labels).toContain('开始滑动 (临界)');
  });

  it('不离心时关键点包含 1/4 周等', () => {
    const res = model.solve(makeProblem({ angularSpeed: 1 }));
    const labels = res.keyframes.map(k => k.label);
    expect(labels.some(l => l.includes('周'))).toBe(true);
  });

  it('轨迹点数 = sampleCount + 1', () => {
    const res = model.solve(makeProblem({ sampleCount: 400 }));
    expect(res.trajectories[0]!.length).toBe(401);
  });

  it('静态示意图为半径 = r₀ 的圆', () => {
    const res = model.solve(makeProblem({ radius: 0.5 }));
    const pts = res.charts['static-diagram']!.points;
    expect(pts.length).toBe(128);
    for (const p of pts) {
      const dist = Math.hypot(p.x, p.y);
      expect(Math.abs(dist - 0.5)).toBeLessThan(1e-6);
    }
  });

  it('受力分析图包含 4 个力', () => {
    const res = model.solve(makeProblem());
    const fd = res.charts.force_diagram!;
    expect(fd.forces.length).toBe(4);
    const hasFriction = fd.forces.some(f => f.name.includes('摩擦'));
    const hasRequired = fd.forces.some(f => f.name.includes('需'));
    expect(hasFriction).toBe(true);
    expect(hasRequired).toBe(true);
  });

  it('conservedQuantities 在不离心时包含圆周运动守恒量', () => {
    const res = model.solve(makeProblem({ angularSpeed: 2 }));
    expect(res.diagnostics.conservedQuantities.length).toBeGreaterThanOrEqual(1);
  });

  it('自定义重力加速度 g=10', () => {
    const res = model.solve(makeProblem({ angularSpeed: 2, gravity: 10 }));
    // F_fricMax = 0.3·1·10 = 3, F_需 = 2 → 不离心
    expect(res.diagnostics.maxValues.F_fricMax).toBeCloseTo(3, 6);
  });

  it('ω=0: 不离心 (F_需=0)', () => {
    const res = model.solve(makeProblem({ angularSpeed: 0 }));
    expect(res.diagnostics.rangeCheck.warnings.length).toBe(0);
    expect(res.explanation.summary).toContain('不离心');
  });

  it('explanation 包含 5 步', () => {
    const res = model.solve(makeProblem());
    expect(res.explanation.steps.length).toBe(5);
  });

  it('无效参数抛出错误', () => {
    expect(() => model.solve(makeProblem({ mass: -1 }))).toThrow();
    expect(() => model.solve(makeProblem({ radius: -1 }))).toThrow();
    expect(() => model.solve(makeProblem({ angularSpeed: -1 }))).toThrow();
  });
});

/**辅助函数: 构造一个固定用于 omega_critical_curve 校验的问题 */
function makeProblem_omegaChart(): PhysicsProblem {
  return {
    id: 'centrifugal-test-chart',
    model: 'centrifugal',
    bodies: [{
      id: 'block',
      mass: { value: 1, unit: 'kg' },
      position: { x: 0.5, y: 0 },
      velocity: { x: 0, y: 0 },
    }],
    constraints: { centrifugal: { mass: 1, radius: 0.5, angularSpeed: 1, frictionCoeff: 0.3, gravity: 9.8 } },
    timeConfig: { duration: 2, sampleCount: 200 },
  };
}

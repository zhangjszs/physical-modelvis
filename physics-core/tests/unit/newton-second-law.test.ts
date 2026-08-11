import { describe, it, expect } from 'vitest';
import { NewtonSecondLawModel } from '../../src/models/newton-second-law.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new NewtonSecondLawModel();

/** 构造一个牛顿第二定律问题 */
function makeProblem(overrides: {
  force?: number | { x: number; y: number };
  mass?: number;
  v0x?: number;
  duration?: number;
  includeFriction?: boolean;
  friction?: number;
} = {}): PhysicsProblem {
  const { force = 10, mass = 2, v0x = 0, duration = 3, includeFriction = false, friction = 0 } = overrides;
  return {
    id: 'n2l-test',
    title: '牛顿第二定律',
    model: 'newton-second-law',
    bodies: [{
      id: 'block',
      mass: { value: mass, unit: 'kg' },
      position: { x: 0, y: 0 },
      velocity: { x: v0x, y: 0 },
    }],
    constraints: { newtonSecondLaw: { force, includeFriction } },
    environment: { ground: friction > 0 ? { enabled: true, y: 0, friction } : undefined },
    timeConfig: { duration, sampleCount: 300 },
  };
}

describe('NewtonSecondLawModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('newton-second-law');
    expect(model.name).toBe('牛顿第二定律');
    expect(model.version).toBe('1.0.0');
  });

  it('F=10N, m=2kg → a=5m/s²', () => {
    const r = model.solve(makeProblem({ force: 10, mass: 2 }));
    const a = r.diagnostics.maxValues.acceleration;
    expect(a).toBeCloseTo(5, 5);
  });

  it('v₀=0, F=10N, m=2kg, t=3s → v=15m/s, x=22.5m', () => {
    const r = model.solve(makeProblem({ force: 10, mass: 2, duration: 3 }));
    const traj = r.trajectories[0];
    const last = traj[traj.length - 1];
    expect(last.velocity.x).toBeCloseTo(15, 2);   // v = a·t = 5·3
    expect(last.position.x).toBeCloseTo(22.5, 1);  // x = ½·a·t² = ½·5·9 = 22.5
  });

  it('v₀=2m/s, F=6N, m=3kg, t=2s → v=6m/s, x=8m', () => {
    const r = model.solve(makeProblem({ force: 6, mass: 3, v0x: 2, duration: 2 }));
    const traj = r.trajectories[0];
    const last = traj[traj.length - 1];
    const a = 6 / 3; // 2 m/s²
    expect(last.velocity.x).toBeCloseTo(2 + a * 2, 3);   // v = v₀ + at = 2 + 4
    expect(last.position.x).toBeCloseTo(2 * 2 + 0.5 * a * 4, 2); // x = v₀t + ½at² = 4 + 4 = 8
  });

  it('v₀=10m/s, F=-10N, m=5kg, t=3s → 速度反向点 t=5s 不在此次区间 → 末速度 v=4m/s', () => {
    const r = model.solve(makeProblem({ force: -10, mass: 5, v0x: 10, duration: 3 }));
    const traj = r.trajectories[0];
    const last = traj[traj.length - 1];
    expect(last.velocity.x).toBeCloseTo(10 + (-2) * 3, 3); // 10 - 6 = 4
  });

  it('二维力 (Fx=6, Fy=8), m=2kg → |a|=5m/s²', () => {
    const r = model.solve(makeProblem({ force: { x: 6, y: 8 }, mass: 2 }));
    const a = r.diagnostics.maxValues.acceleration;
    expect(a).toBeCloseTo(5, 5); // √(3²+4²) = 5
  });

  it('生成轨迹点数 = sampleCount + 1', () => {
    const r = model.solve(makeProblem({ duration: 3, mass: 1 }));
    expect(r.trajectories[0].length).toBe(301);
  });

  it('生成关键帧和图表', () => {
    const r = model.solve(makeProblem({ force: 10, mass: 2 }));
    expect(r.keyframes.length).toBeGreaterThanOrEqual(2);
    expect(r.charts.x_t).toBeDefined();
    expect(r.charts.v_t).toBeDefined();
    expect(r.charts.a_t).toBeDefined();
    expect(r.charts.F_t).toBeDefined();
    expect(r.charts.force_diagram).toBeDefined();
  });

  it('受力分析图包含合外力', () => {
    const r = model.solve(makeProblem({ force: 10, mass: 2 }));
    const fd = r.charts.force_diagram!;
    expect(fd.forces.length).toBe(1);
    expect(fd.forces[0].magnitude).toBeCloseTo(10, 5);
  });

  it('a_t 图表值为常数 (恒力 → 恒加速度)', () => {
    const r = model.solve(makeProblem({ force: 10, mass: 2 }));
    const pts = r.charts.a_t!.points;
    const allSame = pts.every(p => Math.abs(p.y - 5) < 1e-9);
    expect(allSame).toBe(true);
  });

  it('速度反向点检测：v₀=10m/s, F=-10N, m=2kg → t=2s 时 v=0', () => {
    const r = model.solve(makeProblem({ force: -10, mass: 2, v0x: 10, duration: 5 }));
    const turnKf = r.keyframes.find(kf => kf.label === '速度反向点');
    expect(turnKf).toBeDefined();
    expect(turnKf!.t).toBeCloseTo(2, 2); // t = -v₀/a = -10/(-5) = 2
  });

  it('零力 → 匀速运动 (a=0)', () => {
    const r = model.solve(makeProblem({ force: 0, mass: 1, v0x: 3 }));
    const a = r.diagnostics.maxValues.acceleration;
    expect(a).toBeCloseTo(0, 10);
    const last = r.trajectories[0].at(-1)!;
    expect(last.velocity.x).toBeCloseTo(3, 5); // 匀速，速度不变
  });

  it('explanation.summary 包含核心物理量', () => {
    const r = model.solve(makeProblem({ force: 10, mass: 2 }));
    expect(r.explanation.summary).toContain('F=');
    expect(r.explanation.steps.length).toBeGreaterThanOrEqual(3);
  });

  it('有摩擦 F<μmg 且 v₀=0 → 静止不动 (a=0)', () => {
    // μ=0.2, m=2kg → fK=μmg=3.92N > F=1N → 静摩擦平衡, 物体不动
    const r = model.solve(makeProblem({ force: 1, mass: 2, includeFriction: true, friction: 0.2, duration: 3 }));
    const traj = r.trajectories[0];
    expect(r.diagnostics.maxValues.acceleration).toBeCloseTo(0, 10);
    expect(traj.at(-1)!.velocity.x).toBeCloseTo(0, 10);
    expect(traj.at(-1)!.position.x).toBeCloseTo(0, 10);
  });

  it('有摩擦 F>μmg 且 v₀=0 → a=(F-μmg)/m', () => {
    // μ=0.2, m=2kg → fK=3.92N, F=10N → a=(10-3.92)/2=3.04
    const r = model.solve(makeProblem({ force: 10, mass: 2, includeFriction: true, friction: 0.2, duration: 3 }));
    const a = r.diagnostics.maxValues.acceleration;
    expect(a).toBeCloseTo(3.04, 5);
  });

  it('有摩擦 v₀>0 减速到零后反向 → 摩擦方向翻转', () => {
    // v₀=5, F=-10, m=2, μ=0.2 → fK=3.92
    // phase1: a1=(-10-3.92)/2=-6.96, tTurn=5/6.96≈0.7184s
    // phase2: a2=(-10+3.92)/2=-3.04
    const r = model.solve(makeProblem({ force: -10, mass: 2, v0x: 5, includeFriction: true, friction: 0.2, duration: 5 }));
    const traj = r.trajectories[0];
    const a1 = (-10 - 3.92) / 2;
    const tTurn = 5 / -a1;
    const turnKf = r.keyframes.find(kf => kf.label === '速度反向点');
    expect(turnKf).toBeDefined();
    expect(turnKf!.t).toBeCloseTo(tTurn, 2);
    const vTurn = 0;
    const a2 = (-10 + 3.92) / 2;
    const vEnd = vTurn + a2 * (5 - tTurn);
    expect(traj.at(-1)!.velocity.x).toBeCloseTo(vEnd, 2);
  });
});

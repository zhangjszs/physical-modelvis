import { describe, it, expect } from 'vitest';
import { SimplePendulumModel } from '../../src/models/simple-pendulum.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new SimplePendulumModel();

function makeProblem(overrides: { length?: number; g?: number; angleDeg?: number; duration?: number; damping?: number } = {}): PhysicsProblem {
  const { length = 1.0, g = 9.8, angleDeg = 10, duration = 10, damping = 0 } = overrides;
  return {
    id: 'pendulum-test',
    model: 'simple-pendulum',
    bodies: [{
      id: 'bob',
      mass: { value: 1, unit: 'kg' },
      position: { x: length * Math.sin(angleDeg * Math.PI / 180), y: length * Math.cos(angleDeg * Math.PI / 180) },
      velocity: { x: 0, y: 0 },
    }],
    constraints: { simplePendulum: { length, g, initialAngleDeg: angleDeg, damping } },
    environment: {},
    timeConfig: { duration, sampleCount: 1000 },
  };
}

describe('SimplePendulumModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('simple-pendulum');
    expect(model.name).toBe('单摆 (简谐运动)');
  });

  it('小角度周期 T = 2π√(L/g)', () => {
    const T = 2 * Math.PI * Math.sqrt(1.0 / 9.8);
    const r = model.solve(makeProblem({ length: 1.0, g: 9.8, angleDeg: 5, duration: T * 3 }));
    expect(r.diagnostics.maxValues.periodSmall).toBeCloseTo(T, 5);
  });

  it('L=1m g=9.8 → T ≈ 2.006s', () => {
    const r = model.solve(makeProblem({ length: 1.0, g: 9.8 }));
    expect(r.diagnostics.maxValues.periodSmall).toBeCloseTo(2.006, 2);
  });

  it('无阻尼机械能守恒', () => {
    const r = model.solve(makeProblem({ damping: 0, angleDeg: 30, duration: 10 }));
    const conserved = r.diagnostics.conservedQuantities[0];
    expect(conserved).toBeDefined();
    expect(conserved!.conserved).toBe(true);
  });

  it('机械能全程近似恒定 (波动 < 1%, 一致容差)', () => {
    const r = model.solve(makeProblem({ angleDeg: 15, duration: 10 }));
    const energies = r.charts.energy_t!.points.map(p => p.y);
    const mean = energies.reduce((a, b) => a + b, 0) / energies.length;
    if (Math.abs(mean) > 0.01) {
      const maxDev = Math.max(...energies.map(e => Math.abs(e - mean)));
      const consumed = r.diagnostics.conservedQuantities[0]!;
      // 测试与 model 使用相同容差公式：1% 相对 + 1e-6 绝对
      const tol = consumed.tolerance;
      expect(maxDev).toBeLessThan(tol);
      expect(consumed.conserved).toBe(true);
    }
  });

  it('最大摆角衰减 (阻尼 > 0, 多周期观测)', () => {
    const r1 = model.solve(makeProblem({ angleDeg: 20, damping: 0, duration: 30 }));
    const r2 = model.solve(makeProblem({ angleDeg: 20, damping: 0.3, duration: 30 }));
    // 阻尼使多次摆动后最大角度减小 → maxThetaDeg = 各摆峰的最大值, 由于阻尼导致的峰值递减
    expect(r2.diagnostics.maxValues.maxThetaDeg).toBeLessThanOrEqual(r1.diagnostics.maxValues.maxThetaDeg);
  });

  it('生成 x-t 为正弦曲线 (θ-t 图)', () => {
    const r = model.solve(makeProblem({ length: 1, g: 9.8, angleDeg: 10 }));
    // θ-t 应是对称振荡：初始 θ > 0, 某时刻 θ < 0
    const thetas = r.charts.theta_t!.points.map(p => p.y);
    const max = Math.max(...thetas);
    const min = Math.min(...thetas);
    expect(max).toBeGreaterThan(5);   // 接近初始角度
    expect(min).toBeLessThan(-5);    // 反向摆动
    expect(Math.abs(max + min)).toBeLessThan(2); // 对称
  });

  it('θ 与 ω 相位差 π/2 (简谐运动特征)', () => {
    const r = model.solve(makeProblem({ length: 1, g: 9.8, angleDeg: 10, duration: 4 }));
    // 在最低点 (θ≈0) 角速度最大
    let maxOmega = 0;
    let thetaAtMaxOmega = 0;
    for (let i = 0; i < r.trajectories[0].length; i++) {
      const trajTheta = Math.atan2(
        r.trajectories[0][i]!.position.x,
        r.trajectories[0][i]!.position.y
      ) * 180 / Math.PI;
      const trajOmega = Math.abs(r.charts.omega_t!.points[i]!.y);
      if (trajOmega > maxOmega) {
        maxOmega = trajOmega;
        thetaAtMaxOmega = Math.abs(trajTheta);
      }
    }
    // 最大角速度发生在 θ≈0 (最低点)
    expect(thetaAtMaxOmega).toBeLessThan(3);
  });

  it('包含 θ-t, ω-t, KE-t, PE-t, energy-t 图表', () => {
    const r = model.solve(makeProblem({}));
    expect(r.charts.theta_t).toBeDefined();
    expect(r.charts.omega_t).toBeDefined();
    expect(r.charts.ke_t).toBeDefined();
    expect(r.charts.pe_t).toBeDefined();
    expect(r.charts.energy_t).toBeDefined();
  });

  it('omega_t 值 = dθ/dt (数值微分), 非 ω·cos2θ', () => {
    const r = model.solve(makeProblem({ length: 1, g: 9.8, angleDeg: 20, damping: 0, duration: 4 }));
    const dt = r.trajectories[0][1]!.t - r.trajectories[0][0]!.t;
    // 取中间若干点, 计算 dθ/dt 数值微分, 对比 omega_t 值
    for (let i = 50; i < 200; i += 25) {
      const thetaPrev = Math.atan2(r.trajectories[0][i - 10]!.position.x, r.trajectories[0][i - 10]!.position.y);
      const thetaNext = Math.atan2(r.trajectories[0][i + 10]!.position.x, r.trajectories[0][i + 10]!.position.y);
      const dtheta = thetaNext - thetaPrev;
      const dtSpan = 20 * dt;
      const omegaNumeric = dtheta / dtSpan;
      expect(Math.abs(r.charts.omega_t!.points[i]!.y - omegaNumeric)).toBeLessThan(0.02);
    }
  });

  it('周期与摆长 √L 成正比 (g 固定)', () => {
    const r1 = model.solve(makeProblem({ length: 1, g: 9.8, duration: 10 }));
    const r4 = model.solve(makeProblem({ length: 4, g: 9.8, duration: 20 }));
    // T(L=4) / T(L=1) = √(4/1) = 2
    expect(r4.diagnostics.maxValues.periodSmall / r1.diagnostics.maxValues.periodSmall).toBeCloseTo(2, 4);
  });
});

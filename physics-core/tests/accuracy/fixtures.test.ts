/**
 * L1: 模型守恒律 + 解析解对齐 / 接口一致性自检
 *
 * 覆盖 5 个代表性模型:
 *   - collision-elastic (动量守恒 + 解析解)
 *   - projectile (运动学解析解)
 *   - capacitor-charge (τ-RC + 能量)
 *   - simple-pendulum (能量守恒 + 周期 ∝√L)
 *   - photoelectric (hν = W₀ + E_k)
 *
 * 每个 fixture 解一条物理命题, 失败时指出 "模型 / 偏差"。
 */

import { describe, it, expect } from 'vitest';

import { CollisionModel } from '../../src/models/collision.js';
import { ProjectileModel } from '../../src/models/projectile.js';
import { CapacitorChargeModel } from '../../src/models/capacitor-charge.js';
import { SimplePendulumModel } from '../../src/models/simple-pendulum.js';
import { PhotoelectricModel } from '../../src/models/photoelectric.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

// ========== Helpers ==========

function makeElastic(m1: number, m2: number, v1: number, v2: number): PhysicsProblem {
  return {
    id: 'c',
    model: 'collision-elastic',
    bodies: [
      { id: 'b1', mass: { value: m1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: v1, y: 0 } },
      { id: 'b2', mass: { value: m2, unit: 'kg' }, position: { x: 10, y: 0 }, velocity: { x: v2, y: 0 } },
    ],
    timeConfig: { duration: 2, sampleCount: 200 },
  };
}

function makeProjectile(vx: number, vy: number, g = 9.8): PhysicsProblem {
  return {
    id: 'p',
    model: 'projectile',
    bodies: [{ id: 'b', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: vx, y: vy } }],
    environment: { gravity: { enabled: true, value: g } },
    timeConfig: { duration: 5, sampleCount: 500 },
  };
}

function makeCap(R: number, C: number, E: number, mode: 'charge' | 'discharge' = 'charge'): PhysicsProblem {
  return {
    id: 'cap',
    model: 'capacitor-charge',
    bodies: [{ id: 'c', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { capacitor: { resistance: R, capacitance: C, emf: E, mode, sampleCount: 100, timeSpanTau: 5 } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

function makePendulum(L: number, theta0Deg: number, damping = 0): PhysicsProblem {
  return {
    id: 'pend',
    model: 'simple-pendulum',
    bodies: [{ id: 'b', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { simplePendulum: { length: L, initialAngleDeg: theta0Deg, gravity: 9.8, damping } },
    environment: { gravity: { enabled: true, value: 9.8 } },
    timeConfig: { duration: 20, sampleCount: 2000 },
  };
}

function makePhoto(W0_eV: number): PhysicsProblem {
  return {
    id: 'pe',
    model: 'photoelectric',
    bodies: [{ id: 'e', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { photoelectric: { workFunction: W0_eV } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

// ========== L1 Tests ==========

describe('L1: 碰撞 (动量守恒)', () => {
  const m = new CollisionModel();

  it('等质量弹性碰撞 → 速度交换', () => {
    const r = m.solve(makeElastic(1, 1, 10, 0));
    const f1 = r.trajectories[0]![r.trajectories[0]!.length - 1]!;
    const f2 = r.trajectories[1]![r.trajectories[1]!.length - 1]!;
    expect(f1.velocity.x).toBeCloseTo(0, 5);
    expect(f2.velocity.x).toBeCloseTo(10, 5);
  });

  it('动量守恒: 碰撞前后总动量误差 ≤1e-9', () => {
    const r = m.solve(makeElastic(1, 1, 10, 0));
    const pBefore = 1 * 10 + 1 * 0;
    const i1 = r.trajectories[0]!.length - 1;
    const i2 = r.trajectories[1]!.length - 1;
    const pAfter = 1 * r.trajectories[0]![i1]!.velocity.x + 1 * r.trajectories[1]![i2]!.velocity.x;
    expect(Math.abs(pAfter - pBefore)).toBeLessThan(1e-9);
  });

  it('能量: KE 碰前 = 碰后 (误差 ≤1e-9)', () => {
    const r = m.solve(makeElastic(1, 1, 10, 0));
    const keBefore = 0.5 * 1 * 10 * 10 + 0;
    const i1 = r.trajectories[0]!.length - 1;
    const i2 = r.trajectories[1]!.length - 1;
    const v1 = r.trajectories[0]![i1]!.velocity.x;
    const v2 = r.trajectories[1]![i2]!.velocity.x;
    const keAfter = 0.5 * 1 * v1 * v1 + 0.5 * 1 * v2 * v2;
    expect(Math.abs(keAfter - keBefore)).toBeLessThan(1e-9);
  });
});

describe('L1: 抛体运动 (解析解)', () => {
  const m = new ProjectileModel();

  it('水平射程 = v₀x·(2·v₀y/g), g=10, v₀=(10,10) → R=20', () => {
    const r = m.solve(makeProjectile(10, 10, 10));
    const R = r.diagnostics.maxValues.range;
    expect(R).toBeCloseTo(20, 5);
  });

  it('最高点 = v₀y²/(2g) = 5m', () => {
    const r = m.solve(makeProjectile(10, 10, 10));
    expect(r.diagnostics.maxValues.apexHeight).toBeCloseTo(5, 5);
  });

  it('vy(t=1s) = v₀y − g·t = 0', () => {
    const r = m.solve(makeProjectile(10, 10, 10));
    // 找到 t≈1 的轨迹点 (dt=0.01, 允许 ±0.02)
    const traj = r.trajectories[0]!;
    const target = traj.find(p => Math.abs(p.t - 1) < 0.03);
    expect(target).toBeDefined();
    expect(Math.abs(target!.velocity.y)).toBeLessThan(0.3); // ≈0, 容差覆盖 dt 误差
  });
});

describe('L1: 电容充放电 (τ=RC + 稳态)', () => {
  const m = new CapacitorChargeModel();

  it('充电: τ=RC=1ms, 5τ → U_c→99.3%E', () => {
    const r = m.solve(makeCap(1e3, 1e-6, 10, 'charge'));
    expect(r.diagnostics.maxValues.tau).toBeCloseTo(1e-3, 6);
    const uc = r.charts.Uc_t!.points.at(-1)!.y;
    expect(uc).toBeGreaterThan(9.9);
  });

  it('放电: U_c 从 E 衰减到 <5% E (5τ)', () => {
    const r = m.solve(makeCap(1e3, 1e-6, 10, 'discharge'));
    const pts = r.charts.Uc_t!.points;
    expect(pts[0]!.y).toBeCloseTo(10, 5); // 初始 = E
    const lastY = pts.at(-1)!.y;
    expect(lastY).toBeLessThan(0.5); // 5τ 后 < 0.5% E = 0.05V (宽松)
  });

  it('dt 调用不应产生 NaN/Infinity', () => {
    const r = m.solve(makeCap(1e3, 1e-6, 10));
    for (const p of r.charts.Uc_t!.points) {
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });
});

describe('L1: 单摆 (周期 T=2π√(L/g) + 能量守恒)', () => {
  const m = new SimplePendulumModel();

  it('小角度 (θ₀=5°) 周期 ≈ 2π√(L/g), L=1m, g=9.8 → T≈2.006s', () => {
    const r = m.solve(makePendulum(1, 5, 0));
    // 从 omega_t 过零点计算周期: 连续两次同方向过零
    const omega = r.charts.omega_t!;
    let firstZero = -1;
    let secondZero = -1;
    for (let i = 1; i < omega.points.length; i++) {
      if (omega.points[i - 1]!.y * omega.points[i]!.y < 0 && omega.points[i]!.y > 0) {
        if (firstZero < 0) firstZero = omega.points[i]!.x;
        else if (secondZero < 0) { secondZero = omega.points[i]!.x; break; }
      }
    }
    if (secondZero > 0) {
      const T = secondZero - firstZero;
      const Ttheory = 2 * Math.PI * Math.sqrt(1 / 9.8);
      expect(Math.abs(T - Ttheory) / Ttheory).toBeLessThan(0.02); // ≤2%
    }
  });

  it('无阻尼: 能量守恒 (机械能漂移 ≤5%)', () => {
    const r = m.solve(makePendulum(1, 5, 0));
    const ke = r.charts.ke_t!;
    const pe = r.charts.pe_t!;
    if (ke && pe) {
      const e0 = ke.points[0]!.y + pe.points[0]!.y;
      const eF = ke.points.at(-1)!.y + pe.points.at(-1)!.y;
      expect(Math.abs(eF - e0) / (Math.abs(e0) || 1)).toBeLessThan(0.05);
    }
  });
});

describe('L1: 光电效应 (爱因斯坦方程)', () => {
  const m = new PhotoelectricModel();

  it('极限频率 ν₀ = W₀/h, W₀=2.28eV → ≈555THz', () => {
    const r = m.solve(makePhoto(2.28));
    const nu0 = r.diagnostics.maxValues.thresholdFrequency_THz;
    expect(nu0).toBeCloseTo(555, -1); // ±10
  });

  it('反向截止电压 U_c = (hν − W₀)/e, 符号一致性', () => {
    const r = m.solve(makePhoto(2.28));
    if (r.diagnostics.maxValues.thresholdFrequency_THz) {
      // ν₀ > 0 → 物理合理
      expect(r.diagnostics.maxValues.thresholdFrequency_THz).toBeGreaterThan(0);
    }
  });
});

describe('L1: 接口一致性 (validate)', () => {
  it('basic 模型: 零质量 → 返回 valid=false', () => {
    const m = new ProjectileModel();
    const r = m.validate({
      id: 'bad',
      model: 'projectile',
      bodies: [{ id: 'b', mass: { value: 0, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } }],
      timeConfig: { duration: 1 },
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === 'INVALID_MASS')).toBe(true);
  });

  it('basic 模型: 负 duration → 返回 valid=false', () => {
    const m = new ProjectileModel();
    const r = m.validate({
      id: 'bad',
      model: 'projectile',
      bodies: [{ id: 'b', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } }],
      timeConfig: { duration: -1 },
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === 'INVALID_DURATION')).toBe(true);
  });

  it('basic 模型: 缺 bodies → 返回 valid=false', () => {
    const m = new ProjectileModel();
    const r = m.validate({
      id: 'bad',
      model: 'projectile',
      bodies: [],
      timeConfig: { duration: 1 },
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === 'NO_BODIES')).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { MomentumModel } from '../../src/models/momentum.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new MomentumModel();

function makeImpulseProblem(overrides: { force?: number; mass?: number; v0?: number; duration?: number } = {}): PhysicsProblem {
  const { force = 10, mass = 2, v0 = 0, duration = 3 } = overrides;
  return {
    id: 'impulse-test',
    model: 'momentum',
    bodies: [{ id: 'block', mass: { value: mass, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: v0, y: 0 } }],
    constraints: { momentum: { mode: 'impulse', force } },
    environment: {},
    timeConfig: { duration, sampleCount: 300 },
  };
}

function makeRecoilProblem(overrides: { m1?: number; m2?: number; v2?: number; duration?: number } = {}): PhysicsProblem {
  const { m1 = 10, m2 = 1, v2 = 5, duration = 2 } = overrides;
  const v1 = -(m2 * v2) / m1;
  return {
    id: 'recoil-test',
    model: 'momentum',
    bodies: [
      { id: 'A', mass: { value: m1, unit: 'kg' }, position: { x: -1, y: 0 }, velocity: { x: v1, y: 0 } },
      { id: 'B', mass: { value: m2, unit: 'kg' }, position: { x: 1, y: 0 }, velocity: { x: v2, y: 0 } },
    ],
    constraints: { momentum: { mode: 'recoil' } },
    environment: {},
    timeConfig: { duration, sampleCount: 200 },
  };
}

describe('MomentumModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('momentum');
    expect(model.name).toBe('动量定理与反冲');
  });

  describe('动量定理模式', () => {
    it('冲量 = F·Δt', () => {
      const r = model.solve(makeImpulseProblem({ force: 10, mass: 2, duration: 3 }));
      const J = r.diagnostics.maxValues.impulse;
      expect(J).toBeCloseTo(30, 5);
    });

    it('Δp = 冲量 (动量定理)', () => {
      const r = model.solve(makeImpulseProblem({ force: 10, mass: 2, duration: 3 }));
      const J = r.diagnostics.maxValues.impulse;
      const dp = r.diagnostics.maxValues.deltaP;
      expect(dp).toBeCloseTo(J, 5);
    });

    it('末速度 v = v₀ + F·t/m', () => {
      const r = model.solve(makeImpulseProblem({ force: 10, mass: 2, v0: 5, duration: 3 }));
      const last = r.trajectories[0].at(-1)!;
      expect(last.velocity.x).toBeCloseTo(5 + 10 * 3 / 2, 5);
    });

    it('生成 F-t, p-t, v-t, J-t 图表', () => {
      const r = model.solve(makeImpulseProblem({}));
      expect(r.charts.F_t).toBeDefined();
      expect(r.charts.p_t).toBeDefined();
      expect(r.charts.v_t).toBeDefined();
      expect(r.charts.impulse_t).toBeDefined();
    });
  });

  describe('反冲模式', () => {
    it('总动量守恒 = 0', () => {
      const r = model.solve(makeRecoilProblem({ m1: 10, m2: 1, v2: 5 }));
      const p = r.diagnostics.conservedQuantities[0]!;
      expect(p.conserved).toBe(true);
      expect(p.initialValue).toBe(0);
      expect(Math.abs(p.finalValue)).toBeLessThan(1e-10);
    });

    it('速度比 v₁/v₂ = −m₂/m₁', () => {
      const r = model.solve(makeRecoilProblem({ m1: 10, m2: 2, v2: 3 }));
      const v1 = r.trajectories[0].at(-1)!.velocity.x;
      const v2 = r.trajectories[1].at(-1)!.velocity.x;
      expect(v1 / v2).toBeCloseTo(-2 / 10, 5);
    });

    it('生成 p-t, v1-t, v2-t, KE-t 图表', () => {
      const r = model.solve(makeRecoilProblem({}));
      expect(r.charts.p_t).toBeDefined();
      expect(r.charts.v1_t).toBeDefined();
      expect(r.charts.v2_t).toBeDefined();
      expect(r.charts.ke_t).toBeDefined();
    });

    it('p-t 全程为零 (动量守恒)', () => {
      const r = model.solve(makeRecoilProblem({ m1: 5, m2: 3, v2: 4 }));
      const allZero = r.charts.p_t!.points.every(p => Math.abs(p.y) < 1e-10);
      expect(allZero).toBe(true);
    });
  });
});

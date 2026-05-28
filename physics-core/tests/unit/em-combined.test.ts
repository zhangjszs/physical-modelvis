import { describe, it, expect } from 'vitest';
import { EMCombinedFieldModel } from '../../src/models/em-combined-field.js';
import { Vec2 } from '../../src/math/vector2d.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new EMCombinedFieldModel();

function makeEMProblem(overrides: Partial<{
  q: number; m: number; Ex: number; Ey: number; Bz: number;
  x0: { x: number; y: number }; v0: { x: number; y: number };
  duration: number; samples: number;
}> = {}): PhysicsProblem {
  const {
    q = 1.6e-19, m = 9.1e-31, Ex = 0, Ey = 100, Bz = 0.01,
    x0 = { x: 0, y: 0 }, v0 = { x: 1e4, y: 0 },
    duration = 1e-6, samples = 500,
  } = overrides;
  return {
    id: 'em-test',
    model: 'em-combined-field',
    bodies: [{
      id: 'electron',
      mass: { value: m, unit: 'kg' },
      charge: { value: q, unit: 'C' },
      position: x0,
      velocity: v0,
    }],
    environment: {
      electricField: { enabled: true, fieldVector: { x: Ex, y: Ey } },
      magneticField: { enabled: true, fieldStrength: Bz },
    },
    timeConfig: { duration, sampleCount: samples },
  };
}

describe('EMCombinedFieldModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('em-combined-field');
    expect(model.name).toBe('电磁复合场');
  });

  it('纯电场 (B=0): 抛物线运动', () => {
    const q = 1, m = 1, Ey = 10;
    const result = model.solve(makeEMProblem({ q, m, Ey, Bz: 0, v0: { x: 1, y: 0 }, duration: 1, samples: 100 }));
    // 竖直方向匀加速: y = 0.5 * (q*Ey/m) * t^2
    const ay = (q * Ey) / m;
    const lastPt = result.trajectories[0][result.trajectories[0].length - 1];
    expect(lastPt.position.y).toBeCloseTo(0.5 * ay * 1 * 1, 1);
    expect(result.meta.solver).toBe('numerical');
  });

  it('纯磁场 (E=0): 匀速圆周运动', () => {
    const q = 1, m = 1, Bz = 1, v0x = 1;
    const result = model.solve(makeEMProblem({ q, m, Ex: 0, Ey: 0, Bz, v0: { x: v0x, y: 0 }, duration: 2 * Math.PI, samples: 1000 }));
    // 回旋周期 T = 2*pi*m / (|q|*B) = 2*pi
    // After one period, particle should return to start
    const lastPt = result.trajectories[0][result.trajectories[0].length - 1];
    expect(lastPt.position.x).toBeCloseTo(0, 0);
    expect(lastPt.position.y).toBeCloseTo(0, 0);
    // Speed should be constant (magnetic force does no work)
    const speeds = result.trajectories[0].map(p => Vec2.magnitude(p.velocity));
    for (const s of speeds) {
      expect(s).toBeCloseTo(v0x, 3);
    }
  });

  it('速度选择器: v = E/B 时直线运动', () => {
    const Ey = 100, Bz = 0.05;
    const vSelector = Ey / Bz; // 2000 m/s
    const result = model.solve(makeEMProblem({
      Ey, Bz, Ex: 0, q: 1, m: 1,
      v0: { x: vSelector, y: 0 },
      duration: 1, samples: 200,
    }));
    // All points should have y ≈ 0
    for (const pt of result.trajectories[0]) {
      expect(pt.position.y).toBeCloseTo(0, 0);
    }
    expect(result.meta.solver).toBe('analytical');
  });

  it('速度选择器: v != E/B 时偏转', () => {
    const Ey = 100, Bz = 0.05;
    const vWrong = 1000; // not equal to E/B = 2000
    const result = model.solve(makeEMProblem({
      Ey, Bz, Ex: 0, q: 1, m: 1,
      v0: { x: vWrong, y: 0 },
      duration: 0.01, samples: 200,
    }));
    // Should have non-zero y displacement
    const lastPt = result.trajectories[0][result.trajectories[0].length - 1];
    expect(Math.abs(lastPt.position.y)).toBeGreaterThan(0.001);
  });

  it('动能守恒 (纯磁场): 磁场力不做功', () => {
    const q = 1, m = 1, Bz = 2;
    const result = model.solve(makeEMProblem({
      q, m, Ex: 0, Ey: 0, Bz,
      v0: { x: 3, y: 4 }, // speed = 5
      duration: Math.PI, samples: 500,
    }));
    const ke0 = result.trajectories[0][0].kineticEnergy!;
    for (const pt of result.trajectories[0]) {
      expect(pt.kineticEnergy!).toBeCloseTo(ke0, 1);
    }
  });

  it('复合场: 总能量（动能+电势能）近似守恒', () => {
    const result = model.solve(makeEMProblem({
      q: 1, m: 1, Ey: 50, Bz: 0.1,
      v0: { x: 100, y: 0 },
      duration: 0.05, samples: 2000,
    }));
    const conserved = result.diagnostics.conservedQuantities[0];
    expect(conserved.name).toContain('总能量');
    // Boris should conserve energy reasonably well
    expect(conserved.maxDeviation).toBeLessThan(0.05);
  });

  it('输出包含完整图表数据', () => {
    const result = model.solve(makeEMProblem({ duration: 1e-6, samples: 100 }));
    expect(result.charts.x_t).toBeDefined();
    expect(result.charts.y_t).toBeDefined();
    expect(result.charts.v_t).toBeDefined();
    expect(result.charts.energy_t).toBeDefined();
    expect(result.charts.x_t!.points.length).toBe(101);
  });

  it('关键帧包含起始点和终点', () => {
    const result = model.solve(makeEMProblem());
    const labels = result.keyframes.map(k => k.label);
    expect(labels).toContain('起始点');
    expect(labels).toContain('终点');
  });

  it('校验失败: 质量为零', () => {
    const badProblem: PhysicsProblem = {
      id: 'bad', model: 'em-combined-field',
      bodies: [{ id: 'b1', mass: { value: 0, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } }],
      environment: {
        electricField: { enabled: true, fieldVector: { x: 0, y: 100 } },
        magneticField: { enabled: true, fieldStrength: 0.01 },
      },
      timeConfig: { duration: 1 },
    };
    const v = model.validate(badProblem);
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.code === 'INVALID_MASS')).toBe(true);
  });

  it('校验失败: 模型类型不匹配', () => {
    const badProblem: PhysicsProblem = {
      id: 'bad', model: 'uniform-electric-field',
      bodies: [{ id: 'b1', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } }],
      timeConfig: { duration: 1 },
    };
    const v = model.validate(badProblem);
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.code === 'MODEL_MISMATCH')).toBe(true);
  });

  it('回旋半径 R = mv/(|q|B)', () => {
    const q = 1, m = 1, Bz = 1, v = 5;
    const R = (m * v) / (Math.abs(q) * Math.abs(Bz)); // 5
    const result = model.solve(makeEMProblem({
      q, m, Ex: 0, Ey: 0, Bz,
      v0: { x: v, y: 0 },
      duration: 2 * Math.PI, samples: 2000,
    }));
    // Particle starts at origin with v=(v,0), center at (0,-R)
    // Max distance from origin during orbit = 2R (diametrically opposite)
    const maxDistFromOrigin = Math.max(
      ...result.trajectories[0].map(p => Vec2.magnitude(p.position)),
    );
    expect(maxDistFromOrigin).toBeCloseTo(2 * R, 0);
  });
});

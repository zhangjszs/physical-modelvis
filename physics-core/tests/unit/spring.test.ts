import { describe, it, expect } from 'vitest';
import { SpringOscillatorModel } from '../../src/models/spring-oscillator.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new SpringOscillatorModel();

function makeSpringProblem(overrides: Partial<{
  x0: number; v0: number; k: number; m: number; L0: number;
  damping: number; duration: number; samples: number;
}> = {}): PhysicsProblem {
  const { x0 = 0.1, v0 = 0, k = 10, m = 1, L0 = 1, damping = 0, duration = 2, samples = 500 } = overrides;
  return {
    id: 'spring-test',
    model: 'spring-oscillator',
    bodies: [{
      id: 'block',
      mass: { value: m, unit: 'kg' },
      position: { x: L0 + x0, y: 0 },  // displaced from anchor along x
      velocity: { x: v0, y: 0 },
    }],
    constraints: {
      spring: { springConstant: k, naturalLength: L0, anchorPoint: { x: 0, y: 0 } },
    },
    environment: damping > 0
      ? { airResistance: { enabled: true, coefficient: damping } }
      : undefined,
    timeConfig: { duration, sampleCount: samples },
  };
}

describe('SpringOscillatorModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('spring-oscillator');
    expect(model.name).toBe('弹簧振子');
  });

  it('无阻尼简谐运动: 位移遵循 x(t) = A*cos(ωt)', () => {
    const k = 4, m = 1, x0 = 0.5; // ω = 2
    const result = model.solve(makeSpringProblem({ k, m, x0, v0: 0, duration: Math.PI, samples: 1000 }));
    const omega = Math.sqrt(k / m);
    const T = 2 * Math.PI / omega;

    // 在 t=T 时应回到初始位移
    const tFullPeriod = result.trajectories[0].find(p => Math.abs(p.t - T) < 0.01);
    expect(tFullPeriod).toBeDefined();
    const dispAtT = tFullPeriod!.position.x - 1; // subtract L0
    expect(dispAtT).toBeCloseTo(x0, 1);

    // 在 t=T/2 时位移应为 -x0
    const halfPeriod = result.trajectories[0].find(p => Math.abs(p.t - T / 2) < 0.01);
    expect(halfPeriod).toBeDefined();
    const dispAtHalfT = halfPeriod!.position.x - 1;
    expect(dispAtHalfT).toBeCloseTo(-x0, 1);
  });

  it('无阻尼: 周期 T = 2π√(m/k)', () => {
    const k = 100, m = 4;
    const T_expected = 2 * Math.PI * Math.sqrt(m / k);
    const result = model.solve(makeSpringProblem({ k, m, x0: 0.1, duration: T_expected * 2, samples: 2000 }));

    // 找到位移从正变负的过零点 (第一个应该是 ~T/4)
    const pts = result.trajectories[0];
    let firstZeroCrossing = -1;
    for (let i = 1; i < pts.length; i++) {
      const prevDisp = pts[i - 1].position.x - 1;
      const curDisp = pts[i].position.x - 1;
      if (prevDisp > 0 && curDisp <= 0) {
        firstZeroCrossing = pts[i].t;
        break;
      }
    }
    expect(firstZeroCrossing).toBeCloseTo(T_expected / 4, 1);
  });

  it('无阻尼: 机械能守恒', () => {
    const result = model.solve(makeSpringProblem({ k: 20, m: 2, x0: 0.3, duration: 3, samples: 500 }));
    const energies = result.trajectories[0].map(p => (p.kineticEnergy ?? 0) + (p.potentialEnergy ?? 0));
    const E0 = energies[0];
    for (const E of energies) {
      expect(E).toBeCloseTo(E0, 2);
    }
    // 诊断中应标记为守恒
    const conserved = result.diagnostics.conservedQuantities.find(q => q.name === '机械能');
    expect(conserved).toBeDefined();
    expect(conserved!.conserved).toBe(true);
  });

  it('纯初速度激励 (x0=0): 振幅 = v0/ω', () => {
    const k = 9, m = 1, v0 = 1.5; // ω = 3, A = 0.5
    const result = model.solve(makeSpringProblem({ k, m, x0: 0, v0, duration: 4, samples: 1000 }));
    const maxDisp = result.diagnostics.maxValues.maxDisplacement;
    expect(maxDisp).toBeCloseTo(v0 / Math.sqrt(k / m), 1);
  });

  it('阻尼振动: 振幅随时间衰减', () => {
    const damping = 0.5;
    const result = model.solve(makeSpringProblem({ k: 10, m: 1, x0: 0.5, damping, duration: 10, samples: 2000 }));
    const pts = result.trajectories[0];

    // 前半段和后半段的最大位移
    const mid = Math.floor(pts.length / 2);
    const firstHalfMax = Math.max(...pts.slice(0, mid).map(p => Math.abs(p.position.x - 1)));
    const secondHalfMax = Math.max(...pts.slice(mid).map(p => Math.abs(p.position.x - 1)));
    expect(secondHalfMax).toBeLessThan(firstHalfMax);
  });

  it('阻尼振动: 机械能不守恒', () => {
    const result = model.solve(makeSpringProblem({ k: 10, m: 1, x0: 0.5, damping: 0.3, duration: 5, samples: 500 }));
    const energies = result.trajectories[0].map(p => (p.kineticEnergy ?? 0) + (p.potentialEnergy ?? 0));
    // 能量应单调递减 (总体趋势)
    const firstE = energies[0];
    const lastE = energies[energies.length - 1];
    expect(lastE).toBeLessThan(firstE);
  });

  it('输出包含完整图表数据', () => {
    const result = model.solve(makeSpringProblem({ duration: 1, samples: 100 }));
    expect(result.charts.x_t).toBeDefined();
    expect(result.charts.v_t).toBeDefined();
    expect(result.charts.energy_t).toBeDefined();
    expect(result.charts.x_t!.points.length).toBe(101);
  });

  it('关键帧包含起始点和终点', () => {
    const result = model.solve(makeSpringProblem());
    const labels = result.keyframes.map(k => k.label);
    expect(labels).toContain('起始点');
    expect(labels).toContain('终点');
  });

  it('校验失败: 缺少弹簧约束', () => {
    const badProblem: PhysicsProblem = {
      id: 'bad', model: 'spring-oscillator',
      bodies: [{ id: 'b1', mass: { value: 1, unit: 'kg' }, position: { x: 1, y: 0 }, velocity: { x: 0, y: 0 } }],
      timeConfig: { duration: 1 },
    };
    expect(() => model.solve(badProblem)).toThrow();
  });

  it('校验失败: 质量为零', () => {
    const problem: PhysicsProblem = {
      id: 'bad', model: 'spring-oscillator',
      bodies: [{ id: 'b1', mass: { value: 0, unit: 'kg' }, position: { x: 1, y: 0 }, velocity: { x: 0, y: 0 } }],
      constraints: { spring: { springConstant: 10, naturalLength: 1, anchorPoint: { x: 0, y: 0 } } },
      timeConfig: { duration: 1 },
    };
    const v = model.validate(problem);
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.code === 'INVALID_MASS')).toBe(true);
  });
});

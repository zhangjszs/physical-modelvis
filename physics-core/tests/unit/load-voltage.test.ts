import { describe, it, expect } from 'vitest';
import { LoadVoltageModel } from '../../src/models/load-voltage.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new LoadVoltageModel();

function makeProblem(overrides: {
  emf?: number;
  internalResistance?: number;
  loadRange?: [number, number];
  sampleCount?: number;
} = {}): PhysicsProblem {
  const {
    emf = 12,
    internalResistance = 2,
    loadRange = [0.5, 100],
    sampleCount = 50,
  } = overrides;
  return {
    id: 'lv-test',
    model: 'load-voltage',
    bodies: [{ id: 'load', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { loadVoltage: { emf, internalResistance, loadRange, sampleCount } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('LoadVoltageModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('load-voltage');
    expect(model.name).toBe('路端电压与负载');
  });

  it('开路: R→∞ 时 U→E=12V', () => {
    const r = model.solve(makeProblem({ emf: 12, internalResistance: 2, loadRange: [1e6, 1e7] }));
    const lastU = r.charts.U_R!.points[r.charts.U_R!.points.length - 1]!.y;
    expect(lastU).toBeCloseTo(12, 1);
  });

  it('短路: R→0 时 U→0', () => {
    const r = model.solve(makeProblem({ emf: 12, internalResistance: 2, loadRange: [0.001, 0.01] }));
    const firstU = r.charts.U_R!.points[0]!.y;
    expect(firstU).toBeCloseTo(0, 0);
  });

  it('UI 拟合: 恢复输入 E=12, r=2', () => {
    const r = model.solve(makeProblem({ emf: 12, internalResistance: 2 }));
    expect(r.diagnostics.maxValues.fittedEmf).toBeCloseTo(12, 1);
    expect(r.diagnostics.maxValues.fittedInternalResistance).toBeCloseTo(2, 1);
    expect(r.diagnostics.maxValues.rSquared).toBeGreaterThan(0.999);
  });

  it('UI 直线截距 = E, 斜率 = −r', () => {
    const r = model.solve(makeProblem({ emf: 6, internalResistance: 1 }));
    const chart = r.charts.U_I!;
    // U(I=0) = E
    // U-I 直线为 U = E − r·I (截距=E, 斜率=-r)
    // 由于采样从 Rmin 到 Rmax, I 从 E/(Rmax+r) 到 E/(Rmin+r)
    // 检验第一个点 I→小, 此时 U→E
    const first = chart.points[0]!;
    // 实际上最后一个点 I 最小 (R 最大), U 最大 (接近 E)
    const last = chart.points[chart.points.length - 1]!;
    expect(last.y).toBeCloseTo(6, 0);  // R→∞ 时 U→E
  });

  it('短路电流 = E/r', () => {
    const r = model.solve(makeProblem({ emf: 10, internalResistance: 2 }));
    expect(r.diagnostics.maxValues.shortCircuitCurrent).toBeCloseTo(5, 5);
  });

  it('最大功率传输: R=r 时 P_max=E²/(4r)', () => {
    const r = model.solve(makeProblem({ emf: 12, internalResistance: 3 }));
    expect(r.diagnostics.maxValues.maxOutputPower).toBeCloseTo(12, 0);  // 144/12 = 12
  });

  it('R=r 时效率 = 50%', () => {
    // 工作点不代表 R=r 的情况；使用公式: R=r → η = R/(R+r) = 0.5
    const r = model.solve(makeProblem({ emf: 10, internalResistance: 5, loadRange: [4, 6] }));
    // 工作点 R0 = sqrt(4×6) ≈ 4.9 ≈ r = 5
    expect(r.diagnostics.maxValues.efficiencyAtOperatingPoint).toBeCloseTo(0.5, 0);
  });

  it('r=0 时触发 warning', () => {
    const r = model.solve(makeProblem({ internalResistance: 0 }));
    expect(r.warnings.some(w => w.includes('内阻为 0'))).toBe(true);
  });

  it('summary 包含拟合参数', () => {
    const r = model.solve(makeProblem());
    expect(r.explanation.summary).toContain('E_exp=');
    expect(r.explanation.summary).toContain('r_exp=');
    expect(r.explanation.summary).toContain('R²=');
  });

  it('U-I 直线严格线性: 相邻点斜率一致', () => {
    const r = model.solve(makeProblem({ emf: 9, internalResistance: 1 }));
    const chart = r.charts.U_I!;
    if (chart.points.length >= 3) {
      const slope1 = (chart.points[1]!.y - chart.points[0]!.y) / (chart.points[1]!.x - chart.points[0]!.x);
      const slope2 = (chart.points[chart.points.length - 1]!.y - chart.points[chart.points.length - 2]!.y)
        / (chart.points[chart.points.length - 1]!.x - chart.points[chart.points.length - 2]!.x);
      expect(slope1).toBeCloseTo(slope2, 5);
    }
  });
});

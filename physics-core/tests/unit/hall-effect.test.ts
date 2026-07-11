import { describe, it, expect } from 'vitest';
import type { PhysicsProblem, HallEffectConstraint } from '../../src/types/problem.js';
import { HallEffectModel } from '../../src/models/hall-effect.js';

// 元电荷, 与模型内联常量一致, 用于手算参考值
const Q_E = 1.602176634e-19;

function makeBody(id = 'b1', mass = 1) {
  return { id, mass: { value: mass, unit: 'kg' as const }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
}
// hall-effect 模型不依赖 bodies/environment 计算, 读 constraints.hallEffect,
// 故 bodies 用默认 dummy, 约束通过 hallEffect 参数直接传入。
function makeHallProblem(c: HallEffectConstraint): PhysicsProblem {
  return {
    id: 'test-hall-effect',
    model: 'hall-effect' as PhysicsProblem['model'],
    bodies: [makeBody()],
    constraints: { hallEffect: c } as unknown as PhysicsProblem['constraints'],
    timeConfig: { duration: 5, sampleCount: 100 },
    environment: {}
  };
}

describe('HallEffectModel — Round-4 RH 极性修正 (锁定 n 型 RH<0)', () => {
  const model = new HallEffectModel();

  it('metadata ok', () => {
    expect(model.modelType).toBe('hall-effect');
    expect(model.name).toBe('霍尔元件');
  });

  // TEST 1 — RH 负号锁定: 电子 (默认) → RH<0
  it('电子 (默认 carrierType) 霍尔系数 RH < 0 (n 型)', () => {
    const r = model.solve(makeHallProblem({ current: 1, magneticField: 0.5, chargeDensity: 1e22, thickness: 1e-3 }));
    const { hallCoefficient, polaritySign } = r.diagnostics.maxValues;
    expect(polaritySign).toBe(-1);
    expect(hallCoefficient).toBeLessThan(0);
    // 数值一致性: RH = polaritySign / (n * q)
    expect(hallCoefficient).toBeCloseTo(-1 / (1e22 * Q_E), 20);
  });

  // TEST 2 — RH 正号锁定: 空穴 → RH>0, 且与电子在相同 n 下严格相反
  it('空穴 (carrierType=hole) 霍尔系数 RH > 0 (p 型), 与电子严格相反', () => {
    const base = { current: 1, magneticField: 0.5, chargeDensity: 1e22, thickness: 1e-3 };
    const rHole = model.solve(makeHallProblem({ ...base, carrierType: 'hole' }));
    const rElec = model.solve(makeHallProblem({ ...base, carrierType: 'electron' }));
    const rhHole = rHole.diagnostics.maxValues.hallCoefficient;
    const rhElec = rElec.diagnostics.maxValues.hallCoefficient;
    expect(rHole.diagnostics.maxValues.polaritySign).toBe(1);
    expect(rhHole).toBeGreaterThan(0);
    // 严格相反: RH_hole === -RH_electron (同一 n, 仅极性不同）
    expect(rhHole).toBeCloseTo(-rhElec, 25);
    // 幅值一致: |RH| = 1/(n*q)
    expect(Math.abs(rhHole)).toBeCloseTo(1 / (1e22 * Q_E), 20);
  });

  // TEST 3 — UH 极性/符号: 电子 UH<0, 空穴 UH>0, 且 |UH| 相等
  it('霍尔电压 hallVoltage_mV 符号随载流子翻转, 幅值相等', () => {
    const base = { current: 1, magneticField: 0.5, chargeDensity: 1e22, thickness: 1e-3 };
    const uhElec = model.solve(makeHallProblem({ ...base, carrierType: 'electron' })).diagnostics.maxValues.hallVoltage_mV;
    const uhHole = model.solve(makeHallProblem({ ...base, carrierType: 'hole' })).diagnostics.maxValues.hallVoltage_mV;
    expect(uhElec).toBeLessThan(0);
    expect(uhHole).toBeGreaterThan(0);
    expect(uhHole).toBeCloseTo(-uhElec, 6);
    // 与解析幅值 |UH(I*B/(n*q*t))| 一致. 模型 hallVoltage_mV 经 toFixed(4) 舍入,
    // 参考值同精度舍入后再比, 以锁定"模型舍入输出 == 物理公式舍入结果"。
    const expectedAbs_mV = parseFloat(((1 * 0.5) / (1e22 * Q_E * 1e-3) * 1e3).toFixed(4));
    expect(Math.abs(uhElec)).toBeCloseTo(expectedAbs_mV, 6);
  });

  // TEST 4 — 线性度: UH ∝ I, 电流加倍则 |UH| 加倍
  it('霍尔电压幅值 |UH| 与控制电流 I 成正比 (UH ∝ I)', () => {
    const base = { magneticField: 0.5, chargeDensity: 1e22, thickness: 1e-3, carrierType: 'electron' as const };
    const uh1 = model.solve(makeHallProblem({ ...base, current: 0.5 })).diagnostics.maxValues.hallVoltage_mV;
    const uh2 = model.solve(makeHallProblem({ ...base, current: 1.0 })).diagnostics.maxValues.hallVoltage_mV;
    const ratio = Math.abs(uh2) / Math.abs(uh1);
    expect(ratio).toBeCloseTo(2.0, 3);
  });

  // TEST 5 — 手算参考值: I=0.1, B=0.5, n=1e22, t=1e-3 → 验证 |UH|
  it('手算参考值: I=0.1A, B=0.5T, n=1e22, t=1mm → |UH| ≈ 31.21 mV', () => {
    const r = model.solve(makeHallProblem({ current: 0.1, magneticField: 0.5, chargeDensity: 1e22, thickness: 1e-3 }));
    // UH(V) = I*B/(n*Q_E*t); |UH(mV)| = I*B/(n*Q_E*t) * 1e3
    // 参考值同步 toFixed(4) 舍入, 与模型 hallVoltage_mV 精度对齐后比较 .
    const expectedAbs_mV = parseFloat(((0.1 * 0.5) / (1e22 * Q_E * 1e-3) * 1e3).toFixed(4));
    expect(expectedAbs_mV).toBeCloseTo(31.2075, 2); // 手算参考 ~31.21 mV
    expect(Math.abs(r.diagnostics.maxValues.hallVoltage_mV)).toBeCloseTo(expectedAbs_mV, 6);
    // 电子为默认极性 → 负
    expect(r.diagnostics.maxValues.hallVoltage_mV).toBeLessThan(0);
    // UH vs I 曲线末点对应 Imax=1.2*I 的 UH. 曲线点由 iVal 直接计算并 toFixed(4) 舍入,
    // 故与单点 hallVoltage_mV*1.2 存在 ~1e-4 量级残差 (两者皆模型正确), 容差放宽至 1e-3.
    const lastPoint = r.charts.x_t.points.at(-1)!;
    const Imax = 0.1 * 1.2;
    const expectedLastY = parseFloat(((Imax * 0.5) / (1e22 * Q_E * 1e-3) * (-1) * 1e3).toFixed(4));
    expect(lastPoint.y).toBeCloseTo(expectedLastY, 6);
  });

  // TEST 6 — 异常路径: 缺少 hallEffect 约束时抛出
  it('缺少 hallEffect 约束时 solve 抛出', () => {
    const noConstraint: PhysicsProblem = {
      id: 'test-hall-effect-none',
      model: 'hall-effect' as PhysicsProblem['model'],
      bodies: [makeBody()],
      constraints: {} as unknown as PhysicsProblem['constraints'],
      timeConfig: { duration: 5, sampleCount: 100 },
      environment: {}
    };
    expect(() => model.solve(noConstraint)).toThrow(/hallEffect/i);
  });
});

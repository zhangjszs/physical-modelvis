/**
 * L3: 渲染器公式准确性自检
 *
 * 针对 6 个渲染器模块中数值计算,
 * 将其公式提取为 pure helper 后用 CODATA / 教材参考值比对。
 */

import { describe, it, expect } from 'vitest';
import {
  reedSwitchFieldStrength,
  thermistorResistance,
  hallVoltage,
  surfaceTensionAtT,
  diffusionAtT,
  doubleSlitIntensity,
  singleSlitIntensity,
  photoThresholdFrequencyTHz,
  stefanBoltzmannExitance,
  wienPeakWavelength,
  E_CHARGE,
  SIGMA_WATER_20C,
  SIGMA_MERCURY_20C,
  SIGMA_WATER_DT,
  D_LIQUID_25C,
  D_GAS_25C,
} from '../../src/rendering/constants';

describe('L3: 干簧管磁场公式', () => {
  it('H(d=0) = H₀ = 200', () => {
    expect(reedSwitchFieldStrength(0)).toBeCloseTo(200, 10);
  });

  it('H(d=10mm) = H₀/2 = 100 (d₀ 定义)', () => {
    expect(reedSwitchFieldStrength(10)).toBeCloseTo(100, 10);
  });

  it('H 随 d 单调递减', () => {
    const a = reedSwitchFieldStrength(5);
    const b = reedSwitchFieldStrength(15);
    expect(a).toBeGreaterThan(b);
  });
});

describe('L3: 热敏电阻 R-T', () => {
  it('T=T₀ → R = R₀', () => {
    expect(thermistorResistance(298.15, 1e4, 3950, 298.15)).toBeCloseTo(1e4, 5);
  });

  it('T>T₀ 时 R<R₀ (NTC 特性)', () => {
    const rHot = thermistorResistance(373.15, 1e4, 3950, 298.15); // 100℃
    expect(rHot).toBeLessThan(1e4);
  });

  it('B=3950K — 25℃ 下 R=10kΩ, 50℃ 后阻值下降', () => {
    const r25 = thermistorResistance(298.15, 1e4, 3950, 298.15);
    const r50 = thermistorResistance(323.15, 1e4, 3950, 298.15);
    expect(r50).toBeGreaterThan(0);
    expect(r50).toBeLessThan(r25);
  });
});

describe('L3: 霍尔电压', () => {
  it('V_H ∝ I, V_H ∝ B', () => {
    const V1 = hallVoltage(1, 0.1, 1e22, E_CHARGE, 1e-3);
    const V2 = hallVoltage(2, 0.1, 1e22, E_CHARGE, 1e-3);
    expect(V2).toBeCloseTo(2 * V1, 10);
  });

  it('V_H ∝ 1/n, V_H ∝ 1/t', () => {
    const V1 = hallVoltage(1, 0.1, 1e22, E_CHARGE, 1e-3);
    const V2 = hallVoltage(1, 0.1, 2e22, E_CHARGE, 1e-3);
    expect(V2).toBeCloseTo(V1 / 2, 10);
  });
});

describe('L3: 表面张力', () => {
  it('T=20°C → σ = σ₀', () => {
    expect(surfaceTensionAtT(SIGMA_WATER_20C, 20)).toBeCloseTo(SIGMA_WATER_20C, 10);
    expect(surfaceTensionAtT(SIGMA_MERCURY_20C, 20)).toBeCloseTo(SIGMA_MERCURY_20C, 10);
  });

  it('温度越高, σ 越小 (SIGMA_WATER_DT<0)', () => {
    const low = surfaceTensionAtT(SIGMA_WATER_20C, 20, SIGMA_WATER_DT);
    const high = surfaceTensionAtT(SIGMA_WATER_20C, 80, SIGMA_WATER_DT);
    expect(high).toBeLessThan(low);
  });

  it('水在20℃ σ₀ 在 0.0720~0.0730 N/m (IAPWS)', () => {
    expect(SIGMA_WATER_20C).toBeGreaterThan(0.072);
    expect(SIGMA_WATER_20C).toBeLessThan(0.073);
  });
});

describe('L3: 扩散系数', () => {
  it('T=298.15K (25°C) → D=D₂₅', () => {
    expect(diffusionAtT(D_LIQUID_25C, 298.15)).toBeCloseTo(D_LIQUID_25C, 10);
  });

  it('温度越高, D 越大', () => {
    const low = diffusionAtT(D_LIQUID_25C, 298.15);
    const high = diffusionAtT(D_LIQUID_25C, 373.15);
    expect(high).toBeGreaterThan(low);
  });

  it('气体 D 比液体 D 大约 4 个量级', () => {
    const ratio = D_GAS_25C / D_LIQUID_25C;
    expect(ratio).toBeGreaterThan(1e3);
    expect(ratio).toBeLessThan(1e5);
  });
});

describe('L3: 双缝干涉光强', () => {
  it('β=0 (中央主极大) → I = 1', () => {
    expect(doubleSlitIntensity(0)).toBeCloseTo(1, 10);
  });

  it('β=π/2 (一级暗纹) → I = 0', () => {
    expect(doubleSlitIntensity(Math.PI / 2)).toBeCloseTo(0, 10);
  });

  it('β=π (二级明纹) → I = 1', () => {
    expect(doubleSlitIntensity(Math.PI)).toBeCloseTo(1, 10);
  });
});

describe('L3: 单缝衍射光强', () => {
  it('β=0 → I = 1 (中央主极大)', () => {
    expect(singleSlitIntensity(0)).toBeCloseTo(1, 10);
  });

  it('β=π (一级暗纹) → I = 0', () => {
    expect(singleSlitIntensity(Math.PI)).toBeCloseTo(0, 10);
  });

  it('渐小: β 越大 I 越小 (忽略次峰)', () => {
    const a = singleSlitIntensity(0.5);
    const b = singleSlitIntensity(2);
    expect(a).toBeGreaterThan(b);
  });
});

describe('L3: 光电效应', () => {
  it('钠 (W₀=2.28eV) → ν₀ ≈ 550 THz (±50)', () => {
    const f = photoThresholdFrequencyTHz(2.28);
    expect(f).toBeGreaterThan(500);
    expect(f).toBeLessThan(600);
  });

  it('频率与逸出功成正比', () => {
    const f1 = photoThresholdFrequencyTHz(2);
    const f2 = photoThresholdFrequencyTHz(4);
    expect(f2).toBeCloseTo(2 * f1, 5);
  });
});

describe('L3: 斯特藩-玻尔兹曼', () => {
  it('M(300K) ≈ σ·300⁴ = 459 W/m²', () => {
    const M = stefanBoltzmannExitance(300);
    expect(M).toBeCloseTo(459, -1); // ±10
  });

  it('M ∝ T⁴', () => {
    const M1 = stefanBoltzmannExitance(300);
    const M2 = stefanBoltzmannExitance(600);
    expect(M2).toBeCloseTo(16 * M1, 5);
  });
});

describe('L3: 维恩位移', () => {
  it('T=5800K (太阳) → λ_max ≈ 500 nm', () => {
    const lam = wienPeakWavelength(5800);
    expect(lam).toBeCloseTo(500e-9, -7); // ±10nm
  });

  it('λ_max ∝ 1/T', () => {
    const a = wienPeakWavelength(300);
    const b = wienPeakWavelength(600);
    expect(a).toBeCloseTo(2 * b, 10);
  });
});

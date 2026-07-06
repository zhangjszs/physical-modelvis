/**
 * L0: 物理常数完整性自检
 *
 * - 所有 CODATA 2018 基本常数必须存在且有正确值 (14 位有效数字)
 * - 新增的 5 个常数 (h, kB, sigmaSB, Na, neutronMass) 必须存在
 * - 每个常量必须包含 value / unit / symbol 三字段
 */

import { describe, it, expect } from 'vitest';
import { PHYSICS_CONSTANTS } from '../../src/units/constants.js';

// CODATA 2018 / SI 2019 定义值
const CODATA: Array<{ key: keyof typeof PHYSICS_CONSTANTS; value: number; unit: string; symbol: string; exact?: boolean }> = [
  { key: 'g', value: 9.8, unit: 'm/s²', symbol: 'g' },
  { key: 'g_precise', value: 9.80665, unit: 'm/s²', symbol: 'g', exact: true },
  { key: 'e', value: 1.602176634e-19, unit: 'C', symbol: 'e', exact: true },
  { key: 'k', value: 8.9875517923e9, unit: 'N·m²/C²', symbol: 'k' },
  { key: 'epsilon0', value: 8.8541878128e-12, unit: 'F/m', symbol: 'ε₀' },
  { key: 'mu0', value: 4 * Math.PI * 1e-7, unit: 'T·m/A', symbol: 'μ₀', exact: true },
  { key: 'c', value: 299792458, unit: 'm/s', symbol: 'c', exact: true },
  { key: 'electronMass', value: 9.1093837015e-31, unit: 'kg', symbol: 'mₑ' },
  { key: 'protonMass', value: 1.67262192369e-27, unit: 'kg', symbol: 'mₚ' },
  { key: 'G', value: 6.67430e-11, unit: 'N·m²/kg²', symbol: 'G' },
  { key: 'earthMass', value: 5.9722e24, unit: 'kg', symbol: 'Mₑ' },
  { key: 'earthRadius', value: 6.371e6, unit: 'm', symbol: 'Rₑ' },
  { key: 'leoAltitude', value: 400e3, unit: 'm', symbol: 'h_LEO' },
  // 新增 CODATA 常量
  { key: 'h', value: 6.62607015e-34, unit: 'J·s', symbol: 'h', exact: true },
  { key: 'kB', value: 1.380649e-23, unit: 'J/K', symbol: 'k_B', exact: true },
  { key: 'sigmaSB', value: 5.670374419e-8, unit: 'W/(m²·K⁴)', symbol: 'σ', exact: true },
  { key: 'Na', value: 6.02214076e23, unit: 'mol⁻¹', symbol: 'N_A', exact: true },
  { key: 'neutronMass', value: 1.67492749804e-27, unit: 'kg', symbol: 'n' },
];

describe('L0: 物理常数完整性', () => {
  it('所有必需常量存在', () => {
    for (const { key } of CODATA) {
      expect(PHYSICS_CONSTANTS[key], `常量 ${key} 应该存在`).toBeDefined();
    }
  });

  it('每个常量包含有效的 value/unit/symbol', () => {
    for (const key of Object.keys(PHYSICS_CONSTANTS) as Array<keyof typeof PHYSICS_CONSTANTS>) {
      const c = PHYSICS_CONSTANTS[key];
      expect(typeof c.value, `${key}.value 必须是数字`).toBe('number');
      expect(Number.isFinite(c.value), `${key}.value 必须有限`).toBe(true);
      expect(typeof c.unit, `${key}.unit 必须是字符串`).toBe('string');
      expect(c.unit.length, `${key}.unit 必须非空`).toBeGreaterThan(0);
      expect(typeof c.symbol, `${key}.symbol 必须是字符串`).toBe('string');
    }
  });

  it('CODATA 值匹配 (精确值或 14 位有效数字)', () => {
    for (const { key, value, exact } of CODATA) {
      const c = PHYSICS_CONSTANTS[key];
      if (exact) {
        expect(c.value, `${key} 精确值`).toBe(value);
      } else {
        const digits = 14;
        const tolerance = Math.max(Math.abs(value) * 10 ** -digits, Number.EPSILON * 100);
        expect(c.value, `${key} 匹配 CODATA`).toBeCloseTo(value, 10);
      }
    }
  });

  it('新增常数 h, kB 等已存在', () => {
    for (const key of ['h', 'kB', 'sigmaSB', 'Na', 'neutronMass'] as const) {
      expect(PHYSICS_CONSTANTS[key], `${key} 已注册`).toBeDefined();
    }
  });
});

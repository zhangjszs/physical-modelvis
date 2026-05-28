import type { Quantity } from '../types/common.js';

function q<U extends string>(value: number, unit: U, symbol: string): Quantity<U> {
  return { value, unit, symbol };
}

/** 常用物理常数 (SI 单位) */
export const PHYSICS_CONSTANTS = {
  /** 重力加速度 (标准值) */
  g: q(9.8, 'm/s²', 'g'),

  /** 重力加速度 (精确值, 用于高精度计算) */
  g_precise: q(9.80665, 'm/s²', 'g'),

  /** 基本电荷 */
  e: q(1.602176634e-19, 'C', 'e'),

  /** 库仑常数 k = 1/(4πε₀) */
  k: q(8.9875517923e9, 'N·m²/C²', 'k'),

  /** 真空介电常数 */
  epsilon0: q(8.8541878128e-12, 'F/m', 'ε₀'),

  /** 真空磁导率 */
  mu0: q(4 * Math.PI * 1e-7, 'T·m/A', 'μ₀'),

  /** 光速 */
  c: q(299792458, 'm/s', 'c'),

  /** 电子质量 */
  electronMass: q(9.1093837015e-31, 'kg', 'mₑ'),

  /** 质子质量 */
  protonMass: q(1.67262192369e-27, 'kg', 'mₚ'),
} as const;

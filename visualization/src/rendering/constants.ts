/**
 * 渲染器共享物理常数 (CODATA 2018 或 IAPWS)
 *
 * 所有定制的 Canvas 渲染器涉及数值计算时使用本模块,
 * 减少 magic number 重复, 并便于 L3 自检公式对比。
 *
 * 注: physics-core 的 PHYSICS_CONSTANTS 不含 k_B, h, sigma_SB,
 * 因此本模块对它们做局部定义 (已在 L0 同步加入 PHYSICS_CONSTANTS)。
 */

/** 玻尔兹曼常数 k_B (J/K) */
export const K_BOLTZMANN = 1.380649e-23;

/** 基本电荷 e (C) */
export const E_CHARGE = 1.602176634e-19;

/** 真空磁导率 μ₀ (T·m/A) */
export const MU0 = 4 * Math.PI * 1e-7;

/** 铜电导率 (20℃) — 电磁阻尼用 (S/m) */
export const SIGMA_COPPER_20C = 5.8e7;

/** 斯特藩-玻尔兹曼常数 (W/m²K⁴) */
export const SIGMA_STEFAN_BOLTZMANN = 5.670374419e-8;

/** 表面张力 — 水在 20℃ (N/m) — IAPWS R1-95 */
export const SIGMA_WATER_20C = 0.0728;

/** 表面张力 — 水银在 20℃ (N/m) */
export const SIGMA_MERCURY_20C = 0.487;

/** 表面张力温度系数 — 水 (近似线性, N/m/℃) */
export const SIGMA_WATER_DT = -0.002;

/** 扩散系数 — 液体中溶质在 25℃ (m²/s) — 量级参考 */
export const D_LIQUID_25C = 1e-9;

/** 扩散系数 — 气体中分子在 25℃ (m²/s) — 量级参考 */
export const D_GAS_25C = 1e-5;

/** 普朗克常数 h (J·s) — 光电效应/电子衍射 */
export const PLANCK_H = 6.62607015e-34;

/**
 * 干簧管磁场强度简化模型: H(d) = H₀ / (1 + (d/d₀)²)
 *
 * 注: 这是经验公式, 模拟磁铁距离干簧管越近越强的单调趋势;
 *     不是磁偶极子的真实 1/r³ 律。教科书演示够用。
 *
 * @param d 磁铁到干簧管距离 (mm)
 * @param H0 H₀ 零距离等效磁场 (mT)
 * @param d0 d₀ 特征距离 (mm, H = H₀/2 时)
 */
export function reedSwitchFieldStrength(d: number, H0 = 200, d0 = 10): number {
  return H0 / (1 + (d / d0) * (d / d0));
}

/**
 * 热敏电阻 R-T 特性 (NTC): R(T) = R₀·exp(B·(1/T − 1/T₀))
 * @param T 温度 (K)
 * @param R0 参考阻值 (Ω, 在 T₀ 下)
 * @param B 材料常数 (K)
 * @param T0 参考温度 (K)
 */
export function thermistorResistance(T: number, R0: number, B: number, T0: number): number {
  return R0 * Math.exp(B * (1 / T - 1 / T0));
}

/**
 * 霍尔电压: V_H = I·B / (n·q·t)
 * @param I 电流 (A)
 * @param B 磁场 (T)
 * @param n 载流子浓度 (m⁻³)
 * @param q 载流子电荷 (C)
 * @param t 霍尔片厚度 (m)
 */
export function hallVoltage(I: number, B: number, n: number, q: number, t: number): number {
  return (I * B) / (n * q * t);
}

/**
 * 表面张力温度修正 (线性近似): σ(T) = σ₂₀·(1 + α·(T − 20))
 * @param sigma0 σ₂₀ 参考温度下的值
 * @param Tdeg 当前温度 (°C)
 * @param alphaT 温度系数 (负数表示随温度降低)
 */
export function surfaceTensionAtT(sigma0: number, Tdeg: number, alphaT = SIGMA_WATER_DT): number {
  return sigma0 * (1 + alphaT * (Tdeg - 20));
}

/**
 * 扩散系数温度修正 (近似 D ∝ T^1.5, Stokes-Einstein): D(T) = D₂₅·(T/298.15)^1.5
 * @param D25 25℃时的值
 * @param T 绝对温度 (K)
 */
export function diffusionAtT(D25: number, T: number): number {
  return D25 * Math.pow(T / 298.15, 1.5);
}

/**
 * 双缝干涉光强: I(θ) = I₀·cos²(π·d·sinθ / λ)
 * @param pathDiffPhase π·d·sinθ / λ (已乘 π)
 */
export function doubleSlitIntensity(pathDiffPhase: number): number {
  return Math.cos(pathDiffPhase) ** 2;
}

/**
 * 单缝衍射光强: I(β) = (sin β / β)², β = π·a·sinθ / λ
 * @param beta β 参数 (弧度, 已含 π)
 */
export function singleSlitIntensity(beta: number): number {
  if (Math.abs(beta) < 1e-12) return 1;
  const s = Math.sin(beta) / beta;
  return s * s;
}

/**
 * 光电效应: 极限频率 ν₀ = W₀ / h
 * @param workFunction 逸出功 (eV)
 * @returns ν₀ (THz)
 */
export function photoThresholdFrequencyTHz(workFunction: number): number {
  const W_J = workFunction * E_CHARGE;
  return W_J / PLANCK_H / 1e12;
}

/**
 * 理想黑体辐射 (Planck/COMSOL): B_ν(T) ∝ ν³ / (exp(hν/kT) − 1)
 * @param nuHz 频率 (Hz)
 * @param T 温度 (K)
 * @returns 谱辐射亮度 (相对单位)
 */
export function blackBodySpectralRadiance(nuHz: number, T: number): number {
  const x = (PLANCK_H * nuHz) / (K_BOLTZMANN * T);
  if (x > 700) return 0; // 避免 exp 溢出
  return (nuHz ** 3) / (Math.exp(x) - 1);
}

/**
 * 斯特藩-玻尔兹曼定律: M = σ·T⁴ (单位面积辐射出射度)
 * @param T 温度 (K)
 * @returns M (W/m²)
 */
export function stefanBoltzmannExitance(T: number): number {
  return SIGMA_STEFAN_BOLTZMANN * T ** 4;
}

/**
 * 维恩位移定律: λ_max = b / T (b ≈ 2.898×10⁻³ m·K)
 */
export const WIEN_B = 2.897771955e-3;
export function wienPeakWavelength(T: number): number {
  return WIEN_B / T;
}

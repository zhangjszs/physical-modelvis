/**
 * 光电效应演示扫描 — 2D 板书 / 3D 装置共用的频率扫描与光电参数
 *
 * 场景没有单独的入射频率滑杆；用 [ν_min, ν_max] 区间循环扫描代表单色光频率。
 * 物理关系与引擎一致：hν = W₀ + E_k，截止电压 eU_c = E_k。
 * 这里只做「时间 → 当前频率」的演示映射，不重算物理定律。
 */
import { PHYSICS_CONSTANTS } from 'physics-core';

/** 扫描周期（秒），与 scene 的 timeConfig 时长一致 */
export const PHOTOELECTRIC_SWEEP_PERIOD_S = 6;
/** 起始相位：打开场景先落在 ν > ν₀ 的一段，随后回落到红限以下 */
export const PHOTOELECTRIC_SWEEP_PHASE_S = 2;
/** h 换算到 eV/THz：h/e × 1e12 */
export const H_EV_PER_THZ = (PHYSICS_CONSTANTS.h.value / PHYSICS_CONSTANTS.e.value) * 1e12;

export interface PhotoelectricSweep {
    W0: number;
    nu: number;
    nu0: number;
    hNu: number;
    Ek: number;
    Uc: number;
    emitting: boolean;
}

const safeNumber = (value: unknown, fallback: number): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function photoelectricSweep(params: Record<string, number>, time: number): PhotoelectricSweep {
    const W0 = clamp(safeNumber(params['W0'], 2.3), 1, 6);
    const nuMin = clamp(safeNumber(params['nuMin'], 300), 100, 5000);
    const nuMax = Math.max(nuMin + 1, clamp(safeNumber(params['nuMax'], 1500), nuMin + 1, 6000));

    const period = PHOTOELECTRIC_SWEEP_PERIOD_S;
    const phase = (((time + PHOTOELECTRIC_SWEEP_PHASE_S) % period) + period) % period;
    const u = phase / period;
    const nu = nuMin + u * (nuMax - nuMin);
    const hNu = H_EV_PER_THZ * nu;
    const Ek = Math.max(0, hNu - W0);
    const nu0 = W0 / H_EV_PER_THZ;

    return { W0, nu, nu0, hNu, Ek, Uc: Ek, emitting: Ek > 1e-6 };
}

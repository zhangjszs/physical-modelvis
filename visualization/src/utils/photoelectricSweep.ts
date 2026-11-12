/**
 * 光电效应演示扫描 — 2D 板书 / 3D 装置共用的「时间 → 入射频率」演示映射
 *
 * 职责边界 (关键约定):
 *   本模块**只做演示映射** —— 把装置的演示时钟映射成当前单色光的频率 ν。
 *   逸出功 W₀ / 极限频率 ν₀ / 光子能量 hν / 最大初动能 E_k / 截止电压 U_c
 *   一律来自 physics-core 引擎结果 (`diagnostics.maxValues` + `charts`),
 *   由 2D 板书 (`rendering/photoelectricScenes.ts`) 与 3D 装置
 *   (`rigs/photoelectricRig.ts`) 各自的 readouts 读取 ——
 *   本模块不再自算任何物理量, 避免与引擎公式漂移。
 *
 * 扫描周期与场景 `timeConfig` 时长一致 (6 s), 保证 2D/3D 同拍。
 */
import { PHYSICS_CONSTANTS } from 'physics-core';

/** 扫描周期（秒），与 scene 的 timeConfig 时长一致 */
export const PHOTOELECTRIC_SWEEP_PERIOD_S = 6;
/** 起始相位：打开场景先落在 ν > ν₀ 的一段，随后回落到红限以下 */
export const PHOTOELECTRIC_SWEEP_PHASE_S = 2;
/**
 * h 换算到 eV/THz：h/e × 1e12。
 * 仅用于「无引擎结果」时的兜底换算 (单一真源仍是引擎 maxValues.h / .e)。
 */
export const H_EV_PER_THZ = (PHYSICS_CONSTANTS.h.value / PHYSICS_CONSTANTS.e.value) * 1e12;

export interface PhotoelectricSweep {
    /** 当前入射光频率 (THz) —— 演示映射结果, 非引擎输出 */
    nu: number;
    /** 扫描区间下限 (THz) */
    nuMin: number;
    /** 扫描区间上限 (THz) */
    nuMax: number;
}

const safeNumber = (value: unknown, fallback: number): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function photoelectricSweep(params: Record<string, number>, time: number): PhotoelectricSweep {
    const nuMin = clamp(safeNumber(params['nuMin'], 300), 100, 5000);
    const nuMax = Math.max(nuMin + 1, clamp(safeNumber(params['nuMax'], 1500), nuMin + 1, 6000));

    const period = PHOTOELECTRIC_SWEEP_PERIOD_S;
    const phase = (((time + PHOTOELECTRIC_SWEEP_PHASE_S) % period) + period) % period;
    const u = phase / period;
    return { nu: nuMin + u * (nuMax - nuMin), nuMin, nuMax };
}

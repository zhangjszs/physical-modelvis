/**
 * 气体定律演示过程 — 2D 板书 / 3D 装置共用的「初态 → 终态」过程插值
 *
 * 引擎 gas-law 是**静态分析解**:
 *   给定 n、过程模式、初态, 算出终态与**过程曲线**, 轨迹只有初末两个状态点
 *   (p-V 状态点, 不是空间轨迹)。装置要演示「压缩 → 压强升高」这个过程,
 *   就必须把初末态之间连成一条演示路径 —— 这条路径按引擎数据插值:
 *
 *   - 体积 V(t)、温度 T(t): 引擎 `initial*` / `final*` 两端**线性插值**
 *     (等温: V 线性、T 恒定; 等压: V 与 T 都线性; 等容: V 恒定、T 线性);
 *   - 压强 p(t): 一律从**引擎过程曲线**插值
 *     (等温/等压曲线 x = V(L), 等容曲线 x = T(K))。
 *     等温过程 pV = const ⇒ p 对 V 是双曲线, 两端线性插值会画错, 必须查曲线。
 *
 * 单一真源: 所有初末态、模式、气体常数都读引擎 `diagnostics.maxValues`;
 * 曲线走 `getChart(result, 'gas-law', 'x_t')`。
 */
import type { SimulationResult } from 'physics-core';
import { getChart } from 'physics-core';

/** 一次完整过程的演示周期 (s) —— 与场景 timeConfig 时长一致 */
export const GAS_LAW_DEMO_PERIOD_S = 6;

/** 过程模式: 0=等温 1=等压 2=等容 */
export type GasLawMode = 0 | 1 | 2;

export interface GasLawProcessState {
    source: 'engine' | 'fallback';
    mode: GasLawMode;
    /** 演示相位 0..1 (0 = 初态, 1 = 终态) */
    phase: number;
    /** 当前体积 (L) */
    volume_L: number;
    /** 当前压强 (kPa) */
    pressure_kPa: number;
    /** 当前温度 (K) */
    temperature_K: number;
    /** 压强是否取自引擎曲线 (false ⇒ 按 pV=nRT 兜底) */
    pressureFromEngineCurve: boolean;
    /** 引擎初态 */
    initial: { volume_L: number; pressure_kPa: number; temperature_K: number };
    /** 引擎终态 */
    final: { volume_L: number; pressure_kPa: number; temperature_K: number };
    /** 引擎物质的量 (mol) */
    moles: number;
    /** 引擎气体常数 R (J/(mol·K)) */
    R: number;
}

/** 引擎 maxValues 取值 (Record<string, number> → number | undefined) */
function engValue(result: SimulationResult | null | undefined, key: string): number | undefined {
    const v = result?.diagnostics?.maxValues?.[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** 升序点列上的线性插值 (域外钳到端点) */
function interpAsc(points: ReadonlyArray<{ x: number; y: number }>, x: number): number | undefined {
    if (points.length === 0) return undefined;
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) return undefined;
    if (x <= first.x) return first.y;
    if (x >= last.x) return last.y;
    let lo = 0;
    let hi = points.length - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        const p = points[mid];
        if (!p) break;
        if (p.x <= x) lo = mid;
        else hi = mid;
    }
    const a = points[lo];
    const b = points[hi];
    if (!a || !b) return undefined;
    const span = b.x - a.x;
    if (span <= 1e-12) return b.y;
    return a.y + ((b.y - a.y) * (x - a.x)) / span;
}

export function gasLawProcessState(
    result: SimulationResult | null | undefined,
    params: Record<string, number>,
    time: number
): GasLawProcessState {
    const modeRaw = engValue(result, 'modeCode') ?? Math.round(params['modeG'] ?? 0);
    const mode: GasLawMode = modeRaw === 1 ? 1 : modeRaw === 2 ? 2 : 0;

    const moles = engValue(result, 'moles') ?? params['n'] ?? 1;
    const R = engValue(result, 'R') ?? 8.314;

    const initV_m3 = engValue(result, 'initialVolumeM3') ?? (params['V0'] ?? 22.4) / 1e3;
    const initP_Pa = engValue(result, 'initialPressurePa') ?? (params['p0'] ?? 101.3) * 1e3;
    const initT = engValue(result, 'initialTemperatureK') ?? params['T0'] ?? 273.15;
    const finV_m3 = engValue(result, 'finalVolumeM3') ?? initV_m3 * 0.5;
    const finP_Pa = engValue(result, 'finalPressurePa') ?? initP_Pa;
    const finT = engValue(result, 'finalTemperatureK') ?? initT;

    const initial = {
        volume_L: initV_m3 * 1e3,
        pressure_kPa: initP_Pa / 1e3,
        temperature_K: initT
    };
    const final = {
        volume_L: finV_m3 * 1e3,
        pressure_kPa: finP_Pa / 1e3,
        temperature_K: finT
    };

    // 演示相位: 时间线性映射 0..1, 循环
    const period = GAS_LAW_DEMO_PERIOD_S;
    const phase = (((time % period) + period) % period) / period;

    // V(t) / T(t): 引擎两端线性插值
    const volume_L = initial.volume_L + (final.volume_L - initial.volume_L) * phase;
    const temperature_K = initial.temperature_K + (final.temperature_K - initial.temperature_K) * phase;

    // p(t): 从引擎过程曲线插值 (等容曲线 x = T, 其余 x = V)
    const chart = result ? getChart(result, 'gas-law', 'x_t') : undefined;
    const chartX = mode === 2 ? temperature_K : volume_L;
    const fromCurve = chart ? interpAsc(chart.points, chartX) : undefined;
    const pressureFromEngineCurve = fromCurve !== undefined;

    let pressure_kPa = fromCurve;
    if (pressure_kPa === undefined) {
        // 兜底: pV = nRT 的三种重排 (无引擎曲线时才用)
        pressure_kPa =
            mode === 0
                ? (initial.pressure_kPa * initial.volume_L) / volume_L
                : mode === 1
                  ? initial.pressure_kPa
                  : (initial.pressure_kPa * temperature_K) / initial.temperature_K;
    }

    return {
        source: engValue(result, 'finalVolumeM3') !== undefined ? 'engine' : 'fallback',
        mode,
        phase,
        volume_L,
        pressure_kPa,
        temperature_K,
        pressureFromEngineCurve,
        initial,
        final,
        moles,
        R
    };
}

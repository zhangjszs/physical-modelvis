/**
 * 时间序列配置助手 — 收敛 scenes/ 中重复的 timeConfig 模板。
 *
 * 替换模式:
 *   { duration, dt: duration / N, sampleCount: N }                       → makeTimeSeries(duration, N)            (Bucket A × 89)
 *   { duration, dt: <固定常数>, sampleCount: N }                         → makeTimeSeries(duration, N, dt)        (Bucket B × 32)
 *   { duration, dt: <表达式>, sampleCount: <公式/派生> }                  → 留 inline, 不可安全替换 (Bucket C × 3)
 */
import type { TimeConfig } from 'physics-core';

export function makeTimeSeries(
    duration: number,
    sampleCount: number,
    dtOverride?: number
): TimeConfig {
    return { duration, dt: dtOverride ?? duration / sampleCount, sampleCount };
}

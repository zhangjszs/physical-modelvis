/**
 * 数组归约工具 — 替代 Math.max(...arr) / Math.min(...arr) 展开调用 (#29)
 *
 * V8 函数参数个数有硬上限 (实测 ~125k 正常, 200k 直接 RangeError)。
 * 大数组 (如高 sampleCount 轨迹) 展开调用会崩溃, 与数值无关。
 * 本工具用单趟循环归约, 语义与 Math.max/Math.min 一致:
 *   - 空数组返回 -Infinity / Infinity
 *   - NaN 传播行为与 Math.max/Math.min 一致 (任一 NaN → NaN)
 */

/** 求最大值 (空数组返回 -Infinity, 与 Math.max() 一致; NaN 传播) */
export function maxOf(values: Iterable<number>): number {
    let max = -Infinity;
    for (const v of values) {
        // NaN 传播: 与 Math.max 一致, 任一 NaN → NaN
        if (Number.isNaN(v)) return NaN;
        if (v > max) max = v;
    }
    return max;
}

/** 求最小值 (空数组返回 Infinity, 与 Math.min() 一致; NaN 传播) */
export function minOf(values: Iterable<number>): number {
    let min = Infinity;
    for (const v of values) {
        // NaN 传播: 与 Math.min 一致, 任一 NaN → NaN
        if (Number.isNaN(v)) return NaN;
        if (v < min) min = v;
    }
    return min;
}

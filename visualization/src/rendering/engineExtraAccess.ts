/**
 * 引擎 extra / meta 通道类型化访问层 (#124 · 沿 #82 chartsOf 思路的最小切片)
 *
 * 背景: `SimulationResult.extra` 是 `Record<string, unknown>` 自由格式通道,
 * 渲染层此前用「双重 unknown 强转」直接取值 (extra → ElectricFieldExtra / MagFieldExtra),
 * 编译期零检查 —— 引擎结构漂移时画面会静默错位 (#82 已证明
 * 同类漂移真实发生过)。本层把「结构校验」显式化为带运行时守卫的类型谓词:
 *   - readElectricFieldExtra / readMagFieldExtra → 校验通过返回收窄结果, 否则返回 null;
 *   - 调用方拿到 null 时按既有约定走 placeholder 回退 (不抛异常, 与旧行为一致)。
 *
 * 校验范围只覆盖**渲染层真正消费的字段** (fieldLines / samples / plates / plateField /
 * wire / poles); 引擎产出的其余字段 (如 FieldLine.sign、Extra.profile) 原样透传、不参与判定。
 * 目标类型复用引擎 barrel 导出的 ElectricFieldExtra / MagFieldExtra, 不在渲染层重复声明,
 * 保持「结构单一真源在引擎」。
 *
 * meta.duration 的同源说明见 physics-core/src/types/result.ts (#124 已在类型层声明,
 * 渲染层直读 `simulationResult.meta.duration` 即受编译期检查, 缺省时自备场景默认时长)。
 */

import type { ElectricFieldExtra, MagFieldExtra } from 'physics-core';

/** 有限数值 (排除 NaN / ±Infinity, 与自检 L10 输出扫描口径一致) */
function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

/** 普通对象 (数组与 null 排除在外) */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 未知数组 (narrow 到 unknown[], 避免引入 any) */
function isUnknownArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

/** 二维点: { x, y } 均为有限数值 */
function isPointLike(value: unknown): boolean {
    return isRecord(value) && isFiniteNumber(value['x']) && isFiniteNumber(value['y']);
}

/** 折线顶点数组: 数组且每项为合法点 (空数组视为合法, 由绘制自行处理 —— 守卫只拒结构性脏数据) */
function isPointArrayLike(value: unknown): boolean {
    return isUnknownArray(value) && value.every(isPointLike);
}

/** 电场线元素: { points: 合法折线 } (sign 由引擎产出, 渲染层不消费, 故不判定) */
function isFieldLineLike(value: unknown): boolean {
    return isRecord(value) && isPointArrayLike(value['points']);
}

/** 矢量场采样点: { x, y, 分量 e1/e2, magnitude } 全为有限数值 */
function isSampleLike(value: unknown, comp1: string, comp2: string): boolean {
    if (!isRecord(value)) return false;
    return (
        isFiniteNumber(value['x']) &&
        isFiniteNumber(value['y']) &&
        isFiniteNumber(value[comp1]) &&
        isFiniteNumber(value[comp2]) &&
        isFiniteNumber(value['magnitude'])
    );
}

/** 平行板位置盒: { top, bottom, left, right } 全为有限数值 */
function isPlateBoxLike(value: unknown): boolean {
    if (!isRecord(value)) return false;
    return (
        isFiniteNumber(value['top']) &&
        isFiniteNumber(value['bottom']) &&
        isFiniteNumber(value['left']) &&
        isFiniteNumber(value['right'])
    );
}

/**
 * 电场线分布模型 (electric-field-lines) 的 extra 结构守卫。
 * 必需字段: fieldLines (折线数组) + samples (ex/ey 采样点数组);
 * 可选字段: plates (平行板位置盒) / plateField (板间场强)。
 */
export function isElectricFieldExtra(value: unknown): value is ElectricFieldExtra {
    if (!isRecord(value)) return false;
    if (!isUnknownArray(value['fieldLines']) || !isUnknownArray(value['samples'])) return false;
    if (!value['fieldLines'].every(isFieldLineLike)) return false;
    if (!value['samples'].every(s => isSampleLike(s, 'ex', 'ey'))) return false;
    const plates = value['plates'];
    if (plates !== undefined && !isPlateBoxLike(plates)) return false;
    const plateField = value['plateField'];
    if (plateField !== undefined && !isFiniteNumber(plateField)) return false;
    return true;
}

/**
 * 电流的磁场模型 (current-magnetic-field) 的 extra 结构守卫。
 * 必需字段: fieldLines + samples (bx/by 采样点数组);
 * 可选字段: wire (直导线位置) / poles (N/S 极位置)。
 */
export function isMagFieldExtra(value: unknown): value is MagFieldExtra {
    if (!isRecord(value)) return false;
    if (!isUnknownArray(value['fieldLines']) || !isUnknownArray(value['samples'])) return false;
    if (!value['fieldLines'].every(isFieldLineLike)) return false;
    if (!value['samples'].every(s => isSampleLike(s, 'bx', 'by'))) return false;
    const wire = value['wire'];
    if (wire !== undefined && !isPointLike(wire)) return false;
    const poles = value['poles'];
    if (poles !== undefined && !(isRecord(poles) && isPointLike(poles['north']) && isPointLike(poles['south']))) {
        return false;
    }
    return true;
}

/**
 * 读取电场线 extra (入参为 `SimulationResult.extra` 通道值)。
 * 无结果 / 结构不符 → null (调用方回退 placeholder)。
 */
export function readElectricFieldExtra(extra: unknown): ElectricFieldExtra | null {
    return isElectricFieldExtra(extra) ? extra : null;
}

/**
 * 读取磁场线 extra (入参为 `SimulationResult.extra` 通道值)。
 * 无结果 / 结构不符 → null (调用方回退 placeholder)。
 */
export function readMagFieldExtra(extra: unknown): MagFieldExtra | null {
    return isMagFieldExtra(extra) ? extra : null;
}

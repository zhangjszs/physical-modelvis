/**
 * 约束读取守卫 (#27)
 *
 * 引擎模型过去直接解构约束字段 (`const n = c.chargeDensity`)，不做存在性/有限性检查。
 * 字段缺失时会在深层计算里抛出 `TypeError: Cannot read properties of undefined`，
 * 错误信息完全无法指向真实原因（哪个模型的哪个字段缺失）。
 *
 * 本模块把这类**结构性**非法输入转成可定位的 PhysicsError。
 * 与 base.validate() 的 min/max 拦截互补：
 *   - validate() 管**值**越界 (n=0)
 *   - 本模块管**字段缺失** (n 不存在)
 */

import { PhysicsError } from '../errors/index.js';

/**
 * 读取必需的数值约束字段。
 *
 * @param constraints 约束对象 (如 `problem.constraints?.hallEffect`)
 * @param field 字段名
 * @param context 模型标识, 用于错误信息定位 (如 `'hall-effect'`)
 * @returns 该字段的数值
 * @throws PhysicsError 当字段缺失、非数值或非有限数时
 */
export function requireConstraintNumber(
    constraints: Record<string, unknown> | undefined,
    field: string,
    context: string
): number {
    if (constraints === undefined || constraints === null) {
        throw new PhysicsError('MISSING_CONSTRAINT', `模型 ${context} 需要约束配置, 但未提供`, {
            model: context,
            field
        });
    }
    const value = constraints[field];
    if (value === undefined || value === null) {
        throw new PhysicsError('MISSING_CONSTRAINT_FIELD', `模型 ${context} 的约束缺少必需字段 "${field}"`, {
            model: context,
            field
        });
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new PhysicsError(
            'INVALID_CONSTRAINT_FIELD',
            `模型 ${context} 的约束字段 "${field}" 必须是有限数, 当前值: ${String(value)}`,
            { model: context, field, value }
        );
    }
    return value;
}

/**
 * 读取可选的数值约束字段。
 *
 * @param fallback 字段缺失时返回的默认值
 * @returns 字段数值, 或 fallback
 */
export function optionalConstraintNumber(
    constraints: Record<string, unknown> | undefined,
    field: string,
    fallback: number
): number {
    const value = constraints?.[field];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    return fallback;
}

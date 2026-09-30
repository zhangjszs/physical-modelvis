import type { Vector3D } from '../types/common.js';
import type { FieldSource } from './fields3d.js';
import { totalElectricField, totalMagneticField } from './fields3d.js';
import { Vec3 } from '../math/vector3d.js';

/**
 * 3D 场线追踪器 — 供渲染层画电场线/磁场线 (L5)。
 *
 * 沿单位场方向 dr/ds = ±F̂(r) 做中点法 (RK2) 弧长积分, 从种子点向
 * 正/负场方向各追一条折线后拼接。面向可视化精度 (不用于物理求解,
 * 物理轨迹请用 boris3d)。
 */

export interface FieldLineOptions {
    /** 种子点 (m) — 场线经过的必经点 */
    readonly start: Vector3D;
    /** 追踪哪种场 */
    readonly kind: 'electric' | 'magnetic';
    /** 是否双向追踪 (默认 true: 向 ±场方向各延伸一条) */
    readonly bidirectional?: boolean;
    /** 弧长步长 (m), 默认 0.02 */
    readonly stepLength?: number;
    /** 单向最大弧长 (m), 默认 10 */
    readonly maxArcLength?: number;
    /** 单向最大步数, 默认 2000 */
    readonly maxSteps?: number;
    /** 边界半径 (距原点), 超出即停止, 默认 100 */
    readonly boundRadius?: number;
}

/** 单位场方向; 零场 (中性点) 返回 null 表示无法继续 */
function unitFieldDirection(
    sources: readonly FieldSource[],
    kind: 'electric' | 'magnetic',
    at: Vector3D
): Vector3D | null {
    const f = kind === 'electric' ? totalElectricField(sources, at) : totalMagneticField(sources, at);
    const mag = Vec3.magnitude(f);
    if (mag === 0 || !Number.isFinite(mag)) return null;
    return Vec3.scale(f, 1 / mag);
}

/** 从种子点沿 sign = ±1 方向追踪一条折线 (不含种子点) */
function traceOneDirection(
    sources: readonly FieldSource[],
    options: Required<Omit<FieldLineOptions, 'start' | 'kind' | 'bidirectional'>>,
    start: Vector3D,
    kind: 'electric' | 'magnetic',
    sign: 1 | -1
): Vector3D[] {
    const points: Vector3D[] = [];
    let current = start;
    let arc = 0;
    for (let step = 0; step < options.maxSteps && arc < options.maxArcLength; step++) {
        const d1 = unitFieldDirection(sources, kind, current);
        if (!d1) break;
        // 中点法: 用中点处的方向推进整步
        const mid = Vec3.add(current, Vec3.scale(d1, (sign * options.stepLength) / 2));
        const d2 = unitFieldDirection(sources, kind, mid);
        if (!d2) break;
        const next = Vec3.add(current, Vec3.scale(d2, sign * options.stepLength));
        if (!Number.isFinite(next.x + next.y + next.z)) break;
        if (Vec3.magnitude(next) > options.boundRadius) break;
        points.push(next);
        current = next;
        arc += options.stepLength;
    }
    return points;
}

/**
 * 追踪场线。返回折线顶点 (双向时以种子点为界拼接, 种子点含在返回值中)。
 * 命中中性点 (F=0)、越界、超弧长/步数时停止 — 场线终止是正常现象而非错误。
 */
export function traceFieldLine(sources: readonly FieldSource[], options: FieldLineOptions): Vector3D[] {
    const resolved = {
        stepLength: options.stepLength ?? 0.02,
        maxArcLength: options.maxArcLength ?? 10,
        maxSteps: options.maxSteps ?? 2000,
        boundRadius: options.boundRadius ?? 100
    };
    if (!(resolved.stepLength > 0) || !Number.isFinite(resolved.stepLength)) {
        throw new Error(`弧长步长必须为正的有限数, 当前: ${resolved.stepLength}`);
    }
    const forward = traceOneDirection(sources, resolved, options.start, options.kind, 1);
    if (options.bidirectional === false) {
        return [options.start, ...forward];
    }
    const backward = traceOneDirection(sources, resolved, options.start, options.kind, -1);
    // backward 是远离种子的负向点列, 反转后接在种子之前
    return [...backward.reverse(), options.start, ...forward];
}

import type { Vector3D } from 'physics-core';

/**
 * 组合实验台坐标工具 — 纯函数, 不依赖 three.js (可单测)。
 *
 * 物理坐标: z 轴竖直向上 (物理教材惯例), x/y 张成水平桌面。
 * three.js 世界坐标: y 轴竖直向上。
 * 映射: 物理 (x, y, z) → 世界 (x, z, −y), 保持右手系且高度轴不翻转。
 */

/** three.js 世界坐标点 (结构与 THREE.Vector3 兼容) */
export interface WorldPoint {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

/** 物理坐标 → three.js 世界坐标 */
export function physicsToWorld(v: Vector3D): WorldPoint {
    return { x: v.x, y: v.z, z: -v.y };
}

/** three.js 世界坐标 → 物理坐标 (与 physicsToWorld 严格互逆) */
export function worldToPhysics(v: WorldPoint): Vector3D {
    return { x: v.x, y: -v.z, z: v.y };
}

/** 实验台网格吸附步长 (m) */
export const LAB_SNAP_STEP = 0.05;

/** 单值吸附到网格, 并清理浮点尾尘 (0.15000000000000002 → 0.15) */
export function snapToStep(value: number, step: number = LAB_SNAP_STEP): number {
    if (step <= 0 || !Number.isFinite(value)) return value;
    const snapped = Math.round(value / step) * step;
    return Number(snapped.toFixed(6));
}

/** 三维向量吸附 (通常只吸附水平 x/y, 高度 z 由器材类型决定) */
export function snapVector(v: Vector3D, step: number = LAB_SNAP_STEP): Vector3D {
    return { x: snapToStep(v.x, step), y: snapToStep(v.y, step), z: snapToStep(v.z, step) };
}

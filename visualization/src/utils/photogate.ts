// 挡光时间计算纯函数
// 根据轨迹 + 光电门位置 + 挡光片宽度，计算每个光电门的挡光时间和速度
//
// 物理原理：挡光片宽度 Δx，滑块以速度 v 通过光电门时挡光时间 Δt = Δx / v，因此 v = Δx / Δt
//
// 实现采用解析公式（对匀速运动），同时保留通用接口便于未来扩展至非匀速场景

import type { TrajectoryPoint } from 'physics-core';

export interface PhotogateConfig {
    /** 光电门位置数组（物理坐标 x，米），如 [0.3, 0.8] */
    gatePositions: number[];
    /** 挡光片宽度（米） */
    flagWidth: number;
}

export interface PhotogateMeasurement {
    /** 光电门索引（0-based） */
    gateIndex: number;
    /** 光电门物理位置 x（米） */
    gatePosition: number;
    /** 挡光开始时刻（秒，挡光片前沿到达光电门） */
    blockStartTime: number;
    /** 挡光结束时刻（秒，挡光片后沿离开光电门） */
    blockEndTime: number;
    /** 挡光时间 Δt（秒） */
    deltaT: number;
    /** 由 v = Δx / Δt 计算的瞬时速度（m/s，带符号，反映运动方向） */
    velocity: number;
    /** 速率 |v|（m/s） */
    speed: number;
    /** 该次测量是否有效（滑块是否真的经过此光电门） */
    valid: boolean;
}

/**
 * 根据匀速运动轨迹 + 光电门位置 + 挡光片宽度，计算每个光电门的挡光时间和速度。
 *
 * 解析法：
 *   设滑块位置 x(t) = x0 + v*t，挡光片占据 [x - Δx/2, x + Δx/2]
 *   光电门在固定位置 gate，挡光发生当 gate 落在挡光片范围内
 *   挡光开始：x(t) ± Δx/2 = gate（取决于运动方向）
 *   挡光结束：x(t) ∓ Δx/2 = gate
 *   Δt = Δx / |v|，v = ±Δx / Δt（符号由运动方向决定）
 *
 * 对非匀速场景，可改用轨迹二分查找实现，本函数保留通用接口以便扩展。
 */
export function computePhotogateMeasurements(
    trajectory: TrajectoryPoint[],
    config: PhotogateConfig
): PhotogateMeasurement[] {
    if (trajectory.length === 0 || config.gatePositions.length === 0) {
        return [];
    }

    // 提取匀速运动参数：取轨迹首末点的速度和位置
    const p0 = trajectory[0]!;
    const pLast = trajectory[trajectory.length - 1]!;
    const x0 = p0.position.x;
    const v = p0.velocity.x; // 匀速运动速度恒定

    if (Math.abs(v) < 1e-9) {
        // 速度为 0，所有光电门都无效
        return config.gatePositions.map((gatePosition, gateIndex) => ({
            gateIndex,
            gatePosition,
            blockStartTime: Infinity,
            blockEndTime: Infinity,
            deltaT: Infinity,
            velocity: 0,
            speed: 0,
            valid: false
        }));
    }

    // 轨迹的物理时间范围
    const tMin = p0.t;
    const tMax = pLast.t;

    return config.gatePositions.map((gatePosition, gateIndex) => {
        // 挡光片前沿/后沿到达 gate 的时刻
        // 设挡光片宽度 Δx，挡光片左右边界 [x_center - Δx/2, x_center + Δx/2]
        // 当 v > 0：前沿是右边（x + Δx/2），后沿是左边（x - Δx/2）
        // 当 v < 0：前沿是左边（x - Δx/2），后沿是右边（x + Δx/2）
        // 但用 min/max 可统一处理
        const t1 = (gatePosition - config.flagWidth / 2 - x0) / v;
        const t2 = (gatePosition + config.flagWidth / 2 - x0) / v;
        const blockStartTime = Math.min(t1, t2);
        const blockEndTime = Math.max(t1, t2);
        const deltaT = blockEndTime - blockStartTime;

        // 检查挡光是否在轨迹时间范围内
        const withinRange = blockStartTime >= tMin - deltaT && blockEndTime <= tMax + deltaT;
        const valid = withinRange && deltaT > 0 && Number.isFinite(deltaT);

        return {
            gateIndex,
            gatePosition,
            blockStartTime,
            blockEndTime,
            deltaT: valid ? deltaT : NaN,
            velocity: valid ? v : NaN,
            speed: valid ? Math.abs(v) : NaN,
            valid
        };
    });
}

/**
 * 给定当前时间 currentTime，判断每个光电门当前是否处于挡光状态。
 * 用于驱动 LED 闪烁动画。
 */
export function getBlockedGateIndices(measurements: PhotogateMeasurement[], currentTime: number): Set<number> {
    const result = new Set<number>();
    for (const m of measurements) {
        if (!m.valid) continue;
        if (currentTime >= m.blockStartTime && currentTime <= m.blockEndTime) {
            result.add(m.gateIndex);
        }
    }
    return result;
}

/**
 * 根据当前时间，计算毫秒计当前应显示的数值。
 * - 挡光进行中：显示已挡光时长（实时增长）
 * - 挡光结束后：锁定显示 Δt
 * - 挡光开始前：显示 null（毫秒计显示 "----"）
 */
export function getTimerDisplayValue(measurement: PhotogateMeasurement, currentTime: number): number | null {
    if (!measurement.valid) return null;

    if (currentTime < measurement.blockStartTime) {
        return null;
    }
    if (currentTime >= measurement.blockEndTime) {
        return measurement.deltaT;
    }
    // 挡光进行中，实时增长
    return currentTime - measurement.blockStartTime;
}

/**
 * 计算由 Δt 反推的速度（用于毫秒计面板的"v 显示"）。
 * 挡光结束后给出确定值，挡光中给出当前实时估计值。
 */
export function getTimerDisplayVelocity(
    measurement: PhotogateMeasurement,
    currentTime: number,
    flagWidth: number
): number | null {
    if (!measurement.valid) return null;

    if (currentTime < measurement.blockStartTime) {
        return null;
    }
    if (currentTime >= measurement.blockEndTime) {
        return flagWidth / measurement.deltaT;
    }
    // 挡光进行中
    const elapsed = currentTime - measurement.blockStartTime;
    if (elapsed < 1e-6) return null;
    return flagWidth / elapsed;
}

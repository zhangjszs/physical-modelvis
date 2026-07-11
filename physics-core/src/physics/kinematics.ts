/**
 * 运动学公式 — 纯函数工具集
 *
 * 集中管理散落各模型的基础运动学公式, 避免同一公式在多处手写导致漂移.
 */

import type { TrajectoryPoint } from '../types/result.js';

/**
 * 动能: KE = 1/2 * m * v^2
 *
 * @param mass  质量 (kg)
 * @param speed 速率 (m/s)
 * @returns 动能 (J)
 */
export function kineticEnergy(mass: number, speed: number): number {
    return 0.5 * mass * speed * speed;
}

/**
 * 轨迹采样脚手架 — 解析解模型的公共循环抽出
 *
 * 大量解析解模型共享同一条形如:
 *   const dt = duration / sampleCount;
 *   for (let i = 0; i <= sampleCount; i++) {
 *     const t = i * dt;
 *     // 各模型按 t 计算 position / velocity / acceleration / 能量
 *     trajectory.push({ t, ... });
 *   }
 *
 * 本函数接管 "dt 计算 + 循环头 + push" 这三行样板, 把随模型变化的部分
 * 收缩到 `sampleAt(t)` 回调内. 数值结果与手写循环逐帧一致 (t = i*dt 等价).
 *
 * 数值一致性约定: t 严格按 i * dt 产生, 与历史手写循环公式相同,
 * 因此对同一 sampleAt 产出逐位相同的 TrajectoryPoint 数组.
 *
 * 不适用的模型: 数值积分器 (orbital / double-pendulum / forced-vibration 等)
 * 依赖跨帧状态 (r, v, a 递推), 无法表达为纯 t -> point 的回调, 保持手写.
 */
export interface SampleTrajectoryOptions {
    /** 采样点数 (含首尾, 实际帧数 = sampleCount + 1) */
    readonly sampleCount: number;
    /** 仿真时长 (s) */
    readonly duration: number;
    /**
     * 按时间 t 计算该帧的完整轨迹点 (不含 t, 由脚手架填入).
     * 回调须为纯函数 (仅依赖 t), 否则帧序会影响结果.
     */
    readonly sampleAt: (t: number) => Omit<TrajectoryPoint, 't'>;
}

export function sampleTrajectory({ sampleCount, duration, sampleAt }: SampleTrajectoryOptions): TrajectoryPoint[] {
    const dt = duration / sampleCount;
    const trajectory: TrajectoryPoint[] = [];
    trajectory.length = sampleCount + 1;
    for (let i = 0; i <= sampleCount; i++) {
        const t = i * dt;
        trajectory[i] = { t, ...sampleAt(t) };
    }
    return trajectory;
}

import type { TrajectoryPoint } from 'physics-core';

/** 根据时间查找最近的帧索引 */
export function findFrameIndex(trajectories: TrajectoryPoint[][], t: number): number {
    if (!trajectories[0] || trajectories[0].length === 0) return 0;
    const points = trajectories[0];
    let lo = 0;
    let hi = points.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (points[mid]!.t < t) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

/** 在两个帧之间插值 */
export function interpolateFrame(p0: TrajectoryPoint, p1: TrajectoryPoint, t: number): TrajectoryPoint {
    if (p0.t === p1.t) return p0;
    const alpha = (t - p0.t) / (p1.t - p0.t);
    return {
        t,
        position: {
            x: p0.position.x + alpha * (p1.position.x - p0.position.x),
            y: p0.position.y + alpha * (p1.position.y - p0.position.y)
        },
        velocity: {
            x: p0.velocity.x + alpha * (p1.velocity.x - p0.velocity.x),
            y: p0.velocity.y + alpha * (p1.velocity.y - p0.velocity.y)
        },
        acceleration:
            p0.acceleration && p1.acceleration
                ? {
                      x: p0.acceleration.x + alpha * (p1.acceleration.x - p0.acceleration.x),
                      y: p0.acceleration.y + alpha * (p1.acceleration.y - p0.acceleration.y)
                  }
                : p0.acceleration,
        kineticEnergy:
            p0.kineticEnergy != null && p1.kineticEnergy != null
                ? p0.kineticEnergy + alpha * (p1.kineticEnergy - p0.kineticEnergy)
                : p0.kineticEnergy,
        potentialEnergy:
            p0.potentialEnergy != null && p1.potentialEnergy != null
                ? p0.potentialEnergy + alpha * (p1.potentialEnergy - p0.potentialEnergy)
                : p0.potentialEnergy
    };
}

/** 获取总时长 */
export function getTotalDuration(trajectories: TrajectoryPoint[][]): number {
    if (!trajectories[0] || trajectories[0].length === 0) return 0;
    const points = trajectories[0];
    return points[points.length - 1]!.t;
}

/**
 * 静态图表/工具场景的演示时间轴长度（秒）。
 * 这类场景的模型只输出一个静止占位点（totalDuration=0），播放按钮和时间轴原本永远停在 0；
 * 统一给一个短演示轴，让 2D 板书的装饰性扫描点、读数随时间变化的场景可播放。
 * 这是纯展示层时长，不参与任何物理计算。
 */
export const STATIC_SCENE_DEMO_DURATION_S = 6;

/**
 * 低于该时长的轨迹视为静态占位（如安培力模型输出 7e-11s、霍尔元件 1e-6s）；
 * 真实短时仿真（电磁复合场/磁场 0.01s）仍保留引擎时长，避免改变其物理时间轴。
 */
export const MIN_PLAYABLE_DURATION_S = 1e-4;

/** 播放控件使用的时长：有真实运动轨迹用引擎时长，静态/近零时长回退到演示时长 */
export function getPlaybackDuration(trajectories: TrajectoryPoint[][]): number {
    const total = getTotalDuration(trajectories);
    return total >= MIN_PLAYABLE_DURATION_S ? total : STATIC_SCENE_DEMO_DURATION_S;
}

/** 获取时间步长 */
export function getTimeStep(trajectories: TrajectoryPoint[][]): number {
    if (!trajectories[0] || trajectories[0].length < 2) return 0.01;
    return trajectories[0][1]!.t - trajectories[0][0]!.t;
}

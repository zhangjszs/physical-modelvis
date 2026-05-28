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
export function interpolateFrame(
  p0: TrajectoryPoint,
  p1: TrajectoryPoint,
  t: number,
): TrajectoryPoint {
  if (p0.t === p1.t) return p0;
  const alpha = (t - p0.t) / (p1.t - p0.t);
  return {
    t,
    position: {
      x: p0.position.x + alpha * (p1.position.x - p0.position.x),
      y: p0.position.y + alpha * (p1.position.y - p0.position.y),
    },
    velocity: {
      x: p0.velocity.x + alpha * (p1.velocity.x - p0.velocity.x),
      y: p0.velocity.y + alpha * (p1.velocity.y - p0.velocity.y),
    },
    acceleration: p0.acceleration && p1.acceleration ? {
      x: p0.acceleration.x + alpha * (p1.acceleration.x - p0.acceleration.x),
      y: p0.acceleration.y + alpha * (p1.acceleration.y - p0.acceleration.y),
    } : p0.acceleration,
    kineticEnergy: p0.kineticEnergy != null && p1.kineticEnergy != null
      ? p0.kineticEnergy + alpha * (p1.kineticEnergy - p0.kineticEnergy)
      : p0.kineticEnergy,
    potentialEnergy: p0.potentialEnergy != null && p1.potentialEnergy != null
      ? p0.potentialEnergy + alpha * (p1.potentialEnergy - p0.potentialEnergy)
      : p0.potentialEnergy,
  };
}

/** 获取总时长 */
export function getTotalDuration(trajectories: TrajectoryPoint[][]): number {
  if (!trajectories[0] || trajectories[0].length === 0) return 0;
  const points = trajectories[0];
  return points[points.length - 1]!.t;
}

/** 获取时间步长 */
export function getTimeStep(trajectories: TrajectoryPoint[][]): number {
  if (!trajectories[0] || trajectories[0].length < 2) return 0.01;
  return trajectories[0][1]!.t - trajectories[0][0]!.t;
}

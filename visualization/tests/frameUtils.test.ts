import { describe, it, expect } from 'vitest';
import { findFrameIndex, interpolateFrame, getTotalDuration, getTimeStep } from '../src/utils/frameUtils';
import type { TrajectoryPoint } from 'physics-core';

const makePoints = (count: number, dt = 0.01): TrajectoryPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    t: i * dt,
    position: { x: i * dt, y: 0 },
    velocity: { x: 1, y: 0 },
    acceleration: { x: 0, y: -9.8 },
    kineticEnergy: 0.5,
    potentialEnergy: 0,
  }));

describe('frameUtils', () => {
  it('findFrameIndex returns correct index', () => {
    const points = makePoints(100);
    const trajectories = [points];
    expect(findFrameIndex(trajectories, 0)).toBe(0);
    expect(findFrameIndex(trajectories, 0.5)).toBe(50);
    expect(findFrameIndex(trajectories, 0.99)).toBe(99);
  });

  it('findFrameIndex clamps to bounds', () => {
    const points = makePoints(10);
    const trajectories = [points];
    expect(findFrameIndex(trajectories, -1)).toBe(0);
    expect(findFrameIndex(trajectories, 100)).toBe(9);
  });

  it('interpolateFrame returns exact frame at boundary', () => {
    const points = makePoints(10);
    const result = interpolateFrame(points[3]!, points[4]!, 0.03);
    expect(result.t).toBe(0.03);
    expect(result.position.x).toBeCloseTo(0.03);
  });

  it('interpolateFrame interpolates linearly', () => {
    const p0: TrajectoryPoint = { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
    const p1: TrajectoryPoint = { t: 1, position: { x: 10, y: 20 }, velocity: { x: 10, y: 20 } };
    const mid = interpolateFrame(p0, p1, 0.5);
    expect(mid.position.x).toBeCloseTo(5);
    expect(mid.position.y).toBeCloseTo(10);
  });

  it('getTotalDuration returns last time', () => {
    const points = makePoints(50, 0.02);
    expect(getTotalDuration([points])).toBeCloseTo(0.98);
  });

  it('getTotalDuration returns 0 for empty', () => {
    expect(getTotalDuration([[]])).toBe(0);
    expect(getTotalDuration([])).toBe(0);
  });

  it('getTimeStep returns dt', () => {
    const points = makePoints(100, 0.005);
    expect(getTimeStep([points])).toBeCloseTo(0.005);
  });
});

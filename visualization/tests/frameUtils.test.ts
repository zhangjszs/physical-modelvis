import { describe, it, expect } from 'vitest';
import {
    findFrameIndex,
    interpolateFrame,
    getTotalDuration,
    getPlaybackDuration,
    getTimeStep,
    STATIC_SCENE_DEMO_DURATION_S
} from '../src/utils/frameUtils';
import type { TrajectoryPoint } from 'physics-core';

const makePoints = (count: number, dt = 0.01): TrajectoryPoint[] =>
    Array.from({ length: count }, (_, i) => ({
        t: i * dt,
        position: { x: i * dt, y: 0 },
        velocity: { x: 1, y: 0 },
        acceleration: { x: 0, y: -9.8 },
        kineticEnergy: 0.5,
        potentialEnergy: 0
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

    it('getPlaybackDuration: 运动场景用引擎时长, 静态/近零时长回退演示时长', () => {
        const points = makePoints(50, 0.02);
        expect(getPlaybackDuration([points])).toBeCloseTo(0.98);
        const single: TrajectoryPoint = { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
        expect(getPlaybackDuration([[single]])).toBe(STATIC_SCENE_DEMO_DURATION_S);
        expect(getPlaybackDuration([[]])).toBe(STATIC_SCENE_DEMO_DURATION_S);
        expect(getPlaybackDuration([])).toBe(STATIC_SCENE_DEMO_DURATION_S);
        // 真实短时仿真（0.01s）必须保留引擎时长，不能被演示时长覆盖
        const shortReal: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
            { t: 0.01, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
        ];
        expect(getPlaybackDuration([shortReal])).toBeCloseTo(0.01);
        // 安培力/洛伦兹力等演示模型会输出 7e-11s 这类近零时长
        const nearZero: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
            { t: 7.147e-11, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
        ];
        expect(getPlaybackDuration([nearZero])).toBe(STATIC_SCENE_DEMO_DURATION_S);
    });

    it('getTimeStep returns dt', () => {
        const points = makePoints(100, 0.005);
        expect(getTimeStep([points])).toBeCloseTo(0.005);
    });
});

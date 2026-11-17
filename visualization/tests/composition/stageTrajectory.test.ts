import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import type { CompositionSimResult } from 'physics-core';
import { syncStageTrajectoryResult } from '../../src/components/composition/stageTrajectory';

function makeValidResult(): CompositionSimResult {
    return {
        completed: true,
        stepCount: 100,
        warnings: [],
        trajectory: [
            { t: 0, position: { x: 0, y: 0, z: 0.2 }, velocity: { x: 1, y: 0, z: 0 }, kineticEnergy: 0.5 },
            { t: 0.5, position: { x: 0.5, y: 0, z: 0.2 }, velocity: { x: 1, y: 0, z: 0 }, kineticEnergy: 0.5 },
            { t: 1.5, position: { x: 1.5, y: 0, z: 0.2 }, velocity: { x: 1, y: 0, z: 0 }, kineticEnergy: 0.5 }
        ]
    };
}

describe('syncStageTrajectoryResult (#190 舞台轨迹与回放同步)', () => {
    it('合法结果显示轨迹与粒子球，清空为 null 时立即隐藏、停播并归零游标', () => {
        const trajectoryLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial());
        const particleBall = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial());
        const isPlayingRef = { current: true };
        const playheadRef = { current: 0.85 };
        const dirtyRef = { current: false };
        const setTrajectoryDuration = vi.fn();
        const setHasTrajectory = vi.fn();
        const setIsPlaying = vi.fn();
        const setCurrentTime = vi.fn();

        const targets = {
            trajectoryLine,
            particleBall,
            isPlayingRef,
            playheadRef,
            dirtyRef,
            setTrajectoryDuration,
            setHasTrajectory,
            setIsPlaying,
            setCurrentTime
        };

        // 1. 合法轨迹：显示并归零游标
        const loaded = syncStageTrajectoryResult(makeValidResult(), targets);
        expect(loaded.trajectory).toHaveLength(3);
        expect(loaded.duration).toBe(1.5);
        expect(trajectoryLine.visible).toBe(true);
        expect(particleBall.visible).toBe(true);
        expect(playheadRef.current).toBe(0);
        expect(setHasTrajectory).toHaveBeenLastCalledWith(true);
        expect(setTrajectoryDuration).toHaveBeenLastCalledWith(1.5);
        expect(setCurrentTime).toHaveBeenLastCalledWith(0);

        // 模拟正在播放至 t=0.9s 后触发校验失败 → result=null
        isPlayingRef.current = true;
        playheadRef.current = 0.9;
        dirtyRef.current = false;

        const cleared = syncStageTrajectoryResult(null, targets);
        expect(cleared.trajectory).toHaveLength(0);
        expect(trajectoryLine.visible).toBe(false);
        expect(particleBall.visible).toBe(false);
        expect(isPlayingRef.current).toBe(false);
        expect(playheadRef.current).toBe(0);
        expect(dirtyRef.current).toBe(true);
        expect(setHasTrajectory).toHaveBeenLastCalledWith(false);
        expect(setIsPlaying).toHaveBeenLastCalledWith(false);
        expect(setCurrentTime).toHaveBeenLastCalledWith(0);
    });
});

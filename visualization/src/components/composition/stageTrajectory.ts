import * as THREE from 'three';
import type { CompositionSimResult, TrajectoryPoint3D } from 'physics-core';
import { physicsToWorld } from '../../utils/compositionCoords';

export interface StageTrajectoryTargets {
    trajectoryLine: THREE.Line;
    particleBall: THREE.Mesh;
    isPlayingRef: { current: boolean };
    playheadRef: { current: number };
    dirtyRef: { current: boolean };
    setTrajectoryDuration: (dur: number) => void;
    setHasTrajectory: (has: boolean) => void;
    setIsPlaying: (playing: boolean) => void;
    setCurrentTime: (t: number) => void;
}

/** 同步 3D 轨迹几何体、粒子球可见性及回放状态 (result 无效/清空时立即隐藏并停播归零) */
export function syncStageTrajectoryResult(
    result: CompositionSimResult | null,
    targets: StageTrajectoryTargets
): { trajectory: TrajectoryPoint3D[]; duration: number } {
    const trajectory = result?.trajectory ?? [];
    const hasTraj = trajectory.length > 1;
    const duration = hasTraj ? trajectory[trajectory.length - 1]!.t : 1;

    targets.setTrajectoryDuration(duration);
    targets.setHasTrajectory(hasTraj);

    if (hasTraj) {
        const positions = new Float32Array(trajectory.length * 3);
        trajectory.forEach((p, i) => {
            const w = physicsToWorld(p.position);
            positions[i * 3] = w.x;
            positions[i * 3 + 1] = w.y;
            positions[i * 3 + 2] = w.z;
        });
        targets.trajectoryLine.geometry.dispose();
        targets.trajectoryLine.geometry = new THREE.BufferGeometry();
        targets.trajectoryLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        targets.trajectoryLine.visible = true;
        targets.particleBall.visible = true;
        targets.playheadRef.current = 0;
        targets.setCurrentTime(0);
        const startPos = physicsToWorld(trajectory[0]!.position);
        targets.particleBall.position.set(startPos.x, startPos.y, startPos.z);
    } else {
        targets.trajectoryLine.visible = false;
        targets.particleBall.visible = false;
        targets.isPlayingRef.current = false;
        targets.setIsPlaying(false);
        targets.playheadRef.current = 0;
        targets.setCurrentTime(0);
    }

    targets.dirtyRef.current = true;
    return { trajectory, duration };
}

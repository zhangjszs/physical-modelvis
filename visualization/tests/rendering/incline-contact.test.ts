import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import type { InclinedPlaneHandles } from '../../src/components/simulation3d/equipment/inclinedPlane';
import { loadAllScenes, getSceneSync } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import { inclineRig, inclineUnitsPerMeter } from '../../src/components/simulation3d/rigs/inclineRig';
import { findFrameIndex, interpolateFrame } from '../../src/utils/frameUtils';

beforeAll(loadAllScenes);

function simulate(overrides: Record<string, number> = {}) {
    const config = getSceneSync('inclined-plane')!;
    const params = Object.fromEntries(config.parameters.map(p => [p.name, p.value]));
    Object.assign(params, overrides);
    const { result, error } = runSceneSimulation(config, params);
    if (!result || error) throw new Error(error ?? '斜面引擎结果缺失');
    return { params, result };
}

function panelOf(handles: unknown) {
    // buildEquipment 的 unknown 句柄由本测试选定的真实 inclineRig 产生。
    const rigHandles = handles as { planeHandles: InclinedPlaneHandles };
    rigHandles.planeHandles.panel.geometry.computeBoundingBox();
    return rigHandles.planeHandles.panel;
}

function sampleAt(result: SimulationResult, time: number) {
    const points = result.trajectories[0]!;
    const index = findFrameIndex(result.trajectories, time);
    return interpolateFrame(points[index]!, points[Math.min(index + 1, points.length - 1)]!, time);
}

describe('#158 真实引擎采样与斜面板接触', () => {
    it.each([false, true])('update=%s 后球心在实际板上表面外一个球半径处', update => {
        const { params, result } = simulate();
        const scene = new THREE.Scene();
        const built = inclineRig.buildEquipment(scene, params, result);
        scene.add(built.group);
        const panel = panelOf(built.handles);
        if (update) inclineRig.updateEquipment(built.handles, params, result);
        scene.updateMatrixWorld(true);
        const center = inclineRig.getVisualPosition(result.trajectories[0]![0]!.position, params, result);
        const local = panel.worldToLocal(center.clone());
        expect(local.y - panel.geometry.boundingBox!.max.y).toBeCloseTo(inclineRig.ballRadius!, 5);
    });

    it('t0/.5/1/3 的真实有向切向位移等比映射，无额外 cos 因子', () => {
        const { params, result } = simulate();
        const scene = new THREE.Scene();
        const built = inclineRig.buildEquipment(scene, params, result);
        scene.add(built.group);
        inclineRig.updateEquipment(built.handles, params, result);
        scene.updateMatrixWorld(true);
        const panel = panelOf(built.handles);
        const tangent = new THREE.Vector3(1, 0, 0).transformDirection(panel.matrixWorld);
        const first = sampleAt(result, 0);
        const initial = inclineRig.getVisualPosition(first.position, params, result);
        for (const time of [0.5, 1, 3]) {
            const frame = sampleAt(result, time);
            const displacement = new THREE.Vector3(
                frame.position.x - first.position.x,
                frame.position.y - first.position.y,
                0
            );
            const visual = inclineRig.getVisualPosition(frame.position, params, result).sub(initial);
            // 斜面 rig 按「沿切向位移 × 米→世界换算」映射 (斜面是倾斜的,
            // 物块必须沿切向移动, 而不是引擎笛卡尔坐标直接平移)。
            expect(visual.dot(tangent)).toBeCloseTo(
                displacement.dot(tangent) * inclineUnitsPerMeter(params, result),
                6
            );
        }
    });

    it('5°/30°/85°变角、静止、减速及负向采样均全程受支撑且不被地面夹平', () => {
        const first = simulate();
        const scene = new THREE.Scene();
        const built = inclineRig.buildEquipment(scene, first.params, first.result);
        scene.add(built.group);
        const panel = panelOf(built.handles);
        for (const overrides of [
            { theta: 5, mu: 0, v0: 0 },
            { theta: 85, mu: 0, v0: 0 },
            { theta: 30, mu: 0, v0: 0 },
            { theta: 30, mu: 1, v0: 0 },
            { theta: 5, mu: 1, v0: 10 },
            { theta: 30, mu: 0, v0: -10 }
        ]) {
            const { params, result } = simulate(overrides);
            inclineRig.updateEquipment(built.handles, params, result);
            scene.updateMatrixWorld(true);
            const bounds = panel.geometry.boundingBox!;
            const tangent = new THREE.Vector3(1, 0, 0).transformDirection(panel.matrixWorld);
            const initial = inclineRig.getVisualPosition(result.trajectories[0]![0]!.position, params, result);
            const origin = inclineRig.getOrigin(params, result);
            expect(origin.distanceTo(initial)).toBeLessThan(1e-9);
            for (const point of result.trajectories[0]!) {
                const center = inclineRig.getVisualPosition(point.position, params, result);
                const local = panel.worldToLocal(center.clone());
                expect(local.y - bounds.max.y).toBeCloseTo(inclineRig.ballRadius!, 5);
                expect(local.x).toBeGreaterThanOrEqual(bounds.min.x);
                expect(local.x).toBeLessThanOrEqual(bounds.max.x);
                expect(center.y - inclineRig.ballRadius!).toBeGreaterThan(0);
                // 位移沿斜面切向, 比例 = 米→世界换算 (无额外 cos 因子)
                const engineDisplacement = new THREE.Vector3(
                    point.position.x - result.trajectories[0]![0]!.position.x,
                    point.position.y - result.trajectories[0]![0]!.position.y,
                    0
                );
                const visualDisplacement = center.sub(initial);
                const scale = inclineUnitsPerMeter(params, result);
                expect(visualDisplacement.dot(tangent)).toBeCloseTo(engineDisplacement.dot(tangent) * scale, 6);
                // 垂直切向的分量必须为 0: 物块始终贴在板面上
                const normal = new THREE.Vector3(0, 1, 0).transformDirection(panel.matrixWorld);
                expect(visualDisplacement.dot(normal)).toBeCloseTo(0, 6);
            }
        }
    });

    it('参数已变但防抖重算结果未到时，板和完整轨迹仍使用同份结果角度', () => {
        const { params, result } = simulate();
        const scene = new THREE.Scene();
        const built = inclineRig.buildEquipment(scene, params, result);
        scene.add(built.group);
        const panel = panelOf(built.handles);
        const pendingParams = { ...params, theta: 5 };
        inclineRig.updateEquipment(built.handles, pendingParams, result);
        scene.updateMatrixWorld(true);
        for (const point of result.trajectories[0]!) {
            const local = panel.worldToLocal(inclineRig.getVisualPosition(point.position, pendingParams, result));
            expect(local.y - panel.geometry.boundingBox!.max.y).toBeCloseTo(inclineRig.ballRadius!, 5);
        }
    });
});

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { verticalMotionRig, type VerticalHandles } from '../../src/components/simulation3d/rigs/verticalMotionRig';
import { uniform_acceleratedScene } from '../../src/scenes/scenes/mechanics/uniform-accelerated';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';

const defaults = Object.fromEntries(uniform_acceleratedScene.parameters.map(p => [p.name, p.value]));

function build() {
    const scene = new THREE.Scene();
    const built = verticalMotionRig.buildEquipment(scene, defaults);
    scene.add(built.group);
    // 真实 verticalMotionRig.buildEquipment 的内部句柄，不来自外部数据。
    const handles = built.handles as VerticalHandles;
    scene.updateMatrixWorld(true);
    return { scene, handles };
}

describe('#157 实际释放架与接料面', () => {
    it('初始化及经过释放高度的整条球道与所有释放架实体保持净空', () => {
        const { scene, handles } = build();
        const radius = verticalMotionRig.ballRadius!;
        const solids = handles.launcherBase.children.filter(
            (child): child is THREE.Mesh => child instanceof THREE.Mesh
        );
        const release = verticalMotionRig.getOrigin(defaults);
        for (const mesh of solids) {
            const box = new THREE.Box3().setFromObject(mesh);
            expect(box.distanceToPoint(release) - radius).toBeGreaterThanOrEqual(-1e-6);
        }
        for (const height of [1, 20, 200]) {
            for (const v0y of [-10, 0, 20]) {
                for (const g of [9.8, 1.6]) {
                    const params = { ...defaults, height, v0y, g, duration: 28 };
                    verticalMotionRig.updateEquipment(handles, params);
                    scene.updateMatrixWorld(true);
                    const { result, error } = runSceneSimulation(uniform_acceleratedScene, params);
                    if (!result || error) throw new Error(error ?? '竖直运动结果缺失');
                    const boxes = solids.map(mesh => new THREE.Box3().setFromObject(mesh));
                    for (const point of result.trajectories[0]!) {
                        const center = verticalMotionRig.getVisualPosition(point.position, params);
                        for (const box of boxes) {
                            expect(box.distanceToPoint(center) - radius).toBeGreaterThanOrEqual(-1e-6);
                        }
                    }
                }
            }
        }
    });

    it('实际垫顶面与落地球底、整条轨迹及残影接触面重合，不侵入垫体', () => {
        const { handles } = build();
        const top = new THREE.Box3().setFromObject(handles.landingPad).max.y;
        const { result, error } = runSceneSimulation(uniform_acceleratedScene, defaults);
        if (!result || error) throw new Error(error ?? '竖直运动结果缺失');
        const points = result.trajectories[0]!;
        const radius = verticalMotionRig.ballRadius!;
        for (const point of points) {
            const center = verticalMotionRig.getVisualPosition(point.position, defaults);
            expect(center.y - radius - top).toBeGreaterThanOrEqual(-1e-7);
            if (point.position.y <= 0) expect(center.y - radius).toBeCloseTo(top, 7);
        }
        // 与舞台相同的九个残影采样；断言实际表面而非仅球心常量。
        for (let i = 0; i < 9; i++) {
            const point = points[Math.round((i / 8) * (points.length - 1))]!;
            const center = verticalMotionRig.getVisualPosition(point.position, defaults);
            expect(center.y - radius - top).toBeGreaterThanOrEqual(-1e-7);
        }
    });
});

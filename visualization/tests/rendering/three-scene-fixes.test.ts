/**
 * 三场景可视化修复回归测试（卫星轨道 / 匀速圆周 / 光电效应）
 *
 * 固化不变量：
 *   - 轨道中心抬到参考平面以上，且取景距离能完整容纳轨道 + 信息标牌；
 *   - 圆周运动小球半径随圆周半径等比缩放（不再出现球比轨道大）；
 *   - 光电效应装置自带持续动画，且只有 hν > W₀ 时光电子才可见。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import { orbitalRig } from '../../src/components/simulation3d/rigs/orbitalRig';
import { circularMotionRig } from '../../src/components/simulation3d/rigs/circularMotionRig';
import { photoelectricRig } from '../../src/components/simulation3d/rigs/photoelectricRig';
import { STAGE_CENTER_X } from '../../src/components/simulation3d/rigs/params';
import { getSceneSync, loadAllScenes } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';

function defaults(sceneId: string): Record<string, number> {
    const sc = getSceneSync(sceneId);
    const out: Record<string, number> = {};
    if (!sc || !('parameters' in sc)) return out;
    for (const p of (sc as { parameters: Array<{ name: string; value: number }> }).parameters ?? []) {
        out[p.name] = p.value;
    }
    return out;
}

beforeAll(async () => {
    await loadAllScenes();
});

describe('orbital rig: 轨道居中、离地、完整入镜', () => {
    let params: Record<string, number>;
    beforeAll(() => {
        params = defaults('orbital');
    });

    it('默认高度: 轨道最低点高于参考平面, 中心与舞台中心对齐', () => {
        const scene = new THREE.Scene();
        const built = orbitalRig.buildEquipment(scene, params, null);
        const handles = built.handles as { orbit: THREE.Line; center: THREE.Mesh };
        const pos = handles.orbit.geometry.getAttribute('position');
        let maxR = 0;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i) - STAGE_CENTER_X;
            const y = pos.getY(i);
            maxR = Math.max(maxR, Math.hypot(x, y - handles.center.position.y));
            expect(y, `轨道点 ${i} 不得低于参考平面`).toBeGreaterThanOrEqual(0.35 - 1e-6);
        }
        expect(maxR).toBeGreaterThan(1);
        const framing = orbitalRig.framing!(params, null)!;
        expect(framing.target[0]).toBeCloseTo(STAGE_CENTER_X, 6);
        expect(framing.target[1] - handles.center.position.y).toBeCloseTo(0.35, 6);
        // 竖直 FOV 45°：半高 = d·tan(22.5°) 必须容纳轨道半径 + 顶部标牌
        expect((framing.distance ?? 0) * Math.tan(Math.PI / 8)).toBeGreaterThan(maxR + 0.7);
        // 相机略高于目标，避免俯视时地面遮住轨道下沿
        expect(framing.position[1]).toBeGreaterThan(framing.target[1]);
    });

    it('卫星轨迹与轨道线共用同一比例尺 (t=0 归一化点落在轨道线上)', () => {
        const r0 = 6.771e6;
        const visual = orbitalRig.getVisualPosition({ x: r0, y: 0 }, params);
        const origin = orbitalRig.getOrigin(params);
        expect(visual.x).toBeCloseTo(origin.x, 5);
        expect(visual.y).toBeCloseTo(origin.y, 5);
    });

    it('各高度/速度比下轨道都不低于参考平面, 且取景能容纳整条轨道', () => {
        const cases: Array<Record<string, number>> = [
            { altitude: 200 },
            { altitude: 36000 },
            { altitude: 400, velocityFactor: 1.2 },
            { altitude: 400, velocityFactor: 0.5 }
        ];
        for (const c of cases) {
            const scene = new THREE.Scene();
            const built = orbitalRig.buildEquipment(scene, { ...params, ...c }, null);
            const handles = built.handles as { orbit: THREE.Line; center: THREE.Mesh };
            const pos = handles.orbit.geometry.getAttribute('position');
            let maxR = 0;
            for (let i = 0; i < pos.count; i++) {
                const y = pos.getY(i);
                maxR = Math.max(maxR, Math.hypot(pos.getX(i) - STAGE_CENTER_X, y - handles.center.position.y));
                expect(y, `${JSON.stringify(c)} 轨道点 ${i} 低于参考平面`).toBeGreaterThanOrEqual(0.35 - 1e-6);
            }
            const framing = orbitalRig.framing!({ ...params, ...c }, null)!;
            expect((framing.distance ?? 0) * Math.tan(Math.PI / 8)).toBeGreaterThan(maxR + 0.7);
        }
    });

    it('高度越高视觉轨道半径越大 (对数映射)', () => {
        const leo = orbitalRig.getOrigin({ altitude: 400 });
        const geo = orbitalRig.getOrigin({ altitude: 36000 });
        expect(geo.x - STAGE_CENTER_X).toBeGreaterThan(leo.x - STAGE_CENTER_X);
    });
});

describe('circular-motion rig: 小球/圆周比例', () => {
    let params: Record<string, number>;
    beforeAll(() => {
        params = defaults('circular-motion');
    });

    it('默认 r=1m: 球半径 < 轨道半径的 20%，环面水平且圆心在舞台中心', () => {
        const scene = new THREE.Scene();
        const built = circularMotionRig.buildEquipment(scene, params);
        const handles = built.handles as {
            ball: THREE.Mesh;
            geom: { r: number; ballRadius: number };
        };
        expect(handles.geom.r).toBeCloseTo(0.6, 6);
        expect(handles.geom.ballRadius).toBeGreaterThan(0.03);
        expect(handles.geom.ballRadius).toBeLessThan(handles.geom.r * 0.2);
        expect(handles.ball.scale.x).toBeCloseTo(handles.geom.ballRadius, 6);

        const right = circularMotionRig.getVisualPosition({ x: 1, y: 0 }, params);
        expect(right.x).toBeCloseTo(STAGE_CENTER_X + 0.6, 6);
        expect(right.z).toBeCloseTo(0, 6);
        const front = circularMotionRig.getVisualPosition({ x: 0, y: 1 }, params);
        expect(front.x).toBeCloseTo(STAGE_CENTER_X, 6);
        expect(front.z).toBeCloseTo(-0.6, 6);
        expect(right.y).toBeCloseTo(front.y, 6);
    });

    it('半径变化时球径等比跟随 (r=2m → 球径 ×2)', () => {
        const scene = new THREE.Scene();
        const built = circularMotionRig.buildEquipment(scene, params);
        const handles = built.handles as { geom: { r: number; ballRadius: number } };
        const r1 = handles.geom.ballRadius;
        circularMotionRig.updateEquipment(built.handles, { ...params, radius: 2 });
        expect(handles.geom.r).toBeCloseTo(1.2, 6);
        expect(handles.geom.ballRadius).toBeCloseTo(r1 * 2, 6);
        expect(handles.geom.ballRadius).toBeLessThan(handles.geom.r * 0.2);
    });

    it('圆锥摆模式使用 L·sinθ 作为有效半径', () => {
        const origin = circularMotionRig.getOrigin({ conicalMode: 1, ropeLength: 1, conicalAngle: 30 });
        const r = Math.hypot(origin.x - STAGE_CENTER_X, origin.z);
        expect(r).toBeCloseTo(0.5 * 0.6, 5);
    });

    it('圆锥摆 3D rig 使用引擎 effective radius，而不是 UI 的 radius=1.0', () => {
        const sc = getSceneSync('circular-motion')!;
        const conicalParams: Record<string, number> = {
            ...params,
            conicalMode: 1,
            ropeLength: 1,
            conicalAngle: 30
        };
        const { result, error } = runSceneSimulation(sc, conicalParams);
        expect(error).toBeNull();
        const mv = result!.diagnostics?.maxValues as Record<string, number> | undefined;
        expect(mv?.['radius']).toBeCloseTo(0.5, 6);
        const scene = new THREE.Scene();
        const built = circularMotionRig.buildEquipment(scene, conicalParams, result);
        const handles = built.handles as { geom: { rPhys: number; r: number; ballRadius: number } };
        expect(handles.geom.rPhys).toBeCloseTo(0.5, 6);
        expect(handles.geom.ballRadius).toBeLessThan(handles.geom.r * 0.2);
    });
});

describe('photoelectric rig: 持续动画 + 阈值判断', () => {
    let params: Record<string, number>;
    beforeAll(() => {
        params = defaults('photoelectric');
    });

    it('autoAnimate 开启, build 产出光子/光电子/说明标牌', () => {
        expect(photoelectricRig.autoAnimate).toBe(true);
        const scene = new THREE.Scene();
        const built = photoelectricRig.buildEquipment(scene, params);
        const handles = built.handles as {
            photons: THREE.Mesh[];
            electrons: THREE.Mesh[];
            readoutLabel: THREE.Sprite;
            stateLabel: THREE.Sprite;
            legend: THREE.Sprite;
        };
        expect(handles.photons.length).toBeGreaterThan(0);
        expect(handles.electrons.length).toBeGreaterThan(0);
        expect(handles.readoutLabel).toBeDefined();
        expect(handles.stateLabel).toBeDefined();
        expect(handles.legend).toBeDefined();
    });

    it('hν > W₀ 时光电子可见；低于极限频率时全部隐藏', () => {
        const scene = new THREE.Scene();
        const built = photoelectricRig.buildEquipment(scene, params);
        const handles = built.handles as { electrons: THREE.Mesh[]; photons: THREE.Mesh[] };
        const ballPos = new THREE.Vector3(STAGE_CENTER_X + 0.18, 1.3, 0);
        // 相位 2s → ν=700 THz > ν₀≈556 THz
        photoelectricRig.onAnimate!(built.handles, { time: 0, ballPos, params });
        expect(handles.electrons.some(e => e.visible)).toBe(true);
        // 相位 4.6s → ν≈420 THz < ν₀，无光电子
        photoelectricRig.onAnimate!(built.handles, { time: 4.6, ballPos, params });
        expect(handles.electrons.every(e => !e.visible)).toBe(true);
    });

    it('光子持续运动 (不同时刻位置不同)', () => {
        const scene = new THREE.Scene();
        const built = photoelectricRig.buildEquipment(scene, params);
        const handles = built.handles as { photons: THREE.Mesh[] };
        const ballPos = new THREE.Vector3(STAGE_CENTER_X + 0.18, 1.3, 0);
        photoelectricRig.onAnimate!(built.handles, { time: 0, ballPos, params });
        const x0 = handles.photons[0]!.position.x;
        photoelectricRig.onAnimate!(built.handles, { time: 0.3, ballPos, params });
        const x1 = handles.photons[0]!.position.x;
        expect(Math.abs(x1 - x0)).toBeGreaterThan(0.01);
    });

    it('场景时间轴 6s：2D 板书播放可推进（占位轨迹覆盖时长）', () => {
        const sc = getSceneSync('photoelectric')!;
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();
        const trajectory = result!.trajectories[0]!;
        expect(trajectory.length).toBeGreaterThan(1);
        expect(trajectory[trajectory.length - 1]!.t).toBeCloseTo(6, 6);
    });
});

/**
 * D5: 3D rig 契约测试 — buildEquipment 回归保护
 *
 * 背景: 3D 场景切换实测曾发现 3 个场景 CRASH (ErrorBoundary 触发),
 * 根因是 rig.buildEquipment 抛错 (几何参数越界 / 访问 undefined 属性)。
 * 本测试遍历 SCENE_TO_MODULE 全部 rig, 用空参数调用 buildEquipment,
 * 任何 rig 抛错都会被拦截 (默认参数路径必须健壮)。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import { loadSceneRig, SCENE_TO_MODULE } from '../../src/components/simulation3d/rigs/index';
import { getSceneSync, loadAllScenes } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import { findFrameIndex, interpolateFrame } from '../../src/utils/frameUtils';
import type { VerticalHandles } from '../../src/components/simulation3d/rigs/verticalMotionRig';

/** 从 SCENES 注册表取场景默认参数 (真实运行路径), 无注册时回退空对象 */
function defaultParams(sceneId: string): Record<string, number> {
    const sc = getSceneSync(sceneId);
    if (!sc || !('parameters' in sc)) return {};
    const out: Record<string, number> = {};
    for (const p of (sc as { parameters: Array<{ name: string; value: number }> }).parameters ?? []) {
        out[p.name] = p.value;
    }
    return out;
}

describe('3D rig 契约: buildEquipment 默认参数不抛错', () => {
    beforeAll(async () => {
        await loadAllScenes();
    });

    const sceneIds = Object.keys(SCENE_TO_MODULE);

    it(`覆盖 ${sceneIds.length} 个有 rig 的场景`, () => {
        expect(sceneIds.length).toBeGreaterThan(50);
    });

    for (const sceneId of sceneIds) {
        it(`buildEquipment 不抛错 (默认参数): ${sceneId}`, async () => {
            const rig = await loadSceneRig(sceneId);
            expect(rig, `rig 已注册 (${sceneId})`).toBeDefined();
            const scene = new THREE.Scene();
            const params = defaultParams(sceneId);
            let built: { group: THREE.Group; handles: unknown } | null = null;
            expect(() => {
                built = rig!.buildEquipment(scene, params);
            }).not.toThrow();
            expect(built).not.toBeNull();
            expect(built!.group).toBeInstanceOf(THREE.Group);
            expect(built!.handles).toBeTypeOf('object');
            // updateEquipment 同参数也不抛错
            expect(() => rig!.updateEquipment(built!.handles, params)).not.toThrow();
            // getVisualPosition / getOrigin 返回有限向量 (NaN/Infinity 拦截)
            const origin = rig!.getOrigin(params);
            expect(Number.isFinite(origin.x)).toBe(true);
            expect(Number.isFinite(origin.y)).toBe(true);
            const vp = rig!.getVisualPosition({ x: 0, y: 0 }, params);
            expect(Number.isFinite(vp.x)).toBe(true);
            expect(Number.isFinite(vp.y)).toBe(true);
            expect(Number.isFinite(vp.z)).toBe(true);
        }, 30000);
    }

    // 共享 rig 的场景对: 同 rig 对象被多个场景复用 (如 collisionRig 用于碰撞/动量/平抛碰撞)。
    // 场景切换瞬间参数会从场景 A 的默认值跳到场景 B 的默认值,
    // rig 必须对"参数差异"健壮 (不能在分支里漏建句柄)。
    it(`共享 rig 的场景用彼此参数不抛错 (交叉契约)`, async () => {
        const rigToScenes = new Map<string, string[]>();
        for (const sceneId of sceneIds) {
            const rig = await loadSceneRig(sceneId);
            const key = `${rig!.getOrigin.toString().slice(0, 60)}`; // rig 指纹: 函数体前缀
            if (!rigToScenes.has(key)) rigToScenes.set(key, []);
            rigToScenes.get(key)!.push(sceneId);
        }
        const groups = [...rigToScenes.values()].filter(g => g.length > 1);
        expect(groups.length).toBeGreaterThan(0);
        let checked = 0;
        for (const group of groups) {
            for (const a of group) {
                const rigA = await loadSceneRig(a);
                const paramsA = defaultParams(a);
                for (const b of group) {
                    const paramsB = defaultParams(b);
                    const scene = new THREE.Scene();
                    const built = rigA!.buildEquipment(scene, paramsA);
                    expect(() => rigA!.updateEquipment(built.handles, paramsB)).not.toThrow();
                    expect(Number.isFinite(rigA!.getOrigin(paramsB).x)).toBe(true);
                    const vp = rigA!.getVisualPosition({ x: 0, y: 0 }, paramsB);
                    expect(Number.isFinite(vp.x) && Number.isFinite(vp.y) && Number.isFinite(vp.z)).toBe(true);
                    checked++;
                }
            }
        }
        expect(checked).toBeGreaterThan(0);
    }, 60000);

    it('buildEquipment 对空参数与极端参数健壮 (不抛错/有限值)', async () => {
        const extreme: Record<string, number> = { NaN: NaN, inf: Infinity };
        for (const sceneId of sceneIds) {
            const rig = await loadSceneRig(sceneId);
            for (const params of [{}, extreme]) {
                const scene = new THREE.Scene();
                let built: { group: THREE.Group; handles: unknown } | null = null;
                expect(
                    () => {
                        built = rig!.buildEquipment(scene, params);
                    },
                    `buildEquipment(${sceneId}, ${JSON.stringify(params)})`
                ).not.toThrow();
                expect(() => rig!.updateEquipment(built!.handles, params), `updateEquipment(${sceneId})`).not.toThrow();
                const origin = rig!.getOrigin(params);
                expect(Number.isFinite(origin.x) && Number.isFinite(origin.y), `${sceneId} origin`).toBe(true);
            }
        }
    }, 60000);

    it('orbital: 引擎米级轨道坐标归一化到相机可见范围 (far=100, |x| < 10)', async () => {
        const rig = await loadSceneRig('orbital');
        // 引擎轨迹 r ≈ 6.4e6 m; 归一化后应落在 rig 椭圆线同一尺度 (GEO 轨道 = 2.0 world)
        for (const altitude of [400, 2000, 36000]) {
            const params = { altitude };
            const p = rig!.getVisualPosition({ x: (6371 + altitude) * 1000, y: 0 }, params);
            expect(Number.isFinite(p.x) && Number.isFinite(p.y), `altitude=${altitude}`).toBe(true);
            expect(Math.abs(p.x), `altitude=${altitude} 在可见范围`).toBeLessThan(10);
            expect(Math.abs(p.y)).toBeLessThan(10);
        }
    });

    describe('第一批 8 个重构 3D 实验标准化验收', () => {
        const batch1Scenes = [
            'newton-tube',
            'motion-composition',
            'transmission-belt',
            'vertical-circle',
            'centrifugal',
            'curve-condition',
            'curve-velocity-direction',
            'cavendish'
        ] as const;

        for (const sceneId of batch1Scenes) {
            it(`batch1 场景 ${sceneId}: buildEquipment / updateEquipment / onAnimate 完整生命周期测试`, async () => {
                const rig = await loadSceneRig(sceneId);
                expect(rig, `${sceneId} rig 已加载`).toBeDefined();
                const scene = new THREE.Scene();
                const params = defaultParams(sceneId);
                const built = rig!.buildEquipment(scene, params);
                expect(built.group).toBeInstanceOf(THREE.Group);
                expect(built.handles).toBeDefined();

                // updateEquipment 验证
                rig!.updateEquipment(built.handles, params);

                // getOrigin 与 getVisualPosition 初始点一致性验证
                const origin = rig!.getOrigin(params);
                const vp0 = rig!.getVisualPosition({ x: 0, y: 0 }, params);
                expect(Number.isFinite(origin.x) && Number.isFinite(origin.y) && Number.isFinite(origin.z)).toBe(true);
                expect(Number.isFinite(vp0.x) && Number.isFinite(vp0.y) && Number.isFinite(vp0.z)).toBe(true);

                // 特殊场景起点吻合断言
                if (sceneId === 'newton-tube' || sceneId === 'motion-composition') {
                    expect(Math.abs(origin.y - vp0.y)).toBeLessThan(1e-3);
                }

                // onAnimate 多帧随动执行验证 (t = 0, 0.5, 1.0)
                if (rig!.onAnimate) {
                    for (const t of [0, 0.5, 1.0]) {
                        const vp = rig!.getVisualPosition({ x: t, y: -t }, params);
                        expect(() => {
                            rig!.onAnimate!(built.handles, { time: t, ballPos: vp, params });
                        }).not.toThrow();
                    }
                }
            });
        }

        it('transmission-belt: 四种传动模式 (皮带/齿轮/摩擦轮/同轴) update & animate 均正常', async () => {
            const rig = await loadSceneRig('transmission-belt');
            const scene = new THREE.Scene();
            const built = rig!.buildEquipment(scene, { mode: 0, r1: 0.1, r2: 0.2, omega1: 10 });
            for (const mode of [0, 1, 2, 3]) {
                const params = { mode, r1: 0.1, r2: 0.2, omega1: 10 };
                rig!.updateEquipment(built.handles, params);
                expect(() => {
                    rig!.onAnimate!(built.handles, { time: 0.5, ballPos: new THREE.Vector3(0, 0, 0), params });
                }).not.toThrow();
            }
        });

        it('vertical-circle: 三种约束模式 (绳/杆/圆环) update & animate 均正常', async () => {
            const rig = await loadSceneRig('vertical-circle');
            const scene = new THREE.Scene();
            const built = rig!.buildEquipment(scene, { modelType: 0, length: 1, initialSpeed: 7.5 });
            for (const modelType of [0, 1, 2]) {
                const params = { modelType, length: 1, initialSpeed: 7.5 };
                rig!.updateEquipment(built.handles, params);
                expect(() => {
                    rig!.onAnimate!(built.handles, { time: 0.5, ballPos: new THREE.Vector3(0, 1.4, 0), params });
                }).not.toThrow();
            }
        });
    });

    describe('#157 uniform-accelerated (竖直运动) 真实 scene→engine→rig 几何与运动回归', () => {
        it('默认参数 (height=20, v0y=0, g=9.8): 落地前 t=0/0.5/1s 球心明显下移且视觉位移严格等于 (y(t)-y(0))*worldScale，落地后主球/轨迹/残影同处接触平面无地下点', async () => {
            const sceneCfg = getSceneSync('uniform-accelerated')!;
            expect(sceneCfg).toBeDefined();
            expect(sceneCfg.name).toBe('竖直运动（自由落体/上抛）');
            const params = defaultParams('uniform-accelerated');
            expect(params['height']).toBe(20);
            expect(params['v0y']).toBe(0);
            expect(params['g']).toBeCloseTo(9.8, 5);

            const { result, error } = runSceneSimulation(sceneCfg, params);
            expect(error).toBeNull();
            expect(result).not.toBeNull();
            const traj = result!.trajectories[0]!;
            expect(traj.length).toBeGreaterThan(100);

            const rig = (await loadSceneRig('uniform-accelerated'))!;
            const worldScale = rig.worldScale ?? 0.16;
            const ballRadius = rig.ballRadius ?? 0.22;

            const sampleAt = (t: number) => {
                const idx = findFrameIndex(result!.trajectories, t);
                const p0 = traj[idx]!;
                const p1 = traj[Math.min(idx + 1, traj.length - 1)]!;
                const frame = interpolateFrame(p0, p1, t);
                const vis = rig.getVisualPosition(frame.position, params);
                return { frame, vis };
            };

            const s0 = sampleAt(0);
            const s05 = sampleAt(0.5);
            const s10 = sampleAt(1.0);

            // 落地前球心必须明显下移 (拒绝全部压平在 0.22 的旧回归)
            expect(s0.vis.y).toBeCloseTo(ballRadius + 20 * worldScale, 6);
            expect(s05.vis.y).toBeLessThan(s0.vis.y - 0.15);
            expect(s10.vis.y).toBeLessThan(s05.vis.y - 0.5);

            // 视觉位移严格等于引擎位移 * worldScale
            expect(s05.vis.y - s0.vis.y).toBeCloseTo((s05.frame.position.y - s0.frame.position.y) * worldScale, 6);
            expect(s10.vis.y - s0.vis.y).toBeCloseTo((s10.frame.position.y - s0.frame.position.y) * worldScale, 6);

            // 完整轨迹映射与 9 个残影采样点: 落地后 (t >= sqrt(40/9.8) ≈ 2.02s) 全部停在接触平面 ballRadius，无地下残影
            const visualPoints = traj.map(p => rig.getVisualPosition(p.position, params));
            for (const vp of visualPoints) {
                expect(vp.y).toBeGreaterThanOrEqual(ballRadius - 1e-9);
            }
            const sLanded = sampleAt(2.5);
            expect(sLanded.frame.position.y).toBeLessThan(0);
            expect(sLanded.vis.y).toBeCloseTo(ballRadius, 6);

            const ghostIndices = Array.from({ length: 9 }, (_, i) =>
                Math.min(visualPoints.length - 1, Math.round((i / 8) * (visualPoints.length - 1)))
            );
            const landedGhostYs = ghostIndices.filter(idx => traj[idx]!.t >= 2.1).map(idx => visualPoints[idx]!.y);
            expect(landedGhostYs.length).toBeGreaterThan(0);
            for (const gy of landedGhostYs) {
                expect(gy).toBeCloseTo(ballRadius, 6);
            }
        });

        it('参数矩阵覆盖 (height=1/20, v0y=-10/0/20, g=9.8/1.6): 上抛先升后降、下抛单调向下，释放点/高度尺/最高点与真实坐标一致且 v0y<=0 无负上升时间', async () => {
            const sceneCfg = getSceneSync('uniform-accelerated')!;
            const rig = (await loadSceneRig('uniform-accelerated'))!;
            const worldScale = rig.worldScale ?? 0.16;
            const ballRadius = rig.ballRadius ?? 0.22;
            const threeScene = new THREE.Scene();
            const built = rig.buildEquipment(threeScene, defaultParams('uniform-accelerated'));
            const handles = built.handles as VerticalHandles;

            for (const height of [1, 20]) {
                for (const v0y of [-10, 0, 20]) {
                    for (const g of [9.8, 1.6]) {
                        const duration = g < 5 ? 28 : 6;
                        const params = { height, v0y, g, duration };
                        rig.updateEquipment(built.handles, params);
                        const { result, error } = runSceneSimulation(sceneCfg, params);
                        expect(error).toBeNull();
                        const traj = result!.trajectories[0]!;

                        const expectedVisualH0 = ballRadius + height * worldScale;
                        const expectedDeltaH = v0y > 0 ? (v0y * v0y) / (2 * g) : 0;
                        const expectedHMax = height + expectedDeltaH;
                        const expectedVisualHMax = ballRadius + expectedHMax * worldScale;

                        // 释放点原点与器材释放架位置必须等于 expectedVisualH0
                        const origin = rig.getOrigin(params);
                        expect(origin.y).toBeCloseTo(expectedVisualH0, 6);
                        expect(handles.launcherBase.position.y).toBeCloseTo(expectedVisualH0, 6);

                        // 最高点标记必须等于绝对最高点 expectedVisualHMax (不与相对上升高度混用，且 v0y<0 时不虚增)
                        expect(handles.apexMarker.position.y).toBeCloseTo(expectedVisualHMax, 6);

                        // 高度尺顶端刻度与 expectedVisualHMax 一致
                        const rulerChildren = handles.heightRuler.group.children;
                        const maxTickY = Math.max(...rulerChildren.map(c => c.position.y));
                        expect(maxTickY).toBeCloseTo(expectedVisualHMax, 6);

                        const visY0 = rig.getVisualPosition(traj[0]!.position, params).y;
                        expect(visY0).toBeCloseTo(expectedVisualH0, 6);

                        if (v0y > 0) {
                            // 正初速：先上升到 expectedVisualHMax，再回落
                            const infoText = String(handles.infoLabel.userData['text'] ?? '');
                            expect(infoText).toContain(`Δh = ${expectedDeltaH.toFixed(1)} m`);
                            expect(infoText).toContain(`H_max = ${expectedHMax.toFixed(1)} m`);
                            expect(infoText).toContain(`t_上 = ${(v0y / g).toFixed(2)}s`);
                            const tPeak = v0y / g;
                            const stopKf = result!.keyframes.find(k => k.label === '速度为零');
                            expect(stopKf).toBeDefined();
                            expect(stopKf!.t).toBeCloseTo(tPeak, 6);
                            const visPeakExact = rig.getVisualPosition(stopKf!.position, params);
                            expect(visPeakExact.y).toBeGreaterThan(visY0);
                            expect(visPeakExact.y).toBeCloseTo(expectedVisualHMax, 6);

                            const maxTrajVisY = Math.max(...traj.map(p => rig.getVisualPosition(p.position, params).y));
                            expect(maxTrajVisY).toBeCloseTo(expectedVisualHMax, 2);

                            // 回到释放高度对称时刻 t = 2 * tPeak: 高度回到 expectedVisualH0，随后继续下落到 expectedVisualH0 以下
                            const idxSym = findFrameIndex(result!.trajectories, 2 * tPeak);
                            const pPrev = traj[Math.max(0, idxSym - 1)]!;
                            const pNext = traj[idxSym]!;
                            const frameSym = interpolateFrame(pPrev, pNext, 2 * tPeak);
                            const visSym = rig.getVisualPosition(frameSym.position, params);
                            expect(visSym.y).toBeCloseTo(expectedVisualH0, 3);
                            const visAfterSym = rig.getVisualPosition(traj[traj.length - 1]!.position, params);
                            expect(visAfterSym.y).toBeLessThan(expectedVisualH0);
                        } else {
                            // 零或负初速：从释放点单调向下直到触地，绝不高于释放点
                            const infoText = String(handles.infoLabel.userData['text'] ?? '');
                            expect(infoText).not.toContain('t_上 = -');
                            expect(infoText).not.toContain('t_上');
                            expect(infoText).toContain(`H_max = ${expectedHMax.toFixed(1)} m`);
                            const visEarly = rig.getVisualPosition(traj[5]!.position, params);
                            expect(visEarly.y).toBeLessThan(visY0);
                            for (const pt of traj) {
                                const vp = rig.getVisualPosition(pt.position, params);
                                expect(vp.y).toBeLessThanOrEqual(expectedVisualH0 + 1e-6);
                                expect(vp.y).toBeGreaterThanOrEqual(ballRadius - 1e-6);
                            }
                        }
                    }
                }
            }
        });
    });
});

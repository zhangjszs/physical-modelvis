/**
 * #160 真实场景 → 引擎 → 3D rig 的物理一致性回归
 *
 * 用户反馈「物理模型都对不上」的三处根因, 在此用**真实场景配置 → 真实引擎结果 →
 * 真实 rig** 的三段链路钉死:
 *
 * 1. 电磁复合场: 电场平行于初速度 → 引擎不走速度选择路径 (Boris 数值失效);
 *    标牌又读了场景里不存在的参数名, 显示 1.00e+6 m/s (比真实值大 1000 倍)。
 * 2. 单摆: 0.16 的通用缩放让支点高 15 m 而摆线只有 1 m —— 摆球糊在支点上、
 *    摆线不可见、光电门悬空; 标牌用小角度公式冒充引擎结果。
 * 3. 机械波: 9 个追踪质点间距恰好等于 λ → 全部同相 → 波形退化成直线;
 *    介质 4 m 被画进 0.64 个世界单位, 波形线却横跨 4.4 单位 (比例彻底错位)。
 *
 * 本文件只做几何/数值断言, 不做像素断言 —— 后者由浏览器探针负责。
 */
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { loadAllScenes, getSceneSync } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import {
    emCombinedRig,
    resolveFields,
    verdictText,
    type CombinedHandles
} from '../../src/components/simulation3d/rigs/emCombinedRig';
import {
    pendulumRig,
    lengthOf,
    pivotHeight,
    type PendulumHandles
} from '../../src/components/simulation3d/rigs/pendulumRig';
import { BASE_Y, waveRig, type WaveHandles } from '../../src/components/simulation3d/rigs/waveRig';
import { dopplerRig, dopplerReadouts, type DopplerHandles } from '../../src/components/simulation3d/rigs/dopplerRig';
import { STAGE_CENTER_X } from '../../src/components/simulation3d/rigs/params';
import { readWaveMediumFromResult } from '../../src/rendering/engineExtraAccess';
import { readWaveMediumView, waveVerticalGain } from '../../src/rendering/waveMediumView';
import { measurePendulumPeriod } from '../../src/rendering/pendulumMetrics';

beforeAll(loadAllScenes);

function simulate(sceneId: string, overrides: Record<string, number> = {}) {
    const config = getSceneSync(sceneId)!;
    const params = Object.fromEntries(config.parameters.map(p => [p.name, p.value]));
    Object.assign(params, overrides);
    const { result, error } = runSceneSimulation(config, params);
    if (!result || error) throw new Error(error ?? `${sceneId} 引擎结果缺失`);
    return { params, result };
}

describe('#160 电磁复合场: 速度选择器必须 E ⊥ v 且标牌读真实参数', () => {
    it('场景只提供 Ey (垂直于初速度), 引擎据此走解析速度选择路径', () => {
        const { params, result } = simulate('em-combined');
        expect(params['Ey']).toBeDefined();
        expect(params['Ex']).toBeUndefined();

        // 引擎诊断里的速度选择速度 = |E/B|
        const vSelect = result.diagnostics.maxValues.velocitySelectorSpeed!;
        expect(vSelect).toBeCloseTo(Math.abs(params['Ey']! / params['Bz']!), 6);

        // v₀ = E/B → 轨迹为直线 (洛伦兹力平衡), 且无数值积分告警
        const traj = result.trajectories[0]!;
        expect(Math.max(...traj.map(p => Math.abs(p.position.y)))).toBeLessThan(1e-9);
        expect(result.warnings).toHaveLength(0);
    });

    it('rig 把引擎坐标映射进装置: 起点在电子枪口, 终点落在荧光屏', () => {
        const { params, result } = simulate('em-combined');
        const scene = new THREE.Scene();
        const built = emCombinedRig.buildEquipment(scene, params, result);
        scene.add(built.group);

        const traj = result.trajectories[0]!;
        const start = emCombinedRig.getVisualPosition(traj[0]!.position, params, result);
        const end = emCombinedRig.getVisualPosition(traj[traj.length - 1]!.position, params, result);

        // 起点 = 极板左端 (电子枪口), 终点 = 荧光屏 (极板右端 + 0.6), 均在舞台中心坐标系下
        expect(start.x).toBeCloseTo(STAGE_CENTER_X - 1.3, 6);
        expect(end.x).toBeCloseTo(STAGE_CENTER_X + 1.9, 6);
        // 无偏转 → 始终在腔室中心线
        expect(start.y).toBeCloseTo(1.5, 6);
        expect(end.y).toBeCloseTo(1.5, 6);
    });

    it('标牌读场景真实参数, 不再出现 1.00e+6 m/s 这类量级错位', () => {
        const { params } = simulate('em-combined');
        const { E, B, v0 } = resolveFields(params);
        expect(E).toBe(params['Ey']);
        expect(B).toBe(params['Bz']);
        expect(v0).toBe(params['v0x']);

        const verdict = verdictText(E, B, v0);
        expect(verdict.text).toContain('E/B');
        expect(verdict.text).toContain('1000');
        expect(verdict.text).not.toMatch(/e\+6/);
        // v₀ = E/B → 判定为「无偏转通过」
        expect(verdict.text).toContain('无偏转通过');
    });

    it('E ⊥ v 的装置几何自洽: 上极板 + / 下极板 − → 电场向下', () => {
        const { params, result } = simulate('em-combined');
        const scene = new THREE.Scene();
        const built = emCombinedRig.buildEquipment(scene, params, result);
        const h = built.handles as CombinedHandles;
        const top = h.platesGroup.children.find(c => c.position.y > 1.5) as THREE.Mesh | undefined;
        const bottom = h.platesGroup.children.find(c => c.position.y < 1.5) as THREE.Mesh | undefined;
        expect(top).toBeDefined();
        expect(bottom).toBeDefined();
        // 引擎 Ey > 0 → 世界 y 向下为场方向 → 上极板为 +、下极板为 −
        expect(top!.position.y).toBeGreaterThan(bottom!.position.y);
        // 引擎 +y 映射到世界 −y (手性一致)
        const down = emCombinedRig.getVisualPosition({ x: 0, y: 1 }, params, result);
        expect(down.y).toBeLessThan(1.5);
    });
});

describe('#160 单摆: 尺度、光电门与周期标牌必须与引擎一致', () => {
    it('1 单位 = 1 米: 摆球到支点距离恒等于摆长 L', () => {
        const { params, result } = simulate('simple-pendulum');
        const scene = new THREE.Scene();
        const built = pendulumRig.buildEquipment(scene, params, result);
        scene.add(built.group);

        const L = lengthOf(params);
        const pivotY = pivotHeight(L);
        expect(L).toBe(1);
        for (const point of result.trajectories[0]!) {
            const v = pendulumRig.getVisualPosition(point.position, params, result);
            expect(Math.hypot(v.x - STAGE_CENTER_X, v.y - pivotY)).toBeCloseTo(L, 6);
        }
    });

    it('摆球半径远小于摆长 (早期 0.18 vs 0.16 → 摆球糊在支点上)', () => {
        const { params } = simulate('simple-pendulum');
        const L = lengthOf(params);
        expect(pendulumRig.ballRadius!).toBeLessThan(L * 0.2);
    });

    it('光电门光束落在最低点摆球球心高度', () => {
        const { params, result } = simulate('simple-pendulum');
        const scene = new THREE.Scene();
        const built = pendulumRig.buildEquipment(scene, params, result);
        const h = built.handles as PendulumHandles;

        const L = lengthOf(params);
        const lowestBobY = pivotHeight(L) - L;
        // 光电门光束在组内局部 y = 0.25
        const beamY = h.photogate.position.y + 0.25;
        expect(beamY).toBeCloseTo(lowestBobY, 6);
        // 光电门落地 (底座在 y=0)
        expect(h.photogate.position.y).toBeGreaterThanOrEqual(0);
    });

    it('摆线长度恒为 L (细绳可见)', () => {
        const { params, result } = simulate('simple-pendulum');
        const scene = new THREE.Scene();
        const built = pendulumRig.buildEquipment(scene, params, result);
        scene.add(built.group);
        const h = built.handles as PendulumHandles;

        const L = lengthOf(params);
        const pivotY = pivotHeight(L);
        const bob = pendulumRig.getVisualPosition(result.trajectories[0]![0]!.position, params, result);
        pendulumRig.onAnimate!(h, {
            time: 0,
            ballPos: bob,
            params,
            result,
            velocity: { x: 0, y: 0 }
        });
        expect(h.string.scale.y).toBeCloseTo(L, 6);
        // 绳子中点 = 支点与球心的中点
        expect(h.string.position.y).toBeCloseTo((pivotY + bob.y) / 2, 6);
    });

    it('周期标牌用引擎实测值, 不拿小角度公式冒充', () => {
        const { params, result } = simulate('simple-pendulum');
        const measured = measurePendulumPeriod(result.trajectories[0]!);
        expect(measured).not.toBeNull();
        const tSmall = 2 * Math.PI * Math.sqrt(lengthOf(params) / params['g']!);
        // 大摆角下实测周期略长于小角度近似, 两者不可混为一谈
        expect(measured!).toBeGreaterThan(tSmall);
        expect(Math.abs(measured! - tSmall) / tSmall).toBeLessThan(0.02);
        expect(result.diagnostics.maxValues.periodSmall!).toBeCloseTo(tSmall, 9);
    });

    it('大摆角 (60°) 下实测周期明显长于小角度公式', () => {
        const { params, result } = simulate('simple-pendulum', { angle: 60 });
        const measured = measurePendulumPeriod(result.trajectories[0]!);
        const tSmall = 2 * Math.PI * Math.sqrt(lengthOf(params) / params['g']!);
        expect(measured!).toBeGreaterThan(tSmall * 1.05);
    });
});

describe('#160 机械波: 介质质点与波形必须消费引擎结果', () => {
    it('追踪质点间距 ≤ λ/8 (早期固定 9 点间距 = λ → 全部同相)', () => {
        const { result } = simulate('mechanical-wave');
        const medium = readWaveMediumFromResult(result)!;
        expect(medium).not.toBeNull();
        expect(medium.trackedCount).toBeGreaterThan(9);
        expect(medium.trackedCount).toBe(medium.trackedX.length);
        for (let i = 1; i < medium.trackedX.length; i++) {
            const gap = medium.trackedX[i]! - medium.trackedX[i - 1]!;
            expect(gap).toBeGreaterThan(0);
            expect(gap).toBeLessThanOrEqual(medium.wavelength / 8 + 1e-9);
        }
    });

    it('rig 介质跨度 = 介质实长 (1 单位 = 1 米), 质点数 = 引擎追踪点数', () => {
        const { params, result } = simulate('mechanical-wave');
        const scene = new THREE.Scene();
        const built = waveRig.buildEquipment(scene, params, result);
        scene.add(built.group);
        const h = built.handles as WaveHandles;

        const medium = readWaveMediumFromResult(result)!;
        expect(h.particles.length).toBe(medium.trackedCount);
        // 底座长度 = (xEnd − xStart) 米
        expect(h.base.scale.x).toBeCloseTo(medium.xEnd - medium.xStart, 6);
        expect(medium.xEnd - medium.xStart).toBe(4);
    });

    it('质点位置逐点等于引擎轨迹 (rig 不自算波形)', () => {
        const { params, result } = simulate('mechanical-wave');
        const scene = new THREE.Scene();
        const built = waveRig.buildEquipment(scene, params, result);
        const h = built.handles as WaveHandles;

        const view = readWaveMediumView(result, 1.0)!;
        expect(view).not.toBeNull();
        expect(view.particles.length).toBe(h.particles.length);

        const gain = waveVerticalGain(view.amplitude);
        waveRig.onAnimate!(h, {
            time: 1.0,
            ballPos: new THREE.Vector3(),
            params,
            result
        });
        for (let i = 0; i < Math.min(8, view.particles.length); i++) {
            const p = view.particles[i]!;
            const mesh = h.particles[i]!;
            expect(mesh.position.x).toBeCloseTo(STAGE_CENTER_X + (p.x - view.xCenter), 6);
            expect(mesh.position.y).toBeCloseTo(BASE_Y + p.yUp * gain, 6);
        }
    });

    it('波形线顶点由追踪质点插值而来 (不是自算的正弦)', () => {
        const { params, result } = simulate('mechanical-wave');
        const scene = new THREE.Scene();
        const built = waveRig.buildEquipment(scene, params, result);
        const h = built.handles as WaveHandles;

        waveRig.onAnimate!(h, {
            time: 0.4,
            ballPos: new THREE.Vector3(),
            params,
            result
        });
        const view = readWaveMediumView(result, 0.4)!;
        const gain = waveVerticalGain(view.amplitude);
        const attr = h.waveLine.geometry.getAttribute('position') as THREE.BufferAttribute;
        // 顶点数 = (质点数 − 1) × 加密段数 + 1
        expect(attr.count).toBe((view.particles.length - 1) * 4 + 1);
        // 第一个顶点 = 第一个追踪质点的世界位置
        expect(attr.getX(0)).toBeCloseTo(STAGE_CENTER_X + (view.particles[0]!.x - view.xCenter), 6);
        expect(attr.getY(0)).toBeCloseTo(BASE_Y + view.particles[0]!.yUp * gain, 6);
    });

    it('纵向放大受限且倍数已标注 (横向 1:1, 纵向放大不隐藏)', () => {
        expect(waveVerticalGain(0.1)).toBe(4);
        expect(waveVerticalGain(0.5)).toBeCloseTo(2.4, 6);
        expect(waveVerticalGain(0.01)).toBe(4);
    });

    it('rig 自绘质点 (ownParticles), 舞台不再按轨迹生成默认球', () => {
        expect(waveRig.ownParticles).toBe(true);
        expect(waveRig.worldScale).toBe(1);
    });
});

describe('#159 F-A2 多普勒: 3D 必须消费引擎 f′ 与声速, 不得回退机械波默认值', () => {
    it('观察者读数读引擎 θ 扫描: 前(迎) f′≈548.39 / 后(背) f′≈459.46', () => {
        const { params, result } = simulate('doppler-effect');
        const r = dopplerReadouts(params, result);
        expect(r.f0).toBeCloseTo(500, 6);
        expect(r.v).toBeCloseTo(340, 6);
        expect(r.vs).toBeCloseTo(30, 6);
        expect(r.fFront!).toBeCloseTo(548.39, 1);
        expect(r.fBack!).toBeCloseTo(459.46, 1);
    });

    it('声速 = 340 m/s, 不是旧 waveRig 回退的 v=λf=1.00 m/s', () => {
        const { params, result } = simulate('doppler-effect');
        const r = dopplerReadouts(params, result);
        expect(r.v).toBeGreaterThan(300);
        expect(r.lambda).toBeCloseTo(340 / 500, 4);
        // 展示压缩比 = 引擎真实 vs/v
        expect(r.ratio).toBeCloseTo(30 / 340, 6);
    });

    it('rig 为多普勒专用: ownParticles + 1 单位=1 米 + 波前环/双观察者/信息牌齐备', () => {
        expect(dopplerRig.ownParticles).toBe(true);
        expect(dopplerRig.worldScale).toBe(1);
        const { params, result } = simulate('doppler-effect');
        const scene = new THREE.Scene();
        const built = dopplerRig.buildEquipment(scene, params, result);
        scene.add(built.group);
        const h = built.handles as DopplerHandles;
        expect(h.fronts.length).toBeGreaterThanOrEqual(6);
        expect(h.source.position.y).toBeCloseTo(1.2, 6);
        expect(h.frontObs.position.x).toBeGreaterThan(h.backObs.position.x);
    });

    it('applyReadouts 缺失引擎结果时回退场景参数, 不抛错 (防御空结果)', () => {
        const { params } = simulate('doppler-effect');
        const r = dopplerReadouts(params, null);
        expect(r.f0).toBeCloseTo(500, 6);
        expect(r.v).toBeCloseTo(340, 6);
        expect(r.fFront).toBeNull();
        expect(r.fBack).toBeNull();
    });
});

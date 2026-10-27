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
import {
    emInductionRig,
    emInductionReadouts,
    type EmInductionHandles
} from '../../src/components/simulation3d/rigs/emInductionRig';
import { chartsOf } from 'physics-core';
import {
    selfInductanceRig,
    selfInductanceReadouts,
    type SelfInductanceHandles
} from '../../src/components/simulation3d/rigs/selfInductanceRig';
import {
    mutualInductanceRig,
    mutualInductanceReadouts,
    type MutualInductanceHandles
} from '../../src/components/simulation3d/rigs/mutualInductanceRig';
import {
    eddyCurrentRig,
    eddyCurrentReadouts,
    type EddyCurrentHandles
} from '../../src/components/simulation3d/rigs/eddyCurrentRig';
import {
    emDampingRig,
    emDampingReadouts,
    type EmDampingHandles
} from '../../src/components/simulation3d/rigs/emDampingRig';
import {
    acCurrentRig,
    acCurrentReadouts,
    type AcCurrentHandles
} from '../../src/components/simulation3d/rigs/acCurrentRig';
import {
    soundInterferenceRig,
    soundInterferenceReadouts,
    type SoundInterferenceHandles
} from '../../src/components/simulation3d/rigs/soundInterferenceRig';
import {
    polarizationRig,
    polarizationReadouts,
    type PolarizationHandles
} from '../../src/components/simulation3d/rigs/polarizationRig';
import {
    emSpectrumRig,
    emSpectrumReadouts,
    type EmSpectrumHandles
} from '../../src/components/simulation3d/rigs/emSpectrumRig';
import {
    radioactiveRig,
    radioactiveReadouts,
    type RadioactiveHandles
} from '../../src/components/simulation3d/rigs/radioactiveRig';
import {
    geigerCounterRig,
    geigerReadouts,
    type GeigerHandles
} from '../../src/components/simulation3d/rigs/geigerCounterRig';
import {
    decayStatisticsRig,
    decayStatsReadouts,
    type DecayStatsHandles
} from '../../src/components/simulation3d/rigs/decayStatisticsRig';
import {
    fissionChainRig,
    fissionReadouts,
    type FissionChainHandles
} from '../../src/components/simulation3d/rigs/fissionChainRig';
import {
    vernierCaliperRig,
    micrometerRig,
    multimeterRig
} from '../../src/components/simulation3d/rigs/measurementToolRig';
import { efieldLinesRig, type EfieldHandles } from '../../src/components/simulation3d/rigs/efieldLinesRig';
import { coulombRig, type CoulombHandles } from '../../src/components/simulation3d/rigs/coulombRig';
import { STAGE_CENTER_X } from '../../src/components/simulation3d/rigs/params';
import { readElectricFieldExtra, readWaveMediumFromResult } from '../../src/rendering/engineExtraAccess';
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

describe('#159 F-A3 电场线分布: 3D 消费引擎 extra.fieldLines', () => {
    it('rig 场线数 = 引擎 fieldLines 数, 不再回退匀强场/霍尔装置', () => {
        const { params, result } = simulate('efield-lines');
        const extra = readElectricFieldExtra((result as { extra?: unknown }).extra)!;
        expect(extra).not.toBeNull();
        expect(extra.fieldLines.length).toBeGreaterThan(0);

        const scene = new THREE.Scene();
        const built = efieldLinesRig.buildEquipment(scene, params, result);
        scene.add(built.group);
        const h = built.handles as EfieldHandles;
        expect(efieldLinesRig.ownParticles).toBe(true);
        // 每个场线折线 (≥2 点) 对应一条 3D Line
        expect(h.lines.length).toBe(extra.fieldLines.filter(l => l.points.length >= 2).length);
    });

    it('偶极模式 (mode=1) 仍有引擎场线与双电荷标记', () => {
        const { params, result } = simulate('efield-lines', { mode: 1 });
        const scene = new THREE.Scene();
        const built = efieldLinesRig.buildEquipment(scene, params, result);
        const h = built.handles as EfieldHandles;
        expect(h.lines.length).toBeGreaterThan(0);
        expect(h.charges.length).toBe(2);
    });
});

describe('#159 F-A3 库仑定律: 3D 力读引擎 F0_N', () => {
    it('F0_N ≈ 3.595 N (q=1μC, r=5cm), rig 受力标牌存在', () => {
        const { params, result } = simulate('coulomb-force-explore');
        expect(result.diagnostics.maxValues['F0_N']).toBeCloseTo(3.59502, 3);

        const scene = new THREE.Scene();
        const built = coulombRig.buildEquipment(scene, params, result);
        scene.add(built.group);
        const h = built.handles as CoulombHandles;
        expect(coulombRig.ownParticles).toBe(true);
        expect(h.forceLabel).toBeDefined();
        // 斥力箭头长度为正且有限
        expect(h.arrow1.visible).toBe(true);
    });

    it('改 q 后轴力随引擎变大 (F ∝ q1q2): q2=2μC 时 F0_N 翻倍', () => {
        const a = simulate('coulomb-force-explore').result.diagnostics.maxValues['F0_N']!;
        const b = simulate('coulomb-force-explore', { q2: 2 }).result.diagnostics.maxValues['F0_N']!;
        expect(b / a).toBeCloseTo(2, 6);
    });
});

describe('#159 F-A3 电磁感应: 3D 读引擎 Φ/ε 曲线', () => {
    it('charts y_t (mV) 峰值 = emfPeak(V)×1000, x_t 幅值 = B·A·1000 mWb', () => {
        const { params, result } = simulate('em-induction');
        const c = chartsOf(result, 'em-induction')!;
        const mv = result.diagnostics.maxValues;
        const maxE_mV = Math.max(...(c.y_t?.points ?? []).map(p => Math.abs(p.y)));
        // maxValues.emfPeak 已是 SI 单位 V；图表 y_t 为 mV → ×1000 对齐
        expect(maxE_mV / 1000).toBeCloseTo(mv['emfPeak']!, 1);
        const maxFlux = Math.max(...(c.x_t?.points ?? []).map(p => Math.abs(p.y)));
        expect(maxFlux).toBeCloseTo(params['Bind']! * params['A']! * 1000, 3);
    });

    it('读数在 ε 峰值时刻 = 峰值(V); t=0 处有限', () => {
        const { params, result } = simulate('em-induction');
        const c = chartsOf(result, 'em-induction')!;
        const pts = c.y_t!.points;
        const peak = pts.reduce((a, b) => (Math.abs(b.y) > Math.abs(a.y) ? b : a));
        const r = emInductionReadouts(params, result, peak.x / 1000);
        expect(Math.abs(r.emfV)).toBeCloseTo(Math.abs(peak.y) / 1000, 3);
        expect(Number.isFinite(emInductionReadouts(params, result, 0).emfV)).toBe(true);
    });

    it('rig 结构: 线圈环数 / 磁铁 / ownParticles / 引擎周期 20ms', () => {
        const { params, result } = simulate('em-induction');
        const built = emInductionRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as EmInductionHandles;
        expect(emInductionRig.ownParticles).toBe(true);
        expect(h.rings.length).toBe(6);
        expect(h.magnet).toBeDefined();
        expect(h.period).toBeCloseTo(0.02, 3);
    });
});

describe('#159 F-A3 自感: 断电衰减 I(t)/ε_L(t) 读引擎 charts', () => {
    it('t=0 时 I=I₀=1.2A、ε_L=-12V；τ=L/R=0.05s', () => {
        const { params, result } = simulate('self-inductance');
        const r0 = selfInductanceReadouts(params, result, 0);
        expect(r0.currentA).toBeCloseTo(1.2, 2);
        expect(r0.emfV).toBeCloseTo(-12, 0);
        expect(r0.tauS).toBeCloseTo(0.05, 6);
        expect(r0.i0A).toBeCloseTo(1.2, 6);
    });
    it('末期电流衰减趋于 0；rig 为线圈+ownParticles', () => {
        const { params, result } = simulate('self-inductance');
        expect(Math.abs(selfInductanceReadouts(params, result, 0.5).currentA)).toBeLessThan(0.01);
        const built = selfInductanceRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as SelfInductanceHandles;
        expect(selfInductanceRig.ownParticles).toBe(true);
        expect(h.rings.length).toBe(7);
    });
});

describe('#159 F-A3 互感: I₁(t)/E₂(t) 读引擎 charts', () => {
    it('M=42.4mH、E₂幅值=13.33V、T=20ms', () => {
        const { params, result } = simulate('mutual-inductance');
        const r = mutualInductanceReadouts(params, result, 0);
        expect(r.mH).toBeCloseTo(0.0424264, 6);
        expect(r.e2AmpV).toBeCloseTo(13.3286, 3);
        expect(r.periodS).toBeCloseTo(0.02, 6);
    });
    it('rig 为双线圈结构 (原 6 环 / 副 7 环) + ownParticles', () => {
        const { params, result } = simulate('mutual-inductance');
        const built = mutualInductanceRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as MutualInductanceHandles;
        expect(mutualInductanceRig.ownParticles).toBe(true);
        expect(h.primaryRings.length).toBe(6);
        expect(h.secondaryRings.length).toBe(7);
    });
});

describe('#159 F-A3 涡流: P/δ 读引擎 maxValues', () => {
    it('P≈95.4mW、δ≈9.35mm', () => {
        const { result } = simulate('eddy-current');
        const r = eddyCurrentReadouts(result, 0);
        expect(r.powerW).toBeCloseTo(0.095406, 5);
        expect(r.skinDepthMm).toBeCloseTo(9.3459, 3);
    });
    it('rig 为板+磁极+4 涡流环', () => {
        const { params, result } = simulate('eddy-current');
        const built = eddyCurrentRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as EddyCurrentHandles;
        expect(eddyCurrentRig.ownParticles).toBe(true);
        expect(h.eddyRings.length).toBe(4);
        expect(h.plate).toBeDefined();
    });
});

describe('#159 F-A3 电磁阻尼: ω(t) 读引擎 charts', () => {
    it('t=0 时 ω=ω₀=100 rad/s；τ_c≈3.83e-5 s', () => {
        const { params, result } = simulate('em-damping');
        const r = emDampingReadouts(params, result, 0);
        expect(r.omega0).toBeCloseTo(100, 6);
        expect(r.omega).toBeCloseTo(100, 1);
        expect(r.tauC).toBeCloseTo(0.0000383142, 8);
    });
    it('rig 为摆臂+圆盘+双磁极', () => {
        const { params, result } = simulate('em-damping');
        const built = emDampingRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as EmDampingHandles;
        expect(emDampingRig.ownParticles).toBe(true);
        expect(h.disk).toBeDefined();
        expect(h.magnetN).toBeDefined();
    });
});

describe('#159 F-A3 交变电流: e(t)/u₂(t) 读引擎 charts', () => {
    it('Eₘ=311V、匝比 0.1、U₂峰值=31.1V、T=20ms', () => {
        const { params, result } = simulate('ac-current');
        const r = acCurrentReadouts(params, result, 0);
        expect(r.peakEmf).toBeCloseTo(311, 6);
        expect(r.turnsRatio).toBeCloseTo(0.1, 6);
        expect(r.secondaryPeak).toBeCloseTo(31.1, 6);
        expect(r.periodS).toBeCloseTo(0.02, 6);
    });
    it('rig 为旋转线圈+铁芯', () => {
        const { params, result } = simulate('ac-current');
        const built = acCurrentRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as AcCurrentHandles;
        expect(acCurrentRig.ownParticles).toBe(true);
        expect(h.coil).toBeDefined();
        expect(h.core).toBeDefined();
    });
});

describe('#159 F-A3 声波干涉: 强度剖面读引擎 scan_line', () => {
    it('f=500/λ=0.68/v=340/d=3、观察点 I/I₀≈0.482 读 maxValues', () => {
        const { params, result } = simulate('sound-interference');
        const r = soundInterferenceReadouts(params, result);
        expect(r.f).toBeCloseTo(500, 6);
        expect(r.v).toBeCloseTo(340, 6);
        expect(r.d).toBeCloseTo(3, 6);
        expect(r.lambda).toBeCloseTo(0.68, 6);
        expect(r.iRatio).toBeCloseTo(0.4816, 3);
    });
    it('rig 的强度剖面来自引擎 scan_line (非空) + 双喇叭', () => {
        const { params, result } = simulate('sound-interference');
        const built = soundInterferenceRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as SoundInterferenceHandles;
        expect(soundInterferenceRig.ownParticles).toBe(true);
        expect(h.profile).not.toBeNull();
        expect(h.rings.length).toBe(8);
        expect(h.speakerR.position.x).toBeGreaterThan(h.speakerL.position.x);
    });
});

describe('#159 F-A3 偏振马吕斯: I/I₀ 读引擎 maxValues', () => {
    it('Ifinal=0.5、transmission=0.5 (0°→45° 偏振片级联)', () => {
        const { params, result } = simulate('polarization-malus');
        const r = polarizationReadouts(params, result);
        expect(r.ifinal).toBeCloseTo(0.5, 6);
        expect(r.transmission).toBeCloseTo(0.5, 6);
    });
    it('rig 为偏振片堆 + 光束 + 马吕斯曲线 (引擎 malus_curve)', () => {
        const { params, result } = simulate('polarization-malus');
        const built = polarizationRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as PolarizationHandles;
        expect(polarizationRig.ownParticles).toBe(true);
        expect(h.plates.length).toBeGreaterThanOrEqual(1);
        expect(h.curve).not.toBeNull();
    });
});

describe('#159 F-A3 电磁波谱: 谱带/读数读引擎', () => {
    it('频率范围 10~1e16 Hz、高亮可见光 λ≈533nm / E≈2.32eV', () => {
        const { result } = simulate('em-spectrum');
        const r = emSpectrumReadouts(result);
        expect(r.freqMin).toBeCloseTo(10, 6);
        expect(r.freqMax).toBeCloseTo(1e16, -10);
        expect(r.center).toBeGreaterThan(4e14);
        expect(r.center).toBeLessThan(7.5e14);
        expect(r.wavelength!).toBeCloseTo(5.33e-7, 9);
    });
    it('rig 为 6 频谱带 + 引擎 spectrum_curve', () => {
        const { params, result } = simulate('em-spectrum');
        const built = emSpectrumRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as EmSpectrumHandles;
        expect(emSpectrumRig.ownParticles).toBe(true);
        expect(h.bars.length).toBe(6);
        expect(h.curve).not.toBeNull();
    });
});

describe('#159 F-A3 放射性衰变: N(t)/A(t) 读引擎 charts', () => {
    it('N(0)=1000、A(0)≈69.31、T½=10s、半衰期处 N≈500', () => {
        const { params, result } = simulate('radioactive');
        const r0 = radioactiveReadouts(params, result, 0);
        expect(r0.atoms).toBeCloseTo(1000, 0);
        expect(r0.activity).toBeCloseTo(69.3147, 2);
        expect(r0.halfLife).toBeCloseTo(10, 6);
        expect(radioactiveReadouts(params, result, 10).atoms).toBeCloseTo(500, 0);
    });
    it('rig 为样品 + 云室径迹 + 衰减曲线', () => {
        const { params, result } = simulate('radioactive');
        const built = radioactiveRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as RadioactiveHandles;
        expect(radioactiveRig.ownParticles).toBe(true);
        expect(h.tracks.length).toBe(20);
        expect(h.curve).not.toBeNull();
    });
});

describe('#159 F-A3 盖革计数器: 计数率读引擎 charts', () => {
    it('t=0 计数率≈69.31 次/s、T½=10s', () => {
        const { params, result } = simulate('geiger-counter');
        const r = geigerReadouts(params, result, 0);
        expect(r.countRate).toBeCloseTo(69.3147, 2);
        expect(r.halfLife).toBeCloseTo(10, 6);
    });
    it('rig 为 GM 计数管 + 6 脉冲点', () => {
        const { params, result } = simulate('geiger-counter');
        const built = geigerCounterRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as GeigerHandles;
        expect(geigerCounterRig.ownParticles).toBe(true);
        expect(h.pulses.length).toBe(6);
        expect(h.tube).toBeDefined();
    });
});

describe('#159 F-A3 衰变统计: 直方图读引擎 charts', () => {
    it('λ=50、σ≈7.07、maxBin=74', () => {
        const { result } = simulate('decay-statistics');
        const r = decayStatsReadouts(result);
        expect(r.lambda).toBeCloseTo(50, 6);
        expect(r.sigma).toBeCloseTo(7.0711, 3);
        expect(r.maxBin).toBeCloseTo(74, 6);
        expect(r.bins).toBeGreaterThan(0);
    });
    it('rig 柱数 = 引擎直方图 bin 数', () => {
        const { params, result } = simulate('decay-statistics');
        const built = decayStatisticsRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as DecayStatsHandles;
        expect(decayStatisticsRig.ownParticles).toBe(true);
        expect(h.bars.length).toBe(decayStatsReadouts(result).bins);
    });
});

describe('#159 F-A3 链式反应: 逐代中子读引擎 charts', () => {
    it('k=1 (临界)、genMax=10、totalFissions=11', () => {
        const { result } = simulate('fission-chain');
        const r = fissionReadouts(result);
        expect(r.k).toBeCloseTo(1, 6);
        expect(r.genMax).toBeCloseTo(10, 6);
        expect(r.totalFissions).toBeCloseTo(11, 6);
        expect(r.generations).toBeGreaterThan(0);
    });
    it('rig 柱数 = 引擎代数点数', () => {
        const { params, result } = simulate('fission-chain');
        const built = fissionChainRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as FissionChainHandles;
        expect(fissionChainRig.ownParticles).toBe(true);
        expect(h.bars.length).toBe(fissionReadouts(result).generations);
    });
});

describe('#164 测量工具 3D 取景: 器械居中放大且不画默认占位球', () => {
    it('三工具均有 framing (拉近 <4) 且 ownParticles=true', () => {
        for (const rig of [vernierCaliperRig, micrometerRig, multimeterRig]) {
            expect(typeof rig.framing).toBe('function');
            expect(rig.ownParticles).toBe(true);
            const f = rig.framing!({}, null);
            expect(f).toBeDefined();
            expect(f!.distance!).toBeLessThan(4);
        }
    });
});

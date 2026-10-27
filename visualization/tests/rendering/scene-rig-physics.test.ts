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
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { loadAllScenes, getSceneSync } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import {
    emCombinedRig,
    resolveFields,
    verdictText,
    fieldText,
    emCombinedUnitsPerMeter,
    type CombinedHandles
} from '../../src/components/simulation3d/rigs/emCombinedRig';
import { spriteGlyphHeight } from '../../src/components/simulation3d/primitives';
import {
    resistanceLawRig,
    resistanceLawRigReadouts,
    resistanceReadoutText,
    resistanceClipRatio,
    formatResistance
} from '../../src/components/simulation3d/rigs/resistanceLawRig';
import { resistanceLawReadouts, drawResistanceLawScene } from '../../src/rendering/resistanceLawScenes';
import { createRecordingCanvas } from '../utils/canvasMock';
import { opticsRig, opticsRigReadouts } from '../../src/components/simulation3d/rigs/opticsRig';
import type { OpticalDiskHandles } from '../../src/components/simulation3d/equipment/opticalDisk';
import { refractionReadouts, drawRefractionScene } from '../../src/rendering/refractionScenes';
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
import { hookeLawRig, hookeLawReadouts, type HookeHandles } from '../../src/components/simulation3d/rigs/hookeLawRig';
import { airTrackUnitsPerMeter, airTrackWorldX } from '../../src/components/simulation3d/rigs/airTrackRig';
import { galileoInclineRig, type GalileoHandles } from '../../src/components/simulation3d/rigs/galileoInclineRig';
import { inclineRig, inclineUnitsPerMeter } from '../../src/components/simulation3d/rigs/inclineRig';
import type { InclinedPlaneHandles } from '../../src/components/simulation3d/equipment/inclinedPlane';
import { galileoInclineReadouts, inclinePlaneReadouts } from '../../src/rendering/chapter1Scenes';
import { computePhotogateMeasurements } from '../../src/utils/photogate';
import { collisionReadouts, springReadouts } from '../../src/rendering/chapter1Scenes';
import { forceCompositionReadouts } from '../../src/rendering/chapter3Scenes';
import { springRig, springUnitsPerMeter, springNaturalLength } from '../../src/components/simulation3d/rigs/springRig';
import {
    forceCompositionRig,
    type ForceCompositionHandles
} from '../../src/components/simulation3d/rigs/forceCompositionRig';
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
import {
    verticalMotionRig,
    verticalMotionReadouts,
    type VerticalHandles
} from '../../src/components/simulation3d/rigs/verticalMotionRig';
import {
    freeFallReadouts,
    verticalMotionBoardReadouts,
    projectileBoardReadouts
} from '../../src/rendering/chapter1Scenes';
import {
    projectileRig,
    projectileReadouts,
    type ProjectileHandles
} from '../../src/components/simulation3d/rigs/projectileRig';
import { freeFallRig, type FreeFallHandles } from '../../src/components/simulation3d/rigs/freeFallRig';
import { createRangeTape } from '../../src/components/simulation3d/equipment/rangeTape';
import { STAGE_CENTER_X } from '../../src/components/simulation3d/rigs/params';
import { readElectricFieldExtra, readWaveMediumFromResult } from '../../src/rendering/engineExtraAccess';
import { readWaveMediumView, waveVerticalGain } from '../../src/rendering/waveMediumView';
import { measurePendulumPeriod } from '../../src/rendering/pendulumMetrics';
import { electricFieldReadouts, magneticFieldReadouts } from '../../src/rendering/chargedParticleScenes';
import {
    electricFieldRig,
    electricFieldRigReadouts,
    electricFieldUnitsPerMeter,
    type ElectricFieldHandles
} from '../../src/components/simulation3d/rigs/electricFieldRig';
import {
    magneticFieldRig,
    magneticFieldRigReadouts,
    magneticFieldUnitsPerMeter,
    MAGNETIC_FIELD_CENTER_Y,
    type MFieldHandles
} from '../../src/components/simulation3d/rigs/magneticFieldRig';

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
    it('场景只提供 Ey (垂直于初速度), 引擎据此走速度选择路径', () => {
        const { params, result } = simulate('em-combined');
        expect(params['Ey']).toBeDefined();
        expect(params['Ex']).toBeUndefined();

        // 引擎诊断里的速度选择速度 = |E/B|
        const vSelect = result.diagnostics.maxValues.velocitySelectorSpeed!;
        expect(vSelect).toBeCloseTo(Math.abs(params['Ey']! / params['Bz']!), 6);

        // 默认参数必须**偏离**平衡点: 旧默认恰好 v₀ = E/B = 1000 → 画面看不出偏转
        expect(Math.abs(params['v0x']! - vSelect)).toBeGreaterThan(vSelect * 0.2);
        const traj = result.trajectories[0]!;
        expect(Math.max(...traj.map(p => Math.abs(p.position.y)))).toBeGreaterThan(0.3);
        // Boris 数值路径分辨率充足 (旧默认下 |q|B·dt/(2m) = 4.79 rad ≫ π/4)
        expect(result.warnings).toHaveLength(0);
    });

    it('把 v₀ 调到 E/B 时轨迹回到直线 (速度选择器原理)', () => {
        const { params } = simulate('em-combined');
        const vSelect = Math.abs(params['Ey']! / params['Bz']!);
        const { result } = simulate('em-combined', { v0x: vSelect });
        const traj = result.trajectories[0]!;
        expect(Math.max(...traj.map(p => Math.abs(p.position.y)))).toBeLessThan(1e-9);
    });

    it('rig 把引擎坐标映射进装置: 起点在电子枪口, 终点落在极板右端', () => {
        const { params, result } = simulate('em-combined');
        const scene = new THREE.Scene();
        const built = emCombinedRig.buildEquipment(scene, params, result);
        scene.add(built.group);

        const traj = result.trajectories[0]!;
        const start = emCombinedRig.getVisualPosition(traj[0]!.position, params, result);
        const end = emCombinedRig.getVisualPosition(traj[traj.length - 1]!.position, params, result);

        // 起点 = 极板左端 (电子枪口), 终点 = 极板右端 (水平跨度铺满极板)
        expect(start.x).toBeCloseTo(STAGE_CENTER_X - 1.3, 6);
        expect(end.x).toBeCloseTo(STAGE_CENTER_X + 1.3, 6);
        // 引擎 +y → 世界 +y (与 2D 板书同一手性; 旧版翻转 y 导致两层口径打架)
        const up = emCombinedRig.getVisualPosition({ x: 0, y: 1 }, params, result);
        expect(up.y).toBeGreaterThan(1.5);
        expect(start.y).toBeCloseTo(1.5, 6);
    });

    it('标牌读场景真实参数, 不再出现 1.00e+6 m/s 这类量级错位', () => {
        const { params } = simulate('em-combined');
        const { E, B, v0 } = resolveFields(params);
        expect(E).toBe(params['Ey']);
        expect(B).toBe(params['Bz']);
        expect(v0).toBe(params['v0x']);

        const verdict = verdictText(E, B, v0);
        expect(verdict.text).toContain('E/B');
        expect(verdict.text).toContain('44');
        expect(verdict.text).not.toMatch(/e\+6/);
        // v₀ ≠ E/B → 判定为「发生偏转」
        expect(verdict.text).toContain('发生偏转');
        // 磁场方向标牌必须是 ⊙ 出纸面 (引擎 B 恒为 +z)
        expect(fieldText(E, B)).toContain('⊙');
        expect(fieldText(E, B)).not.toContain('⊗');
    });

    it('E ⊥ v 的装置几何自洽: 引擎 Ey > 0 → 电场向上 → 下极板为正极', () => {
        const { params, result } = simulate('em-combined');
        const scene = new THREE.Scene();
        const built = emCombinedRig.buildEquipment(scene, params, result);
        const h = built.handles as CombinedHandles;
        // 下板 (+) 低于上板 (−)
        expect(h.platesHandles.plusLabel.position.y).toBeLessThan(h.platesHandles.minusLabel.position.y);
    });

    it('3D 比例由引擎轨迹推导: 水平跨度铺满极板, 偏转量落在板间', () => {
        const { params, result } = simulate('em-combined');
        const scale = emCombinedUnitsPerMeter(params, result);
        const traj = result.trajectories[0]!;
        const last = traj[traj.length - 1]!;
        const maxX = Math.max(...traj.map(p => Math.abs(p.position.x)));
        const maxY = Math.max(...traj.map(p => Math.abs(p.position.y)));
        expect(maxX * scale).toBeCloseTo(2.6, 6);
        expect(maxY * scale).toBeLessThan(0.85);
        void last;
    });

    it('2D 板书与 3D rig 同口径: E 向上 + ⊙ 出纸面 (旧版 2D 两处都画反)', () => {
        const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
        const boardSrc = stripComments(
            readFileSync(resolve(__dirname, '../../src/rendering/chargedParticleScenes.ts'), 'utf-8')
        );
        const rigSrc = stripComments(
            readFileSync(resolve(__dirname, '../../src/components/simulation3d/rigs/emCombinedRig.ts'), 'utf-8')
        );
        expect(boardSrc).toContain('⊙');
        expect(rigSrc).toContain('⊙');
        expect(boardSrc).not.toContain('⊗');
        expect(rigSrc).not.toContain('⊗');
    });

    it('读数标牌的字高必须达到可读阈值 (旧版用最终文本创建 → 早退 → 字高从未生效, 文字被压成一条线)', () => {
        const { params, result } = simulate('em-combined');
        const scene = new THREE.Scene();
        const built = emCombinedRig.buildEquipment(scene, params, result);
        const h = built.handles as CombinedHandles;

        // 字高 (世界单位) = sprite.scale.y × 字号 / 画布高
        const MIN_GLYPH_HEIGHT = 0.06;
        for (const sprite of [h.fieldLabel, h.verdictLabel]) {
            const glyph = spriteGlyphHeight(sprite);
            expect(glyph).toBeGreaterThanOrEqual(MIN_GLYPH_HEIGHT);
        }
        // 标牌必须真的有内容 (不是空串占位)
        expect(h.fieldLabel.userData.text).toContain('⊙');
        expect(h.verdictLabel.userData.text).toContain('E/B');
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

// ============================================================================
// #159 Phase 2 — 《高中核心》24 节逐节审计 (批次 A: 抛体 / 自由落体 / 竖直运动)
// ============================================================================

describe('#159 高中核心·自由落体: 落地后板书读数必须冻结在落地值, 不得显示穿地外推量', () => {
    it('引擎确实把轨迹外推到地面以下 (问题存在的证据)', () => {
        const { result } = simulate('free-fall');
        const traj = result.trajectories[0]!;
        const minY = Math.min(...traj.map(p => p.position.y));
        // h₀=20m, duration=3s → 自由落体外推到 y = −24.1m
        expect(minY).toBeLessThan(-20);
    });

    it('板书读数: s ≤ h₀ 且 v ≤ 落地冲击速度 √(2gh₀)', () => {
        const { params, result } = simulate('free-fall');
        const h0 = params['height']!;
        const g = params['g']!;
        const vImpact = Math.sqrt(2 * g * h0);
        for (const t of [0.5, 1.5, 2.0, 2.5, 3.0]) {
            const read = freeFallReadouts(params, result, t);
            expect(read.s).toBeLessThanOrEqual(h0 + 1e-9);
            expect(read.v).toBeLessThanOrEqual(vImpact + 1e-9);
        }
    });

    it('落地时刻: 读数冻结、时钟停在落地时刻', () => {
        const { params, result } = simulate('free-fall');
        const read = freeFallReadouts(params, result, 3);
        expect(read.landed).toBe(true);
        expect(read.t).toBeCloseTo(read.tImpact, 9);
        expect(read.s).toBeCloseTo(params['height']!, 6);
        expect(read.v).toBeCloseTo(Math.sqrt(2 * params['g']! * params['height']!), 6);
    });

    it('落地前读数与解析解一致 (未落地时不得被夹住)', () => {
        const { params, result } = simulate('free-fall');
        const g = params['g']!;
        const read = freeFallReadouts(params, result, 1.5);
        expect(read.landed).toBe(false);
        expect(read.s).toBeCloseTo(0.5 * g * 1.5 * 1.5, 6);
        expect(read.v).toBeCloseTo(g * 1.5, 6);
    });
});

describe('#159 高中核心·竖直运动: 3D 标牌与板书必须读引擎轨迹, 且默认参数能演示上抛', () => {
    it('默认参数不再是「与自由落体同形」(v₀y > 0)', () => {
        const config = getSceneSync('uniform-accelerated')!;
        const v0y = config.parameters.find(p => p.name === 'v0y')!;
        expect(v0y.default).toBeGreaterThan(0);
    });

    it('板书最高点 H_max / 上升时间 t_up 读引擎轨迹', () => {
        const { params, result } = simulate('uniform-accelerated');
        const read = verticalMotionBoardReadouts(params, result, 0);
        // 解析值: Δh = v₀y²/(2g), t_up = v₀y/g
        const g = params['g']!;
        const v0y = params['v0y']!;
        expect(read.hMax).toBeCloseTo(params['height']! + (v0y * v0y) / (2 * g), 3);
        expect(read.tUp).toBeCloseTo(v0y / g, 2);
        expect(read.deltaH).toBeCloseTo((v0y * v0y) / (2 * g), 3);
        // 引擎轨迹自身的最高点必须与板书一致 (画面 ≡ 引擎)
        const engineMax = Math.max(...result.trajectories[0]!.map(p => p.position.y));
        expect(read.hMax).toBeCloseTo(engineMax, 3);
    });

    it('落地时刻来自引擎轨迹首次触地, 之后读数冻结在地面', () => {
        const { params, result } = simulate('uniform-accelerated');
        const read = verticalMotionBoardReadouts(params, result, 5);
        expect(read.landed).toBe(true);
        expect(read.y).toBe(0);
        expect(read.t).toBeCloseTo(read.tGround, 9);
    });

    it('3D rig 标牌读引擎 (verticalMotionReadouts.source === engine)', () => {
        const { params, result } = simulate('uniform-accelerated');
        const read = verticalMotionReadouts(params, result);
        expect(read.h0).toBe(params['height']!);
        expect(read.source).toBe('engine');
        const engineMax = Math.max(...result.trajectories[0]!.map(p => p.position.y));
        expect(read.hMax).toBeCloseTo(engineMax, 6);
        expect(read.deltaH).toBeCloseTo(read.hMax - read.h0, 6);
    });

    it('3D rig 的最高点标记高度 = 引擎最高点 × 尺度 (装置与画面口径一致)', () => {
        const { params, result } = simulate('uniform-accelerated');
        const scene = new THREE.Scene();
        const built = verticalMotionRig.buildEquipment(scene, params, result);
        scene.add(built.group);
        const h = built.handles as VerticalHandles;
        const read = verticalMotionReadouts(params, result);
        // 最高点标记的世界高度 = 球半径 + H_max × WORLD_SCALE
        expect(h.apexMarker.position.y).toBeCloseTo(0.22 + read.hMax * 0.16, 6);
        // 释放架的世界高度 = 球半径 + h₀ × WORLD_SCALE
        expect(h.launcherBase.position.y).toBeCloseTo(0.22 + params['height']! * 0.16, 6);
    });
});

describe('#159 高中核心·抛体运动: 落点/射程读引擎, 卷尺与场景尺度同源', () => {
    it('引擎射程 = 轨迹终点横坐标 (引擎「落地即止」契约)', () => {
        const { result } = simulate('projectile');
        const traj = result.trajectories[0]!;
        const last = traj[traj.length - 1]!;
        const range = result.diagnostics.maxValues.range!;
        expect(last.position.x).toBeCloseTo(range, 6);
        expect(last.position.y).toBeLessThanOrEqual(1e-6);
    });

    it('3D rig 落点垫位置 = 引擎射程 × 场景尺度 (画面落点 ≡ 引擎落点)', () => {
        const { params, result } = simulate('projectile');
        const scene = new THREE.Scene();
        const built = projectileRig.buildEquipment(scene, params, result);
        scene.add(built.group);
        const h = built.handles as ProjectileHandles;
        projectileRig.updateEquipment(h, params, result);
        const range = result.diagnostics.maxValues.range!;
        expect(h.landingPad.position.x).toBeCloseTo(range * 0.16, 6);
    });

    it('projectileReadouts 走引擎 maxValues (source === engine)', () => {
        const { params, result } = simulate('projectile');
        const read = projectileReadouts(params, result);
        expect(read.source).toBe('engine');
        expect(read.range).toBe(result.diagnostics.maxValues.range!);
        expect(read.apexHeight).toBe(result.diagnostics.maxValues.apexHeight!);
    });

    it('地面卷尺刻度与 worldScale 同源: 1 世界单位 = 1/0.16 米', () => {
        // 旧实现 createRangeTape(14, 70) → 5 m/单位, 与 worldScale(6.25 m/单位) 打架
        const { group } = createRangeTape(8.0, 1 / 0.16);
        const labels = group.children.filter(
            c => c.userData && typeof c.userData.text === 'string' && /^\d+$/.test(c.userData.text)
        );
        expect(labels.length).toBeGreaterThan(0);
        // 第 1 格 = 1 单位 = 6.25 m → 标签应为 "6"
        const first = labels[0]!.userData.text as string;
        expect(Number(first)).toBeCloseTo(Math.round(6.25), 0);
        // 末格 = 8 单位 = 50 m
        const last = labels[labels.length - 1]!.userData.text as string;
        expect(Number(last)).toBeCloseTo(50, 0);
    });

    it('自由落体 rig 不再摆放无意义的水平卷尺 (纯竖直运动)', () => {
        const { params, result } = simulate('free-fall');
        const scene = new THREE.Scene();
        const built = freeFallRig.buildEquipment(scene, params, result);
        const h = built.handles as FreeFallHandles;
        expect('rangeTape' in h).toBe(false);
    });

    it('抛体板书读数与引擎一致 (H_max / R / vx / vy)', () => {
        const { params, result } = simulate('projectile');
        const read = projectileBoardReadouts(params, result, 1.0);
        expect(read.apexHeight).toBe(result.diagnostics.maxValues.apexHeight!);
        expect(read.range).toBe(result.diagnostics.maxValues.range!);
        // 水平速度恒定 → vx(t) 与 vx(0) 相同 (类平抛分解规律的物理断言)
        const read0 = projectileBoardReadouts(params, result, 0);
        expect(read.vx).toBeCloseTo(read0.vx, 9);
    });
});

// ============================================================================
// #159 Phase 2 — 《高中核心》24 节逐节审计 (批次 B: 胡克 / 斜面 / 伽利略 / 气垫导轨)
// ============================================================================

describe('#159 高中核心·胡克定律: 钩码必须真的挂在弹簧上, 伸长量读引擎', () => {
    it('引擎计入重力: 平衡伸长量 x_eq = mg/k (旧版模型忽略重力, 钩码在原长附近穿过)', () => {
        const { params, result } = simulate('hooke-law');
        const m = ((params['massPerWeight']! / 1000) * params['weightCount']!)!;
        const k = params['k']!;
        const g = params['g']!;
        const xEq = result.diagnostics.maxValues.equilibriumDisplacement!;
        expect(xEq).toBeCloseTo((m * g) / k, 9);
        // 初始位置 = 弹簧原长 (x₀ = 0), 不是平衡位置
        const first = result.trajectories[0]![0]!;
        expect(-first.position.y).toBeCloseTo(0.1, 6);
    });

    it('钩码从原长释放后伸长量在 [0, 2·x_eq] 内振荡并趋近 x_eq', () => {
        const { result } = simulate('hooke-law');
        const xEq = result.diagnostics.maxValues.equilibriumDisplacement!;
        const traj = result.trajectories[0]!;
        const extensions = traj.map(p => Math.max(0, -p.position.y - 0.1));
        expect(Math.min(...extensions)).toBeGreaterThanOrEqual(-1e-9);
        expect(Math.max(...extensions)).toBeGreaterThan(xEq * 1.2);
        const last = extensions[extensions.length - 1]!;
        expect(Math.abs(last - xEq)).toBeLessThan(xEq * 0.2);
    });

    it('3D 标牌读引擎 (不再回退到场景不存在的 params.m)', () => {
        const { params, result } = simulate('hooke-law');
        const read = hookeLawReadouts(params, result);
        expect(read.source).toBe('engine');
        expect(read.mass).toBeCloseTo(0.2, 6);
        expect(read.deltaX).toBeCloseTo(result.diagnostics.maxValues.equilibriumDisplacement!, 9);
        // 旧实现: params['m'] 不存在 → 静默回退 0.5kg → Δx = 0.245 m (错 2.5 倍)
        expect(read.deltaX).toBeLessThan(0.15);
    });

    it('弹簧形变与刻度尺同源 (5.5 世界单位/米), 物块真的上下移动', () => {
        const { params, result } = simulate('hooke-law');
        void params;
        const scene = new THREE.Scene();
        const built = hookeLawRig.buildEquipment(scene, params, result);
        const h = built.handles as HookeHandles;
        const startY = h.weightGroup.position.y;
        // 走到过冲最大处: 形变必须肉眼可见 (旧实现被 Math.max(20, x·120) 钉死)
        const traj = result.trajectories[0]!;
        let maxExtension = 0;
        for (const p of traj) maxExtension = Math.max(maxExtension, -p.position.y - 0.1);
        const expectedDrop = maxExtension * 5.5;
        expect(expectedDrop).toBeGreaterThan(0.5);
        // 初始摆放 = 平衡伸长量位置 (锚点 2.2 − 原长 0.55 − x_eq×5.5)
        const xEq = result.diagnostics.maxValues.equilibriumDisplacement!;
        expect(startY).toBeCloseTo(2.2 - 0.55 - xEq * 5.5, 6);
    });
});

describe('#159 高中核心·气垫导轨: 光电门与滑块必须用同一套米→世界换算', () => {
    it('滑块真的能通过两扇光电门 (旧实现比例系数差 11.25 倍, 全程到不了门)', () => {
        const { params } = simulate('air-track');
        const x1 = params['x1']!;
        const x2 = params['x2']!;
        const v0 = params['v0']!;
        const duration = params['duration']!;
        // 滑块终点必须越过第二扇门
        expect(v0 * duration).toBeGreaterThan(x2);
        // 门与滑块共用同一映射: 到达门位置时两者世界坐标相同
        for (const gate of [x1, x2]) {
            const gateWorld = airTrackWorldX(gate, params);
            const sliderWorld = airTrackWorldX(gate, params);
            expect(sliderWorld).toBeCloseTo(gateWorld, 12);
        }
        // 换算比例 = 导轨世界长度 / 导轨物理长度
        expect(airTrackUnitsPerMeter(params)).toBeCloseTo(3.6 / params['trackLength']!, 9);
    });

    it('遮光计时给出的速度与引擎速度一致 (Δt = Δx / v)', () => {
        const { params, result } = simulate('air-track');
        const flagWidth = params['flagWidth']!;
        const v0 = params['v0']!;
        const measurements = computePhotogateMeasurements(result.trajectories[0]!, {
            gatePositions: [params['x1']!, params['x2']!],
            flagWidth
        });
        expect(measurements.length).toBe(2);
        for (const m of measurements) {
            expect(m.valid).toBe(true);
            expect(m.speed).toBeCloseTo(v0, 6);
            expect(m.deltaT).toBeCloseTo(flagWidth / v0, 6);
        }
    });
});

describe('#159 高中核心·伽利略斜面: 三段理想实验都要画出来, 位移必须是沿斜面投影', () => {
    it('沿斜面位移 s = x·cosθ + y·sinθ, 不是水平分量 (θ=30° 时差 13.4%)', () => {
        const { params, result } = simulate('galileo-incline');
        const read = galileoInclineReadouts(params, result, 0.9);
        expect(read.source).toBe('engine');
        // t = t_end 时 s 应等于 L
        const tEnd = result.diagnostics.maxValues.endTime!;
        const readEnd = galileoInclineReadouts(params, result, tEnd);
        expect(readEnd.s).toBeCloseTo(params['inclineLength']!, 6);
        // 旧实现读 position.x → 只有 s·cosθ
        expect(readEnd.s).toBeGreaterThan(readEnd.s * Math.cos(Math.PI / 6) + 0.1);
    });

    it('水平外推段不再冻结: 位移随时间继续增大', () => {
        const { params, result } = simulate('galileo-incline');
        const tEnd = result.diagnostics.maxValues.endTime!;
        const a = galileoInclineReadouts(params, result, tEnd);
        const b = galileoInclineReadouts(params, result, tEnd + 0.5);
        expect(b.s).toBeGreaterThan(a.s + 0.5);
    });

    it('引擎 all 模式: 水平面位于谷底高度, 与 horizontal 模式口径一致', () => {
        const { params, result } = simulate('galileo-incline', { mode: 3 });
        const horiz = result.keyframes.find(k => k.label === '水平面匀速 (牛顿第一定律)')!;
        const L = params['inclineLength']!;
        const h = L * Math.sin((params['angleDeg']! * Math.PI) / 180);
        expect(horiz.position.y).toBeCloseTo(h, 6);
        // 轨迹不得超出仿真时长
        const traj = result.trajectories[0]!;
        expect(traj[traj.length - 1]!.t).toBeLessThanOrEqual(params['duration']! + 1e-9);
    });

    it('3D 斜面长度与引擎一致 (旧版画面斜面相当于 11.25 m, 引擎只有 2 m)', () => {
        const { params, result } = simulate('galileo-incline');
        const scene = new THREE.Scene();
        const built = galileoInclineRig.buildEquipment(scene, params, result);
        const h = built.handles as GalileoHandles;
        const box =
            h.leftIncline.geometry.boundingBox ??
            (h.leftIncline.geometry.computeBoundingBox(), h.leftIncline.geometry.boundingBox!);
        // 斜面世界长度 = L × (2.6 / L) = 2.6 世界单位
        expect(box.max.x - box.min.x).toBeCloseTo(2.6, 6);
        // 小球起点 = 斜面顶端
        const origin = galileoInclineRig.getOrigin(params, result);
        expect(origin.y).toBeCloseTo(2.6 * Math.sin((params['angleDeg']! * Math.PI) / 180) + 0.16, 6);
    });
});

describe('#159 高中核心·斜面运动: 初速度分解与「滑到底端即止」', () => {
    it('沿斜面向上的初速度 v₀ 必须真的向上 (旧实现被分解成 v₀·cos2θ)', () => {
        const { params, result } = simulate('inclined-plane', { v0: 4 });
        const first = result.trajectories[0]![0]!;
        const theta = (params['theta']! * Math.PI) / 180;
        // 引擎的沿斜面初速度 = v0x·cosθ − v0y·sinθ, 应等于 −v₀ (向上为负)
        const along = first.velocity.x * Math.cos(theta) - first.velocity.y * Math.sin(theta);
        expect(along).toBeCloseTo(-4, 6);
        // 旧实现: v0x = v₀cosθ, v0y = v₀sinθ → along = v₀·cos2θ = 2 (θ=30°)
        expect(along).toBeLessThan(0);
    });

    it('滑到底端即停: 终点在斜面底端且速度归零 (旧实现滑过底端 2.05 m 仍在加速)', () => {
        const { params, result } = simulate('inclined-plane');
        const L = params['inclineLength']!;
        const theta = (params['theta']! * Math.PI) / 180;
        const traj = result.trajectories[0]!;
        const last = traj[traj.length - 1]!;
        expect(last.position.x).toBeCloseTo(L * Math.cos(theta), 6);
        expect(last.position.y).toBeCloseTo(0, 6);
        expect(Math.hypot(last.velocity.x, last.velocity.y)).toBeCloseTo(0, 6);
        expect(result.diagnostics.maxValues.inclineLength!).toBeCloseTo(L, 9);
    });

    it('板书沿斜面位移读引擎投影, 且与水平分量不同', () => {
        const { params, result } = simulate('inclined-plane');
        const read = inclinePlaneReadouts(params, result, 1.0);
        expect(read.source).toBe('engine');
        // s = ½at² (沿斜面), 而 position.x = s·cosθ —— 两者必须不同
        const theta = (params['theta']! * Math.PI) / 180;
        expect(read.s).toBeCloseTo(0.5 * 9.8 * Math.sin(theta) * 1.0, 4);
        const frame = result.trajectories[0]![333]!;
        expect(read.s).toBeGreaterThan(frame.position.x * 1.05);
        expect(read.atBottom).toBe(false);
    });

    it('3D 物块沿斜面切向移动 (旧实现按引擎笛卡尔坐标直接平移, 与板面差一个 θ)', () => {
        const { params, result } = simulate('inclined-plane');
        const scene = new THREE.Scene();
        const built = inclineRig.buildEquipment(scene, params, result);
        scene.add(built.group);
        scene.updateMatrixWorld(true);
        const h = built.handles as { planeHandles: InclinedPlaneHandles };
        const panel = h.planeHandles.panel;
        const tangent = new THREE.Vector3(1, 0, 0).transformDirection(panel.matrixWorld);
        const first = result.trajectories[0]![0]!.position;
        const initial = inclineRig.getVisualPosition(first, params, result);
        const later = result.trajectories[0]![500]!.position;
        const visual = inclineRig.getVisualPosition(later, params, result).sub(initial);
        const engineDelta = new THREE.Vector3(later.x - first.x, later.y - first.y, 0);
        expect(visual.dot(tangent)).toBeCloseTo(engineDelta.dot(tangent) * inclineUnitsPerMeter(params, result), 6);
    });
});

// ============================================================================
// #159 Phase 2 — 《高中核心》24 节逐节审计 (批次 C: 碰撞 / 弹簧 / 牛顿二定律 / 力的合成)
// ============================================================================

describe('#159 高中核心·碰撞: 两个物块的位置必须来自引擎 (旧版是写死的装饰方块)', () => {
    it('板书方块位置 = 引擎两条轨迹 (旧版固定在 width×0.25 / width×0.7)', () => {
        const { params, result } = simulate('collision');
        const read = collisionReadouts(params, result, 1.5);
        expect(read.source).toBe('engine');
        // 碰后 (t=1.5 > t_碰=0.8): m1=m2, e=1 ⇒ 速度互换
        expect(read.v1Now).toBeCloseTo(0, 6);
        expect(read.v2Now).toBeCloseTo(5, 6);
        // 动量守恒
        expect(read.pNow).toBeCloseTo(read.pBefore, 6);
        expect(read.pAfter).toBeCloseTo(read.pBefore, 6);
    });

    it('碰撞时刻由引擎给出', () => {
        const { result } = simulate('collision');
        expect(result.diagnostics.maxValues.collisionTime).toBeCloseTo(0.8, 6);
    });
});

describe('#159 高中核心·弹簧振子: 振子不得穿过固定端, 且形变必须可见', () => {
    it('弹簧原长 > 振幅 ⇒ 振子始终在墙的右侧 (旧版 naturalLength=0 会穿过墙)', () => {
        const { params, result } = simulate('spring');
        const A = params['A']!;
        const traj = result.trajectories[0]!;
        const minX = Math.min(...traj.map(p => p.position.x));
        expect(minX).toBeGreaterThan(0.05);
        // 振幅 A 与位移范围一致
        expect(result.diagnostics.maxValues.maxDisplacement).toBeCloseTo(A, 6);
    });

    it('板书位移 x = 引擎位置 − 原长, 振幅标注与引擎一致', () => {
        const { params, result } = simulate('spring');
        const read = springReadouts(params, result, 0.25);
        expect(read.source).toBe('engine');
        expect(Math.abs(read.x)).toBeLessThanOrEqual(read.amplitude + 1e-9);
        // 初始位移 = +A
        const read0 = springReadouts(params, result, 0);
        expect(read0.x).toBeCloseTo(read.amplitude, 6);
    });

    it('3D 弹簧长度 = 引擎弹簧长度 (旧版固定端在 −1.6 世界单位, 与引擎原长无关)', () => {
        const { params, result } = simulate('spring');
        const k = springUnitsPerMeter(params);
        const natural = springNaturalLength(params['A']!);
        const first = result.trajectories[0]![0]!.position;
        const visual = springRig.getVisualPosition(first, params);
        // 引擎弹簧长度 = L₀ + x, 世界长度 = 引擎长度 × k
        expect(visual.x).toBeCloseTo((natural + params['A']!) * k, 6);
    });
});

describe('#159 高中核心·牛顿第二定律: 小车全程不得驶出木板 / 冻结在画布边缘', () => {
    it('木板长度按引擎总位移自适应 (旧版 26.25 m 木板跑 62.5 m)', () => {
        const { result } = simulate('newton-second-law');
        const disp = result.diagnostics.maxValues.displacement!;
        expect(disp).toBeGreaterThan(0);
        // 木板世界长度必须覆盖行程
        const benchLength = Math.max(4.2, disp * 0.16 + 1.4);
        const travel = disp * 0.16;
        expect(benchLength).toBeGreaterThan(travel);
    });

    it('2D 板书像素比例按总位移自适应, 小车不再贴右缘冻结', () => {
        const { result } = simulate('newton-second-law');
        const disp = result.diagnostics.maxValues.displacement!;
        const width = 830;
        const pixelsPerMeter = Math.min(28, (width - 220) / Math.max(0.5, disp));
        // 全程位移对应的像素宽度必须小于可用画布宽度
        expect(disp * pixelsPerMeter).toBeLessThan(width - 200);
    });
});

describe('#159 高中核心·力的合成: 合力必须读引擎, 平行四边形必须闭合', () => {
    it('板书读数来自引擎当前帧 (合力大小/方向/扫掠夹角)', () => {
        const { params, result } = simulate('force-composition');
        const read = forceCompositionReadouts(params, result, 0.5);
        expect(read.source).toBe('engine');
        // 引擎伪轨迹: velocity.x = 当前扫掠夹角(°), velocity.y = 合力大小(N)
        expect(read.sweepAngleDeg).toBeCloseTo(90, 1);
        // F1=3, F2=4, θ=90° → F = 5 N
        expect(read.magnitude).toBeCloseTo(5, 6);
        expect(read.magnitudeAtAngle).toBeCloseTo(5, 6);
    });

    it('3D rig 不再把合力矢量当质体 (ownParticles), 平行四边形四点闭合', () => {
        const { params, result } = simulate('force-composition');
        expect(forceCompositionRig.ownParticles).toBe(true);
        const scene = new THREE.Scene();
        const built = forceCompositionRig.buildEquipment(scene, params, result);
        const h = built.handles as ForceCompositionHandles;
        const pts = h.parallelogram.geometry.getAttribute('position');
        // O → F1端 → 合力端 → F2端 → O (5 点闭合)
        expect(pts.count).toBe(5);
        const first = new THREE.Vector3().fromBufferAttribute(pts, 0);
        const last = new THREE.Vector3().fromBufferAttribute(pts, 4);
        expect(first.distanceTo(last)).toBeLessThan(1e-9);
    });
});

describe('#159 高中核心·匀强电场: 类平抛必须读引擎, 标牌不得回退到不存在的参数', () => {
    it('默认参数是演示用宏观量级: 全程亚光速 (旧版 64 倍光速违反引擎适用条件)', () => {
        const { params, result } = simulate('electric-field');
        const q = params['charge']! * 1e-8;
        const m = params['mass']! * 1e-7;
        const Ey = params['Ey']!;
        const a = (q * Ey) / m;
        // 引擎加速度必须等于 qE/m
        expect(result.trajectories[0]![0]!.acceleration?.y ?? 0).toBeCloseTo(a, 9);
        // 终态速度远小于光速
        const vMax = result.diagnostics.maxValues.maxSpeed!;
        expect(vMax).toBeLessThan(0.01 * 299792458);
        // 旧默认 (质子 + 100 N/C) 会得到 1.92e10 m/s
        expect(vMax).toBeLessThan(100);
    });

    it('引擎轨迹终点 = v₀x·t 与 ½at² (板书读数的几何依据)', () => {
        const { params, result } = simulate('electric-field');
        const t = params['duration']!;
        const last = result.trajectories[0]![result.trajectories[0]!.length - 1]!;
        const a = (params['charge']! * 1e-8 * params['Ey']!) / (params['mass']! * 1e-7);
        expect(last.position.x).toBeCloseTo(params['v0x']! * t, 6);
        expect(last.position.y).toBeCloseTo(0.5 * a * t * t, 6);
    });

    it('板书读数来自引擎当前帧 (source=engine), 且 a = qE/m', () => {
        const { params, result } = simulate('electric-field');
        const read = electricFieldReadouts(params, result, 0.75);
        expect(read.source).toBe('engine');
        const a = (params['charge']! * 1e-8 * params['Ey']!) / (params['mass']! * 1e-7);
        expect(read.a).toBeCloseTo(a, 9);
        expect(read.x).toBeCloseTo(params['v0x']! * 0.75, 6);
        expect(read.y).toBeCloseTo(0.5 * a * 0.75 * 0.75, 6);
        expect(read.maxSpeed).toBeCloseTo(result.diagnostics.maxValues.maxSpeed!, 9);
    });

    it('3D 标牌读引擎 (不再回退 params.U / params.v0 —— 场景里根本没有这两个参数)', () => {
        const { params, result } = simulate('electric-field');
        const read = electricFieldRigReadouts(params, result, 0.75);
        expect(read.source).toBe('engine');
        expect(read.chargeToMass).toBeCloseTo((params['charge']! * 1e-8) / (params['mass']! * 1e-7), 9);
        expect(read.maxSpeed).toBeCloseTo(result.diagnostics.maxValues.maxSpeed!, 9);
        // 旧实现回退 v₀ = 20 m/s (真值 4 m/s) —— 差 5 倍
        expect(read.v).toBeLessThan(10);
    });

    it('3D 比例由引擎轨迹推导: 水平跨度铺满极板, 偏转量落在板间', () => {
        const { params, result } = simulate('electric-field');
        const scale = electricFieldUnitsPerMeter(params, result);
        const traj = result.trajectories[0]!;
        const last = traj[traj.length - 1]!;
        // 水平跨度 → 极板长度 (2.8 世界单位)
        expect(last.position.x * scale).toBeCloseTo(2.8, 6);
        // 偏转量必须小于板间半间距
        const halfGap = 0.9;
        expect(Math.abs(last.position.y) * scale).toBeLessThan(halfGap);
    });

    it('极板极性与电场方向绑定: Ey<0 时上板为正极', () => {
        const { params, result } = simulate('electric-field');
        const scene = new THREE.Scene();
        const built = electricFieldRig.buildEquipment(scene, params, result);
        const h = built.handles as ElectricFieldHandles;
        const plusY = h.plateHandles.plusLabel.position.y;
        const minusY = h.plateHandles.minusLabel.position.y;
        // 默认 Ey>0 → E 向上 → 下板 (+) 在下, 上板 (−) 在上
        expect(plusY).toBeLessThan(minusY);
        // Ey<0 → E 向下 → 上板 (+) 在上
        const flipped = simulate('electric-field', { Ey: -10 });
        const built2 = electricFieldRig.buildEquipment(new THREE.Scene(), flipped.params, flipped.result);
        const h2 = built2.handles as ElectricFieldHandles;
        expect(h2.plateHandles.plusLabel.position.y).toBeGreaterThan(h2.plateHandles.minusLabel.position.y);
    });

    it('读数标牌字高达到可读阈值 (标牌被压扁 = 画面读不出任何物理量)', () => {
        const { params, result } = simulate('electric-field');
        const built = electricFieldRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as ElectricFieldHandles;
        for (const sprite of [h.conditionLabel, h.stateLabel]) {
            expect(spriteGlyphHeight(sprite)).toBeGreaterThanOrEqual(0.06);
        }
    });
});

describe('#159 高中核心·匀强磁场: 回旋半径/周期必须读引擎, 符号方向 ⊙ 出纸面', () => {
    it('引擎 R = mv/(qB)、T = 2πm/(qB), 且速率恒定 (洛伦兹力不做功)', () => {
        const { params, result } = simulate('magnetic-field');
        const q = params['charge']! * 1e-6;
        const m = params['mass']! * 1e-8;
        const B = params['Bz']!;
        const v = params['v0x']!;
        const R = result.diagnostics.maxValues.cyclotronRadius!;
        const T = result.diagnostics.maxValues.cyclotronPeriod!;
        expect(R).toBeCloseTo((m * v) / (q * B), 9);
        expect(T).toBeCloseTo((2 * Math.PI * m) / (q * B), 9);
        // 速率守恒
        const speeds = result.trajectories[0]!.map(p => Math.hypot(p.velocity.x, p.velocity.y));
        expect(Math.max(...speeds) - Math.min(...speeds)).toBeLessThan(1e-6);
    });

    it('默认参数下能看到完整回旋 (旧版 R=1 mm, 10 ms 内绕 1500 圈)', () => {
        const { params, result } = simulate('magnetic-field');
        const T = result.diagnostics.maxValues.cyclotronPeriod!;
        expect(params['duration']! / T).toBeGreaterThan(1.5);
        expect(params['duration']! / T).toBeLessThan(6);
        // 轨道半径落在「看得见」的世界尺度
        expect(result.diagnostics.maxValues.cyclotronRadius!).toBeGreaterThan(0.1);
    });

    it('3D 标牌读引擎 R/T (旧版回退 v₀ = 1.0e+6 m/s, 真值 25 m/s)', () => {
        const { params, result } = simulate('magnetic-field');
        const read = magneticFieldRigReadouts(params, result, 0.1);
        expect(read.source).toBe('engine');
        expect(read.radius).toBeCloseTo(result.diagnostics.maxValues.cyclotronRadius!, 9);
        expect(read.period).toBeCloseTo(result.diagnostics.maxValues.cyclotronPeriod!, 9);
        // 引擎按固定步长采样, 帧间线性插值取到的速率与 v₀ 有 1e-4 量级相对偏差
        expect(Math.abs(read.v - params['v0x']!) / params['v0x']!).toBeLessThan(1e-3);
        expect(read.v).toBeLessThan(1000);
    });

    it('3D 轨道由引擎半径推导: 轨道世界半径 = 磁腔半径 × 0.66, 粒子不超出磁腔', () => {
        const { params, result } = simulate('magnetic-field');
        const scale = magneticFieldUnitsPerMeter(params, result);
        const R = result.diagnostics.maxValues.cyclotronRadius!;
        expect(R * scale).toBeCloseTo(1.6 * 0.66, 6);
        // 起点到圆心的世界距离 = 轨道半径
        const origin = magneticFieldRig.getOrigin(params, result);
        const center = new THREE.Vector3(0, MAGNETIC_FIELD_CENTER_Y, 0);
        expect(origin.distanceTo(center)).toBeCloseTo(R * scale, 6);
    });

    it('正电荷 + B 出纸面 → 圆心在起点下方 (引擎与渲染同向)', () => {
        const { params, result } = simulate('magnetic-field');
        const acc0 = result.trajectories[0]![0]!.acceleration;
        // q>0, B>0 → F = q(vyB, −vxB) → 向下
        expect(acc0?.y ?? 0).toBeLessThan(0);
        const read = magneticFieldReadouts(params, result, 0);
        expect(read.center.y).toBeLessThan(0);
    });

    it('渲染层画的是 ⊙ 出纸面, 不是 ⊗ 入纸面 (引擎 B 恒为 +z)', () => {
        // 注释里会提到旧实现的 ⊗ (说明「旧版画反了」), 断言只看实际绘制代码
        const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
        const boardSrc = stripComments(
            readFileSync(resolve(__dirname, '../../src/rendering/chargedParticleScenes.ts'), 'utf-8')
        );
        const rigSrc = stripComments(
            readFileSync(resolve(__dirname, '../../src/components/simulation3d/rigs/magneticFieldRig.ts'), 'utf-8')
        );
        expect(boardSrc).toContain('⊙');
        expect(rigSrc).toContain('⊙');
        expect(boardSrc).not.toContain('⊗');
        expect(rigSrc).not.toContain('⊗');
    });

    it('读数标牌字高达到可读阈值 (标牌被压扁 = 画面读不出 R/T 等物理量)', () => {
        const { params, result } = simulate('magnetic-field');
        const built = magneticFieldRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as MFieldHandles;
        for (const sprite of [h.conditionLabel, h.stateLabel]) {
            expect(spriteGlyphHeight(sprite)).toBeGreaterThanOrEqual(0.06);
        }
    });
});

describe('#159 高中核心·电阻定律: ρ / R / 曲线必须全部来自引擎', () => {
    it('3D rig 读数 == 引擎 maxValues (旧版自带 ρ 表: Cu 1.7e-8 / 镍铬 1.0e-6 ≠ 引擎 1.68e-8 / 1.1e-6)', () => {
        const { params, result } = simulate('resistance-law');
        const read = resistanceLawRigReadouts(params, result);
        const mv = result.diagnostics.maxValues;

        expect(read.source).toBe('engine');
        expect(read.rho).toBe(mv.resistivity);
        expect(read.R).toBe(mv.baseResistance);
        expect(read.slopeRL).toBe(mv.slope_R_L);
        expect(read.slopeInvS).toBe(mv.slope_R_invS);
        expect(read.rCu).toBe(mv.rCu);
        expect(read.rFe).toBe(mv.rFe);
        expect(read.rNichrome).toBe(mv.rNichrome);
        // 引擎的电阻率表: Cu 1.68e-8 / Fe 1.0e-7 / Nichrome 1.1e-6
        expect(read.rho).toBeCloseTo(1.68e-8, 12);
        expect(read.rCu).toBeLessThan(read.rFe);
        expect(read.rFe).toBeLessThan(read.rNichrome);
    });

    it('rig 源码不再自带第二份电阻率表 (单一真源: 引擎 RESISTIVITY)', () => {
        const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
        const rigSrc = stripComments(
            readFileSync(resolve(__dirname, '../../src/components/simulation3d/rigs/resistanceLawRig.ts'), 'utf-8')
        );
        // 不得出现字面量电阻率表
        expect(rigSrc).not.toContain('1.7e-8');
        expect(rigSrc).not.toContain('1.0e-6');
        // 必须从 physics-core 取
        expect(rigSrc).toContain('RESISTIVITY');
    });

    it('3D 标牌读数 == 引擎 R₀, 且精度足够 (旧版 toFixed(2) 把 0.0214 Ω 写成 0.02 Ω)', () => {
        const { params, result } = simulate('resistance-law');
        const read = resistanceLawRigReadouts(params, result);
        const text = resistanceReadoutText(read);
        expect(text).toContain('R = 0.0214 Ω');
        expect(text).toContain('ρ = 1.68e-8 Ω·m');
        // 标牌里的 R 必须逐位等于引擎值 (而不是四舍五入后的近似)
        expect(text).toContain(formatResistance(read.R));
    });

    it('2D 板书读数 == 引擎 maxValues, 且三条控制变量曲线都有数据', () => {
        const { params, result } = simulate('resistance-law');
        const read = resistanceLawReadouts(params, result);
        const mv = result.diagnostics.maxValues;

        expect(read.source).toBe('engine');
        expect(read.rho).toBe(mv.resistivity);
        expect(read.R).toBe(mv.baseResistance);
        expect(read.area).toBe(mv.crossSection);
        // 旧版 2D 板书一条曲线都没画 ⇒ 这三条必须有数据
        expect(read.curveRLPoints).toBeGreaterThan(10);
        expect(read.curveInvSPoints).toBeGreaterThan(10);
        expect(read.curveMaterialPoints).toBe(3);
    });

    it('2D 板书确实把三条曲线画到画布上 (旧版只有一根导线)', () => {
        const { params, result } = simulate('resistance-law');
        const canvas = createRecordingCanvas({ width: 1100, height: 700 });
        drawResistanceLawScene({
            ctx: canvas.ctx,
            width: 1100,
            height: 700,
            isDark: true,
            params,
            simulationResult: result,
            currentTime: 0
        });
        // 三个子图的标题 + 材料对比 + 结论条
        for (const text of ['R-L 直线', 'R-1/S 直线', '材料对比', '铜', '铁', '镍铬']) {
            expect(canvas.texts.join('|')).toContain(text);
        }
        // 曲线是折线 ⇒ 描边次数必须远多于「只有一根导线」的情形
        expect(canvas.counts['stroke'] ?? 0).toBeGreaterThan(6);
        // 画了材料对比柱 ⇒ 至少 3 次 fillRect
        expect(canvas.counts['fillRect'] ?? 0).toBeGreaterThanOrEqual(3);
    });

    it('滑夹位置随 L 单调移动且覆盖整块板 (旧版 L > 1.9 m 后卡死在右端)', () => {
        const r01 = resistanceClipRatio(0.01);
        const r1 = resistanceClipRatio(1);
        const r10 = resistanceClipRatio(10);
        const r100 = resistanceClipRatio(100);
        expect(r01).toBeLessThan(r1);
        expect(r1).toBeLessThan(r10);
        expect(r10).toBeLessThan(r100);
        // 对数刻度: 默认 L = 1 m 落在板中央, 两端分别贴近左右边
        expect(r1).toBeCloseTo(0.5, 6);
        expect(r01).toBeLessThan(0.1);
        expect(r100).toBeGreaterThan(0.9);
        // 每个数量级都推进一整段板长 (不因夹紧而卡住)
        expect(r1 - r01).toBeGreaterThan(0.4);
        expect(r10 - r1).toBeGreaterThan(0.2);
        expect(r100 - r10).toBeGreaterThan(0.15);
    });

    it('场景没有运动物体 ⇒ 3D 不画默认球, 且实验板显式取景居中', () => {
        expect(resistanceLawRig.ownParticles).toBe(true);
        const framing = resistanceLawRig.framing!({}, null)!;
        expect(framing.target[0]).toBeCloseTo(STAGE_CENTER_X, 6);
        expect(framing.distance).toBeGreaterThan(0);
    });
});

describe('#159 高中核心·折射: 光路必须落在同一侧, 反射线不可缺席, 角度读引擎', () => {
    it('3D rig 读数 == 引擎 maxValues (旧版自己按 Snell 重算, 引擎改公式画面就漂)', () => {
        const { params, result } = simulate('refraction');
        const read = opticsRigReadouts(params, result);
        const mv = result.diagnostics.maxValues;

        expect(read.source).toBe('engine');
        expect(read.theta1).toBe(params['angle']);
        expect(read.theta2).toBe(mv.refractionAngleDeg);
        expect(read.totalInternalReflection).toBe(mv.totalInternalReflection === 1);
        expect(read.sinTheta1).toBe(mv.sinTheta1);
        expect(read.sinTheta2).toBe(mv.sinTheta2);
        // n₁ ≤ n₂ ⇒ 无临界角 (引擎哨兵 -1 必须转成 null, 不能当角度用)
        expect(mv.criticalAngleDeg).toBe(-1);
        expect(read.criticalAngle).toBeNull();
    });

    it('2D 板书读数 == 引擎 maxValues, 且光路端点来自引擎轨迹', () => {
        const { params, result } = simulate('refraction');
        const read = refractionReadouts(params, result);
        const mv = result.diagnostics.maxValues;
        const traj = result.trajectories[0]!;

        expect(read.source).toBe('engine');
        expect(read.theta2).toBe(mv.refractionAngleDeg);
        expect(read.incidentStart.x).toBeCloseTo(traj[0]!.position.x, 12);
        expect(read.refractEnd!.x).toBeCloseTo(traj[2]!.position.x, 12);
        expect(read.reflectEnd.x).toBeCloseTo(traj[3]!.position.x, 12);
        // 折射线必须与入射线同侧 (引擎符号修正后的物理口径)
        expect(read.refractEnd!.x).toBeGreaterThan(0);
        expect(read.refractEnd!.y).toBeLessThan(0);
        // sinθ₁-sinθ₂ 曲线有数据
        expect(read.curvePoints).toBeGreaterThan(10);
    });

    it('2D 板书必须画出反射光线 (旧版非全反射分支只画入射+折射, 反射定律缺席)', () => {
        const { params, result } = simulate('refraction');
        const canvas = createRecordingCanvas({ width: 1100, height: 700 });
        drawRefractionScene({
            ctx: canvas.ctx,
            width: 1100,
            height: 700,
            isDark: true,
            params,
            simulationResult: result,
            currentTime: 0
        });
        const texts = canvas.texts.join('|');
        expect(texts).toContain('反射');
        expect(texts).toContain('折射');
        // 三条光线 ⇒ 至少 3 次箭头绘制
        expect(canvas.counts['stroke'] ?? 0).toBeGreaterThan(4);
        // Snell 验证直线 + 工作点标注
        expect(texts).toContain('sinθ₁');
    });

    it('全反射分支: 无折射光, 只画入射 + 反射, 并标出临界角', () => {
        // 玻璃(1.5) → 空气(1.0), 入射 60° > 临界角 41.8°
        const { params, result } = simulate('refraction', { n1: 1.5, n2: 1.0, angle: 60 });
        const mv = result.diagnostics.maxValues;
        expect(mv.totalInternalReflection).toBe(1);

        const read = refractionReadouts(params, result);
        expect(read.totalInternalReflection).toBe(true);
        expect(read.theta2).toBeNull();
        expect(read.refractEnd).toBeNull();
        expect(read.criticalAngle).toBeCloseTo(41.81, 1);

        const canvas = createRecordingCanvas({ width: 1100, height: 700 });
        drawRefractionScene({
            ctx: canvas.ctx,
            width: 1100,
            height: 700,
            isDark: true,
            params,
            simulationResult: result,
            currentTime: 0
        });
        const texts = canvas.texts.join('|');
        expect(texts).toContain('全反射');
        expect(texts).toContain('反射');
        // 全反射时不得画折射光线 (光线标签是独立文本项, 不含标题里的「折射定律」)
        expect(canvas.texts).not.toContain('折射');
    });

    it('3D 器材在全反射时隐藏折射光束, 非全反射时显示', () => {
        const normal = simulate('refraction');
        const built = opticsRig.buildEquipment(new THREE.Scene(), normal.params, normal.result);
        const h = built.handles as { diskHandles: OpticalDiskHandles };
        expect(h.diskHandles.refractedBeam.visible).toBe(true);

        const tir = simulate('refraction', { n1: 1.5, n2: 1.0, angle: 60 });
        const built2 = opticsRig.buildEquipment(new THREE.Scene(), tir.params, tir.result);
        const h2 = built2.handles as { diskHandles: OpticalDiskHandles };
        expect(h2.diskHandles.refractedBeam.visible).toBe(false);
    });

    it('场景没有运动物体 ⇒ 3D 不画默认球, 且分度盘显式取景居中', () => {
        expect(opticsRig.ownParticles).toBe(true);
        const framing = opticsRig.framing!({}, null)!;
        expect(framing.distance).toBeGreaterThan(4);
        expect(framing.target[1]).toBeGreaterThan(1.4);
    });
});

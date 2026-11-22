/**
 * #178 几种传动方式 (皮带/齿轮/摩擦轮/同轴): 2D 与 3D 转向及切向速度一致回归
 */
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { loadAllScenes, getSceneSync } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import { drawTransmissionBeltScene } from '../../src/rendering/chapter5Scenes';
import { transmissionBeltRig } from '../../src/components/simulation3d/rigs/transmissionBeltRig';
import { createRecordingCanvas } from '../utils/canvasMock';

beforeAll(async () => {
    await loadAllScenes();
});

function simulateTransmission(overrides: Record<string, number>) {
    const scene = getSceneSync('transmission-belt');
    if (!scene) throw new Error('未找到场景: transmission-belt');
    const params: Record<string, number> = {};
    for (const p of scene.parameters) {
        params[p.name] = p.default;
    }
    Object.assign(params, overrides);
    const { result, error } = runSceneSimulation(scene, params);
    if (!result || error) throw new Error(`仿真失败: ${error ?? 'empty'}`);
    return { params, result };
}

describe('#178 传动方式 2D/3D 转向与无打滑一致性', () => {
    it('外切摩擦轮 (mode=2, r1=0.1, r2=0.2, ω1=10): 引擎 ω2=-5, 2D/3D 均反向旋转', () => {
        const { params, result } = simulateTransmission({ mode: 2, r1: 0.1, r2: 0.2, omega1: 10 });
        expect(result.diagnostics.maxValues['omega2Signed']).toBeCloseTo(-5, 6);
        expect(result.diagnostics.maxValues['direction']).toBe(-1);

        // 2D HUD 标明反向与带符号 ω2 = -5.00 rad/s, 且绘制接触点切向速度
        const c = createRecordingCanvas({ width: 1100, height: 700 });
        drawTransmissionBeltScene({
            ctx: c.ctx,
            width: 1100,
            height: 700,
            isDark: true,
            params,
            simulationResult: result,
            currentTime: 0.1
        });
        const text = c.texts.join(' | ');
        expect(text).toContain('摩擦轮传动 (反向)');
        expect(text).toContain('-5.00 rad/s');
        expect(text).toContain('v接触');

        // 3D 两轮旋转角符号相反且比值严格等于 r1/r2 = 0.5
        const built = transmissionBeltRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as { wheel1Group: THREE.Group; wheel2Group: THREE.Group };
        transmissionBeltRig.onAnimate!(built.handles, { time: 0.1, ballPos: new THREE.Vector3(), params, result });
        expect(h.wheel1Group.rotation.z).toBeCloseTo(-1.0, 6);
        expect(h.wheel2Group.rotation.z).toBeCloseTo(0.5, 6);
        expect(h.wheel1Group.rotation.z * h.wheel2Group.rotation.z).toBeLessThan(0);
    });

    it('四种模式 (皮带/齿轮/摩擦轮/同轴) 3D 旋转方向与引擎 direction 完全对齐', () => {
        const cases: Array<{ mode: number; expectedSign: 1 | -1; expectedOmega2: number }> = [
            { mode: 0, expectedSign: 1, expectedOmega2: 5 },
            { mode: 1, expectedSign: -1, expectedOmega2: -5 },
            { mode: 2, expectedSign: -1, expectedOmega2: -5 },
            { mode: 3, expectedSign: 1, expectedOmega2: 10 }
        ];

        for (const tc of cases) {
            const { params, result } = simulateTransmission({ mode: tc.mode, r1: 0.1, r2: 0.2, omega1: 10 });
            expect(result.diagnostics.maxValues['omega2Signed']).toBeCloseTo(tc.expectedOmega2, 6);
            const built = transmissionBeltRig.buildEquipment(new THREE.Scene(), params, result);
            const h = built.handles as { wheel1Group: THREE.Group; wheel2Group: THREE.Group };
            transmissionBeltRig.onAnimate!(built.handles, { time: 0.1, ballPos: new THREE.Vector3(), params, result });
            const prod = h.wheel1Group.rotation.z * h.wheel2Group.rotation.z;
            if (tc.expectedSign === 1) {
                expect(prod).toBeGreaterThan(0);
            } else {
                expect(prod).toBeLessThan(0);
            }
        }
    });
});

/**
 * #176 卡文迪什扭秤与桌面微小形变光杠杆: 2D / 3D 消费引擎单一真源回归
 *
 * 验证两实验的 2D 画布与 3D Rig 均消费引擎 diagnostics.maxValues (Δ = D·tan(2θ) ≈ 2Dθ),
 * 不再保留多乘 2 或偏离引擎量级的第二套自算公式。
 */
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { loadAllScenes, getSceneSync } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import { drawCavendishScene } from '../../src/rendering/chapter6Scenes';
import { drawMicroDeformationScene } from '../../src/rendering/waveParticleDualityScenes';
import { cavendishRig } from '../../src/components/simulation3d/rigs/cavendishRig';
import { microDeformationRig } from '../../src/components/simulation3d/rigs/microDeformationRig';
import { createRecordingCanvas } from '../utils/canvasMock';

beforeAll(async () => {
    await loadAllScenes();
});

function simulate(sceneId: string, overrides: Record<string, number> = {}) {
    const scene = getSceneSync(sceneId);
    if (!scene) throw new Error(`未找到场景: ${sceneId}`);
    const params: Record<string, number> = {};
    for (const p of scene.parameters) {
        params[p.name] = p.default;
    }
    Object.assign(params, overrides);
    const { result, error } = runSceneSimulation(scene, params);
    if (!result || error) throw new Error(`仿真失败 (${sceneId}): ${error ?? 'empty'}`);
    return { params, result };
}

describe('#176 光杠杆位移公式与 2D/3D 单一真源回归', () => {
    it('卡文迪什扭秤 2D/3D 消费引擎 Δspot = D·tan(2θ) 而非自算 2D·tan(2θ) 或错误臂长', () => {
        const { params, result } = simulate('cavendish');
        const mv = result.diagnostics.maxValues;
        const D = mv['D'];
        const thetaRad = mv['theta_rad'];
        const armL = mv['L'];
        expect(D).toBeTypeOf('number');
        expect(thetaRad).toBeTypeOf('number');
        expect(armL).toBeTypeOf('number');
        const expectedExact = (D ?? 0) * Math.tan(2 * (thetaRad ?? 0));
        expect(mv['deltaSpot_m']).toBeCloseTo(expectedExact, 12);

        // 注入哨兵值, 验证 2D 与 3D 均直接消费引擎 maxValues
        const sentinelSpot = 0.04321;
        const sentinelTheta = 0.004321;
        const tampered = {
            ...result,
            diagnostics: {
                ...result.diagnostics,
                maxValues: {
                    ...mv,
                    theta_rad: sentinelTheta,
                    deltaSpot_m: sentinelSpot
                }
            }
        };

        const c = createRecordingCanvas({ width: 1100, height: 700 });
        drawCavendishScene({
            ctx: c.ctx,
            width: 1100,
            height: 700,
            isDark: true,
            params,
            simulationResult: tampered,
            currentTime: 0
        });
        const joined = c.texts.join(' | ');
        expect(joined).toContain('D·tan(2θ)');
        expect(joined).toContain(sentinelSpot.toExponential(2));
        expect(joined).toContain(sentinelTheta.toExponential(2));

        const built = cavendishRig.buildEquipment(new THREE.Scene(), params, tampered);
        const handles = built.handles as { thetaEq: number; armLength: number };
        expect(handles.thetaEq).toBeCloseTo(sentinelTheta, 12);
        expect(handles.armLength).toBeCloseTo(armL ?? 0, 12);
    });

    it('微小形变光杠杆 2D/3D 消费引擎 Δh / α / Δs = D·tan(2α) 与 k = 2D/L', () => {
        const { params, result } = simulate('micro-deformation');
        const mv = result.diagnostics.maxValues;
        // 默认 F=100N, E=10GPa, L0=0.05m, L=1m, D=5m → Δh=0.5nm, α=5e-10rad, Δs=5nm, k=10
        expect(mv.deltaH).toBeCloseTo(5e-10, 15);
        expect(mv.deltaS).toBeCloseTo(5e-9, 15);
        expect(mv.magnification).toBeCloseTo(10, 4);

        const c = createRecordingCanvas({ width: 1100, height: 700 });
        drawMicroDeformationScene({
            ctx: c.ctx,
            width: 1100,
            height: 700,
            isDark: true,
            params,
            simulationResult: result,
            currentTime: 0
        });
        const joined = c.texts.join(' | ');
        expect(joined).toContain('0.500 nm');
        expect(joined).toContain('5.000 nm');
        expect(joined).toContain('10.0×');

        // 注入哨兵值, 验证 2D HUD 响应引擎结果而非本地公式
        const tampered = {
            ...result,
            diagnostics: {
                ...result.diagnostics,
                maxValues: {
                    ...mv,
                    deltaH: 1.23e-6,
                    alpha: 1.23e-6,
                    deltaS: 2.46e-5,
                    magnification: 20.0
                }
            }
        };
        const c2 = createRecordingCanvas({ width: 1100, height: 700 });
        drawMicroDeformationScene({
            ctx: c2.ctx,
            width: 1100,
            height: 700,
            isDark: true,
            params,
            simulationResult: tampered,
            currentTime: 0
        });
        const joined2 = c2.texts.join(' | ');
        expect(joined2).toContain('1.230 μm');
        expect(joined2).toContain('24.600 μm');
        expect(joined2).toContain('20.0×');

        // 3D Rig 也能正常接收并消费引擎结果不抛错
        const built = microDeformationRig.buildEquipment(new THREE.Scene(), params, tampered);
        expect(built.group).toBeDefined();
    });
});

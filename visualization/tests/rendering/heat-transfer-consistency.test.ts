/**
 * #184 热传递终态关键帧时间单调性与 2D/3D 引擎状态一致性回归
 */
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { loadAllScenes, getSceneSync } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import { drawHeatTransferScene } from '../../src/rendering/thermodynamicLawScenes';
import { heatTransferRig } from '../../src/components/simulation3d/rigs/heatTransferRig';
import { createRecordingCanvas } from '../utils/canvasMock';

beforeAll(async () => {
    await loadAllScenes();
});

function simulateHeatTransfer(overrides: Record<string, number> = {}) {
    const scene = getSceneSync('heat-transfer');
    if (!scene) throw new Error('未找到场景: heat-transfer');
    const params: Record<string, number> = {};
    for (const p of scene.parameters) {
        params[p.name] = p.default;
    }
    Object.assign(params, overrides);
    const { result, error } = runSceneSimulation(scene, params);
    if (!result || error) throw new Error(`仿真失败: ${error ?? 'empty'}`);
    return { params, result };
}

describe('#184 热传递终态关键帧与 2D/3D 单一真源一致性', () => {
    it('三种模式 (传导/对流/辐射): 关键帧时间单调、图表末端一致且 2D HUD 显示真实 T(tMax)', () => {
        for (const mode of [0, 1, 2]) {
            const { params, result } = simulateHeatTransfer({ mode, initialTemp: 300, ambientTemp: 350, time: 60 });
            const kf0 = result.keyframes[0]!;
            const kf1 = result.keyframes[1]!;
            const pts = result.charts.x_t!.points;
            const lastPt = pts[pts.length - 1]!;

            expect(kf0.t).toBe(0);
            expect(kf1.t).toBe(60);
            expect(kf1.position.y).toBeCloseTo(lastPt.y, 6);
            expect(result.diagnostics.maxValues['finalTemp']).toBeCloseTo(lastPt.y, 6);

            const c = createRecordingCanvas({ width: 1100, height: 700 });
            drawHeatTransferScene({
                ctx: c.ctx,
                width: 1100,
                height: 700,
                isDark: true,
                params,
                simulationResult: result,
                currentTime: 2
            });
            const joined = c.texts.join(' | ');
            expect(joined).toContain(`T(60s) = ${lastPt.y.toFixed(2)} K`);
            expect(joined).not.toMatch(/NaN|Infinity/);

            const built = heatTransferRig.buildEquipment(new THREE.Scene(), params, result);
            expect(built.group).toBeDefined();
        }
    });

    it('降温场景 (T0=500K, Tenv=300K, t=10s) 注入哨兵值验证 2D/3D 消费同一份引擎状态', () => {
        const { params, result } = simulateHeatTransfer({ mode: 1, initialTemp: 500, ambientTemp: 300, time: 10 });
        const tampered = {
            ...result,
            diagnostics: {
                ...result.diagnostics,
                maxValues: {
                    ...result.diagnostics.maxValues,
                    finalTemp: 412.34,
                    finalTime: 10
                }
            }
        };

        const c = createRecordingCanvas({ width: 1100, height: 700 });
        drawHeatTransferScene({
            ctx: c.ctx,
            width: 1100,
            height: 700,
            isDark: true,
            params,
            simulationResult: tampered,
            currentTime: 1
        });
        expect(c.texts.join(' | ')).toContain('T(10s) = 412.34 K');

        const built = heatTransferRig.buildEquipment(new THREE.Scene(), params, tampered);
        expect(built.group).toBeDefined();
    });
});

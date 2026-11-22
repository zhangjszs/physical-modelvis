/**
 * #183 液体混合双零体积收缩率 NaN 修复与 2D/3D 空白容器回归
 */
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { loadAllScenes, getSceneSync } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import { drawLiquidMixingScene } from '../../src/rendering/molecularKineticScenes';
import { liquidMixingRig } from '../../src/components/simulation3d/rigs/liquidMixingRig';
import { createRecordingCanvas } from '../utils/canvasMock';

beforeAll(async () => {
    await loadAllScenes();
});

function simulateMix(volumeWater: number, volumeAlcohol: number) {
    const scene = getSceneSync('liquid-mixing');
    if (!scene) throw new Error('未找到场景: liquid-mixing');
    const params: Record<string, number> = {};
    for (const p of scene.parameters) {
        params[p.name] = p.default;
    }
    params['volumeWater'] = volumeWater;
    params['volumeAlcohol'] = volumeAlcohol;
    const { result, error } = runSceneSimulation(scene, params);
    if (!result || error) throw new Error(`仿真失败: ${error ?? 'empty'}`);
    return { params, result };
}

describe('#183 液体混合 (0,0) 空白状态与 2D/3D 无 NaN 门禁', () => {
    it('(0, 0) 空白容器: 2D/3D 明确展示「无液体，收缩率不适用」并隐藏液层，全程无 NaN/Infinity', () => {
        const { params, result } = simulateMix(0, 0);
        expect(result.diagnostics.maxValues['contractionPercent']).toBe(0);
        expect(result.diagnostics.flags?.isEmpty).toBe(true);

        const c = createRecordingCanvas({ width: 1100, height: 700 });
        drawLiquidMixingScene({
            ctx: c.ctx,
            width: 1100,
            height: 700,
            isDark: true,
            params,
            simulationResult: result,
            currentTime: 1
        });
        const joined = c.texts.join(' | ');
        expect(joined).toContain('无液体，收缩率不适用');
        expect(joined).toContain('不适用');
        expect(joined).not.toMatch(/NaN|Infinity/);

        const built = liquidMixingRig.buildEquipment(new THREE.Scene(), params, result);
        const h = built.handles as {
            waterLayer: THREE.Mesh;
            alcoholLayer: THREE.Mesh;
            mixedLiquid: THREE.Mesh;
            isEmpty: boolean;
        };
        expect(h.isEmpty).toBe(true);
        expect(h.waterLayer.visible).toBe(false);
        expect(h.alcoholLayer.visible).toBe(false);
        expect(h.mixedLiquid.visible).toBe(false);
        liquidMixingRig.onAnimate!(built.handles, { time: 4, ballPos: new THREE.Vector3(), params, result });
        expect(h.mixedLiquid.visible).toBe(false);
    });

    it('所有典型组合 (0,50)/(50,0)/(50,50)/(0.001,0.001) 渲染字符串均无 NaN/Infinity', () => {
        for (const [vw, va] of [
            [0, 50],
            [50, 0],
            [50, 50],
            [0.001, 0.001]
        ] as const) {
            const { params, result } = simulateMix(vw, va);
            const c = createRecordingCanvas({ width: 1100, height: 700 });
            drawLiquidMixingScene({
                ctx: c.ctx,
                width: 1100,
                height: 700,
                isDark: true,
                params,
                simulationResult: result,
                currentTime: 2
            });
            const joined = c.texts.join(' | ');
            expect(joined).not.toMatch(/NaN|Infinity/);
            const built = liquidMixingRig.buildEquipment(new THREE.Scene(), params, result);
            expect((built.handles as { isEmpty: boolean }).isEmpty).toBe(false);
        }
    });
});

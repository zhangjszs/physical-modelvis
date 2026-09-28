/**
 * L10: 人类可读输出 NaN 扫描 (#28)
 *
 * 背景: NaN 一旦被 toFixed()/模板字符串包成文本, 就不再是 number 类型,
 * 导致 Number.isFinite / L9 跨场景鲁棒性 / L3 渲染器公式自检全部失效。
 * 本层遍历全部场景 (默认参数 + 滑块 min/max), 断言无字符串级 NaN/Infinity 泄漏。
 *
 * 豁免: charts 中的 {NaN, NaN} 折线断开标记 (doppler 超声速激波区合法产生)。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { getScenesSync, loadAllScenes } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import type { SceneConfig, SceneParameter } from '../../src/types/visualization';
import { findNonFinite, findNonBreakMarkerNaNs } from '../../../scripts/lib/find-non-finite.mjs';

function defaultParams(scene: SceneConfig): Record<string, number> {
    const p: Record<string, number> = {};
    for (const param of scene.parameters as SceneParameter[]) {
        p[param.name] = param.default;
    }
    return p;
}

/** 扫描单个 result 的字符串级 NaN (豁免 charts 断点) */
function scanResult(result: unknown, sceneId: string, paramDesc: string): void {
    // 1. charts 中的 NaN 必须均为 {NaN, NaN} 断点
    const breakProblems = findNonBreakMarkerNaNs(result as Record<string, unknown>);
    expect(breakProblems, `${sceneId} ${paramDesc}: charts 非断点 NaN: ${breakProblems.join(', ')}`).toEqual([]);

    // 2. 其余字段 (含 explanation/diagnostics/maxValues 等字符串) 不得含 NaN/Infinity
    const problems = findNonFinite({ ...(result as Record<string, unknown>), charts: undefined, trajectories: undefined });
    expect(problems, `${sceneId} ${paramDesc}: 字符串级 NaN 泄漏: ${problems.join(', ')}`).toEqual([]);
}

describe('L10: 人类可读输出 NaN 扫描', () => {
    beforeAll(async () => {
        await loadAllScenes();
    });

    it('默认参数: 全部场景无字符串级 NaN', () => {
        const scenes = getScenesSync();
        expect(scenes.length, '场景已加载').toBeGreaterThan(0);
        for (const scene of scenes) {
            const params = defaultParams(scene);
            const probe = scene.buildProblem(params);
            if (!probe.bodies || probe.bodies.length === 0) continue;

            const { result, error } = runSceneSimulation(scene, params);
            if (error) continue; // 模型拒绝 → 已防御
            if (!result) continue;
            if (result.trajectories.length === 0) continue; // 场模型跳过

            scanResult(result, scene.id, 'default');
        }
    });

    it('滑块边界 min/max: 全部场景无字符串级 NaN', () => {
        const scenes = getScenesSync();
        expect(scenes.length, '场景已加载').toBeGreaterThan(0);
        for (const scene of scenes) {
            const numericParams = scene.parameters as SceneParameter[];
            if (numericParams.length === 0) continue;
            for (const param of numericParams) {
                const base = defaultParams(scene);
                for (const extreme of [param.min, param.max]) {
                    const params: Record<string, number> = { ...base, [param.name]: extreme };
                    const probe = scene.buildProblem(params);
                    if (!probe.bodies || probe.bodies.length === 0) continue;

                    const { result, error } = runSceneSimulation(scene, params);
                    if (error) continue;
                    if (!result) continue;
                    if (result.trajectories.length === 0) continue;

                    scanResult(result, scene.id, `${param.name}=${extreme}`);
                }
            }
        }
    }, 120000);
});

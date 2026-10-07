/**
 * charts 类型化访问层 — 登记表真实性守卫 + 消费侧集成验证 (#82)
 *
 * 引擎侧单测 (physics-core/tests/unit/typed-charts.test.ts) 覆盖访问器行为与编译期约束;
 * 本文件守卫「登记表 ≠ 模型实际产出」的漂移:
 *   ① 真实性探针 — 全场景 default buildProblem + solveProblem, 断言每个已登记模型
 *      实际产出的 charts 键 ⊆ MODEL_CHART_KEYS 登记。模型新增产出键而不登记 → 此处红;
 *      登记表写协议不存在的键 → 引擎侧 satisfies 编译期红 (双向夹逼)。
 *   ② 消费集成 — 用真实 solve 结果验证 chartsOf/getChart 端到端可用 (非 fake 对象)。
 */

import { describe, it, expect } from 'vitest';
import { solveProblem, chartsOf, getChart, MODEL_CHART_KEYS } from 'physics-core';
import type { ModelType } from 'physics-core';
import { getScenesSync, loadAllScenes } from '../../src/scenes/sceneRegistry';
import type { SimulationResult } from 'physics-core';

describe('#82 charts 登记表真实性守卫', () => {
    it('全场景探针: 已登记模型实际产出的 charts 键 ⊆ 登记表', async () => {
        await loadAllScenes();
        const violations: string[] = [];
        const solvedModels = new Set<ModelType>();
        for (const scene of getScenesSync()) {
            const params: Record<string, number> = {};
            for (const p of scene.parameters) params[p.name] = p.default;
            let problem;
            try {
                problem = scene.buildProblem(params);
            } catch {
                continue; // buildProblem 失败由 L2 scene-contract 负责
            }
            let result: SimulationResult;
            try {
                result = solveProblem(problem);
            } catch {
                continue; // solve 失败由 L9 数值鲁棒性负责
            }
            solvedModels.add(problem.model);
            const registered = MODEL_CHART_KEYS[problem.model as keyof typeof MODEL_CHART_KEYS];
            if (!registered) continue; // 未登记模型不在本守卫范围 (登记面按 #82 切片, 渐进扩充)
            for (const key of Object.keys(result.charts)) {
                if (!(registered as readonly string[]).includes(key)) {
                    violations.push(`${scene.id} → ${problem.model} 产出未登记键 "${key}"`);
                }
            }
        }
        // 探针自身有效性: 登记的 28 个模型应至少被场景覆盖到大部分
        expect(solvedModels.size, '全场景 solve 应覆盖大量模型 (探针有效性)').toBeGreaterThan(60);
        expect(
            violations,
            `登记表漂移共 ${violations.length} 处 (模型新增产出键须同步登记 MODEL_CHART_KEYS):\n${violations.join('\n')}`
        ).toEqual([]);
    });

    it('消费集成: 真实 solve 结果经 chartsOf/getChart 读取 (polarization 马吕斯曲线)', async () => {
        await loadAllScenes();
        const scene = getScenesSync().find(s => s.id === 'polarization-malus');
        expect(scene, 'polarization-malus 场景存在').toBeDefined();
        const params: Record<string, number> = {};
        for (const p of scene!.parameters) params[p.name] = p.default;
        const result = solveProblem(scene!.buildProblem(params));
        expect(result.meta.model).toBe('polarization');

        const charts = chartsOf(result, 'polarization');
        expect(charts, '收窄视图非空').toBeDefined();
        const malus = getChart(result, 'polarization', 'malus_curve');
        expect(malus, '马吕斯曲线已产出').toBeDefined();
        expect(malus!.points.length, '曲线含数据点').toBeGreaterThan(0);
        // 模型不匹配 → undefined (防御惯例, 渲染层据此走自算回退)
        expect(getChart(result, 'interference', 'x_t')).toBeUndefined();
    });
});

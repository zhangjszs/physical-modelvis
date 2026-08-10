/**
 * 场景选择器覆盖完整性自检
 *
 * 锁住 SceneSelector 的接线修复 (commit a258d87):
 *   1. SCENE_CATEGORIES 中每个 id 都能在 sceneRegistry 解析到真实场景 (无死链/拼写错位)
 *   2. sceneRegistry 中每个已注册场景都出现在 SCENE_CATEGORIES 中 (全部可达, 无隐藏)
 *   3. SCENE_CATEGORIES 内无重复 id (重复会浪费 UI 且掩盖缺失)
 *
 * 回归价值: 过去曾出现 14 个死链 + 23 个隐藏场景, 靠一次性脚本发现;
 * 本测试把该不变量固化进 CI, 任何拼写错位或遗漏接线都会让 CI 失败。
 */

import { beforeAll, describe, it, expect } from 'vitest';
import { SCENE_CATEGORIES } from '../../src/components/layout/SceneSelector';
import { getScenesSync, loadAllScenes } from '../../src/scenes/sceneRegistry';

describe('场景选择器覆盖完整性', () => {
    let registeredIds: Set<string>;
    let categoryIds: string[];
    let reachableIds: Set<string>;

    beforeAll(async () => {
        await loadAllScenes();
        registeredIds = new Set(getScenesSync().map(s => s.id));
        categoryIds = SCENE_CATEGORIES.flatMap(cat => cat.ids);
        reachableIds = new Set(categoryIds);
    });

    it('sceneRegistry 非空', () => {
        expect(getScenesSync().length, 'sceneRegistry 不应为空').toBeGreaterThan(0);
    });

    it('SCENE_CATEGORIES 中每个 id 都能解析到真实场景 (无死链)', () => {
        const deadLinks = categoryIds.filter(id => !registeredIds.has(id));
        expect(
            deadLinks,
            `选择器存在死链 (无对应注册场景): ${JSON.stringify(deadLinks)}`,
        ).toEqual([]);
    });

    it('sceneRegistry 中每个已注册场景都可达 (无隐藏场景)', () => {
        const hidden = getScenesSync().map(s => s.id).filter(id => !reachableIds.has(id));
        expect(
            hidden,
            `存在已注册但选择器不可达的场景: ${JSON.stringify(hidden)}`,
        ).toEqual([]);
    });

    it('SCENE_CATEGORIES 内无重复 id', () => {
        const seen = new Set<string>();
        const dupes: string[] = [];
        for (const id of categoryIds) {
            if (seen.has(id)) dupes.push(id);
            seen.add(id);
        }
        expect(dupes, `选择器分类中有重复 id: ${JSON.stringify(dupes)}`).toEqual([]);
    });

    it('分类 id 与注册场景构成双射 (数量一致且无重复)', () => {
        expect(new Set(categoryIds).size, '分类 id 不应有重复').toBe(categoryIds.length);
        expect(
            new Set(categoryIds).size,
            `分类 id 数 (${categoryIds.length}) 应与注册场景数 (${registeredIds.size}) 一致`,
        ).toBe(registeredIds.size);
    });
});

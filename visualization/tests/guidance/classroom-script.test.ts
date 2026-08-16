import { describe, it, expect, beforeAll } from 'vitest';
import { CLASSROOM_SCRIPTS, getAllClassroomScripts, getClassroomScript } from '../../src/scenes/classroomScripts';
import { loadAllScenes, getSceneSync } from '../../src/scenes/sceneRegistry';

describe('课堂教学脚本契约与单元测试 (Classroom Scripts)', () => {
    beforeAll(async () => {
        await loadAllScenes();
    });

    it('必须提供 24 个高中物理高频核心实验的教学脚本', () => {
        const scripts = getAllClassroomScripts();
        expect(scripts.length).toBe(24);
    });

    it('所有脚本的 sceneId 必须在场景注册表中真实存在', () => {
        for (const script of Object.values(CLASSROOM_SCRIPTS)) {
            const scene = getSceneSync(script.sceneId);
            expect(scene, `场景 ID: ${script.sceneId} 未在 sceneRegistry 中找到`).toBeDefined();
        }
    });

    it('所有脚本的 demoParams 必须存在于场景参数列表中且在合法取值区间 [min, max]', () => {
        for (const script of Object.values(CLASSROOM_SCRIPTS)) {
            const scene = getSceneSync(script.sceneId)!;
            const paramDefs = scene.parameters;
            const paramMap = new Map(paramDefs.map(p => [p.name, p]));

            for (const [paramName, val] of Object.entries(script.demoParams)) {
                const def = paramMap.get(paramName);
                expect(def, `场景 ${script.sceneId} 的 demoParams 参数 ${paramName} 不存在于参数定义中`).toBeDefined();
                if (def) {
                    expect(
                        val,
                        `场景 ${script.sceneId} 的 demoParams 参数 ${paramName}=${val} 小于最小值 ${def.min}`
                    ).toBeGreaterThanOrEqual(def.min);
                    expect(
                        val,
                        `场景 ${script.sceneId} 的 demoParams 参数 ${paramName}=${val} 大于最大值 ${def.max}`
                    ).toBeLessThanOrEqual(def.max);
                }
            }
        }
    });

    it('所有脚本的 compareFocus 必须合法且匹配场景参数', () => {
        for (const script of Object.values(CLASSROOM_SCRIPTS)) {
            const scene = getSceneSync(script.sceneId)!;
            const def = scene.parameters.find(p => p.name === script.compareFocus.paramName);
            expect(def, `场景 ${script.sceneId} 的 compareFocus 参数 ${script.compareFocus.paramName} 不存在`).toBeDefined();

            if (def) {
                const [min, max] = script.compareFocus.range;
                expect(min).toBeGreaterThanOrEqual(def.min);
                expect(max).toBeLessThanOrEqual(def.max);
                expect(min).toBeLessThan(max);
                expect(script.compareFocus.count).toBeGreaterThanOrEqual(2);
                expect(script.compareFocus.count).toBeLessThanOrEqual(8);
            }
        }
    });

    it('所有脚本的 Quizzes 题目、选项索引与错因解析必须严密完整', () => {
        for (const script of Object.values(CLASSROOM_SCRIPTS)) {
            expect(script.quizzes.length, `场景 ${script.sceneId} 缺少预测提问`).toBeGreaterThanOrEqual(1);

            for (let i = 0; i < script.quizzes.length; i++) {
                const q = script.quizzes[i]!;
                expect(q.question.trim().length, `场景 ${script.sceneId} Q${i + 1} 题干为空`).toBeGreaterThan(0);
                expect(q.options.length, `场景 ${script.sceneId} Q${i + 1} 选项少于 2 个`).toBeGreaterThanOrEqual(2);
                expect(q.answer, `场景 ${script.sceneId} Q${i + 1} 正确答案索引越界`).toBeGreaterThanOrEqual(0);
                expect(q.answer, `场景 ${script.sceneId} Q${i + 1} 正确答案索引越界`).toBeLessThan(q.options.length);
                expect(q.misconception.trim().length, `场景 ${script.sceneId} Q${i + 1} 错因解析为空`).toBeGreaterThan(0);
            }
        }
    });

    it('所有脚本必须具备结论总结与公式提取', () => {
        for (const script of Object.values(CLASSROOM_SCRIPTS)) {
            expect(script.conclusion.takeaways.length, `场景 ${script.sceneId} 缺少 takeaways 总结`).toBeGreaterThanOrEqual(2);
            expect(script.conclusion.formulas.length, `场景 ${script.sceneId} 缺少核心公式`).toBeGreaterThanOrEqual(1);
        }
    });

    it('getClassroomScript 辅助函数查询功能正常', () => {
        const projectileScript = getClassroomScript('projectile');
        expect(projectileScript).toBeDefined();
        expect(projectileScript?.title).toBe('平抛运动的分解规律');

        const unknownScript = getClassroomScript('non-existent-scene');
        expect(unknownScript).toBeUndefined();
    });
});

import { describe, expect, it } from 'vitest';
import { SCENES } from '../../src/scenes/sceneRegistry';
import { CURATED_SCENE_IDS, getSceneGuidance, isCurated } from '../../src/scenes/guidance';

const allSceneIds = new Set(SCENES.map(s => s.id));

describe('getSceneGuidance', () => {
    it('精编场景返回手写步骤，字段非空', () => {
        for (const id of CURATED_SCENE_IDS) {
            const g = getSceneGuidance(id);
            expect(g.sceneId).toBe(id);
            expect(g.goal.length).toBeGreaterThan(0);
            expect(g.steps.length).toBeGreaterThanOrEqual(3);
            for (const step of g.steps) {
                expect(step.title.length).toBeGreaterThan(0);
                expect(step.action.length).toBeGreaterThan(0);
                expect(step.observe.length).toBeGreaterThan(0);
            }
        }
    });

    it('精编步骤 title 在同一场景内不重复', () => {
        for (const id of CURATED_SCENE_IDS) {
            const g = getSceneGuidance(id);
            const titles = g.steps.map(s => s.title);
            expect(new Set(titles).size).toBe(titles.length);
        }
    });

    it('所有精编 paramFocus 必须存在于对应场景的 parameters 中', () => {
        for (const id of CURATED_SCENE_IDS) {
            const scene = SCENES.find(s => s.id === id);
            expect(scene, `精编场景 ${id} 必须存在于 SCENES`).toBeDefined();
            const paramNames = new Set(scene!.parameters.map(p => p.name));
            const g = getSceneGuidance(id);
            for (const step of g.steps) {
                for (const focus of step.paramFocus ?? []) {
                    expect(paramNames.has(focus), `场景 ${id} 步骤「${step.title}」引用了不存在的参数 ${focus}`).toBe(
                        true
                    );
                }
            }
        }
    });

    it('精编场景 id 全部真实存在于 SCENES 且无重复', () => {
        expect(CURATED_SCENE_IDS.length).toBeGreaterThanOrEqual(10);
        for (const id of CURATED_SCENE_IDS) {
            expect(allSceneIds.has(id), `未知场景 id: ${id}`).toBe(true);
        }
        expect(new Set(CURATED_SCENE_IDS).size).toBe(CURATED_SCENE_IDS.length);
    });

    it('isCurated 对精编场景返回 true', () => {
        expect(isCurated('projectile')).toBe(true);
    });

    it('未知场景回退到通用步骤（4 步，字段非空，goal 含场景 id）', () => {
        const g = getSceneGuidance('no-such-scene-xyz');
        expect(g.sceneId).toBe('no-such-scene-xyz');
        expect(g.goal).toContain('no-such-scene-xyz');
        expect(g.steps.length).toBe(4);
        for (const step of g.steps) {
            expect(step.title.length).toBeGreaterThan(0);
            expect(step.action.length).toBeGreaterThan(0);
            expect(step.observe.length).toBeGreaterThan(0);
        }
    });

    it('未精编但存在的场景回退时使用真实场景名', () => {
        const uncurated = SCENES.find(s => !CURATED_SCENE_IDS.includes(s.id));
        expect(uncurated).toBeDefined();
        const g = getSceneGuidance(uncurated!.id);
        expect(g.goal).toContain(uncurated!.name);
    });

    it('回退步骤不携带 paramFocus', () => {
        const g = getSceneGuidance('no-such-scene-xyz');
        for (const step of g.steps) {
            expect(step.paramFocus).toBeUndefined();
        }
    });
});

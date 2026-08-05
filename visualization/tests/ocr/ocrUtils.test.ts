/**
 * OCR 前端纯函数 — 单元测试 (src/components/ocr/ocrUtils.ts)
 *
 * 覆盖: 场景模板解析 / 参数映射与过滤 / 题型标签推断
 */
import { describe, it, expect } from 'vitest';
import {
    resolveScene,
    buildSceneParams,
    inferProblemTypeLabel,
    OCR_PROBLEM_TYPE_LABEL
} from '../../src/components/ocr/ocrUtils';

describe('resolveScene', () => {
    it('positive: 已知模板映射到场景', () => {
        expect(resolveScene('projectile')).toBe('projectile');
        expect(resolveScene('electric-field')).toBe('electric-field');
        expect(resolveScene('em-combined')).toBe('em-combined');
    });

    it('edge: 未知模板回退 projectile', () => {
        expect(resolveScene('quantum-tunnel')).toBe('projectile');
    });

    it('edge: null / undefined 回退 projectile', () => {
        expect(resolveScene(null)).toBe('projectile');
        expect(resolveScene(undefined)).toBe('projectile');
    });
});

describe('buildSceneParams', () => {
    it('positive: 中文参数名与符号映射到场景 key', () => {
        const params = buildSceneParams({ 初速度: 10, θ: 30, E: 500, m: 2 });
        expect(params).toEqual([
            { key: 'v0', value: 10 },
            { key: 'angle', value: 30 },
            { key: 'Ey', value: 500 },
            { key: 'mass', value: 2 }
        ]);
    });

    it('edge: 非数值与无限值丢弃, 未知 key 透传', () => {
        const params = buildSceneParams({ 角度: '30°', v0: Infinity, 未知参数: 42 });
        expect(params).toEqual([{ key: '未知参数', value: 42 }]);
    });

    it('edge: undefined 输入返回空数组', () => {
        expect(buildSceneParams(undefined)).toEqual([]);
    });
});

describe('inferProblemTypeLabel', () => {
    it('positive: 显式题型优先', () => {
        expect(inferProblemTypeLabel('multiple-choice', false)).toBe('多选题');
        expect(inferProblemTypeLabel('fill-blank', false)).toBe('填空题');
    });

    it('edge: 无题型时按 options 兜底推断', () => {
        expect(inferProblemTypeLabel(undefined, true)).toBe('选择题');
        expect(inferProblemTypeLabel(undefined, false)).toBe('解答题');
    });

    it('edge: 非法题型值回退兜底', () => {
        expect(inferProblemTypeLabel('weird' as never, true)).toBe('选择题');
    });
});

describe('OCR_PROBLEM_TYPE_LABEL', () => {
    it('positive: 四种题型均有中文标签', () => {
        expect(Object.keys(OCR_PROBLEM_TYPE_LABEL).sort()).toEqual([
            'essay',
            'fill-blank',
            'multiple-choice',
            'single-choice'
        ]);
        expect(Object.values(OCR_PROBLEM_TYPE_LABEL)).toEqual(['单选题', '多选题', '填空题', '解答题']);
    });
});

/**
 * OCR 结果解析与归一化 — 单元测试 (server/ocr-utils.ts)
 *
 * 覆盖: 多题数组 / 单题对象 (向后兼容) / 原始数组 / 围栏剥离 / 非法项过滤 / 题号补齐
 */
import { describe, it, expect } from 'vitest';
import { stripJsonFence, normalizeRecognizeResult } from '../../server/ocr-utils';

describe('stripJsonFence', () => {
    it('positive: 剥离 ```json 围栏', () => {
        expect(stripJsonFence('```json\n{"a":1}\n```')).toBe('{"a":1}');
    });

    it('positive: 无围栏时原样返回', () => {
        expect(stripJsonFence('  {"a":1}  ')).toBe('{"a":1}');
    });

    it('edge: 空内容不抛错', () => {
        expect(stripJsonFence('')).toBe('');
    });
});

describe('normalizeRecognizeResult — 多题分离', () => {
    it('positive: 新格式 { problems: [...] } 多题保留并补齐题号', () => {
        const res = normalizeRecognizeResult({
            problems: [
                {
                    title: '题1',
                    type: 'single-choice',
                    options: [{ letter: 'A', text: '甲' }],
                    answer: { correct: ['A'] }
                },
                { title: '题2', type: 'multiple-choice', options: [{ letter: 'B', text: '乙' }] }
            ]
        });
        expect(res.problems).toHaveLength(2);
        expect(res.problems[0]!.index).toBe(1);
        expect(res.problems[1]!.index).toBe(2);
        expect(res.problems[1]!.title).toBe('题2');
    });

    it('positive: 单题对象 (旧格式) 自动包装为 problems 数组', () => {
        const res = normalizeRecognizeResult({ title: '旧格式', type: 'essay' });
        expect(res.problems).toHaveLength(1);
        expect(res.problems[0]!.title).toBe('旧格式');
        expect(res.problems[0]!.index).toBe(1);
    });

    it('positive: 原始数组形态 {problem1, problem2} 也归一化', () => {
        const res = normalizeRecognizeResult([{ title: 'A' }, { title: 'B' }]);
        expect(res.problems).toHaveLength(2);
        expect(res.problems.map(p => p.index)).toEqual([1, 2]);
    });

    it('positive: 题型字段保留, 非法题型丢弃', () => {
        const res = normalizeRecognizeResult({ problems: [{ type: 'single-choice' }, { type: 'weird-type' }] });
        expect(res.problems[0]!.type).toBe('single-choice');
        expect(res.problems[1]!.type).toBeUndefined();
    });

    it('edge: 过滤非对象项与空对象', () => {
        const res = normalizeRecognizeResult({ problems: [null, 42, 'str', { title: '有效' }] });
        expect(res.problems).toHaveLength(1);
        expect(res.problems[0]!.title).toBe('有效');
    });

    it('edge: options 只保留 letter/text 均合法的项', () => {
        const res = normalizeRecognizeResult({
            problems: [{ options: [{ letter: 'A', text: 'ok' }, { letter: 'B' }, 7] }]
        });
        expect(res.problems[0]!.options).toEqual([{ letter: 'A', text: 'ok' }]);
    });

    it('edge: answer.correct 只保留字符串, explanation 保留', () => {
        const res = normalizeRecognizeResult({
            problems: [{ answer: { correct: ['A', 3, 'C'], explanation: '解析' } }]
        });
        expect(res.problems[0]!.answer!.correct).toEqual(['A', 'C']);
        expect(res.problems[0]!.answer!.explanation).toBe('解析');
    });

    it('edge: given/formulas 类型校验', () => {
        const res = normalizeRecognizeResult({
            problems: [
                { given: { v0: 10, 角度: '30°' }, formulas: ['x=v0t', 3] },
                { given: 'not-object', formulas: 'not-array' }
            ]
        });
        expect(res.problems[0]!.given).toEqual({ v0: 10, 角度: '30°' });
        expect(res.problems[0]!.formulas).toEqual(['x=v0t']);
        expect(res.problems[1]!.given).toBeUndefined();
        expect(res.problems[1]!.formulas).toBeUndefined();
    });

    it('edge: 完全无法识别时返回空数组', () => {
        expect(normalizeRecognizeResult(null).problems).toHaveLength(0);
        expect(normalizeRecognizeResult('str').problems).toHaveLength(0);
        expect(normalizeRecognizeResult({ problems: [] }).problems).toHaveLength(0);
    });
});

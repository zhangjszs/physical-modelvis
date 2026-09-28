/**
 * findNonFinite 共享工具 — 单元测试 (#28)
 *
 * 覆盖: number NaN / 字符串 "NaN" / {NaN,NaN} 断点豁免 / 深层嵌套路径 / 正常结构返回空
 */
import { describe, it, expect } from 'vitest';
import { findNonFinite, findNonBreakMarkerNaNs } from '../../../scripts/lib/find-non-finite';

describe('findNonFinite', () => {
    it('positive: 正常结构返回空数组', () => {
        expect(findNonFinite(42)).toEqual([]);
        expect(findNonFinite('hello')).toEqual([]);
        expect(findNonFinite([1, 2, 3])).toEqual([]);
        expect(findNonFinite({ a: 1, b: { c: 2 } })).toEqual([]);
        expect(findNonFinite(null)).toEqual([]);
        expect(findNonFinite(undefined)).toEqual([]);
    });

    it('positive: number NaN/Infinity 被检出', () => {
        expect(findNonFinite(NaN)).toContain('=NaN');
        expect(findNonFinite(Infinity)).toContain('=Infinity');
        expect(findNonFinite(-Infinity)).toContain('=-Infinity');
    });

    it('positive: 字符串级 NaN/Infinity 被检出 (当前完全缺失的一类)', () => {
        expect(findNonFinite('D(k=1) ~ NaN rad/nm')).toContain('="D(k=1) ~ NaN rad/nm"');
        expect(findNonFinite('value is Infinity')).toContain('="value is Infinity"');
        expect(findNonFinite('no problem here')).toEqual([]);
    });

    it('positive: 深层嵌套路径正确定位', () => {
        const data = { a: { b: [{ c: NaN }] } };
        const result = findNonFinite(data);
        expect(result).toHaveLength(1);
        expect(result[0]).toContain('a.b[0].c');
    });

    it('positive: 数组索引路径正确', () => {
        const data = [1, 2, NaN, 4];
        const result = findNonFinite(data);
        expect(result).toHaveLength(1);
        expect(result[0]).toContain('[2]');
    });

    it('edge: 空数组/空对象返回空', () => {
        expect(findNonFinite([])).toEqual([]);
        expect(findNonFinite({})).toEqual([]);
    });

    it('edge: 混合类型结构', () => {
        const data = { num: 1, str: 'ok', arr: [Infinity, 'fine'], nested: { x: 'has NaN inside' } };
        const result = findNonFinite(data);
        expect(result).toHaveLength(2);
        expect(result[0]).toContain('arr[0]');
        expect(result[1]).toContain('nested.x');
    });
});

describe('findNonBreakMarkerNaNs', () => {
    it('positive: {NaN, NaN} 断点合法 → 返回空', () => {
        const result = {
            charts: {
                x_t: {
                    points: [
                        { x: 1, y: 2 },
                        { x: NaN, y: NaN }
                    ]
                }
            }
        };
        expect(findNonBreakMarkerNaNs(result)).toEqual([]);
    });

    it('positive: 仅 x 为 NaN (非断点) → 检出', () => {
        const result = { charts: { x_t: { points: [{ x: NaN, y: 5 }] } } };
        const problems = findNonBreakMarkerNaNs(result);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain('x_t[0]');
    });

    it('positive: 仅 y 为 NaN (非断点) → 检出', () => {
        const result = { charts: { x_t: { points: [{ x: 1, y: NaN }] } } };
        const problems = findNonBreakMarkerNaNs(result);
        expect(problems).toHaveLength(1);
    });

    it('edge: 空 charts / 无 points → 返回空', () => {
        expect(findNonBreakMarkerNaNs({})).toEqual([]);
        expect(findNonBreakMarkerNaNs({ charts: {} })).toEqual([]);
        expect(findNonBreakMarkerNaNs({ charts: { x_t: {} } })).toEqual([]);
    });
});

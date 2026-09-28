/**
 * maxOf / minOf 共享工具 — 单元测试 (#29)
 *
 * 覆盖: 空数组 / 单元素 / 全负数 / NaN 传播 / 20 万元素不抛异常
 */
import { describe, it, expect } from 'vitest';
import { maxOf, minOf } from '../../src/math/reduce.js';

describe('maxOf', () => {
    it('positive: 正常数组返回最大值', () => {
        expect(maxOf([1, 5, 3, 9, 2])).toBe(9);
    });

    it('positive: 单元素数组', () => {
        expect(maxOf([42])).toBe(42);
    });

    it('positive: 全负数数组', () => {
        expect(maxOf([-5, -1, -10])).toBe(-1);
    });

    it('edge: 空数组返回 -Infinity (与 Math.max() 一致)', () => {
        expect(maxOf([])).toBe(-Infinity);
    });

    it('edge: NaN 传播 (与 Math.max 一致: 任一 NaN → NaN)', () => {
        expect(Number.isNaN(maxOf([1, NaN, 3]))).toBe(true);
    });

    it('edge: 20 万元素不抛异常 (回归 #29 RangeError)', () => {
        const big = Array.from({ length: 200_000 }, (_, i) => i);
        expect(() => maxOf(big)).not.toThrow();
        expect(maxOf(big)).toBe(199_999);
    });

    it('positive: 接受 Iterable (非数组)', () => {
        expect(maxOf(new Set([3, 1, 2]))).toBe(3);
    });
});

describe('minOf', () => {
    it('positive: 正常数组返回最小值', () => {
        expect(minOf([5, 1, 9, 3])).toBe(1);
    });

    it('positive: 单元素数组', () => {
        expect(minOf([42])).toBe(42);
    });

    it('positive: 全负数数组', () => {
        expect(minOf([-1, -5, -10])).toBe(-10);
    });

    it('edge: 空数组返回 Infinity (与 Math.min() 一致)', () => {
        expect(minOf([])).toBe(Infinity);
    });

    it('edge: NaN 传播 (与 Math.min 一致: 任一 NaN → NaN)', () => {
        expect(Number.isNaN(minOf([1, NaN, 3]))).toBe(true);
    });

    it('edge: 20 万元素不抛异常 (回归 #29 RangeError)', () => {
        const big = Array.from({ length: 200_000 }, (_, i) => i);
        expect(() => minOf(big)).not.toThrow();
        expect(minOf(big)).toBe(0);
    });

    it('positive: 接受 Iterable (非数组)', () => {
        expect(minOf(new Set([3, 1, 2]))).toBe(1);
    });
});

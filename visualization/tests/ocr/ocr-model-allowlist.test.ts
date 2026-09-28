/**
 * OCR 模型白名单判定 — 单元测试 (#26)
 *
 * 覆盖: 白名单命中 / 未命中回落 / 空列表回落默认 / undefined 请求回落
 */
import { describe, it, expect } from 'vitest';
import { resolveModel } from '../../server/ocr-utils';

describe('resolveModel', () => {
    it('positive: 请求模型在白名单内 → 透传', () => {
        expect(resolveModel('claude-sonnet-4-6', ['claude-sonnet-4-6', 'claude-haiku-4-5'], 'claude-sonnet-4-6')).toBe(
            'claude-sonnet-4-6'
        );
    });

    it('positive: 请求模型在白名单内 (多选一)', () => {
        expect(resolveModel('claude-haiku-4-5', ['claude-sonnet-4-6', 'claude-haiku-4-5'], 'claude-sonnet-4-6')).toBe(
            'claude-haiku-4-5'
        );
    });

    it('edge: 请求模型不在白名单 → 回落默认', () => {
        expect(resolveModel('gpt-4', ['claude-sonnet-4-6'], 'claude-sonnet-4-6')).toBe('claude-sonnet-4-6');
    });

    it('edge: 白名单为空 → 回落默认', () => {
        expect(resolveModel('claude-sonnet-4-6', [], 'claude-sonnet-4-6')).toBe('claude-sonnet-4-6');
    });

    it('edge: 请求为 undefined → 回落默认', () => {
        expect(resolveModel(undefined, ['claude-sonnet-4-6'], 'claude-sonnet-4-6')).toBe('claude-sonnet-4-6');
    });

    it('edge: 请求为空串 → 回落默认', () => {
        expect(resolveModel('', ['claude-sonnet-4-6'], 'claude-sonnet-4-6')).toBe('claude-sonnet-4-6');
    });

    it('edge: 白名单有重复项不影响判定', () => {
        expect(resolveModel('a', ['a', 'a', 'b'], 'fallback')).toBe('a');
    });
});

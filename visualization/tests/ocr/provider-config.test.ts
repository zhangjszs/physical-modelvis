/**
 * 提供方环境变量配置解析 — 单元测试 (#74)
 *
 * 覆盖: 内置 anthropic/openai 槽位、动态 OpenAI 兼容槽位 (DEEPSEEK_* 等)、
 * 默认提供方选择 (OCR_PROVIDER → anthropic → 首个可用)、动态槽位缺 BASE_URL 不可用、
 * 各提供方独立白名单 (含 anthropic 兼容旧 OCR_PROXY_ALLOWED_MODELS)、保留前缀排除
 */
import { describe, it, expect } from 'vitest';
import { resolveProviderConfigs } from '../../server/vision-providers';

function env(vars: Record<string, string>): Record<string, string | undefined> {
    return { ...vars };
}

describe('resolveProviderConfigs — 内置 anthropic 槽位', () => {
    it('positive: 仅 ANTHROPIC_AUTH_TOKEN → anthropic 可用且为默认', () => {
        const r = resolveProviderConfigs(env({ ANTHROPIC_AUTH_TOKEN: 'sk-1' }));
        expect(r.providers).toHaveLength(1);
        expect(r.providers[0]!.id).toBe('anthropic');
        expect(r.providers[0]!.protocol).toBe('anthropic');
        expect(r.providers[0]!.baseUrl).toBe('https://api.anthropic.com');
        expect(r.providers[0]!.defaultModel).toBe('claude-sonnet-4-6');
        expect(r.defaultProviderId).toBe('anthropic');
    });

    it('positive: ANTHROPIC_API_KEY 别名等效', () => {
        const r = resolveProviderConfigs(env({ ANTHROPIC_API_KEY: 'sk-1' }));
        expect(r.providers[0]!.id).toBe('anthropic');
        expect(r.providers[0]!.authToken).toBe('sk-1');
    });

    it('edge: 两者同设 → AUTH_TOKEN 优先 (沿用原 anthropic 口径)', () => {
        const r = resolveProviderConfigs(env({ ANTHROPIC_AUTH_TOKEN: 'sk-token', ANTHROPIC_API_KEY: 'sk-key' }));
        expect(r.providers[0]!.authToken).toBe('sk-token');
    });

    it('positive: 显式 BASE_URL/MODEL 覆盖默认', () => {
        const r = resolveProviderConfigs(
            env({
                ANTHROPIC_AUTH_TOKEN: 'sk-1',
                ANTHROPIC_BASE_URL: 'https://relay.example.com',
                ANTHROPIC_MODEL: 'claude-3'
            })
        );
        expect(r.providers[0]!.baseUrl).toBe('https://relay.example.com');
        expect(r.providers[0]!.defaultModel).toBe('claude-3');
    });

    it('positive: 白名单走旧全局 OCR_PROXY_ALLOWED_MODELS (回归口径)', () => {
        const r = resolveProviderConfigs(env({ ANTHROPIC_AUTH_TOKEN: 'sk-1', OCR_PROXY_ALLOWED_MODELS: 'a, b ,c' }));
        expect(r.providers[0]!.allowedModels).toEqual(['a', 'b', 'c']);
    });

    it('positive: ANTHROPIC_ALLOWED_MODELS 优先于旧全局', () => {
        const r = resolveProviderConfigs(
            env({ ANTHROPIC_AUTH_TOKEN: 'sk-1', ANTHROPIC_ALLOWED_MODELS: 'm1', OCR_PROXY_ALLOWED_MODELS: 'old' })
        );
        expect(r.providers[0]!.allowedModels).toEqual(['m1']);
    });
});

describe('resolveProviderConfigs — 内置 openai 槽位', () => {
    it('positive: 仅 OPENAI_API_KEY → 默认 base URL 与 gpt-4o', () => {
        const r = resolveProviderConfigs(env({ OPENAI_API_KEY: 'sk-o1' }));
        expect(r.providers[0]!.id).toBe('openai');
        expect(r.providers[0]!.protocol).toBe('openai-compatible');
        expect(r.providers[0]!.baseUrl).toBe('https://api.openai.com/v1');
        expect(r.providers[0]!.defaultModel).toBe('gpt-4o');
        expect(r.defaultProviderId).toBe('openai');
    });

    it('positive: OPENAI_AUTH_TOKEN 变体等效', () => {
        const r = resolveProviderConfigs(env({ OPENAI_AUTH_TOKEN: 'sk-o1' }));
        expect(r.providers[0]!.authToken).toBe('sk-o1');
    });
});

describe('resolveProviderConfigs — 动态 OpenAI 兼容槽位', () => {
    it('positive: DEEPSEEK_* 齐备 → 注册 deepseek (openai-compatible), 模型可配', () => {
        const r = resolveProviderConfigs(
            env({
                DEEPSEEK_BASE_URL: 'https://api.deepseek.com/v1',
                DEEPSEEK_API_KEY: 'sk-d1',
                DEEPSEEK_MODEL: 'deepseek-chat'
            })
        );
        expect(r.providers).toHaveLength(1);
        expect(r.providers[0]!.id).toBe('deepseek');
        expect(r.providers[0]!.protocol).toBe('openai-compatible');
        expect(r.providers[0]!.defaultModel).toBe('deepseek-chat');
        // 仅一组 OpenAI 兼容 env 时默认提供方自动回落到它 (验收 1: 无需 anthropic)
        expect(r.defaultProviderId).toBe('deepseek');
    });

    it('edge: 动态槽位缺 BASE_URL → 不可用 (无 base URL 的上游无法请求)', () => {
        const r = resolveProviderConfigs(env({ DEEPSEEK_API_KEY: 'sk-d1' }));
        expect(r.providers).toHaveLength(0);
        expect(r.defaultProviderId).toBe('anthropic');
    });

    it('edge: 保留前缀 OCR 不参与发现', () => {
        const r = resolveProviderConfigs(env({ OCR_API_KEY: 'x', OCR_BASE_URL: 'https://x.example.com' }));
        expect(r.providers).toHaveLength(0);
    });
});

describe('resolveProviderConfigs — 默认提供方选择', () => {
    const both = {
        ANTHROPIC_AUTH_TOKEN: 'sk-a',
        DEEPSEEK_BASE_URL: 'https://api.deepseek.com/v1',
        DEEPSEEK_API_KEY: 'sk-d'
    };

    it('positive: anthropic 与动态槽位并存 → 默认 anthropic', () => {
        const r = resolveProviderConfigs(env(both));
        expect(r.providers.map(p => p.id)).toEqual(['anthropic', 'deepseek']);
        expect(r.defaultProviderId).toBe('anthropic');
    });

    it('positive: OCR_PROVIDER 显式指定优先 (大小写/空白归一)', () => {
        expect(resolveProviderConfigs(env({ ...both, OCR_PROVIDER: ' DeepSeek ' })).defaultProviderId).toBe('deepseek');
    });

    it('positive: 显式指定不可用 id → 原值透传 (由调用方校验退出)', () => {
        const r = resolveProviderConfigs(env({ ANTHROPIC_AUTH_TOKEN: 'sk-a', OCR_PROVIDER: 'nope' }));
        expect(r.defaultProviderId).toBe('nope');
    });

    it('edge: 空环境 → 无可用提供方, 默认 anthropic (调用方以原口径退出)', () => {
        const r = resolveProviderConfigs(env({}));
        expect(r.providers).toHaveLength(0);
        expect(r.defaultProviderId).toBe('anthropic');
    });

    it('edge: DEEPSEEK_ALLOWED_MODELS 按提供方独立生效', () => {
        const r = resolveProviderConfigs(env({ ...both, DEEPSEEK_ALLOWED_MODELS: 'deepseek-chat' }));
        expect(r.providers.find(p => p.id === 'deepseek')!.allowedModels).toEqual(['deepseek-chat']);
        expect(r.providers.find(p => p.id === 'anthropic')!.allowedModels).toEqual([]);
    });
});

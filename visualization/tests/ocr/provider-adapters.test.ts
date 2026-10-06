/**
 * 视觉提供方适配器 — 单元测试 (#74)
 *
 * 覆盖: anthropic / openai-compatible 两适配器的请求构造与响应解析、
 * parseImageDataUrl 图片解析、mapUpstreamError 错误映射 (401→502 / 429→502 / 其余→502)
 */
import { describe, it, expect } from 'vitest';
import { createAnthropicProvider } from '../../server/providers/anthropic';
import { createOpenAICompatibleProvider } from '../../server/providers/openai-compatible';
import { parseImageDataUrl, mapUpstreamError, parseCsvList } from '../../server/ocr-utils';
import {
    OCR_SYSTEM_PROMPT,
    OCR_USER_TEXT,
    GENERATE_SYSTEM_PROMPT,
    buildGenerateUserText,
    isRecord,
    type ProviderConfig
} from '../../server/vision-providers';

const anthropicConfig: ProviderConfig = {
    id: 'anthropic',
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    authToken: 'sk-ant-test',
    defaultModel: 'claude-sonnet-4-6',
    allowedModels: []
};

const openaiConfig: ProviderConfig = {
    id: 'deepseek',
    protocol: 'openai-compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    authToken: 'sk-ds-test',
    defaultModel: 'deepseek-chat',
    allowedModels: []
};

const IMAGE = {
    dataUrl: 'data:image/png;base64,QUJD',
    mediaType: 'image/png',
    base64: 'QUJD'
};

describe('createAnthropicProvider — buildRequest', () => {
    const provider = createAnthropicProvider(anthropicConfig);

    it('positive: URL/头/体结构与原 ocr-proxy 行为一致', () => {
        const req = provider.buildRequest(IMAGE, 'claude-sonnet-4-6', OCR_SYSTEM_PROMPT);
        expect(req.url).toBe('https://api.anthropic.com/v1/messages');
        expect(req.headers['x-api-key']).toBe('sk-ant-test');
        expect(req.headers['anthropic-version']).toBe('2023-06-01');
        expect(req.headers['Content-Type']).toBe('application/json');
        expect(req.body.model).toBe('claude-sonnet-4-6');
        expect(req.body.max_tokens).toBe(3000);
        expect(req.body.system).toBe(OCR_SYSTEM_PROMPT);
    });

    it('positive: 图片解析为 base64 块 + 文本块', () => {
        const req = provider.buildRequest(IMAGE, 'm', 'sys');
        const messages = req.body.messages as Array<{ role: string; content: Array<Record<string, unknown>> }>;
        expect(messages).toHaveLength(1);
        expect(messages[0]!.role).toBe('user');
        expect(messages[0]!.content[0]).toEqual({
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: 'QUJD' }
        });
        expect(messages[0]!.content[1]).toEqual({ type: 'text', text: OCR_USER_TEXT });
    });
});

describe('createAnthropicProvider — buildTextRequest (#76 纯文本变体)', () => {
    const provider = createAnthropicProvider(anthropicConfig);

    it('positive: URL/头与图片请求一致, user.content 仅文本块无图片块', () => {
        const req = provider.buildTextRequest('生成 3 道变式', 'claude-sonnet-4-6', GENERATE_SYSTEM_PROMPT);
        expect(req.url).toBe('https://api.anthropic.com/v1/messages');
        expect(req.headers['x-api-key']).toBe('sk-ant-test');
        expect(req.headers['anthropic-version']).toBe('2023-06-01');
        expect(req.body.model).toBe('claude-sonnet-4-6');
        expect(req.body.system).toBe(GENERATE_SYSTEM_PROMPT);
        const messages = req.body.messages as Array<{ role: string; content: Array<Record<string, unknown>> }>;
        expect(messages).toHaveLength(1);
        expect(messages[0]!.role).toBe('user');
        expect(messages[0]!.content).toEqual([{ type: 'text', text: '生成 3 道变式' }]);
    });

    it('edge: 空串 userText 原样透传 (不注入默认文案)', () => {
        const req = provider.buildTextRequest('', 'm', 'sys');
        const messages = req.body.messages as Array<{ content: Array<{ text: string }> }>;
        expect(messages[0]!.content[0]!.text).toBe('');
    });
});

describe('createAnthropicProvider — parseResponse', () => {
    const provider = createAnthropicProvider(anthropicConfig);

    it('positive: 提取 content[0].text', () => {
        expect(provider.parseResponse({ content: [{ type: 'text', text: '```json\n{"problems":[]}\n```' }] })).toBe(
            '```json\n{"problems":[]}\n```'
        );
    });

    it('edge: content 缺失/为空/首块非字符串 → null', () => {
        expect(provider.parseResponse({})).toBeNull();
        expect(provider.parseResponse({ content: [] })).toBeNull();
        expect(provider.parseResponse({ content: [{ type: 'tool_use' }] })).toBeNull();
        expect(provider.parseResponse({ content: 'not-array' })).toBeNull();
        expect(provider.parseResponse(null)).toBeNull();
    });
});

describe('createOpenAICompatibleProvider — buildRequest', () => {
    const provider = createOpenAICompatibleProvider(openaiConfig);

    it('positive: URL 为 {baseURL}/chat/completions, Bearer 头', () => {
        const req = provider.buildRequest(IMAGE, 'deepseek-chat', OCR_SYSTEM_PROMPT);
        expect(req.url).toBe('https://api.deepseek.com/v1/chat/completions');
        expect(req.headers.Authorization).toBe('Bearer sk-ds-test');
        expect(req.body.model).toBe('deepseek-chat');
        expect(req.body.max_tokens).toBe(3000);
    });

    it('positive: system + user[image_url(完整 dataURL), text] 消息结构', () => {
        const req = provider.buildRequest(IMAGE, 'm', 'sys-prompt');
        const messages = req.body.messages as Array<{ role: string; content: unknown }>;
        expect(messages[0]).toEqual({ role: 'system', content: 'sys-prompt' });
        expect(messages[1]!.role).toBe('user');
        expect(messages[1]!.content).toEqual([
            { type: 'image_url', image_url: { url: 'data:image/png;base64,QUJD' } },
            { type: 'text', text: OCR_USER_TEXT }
        ]);
    });
});

describe('createOpenAICompatibleProvider — buildTextRequest (#76 纯文本变体)', () => {
    const provider = createOpenAICompatibleProvider(openaiConfig);

    it('positive: system + user 纯字符串消息 (无 image_url)', () => {
        const req = provider.buildTextRequest('生成 3 道变式', 'deepseek-chat', GENERATE_SYSTEM_PROMPT);
        expect(req.url).toBe('https://api.deepseek.com/v1/chat/completions');
        expect(req.headers.Authorization).toBe('Bearer sk-ds-test');
        expect(req.body.model).toBe('deepseek-chat');
        const messages = req.body.messages as Array<{ role: string; content: unknown }>;
        expect(messages[0]).toEqual({ role: 'system', content: GENERATE_SYSTEM_PROMPT });
        expect(messages[1]).toEqual({ role: 'user', content: '生成 3 道变式' });
    });

    it('edge: 空串 userText 原样透传', () => {
        const req = provider.buildTextRequest('', 'm', 'sys');
        const messages = req.body.messages as Array<{ content: unknown }>;
        expect(messages[1]!.content).toBe('');
    });
});

describe('createOpenAICompatibleProvider — parseResponse', () => {
    const provider = createOpenAICompatibleProvider(openaiConfig);

    it('positive: 提取 choices[0].message.content 字符串', () => {
        expect(provider.parseResponse({ choices: [{ message: { content: '{"problems":[]}' } }] })).toBe(
            '{"problems":[]}'
        );
    });

    it('edge: choices 缺失/为空/content 非字符串 → null', () => {
        expect(provider.parseResponse({})).toBeNull();
        expect(provider.parseResponse({ choices: [] })).toBeNull();
        expect(provider.parseResponse({ choices: [{ message: { content: null } }] })).toBeNull();
        expect(provider.parseResponse({ choices: [{}] })).toBeNull();
        expect(provider.parseResponse('str')).toBeNull();
    });
});

describe('parseImageDataUrl', () => {
    it('positive: 标准 PNG dataURL 解析出媒体类型与 base64', () => {
        expect(parseImageDataUrl('data:image/png;base64,iVBOR')).toEqual({ mediaType: 'image/png', base64: 'iVBOR' });
    });

    it('positive: jpeg/webp/gif 同样解析', () => {
        expect(parseImageDataUrl('data:image/jpeg;base64,AA')?.mediaType).toBe('image/jpeg');
        expect(parseImageDataUrl('data:image/webp;base64,AA')?.mediaType).toBe('image/webp');
        expect(parseImageDataUrl('data:image/gif;base64,AA')?.mediaType).toBe('image/gif');
    });

    it('edge: 缺 base64 段 / 非 image 类型 / 空串 → null', () => {
        expect(parseImageDataUrl('data:image/png')).toBeNull();
        expect(parseImageDataUrl('data:text/html;base64,AA')).toBeNull();
        expect(parseImageDataUrl('')).toBeNull();
    });
});

describe('mapUpstreamError', () => {
    it('positive: 401 → 502 固定文案', () => {
        expect(mapUpstreamError(401, '')).toEqual({ httpStatus: 502, error: '上游 API Key 无效' });
    });

    it('positive: 429 → 502 固定文案', () => {
        expect(mapUpstreamError(429, '')).toEqual({ httpStatus: 502, error: '上游 API 请求过于频繁' });
    });

    it('edge: 其余状态 → 502 并截断上游错误片段至 200 字符', () => {
        const long = 'x'.repeat(300);
        const mapped = mapUpstreamError(503, long);
        expect(mapped.httpStatus).toBe(502);
        expect(mapped.error).toBe(`上游 API 错误 (503): ${'x'.repeat(200)}`);
    });
});

describe('提示词单一真源', () => {
    it('positive: 系统提示词含 JSON schema 与 sceneTemplate 规则关键串', () => {
        expect(OCR_SYSTEM_PROMPT).toContain('"problems"');
        expect(OCR_SYSTEM_PROMPT).toContain('sceneTemplate');
        expect(OCR_SYSTEM_PROMPT).toContain('只返回 JSON，不要其他文字。');
    });

    it('positive: 生成提示词 (#76) 与识别同 schema, 含变式规则关键串', () => {
        expect(GENERATE_SYSTEM_PROMPT).toContain('"problems"');
        expect(GENERATE_SYSTEM_PROMPT).toContain('sceneTemplate');
        expect(GENERATE_SYSTEM_PROMPT).toContain('同题型变式题');
        expect(GENERATE_SYSTEM_PROMPT).toContain('只返回 JSON，不要其他文字。');
    });

    it('positive: buildGenerateUserText 内联原题 JSON 并指定数量', () => {
        const userText = buildGenerateUserText({ title: '平抛', given: { v0: 10 } }, 3);
        expect(userText).toContain('生成 3 道变式题');
        expect(userText).toContain('"title":"平抛"');
        expect(userText).toContain('原题：');
    });
});

describe('parseCsvList', () => {
    it('positive: 逗号分隔解析并去空白', () => {
        expect(parseCsvList('a, b ,c')).toEqual(['a', 'b', 'c']);
    });

    it('edge: 缺省/空串/全空项 → 空数组', () => {
        expect(parseCsvList(undefined)).toEqual([]);
        expect(parseCsvList('')).toEqual([]);
        expect(parseCsvList(' , , ')).toEqual([]);
    });
});

describe('isRecord', () => {
    it('positive: 纯对象判真', () => {
        expect(isRecord({ a: 1 })).toBe(true);
    });

    it('edge: 数组/null/原始值判假', () => {
        expect(isRecord([1])).toBe(false);
        expect(isRecord(null)).toBe(false);
        expect(isRecord('obj')).toBe(false);
        expect(isRecord(undefined)).toBe(false);
    });
});

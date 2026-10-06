/**
 * OCR 代理 HTTP 层测试 (#75, #76 扩展 generate 端点)
 *
 * 覆盖 recognize 验收标准 2 的 5 条路径 + generate (#76) 输入校验/归一化复用/截断 +
 * 启动期配置校验 (/health):
 *   - 400 入参校验 (缺图/格式/超 10MB) / 429 限流 / 502 上游错误 / 504 上游超时 / 成功归一化
 *
 * 方案: ocr-proxy-app 工厂在进程内创建独立 app (限流计数器随实例隔离),
 * 经真实 HTTP (node fetch) 请求随机端口实例; 上游 Anthropic API 由本地
 * node:http mock 替身顶替 (可编程响应/挂起), 校验代理的路由与错误映射。
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createOcrProxyApp } from '../../server/ocr-proxy-app';

/** 仅过格式校验的最小 data URL (上游被 mock, 内容不参与识别) */
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgo=';

type UpstreamHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

let upstreamHandler: UpstreamHandler = () => undefined;
const upstream = http.createServer((req, res) => upstreamHandler(req, res));
let upstreamOrigin = '';

/** 上游返回 Anthropic 格式的有效识别内容 (带 ```json 围栏, 验证代理剥离) */
function respondAnthropicText(res: http.ServerResponse, text: string) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ content: [{ type: 'text', text }] }));
}

const VALID_UPSTREAM_TEXT =
    '```json\n' +
    JSON.stringify({
        problems: [
            { title: '斜面滑块', description: '质量 2kg 沿斜面下滑', sceneTemplate: 'spring', given: { 质量: 2 } }
        ]
    }) +
    '\n```';

interface ProxyInstance {
    baseUrl: string;
    close(): Promise<void>;
}

/** 每测试独立 app 实例 (隔离限流计数器), 随机端口; 上游指向本地 mock */
async function startProxy(env: Record<string, string> = {}): Promise<ProxyInstance> {
    const proxy = createOcrProxyApp({
        ANTHROPIC_AUTH_TOKEN: 'sk-test',
        ANTHROPIC_BASE_URL: upstreamOrigin,
        ...env
    });
    const server = proxy.app.listen(0);
    await new Promise<void>(resolve => server.once('listening', () => resolve()));
    const { port } = server.address() as AddressInfo;
    return {
        baseUrl: `http://127.0.0.1:${port}`,
        async close() {
            await new Promise<void>(resolve => server.close(() => resolve()));
            proxy.dispose();
        }
    };
}

async function postJson(
    baseUrl: string,
    path: string,
    body: unknown
): Promise<{ status: number; json: Record<string, unknown> }> {
    const resp = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return { status: resp.status, json: (await resp.json()) as Record<string, unknown> };
}

beforeAll(async () => {
    // 工厂启动日志 (提供方/超时) 属启动行为而非测试断言对象, 静默保持输出可读
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await new Promise<void>(resolve => upstream.listen(0, () => resolve()));
    const { port } = upstream.address() as AddressInfo;
    upstreamOrigin = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
    vi.restoreAllMocks();
    // 挂起的上游连接 (504 测试) 会阻塞 close, 先强断
    upstream.closeAllConnections();
    await new Promise<void>(resolve => upstream.close(() => resolve()));
});

let open: ProxyInstance[] = [];
afterEach(async () => {
    for (const p of open) await p.close();
    open = [];
});

describe('createOcrProxyApp — 启动期配置校验', () => {
    it('edge: 无任何提供方凭证 → 抛错 (入口转 exit 1, 行为与抽出前一致)', () => {
        expect(() => createOcrProxyApp({})).toThrowError(/未设置 ANTHROPIC_AUTH_TOKEN 或 ANTHROPIC_API_KEY/);
    });

    it('edge: OCR_PROVIDER 指向不可用提供方 → 抛错并列出可用项', () => {
        expect(() => createOcrProxyApp({ ANTHROPIC_AUTH_TOKEN: 'sk-1', OCR_PROVIDER: 'nope' })).toThrowError(
            /OCR_PROVIDER=nope 未配置或不可用; 可用提供方: anthropic/
        );
    });
});

describe('POST /api/ocr/recognize — 入参校验 400', () => {
    it('edge: 缺图 / 非图片格式 / 超 10MB 各返回 400 与对应文案', async () => {
        upstreamHandler = (_req, res) => respondAnthropicText(res, VALID_UPSTREAM_TEXT);
        const proxy = await startProxy();
        open.push(proxy);

        const missing = await postJson(proxy.baseUrl, '/api/ocr/recognize', {});
        expect(missing.status).toBe(400);
        expect(missing.json.error).toBe('缺少图片数据');

        const wrongType = await postJson(proxy.baseUrl, '/api/ocr/recognize', { image: 'file:///etc/passwd' });
        expect(wrongType.status).toBe(400);
        expect(wrongType.json.error).toBe('仅支持 PNG/JPEG/WebP/GIF 格式');

        const oversized = await postJson(proxy.baseUrl, '/api/ocr/recognize', {
            image: `data:image/png;base64,${'A'.repeat(14 * 1024 * 1024)}`
        });
        expect(oversized.status).toBe(400);
        expect(oversized.json.error).toBe('图片不能超过 10MB');
    });
});

describe('POST /api/ocr/recognize — 限流 429', () => {
    it('edge: 同 IP 窗口内第 11 个请求 → 429 请求过于频繁', async () => {
        upstreamHandler = (_req, res) => respondAnthropicText(res, VALID_UPSTREAM_TEXT);
        const proxy = await startProxy();
        open.push(proxy);

        for (let i = 0; i < 10; i++) {
            const r = await postJson(proxy.baseUrl, '/api/ocr/recognize', { image: TINY_PNG });
            expect(r.status).toBe(200);
        }
        const eleventh = await postJson(proxy.baseUrl, '/api/ocr/recognize', { image: TINY_PNG });
        expect(eleventh.status).toBe(429);
        expect(eleventh.json.error).toBe('请求过于频繁，请稍后再试');
    });
});

describe('POST /api/ocr/recognize — 上游错误映射 502', () => {
    it('edge: 上游 401 → 502 上游 API Key 无效', async () => {
        upstreamHandler = (_req, res) => {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'invalid x-api-key' }));
        };
        const proxy = await startProxy();
        open.push(proxy);

        const r = await postJson(proxy.baseUrl, '/api/ocr/recognize', { image: TINY_PNG });
        expect(r.status).toBe(502);
        expect(r.json.error).toBe('上游 API Key 无效');
    });

    it('edge: 上游 500 → 502 并透传上游错误片段', async () => {
        upstreamHandler = (_req, res) => {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('upstream exploded');
        };
        const proxy = await startProxy();
        open.push(proxy);

        const r = await postJson(proxy.baseUrl, '/api/ocr/recognize', { image: TINY_PNG });
        expect(r.status).toBe(502);
        expect(r.json.error).toBe('上游 API 错误 (500): upstream exploded');
    });
});

describe('POST /api/ocr/recognize — 上游超时 504', () => {
    it('edge: 上游挂起超过 OCR_PROXY_TIMEOUT_MS → 504 上游 API 请求超时', async () => {
        upstreamHandler = (_req, res) => {
            // 刻意不响应: 代理侧超时 (150ms) 应先到
            void res;
        };
        const proxy = await startProxy({ OCR_PROXY_TIMEOUT_MS: '150' });
        open.push(proxy);

        const r = await postJson(proxy.baseUrl, '/api/ocr/recognize', { image: TINY_PNG });
        expect(r.status).toBe(504);
        expect(r.json.error).toBe('上游 API 请求超时，请稍后重试');
    });
});

describe('POST /api/ocr/recognize — 成功归一化', () => {
    it('positive: 剥围栏 + 归一化 {problems[]} (补 1-based 题号) + meta (provider/model)', async () => {
        upstreamHandler = (_req, res) => respondAnthropicText(res, VALID_UPSTREAM_TEXT);
        const proxy = await startProxy();
        open.push(proxy);

        const r = await postJson(proxy.baseUrl, '/api/ocr/recognize', { image: TINY_PNG });
        expect(r.status).toBe(200);
        const result = r.json.result as { problems: Array<{ index: number; title: string }> };
        expect(result.problems).toHaveLength(1);
        expect(result.problems[0]!.title).toBe('斜面滑块');
        expect(result.problems[0]!.index).toBe(1);
        expect(r.json.meta).toMatchObject({
            provider: 'anthropic',
            model: 'claude-sonnet-4-6',
            requestedModel: null,
            modelFallback: false
        });
    });

    it('positive: 请求模型不在白名单 → 回落默认模型且 meta.modelFallback=true', async () => {
        upstreamHandler = (_req, res) => respondAnthropicText(res, VALID_UPSTREAM_TEXT);
        const proxy = await startProxy();
        open.push(proxy);

        const r = await postJson(proxy.baseUrl, '/api/ocr/recognize', { image: TINY_PNG, model: 'gpt-99' });
        expect(r.status).toBe(200);
        expect(r.json.meta).toMatchObject({
            model: 'claude-sonnet-4-6',
            requestedModel: 'gpt-99',
            modelFallback: true
        });
    });
});

describe('GET /api/ocr/health', () => {
    it('positive: 返回 status/defaultProvider/providers 清单', async () => {
        const proxy = await startProxy();
        open.push(proxy);

        const resp = await fetch(`${proxy.baseUrl}/api/ocr/health`);
        expect(resp.status).toBe(200);
        const json = (await resp.json()) as Record<string, unknown>;
        expect(json).toEqual({
            status: 'ok',
            defaultProvider: 'anthropic',
            providers: [{ id: 'anthropic', defaultModel: 'claude-sonnet-4-6' }]
        });
    });
});

// --- 举一反三: POST /api/problems/generate (#76) ---

/** 样例原题 (schema 同 recognize 输出) */
const SAMPLE_PROBLEM = {
    index: 1,
    type: 'fill-blank',
    title: '平抛运动',
    description: '从 20m 高处以 5m/s 水平抛出一个小球, 求落地时间',
    given: { 初速度: 5, 高度: 20 },
    sceneTemplate: 'projectile',
    formulas: ['h = 0.5 * g * t^2']
};

/** 构造含 n 道变式的上游围栏文本 (题目间用标题区分) */
function variantsFence(n: number): string {
    const problems = Array.from({ length: n }, (_, i) => ({
        type: 'fill-blank',
        title: `变式题${i + 1}`,
        description: `第 ${i + 1} 道变式: 从 ${20 + i}m 高处水平抛出`,
        given: { 初速度: 5 + i, 高度: 20 + i },
        sceneTemplate: 'projectile'
    }));
    return '```json\n' + JSON.stringify({ problems }) + '\n```';
}

describe('POST /api/problems/generate — 输入校验 400', () => {
    it('edge: 缺 problem / problem 为数组 → 400 缺少原题数据', async () => {
        upstreamHandler = (_req, res) => respondAnthropicText(res, variantsFence(1));
        const proxy = await startProxy();
        open.push(proxy);

        const missing = await postJson(proxy.baseUrl, '/api/problems/generate', { count: 2 });
        expect(missing.status).toBe(400);
        expect(missing.json.error).toBe('缺少原题数据');

        const arrayProblem = await postJson(proxy.baseUrl, '/api/problems/generate', {
            problem: [SAMPLE_PROBLEM]
        });
        expect(arrayProblem.status).toBe(400);
        expect(arrayProblem.json.error).toBe('缺少原题数据');
    });

    it('edge: count 越界 (0/6/小数/非数字) → 400 生成数量文案', async () => {
        upstreamHandler = (_req, res) => respondAnthropicText(res, variantsFence(1));
        const proxy = await startProxy();
        open.push(proxy);

        for (const count of [0, 6, 1.5, '3']) {
            const r = await postJson(proxy.baseUrl, '/api/problems/generate', { problem: SAMPLE_PROBLEM, count });
            expect(r.status).toBe(400);
            expect(r.json.error).toBe('生成数量须为 1-5 的整数');
        }
    });

    it('edge: provider 不可用 → 400 (与 recognize 共用路由)', async () => {
        upstreamHandler = (_req, res) => respondAnthropicText(res, variantsFence(1));
        const proxy = await startProxy();
        open.push(proxy);

        const r = await postJson(proxy.baseUrl, '/api/problems/generate', {
            problem: SAMPLE_PROBLEM,
            provider: 'nope'
        });
        expect(r.status).toBe(400);
        expect(String(r.json.error)).toContain('nope');
    });
});

describe('POST /api/problems/generate — 成功与归一化复用', () => {
    it('positive: 上游返回 5 道 + count=3 → 截断为 3 道, schema 与 recognize 一致, meta 在案', async () => {
        const seen: Array<Record<string, unknown>> = [];
        upstreamHandler = (req, res) => {
            let body = '';
            req.on('data', c => (body += c));
            req.on('end', () => {
                seen.push(JSON.parse(body) as Record<string, unknown>);
                respondAnthropicText(res, variantsFence(5));
            });
        };
        const proxy = await startProxy();
        open.push(proxy);

        const r = await postJson(proxy.baseUrl, '/api/problems/generate', {
            problem: SAMPLE_PROBLEM,
            count: 3
        });
        expect(r.status).toBe(200);
        const result = r.json.result as { problems: Array<Record<string, unknown>> };
        expect(result.problems).toHaveLength(3); // 上游 5 道 → 服务端截断 ≤count
        expect(result.problems[0]!.title).toBe('变式题1');
        // 归一化复用: 补 1-based 题号 + 字段透传 (type/sceneTemplate/given 齐全)
        expect(result.problems.map(p => p.index)).toEqual([1, 2, 3]);
        expect(result.problems[0]).toMatchObject({ type: 'fill-blank', sceneTemplate: 'projectile' });
        expect(result.problems[0]!.given).toEqual({ 初速度: 5, 高度: 20 });
        expect(r.json.meta).toMatchObject({ provider: 'anthropic', modelFallback: false });

        // 上游请求为纯文本消息 (无图片块), system 走 Anthropic 顶层字段
        expect(seen).toHaveLength(1);
        expect(typeof seen[0]!.system).toBe('string');
        const messages = seen[0]!.messages as Array<{ role: string; content: unknown }>;
        expect(messages).toHaveLength(1);
        const user = messages[0] as { role: string; content: Array<{ type: string; text: string }> };
        expect(user.role).toBe('user');
        expect(user.content).toHaveLength(1);
        expect(user.content[0]!.type).toBe('text');
        expect(user.content[0]!.text).toContain('生成 3 道变式题');
        expect(user.content[0]!.text).toContain('平抛运动');
    });

    it('positive: count 缺省 → 默认 3, 上游 5 道截断为 3 道', async () => {
        upstreamHandler = (_req, res) => respondAnthropicText(res, variantsFence(5));
        const proxy = await startProxy();
        open.push(proxy);

        const r = await postJson(proxy.baseUrl, '/api/problems/generate', { problem: SAMPLE_PROBLEM });
        expect(r.status).toBe(200);
        const result = r.json.result as { problems: unknown[] };
        expect(result.problems).toHaveLength(3);
    });

    it('edge: 上游返回空数组 (归一化后零题) → 502', async () => {
        upstreamHandler = (_req, res) => respondAnthropicText(res, '```json\n{"problems":[]}\n```');
        const proxy = await startProxy();
        open.push(proxy);

        const r = await postJson(proxy.baseUrl, '/api/problems/generate', { problem: SAMPLE_PROBLEM });
        expect(r.status).toBe(502);
        expect(r.json.error).toBe('AI 返回内容中未识别到有效变式题');
    });

    it('edge: 上游 500 → 502 透传片段 (与 recognize 共用错误映射)', async () => {
        upstreamHandler = (_req, res) => {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('generate upstream exploded');
        };
        const proxy = await startProxy();
        open.push(proxy);

        const r = await postJson(proxy.baseUrl, '/api/problems/generate', { problem: SAMPLE_PROBLEM });
        expect(r.status).toBe(502);
        expect(r.json.error).toBe('上游 API 错误 (500): generate upstream exploded');
    });
});

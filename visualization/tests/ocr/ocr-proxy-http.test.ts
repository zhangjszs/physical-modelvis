/**
 * OCR 代理 HTTP 层测试 (#75)
 *
 * 覆盖验收标准 2 的 5 条路径 + 启动期配置校验 (/health):
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

/**
 * OCR 代理 Express 应用工厂 (#75)
 *
 * 自 ocr-proxy.ts 原地抽出 (行为/日志文案不变), 目的: HTTP 层测试可以在进程内
 * 创建独立 app 实例 (限流计数器/提供方解析随实例隔离), 经真实 HTTP 访问;
 * ocr-proxy.ts 保留为薄启动入口 (listen + 配置缺失 exit 1)。
 *
 * 端点:
 *   POST /api/ocr/recognize     — 图片识别 → {problems[]} (#74 起多提供方路由)
 *   POST /api/problems/generate — 举一反三: 原题 → 同题型变式题 (#76, 复用归一化与提供方路由)
 *   GET  /api/ocr/health        — 提供方清单
 *
 * 环境变量语义与原实现一致:
 *   OCR_PROXY_PORT / OCR_PROXY_TIMEOUT_MS / OCR_PROXY_CORS_ORIGINS
 *   ANTHROPIC_* / OCR_PROVIDER / *_ALLOWED_MODELS (见 vision-providers.ts)
 */
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import {
    stripJsonFence,
    normalizeRecognizeResult,
    resolveModel,
    parseImageDataUrl,
    mapUpstreamError,
    parseCsvList
} from './ocr-utils';
import {
    resolveProviderConfigs,
    OCR_SYSTEM_PROMPT,
    GENERATE_SYSTEM_PROMPT,
    buildGenerateUserText,
    type ProviderConfig,
    type VisionProvider,
    type VisionImage,
    type UpstreamRequest
} from './vision-providers';
import { createAnthropicProvider } from './providers/anthropic';
import { createOpenAICompatibleProvider } from './providers/openai-compatible';

/** 工厂产物: app + 入口所需的启动参数 + 测试隔离用的定时器清理 */
export interface OcrProxyApp {
    app: Express;
    /** 入口监听端口 (OCR_PROXY_PORT, 默认 3001); 测试通常改用 listen(0) 随机端口 */
    port: number;
    defaultProviderId: string;
    /** 清理工厂内创建的后台定时器 (限流窗口清扫); 生产入口进程生命周期内无需调用 */
    dispose(): void;
}

function createProvider(config: ProviderConfig): VisionProvider {
    switch (config.protocol) {
        case 'anthropic':
            return createAnthropicProvider(config);
        case 'openai-compatible':
            return createOpenAICompatibleProvider(config);
    }
}

/** 配置缺失 → 抛错 (由启动入口转 console.error + exit 1, 与原行为一致) */
export function createOcrProxyApp(env: NodeJS.ProcessEnv = process.env): OcrProxyApp {
    const PORT = Number(env.OCR_PROXY_PORT ?? 3001);

    // --- 提供方解析 (#74): env → 可用提供方实例 + 默认提供方 ---
    const resolution = resolveProviderConfigs(env);
    const providers = new Map<string, { config: ProviderConfig; vision: VisionProvider }>();
    for (const config of resolution.providers) {
        providers.set(config.id, { config, vision: createProvider(config) });
    }

    if (providers.size === 0) {
        throw new Error('错误: 未设置 ANTHROPIC_AUTH_TOKEN 或 ANTHROPIC_API_KEY 环境变量');
    }
    if (!providers.has(resolution.defaultProviderId)) {
        throw new Error(
            `错误: OCR_PROVIDER=${resolution.defaultProviderId} 未配置或不可用; 可用提供方: ${[...providers.keys()].join(', ')}`
        );
    }
    const defaultProviderId = resolution.defaultProviderId;

    for (const { config } of providers.values()) {
        console.log(
            `提供方 ${config.id}: API ${config.baseUrl} · 模型 ${config.defaultModel} · 白名单 ${config.allowedModels.join(', ') || '(仅默认模型)'}`
        );
    }
    console.log(`默认提供方: ${defaultProviderId}`);

    // 上游请求超时 (ms) — 防止慢请求挂起 Express handler (#26)
    const OCR_PROXY_TIMEOUT_MS = Number(env.OCR_PROXY_TIMEOUT_MS ?? 60000);
    console.log(`上游超时: ${OCR_PROXY_TIMEOUT_MS}ms`);

    // --- Rate limiting (in-memory, 10 req/min per IP) ---
    const hits = new Map<string, number[]>();
    const RATE_LIMIT = 10;
    const RATE_WINDOW = 60_000;

    const sweepTimer = setInterval(() => {
        const now = Date.now();
        for (const [ip, timestamps] of hits) {
            const filtered = timestamps.filter(t => now - t < RATE_WINDOW);
            if (filtered.length === 0) {
                hits.delete(ip);
            } else {
                hits.set(ip, filtered);
            }
        }
    }, 5 * 60_000);

    function rateLimit(req: Request, res: Response, next: NextFunction): void {
        const ip = req.ip ?? 'unknown';
        const now = Date.now();
        const timestamps = (hits.get(ip) ?? []).filter(t => now - t < RATE_WINDOW);
        if (timestamps.length >= RATE_LIMIT) {
            res.status(429).json({ error: '请求过于频繁，请稍后再试' });
            return;
        }
        timestamps.push(now);
        hits.set(ip, timestamps);
        next();
    }

    const app = express();

    // --- Middleware ---
    // CORS 白名单: 默认本地开发端口, 可用 OCR_PROXY_CORS_ORIGINS (逗号分隔) 追加 (#74)
    const CORS_ORIGINS = [
        'http://localhost:3000',
        'http://localhost:5173',
        ...parseCsvList(env.OCR_PROXY_CORS_ORIGINS)
    ];
    app.use(cors({ origin: CORS_ORIGINS }));
    app.use(express.json({ limit: '15mb' }));
    app.use(rateLimit);

    /** 提供方路由 (#74, #76 抽取共用): 显式指定且可用 → 用之; 指定但不可用 → error; 未指定 → 服务端默认 */
    function routeProvider(
        provider: string | undefined
    ): { error: string } | { config: ProviderConfig; vision: VisionProvider } {
        const requestedProvider = typeof provider === 'string' ? provider.trim().toLowerCase() : '';
        if (requestedProvider && !providers.has(requestedProvider)) {
            return { error: `提供方 ${requestedProvider} 不可用; 可用提供方: ${[...providers.keys()].join(', ')}` };
        }
        const providerId = requestedProvider || defaultProviderId;
        return providers.get(providerId)!;
    }

    /** 统一成功响应: { result, meta } — recognize 与 generate 共用 (#76) */
    function respondWithProblems(
        res: Response,
        active: { config: ProviderConfig },
        requestedModel: string | undefined,
        resolvedModel: string,
        normalized: { problems: ReturnType<typeof normalizeRecognizeResult>['problems'] }
    ): void {
        const modelFallback = Boolean(requestedModel) && resolvedModel !== requestedModel;
        res.json({
            result: normalized,
            meta: {
                provider: active.config.id,
                model: resolvedModel,
                requestedModel: requestedModel ?? null,
                modelFallback
            }
        });
    }

    // --- Input validation ---
    const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
    const ALLOWED_PREFIXES = ['data:image/png', 'data:image/jpeg', 'data:image/webp', 'data:image/gif'];

    function validateImage(dataUrl: string): string | null {
        if (!dataUrl || typeof dataUrl !== 'string') return '缺少图片数据';
        if (!ALLOWED_PREFIXES.some(p => dataUrl.startsWith(p))) return '仅支持 PNG/JPEG/WebP/GIF 格式';
        // Rough size check: base64 is ~33% larger than raw bytes
        const approxBytes = Math.floor((dataUrl.length * 3) / 4);
        if (approxBytes > MAX_IMAGE_BYTES) return '图片不能超过 10MB';
        return null;
    }

    /** 上游调用结果: 成功携带提取文本与生效模型, 失败携带对客户端的错误响应 (#76 抽取共用) */
    type UpstreamCallResult =
        { ok: true; content: string; resolvedModel: string } | { ok: false; httpStatus: number; error: string };

    /**
     * 提供方上游调用共用路径 (#76 自 recognize 抽取): 模型白名单解析 → 适配器构造请求 →
     * 带超时 fetch → 上游错误映射 (401/429/其余 → 502) → 提取文本。
     * recognize 与 generate 各自传入请求构造器 (图片/纯文本)。
     */
    async function callUpstream(
        active: { config: ProviderConfig; vision: VisionProvider },
        model: string | undefined,
        buildRequest: (resolvedModel: string) => UpstreamRequest
    ): Promise<UpstreamCallResult> {
        try {
            const resolvedModel = resolveModel(model, active.config.allowedModels, active.config.defaultModel);
            const upstreamReq = buildRequest(resolvedModel);
            const upstream = await fetch(upstreamReq.url, {
                method: 'POST',
                headers: upstreamReq.headers,
                signal: AbortSignal.timeout(OCR_PROXY_TIMEOUT_MS),
                body: JSON.stringify(upstreamReq.body)
            });

            if (!upstream.ok) {
                const errText = await upstream.text().catch(() => '');
                const mapped = mapUpstreamError(upstream.status, errText);
                return { ok: false, httpStatus: mapped.httpStatus, error: mapped.error };
            }

            const data: unknown = await upstream.json();
            const content = active.vision.parseResponse(data);
            if (!content) {
                return { ok: false, httpStatus: 502, error: 'AI 未返回内容' };
            }
            return { ok: true, content, resolvedModel };
        } catch (err) {
            // 超时/网络错误 → 504 (区别于上游 API 错误的 502) (#26)
            if (err instanceof Error && err.name === 'TimeoutError') {
                return { ok: false, httpStatus: 504, error: '上游 API 请求超时，请稍后重试' };
            }
            console.error('OCR 代理错误:', err);
            return { ok: false, httpStatus: 500, error: '服务器内部错误' };
        }
    }

    // --- OCR endpoint ---
    app.post('/api/ocr/recognize', async (req: Request, res: Response) => {
        const { image, model, provider } = req.body as { image?: string; model?: string; provider?: string };

        const validationError = validateImage(image ?? '');
        if (validationError) {
            res.status(400).json({ error: validationError });
            return;
        }

        if (!image) {
            res.status(400).json({ error: '缺少图片数据' });
            return;
        }

        const routed = routeProvider(provider);
        if ('error' in routed) {
            res.status(400).json({ error: routed.error });
            return;
        }

        const parsedImage = parseImageDataUrl(image);
        if (!parsedImage) {
            res.status(400).json({ error: '仅支持 PNG/JPEG/WebP/GIF 格式' });
            return;
        }
        const visionImage: VisionImage = { dataUrl: image, ...parsedImage };

        const call = await callUpstream(routed, model, resolvedModel =>
            routed.vision.buildRequest(visionImage, resolvedModel, OCR_SYSTEM_PROMPT)
        );
        if (!call.ok) {
            res.status(call.httpStatus).json({ error: call.error });
            return;
        }

        // 剥离代码围栏并解析 JSON, 再归一化为 { problems: [...] } 多题结构
        try {
            const jsonStr = stripJsonFence(call.content);
            const parsed = JSON.parse(jsonStr);
            const normalized = normalizeRecognizeResult(parsed);
            if (normalized.problems.length === 0) {
                res.status(502).json({ error: 'AI 返回内容中未识别到有效题目' });
                return;
            }
            respondWithProblems(res, routed, model, call.resolvedModel, normalized);
        } catch {
            res.status(502).json({ error: 'AI 返回内容无法解析为 JSON' });
        }
    });

    // --- 举一反三: 变式题生成 (#76) ---
    const DEFAULT_GENERATE_COUNT = 3;
    const MAX_GENERATE_COUNT = 5;

    app.post('/api/problems/generate', async (req: Request, res: Response) => {
        const { problem, count, model, provider } = req.body as {
            problem?: unknown;
            count?: unknown;
            model?: string;
            provider?: string;
        };

        // 输入校验: 原题对象必填; count 缺省 3, 越界/非整数 400 (验收标准 2)
        if (!problem || typeof problem !== 'object' || Array.isArray(problem)) {
            res.status(400).json({ error: '缺少原题数据' });
            return;
        }
        const generateCount = count ?? DEFAULT_GENERATE_COUNT;
        if (
            typeof generateCount !== 'number' ||
            !Number.isInteger(generateCount) ||
            generateCount < 1 ||
            generateCount > MAX_GENERATE_COUNT
        ) {
            res.status(400).json({ error: `生成数量须为 1-${MAX_GENERATE_COUNT} 的整数` });
            return;
        }

        const routed = routeProvider(provider);
        if ('error' in routed) {
            res.status(400).json({ error: routed.error });
            return;
        }

        const call = await callUpstream(routed, model, resolvedModel =>
            routed.vision.buildTextRequest(
                buildGenerateUserText(problem, generateCount),
                resolvedModel,
                GENERATE_SYSTEM_PROMPT
            )
        );
        if (!call.ok) {
            res.status(call.httpStatus).json({ error: call.error });
            return;
        }

        // 归一化全量复用识别路径: 剥围栏 → JSON.parse → { problems: [...] }; 空则 502
        try {
            const jsonStr = stripJsonFence(call.content);
            const parsed = JSON.parse(jsonStr);
            const normalized = normalizeRecognizeResult(parsed);
            if (normalized.problems.length === 0) {
                res.status(502).json({ error: 'AI 返回内容中未识别到有效变式题' });
                return;
            }
            // 上游可能超额返回: 服务端截断到请求的 count, 保证 ≤count (验收标准 2)
            const clipped = { problems: normalized.problems.slice(0, generateCount) };
            respondWithProblems(res, routed, model, call.resolvedModel, clipped);
        } catch {
            res.status(502).json({ error: 'AI 返回内容无法解析为 JSON' });
        }
    });

    // --- Health check ---
    app.get('/api/ocr/health', (_req: Request, res: Response) => {
        res.json({
            status: 'ok',
            defaultProvider: defaultProviderId,
            providers: [...providers.values()].map(({ config }) => ({
                id: config.id,
                defaultModel: config.defaultModel
            }))
        });
    });

    // --- Global error handler ---
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
        console.error('未捕获错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    });

    return {
        app,
        port: PORT,
        defaultProviderId,
        dispose() {
            clearInterval(sweepTimer);
        }
    };
}

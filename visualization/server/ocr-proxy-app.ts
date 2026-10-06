/**
 * OCR 代理 Express 应用工厂 (#75)
 *
 * 自 ocr-proxy.ts 原地抽出 (行为/日志文案不变), 目的: HTTP 层测试可以在进程内
 * 创建独立 app 实例 (限流计数器/提供方解析随实例隔离), 经真实 HTTP 访问;
 * ocr-proxy.ts 保留为薄启动入口 (listen + 配置缺失 exit 1)。
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
    type ProviderConfig,
    type VisionProvider,
    type VisionImage
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

        // 提供方路由 (#74): 请求显式指定且可用 → 用之; 指定但不可用 → 400; 未指定 → 服务端默认
        const requestedProvider = typeof provider === 'string' ? provider.trim().toLowerCase() : '';
        if (requestedProvider && !providers.has(requestedProvider)) {
            res.status(400).json({
                error: `提供方 ${requestedProvider} 不可用; 可用提供方: ${[...providers.keys()].join(', ')}`
            });
            return;
        }
        const providerId = requestedProvider || defaultProviderId;
        const active = providers.get(providerId)!;

        const parsedImage = parseImageDataUrl(image);
        if (!parsedImage) {
            res.status(400).json({ error: '仅支持 PNG/JPEG/WebP/GIF 格式' });
            return;
        }
        const visionImage: VisionImage = { dataUrl: image, ...parsedImage };

        try {
            const resolvedModel = resolveModel(model, active.config.allowedModels, active.config.defaultModel);
            const upstreamReq = active.vision.buildRequest(visionImage, resolvedModel, OCR_SYSTEM_PROMPT);
            const upstream = await fetch(upstreamReq.url, {
                method: 'POST',
                headers: upstreamReq.headers,
                signal: AbortSignal.timeout(OCR_PROXY_TIMEOUT_MS),
                body: JSON.stringify(upstreamReq.body)
            });

            if (!upstream.ok) {
                const errText = await upstream.text().catch(() => '');
                const mapped = mapUpstreamError(upstream.status, errText);
                res.status(mapped.httpStatus).json({ error: mapped.error });
                return;
            }

            const data: unknown = await upstream.json();
            const content = active.vision.parseResponse(data);
            if (!content) {
                res.status(502).json({ error: 'AI 未返回内容' });
                return;
            }

            // 剥离代码围栏并解析 JSON, 再归一化为 { problems: [...] } 多题结构
            try {
                const jsonStr = stripJsonFence(content);
                const parsed = JSON.parse(jsonStr);
                const normalized = normalizeRecognizeResult(parsed);
                if (normalized.problems.length === 0) {
                    res.status(502).json({ error: 'AI 返回内容中未识别到有效题目' });
                    return;
                }
                const modelFallback = Boolean(model) && resolvedModel !== model;
                res.json({
                    result: normalized,
                    meta: { provider: providerId, model: resolvedModel, requestedModel: model ?? null, modelFallback }
                });
            } catch {
                res.status(502).json({ error: 'AI 返回内容无法解析为 JSON' });
            }
        } catch (err) {
            // 超时/网络错误 → 504 (区别于上游 API 错误的 502) (#26)
            if (err instanceof Error && err.name === 'TimeoutError') {
                res.status(504).json({ error: '上游 API 请求超时，请稍后重试' });
                return;
            }
            console.error('OCR 代理错误:', err);
            res.status(500).json({ error: '服务器内部错误' });
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

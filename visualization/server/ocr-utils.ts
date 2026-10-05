/**
 * OCR 识别结果解析与归一化 — 纯函数模块 (可测试, 无 HTTP/IO 副作用)
 *
 * 职责:
 *   1. stripJsonFence: 剥离 AI 输出常见的 ```json ... ``` 围栏
 *   2. normalizeRecognizeResult: 将 AI 返回的 JSON 归一化为统一的
 *      { problems: RecognizedProblem[] } 结构 (支持多题 / 单题对象 / 数组三种形态)
 *   3. resolveModel: 模型标识白名单判定 (出站请求侧约束)
 */
export type OcrProblemType = 'single-choice' | 'multiple-choice' | 'fill-blank' | 'essay';

export interface RecognizedProblem {
    index?: number;
    type?: OcrProblemType;
    title?: string;
    description?: string;
    source?: string;
    given?: Record<string, unknown>;
    options?: Array<{ letter: string; text: string }>;
    answer?: { correct?: string[]; explanation?: string };
    sceneTemplate?: string | null;
    formulas?: string[];
}

export interface RecognizeResponse {
    problems: RecognizedProblem[];
}

/** 剥离 ```json ... ``` 代码围栏 (若存在) */
export function stripJsonFence(content: string): string {
    const trimmed = content.trim();
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    return match ? match[1]!.trim() : trimmed;
}

const ALLOWED_TYPES: OcrProblemType[] = ['single-choice', 'multiple-choice', 'fill-blank', 'essay'];

function sanitizeProblem(raw: unknown): RecognizedProblem | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const obj = raw as Record<string, unknown>;
    const problem: RecognizedProblem = {};
    if (typeof obj.title === 'string') problem.title = obj.title;
    if (typeof obj.description === 'string') problem.description = obj.description;
    if (typeof obj.source === 'string') problem.source = obj.source;
    if (obj.given && typeof obj.given === 'object' && !Array.isArray(obj.given)) {
        problem.given = obj.given as Record<string, unknown>;
    }
    if (Array.isArray(obj.options)) {
        problem.options = obj.options
            .filter((o): o is { letter: string; text: string } => {
                if (!o || typeof o !== 'object') return false;
                const c = o as Record<string, unknown>;
                return typeof c.letter === 'string' && typeof c.text === 'string';
            })
            .map(o => ({ letter: o.letter, text: o.text }));
    }
    if (obj.answer && typeof obj.answer === 'object' && !Array.isArray(obj.answer)) {
        const a = obj.answer as Record<string, unknown>;
        const answer: { correct?: string[]; explanation?: string } = {};
        if (Array.isArray(a.correct)) {
            answer.correct = a.correct.filter((c): c is string => typeof c === 'string');
        }
        if (typeof a.explanation === 'string') answer.explanation = a.explanation;
        problem.answer = answer;
    }
    if (obj.sceneTemplate === null || typeof obj.sceneTemplate === 'string') {
        problem.sceneTemplate = obj.sceneTemplate as string | null;
    }
    if (Array.isArray(obj.formulas)) {
        problem.formulas = obj.formulas.filter((f): f is string => typeof f === 'string');
    }
    const type = typeof obj.type === 'string' ? (obj.type as OcrProblemType) : undefined;
    if (type && ALLOWED_TYPES.includes(type)) problem.type = type;
    return problem;
}

/**
 * 归一化 AI 返回的识别结果:
 *   - 新格式 { problems: [...] }
 *   - 单题对象 { title, ... } (向后兼容)
 *   - 数组 [{...}, {...}]
 * 统一输出 { problems: [...] }, 并补齐 1-based 题号; 非法项过滤。
 */
export function normalizeRecognizeResult(parsed: unknown): RecognizeResponse {
    let rawItems: unknown[] = [];
    if (Array.isArray(parsed)) {
        rawItems = parsed;
    } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const obj = parsed as Record<string, unknown>;
        if (Array.isArray(obj.problems)) {
            rawItems = obj.problems;
        } else {
            rawItems = [obj];
        }
    }

    const problems = rawItems
        .map(sanitizeProblem)
        .filter((p): p is RecognizedProblem => p !== null)
        .map((p, i) => ({ ...p, index: i + 1 }));

    return { problems };
}

/**
 * 模型标识白名单判定 — 出站请求侧约束 (#26)
 *
 * 调用方传入的 model 只有在白名单内才透传上游, 否则回落到服务端默认模型。
 * 防止前端任意指定模型标识 (成本/口径不可控)。
 *
 * @param requested  调用方请求的模型标识 (undefined/空串 = 未指定)
 * @param allowList  服务端配置的允许列表
 * @param fallback   回落用的默认模型
 * @returns 实际应使用的模型标识
 */
export function resolveModel(requested: string | undefined, allowList: string[], fallback: string): string {
    if (requested && allowList.includes(requested)) return requested;
    return fallback;
}

/**
 * 解析 data URL 图片为媒体类型 + 纯 base64 数据 (#74)
 *
 * @returns 非 `data:image/*;base64,` 形态时返回 null (由调用方转 400)
 */
export function parseImageDataUrl(dataUrl: string): { mediaType: string; base64: string } | null {
    const match = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) return null;
    return { mediaType: match[1]!, base64: match[2]! };
}

/**
 * 上游非 2xx 状态 → 对客户端的错误响应 (#26 口径, #74 自 ocr-proxy 抽取为纯函数)
 *
 * 401 (Key 无效) 与 429 (限流) 特化为固定文案, 其余状态统一 502 并透传上游片段。
 */
export function mapUpstreamError(status: number, errText: string): { httpStatus: number; error: string } {
    if (status === 401) return { httpStatus: 502, error: '上游 API Key 无效' };
    if (status === 429) return { httpStatus: 502, error: '上游 API 请求过于频繁' };
    return { httpStatus: 502, error: `上游 API 错误 (${status}): ${errText.slice(0, 200)}` };
}

/** 解析逗号分隔的环境变量值为字符串列表 (空串/缺省 → 空数组) (#74) */
export function parseCsvList(value: string | undefined): string[] {
    return (value ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
}

// --- 前后端共享的接口类型 (#74) ---

/** /api/ocr/health 返回的单个可用提供方 */
export interface ProviderHealthInfo {
    id: string;
    defaultModel: string;
}

/** /api/ocr/health 响应 */
export interface OcrHealthResponse {
    status: string;
    defaultProvider: string;
    providers: ProviderHealthInfo[];
}

/** /api/ocr/recognize 响应中的 meta 字段 (提供方路由与模型回落提示用) */
export interface RecognizeMeta {
    /** 实际使用的提供方 id */
    provider: string;
    /** 实际使用的模型 (回落后) */
    model: string;
    /** 调用方请求的模型 (未指定为 null) */
    requestedModel: string | null;
    /** 请求模型不在白名单、已回落默认 */
    modelFallback: boolean;
}

/**
 * OCR 视觉提供方抽象与配置解析 (#74)
 *
 * 职责:
 *   1. VisionProvider 接口 — 把统一输入 (图片/模型/系统提示词) 翻译为特定上游协议的
 *      HTTP 请求, 并从上游响应中提取文本 (适配器实现在 providers/ 目录)
 *   2. OCR_SYSTEM_PROMPT / OCR_USER_TEXT — 识别提示词单一真源 (各协议共用)
 *   3. resolveProviderConfigs — 从环境变量解析可用提供方 (纯函数, 可单测)
 *
 * 环境变量口径:
 *   - OCR_PROVIDER: 默认提供方 id (anthropic | openai | 任意动态槽位小写); 缺省 anthropic,
 *     anthropic 不可用时自动回落首个可用提供方 (启动日志明示)
 *   - 内置 anthropic 槽位: ANTHROPIC_AUTH_TOKEN|ANTHROPIC_API_KEY (二选一, 必填)
 *     + ANTHROPIC_BASE_URL (默认 https://api.anthropic.com) + ANTHROPIC_MODEL (默认 claude-sonnet-4-6)
 *   - 内置 openai 槽位: OPENAI_AUTH_TOKEN|OPENAI_API_KEY + OPENAI_BASE_URL (默认 https://api.openai.com/v1)
 *     + OPENAI_MODEL (默认 gpt-4o)
 *   - 动态槽位: 任意 <PREFIX>_API_KEY|<PREFIX>_AUTH_TOKEN 且 <PREFIX>_BASE_URL 齐备的环境变量前缀
 *     (如 DEEPSEEK_*) 注册为 OpenAI 兼容提供方, id = 前缀小写; OCR 前缀保留不参与发现
 *   - 白名单: <PREFIX>_ALLOWED_MODELS (逗号分隔); anthropic 兼容旧全局 OCR_PROXY_ALLOWED_MODELS
 */
import { parseCsvList } from './ocr-utils';

export type VisionProtocol = 'anthropic' | 'openai-compatible';

/** 路由层从 dataURL 统一解析出的图片输入, 适配器按协议取用 */
export interface VisionImage {
    /** 完整 data URL (OpenAI 兼容协议直接透传) */
    dataUrl: string;
    /** MIME 类型, 如 image/png */
    mediaType: string;
    /** 纯 base64 数据 (不含 data URL 前缀, Anthropic 协议使用) */
    base64: string;
}

/** 适配器构造出的上游 HTTP 请求 */
export interface UpstreamRequest {
    url: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
}

/** 视觉提供方适配器 — 一个实例对应一个已配置的上游 */
export interface VisionProvider {
    /** 提供方 id (如 anthropic / openai / deepseek) */
    id: string;
    protocol: VisionProtocol;
    buildRequest(image: VisionImage, model: string, systemPrompt: string): UpstreamRequest;
    /** 从上游 JSON 响应提取文本; 无内容返回 null (由路由统一转 502) */
    parseResponse(json: unknown): string | null;
}

/** 单个提供方的生效配置 */
export interface ProviderConfig {
    id: string;
    protocol: VisionProtocol;
    baseUrl: string;
    authToken: string;
    defaultModel: string;
    /** 模型白名单; 空数组 = 仅默认模型可透传 (resolveModel 口径) */
    allowedModels: string[];
}

/** resolveProviderConfigs 的解析结果 */
export interface ProviderResolution {
    /** 可用提供方 (token/baseUrl 齐备), 至少一个时服务才可启动 */
    providers: ProviderConfig[];
    /** 生效默认提供方 id; 可能为 OCR_PROVIDER 的原值 (调用方须校验其可用性) */
    defaultProviderId: string;
}

const ANTHROPIC_DEFAULT_BASE_URL = 'https://api.anthropic.com';
const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-6';
const OPENAI_DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const OPENAI_DEFAULT_MODEL = 'gpt-4o';

export const OCR_SYSTEM_PROMPT = `你是高中物理题目识别助手。识别图片中的物理题目，图片中可能包含一道或多道题，严格返回 JSON：
{"problems":[{"index":1,"type":"single-choice|multiple-choice|fill-blank|essay","title":"题目标题","description":"题目描述","source":"来源","given":{"参数":"值"},"options":[{"letter":"A","text":"选项文本"}],"answer":{"correct":["正确选项"],"explanation":"解题思路"},"sceneTemplate":"projectile|electric-field|magnetic-field|null","formulas":["公式"]}]}
规则：
- 图片中有几道题就返回几个 problems 元素，index 从 1 开始递增
- type 取值：single-choice(单选题)/multiple-choice(多选题)/fill-blank(填空题)/essay(解答题)
- 选择题必须填 options，answer.correct 填正确选项字母（多选题填多个）
- sceneTemplate 根据题目物理场景选择：
  - 平抛/斜抛运动 → "projectile"
  - 匀强电场中的带电粒子 → "electric-field"
  - 匀强磁场中的带电粒子 → "magnetic-field"
  - 碰撞 → "collision"
  - 弹簧振子 → "spring"
  - 斜面运动 → "inclined-plane"
  - 电磁复合场 → "em-combined"
  - 其他 → null
- given 只放数值型物理量，单位换算为 SI
只返回 JSON，不要其他文字。`;

export const OCR_USER_TEXT = '请识别这张物理题目图片中的内容，返回 JSON。';

/** 未知结构收窄为纯对象 (排除数组与 null, 适配器解析上游响应用) */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 从环境变量解析可用提供方 (纯函数, 便于单测)
 *
 * 发现规则见文件头注释。可用性: 内置槽位 (anthropic/openai) 有 token 即可用;
 * 动态槽位须 token 与 BASE_URL 齐备 (无 BASE_URL 的 OpenAI 兼容上游不可用)。
 * 默认提供方: OCR_PROVIDER 显式指定 → 原值透传 (调用方校验); 否则 anthropic → 首个可用。
 */
export function resolveProviderConfigs(env: Record<string, string | undefined>): ProviderResolution {
    // 发现候选前缀: <PREFIX>_API_KEY / <PREFIX>_AUTH_TOKEN; OCR 前缀保留 (OCR_PROXY_* 等)
    const prefixes = new Set<string>();
    const tokenKeyPattern = /^([A-Z][A-Z0-9_]*)_(API_KEY|AUTH_TOKEN)$/;
    for (const key of Object.keys(env)) {
        const name = tokenKeyPattern.exec(key)?.[1];
        if (name && name !== 'OCR') prefixes.add(name);
    }

    const providers: ProviderConfig[] = [];
    for (const prefix of prefixes) {
        // token 取值优先级与原 anthropic 口径一致: AUTH_TOKEN 优先于 API_KEY
        const token = env[`${prefix}_AUTH_TOKEN`] ?? env[`${prefix}_API_KEY`];
        if (!token) continue;
        const isAnthropic = prefix === 'ANTHROPIC';
        const isOpenAI = prefix === 'OPENAI';
        const baseUrl =
            env[`${prefix}_BASE_URL`] ??
            (isAnthropic ? ANTHROPIC_DEFAULT_BASE_URL : isOpenAI ? OPENAI_DEFAULT_BASE_URL : undefined);
        if (!baseUrl) continue;
        const allowedModels = parseCsvList(env[`${prefix}_ALLOWED_MODELS`]).length
            ? parseCsvList(env[`${prefix}_ALLOWED_MODELS`])
            : isAnthropic
              ? parseCsvList(env.OCR_PROXY_ALLOWED_MODELS)
              : [];
        providers.push({
            id: prefix.toLowerCase(),
            protocol: isAnthropic ? 'anthropic' : 'openai-compatible',
            baseUrl,
            authToken: token,
            defaultModel: env[`${prefix}_MODEL`] ?? (isAnthropic ? ANTHROPIC_DEFAULT_MODEL : OPENAI_DEFAULT_MODEL),
            allowedModels
        });
    }

    const explicit = env.OCR_PROVIDER?.trim().toLowerCase();
    const anthropicAvailable = providers.some(p => p.id === 'anthropic');
    const defaultProviderId = explicit ?? (anthropicAvailable ? 'anthropic' : (providers[0]?.id ?? 'anthropic'));
    return { providers, defaultProviderId };
}

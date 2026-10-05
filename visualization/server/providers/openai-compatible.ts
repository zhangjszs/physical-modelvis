/**
 * OpenAI 兼容 Chat Completions 适配器 (#74)
 *
 * 一套适配器覆盖 OpenAI / DeepSeek / Qwen(DashScope 兼容模式) / 智谱 GLM / Moonshot /
 * SiliconFlow / OpenRouter / Gemini OpenAI 兼容端点:
 *   POST {baseURL}/chat/completions, Authorization: Bearer 头,
 *   user.content = [image_url(完整 data URL), text], 响应取 choices[0].message.content
 */
import {
    OCR_USER_TEXT,
    isRecord,
    type ProviderConfig,
    type UpstreamRequest,
    type VisionProvider
} from '../vision-providers';

export function createOpenAICompatibleProvider(config: ProviderConfig): VisionProvider {
    return {
        id: config.id,
        protocol: 'openai-compatible',
        buildRequest(image, model, systemPrompt): UpstreamRequest {
            return {
                url: `${config.baseUrl}/chat/completions`,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${config.authToken}`
                },
                body: {
                    model,
                    max_tokens: 3000,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        {
                            role: 'user',
                            content: [
                                { type: 'image_url', image_url: { url: image.dataUrl } },
                                { type: 'text', text: OCR_USER_TEXT }
                            ]
                        }
                    ]
                }
            };
        },
        parseResponse(json: unknown): string | null {
            // OpenAI 兼容响应格式: { choices: [{ message: { content: "..." } }] }
            if (!isRecord(json) || !Array.isArray(json.choices)) return null;
            const first = json.choices[0];
            const content = isRecord(first) && isRecord(first.message) ? first.message.content : undefined;
            return typeof content === 'string' ? content : null;
        }
    };
}

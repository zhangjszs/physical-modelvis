/**
 * Anthropic Messages API 适配器 (#74)
 *
 * 自 ocr-proxy.ts 原地逻辑迁入, 请求/响应行为不变:
 *   POST {baseUrl}/v1/messages, x-api-key + anthropic-version 头,
 *   content[0] 为 base64 图片块, 响应取 content[0].text
 */
import {
    OCR_USER_TEXT,
    isRecord,
    type ProviderConfig,
    type UpstreamRequest,
    type VisionProvider
} from '../vision-providers';

export function createAnthropicProvider(config: ProviderConfig): VisionProvider {
    return {
        id: config.id,
        protocol: 'anthropic',
        buildRequest(image, model, systemPrompt): UpstreamRequest {
            return {
                url: `${config.baseUrl}/v1/messages`,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.authToken,
                    'anthropic-version': '2023-06-01'
                },
                body: {
                    model,
                    max_tokens: 3000,
                    system: systemPrompt,
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'image',
                                    source: { type: 'base64', media_type: image.mediaType, data: image.base64 }
                                },
                                { type: 'text', text: OCR_USER_TEXT }
                            ]
                        }
                    ]
                }
            };
        },
        buildTextRequest(userText, model, systemPrompt): UpstreamRequest {
            return {
                url: `${config.baseUrl}/v1/messages`,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.authToken,
                    'anthropic-version': '2023-06-01'
                },
                body: {
                    model,
                    // 变式生成一次产出多道完整题干, 上限较识别放宽 (#76)
                    max_tokens: 4000,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: [{ type: 'text', text: userText }] }]
                }
            };
        },
        parseResponse(json: unknown): string | null {
            // Anthropic 响应格式: { content: [{ type: "text", text: "..." }] }
            if (!isRecord(json) || !Array.isArray(json.content)) return null;
            const first = json.content[0];
            const text = isRecord(first) ? first.text : undefined;
            return typeof text === 'string' ? text : null;
        }
    };
}

// OCR Service - 图片识别物理题目
const OCRService = (function () {
    'use strict';

    const STORAGE_KEY = 'physvis_ocr_config';

    function getConfig() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch { return {}; }
    }

    function saveConfig(cfg) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    }

    function imageToBase64(file) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('请选择图片文件（jpg/png/gif）'));
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                reject(new Error('图片大小不能超过 10MB'));
                return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('读取图片失败'));
            reader.readAsDataURL(file);
        });
    }

    async function recognizeProblem(base64Image, apiKey, baseUrl, model) {
        if (!apiKey) throw new Error('请先填写 API Key');

        const url = (baseUrl || 'https://api.openai.com/v1') + '/chat/completions';
        const body = {
            model: model || 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `你是一个高中物理题目识别助手。用户会上传一张物理题目的图片，请识别并提取题目信息。

你必须严格返回以下 JSON 格式，不要包含任何其他文字：
{
  "title": "题目简短标题",
  "description": "题目完整描述文本",
  "source": "来源（如高考真题、模拟题等，看不出来就写AI识别）",
  "given": {"参数名": "参数值"},
  "options": [
    {"letter": "A", "text": "选项A文本"},
    {"letter": "B", "text": "选项B文本"},
    {"letter": "C", "text": "选项C文本"},
    {"letter": "D", "text": "选项D文本"}
  ],
  "answer": {
    "correct": ["正确选项字母"],
    "explanation": "解题思路简述"
  },
  "sceneTemplate": "场景模板名（parallel_plates_electric/velocity_selector/cyclotron/parallel_plates_magnetic/null）",
  "formulas": ["相关公式1", "相关公式2"]
}

注意：
- given 中的数值请用数字类型
- 如果不是选择题，options 可以为空数组
- 如果看不清某个选项，如实标注
- sceneTemplate 根据题目物理场景选择最匹配的模板，如果没有匹配的就用 null`
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: '请识别这张物理题目图片中的内容。' },
                        { type: 'image_url', image_url: { url: base64Image, detail: 'high' } }
                    ]
                }
            ],
            max_tokens: 2000,
            temperature: 0.1
        };

        let resp;
        try {
            resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify(body)
            });
        } catch (e) {
            throw new Error('网络请求失败，请检查网络连接和 API 地址');
        }

        if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            if (resp.status === 401) throw new Error('API Key 无效，请检查后重试');
            if (resp.status === 429) throw new Error('请求过于频繁，请稍后再试');
            throw new Error('API 请求失败 (' + resp.status + '): ' + errText.slice(0, 200));
        }

        const data = await resp.json();
        const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!content) throw new Error('AI 未返回有效内容');

        // 提取 JSON（可能被 markdown 代码块包裹）
        let jsonStr = content.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();

        let result;
        try {
            result = JSON.parse(jsonStr);
        } catch {
            throw new Error('AI 返回的内容无法解析为 JSON，请重试');
        }

        // 基本验证
        if (!result.title && !result.description) {
            throw new Error('AI 未能识别出有效题目内容');
        }

        return result;
    }

    return {
        imageToBase64,
        recognizeProblem,
        getConfig,
        saveConfig
    };
})();

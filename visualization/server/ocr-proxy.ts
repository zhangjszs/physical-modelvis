import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';

const app = express();
const PORT = Number(process.env.OCR_PROXY_PORT ?? 3001);

// Anthropic API 配置
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com';
const ANTHROPIC_AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN ?? process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

if (!ANTHROPIC_AUTH_TOKEN) {
  console.error('错误: 未设置 ANTHROPIC_AUTH_TOKEN 或 ANTHROPIC_API_KEY 环境变量');
  process.exit(1);
}

console.log(`使用 API: ${ANTHROPIC_BASE_URL}`);
console.log(`使用模型: ${ANTHROPIC_MODEL}`);

// --- Rate limiting (in-memory, 10 req/min per IP) ---
const hits = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60_000;

setInterval(() => {
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

// --- Middleware ---
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173'] }));
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
  const { image, model } = req.body as { image?: string; model?: string };

  const validationError = validateImage(image ?? '');
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    // Anthropic Messages API 格式
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const mediaType = image.match(/data:(image\/\w+);/)?.[1] ?? 'image/png';

    const upstream = await fetch(`${ANTHROPIC_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_AUTH_TOKEN!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model ?? ANTHROPIC_MODEL,
        max_tokens: 2000,
        system: `你是高中物理题目识别助手。识别图片中的物理题目，严格返回 JSON：
{"title":"题目标题","description":"题目描述","source":"来源","given":{"参数":"值"},"options":[{"letter":"A","text":"选项文本"}],"answer":{"correct":["正确选项"],"explanation":"解题思路"},"sceneTemplate":"projectile|electric-field|magnetic-field|null","formulas":["公式"]}
sceneTemplate 根据题目物理场景选择：
- 平抛/斜抛运动 → "projectile"
- 匀强电场中的带电粒子 → "electric-field"
- 匀强磁场中的带电粒子 → "magnetic-field"
- 碰撞 → "collision"
- 弹簧振子 → "spring"
- 斜面运动 → "inclined-plane"
- 电磁复合场 → "em-combined"
只返回 JSON，不要其他文字。`,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64Data },
              },
              { type: 'text', text: '请识别这张物理题目图片中的内容，返回 JSON。' },
            ],
          },
        ],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      if (upstream.status === 401) {
        res.status(502).json({ error: '上游 API Key 无效' });
        return;
      }
      if (upstream.status === 429) {
        res.status(502).json({ error: '上游 API 请求过于频繁' });
        return;
      }
      res.status(502).json({ error: `上游 API 错误 (${upstream.status}): ${errText.slice(0, 200)}` });
      return;
    }

    // Anthropic 响应格式: { content: [{ type: "text", text: "..." }] }
    const data = (await upstream.json()) as { content?: Array<{ type?: string; text?: string }> };
    const content = data.content?.[0]?.text;
    if (!content) {
      res.status(502).json({ error: 'AI 未返回内容' });
      return;
    }

    // Try to parse the content to validate it's valid JSON
    let jsonStr = content.trim();
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1]!.trim();

    try {
      const parsed = JSON.parse(jsonStr);
      res.json({ result: parsed });
    } catch {
      res.status(502).json({ error: 'AI 返回内容无法解析为 JSON' });
    }
  } catch (err) {
    console.error('OCR 代理错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// --- Health check ---
app.get('/api/ocr/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// --- Global error handler ---
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('未捕获错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`OCR 代理服务器已启动: http://localhost:${PORT}`);
});

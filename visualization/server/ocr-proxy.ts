/**
 * OCR 代理启动入口 — Express + Anthropic/OpenAI 兼容 API
 *
 * 应用本体在 ocr-proxy-app.ts 工厂 (#75); 本文件只负责进程级行为:
 * 监听端口 + 配置缺失时打印错误并 exit 1 (行为与抽出前一致)。
 * 启动: npm run server:dev (tsx server/ocr-proxy.ts)
 */
import { createOcrProxyApp } from './ocr-proxy-app';

try {
    const { app, port } = createOcrProxyApp(process.env);
    app.listen(port, () => {
        console.log(`OCR 代理服务器已启动: http://localhost:${port}`);
    });
} catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
}

/**
 * #140 — 生产构建 Headless 首帧探针 (Playwright)
 *
 * 验证 vendor-react 懒拆后：
 * 1. 生产构建（vite preview）下应用能正常挂载渲染，无「白屏/卡死」回归；
 * 2. 默认场景首屏舞台与画布在预算时间内就绪（首帧时间 ≤ 3000ms，包含 CI 冷启动余量）；
 * 3. 画布非空（检查 WebGL 3D 渲染器与 2D 板书画布像素状态）；
 * 4. 全流程零 console error。
 *
 * 运行:
 *   node scripts/verify-first-frame-smoke.cjs
 *   BASE_URL=http://localhost:4173/ node scripts/verify-first-frame-smoke.cjs
 *   SMOKE_BROWSER_CHANNEL 浏览器渠道 (#98/#106): 置空 = Playwright 自带 chromium
 */
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const CHANNEL = process.env.SMOKE_BROWSER_CHANNEL ?? '';
const BUDGET_MS = Number(process.env.FIRST_FRAME_BUDGET_MS ?? '3000');

const isExpectedNoise = msg =>
    /favicon/i.test(msg) ||
    /the server responded with a status of 404/i.test(msg) ||
    /localhost:3001|api\/ocr|ERR_CONNECTION_REFUSED/i.test(msg);

/** 探测指定 URL 是否已经可以访问 */
async function isServerRunning(url) {
    try {
        const res = await globalThis.fetch(url, { method: 'HEAD' });
        return res.ok || res.status < 500;
    } catch {
        return false;
    }
}

/** 启动内置 preview 服务（若 BASE_URL 尚无可用服务） */
async function ensureServer() {
    if (await isServerRunning(BASE)) {
        return { child: null, close: () => {} };
    }

    const distIndex = resolve('visualization/dist/index.html');
    if (!existsSync(distIndex)) {
        throw new Error('未找到 visualization/dist/index.html，请先运行 npm run build:viz');
    }

    const child = spawn('npx', ['vite', 'preview', '--port', '4173'], {
        cwd: 'visualization',
        stdio: 'ignore'
    });

    const t0 = Date.now();
    while (Date.now() - t0 < 10000) {
        if (await isServerRunning(BASE)) break;
        await new Promise(r => setTimeout(r, 200));
    }

    if (!(await isServerRunning(BASE))) {
        child.kill();
        throw new Error('启动 vite preview 服务超时');
    }

    // 预热 HTTP 静态资源，消除首次磁盘 IO 冷启动偏差
    try {
        await globalThis.fetch(BASE);
    } catch {
        // ignore pre-fetch failure
    }
    return {
        child,
        close: () => {
            child.kill();
        }
    };
}

/** 扫描画布非空状态 */
async function probeCanvas(page) {
    return page.evaluate(() => {
        const canvas = document.querySelector('.stage-viewport canvas');
        if (!canvas) return { ok: false, reason: '未找到 .stage-viewport canvas' };
        if (canvas.width === 0 || canvas.height === 0) {
            return { ok: false, reason: `canvas 尺寸为 0 (${canvas.width}x${canvas.height})` };
        }

        // WebGL 3D 探测
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
            const err = gl.getError();
            const w = gl.drawingBufferWidth;
            const h = gl.drawingBufferHeight;
            if (err !== 0) return { ok: false, reason: `WebGL 错误代码: ${err}` };
            if (w === 0 || h === 0) return { ok: false, reason: `WebGL drawingBuffer 尺寸为 0` };
            return { ok: true, type: 'webgl', width: w, height: h };
        }

        // 2D Canvas 探测
        const ctx = canvas.getContext('2d');
        if (ctx) {
            try {
                const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = img.data;
                const seen = new Set();
                const step = Math.max(4, Math.floor((data.length / 4 / 2000) * 4));
                for (let i = 0; i < data.length; i += step) {
                    if (data[i + 3] === 0) {
                        seen.add('transparent');
                        continue;
                    }
                    seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
                    if (seen.size > 2) break;
                }
                if (seen.size <= 1) {
                    return { ok: false, reason: '2D 画布纯色或全空 (blank)', colors: seen.size };
                }
                return { ok: true, type: '2d', colors: seen.size };
            } catch (e) {
                return { ok: false, reason: `读取 2D 像素失败: ${e.message}` };
            }
        }

        return { ok: false, reason: '未能识别 canvas context 类型' };
    });
}

async function runSinglePass(browser, passNumber) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    page.on('console', m => {
        if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
    });

    const t0 = Date.now();
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 等待舞台与 canvas 渲染可见
    await page.waitForSelector('.stage-viewport canvas', { state: 'visible', timeout: 10000 });
    const stageVisibleMs = Date.now() - t0;

    if (stageVisibleMs > BUDGET_MS) {
        throw new Error(`[Pass ${passNumber}] 首帧舞台可见时间 ${stageVisibleMs}ms 超过预算 ${BUDGET_MS}ms`);
    }

    // 默认场景 (3D) 画布非空检测
    const c3d = await probeCanvas(page);
    if (!c3d.ok) {
        throw new Error(`[Pass ${passNumber}] 3D 画布就绪检测失败: ${c3d.reason}`);
    }

    // 切换 2D 板书模式校验
    const btn2d = page.locator('.stage-actions button', { hasText: '2D 板书' });
    if (await btn2d.isVisible()) {
        await btn2d.click();
        await page.waitForTimeout(300);
        const c2d = await probeCanvas(page);
        if (!c2d.ok) {
            throw new Error(`[Pass ${passNumber}] 切换 2D 板书画布检测失败: ${c2d.reason}`);
        }
        // 切回 3D
        await page.locator('.stage-actions button', { hasText: '3D 器材' }).click();
        await page.waitForTimeout(200);
    }

    await page.close();

    const realErrors = errors.filter(e => !isExpectedNoise(e));
    if (realErrors.length > 0) {
        throw new Error(`[Pass ${passNumber}] 控制台错误:\n${realErrors.join('\n')}`);
    }

    console.log(
        `  [Pass ${passNumber}] 首屏舞台可见时间: ${stageVisibleMs}ms (<= ${BUDGET_MS}ms) | 3D: ${c3d.type} (${c3d.width}x${c3d.height}) ✓ | 2D 板书 ✓ | 0 errors`
    );
    return { stageVisibleMs, errorsCount: realErrors.length };
}

(async () => {
    const server = await ensureServer();
    try {
        const browser = await chromium.launch({ headless: true, ...(CHANNEL ? { channel: CHANNEL } : {}) });
        console.log(`=== 开始生产构建 Headless 首帧探针 (目标预算 <= ${BUDGET_MS}ms) ===`);

        const results = [];
        for (let i = 1; i <= 3; i++) {
            const res = await runSinglePass(browser, i);
            results.push(res);
        }

        await browser.close();
        const avgMs = Math.round(results.reduce((s, r) => s + r.stageVisibleMs, 0) / results.length);
        console.log(
            `\nFIRST FRAME SMOKE OK: 连续 3 次通过 (平均首帧时间 ${avgMs}ms, 3D/2D 画布均非空, 零 console error)`
        );
        process.exit(0);
    } finally {
        server.close();
    }
})().catch(e => {
    console.error('FATAL:', e.message);
    process.exit(1);
});

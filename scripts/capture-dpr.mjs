// 用途：在真实机器上对比 1x / 2x 设备像素比下 canvas 渲染清晰度，
//       并采样真实 rAF 帧率，作为 M7a「渲染质量提升」的验收证据。
//
// 前置依赖（仅本机需要，沙箱无需）：
//   npm i -D playwright
//   npx playwright install chromium
//
// 用法：
//   node scripts/capture-dpr.mjs                 # 默认载入 http://localhost:5173 (viz dev server)
//   node scripts/capture-dpr.mjs https://zhangjszs.github.io/physical-modelvis/   # 或已部署地址
//
// 产出：dpr-1x.png / dpr-2x.png （同 CSS 视口下，2x 截图像素密度更高 → 更清晰）
//       以及终端打印的采样 FPS（≈ 浏览器实际帧率，用于核对 M7a 验收指标 FPS≥55）。

import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:5173';

async function capture(dpr, out) {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        deviceScaleFactor: dpr,
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 10000 });

    // 触发一次仿真运行（UI 文案为「运行仿真」），让画面进入动态渲染
    const runBtn = page.getByText('运行仿真', { exact: false });
    if ((await runBtn.count()) > 0) {
        await runBtn.first().click();
    }
    await page.waitForTimeout(1500);

    // 整页截图：deviceScaleFactor=2 时输出位图已是 2 倍像素密度
    await page.screenshot({ path: out });

    // 采样真实帧率（连续 1s 内 rAF 回调次数）
    const fps = await page.evaluate(
        () =>
            new Promise((res) => {
                let frames = 0;
                const t0 = performance.now();
                const tick = () => {
                    frames++;
                    if (performance.now() - t0 < 1000) requestAnimationFrame(tick);
                    else res(Math.round((frames * 1000) / (performance.now() - t0)));
                };
                requestAnimationFrame(tick);
            })
    );

    console.log(`dpr=${dpr} -> ${out}  (采样 FPS≈${fps})`);
    await browser.close();
}

await capture(1, 'dpr-1x.png');
await capture(2, 'dpr-2x.png');
console.log('完成：对比 dpr-1x.png 与 dpr-2x.png，2x 下线条/文字应明显更锐利。');

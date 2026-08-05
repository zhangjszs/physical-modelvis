/*
 * OCR 入口挂载冒烟 (Playwright)
 * 验证: 顶栏「📷 拍照解题」按钮存在 → 打开面板 → 后端状态显示 → 关闭面板 → 零 console error
 * 运行: node scripts/verify-ocr-mount.cjs (需 dev server http://localhost:3000/)
 */
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'msedge' });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    page.on('console', m => {
        if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
    });
    // 预期噪音: favicon.ico 404 (项目无图标, 浏览器自动请求) + 3001 OCR 后端未启动时的网络错误
    const isExpectedNoise = msg =>
        /favicon/i.test(msg) ||
        /the server responded with a status of 404/i.test(msg) ||
        /localhost:3001|api\/ocr\/health|ERR_CONNECTION_REFUSED/i.test(msg);

    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.top-bar-right', { timeout: 30000 });

    const buttons = await page.$$eval('.top-bar-right button', els => els.map(e => e.textContent.trim()));
    if (!buttons.some(t => t.includes('拍照解题'))) {
        console.log('FAIL: 顶栏缺少「拍照解题」按钮, 实际按钮: ' + JSON.stringify(buttons));
        process.exit(1);
    }

    await page.$$eval('.top-bar-right button', els => {
        const b = els.find(e => e.textContent.includes('拍照解题'));
        if (b) b.click();
    });
    await page.waitForSelector('.ocr-overlay', { timeout: 5000 });
    const modalText = await page.textContent('.ocr-modal');
    const opened = modalText.includes('AI 拍照解题');
    const health = /(已连接|未连接|检测中)/.exec(modalText);
    console.log(`面板打开: ${opened} | 后端状态: ${health ? health[0] : '未知'}`);

    await page.$eval('.ocr-close', el => el.click());
    await page.waitForTimeout(300);
    const closed = (await page.$('.ocr-overlay')) === null;
    console.log(`面板关闭: ${closed}`);

    await browser.close();
    const realErrors = errors.filter(e => !isExpectedNoise(e));
    if (realErrors.length) {
        console.log('ERRORS:\n' + realErrors.join('\n'));
        process.exit(1);
    }
    if (!opened || !closed) process.exit(1);
    console.log('OCR MOUNT OK: 入口/打开/关闭正常, 零 console error');
    process.exit(0);
})().catch(e => {
    console.error('FATAL:', e.message);
    process.exit(1);
});

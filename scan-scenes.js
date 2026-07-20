// 全场景空白复现扫描：逐个点击目录场景，抓 rig 崩溃
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({
        headless: true,
        args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
    });
    const page = await browser.newPage();

    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(String(err && err.stack ? err.stack : err)));

    const url = process.env.SCAN_URL || 'http://localhost:3000/';
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.directory-scene', { timeout: 30000 });

    const total = (await page.$$('.directory-scene')).length;
    console.log(`[scan] found ${total} scene buttons`);

    const results = [];
    for (let i = 0; i < total; i++) {
        const before = consoleErrors.length;
        const beforePE = pageErrors.length;

        const btns = await page.$$('.directory-scene');
        const name = (await btns[i].innerText()).trim();
        await btns[i].click();
        await page.waitForTimeout(1800);

        const newConsole = consoleErrors.slice(before);
        const newPE = pageErrors.slice(beforePE);
        const boundaryHit = newConsole.some(t => t.includes('[ErrorBoundary'));
        const fallbackVisible = await page.locator('text=已回退到 2D 画面').count();

        results.push({
            index: i,
            name,
            boundaryHit,
            fallbackVisible: fallbackVisible > 0,
            consoleErrors: newConsole.slice(0, 3),
            pageErrors: newPE.slice(0, 2)
        });

        if (boundaryHit || newPE.length) {
            console.log(`[scan] SCENE ERROR #${i} "${name}" boundary=${boundaryHit} fallback=${fallbackVisible > 0}`);
            newConsole.slice(0, 2).forEach(t => console.log('   console:', t.slice(0, 400)));
            newPE.slice(0, 1).forEach(t => console.log('   pageerror:', t.slice(0, 400)));
        }
    }

    const failed = results.filter(r => r.boundaryHit || r.pageErrors.length);
    console.log(`\n[scan] TOTAL=${total} FAILED=${failed.length}`);
    console.log('[scan] failed scenes:', failed.map(r => r.name).join(' | '));
    fs.writeFileSync('/tmp/scan-result.json', JSON.stringify(results, null, 2));

    await browser.close();
})().catch(e => {
    console.error('SCAN CRASHED:', e);
    process.exit(1);
});

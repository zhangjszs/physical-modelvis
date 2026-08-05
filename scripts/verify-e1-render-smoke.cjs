/*
 * E-1 性能改动 2D 渲染冒烟测试 (Playwright)
 *
 * 覆盖本次性能优化的渲染路径:
 *   - 大轨迹分档批处理 (draw2DTrajectoryBatched): projectile / free-fall (长轨迹 ≥60 点)
 *   - 机械波粒子自适应 + 单次取帧插值: mechanical-wave (横波/纵波/干涉)
 *   - 扩散颜色阶梯缓存 + 粒子自适应: diffusion
 *   - 布朗 trail 分档 stroke: brownian-motion
 *
 * 验证: 切场景无 pageerror / console error, 播放 2 秒无异常。
 * 运行: node scripts/verify-e1-render-smoke.cjs (需 dev server http://localhost:3000/)
 */
const { chromium } = require('playwright');

const SCENES = ['抛体运动 (平抛+斜抛)', '自由落体', '机械波 (横波/纵波/干涉)', '扩散现象 (浓度梯度)', '布朗运动 (微粒抖动)'];

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'msedge' });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push('PAGEERROR: ' + e.message));
    page.on('console', m => {
        if (m.type() === 'error') pageErrors.push('CONSOLE: ' + m.text());
    });

    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.directory-scene', { timeout: 30000 });

    const click = async name => {
        return page.$$eval('.directory-scene', (els, t) => {
            const el = els.find(e => e.textContent.trim() === t);
            if (el) { el.click(); return true; }
            return false;
        }, name);
    };

    const failures = [];
    for (const name of SCENES) {
        pageErrors.length = 0;
        const ok = await click(name);
        await page.waitForTimeout(1200);
        // 尝试播放 2 秒 (点击播放按钮, 若无则跳过)
        const playClicked = await page.$$eval('button', els => {
            const b = els.find(e => /播放|▶|开始/.test(e.textContent || '') && e.offsetParent !== null);
            if (b) { b.click(); return true; }
            return false;
        }).catch(() => false);
        await page.waitForTimeout(2000);
        const errs = pageErrors.filter(e => !/favicon/i.test(e));
        if (!ok) {
            failures.push({ scene: name, issue: '场景按钮未找到' });
        } else if (errs.length) {
            failures.push({ scene: name, issue: errs[0].slice(0, 180) });
        } else {
            console.log(`  OK: ${name}${playClicked ? ' (含播放)' : ''}`);
        }
    }

    await browser.close();

    if (failures.length === 0) {
        console.log(`E1 SMOKE OK: ${SCENES.length} 场景渲染/播放无错误`);
        process.exit(0);
    }
    console.log(`E1 SMOKE FAILED: ${failures.length} 处问题`);
    for (const f of failures) console.log(`  - ${f.scene}: ${f.issue}`);
    process.exit(1);
})().catch(e => {
    console.error('FATAL:', e.message);
    process.exit(1);
});

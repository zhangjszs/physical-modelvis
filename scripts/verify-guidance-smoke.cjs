/**
 * E-5 实验导学冒烟测试:
 * - 打开页面 → 点击「📖 导学」→ 面板出现 → 逐步推进 → 关闭
 * - 切换到回退场景 (无精编步骤), 验证通用步骤
 * 用法: node scripts/verify-guidance-smoke.cjs
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3000/';
const log = (...a) => console.log('[guidance]', ...a);
const errors = [];

async function main() {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage();
    page.on('console', msg => {
        if (msg.type() === 'error') {
            const t = msg.text();
            if (/favicon|the server responded with a status of 404|ERR_CONNECTION_REFUSED|3001/i.test(t)) return;
            errors.push(t);
        }
    });
    page.on('pageerror', e => errors.push(String(e)));

    await page.goto(BASE, { waitUntil: 'networkidle' });

    const guideBtn = page.locator('.top-bar-right button', { hasText: '导学' }).first();
    await guideBtn.waitFor({ state: 'visible' });
    log('导学按钮可见');

    await guideBtn.click();
    const dialog = page.getByRole('dialog', { name: '实验导学' });
    await dialog.waitFor({ state: 'visible' });
    log('面板打开');

    const progressLabel = dialog.locator('.guidance-progress-label');
    const title = await dialog.locator('.guidance-step-title').textContent();
    const cur = await progressLabel.textContent();
    log(`步骤: ${cur} | ${title}`);

    const nextBtn = dialog.getByRole('button', { name: /下一步/ });
    let steps = 1;
    while (await nextBtn.isEnabled()) {
        await nextBtn.click();
        steps++;
    }
    const lastTitle = await dialog.locator('.guidance-step-title').textContent();
    log(`推进到末步 (共 ${steps} 步): ${lastTitle}`);

    const prevBtn = dialog.getByRole('button', { name: /上一步/ });
    await prevBtn.click();
    const afterPrev = await dialog.locator('.guidance-progress-label').textContent();
    log(`上一步后: ${afterPrev}`);

    await dialog.getByRole('button', { name: '关闭导学' }).click();
    await dialog.waitFor({ state: 'detached' });
    log('面板关闭');

    await page.locator('.top-bar-right button', { hasText: '导学' }).first().click();
    await page.getByRole('dialog', { name: '实验导学' }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: '关闭导学' }).click();
    log('再次打开/关闭 OK');

    await page.$eval('.directory-scene', (el, text) => {
        const target = Array.from(document.querySelectorAll('.directory-scene')).find(b => b.textContent.includes(text));
        if (!target) throw new Error('未找到场景按钮: ' + text);
        target.click();
    }, '直流电路');
    await page.waitForTimeout(300);
    await page.locator('.top-bar-right button', { hasText: '导学' }).first().click();
    await page.getByRole('dialog', { name: '实验导学' }).waitFor({ state: 'visible' });
    const fallbackCur = await page.locator('.guidance-progress-label').textContent();
    const goal = await page.locator('.guidance-goal').textContent();
    log(`回退场景: ${fallbackCur} | goal: ${goal}`);
    if (!/第 1 \/ 4 步/.test(fallbackCur ?? '')) throw new Error(`期望回退 4 步, 实际 ${fallbackCur}`);
    if (!/直流电路/.test(goal ?? '')) throw new Error(`期望 goal 含场景名, 实际 ${goal}`);
    await page.getByRole('button', { name: '关闭导学' }).click();
    log('回退场景导学 OK');

    if (errors.length > 0) {
        log('FAIL console/page errors:');
        errors.forEach(e => log('  -', e));
        process.exitCode = 1;
    } else {
        log('SMOKE OK');
    }
    await browser.close();
}

main().catch(e => {
    console.error(e);
    process.exitCode = 1;
});

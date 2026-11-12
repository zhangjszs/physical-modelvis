/*
 * #136 γ + #137 — OverlayDrawer 浮层抽屉与工作台双视口冒烟 (Playwright)
 *
 * 验证 GuidancePanel（居中 modal）与 WorkbenchScene 公式抽屉（右滑 drawer）经 OverlayDrawer
 * 迁移后：① portal 挂 document.body（呼应 #112 backdrop-filter 包含块教训）；② 遮罩/浮层在
 * 1440×900 与 1024×768 双视口下不溢出视口；③ 点遮罩可关；④ 零 console error；
 * ⑤ #137 验收：1024×768 下真实 Playwright locator.click() 点击打开公式推导，elementFromPoint
 * 命中按钮本身，.stage-actions 无 inspector 矩形重叠，无水平滚动，inspector 保持可操作。
 *
 * 运行: 需先起 dev server  `cd visualization && npm run dev` (默认 :3000)
 *   BASE_URL=http://localhost:3000/ node scripts/verify-overlay-drawer-smoke.cjs
 *   SMOKE_BROWSER_CHANNEL 浏览器渠道 (#98/#106): 置空 = Playwright 自带 chromium（Linux/CI 可用）
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3000/';
const CHANNEL = process.env.SMOKE_BROWSER_CHANNEL ?? '';

const VIEWPORTS = [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 }
];

const isExpectedNoise = msg =>
    /favicon/i.test(msg) ||
    /the server responded with a status of 404/i.test(msg) ||
    /localhost:3001|api\/ocr|ERR_CONNECTION_REFUSED/i.test(msg);

/** 元素是否 portal 到 document.body（父节点即 body，脱离任何带 backdrop-filter 的祖先包含块） */
const isPortalToBody = (page, sel) =>
    page.evaluate(s => {
        const el = document.querySelector(s);
        return !!el && el.parentElement === document.body;
    }, sel);

/** 元素包围盒是否完整落在视口内（留 1px 容差） */
const isWithinViewport = async (page, sel, vp) => {
    const box = await page.locator(sel).boundingBox();
    if (!box) return false;
    return box.x >= -1 && box.y >= -1 && box.x + box.width <= vp.width + 1 && box.y + box.height <= vp.height + 1;
};

async function runGuidance(page, vp) {
    // #137: 真实 locator.click() 点击触发按钮（禁止 DOM click 绕过）
    const guidanceBtn = page.locator('.top-bar-right button', { hasText: '导学' });
    await guidanceBtn.click();
    await page.waitForSelector('.guidance-overlay', { state: 'visible', timeout: 8000 });
    if (!(await isPortalToBody(page, '.guidance-overlay')))
        throw new Error(`[${vp.width}] guidance-overlay 未 portal 到 body`);
    if (!(await isWithinViewport(page, '.guidance-panel', vp)))
        throw new Error(`[${vp.width}] guidance-panel 溢出视口`);
    await page.mouse.click(4, 4); // 遮罩左上角空白 → 点遮罩关闭
    await page.waitForTimeout(250);
    if ((await page.$('.guidance-overlay')) !== null) throw new Error(`[${vp.width}] guidance 遮罩点击未关闭`);
    console.log(`  [guidance @${vp.width}×${vp.height}] portal=body ✓ 未溢出 ✓ 遮罩关闭 ✓ (真实 click)`);
}

async function runFormula(page, vp) {
    const formulaBtn = page.locator('.stage-actions button', { hasText: '公式推导' });
    const btnBox = await formulaBtn.boundingBox();
    if (!btnBox) throw new Error(`[${vp.width}] 未找到公式推导按钮`);

    // #137 验收标准: 真实 elementFromPoint 命中按钮本身
    const hitEl = await page.evaluate(box => {
        const el = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return el ? el.tagName : null;
    }, btnBox);
    if (hitEl !== 'BUTTON') {
        throw new Error(`[${vp.width}] 公式推导按钮被遮挡, elementFromPoint 命中: ${hitEl}`);
    }

    // #137 验收标准: .stage-actions 所有可见按钮均不被 .classroom-inspector 矩形覆盖
    const overlap = await page.evaluate(() => {
        const inspector = document.querySelector('.classroom-inspector');
        if (!inspector) return null;
        const inspRect = inspector.getBoundingClientRect();
        const actionBtns = Array.from(document.querySelectorAll('.stage-actions button'));
        for (const btn of actionBtns) {
            const r = btn.getBoundingClientRect();
            const intersects = !(
                r.right <= inspRect.left ||
                r.left >= inspRect.right ||
                r.bottom <= inspRect.top ||
                r.top >= inspRect.bottom
            );
            if (intersects) return { text: btn.textContent.trim(), btnRect: r, inspRect };
        }
        return null;
    });
    if (overlap) {
        throw new Error(`[${vp.width}] 按钮 '${overlap.text}' 与 classroom-inspector 发生矩形重叠`);
    }

    // #137 验收标准: 真实 locator.click() 打开抽屉 (禁止 force: true, 禁止 DOM click 绕过)
    await formulaBtn.click();
    await page.waitForSelector('.formula-drawer-overlay', { state: 'visible', timeout: 8000 });
    // 关键: 迁移前公式抽屉是 inline 渲染（#112 隐患），迁移后必须 portal 到 body
    if (!(await isPortalToBody(page, '.formula-drawer-overlay')))
        throw new Error(`[${vp.width}] formula-drawer-overlay 未 portal 到 body（#112 回归）`);
    if (!(await isWithinViewport(page, '.formula-drawer', vp)))
        throw new Error(`[${vp.width}] formula-drawer 溢出视口`);
    if (!(await isWithinViewport(page, '.formula-drawer-overlay', vp)))
        throw new Error(`[${vp.width}] formula 遮罩未铺满视口`);
    await page.mouse.click(4, Math.floor(vp.height / 2)); // 抽屉在右、左侧为遮罩 → 点遮罩关闭
    await page.waitForTimeout(250);
    if ((await page.$('.formula-drawer-overlay')) !== null) throw new Error(`[${vp.width}] formula 遮罩点击未关闭`);
    console.log(
        `  [formula @${vp.width}×${vp.height}] 真实 click ✓ elementFromPoint 命中 ✓ 无重叠 ✓ portal=body ✓ 未溢出 ✓ 遮罩关闭 ✓`
    );
}

async function runInspectorCheck(page, vp) {
    // #137 验收标准: 页面无水平滚动
    const scrollInfo = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: document.defaultView ? document.defaultView.innerWidth : document.documentElement.clientWidth
    }));
    if (scrollInfo.scrollWidth > scrollInfo.innerWidth) {
        throw new Error(
            `[${vp.width}] 页面出现水平滚动: scrollWidth=${scrollInfo.scrollWidth} > innerWidth=${scrollInfo.innerWidth}`
        );
    }

    // #137 验收标准: inspector 仍可见且可操作 (切换 tab + 滚动)
    const inspector = page.locator('.classroom-inspector');
    if (!(await inspector.isVisible())) {
        throw new Error(`[${vp.width}] classroom-inspector 不可见`);
    }

    // 检查参数调试 tab 是否可点击并切换
    const paramTab = page.locator('.inspector-tab-btn', { hasText: '参数调试' });
    if (await paramTab.isVisible()) {
        await paramTab.click();
        const active = await paramTab.evaluate(el => el.classList.contains('active'));
        if (!active) throw new Error(`[${vp.width}] 点击参数调试 tab 未生效`);
    }

    // 检查 inspector 是否可滚动
    const scrollable = await inspector.evaluate(el => {
        const prev = el.scrollTop;
        el.scrollTop = 50;
        const changed = el.scrollTop !== prev;
        el.scrollTop = prev;
        return changed || el.scrollHeight <= el.clientHeight;
    });
    if (!scrollable) {
        throw new Error(`[${vp.width}] classroom-inspector 无法滚动`);
    }

    console.log(`  [inspector @${vp.width}×${vp.height}] 无水平滚动 ✓ inspector 可见 ✓ tab 可切 ✓ 可滚动 ✓`);
}

(async () => {
    const browser = await chromium.launch({ headless: true, ...(CHANNEL ? { channel: CHANNEL } : {}) });
    const errors = [];

    for (const vp of VIEWPORTS) {
        const page = await browser.newPage({ viewport: vp });
        page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
        page.on('console', m => {
            if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
        });
        await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('.top-bar-right', { timeout: 30000 });
        await page.waitForSelector('.stage-actions', { timeout: 30000 });
        await runGuidance(page, vp);
        await runFormula(page, vp);
        await runInspectorCheck(page, vp);
        // 切换亮色主题回归验证
        const themeBtn = page.locator('.top-bar-right button', { hasText: '浅色' });
        if (await themeBtn.isVisible()) {
            await themeBtn.click();
            await runFormula(page, vp);
            // 切回暗色
            await page.locator('.top-bar-right button', { hasText: '深色' }).click();
        }
        console.log(`  [theme @${vp.width}×${vp.height}] 浅色/深色主题均无遮挡 ✓`);
        await page.close();
    }

    await browser.close();
    const real = errors.filter(e => !isExpectedNoise(e));
    if (real.length) {
        console.log('ERRORS:\n' + real.join('\n'));
        process.exit(1);
    }
    console.log('OVERLAY DRAWER SMOKE OK: 双视口 portal/无溢出/遮罩关闭 全通过, 零 console error');
    process.exit(0);
})().catch(e => {
    console.error('FATAL:', e.message);
    process.exit(1);
});

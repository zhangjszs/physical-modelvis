/*
 * #136 γ — OverlayDrawer 浮层抽屉双视口冒烟 (Playwright)
 *
 * 验证 GuidancePanel（居中 modal）与 WorkbenchScene 公式抽屉（右滑 drawer）经 OverlayDrawer
 * 迁移后：① portal 挂 document.body（呼应 #112 backdrop-filter 包含块教训）；② 遮罩/浮层在
 * 1440×900 与 1024×768 双视口下不溢出视口；③ 点遮罩可关；④ 零 console error。
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
    // 程序化点击触发按钮（避开 #136 无关的窄视口侧栏遮挡；真实遮罩点击仍用 mouse）
    await page.$$eval('.top-bar-right button', els => {
        const b = els.find(e => e.textContent.includes('导学'));
        if (!b) throw new Error('未找到导学按钮');
        b.click();
    });
    await page.waitForSelector('.guidance-overlay', { state: 'visible', timeout: 8000 });
    if (!(await isPortalToBody(page, '.guidance-overlay')))
        throw new Error(`[${vp.width}] guidance-overlay 未 portal 到 body`);
    if (!(await isWithinViewport(page, '.guidance-panel', vp)))
        throw new Error(`[${vp.width}] guidance-panel 溢出视口`);
    await page.mouse.click(4, 4); // 遮罩左上角空白 → 点遮罩关闭
    await page.waitForTimeout(250);
    if ((await page.$('.guidance-overlay')) !== null) throw new Error(`[${vp.width}] guidance 遮罩点击未关闭`);
    console.log(`  [guidance @${vp.width}×${vp.height}] portal=body ✓ 未溢出 ✓ 遮罩关闭 ✓`);
}

async function runFormula(page, vp) {
    await page.$$eval('.stage-actions button', els => {
        const b = els.find(e => e.textContent.trim() === '公式推导');
        if (!b) throw new Error('未找到公式推导按钮');
        b.click();
    });
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
    console.log(`  [formula @${vp.width}×${vp.height}] portal=body ✓ 未溢出 ✓ 遮罩关闭 ✓`);
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

/*
 * portal 浮层设计令牌作用域探针 (#118) — Playwright，**手动运行，不接入 CI/precheck**。
 *
 * 目的: 锁定 #112 遗留的「定位修好但样式失效」回归 —— createPortal 到 document.body 的
 *       浮层（OCR「拍照解题」弹窗）此前脱离 .app 设计令牌作用域，背景/边框/圆角/阴影/标题
 *       渐变全部失效。#118 将令牌上移 :root、并把主题镜像到 <html class="light"> 后，
 *       body 级 portal 应在**暗/亮双主题**下均正确继承令牌。
 *
 * 运行: 需先起 dev server  `cd visualization && npm run dev` (默认 :3000)
 *   BASE_URL=http://localhost:3000/ node scripts/verify-portal-tokens.mjs
 *   SMOKE_BROWSER_CHANNEL 浏览器渠道 (#98/#106): 置空 = Playwright 自带 chromium（Linux/CI 可用）
 *
 * 判据: 每项关键 computed style 非 none / 非空即通过；任一失效 → exit 1（红）。
 *       修复前（令牌仅在 .app）对 body portal 即为红，修复后转绿 —— 这是「红→绿」双向可验的探针。
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000/';
// `??` 而非 `||`，让显式置空能选自带 chromium（对齐 #98/#106 约定）
const CHANNEL = process.env.SMOKE_BROWSER_CHANNEL ?? '';

/** 打开 OCR 弹窗 */
const openModal = async page => {
    await page.$$eval('.top-bar-right button', els => {
        const b = els.find(e => e.textContent.includes('拍照解题'));
        if (b) b.click();
    });
    await page.waitForSelector('.ocr-modal', { state: 'visible', timeout: 15000 });
    await page.waitForTimeout(200);
};
/** 关闭 OCR 弹窗 */
const closeModal = async page => {
    const close = await page.$('.ocr-close');
    if (close) await close.click();
    await page.waitForTimeout(200);
};
/** 切换暗/亮主题（顶栏按钮文案随当前主题变化） */
const toggleTheme = async page => {
    await page.$$eval('.top-bar-right button', els => {
        const b = els.find(e => /浅色|深色/.test(e.textContent));
        if (b) b.click();
    });
    await page.waitForTimeout(300);
};

/** 采集当前主题下 OCR 弹窗的关键 computed style */
const probeTheme = page =>
    page.evaluate(() => {
        const cs = sel => {
            const el = document.querySelector(sel);
            return el ? window.getComputedStyle(el) : null;
        };
        const modal = cs('.ocr-modal');
        const title = cs('.ocr-title');
        const btn = document.querySelector('.ocr-modal .btn-primary');
        return {
            htmlLight: document.documentElement.classList.contains('light'),
            // 作用域根判据：body 层能否解析到设计令牌（脱离 .app 即空）
            bodyGlassToken: window.getComputedStyle(document.body).getPropertyValue('--glass-bg-strong').trim(),
            modalBgImage: modal ? modal.backgroundImage : null,
            modalBorderStyle: modal ? modal.borderTopStyle : null,
            modalBorderRadius: modal ? modal.borderTopLeftRadius : null,
            modalBoxShadow: modal ? modal.boxShadow : null,
            titleBgImage: title ? title.backgroundImage : null,
            primaryBtnBg: btn ? btn.backgroundImage : null
        };
    });

/** 对单主题采集结果逐项判定，返回失败原因数组 */
const check = r => {
    const fails = [];
    if (!r.bodyGlassToken) fails.push('body 未解析 --glass-bg-strong（令牌作用域丢失 → portal 脱离作用域）');
    if (!/gradient/.test(r.modalBgImage || '')) fails.push(`弹窗背景非渐变: ${JSON.stringify(r.modalBgImage)}`);
    if (!r.modalBorderStyle || r.modalBorderStyle === 'none') fails.push(`弹窗边框样式: ${r.modalBorderStyle}`);
    if (r.modalBorderRadius === '0px') fails.push('弹窗圆角退化为 0px');
    if (!r.modalBoxShadow || r.modalBoxShadow === 'none') fails.push(`弹窗阴影: ${JSON.stringify(r.modalBoxShadow)}`);
    if (!/gradient/.test(r.titleBgImage || '')) fails.push(`标题渐变: ${JSON.stringify(r.titleBgImage)}`);
    return fails;
};

(async () => {
    const browser = await chromium.launch({ headless: true, ...(CHANNEL ? { channel: CHANNEL } : {}) });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.top-bar-right', { timeout: 30000 });

    const allFails = [];

    // ── 暗色（默认）──
    await openModal(page);
    const dark = await probeTheme(page);
    allFails.push(...check(dark).map(f => `[暗] ${f}`));
    await closeModal(page);

    // ── 亮色 ──
    await toggleTheme(page);
    await openModal(page);
    const light = await probeTheme(page);
    allFails.push(...check(light).map(f => `[亮] ${f}`));
    if (!light.htmlLight) allFails.push('[亮] <html> 未带 light 类（主题未镜像到根，portal 取不到亮色令牌）');
    if (dark.htmlLight) allFails.push('[暗] <html> 不应带 light 类');

    await browser.close();

    console.log(JSON.stringify({ dark, light }, null, 2));
    if (allFails.length) {
        console.log('FAIL:\n- ' + allFails.join('\n- '));
        process.exit(1);
    }
    console.log('PORTAL TOKENS OK: OCR 弹窗在暗/亮双主题下设计令牌均正确继承');
    process.exit(0);
})().catch(e => {
    console.error('FATAL:', e.message);
    process.exit(1);
});

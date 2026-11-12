/*
 * portal 浮层与 Design Token 作用域探针 (#118 + #138) — Playwright，**手动运行，不接入 CI/precheck**。
 *
 * 目的: ① 锁定 #112 遗留的「定位修好但样式失效」回归 —— createPortal 到 document.body 的
 *       浮层（OCR「拍照解题」弹窗）在暗/亮双主题下均正确继承令牌；
 *       ② #138 Design Token 切片 1 验证：验证暗/亮主题下 .guidance-panel 与 .export-menu
 *       的实际 computed backgroundColor 分别为 rgb(30, 41, 59) 与 rgb(255, 255, 255)。
 *
 * 运行: 需先起 dev server  `cd visualization && npm run dev` (默认 :3000)
 *   BASE_URL=http://localhost:3000/ node scripts/verify-portal-tokens.mjs
 *   SMOKE_BROWSER_CHANNEL 浏览器渠道 (#98/#106): 置空 = Playwright 自带 chromium（Linux/CI 可用）
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
    if (close) {
        await close.click();
        await page.waitForSelector('.ocr-overlay', { state: 'hidden', timeout: 8000 });
    }
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

/** #138: 采集 guidance-panel 与 export-menu 的实际 computed backgroundColor */
const probeSurfaceConsumers = async page => {
    // 1. 导学面板
    await page.locator('.top-bar-right button', { hasText: '导学' }).click();
    await page.waitForSelector('.guidance-panel', { state: 'visible', timeout: 8000 });
    const guidanceBg = await page.evaluate(
        () => window.getComputedStyle(document.querySelector('.guidance-panel')).backgroundColor
    );
    await page.mouse.click(4, 4); // 点遮罩关闭
    await page.waitForTimeout(200);

    // 2. 导出菜单
    const exportBtn = page.locator('.stage-actions button', { hasText: '导出数据' });
    let exportBg = null;
    if (await exportBtn.isVisible()) {
        await exportBtn.click();
        await page.waitForSelector('.export-menu', { state: 'visible', timeout: 8000 });
        exportBg = await page.evaluate(
            () => window.getComputedStyle(document.querySelector('.export-menu')).backgroundColor
        );
        await exportBtn.click(); // 关闭
        await page.waitForTimeout(200);
    }
    return { guidanceBg, exportBg };
};

/** #149: 采集暗/亮双主题下核心图表与仪器设计令牌计算值 */
const probeThemeTokens = page =>
    page.evaluate(() => {
        const root = window.getComputedStyle(document.documentElement);
        return {
            chartGrid: root.getPropertyValue('--chart-grid').trim().toLowerCase(),
            chartMarker: root.getPropertyValue('--chart-marker').trim().toLowerCase(),
            tooltipBg: root.getPropertyValue('--tooltip-bg').trim().toLowerCase(),
            tooltipBorder: root.getPropertyValue('--tooltip-border').trim().toLowerCase(),
            readoutText: root.getPropertyValue('--readout-text').trim().toLowerCase(),
            photogateCardBorder: root.getPropertyValue('--photogate-card-border').trim().toLowerCase(),
            photogateCyan: root.getPropertyValue('--photogate-cyan').trim().toLowerCase()
        };
    });
const normColor = c => {
    const s = (c || '').trim().toLowerCase();
    if (s === '#fff') return '#ffffff';
    return s;
};

/**
 * '#rrggbb' → [r,g,b] 归一化 sRGB。
 *
 * 实测（three r185 + 默认 outputColorSpace）：scene.background 为 Color 时
 * WebGLBackground 走 `getRGB(_rgb, getUnlitUniformColorSpace(renderer))`，
 * 即 clear color 上报的是归一化 sRGB（而非 Color 内部的线性工作空间）。
 */
const hexToNormalizedRgb = hex => {
    const n = hex.replace('#', '');
    return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255);
};
/** 断言 WebGL clear color 与主题令牌一致（容差容忍 GPU 精度） */
const checkClearColor = (actual, hex, label, fails) => {
    const expected = hexToNormalizedRgb(hex);
    if (!Array.isArray(actual) || actual.length < 3) {
        fails.push(`${label} 未读到 clear color: ${JSON.stringify(actual)}`);
        return;
    }
    const ok = actual.slice(0, 3).every((v, i) => Math.abs(v - expected[i]) <= 0.02);
    if (!ok) {
        fails.push(
            `${label} clear color 应为 ${hex} (linear ${expected.map(v => v.toFixed(4)).join(',')})，` +
                `实测 ${actual
                    .slice(0, 3)
                    .map(v => v.toFixed(4))
                    .join(',')}`
        );
    }
};

/** 采集舞台 canvas：WebGL 读 clear color，2D 采样非空 */
const probeStageCanvas = page =>
    page.evaluate(() => {
        const canvas =
            document.querySelector('.stage-canvas-host canvas') || document.querySelector('.stage-viewport canvas');
        if (!canvas) return { ok: false, reason: '未找到舞台 canvas' };
        if (!canvas.width || !canvas.height) {
            return { ok: false, reason: `canvas 尺寸为 0 (${canvas.width}x${canvas.height})` };
        }
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
            return {
                ok: true,
                type: 'webgl',
                clear: Array.from(gl.getParameter(gl.COLOR_CLEAR_VALUE)),
                width: gl.drawingBufferWidth,
                height: gl.drawingBufferHeight
            };
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
            try {
                const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const seen = new Set();
                const step = Math.max(4, Math.floor((img.data.length / 4 / 2000) * 4));
                for (let i = 0; i < img.data.length; i += step) {
                    if (img.data[i + 3] === 0) {
                        seen.add('transparent');
                        continue;
                    }
                    seen.add(`${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`);
                    if (seen.size > 2) break;
                }
                return {
                    ok: seen.size > 1,
                    type: '2d',
                    colors: seen.size,
                    width: canvas.width,
                    height: canvas.height
                };
            } catch (e) {
                return { ok: false, reason: `读取 2D 像素失败: ${e.message}` };
            }
        }
        return { ok: false, reason: '未能识别 canvas context 类型' };
    });

/** 通过目录搜索切换场景（用于 2D 自定义绘制场景） */
const openScene = async (page, name) => {
    await page.fill('.directory-search-input', name);
    await page.waitForTimeout(200);
    const clicked = await page.$$eval(
        '.directory-scene',
        (els, target) => {
            const el = [...els].find(e => (e.querySelector('span')?.textContent || '').trim() === target);
            if (el) {
                el.click();
                return true;
            }
            return false;
        },
        name
    );
    if (!clicked) throw new Error(`目录里找不到场景: ${name}`);
    await page.waitForTimeout(600);
};
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
    const consoleErrors = [];
    page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message));
    page.on('console', m => {
        if (m.type() === 'error') consoleErrors.push('CONSOLE: ' + m.text());
    });
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.top-bar-right', { timeout: 30000 });

    const allFails = [];

    // ── 暗色（默认）──
    await openModal(page);
    const dark = await probeTheme(page);
    allFails.push(...check(dark).map(f => `[暗] ${f}`));
    await closeModal(page);
    const darkConsumers = await probeSurfaceConsumers(page);
    if (darkConsumers.guidanceBg !== 'rgb(30, 41, 59)')
        allFails.push(`[暗] guidance-panel 背景色应为 rgb(30, 41, 59)，实测: ${darkConsumers.guidanceBg}`);
    if (darkConsumers.exportBg && darkConsumers.exportBg !== 'rgb(30, 41, 59)')
        allFails.push(`[暗] export-menu 背景色应为 rgb(30, 41, 59)，实测: ${darkConsumers.exportBg}`);

    // #149: 暗色主题令牌断言
    const darkTokens = await probeThemeTokens(page);
    if (darkTokens.chartGrid !== '#1e293b')
        allFails.push(`[暗] --chart-grid 应为 #1e293b，实测: ${darkTokens.chartGrid}`);
    if (darkTokens.chartMarker !== '#f59e0b')
        allFails.push(`[暗] --chart-marker 应为 #f59e0b，实测: ${darkTokens.chartMarker}`);
    if (darkTokens.tooltipBg !== '#1e293b')
        allFails.push(`[暗] --tooltip-bg 应为 #1e293b，实测: ${darkTokens.tooltipBg}`);
    if (darkTokens.readoutText !== '#e2e8f0')
        allFails.push(`[暗] --readout-text 应为 #e2e8f0，实测: ${darkTokens.readoutText}`);
    if (darkTokens.photogateCyan !== '#22d3ee')
        allFails.push(`[暗] --photogate-cyan 应为 #22d3ee，实测: ${darkTokens.photogateCyan}`);

    // #150: 3D 舞台背景 clear color = --stage3d-bg（跨过 Three.js 色彩空间转换）
    const darkStage = await probeStageCanvas(page);
    if (!darkStage.ok) allFails.push(`[暗] 3D 舞台画布不可用: ${darkStage.reason}`);
    else if (darkStage.type !== 'webgl') allFails.push(`[暗] 首屏应为 3D WebGL 画布，实测: ${darkStage.type}`);
    else checkClearColor(darkStage.clear, '#0b1020', '[暗] 3D 舞台', allFails);

    // ── 亮色 ──
    await toggleTheme(page);
    await openModal(page);
    const light = await probeTheme(page);
    allFails.push(...check(light).map(f => `[亮] ${f}`));
    await closeModal(page);
    const lightConsumers = await probeSurfaceConsumers(page);
    if (lightConsumers.guidanceBg !== 'rgb(255, 255, 255)')
        allFails.push(`[亮] guidance-panel 背景色应为 rgb(255, 255, 255)，实测: ${lightConsumers.guidanceBg}`);
    if (lightConsumers.exportBg && lightConsumers.exportBg !== 'rgb(255, 255, 255)')
        allFails.push(`[亮] export-menu 背景色应为 rgb(255, 255, 255)，实测: ${lightConsumers.exportBg}`);
    if (!light.htmlLight) allFails.push('[亮] <html> 未带 light 类（主题未镜像到根，portal 取不到亮色令牌）');
    if (dark.htmlLight) allFails.push('[暗] <html> 不应带 light 类');
    // #149: 浅色主题令牌断言
    const lightTokens = await probeThemeTokens(page);
    if (lightTokens.chartGrid !== '#e2e8f0')
        allFails.push(`[亮] --chart-grid 应为 #e2e8f0，实测: ${lightTokens.chartGrid}`);
    if (lightTokens.chartMarker !== '#b45309')
        allFails.push(`[亮] --chart-marker 应为 #b45309，实测: ${lightTokens.chartMarker}`);
    if (normColor(lightTokens.tooltipBg) !== '#ffffff')
        allFails.push(`[亮] --tooltip-bg 应为 #ffffff，实测: ${lightTokens.tooltipBg}`);
    if (lightTokens.readoutText !== '#1e293b')
        allFails.push(`[亮] --readout-text 应为 #1e293b，实测: ${lightTokens.readoutText}`);
    if (lightTokens.photogateCyan !== '#22d3ee')
        allFails.push(`[亮] --photogate-cyan 应为 #22d3ee，实测: ${lightTokens.photogateCyan}`);

    // #150: 亮色 3D 背景 clear color = --stage3d-bg
    const lightStage = await probeStageCanvas(page);
    if (!lightStage.ok) allFails.push(`[亮] 3D 舞台画布不可用: ${lightStage.reason}`);
    else if (lightStage.type !== 'webgl') allFails.push(`[亮] 首屏应为 3D WebGL 画布，实测: ${lightStage.type}`);
    else checkClearColor(lightStage.clear, '#f8fafc', '[亮] 3D 舞台', allFails);

    // #150: 2D 画布双主题非空（碰撞场景走 SimulationCanvas 自定义绘制，覆盖迁移后的 isDark 分支）
    // 注：每个场景都有 3D rig，需显式切「2D 板书」才会卸载 StageRenderer、挂载 SimulationCanvas。
    await openScene(page, '碰撞');
    const btn2d = page.locator('.stage-actions button', { hasText: '2D 板书' });
    if (await btn2d.isVisible()) {
        await btn2d.click();
        await page.waitForTimeout(400);
    }
    const light2d = await probeStageCanvas(page);
    if (!light2d.ok || light2d.type !== '2d') {
        allFails.push(`[亮] 碰撞场景 2D 画布不可用: ${JSON.stringify(light2d)}`);
    } else if (light2d.colors <= 1) {
        allFails.push(`[亮] 碰撞场景 2D 画布为空/纯色: ${light2d.colors}`);
    }
    await toggleTheme(page); // 切回暗色
    const dark2d = await probeStageCanvas(page);
    if (!dark2d.ok || dark2d.type !== '2d') {
        allFails.push(`[暗] 碰撞场景 2D 画布不可用: ${JSON.stringify(dark2d)}`);
    } else if (dark2d.colors <= 1) {
        allFails.push(`[暗] 碰撞场景 2D 画布为空/纯色: ${dark2d.colors}`);
    }

    const realErrors = consoleErrors.filter(
        e =>
            !/favicon/i.test(e) &&
            !/the server responded with a status of 404/i.test(e) &&
            !/localhost:3001|api\/ocr|ERR_CONNECTION_REFUSED/i.test(e)
    );
    if (realErrors.length) allFails.push(...realErrors.map(e => `[console] ${e}`));

    await browser.close();

    console.log(JSON.stringify({ dark, light, darkStage, lightStage, light2d, dark2d }, null, 2));
    if (allFails.length) {
        console.log('FAIL:\n- ' + allFails.join('\n- '));
        process.exit(1);
    }
    console.log('PORTAL TOKENS OK: OCR 弹窗在暗/亮双主题下设计令牌均正确继承，3D clear color 与 2D 画布双主题均非空');
    process.exit(0);
})().catch(e => {
    console.error('FATAL:', e.message);
    process.exit(1);
});

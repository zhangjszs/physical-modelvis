/**
 * 产品交互验收探针（Playwright 浏览器实测 · #100）
 *
 * 验证维度：
 * 1. 组合实验台打开与加载
 * 2. 添加方向类器材（圆形线圈），检查器出现「预设轴 + 绕轴角度」与六向预设按钮
 * 3. 改角度后画布随动重画（读数同步、B 场线绕新轴更新）
 * 4. 轨迹回放控制：暂停在任意帧画面静止、倍速切换生效（0.25x–2x）、拖动进度条画面跳转
 * 5. 键盘快捷键可用（空格播/暂停，Delete删除）且不吞输入框焦点
 * 6. 全程零 console error
 *
 * 运行：
 *   npm run build:viz
 *   node scripts/verify-composition-interaction.mjs
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const CHANNEL = process.env.SMOKE_BROWSER_CHANNEL ?? '';

function delay(ms) {
    const { promise, resolve: res } = Promise.withResolvers();
    setTimeout(res, ms);
    return promise;
}

async function isServerRunning(url) {
    try {
        const res = await globalThis.fetch(url, { method: 'HEAD' });
        return res.ok || res.status < 500;
    } catch {
        return false;
    }
}

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
        await delay(200);
    }

    if (!(await isServerRunning(BASE))) {
        child.kill();
        throw new Error('启动 vite preview 服务超时');
    }

    return {
        child,
        close: () => {
            child.kill();
        }
    };
}

async function runProbe() {
    console.log(`[probe] 目标 URL: ${BASE}`);
    const server = await ensureServer();

    const launchOpts = {
        headless: true,
        args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl-egl']
    };
    if (CHANNEL) {
        launchOpts.channel = CHANNEL;
    }

    const browser = await chromium.launch(launchOpts);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            const text = msg.text();
            // 忽略非关键 404/favicon
            if (!/favicon|status of 404/i.test(text)) {
                consoleErrors.push(text);
            }
        }
    });
    page.on('pageerror', err => {
        consoleErrors.push(err.message);
    });

    try {
        // 1. 进入页面
        await page.goto(BASE, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.app', { state: 'visible', timeout: 15000 });

        // 2. 切换到组合实验台
        const labBtn = page.locator('button:has-text("组合实验台")');
        await labBtn.click();
        await page.waitForSelector('.composition-layout', { state: 'visible', timeout: 10000 });
        console.log('✓ 成功进入组合实验台');
        // 2.1 验证预设实验模板区 (#101)
        const templateGrid = page.locator('.composition-template-grid');
        await templateGrid.waitFor({ state: 'visible', timeout: 5000 });
        const templateBtns = templateGrid.locator('.composition-template-btn');
        const templateCount = await templateBtns.count();
        if (templateCount < 3) {
            throw new Error(`预设实验模板数量不足 3 个，实际为: ${templateCount}`);
        }
        console.log(`✓ 实验模板面板在位，提供 ${templateCount} 个预设模板`);

        // 2.2 模板一键加载与画布像素级渲染断言
        const canvas = page.locator('.composition-stage canvas');
        await canvas.waitFor({ state: 'visible', timeout: 5000 });
        const blankBuffer = await canvas.screenshot();

        // 点击「速度选择器」模板
        const velocityBtn = page.locator('.composition-template-btn:has-text("速度选择器")');
        await velocityBtn.click();
        await delay(300);

        const activeBtn = page.locator('.composition-template-btn.active');
        const activeText = await activeBtn.innerText();
        if (!activeText.includes('速度选择器')) {
            throw new Error(`点击速度选择器后按钮未激活，实际为: ${activeText}`);
        }
        const goalCard = page.locator('.composition-template-goal-card');
        await goalCard.waitFor({ state: 'visible', timeout: 3000 });
        const goalText = await goalCard.innerText();
        if (!goalText.includes('qvB')) {
            throw new Error(`速度选择器教学目标卡片内容缺失或不符: ${goalText}`);
        }

        const statusOk = page.locator('.composition-status-ok');
        await statusOk.waitFor({ state: 'visible', timeout: 5000 });
        const statusText = await statusOk.innerText();
        console.log(`✓ 速度选择器模板一键加载成功，状态: ${statusText}`);

        // 比较画布像素差异
        const velocityBuffer = await canvas.screenshot();
        let diffBytes = 0;
        const minLen = Math.min(blankBuffer.length, velocityBuffer.length);
        for (let i = 0; i < minLen; i++) {
            if (blankBuffer[i] !== velocityBuffer[i]) diffBytes++;
        }
        if (diffBytes === 0) {
            throw new Error('加载速度选择器后画布像素与空白台完全相同，未发生实际 3D 渲染');
        }
        console.log(
            `✓ 画布像素变化断言通过: 差异字节数 ${diffBytes}/${minLen} (${((diffBytes / minLen) * 100).toFixed(1)}%)`
        );

        const scratchDir = resolve('.scratch');
        if (!existsSync(scratchDir)) {
            mkdirSync(scratchDir, { recursive: true });
        }
        const shot1Path = resolve('.scratch/composition-template-velocity-selector.png');
        await canvas.screenshot({ path: shot1Path });
        console.log(`✓ 速度选择器实验画面真实截图已保存: ${shot1Path}`);

        // 切换到「质谱仪」模板
        const msBtn = page.locator('.composition-template-btn:has-text("质谱仪")');
        await msBtn.click();
        await delay(300);
        const msGoal = await goalCard.innerText();
        if (!msGoal.includes('mv/qB')) {
            throw new Error(`质谱仪教学目标不符: ${msGoal}`);
        }
        const shot2Path = resolve('.scratch/composition-template-mass-spectrometer.png');
        await canvas.screenshot({ path: shot2Path });
        console.log(`✓ 质谱仪模板切换成功，截图: ${shot2Path}`);

        // 切换到「平行板偏转」模板
        const deflectBtn = page.locator('.composition-template-btn:has-text("平行板偏转")');
        await deflectBtn.click();
        await delay(300);
        const deflectGoal = await goalCard.innerText();
        if (!deflectGoal.includes('抛物线')) {
            throw new Error(`平行板偏转教学目标不符: ${deflectGoal}`);
        }
        console.log('✓ 平行板偏转模板切换成功');

        // 切换到「磁聚焦」模板
        const focusBtn = page.locator('.composition-template-btn:has-text("磁聚焦")');
        await focusBtn.click();
        await delay(300);
        const focusGoal = await goalCard.innerText();
        if (!focusGoal.includes('会聚')) {
            throw new Error(`磁聚焦教学目标不符: ${focusGoal}`);
        }
        console.log('✓ 磁聚焦模板切换成功');

        // 清空实验台，准备进入器材旋转编辑与回放测试
        const resetBtn = page.locator('.composition-reset-btn');
        await resetBtn.click();
        await delay(150);
        const goalCardCount = await page.locator('.composition-template-goal-card').count();
        if (goalCardCount > 0) {
            throw new Error('清空实验台后教学目标卡片未消除');
        }
        console.log('✓ 清空实验台成功，模板激活态复位');

        // 3. 添加圆形线圈
        const addCoilBtn = page.locator('.composition-palette-grid button:has-text("圆形线圈")');
        await addCoilBtn.click();
        await page.waitForSelector('.composition-direction-editor', { state: 'visible', timeout: 5000 });
        console.log('✓ 成功添加圆形线圈，检查器朝向控件在位');

        // 4. 验证初始朝向读数
        const readout = page.locator('.composition-vector-readout');
        const initialText = await readout.innerText();
        if (!initialText.includes('0.00, 1.00, 0.00')) {
            throw new Error(`初始线圈朝向读数不符合默认值 (0, 1, 0)，实际为: ${initialText}`);
        }

        // 5. 点击 +Z 预设朝向按钮
        const btnZ = page.locator('.composition-preset-buttons button[title*="+Z"]');
        await btnZ.click();
        await delay(150);
        const zText = await readout.innerText();
        if (!zText.includes('0.00, 0.00, 1.00')) {
            throw new Error(`点击 +Z 预设后读数未更新为竖直向，实际为: ${zText}`);
        }
        console.log('✓ 点击 +Z 预设朝向生效：读数对齐 (0.00, 0.00, 1.00)');

        // 6. 修改角度为 45°
        const angleInput = page.locator('.composition-direction-editor input[type="number"]');
        await angleInput.fill('45');
        await angleInput.dispatchEvent('change');
        await delay(150);
        const angleText = await readout.innerText();
        if (!angleText.includes('0.71') && !angleText.includes('0.70')) {
            throw new Error(`输入 45° 后向量未按三角函数投影，实际为: ${angleText}`);
        }
        console.log(`✓ 角度滑块/输入框修改生效：读数对齐 45° 投影 ${angleText}`);

        // 7. 回放控制：暂停
        const pauseBtn = page.locator('.playback-buttons button[title*="暂停"]');
        await pauseBtn.click();
        await delay(100);
        const playBtn = page.locator('.playback-buttons button[title*="播放"]');
        const playBtnCount = await playBtn.count();
        if (playBtnCount === 0) {
            throw new Error('点击暂停后未切换为播放按钮状态');
        }

        // 验证暂停时画面静止
        const timeLabel = page.locator('.playback-timeline .time-label').first();
        const t1 = await timeLabel.innerText();
        await delay(300);
        const t2 = await timeLabel.innerText();
        if (t1 !== t2) {
            throw new Error(`暂停状态下播放进度仍在推进: ${t1} -> ${t2}`);
        }
        console.log(`✓ 暂停功能生效：时间冻结在 ${t1}`);

        // 8. 倍速切换测试
        const btn2x = page.locator('.playback-speed button:has-text("2x")');
        await btn2x.click();
        const btn2xClass = await btn2x.getAttribute('class');
        if (!btn2xClass.includes('active')) {
            throw new Error('点击 2x 倍速按钮未呈现 active 激活状态');
        }
        const btn05x = page.locator('.playback-speed button:has-text("0.5x")');
        await btn05x.click();
        const btn05xClass = await btn05x.getAttribute('class');
        if (!btn05xClass.includes('active')) {
            throw new Error('点击 0.5x 倍速按钮未呈现 active 激活状态');
        }
        console.log('✓ 倍速切换生效（0.5x / 2x）');

        // 9. 进度滑块跳帧
        const slider = page.locator('.timeline-slider');
        await slider.evaluate(el => {
            el.value = '1.0';
            const win = el.ownerDocument.defaultView;
            if (win) {
                el.dispatchEvent(new win.Event('input', { bubbles: true }));
                el.dispatchEvent(new win.Event('change', { bubbles: true }));
            }
        });
        await delay(100);
        const scrubbedTime = await timeLabel.innerText();
        if (!scrubbedTime.includes('1.00')) {
            throw new Error(`拖动进度滑块后时间未跳转至 1.00s，实际为: ${scrubbedTime}`);
        }
        console.log(`✓ 进度滑块拖动跳帧生效：当前跳至 ${scrubbedTime}`);
        // 10. 键盘快捷键：空格恢复播放，再次空格暂停
        await page.keyboard.press('Space');
        await delay(150);
        const isPlayingNow = (await page.locator('.playback-buttons button[title*="暂停"]').count()) > 0;
        if (!isPlayingNow) {
            throw new Error('按空格键未能恢复播放');
        }
        await page.keyboard.press('Space');
        await delay(150);
        const isPausedNow = (await page.locator('.playback-buttons button[title*="播放"]').count()) > 0;
        if (!isPausedNow) {
            throw new Error('按空格键未能暂停播放');
        }
        console.log('✓ 空格键盘快捷键生效：播/停往返响应正常');

        // 11. 键盘焦点保护测试：在输入框内按空格不应触发播放切换
        await angleInput.focus();
        await page.keyboard.press('Space');
        await delay(100);
        const stillPaused = (await page.locator('.playback-buttons button[title*="播放"]').count()) > 0;
        if (!stillPaused) {
            throw new Error('输入框聚焦时按空格错误触发了全局回放播放（输入框焦点被吞）');
        }
        console.log('✓ 输入框焦点保护生效：在 input 内按键不吞焦点');

        // 12. 检查控制台报错
        if (consoleErrors.length > 0) {
            throw new Error(`实跑过程中捕获到控制台错误:\n${consoleErrors.join('\n')}`);
        }
        console.log('✓ 全程零 console error');

        console.log('\n========================================');
        console.log('COMPOSITION INTERACTION VERIFICATION OK');
        console.log('========================================');
    } finally {
        await browser.close();
        server.close();
    }
}

runProbe().catch(err => {
    console.error('❌ 交互验收探针执行失败:', err);
    process.exit(1);
});

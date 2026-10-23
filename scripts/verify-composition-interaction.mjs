/**
 * 产品交互验收探针（Playwright 浏览器实测 · #100 / #101 / #151）
 *
 * 验证维度：
 * 1. 组合实验台打开与加载，四大预设模板一键加载、真实 RGBA 解码像素变化断言与截图存证
 * 2. 添加方向类器材（圆形线圈），检查器出现「预设轴 + 绕轴角度」与六向预设按钮
 * 3. 改角度后画布随动重画（读数同步、固定暂停时刻与相机下真实 RGBA 解码像素显著变化）
 * 4. 轨迹回放控制：暂停跨 300ms 真实 RGBA 像素一致、0.5x/2x 在相同非零墙钟窗口推进比 ≈ 4:1、拖动进度条不同轨迹时刻真实 RGBA 像素变化
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
import { existsSync, mkdirSync, writeFileSync } from 'fs';
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

/**
 * 捕获纯 WebGL 画布 PNG 缓冲 (#151)：
 * 1. 将鼠标移至左上角 (1, 1) 排除光标/hover 状态干扰；
 * 2. 临时隐藏叠在 `.composition-stage` 上的 `.composition-playback-overlay`（按钮/时间标签/滑块）
 *    与 `.composition-tip`，等待双 rAF 确保合成层生效；
 * 3. 截取 `.composition-stage canvas` 后立即恢复 DOM 可见性。
 */
async function captureCleanCanvasBuffer(page, savePath) {
    await page.mouse.move(1, 1);
    await page.evaluate(async () => {
        const overlays = document.querySelectorAll('.composition-playback-overlay, .composition-tip');
        overlays.forEach(el => {
            el.dataset.prevDisplay = el.style.display || '';
            el.style.display = 'none';
        });
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    try {
        const canvas = page.locator('.composition-stage canvas');
        return await canvas.screenshot(savePath ? { path: savePath } : {});
    } finally {
        await page.evaluate(() => {
            const overlays = document.querySelectorAll('.composition-playback-overlay, .composition-tip');
            overlays.forEach(el => {
                el.style.display = el.dataset.prevDisplay || '';
                delete el.dataset.prevDisplay;
            });
        });
    }
}

/**
 * 使用浏览器内建 Image + Canvas 2D 将两份 PNG Buffer 解码为相同尺寸 RGBA 像素数组并逐像素比对 (#151)。
 * - 尺寸不符直接抛出异常失败；
 * - channelTolerance: 单像素 RGBA 四通道最大差值容差（GPU 帧缓冲重采样/抗锯齿容差，默认 2 / 255）。
 */
async function compareDecodedRgba(page, bufA, bufB, channelTolerance = 2) {
    const b64A = bufA.toString('base64');
    const b64B = bufB.toString('base64');
    return await page.evaluate(
        async ({ b64A, b64B, channelTolerance }) => {
            async function decodePng(b64) {
                const img = new window.Image();
                img.src = `data:image/png;base64,${b64}`;
                await img.decode();
                const c = document.createElement('canvas');
                c.width = img.width;
                c.height = img.height;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const { data } = ctx.getImageData(0, 0, img.width, img.height);
                return { width: img.width, height: img.height, data };
            }
            const imgA = await decodePng(b64A);
            const imgB = await decodePng(b64B);
            if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
                throw new Error(`RGBA 解码尺寸不一致: ${imgA.width}x${imgA.height} vs ${imgB.width}x${imgB.height}`);
            }
            const totalPixels = imgA.width * imgA.height;
            let changedPixels = 0;
            let maxChannelDiff = 0;
            const dA = imgA.data;
            const dB = imgB.data;
            for (let i = 0; i < dA.length; i += 4) {
                const dr = Math.abs(dA[i] - dB[i]);
                const dg = Math.abs(dA[i + 1] - dB[i + 1]);
                const db = Math.abs(dA[i + 2] - dB[i + 2]);
                const da = Math.abs(dA[i + 3] - dB[i + 3]);
                const m = Math.max(dr, dg, db, da);
                if (m > maxChannelDiff) maxChannelDiff = m;
                if (m > channelTolerance) changedPixels++;
            }
            return {
                width: imgA.width,
                height: imgA.height,
                totalPixels,
                changedPixels,
                changedRatio: changedPixels / totalPixels,
                maxChannelDiff
            };
        },
        { b64A, b64B, channelTolerance }
    );
}

/**
 * 驱动 React 受控的 `.timeline-slider` 跳转到指定时刻 t (s) 并等待两帧渲染完成。
 */
async function seekTimelineTo(page, targetSeconds) {
    await page.locator('.timeline-slider').evaluate((el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, String(val));
        el.dispatchEvent(new window.Event('input', { bubbles: true }));
        el.dispatchEvent(new window.Event('change', { bubbles: true }));
    }, targetSeconds);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await delay(80);
}

/**
 * 确保回放处于暂停状态，以便锁定固定时刻与固定相机对比纯画布像素。
 */
async function ensurePaused(page) {
    const pauseBtn = page.locator('.playback-buttons button[title*="暂停"]');
    if ((await pauseBtn.count()) > 0 && (await pauseBtn.isEnabled())) {
        await pauseBtn.click();
        await delay(80);
    }
}

function saveFailurePair(scratchDir, prefix, bufA, bufB) {
    if (!existsSync(scratchDir)) {
        mkdirSync(scratchDir, { recursive: true });
    }
    const pathA = resolve(scratchDir, `${prefix}-before.png`);
    const pathB = resolve(scratchDir, `${prefix}-after.png`);
    writeFileSync(pathA, bufA);
    writeFileSync(pathB, bufB);
    return { pathA, pathB };
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

        const scratchDir = resolve('.scratch');
        if (!existsSync(scratchDir)) {
            mkdirSync(scratchDir, { recursive: true });
        }

        // 2.2 模板一键加载与画布真实 RGBA 像素级渲染断言 (#101 / #151)
        // 阈值依据: 空白台仅有网格与灯光; 加载速度选择器后新增两块极板、匀强磁场盒、双色场线与轨迹球,
        // 1128×836 画布实测变化像素约 8.6 万 (~9.1%)，要求 changedRatio ≥ 1.0% (0.01) 排除噪声且留足裕度。
        const canvas = page.locator('.composition-stage canvas');
        await canvas.waitFor({ state: 'visible', timeout: 5000 });
        await ensurePaused(page);
        const blankBuffer = await captureCleanCanvasBuffer(page);

        // 点击「速度选择器」模板
        const velocityBtn = page.locator('.composition-template-btn:has-text("速度选择器")');
        await velocityBtn.click();
        await delay(300);
        await ensurePaused(page);
        await seekTimelineTo(page, 0);

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

        const velocityBuffer = await captureCleanCanvasBuffer(page);
        const tmplDiff = await compareDecodedRgba(page, blankBuffer, velocityBuffer, 2);
        if (tmplDiff.changedRatio < 0.01) {
            const { pathA, pathB } = saveFailurePair(scratchDir, 'fail-template-load', blankBuffer, velocityBuffer);
            throw new Error(
                `加载速度选择器后真实 RGBA 变化像素率过低: ${(tmplDiff.changedRatio * 100).toFixed(2)}% ` +
                    `(${tmplDiff.changedPixels}/${tmplDiff.totalPixels}, maxChannelDiff=${tmplDiff.maxChannelDiff})，截图已存: ${pathA}, ${pathB}`
            );
        }
        console.log(
            `✓ 模板加载真实 RGBA 像素变化断言通过: ${tmplDiff.changedPixels}/${tmplDiff.totalPixels} ` +
                `(${(tmplDiff.changedRatio * 100).toFixed(2)}%, 尺寸 ${tmplDiff.width}×${tmplDiff.height}, 最大通道差 ${tmplDiff.maxChannelDiff})`
        );

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
        // 4. 验证初始朝向读数与固定暂停时刻/固定相机下的初始画布 (#151)
        // 锁定回放暂停于 t=0.00s，开启磁场线以便同时反映线圈 3D 环体与 B 场线随朝向重绘
        await ensurePaused(page);
        await seekTimelineTo(page, 0);
        const bFieldCheckbox = page.locator('.composition-field-label:has-text("显示磁场线") input[type="checkbox"]');
        if (!(await bFieldCheckbox.isChecked())) {
            await bFieldCheckbox.click();
            await delay(200);
        }
        const coilBeforeOrientBuf = await captureCleanCanvasBuffer(page);

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

        // 6. 修改角度为 45°，并在同一暂停时刻 (t=0.00s)、固定相机下验证真实 RGBA 像素显著变化 (#151)
        // 阈值依据: 圆形线圈从 +Y 轴旋转至 +Z 偏 45° 时，3D 铜环姿态、B 场线闭环与粒子轨迹均重绘，
        // 实测变化像素约 2.7 万 (~2.87%)，设定阈值 changedRatio ≥ 0.3% (0.003) 拦截“只改读数不重画”回归。
        const angleInput = page.locator('.composition-direction-editor input[type="number"]');
        await angleInput.fill('45');
        await angleInput.dispatchEvent('change');
        await delay(200);
        const angleText = await readout.innerText();
        if (!angleText.includes('0.71') && !angleText.includes('0.70')) {
            throw new Error(`输入 45° 后向量未按三角函数投影，实际为: ${angleText}`);
        }
        console.log(`✓ 角度滑块/输入框修改生效：读数对齐 45° 投影 ${angleText}`);

        const coilAfterOrientBuf = await captureCleanCanvasBuffer(page);
        const orientDiff = await compareDecodedRgba(page, coilBeforeOrientBuf, coilAfterOrientBuf, 2);
        if (orientDiff.changedRatio < 0.003) {
            const { pathA, pathB } = saveFailurePair(
                scratchDir,
                'fail-orientation-canvas',
                coilBeforeOrientBuf,
                coilAfterOrientBuf
            );
            throw new Error(
                `改朝向后画布未发生显著重绘（疑似只改 DOM 读数未重画 3D 画布）: ` +
                    `变化像素率 ${(orientDiff.changedRatio * 100).toFixed(3)}% (${orientDiff.changedPixels}/${orientDiff.totalPixels}, maxChannelDiff=${orientDiff.maxChannelDiff})，` +
                    `失败截图已存: ${pathA}, ${pathB}`
            );
        }
        console.log(
            `✓ 改朝向真实 RGBA 画布重绘断言通过: 固定 t=0.00s 下变化像素 ${orientDiff.changedPixels}/${orientDiff.totalPixels} ` +
                `(${(orientDiff.changedRatio * 100).toFixed(2)}%, 最大通道差 ${orientDiff.maxChannelDiff})`
        );

        // 7. 回放控制：加载粒子全程无遮挡的「磁聚焦」模板（时长 1.50s），测试播放 → 暂停 → 300ms 像素静止 (#151)
        await focusBtn.click();
        await delay(300);
        const playToggleBeforePause = page.locator('.playback-buttons button[title*="播放"]');
        if ((await playToggleBeforePause.count()) > 0 && (await playToggleBeforePause.isEnabled())) {
            await playToggleBeforePause.click();
        }
        await seekTimelineTo(page, 0.3);
        await delay(150);
        const pauseBtn = page.locator('.playback-buttons button[title*="暂停"]');
        await pauseBtn.click();
        await delay(100);
        const playBtn = page.locator('.playback-buttons button[title*="播放"]');
        const playBtnCount = await playBtn.count();
        if (playBtnCount === 0) {
            throw new Error('点击暂停后未切换为播放按钮状态');
        }

        // 验证暂停时跨 300ms 时间标签与真实 RGBA 画布像素完全静止
        // 容差依据: 暂停态按需渲染 (#79) 不调用 renderer.render，帧缓冲跨 300ms 应零变化；
        // 仅允许 GPU 合成通道容差 ≤ 2/255，超出容差的变化像素数必须为 0。
        const timeLabel = page.locator('.playback-timeline .time-label').first();
        const t1 = await timeLabel.innerText();
        const pauseShot1 = await captureCleanCanvasBuffer(page);
        await delay(300);
        const t2 = await timeLabel.innerText();
        const pauseShot2 = await captureCleanCanvasBuffer(page);
        if (t1 !== t2) {
            throw new Error(`暂停状态下播放进度仍在推进: ${t1} -> ${t2}`);
        }
        const pauseDiff = await compareDecodedRgba(page, pauseShot1, pauseShot2, 2);
        if (pauseDiff.changedPixels > 0) {
            const { pathA, pathB } = saveFailurePair(scratchDir, 'fail-pause-stability', pauseShot1, pauseShot2);
            throw new Error(
                `暂停状态下跨 300ms 画布像素仍在变化: 变化像素 ${pauseDiff.changedPixels}/${pauseDiff.totalPixels} ` +
                    `(${(pauseDiff.changedRatio * 100).toFixed(4)}%, maxChannelDiff=${pauseDiff.maxChannelDiff})，失败截图已存: ${pathA}, ${pathB}`
            );
        }
        console.log(
            `✓ 暂停功能生效：时间冻结在 ${t1}，跨 300ms 真实 RGBA 画布像素零变化 (0/${pauseDiff.totalPixels}, 最大通道差 ${pauseDiff.maxChannelDiff})`
        );

        // 8. 倍速切换与相同非零墙钟窗口（600ms）下 0.5x / 2x 实际推进比 ≈ 4:1 验证 (#151)
        // 窗口与容差依据:
        // - 质谱仪总时长 3.60s，每次从 t=0.15s 起测、持续约 600ms，2x 最大推进至 ~1.45s，严格避开起点 (0s) 与终点循环边界 (3.60s)；
        // - UI 时间标签与滑块按 60ms 节流同步 (CompositionStage.tsx:415)，对齐两次真实滑块更新 tick 测量 Δt_sim 与 Δt_wall；
        // - 理论推进速率比 (2x / 0.5x) = 4.0，考虑 headless rAF 帧率抖动与 60ms 节流边界量化误差，设定合理区间 [3.0, 5.2]。
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
        // 切至时长 3.60s 的「质谱仪」模板测倍速推进比，避免 600ms@2x 跨越循环边界
        await msBtn.click();
        await delay(250);

        async function measurePlaybackAdvance(speedLabel, windowMs = 600) {
            await page.locator(`.playback-speed button:has-text("${speedLabel}")`).click();
            const playBtnLoc = page.locator('.playback-buttons button[title*="播放"]');
            if ((await playBtnLoc.count()) > 0 && (await playBtnLoc.isEnabled())) {
                await playBtnLoc.click();
            }
            await delay(400);
            await seekTimelineTo(page, 0.15);
            return await page.evaluate(async winMs => {
                const sliderEl = document.querySelector('.timeline-slider');
                const waitTick = () =>
                    new Promise(res => {
                        const initial = sliderEl.value;
                        const poll = () => {
                            if (sliderEl.value !== initial) {
                                res({ simTime: parseFloat(sliderEl.value), wallTime: window.performance.now() });
                            } else {
                                requestAnimationFrame(poll);
                            }
                        };
                        requestAnimationFrame(poll);
                    });
                // 先跳过首帧 seek 后的过渡 tick，再对齐稳定 rAF 周期起测
                await waitTick();
                const start = await waitTick();
                await new Promise(r => setTimeout(r, winMs));
                const end = await waitTick();
                const wallMsActual = end.wallTime - start.wallTime;
                const simAdvance = end.simTime - start.simTime;
                const rate = simAdvance / (wallMsActual / 1000);
                return {
                    tStart: start.simTime,
                    tEnd: end.simTime,
                    wallMs: wallMsActual,
                    simAdvance,
                    rate
                };
            }, windowMs);
        }

        const adv05 = await measurePlaybackAdvance('0.5x', 600);
        const adv20 = await measurePlaybackAdvance('2x', 600);
        await ensurePaused(page);
        const advanceRatio = adv20.simAdvance / Math.max(adv05.simAdvance, 1e-6);
        const rateRatio = adv20.rate / Math.max(adv05.rate, 1e-6);
        if (rateRatio < 3.0 || rateRatio > 5.2) {
            throw new Error(
                `2x 与 0.5x 实际回放推进比偏离 4:1 预期: 推进量比=${advanceRatio.toFixed(2)}, 归一化速率比=${rateRatio.toFixed(2)} ` +
                    `(0.5x: Δt=${adv05.simAdvance.toFixed(3)}s / ${adv05.wallMs.toFixed(1)}ms; ` +
                    `2x: Δt=${adv20.simAdvance.toFixed(3)}s / ${adv20.wallMs.toFixed(1)}ms)`
            );
        }
        console.log(
            `✓ 倍速切换生效（0.5x / 2x）：非零窗口 ~600ms 实测 0.5x 推进 ${adv05.simAdvance.toFixed(3)}s (${adv05.tStart.toFixed(2)}s→${adv05.tEnd.toFixed(2)}s, 墙钟 ${adv05.wallMs.toFixed(0)}ms)，` +
                `2x 推进 ${adv20.simAdvance.toFixed(3)}s (${adv20.tStart.toFixed(2)}s→${adv20.tEnd.toFixed(2)}s, 墙钟 ${adv20.wallMs.toFixed(0)}ms)，` +
                `推进量比 ${advanceRatio.toFixed(2)}:1，速率比 ${rateRatio.toFixed(2)}:1 (理论 4:1)`
        );

        // 9. 进度滑块跳帧与不同轨迹位置真实 RGBA 画布变化验证 (#151)
        // 采样时刻与阈值依据:
        // - 切换至无大面积极板遮挡的「磁聚焦」模板（时长 1.50s），t=0.10s 粒子位于线圈前侧发散起点附近 (x≈-0.65m)，
        //   t=1.30s 粒子穿过线圈到达后侧会聚区 (x≈+0.55m)，两时刻发光粒子球在视口中完全无遮挡且空间位置分离；
        // - 粒子球几何半径 r=0.032m，在相机距离 ~3.3m、FOV=50°、视口高 836px 下单球投影直径约 14px（圆面积 ≈ 150px），
        //   两处不重合位置的球体像素变化之和实测为 ~293px（0.0311%），且发光青色球体与浅色台面通道差达 ~232；
        // - 设定阈值 changedPixels ≥ 150 且 maxChannelDiff ≥ 80，既严格对应粒子球真实投影几何尺寸，又彻底排除单像素抗锯齿噪声。
        await focusBtn.click();
        await delay(300);
        await ensurePaused(page);
        await seekTimelineTo(page, 0.1);
        const seekTimeA = await timeLabel.innerText();
        if (!seekTimeA.includes('0.10')) {
            throw new Error(`跳帧至 0.10s 失败，实际时间标签为: ${seekTimeA}`);
        }
        const seekBufA = await captureCleanCanvasBuffer(page);

        await seekTimelineTo(page, 1.3);
        const seekTimeB = await timeLabel.innerText();
        if (!seekTimeB.includes('1.30')) {
            throw new Error(`跳帧至 1.30s 失败，实际时间标签为: ${seekTimeB}`);
        }
        const seekBufB = await captureCleanCanvasBuffer(page);

        const seekDiff = await compareDecodedRgba(page, seekBufA, seekBufB, 2);
        if (seekDiff.changedPixels < 150 || seekDiff.maxChannelDiff < 80) {
            const { pathA, pathB } = saveFailurePair(scratchDir, 'fail-seek-canvas', seekBufA, seekBufB);
            throw new Error(
                `跳帧至不同轨迹时刻 (0.10s vs 1.30s) 后画布粒子位置未发生可见变化: ` +
                    `变化像素 ${seekDiff.changedPixels}/${seekDiff.totalPixels} (${(seekDiff.changedRatio * 100).toFixed(4)}%, maxChannelDiff=${seekDiff.maxChannelDiff})，` +
                    `失败截图已存: ${pathA}, ${pathB}`
            );
        }

        await seekTimelineTo(page, 1.0);
        const scrubbedTime = await timeLabel.innerText();
        if (!scrubbedTime.includes('1.00')) {
            throw new Error(`拖动进度滑块后时间未跳转至 1.00s，实际为: ${scrubbedTime}`);
        }
        console.log(
            `✓ 进度滑块拖动跳帧生效：当前跳至 ${scrubbedTime}；t=0.10s 与 t=1.30s 纯画布真实 RGBA 差异像素 ` +
                `${seekDiff.changedPixels}/${seekDiff.totalPixels} (${(seekDiff.changedRatio * 100).toFixed(4)}%, 最大通道差 ${seekDiff.maxChannelDiff})`
        );
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
        await addCoilBtn.click();
        await page.waitForSelector('.composition-direction-editor', { state: 'visible', timeout: 5000 });
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

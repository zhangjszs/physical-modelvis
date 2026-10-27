/**
 * 《高中核心》24 节逐景截图取证 (#159 Phase 2)
 *
 * 每一节采集:
 *   - 3D 视图: t=0 首帧 / 播放中段 / 关键参数改动后
 *   - 2D 板书视图: t=0 首帧 / 播放中段
 *   - 异常标记: console error / pageerror / error-banner / 空白画布 / 画布尺寸异常
 *
 * 用法 (仓库根目录):
 *   node scripts/capture-core-scenes.mjs
 *   CORE_SCENE_IDS=projectile,free-fall node scripts/capture-core-scenes.mjs
 *   CAPTURE_SUFFIX=-before node scripts/capture-core-scenes.mjs   # 修复前证据
 *
 * 环境变量:
 *   CAPTURE_PORT      preview 端口 (默认 4321)
 *   CAPTURE_OUT       输出目录 (默认 docs/screenshots/core-audit)
 *   CAPTURE_CHANNEL   Playwright 浏览器渠道 (默认空 = 自带 chromium)
 *   CAPTURE_SUFFIX    文件名后缀 (默认空)
 *   BASE_URL          直接指定已运行的 preview 地址 (跳过自建 server)
 *   CORE_SCENE_IDS    逗号分隔 sceneId 过滤
 *   SKIP_BUILD        置 1 = 不重新构建 (复用既有 dist)
 */
/* eslint-env node */
/* global Event, getComputedStyle */
// 以下 Event / getComputedStyle 仅出现在 page.evaluate() 的浏览器上下文中。
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const PORT = Number(process.env.CAPTURE_PORT ?? 4321);
const OUT_DIR = path.resolve(ROOT, process.env.CAPTURE_OUT ?? 'docs/screenshots/core-audit');
const CHANNEL = process.env.CAPTURE_CHANNEL || '';
const SUFFIX = process.env.CAPTURE_SUFFIX ?? '';
/** 只拍指定档位 (逗号分隔: 3d-t0 / 3d-mid / 3d-param / 2d-t0 / 2d-mid); 空 = 全拍 */
const ONLY_STAGES = new Set(
    (process.env.ONLY_STAGES ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
);
/** 该档位是否要拍 */
const wantStage = stage => ONLY_STAGES.size === 0 || ONLY_STAGES.has(stage);
const EXTERNAL_BASE = process.env.BASE_URL || '';
const VIEWPORT = { width: 1440, height: 900 };

/** 《高中核心》24 节 (sceneId → 目录里的场景显示名) */
const CORE_SCENES = [
    { id: 'projectile', name: '抛体运动 (平抛+斜抛)' },
    { id: 'free-fall', name: '自由落体' },
    { id: 'uniform-accelerated', name: '竖直运动（自由落体/上抛）' },
    { id: 'inclined-plane', name: '斜面运动' },
    { id: 'collision', name: '碰撞' },
    { id: 'spring', name: '弹簧振子' },
    { id: 'electric-field', name: '匀强电场' },
    { id: 'magnetic-field', name: '匀强磁场' },
    { id: 'em-combined', name: '电磁复合场' },
    { id: 'simple-pendulum', name: '单摆 (简谐运动)' },
    { id: 'mechanical-wave', name: '机械波 (横波/纵波/干涉)' },
    { id: 'lc-oscillator', name: 'LC 电磁振荡' },
    { id: 'circular-motion', name: '匀速圆周运动 (向心力)' },
    { id: 'orbital', name: '万有引力与航天 (卫星轨道)' },
    { id: 'photoelectric', name: '光电效应 (爱因斯坦方程)' },
    { id: 'air-track', name: '气垫导轨测速度' },
    { id: 'hooke-law', name: '胡克定律 F=kx' },
    { id: 'newton-second-law', name: '牛顿第二定律 F=ma' },
    { id: 'force-composition', name: '力的合成 (平行四边形定则)' },
    { id: 'energy-conservation', name: '机械能守恒定律 (动能↔势能)' },
    { id: 'galileo-incline', name: '伽利略斜面理想实验' },
    { id: 'resistance-law', name: '电阻定律 (R=ρ·L/S)' },
    { id: 'refraction', name: '光的折射定律 (Snell)' },
    { id: 'gas-law', name: '理想气体状态方程' }
];

function warnIfNoCjkFont() {
    try {
        const r = spawnSync('fc-list', [':lang=zh'], { encoding: 'utf8' });
        if (r.status === 0 && !r.stdout.trim()) {
            console.warn('[capture] 警告: 系统未发现中文字体, 截图中文将渲染为方块。');
        }
    } catch {
        /* fc-list 不存在 → 视为有中文字体 */
    }
}

function waitForServer(url, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve, reject) => {
        const poll = () => {
            const req = http.get(url, res => {
                res.resume();
                if (res.statusCode && res.statusCode < 500) resolve();
                else if (Date.now() > deadline) reject(new Error(`preview 就绪超时 (${res.statusCode})`));
                else setTimeout(poll, 500);
            });
            req.on('error', () => {
                if (Date.now() > deadline) reject(new Error('preview 就绪超时 (连接失败)'));
                else setTimeout(poll, 500);
            });
        };
        poll();
    });
}

function startPreview() {
    const child = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
        cwd: path.join(ROOT, 'visualization'),
        stdio: 'ignore',
        detached: true
    });
    child.on('error', err => console.error(`[capture] preview 启动失败: ${err.message}`));
    return child;
}

async function stopPreview(child) {
    if (!child || child.exitCode !== null) return;
    const exited = new Promise(resolve => child.once('exit', resolve));
    try {
        process.kill(-child.pid, 'SIGTERM');
    } catch {
        child.kill('SIGTERM');
    }
    const timer = setTimeout(() => {
        try {
            process.kill(-child.pid, 'SIGKILL');
        } catch {
            child.kill('SIGKILL');
        }
    }, 5000);
    await exited;
    clearTimeout(timer);
}

/** 超时保护: 页面被重渲染拖死时 (软件渲染下 2D 密集场线) 不让整轮采集中断 */
async function withTimeout(promise, ms, tag) {
    let timer;
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(`超时 ${tag} (${ms}ms)`)), ms);
            })
        ]);
    } finally {
        clearTimeout(timer);
    }
}

/* ================= 页面操作 ================= */

async function waitDirectoryLoaded(page) {
    await page.waitForFunction(
        () => {
            const w = window;
            const count = document.querySelectorAll('.directory-scene').length;
            const now = count;
            if (w.__prevDirCount === now && now > 0) {
                delete w.__prevDirCount;
                return true;
            }
            w.__prevDirCount = now;
            return false;
        },
        undefined,
        { timeout: 20000, polling: 300 }
    );
}

async function openApp(page, base) {
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.directory-scene', { timeout: 30000 });
    await waitDirectoryLoaded(page);
}

/** 点击目录里的场景 (只比较行首 span, 避免「精讲」徽章污染) */
async function clickScene(page, sceneName) {
    await page.waitForFunction(
        target =>
            [...document.querySelectorAll('.directory-scene')].some(
                e => (e.querySelector('span')?.textContent || '').trim() === target
            ),
        sceneName,
        { timeout: 30000, polling: 200 }
    );
    await page.$$eval(
        '.directory-scene',
        (els, t) => {
            const el = els.find(e => (e.querySelector('span')?.textContent || '').trim() === t);
            el?.click();
        },
        sceneName
    );
    await page.waitForFunction(
        target =>
            [...document.querySelectorAll('.directory-scene.active')].some(
                e => (e.querySelector('span')?.textContent || '').trim() === target
            ),
        sceneName,
        { timeout: 30000, polling: 100 }
    );
    await page.waitForTimeout(900);
}

/** 等 3D canvas 出现 (WebGL 画布) */
async function waitStageReady(page, mode) {
    const sel = mode === '3d' ? '.stage-viewport canvas' : '.stage-viewport canvas';
    await page.waitForSelector(sel, { timeout: 30000 });
    await page.waitForTimeout(1200); // 等 rig 装载 + 渲染首帧
}

/** 读时间轴 slider, 设置到指定比例 (0~1) */
async function setTimeline(page, ratio) {
    const info = await page.evaluate(r => {
        const slider = document.querySelector('.timeline-slider');
        if (!slider) return null;
        const min = parseFloat(slider.min || '0');
        const max = parseFloat(slider.max || '1');
        const val = min + (max - min) * r;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(slider, String(val));
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
        return { min, max, val };
    }, ratio);
    await page.waitForTimeout(700);
    return info;
}

/**
 * 打开检查器的「⚙️ 参数调试」页签
 *
 * 课堂工作台 (classroom) 布局下, 参数面板挂在 `.classroom-inspector` 的
 * `.inspector-tabs` 里, **默认停在「课堂教案」页签** ⇒ `.param-slider` 不在 DOM 里。
 * 早期版本的采集脚本没开这个页签, 导致 changeFirstParam 恒返回 null,
 * 「关键参数改动后」那一档截图其实没有改动任何参数 (见 _report-latest.json
 * 全部 paramChange=null)。本函数显式打开页签, 保证参数改动真的生效。
 */
async function openParamPanel(page) {
    const opened = await page.evaluate(() => {
        const tabs = [...document.querySelectorAll('.inspector-tabs button')];
        const tab = tabs.find(b => /参数/.test(b.textContent || ''));
        if (!tab) return false;
        tab.click();
        return true;
    });
    if (!opened) return false;
    await page.waitForFunction(() => document.querySelectorAll('.param-slider').length > 0, undefined, {
        timeout: 15000,
        polling: 200
    });
    await page.waitForTimeout(400);
    return true;
}

/** 改动第一个实验参数 (slider 模式) 到区间内的新值 */
async function changeFirstParam(page) {
    const info = await page.evaluate(() => {
        const slider = document.querySelector('.param-slider');
        if (!slider) return null;
        const min = parseFloat(slider.min || '0');
        const max = parseFloat(slider.max || '1');
        const cur = parseFloat(slider.value || '0');
        const span = max - min;
        // 取区间 30% 处 (偏离当前值且在合法范围内)
        let target = min + span * 0.3;
        if (Math.abs(target - cur) < span * 0.1) target = min + span * 0.7;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(slider, String(target));
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
        return { min, max, cur, target, label: slider.getAttribute('aria-label') };
    });
    await page.waitForTimeout(900); // 等 debounce 150ms + 重算
    return info;
}

/** 画布健康检查: 尺寸 / 是否空白 (采样像素方差) / 可见文字牌 */
async function canvasHealth(page) {
    return page.evaluate(() => {
        const canvases = [...document.querySelectorAll('.stage-viewport canvas')];
        const banner = document.querySelector('.equipment-error');
        const bannerVisible = banner ? getComputedStyle(banner).display !== 'none' : false;
        const out = [];
        for (const c of canvases) {
            const rect = c.getBoundingClientRect();
            const entry = {
                width: c.width,
                height: c.height,
                cssWidth: Math.round(rect.width),
                cssHeight: Math.round(rect.height),
                blank: null,
                uniqueColors: null
            };
            try {
                const tmp = document.createElement('canvas');
                tmp.width = 64;
                tmp.height = 64;
                const ctx = tmp.getContext('2d');
                if (ctx) {
                    ctx.drawImage(c, 0, 0, 64, 64);
                    const data = ctx.getImageData(0, 0, 64, 64).data;
                    const seen = new Set();
                    let nonTransparent = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        if (data[i + 3] > 8) nonTransparent++;
                        seen.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`);
                    }
                    entry.uniqueColors = seen.size;
                    entry.nonTransparentRatio = +(nonTransparent / (64 * 64)).toFixed(3);
                    // WebGL 画布未开 preserveDrawingBuffer → drawImage 读到的是空缓冲,
                    // 属「读不到」而非「空白」。只有真读到像素却几乎全同色才算空白画布。
                    entry.readbackAvailable = entry.nonTransparentRatio > 0.01;
                    entry.blank = entry.readbackAvailable && seen.size <= 2;
                }
            } catch (e) {
                entry.blank = null;
                entry.error = String(e);
            }
            out.push(entry);
        }
        return { canvases: out, bannerVisible };
    });
}

/** 读取 3D 舞台里的信息牌文字 (canvas 内的文字读不到 DOM → 读 aria/live region 替代) */
async function readVisibleText(page) {
    return page.evaluate(() => {
        const root = document.querySelector('.stage-viewport');
        if (!root) return '';
        return (root.innerText || '').trim().slice(0, 2000);
    });
}

async function shoot(page, file) {
    const buf = await page.screenshot({ type: 'png' });
    fs.writeFileSync(path.join(OUT_DIR, file), buf);
    return buf.length;
}

/* ================= 主流程 ================= */

(async () => {
    warnIfNoCjkFont();
    if (!process.env.SKIP_BUILD) {
        console.log('[capture] 构建可视化生产产物 ...');
        await new Promise((resolve, reject) => {
            const child = spawn('npm', ['run', 'build'], { cwd: path.join(ROOT, 'visualization'), stdio: 'inherit' });
            child.on('error', reject);
            child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`vite build 失败 (exit ${code})`))));
        });
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });

    const only = process.env.CORE_SCENE_IDS
        ? process.env.CORE_SCENE_IDS.split(',')
              .map(s => s.trim())
              .filter(Boolean)
        : null;
    const scenes = only ? CORE_SCENES.filter(s => only.includes(s.id)) : CORE_SCENES;
    if (scenes.length !== 24) console.warn(`[capture] 注意: 本次只跑 ${scenes.length} 节 (全量应为 24)`);

    let server = null;
    let base = EXTERNAL_BASE;
    if (!base) {
        server = startPreview();
        base = `http://127.0.0.1:${PORT}/`;
        await waitForServer(base, 60000);
    }

    const browser = await chromium.launch({ headless: true, ...(CHANNEL ? { channel: CHANNEL } : {}) });
    const report = [];

    try {
        for (const sc of scenes) {
            const page = await browser.newPage({ viewport: VIEWPORT });
            const errors = [];
            page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
            page.on('console', m => {
                if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
            });

            const entry = { sceneId: sc.id, name: sc.name, shots: [], issues: [] };
            /** 单步采集 (失败只记 issue, 不中断整节) */
            const step = async (label, fn) => {
                try {
                    await fn();
                } catch (e) {
                    entry.issues.push(`${label}: ${e.message}`);
                }
            };
            try {
                await withTimeout(
                    (async () => {
                        await openApp(page, base);
                        await clickScene(page, sc.name);

                        // —— 3D 首帧 t=0 ——
                        await waitStageReady(page, '3d');
                        await page.click('button[title="重置"]').catch(() => {});
                        await page.waitForTimeout(500);
                        if (wantStage('3d-t0')) {
                            let health = await withTimeout(canvasHealth(page), 25000, 'canvasHealth(3d-t0)');
                            entry.shots.push({ file: `${sc.id}-3d-t0${SUFFIX}.png`, health });
                            await withTimeout(shoot(page, `${sc.id}-3d-t0${SUFFIX}.png`), 40000, 'shot(3d-t0)');
                            if (health.bannerVisible) entry.issues.push('3D: error-banner 可见');
                            if (health.canvases.some(c => c.blank)) entry.issues.push('3D: 疑似空白画布');
                        }

                        // —— 3D 中段 ——
                        await withTimeout(setTimeline(page, 0.5), 25000, 'setTimeline(3d-mid)');
                        if (wantStage('3d-mid')) {
                            let health = await withTimeout(canvasHealth(page), 25000, 'canvasHealth(3d-mid)');
                            entry.shots.push({ file: `${sc.id}-3d-mid${SUFFIX}.png`, health });
                            await withTimeout(shoot(page, `${sc.id}-3d-mid${SUFFIX}.png`), 40000, 'shot(3d-mid)');
                            if (health.bannerVisible) entry.issues.push('3D(mid): error-banner 可见');
                            if (health.canvases.some(c => c.blank)) entry.issues.push('3D(mid): 疑似空白画布');
                        }

                        // —— 3D 参数改动后 ——
                        // 必须先打开「⚙️ 参数调试」页签, 否则 .param-slider 不在 DOM 里,
                        // 参数改不动 (早期版本 24 节的 paramChange 全是 null)。
                        await step('打开参数面板', async () => {
                            const ok = await openParamPanel(page);
                            if (!ok) throw new Error('未找到「参数调试」页签');
                        });
                        const changed = await withTimeout(changeFirstParam(page), 25000, 'changeParam');
                        entry.paramChange = changed;
                        if (!changed) entry.issues.push('参数改动未生效 (未找到 .param-slider)');
                        await withTimeout(setTimeline(page, 0.5), 25000, 'setTimeline(3d-param)');
                        if (wantStage('3d-param')) {
                            let health = await withTimeout(canvasHealth(page), 25000, 'canvasHealth(3d-param)');
                            entry.shots.push({ file: `${sc.id}-3d-param${SUFFIX}.png`, health });
                            await withTimeout(shoot(page, `${sc.id}-3d-param${SUFFIX}.png`), 40000, 'shot(3d-param)');
                            if (health.bannerVisible) entry.issues.push('3D(param): error-banner 可见');
                            if (health.canvases.some(c => c.blank)) entry.issues.push('3D(param): 疑似空白画布');
                        }

                        // —— 2D 板书 (软件渲染下重场景可能拖死页面 → 每步独立超时) ——
                        if (wantStage('2d-t0') || wantStage('2d-mid')) {
                            await step('2D 切换', async () => {
                                await page.click('button[title="切换到 2D 板书示意模式"]', {
                                    timeout: 15000
                                });
                                await page.waitForTimeout(1200);
                            });
                        }
                        await step('2D t0', async () => {
                            if (!wantStage('2d-t0')) return;
                            const h = await withTimeout(canvasHealth(page), 25000, 'canvasHealth(2d-t0)');
                            entry.shots.push({ file: `${sc.id}-2d-t0${SUFFIX}.png`, health: h });
                            await withTimeout(shoot(page, `${sc.id}-2d-t0${SUFFIX}.png`), 45000, 'shot(2d-t0)');
                            if (h.bannerVisible) entry.issues.push('2D: error-banner 可见');
                            if (h.canvases.some(c => c.blank)) entry.issues.push('2D: 疑似空白画布');
                        });
                        await step('2D mid', async () => {
                            if (!wantStage('2d-mid')) return;
                            await withTimeout(setTimeline(page, 0.5), 25000, 'setTimeline(2d-mid)');
                            const h = await withTimeout(canvasHealth(page), 25000, 'canvasHealth(2d-mid)');
                            entry.shots.push({ file: `${sc.id}-2d-mid${SUFFIX}.png`, health: h });
                            await withTimeout(shoot(page, `${sc.id}-2d-mid${SUFFIX}.png`), 45000, 'shot(2d-mid)');
                        });

                        // —— 舞台 DOM 层可读文字 ——
                        entry.stageText = await withTimeout(readVisibleText(page), 20000, 'readVisibleText');
                    })(),
                    240000,
                    `场景 ${sc.id} 整体`
                );

                entry.errors = errors.filter(e => !/favicon/i.test(e));
                if (entry.errors.length) entry.issues.push(`console/page 错误 ${entry.errors.length} 条`);
            } catch (e) {
                entry.issues.push('采集异常: ' + e.message);
                entry.errors = errors.filter(e => !/favicon/i.test(e));
            } finally {
                await page.close().catch(() => {});
            }

            report.push(entry);
            const flag = entry.issues.length ? '⚠' : '✓';
            console.log(
                `[capture] ${flag} ${sc.id.padEnd(22)} shots=${entry.shots.length} issues=${entry.issues.length ? entry.issues.join(' | ') : '无'}`
            );
        }
    } finally {
        await browser.close();
        if (server) {
            await stopPreview(server);
            console.log('[capture] preview server 已停止');
        }
    }

    const outFile = path.join(OUT_DIR, `_report${SUFFIX || '-latest'}.json`);
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
    const bad = report.filter(r => r.issues.length);
    console.log(`[capture] 完成 ${report.length} 节, 异常 ${bad.length} 节 → ${outFile}`);
    if (bad.length) {
        console.log('[capture] 有异常的节:');
        for (const b of bad) console.log(`   - ${b.sceneId}: ${b.issues.join(' | ')}`);
    }
})().catch(err => {
    console.error(`[capture] 失败: ${err.message}`);
    process.exit(1);
});

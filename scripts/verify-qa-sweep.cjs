/*
 * 全场景 QA 巡检 sweep (Playwright, 只读检查不改代码)
 *
 * 用途: 逐个遍历教材目录里的全部场景, 自动采集人工点查时容易漏掉的异常:
 *   1. console error / pageerror (含切场景与播放过程)
 *   2. 可见文本里的 NaN / Infinity / undefined (数据泄漏到 UI)
 *   3. 2D 画布空白 (整块像素同色) 与 canvas 数为 0 (舞台根本没挂载)
 *   4. 页面错误提示条（.error-banner / .equipment-error / [role=alert]）—— 只进 DOM 不进 console 的错误
 *   5. 文本溢出裁切 (scrollWidth > clientWidth)
 *   6. 播放链路: 播放后时间是否推进
 *   7. 参数边界: 每个 .param-slider 拉到 min / max 后是否出现异常值或报错
 *   8. 时间轴拖到末尾后的状态
 *   9. 性能-内存 (#80): 对前 N(≤30) 个场景做「暖场趟 + 计量趟」双趟切换,
 *      两趟之间 CDP 强制 GC 后采样 JS 堆, 增量超预算 → ERROR (人为造泄漏可复验变红)
 *  10. 性能-切换耗时 (#80): 计量趟逐场景测「点击 → 场景激活 + 首帧渲染完成 (2 rAF)」耗时,
 *      超预算 nightly 记 ERROR / pr 记 WARN (CI 机器噪声大, PR 档不拦截)
 *
 * 运行: node scripts/verify-qa-sweep.cjs   (需 dev server, 默认 http://localhost:5199/)
 * 环境变量:
 *   QA_BASE           dev server 地址 (默认 http://localhost:5199/)
 *   QA_ONLY           只跑名字含该子串的场景 (调试用)
 *   QA_LIMIT          最多跑 N 个场景 (0 = 全部)
 *   QA_SKIP_PARAMS    1 = 跳过参数边界扫描 (最快)
 *   QA_OUT            报告输出路径 (默认 .scratch/qa-sweep.json)
 *   QA_CHANNEL        浏览器渠道: 留空 = Playwright 自带 chromium (跨平台默认);
 *                     需系统 Edge/Chrome 时填 msedge / chrome (现有 verify-*.cjs 硬编 msedge, Linux 跑不了)
 *   QA_STRICT         失败口径: 默认 error = 任何 ERROR(console/pageerror/no-canvas/error-banner/找不到场景)均退出 1;
 *                     canvas = 只对「舞台没渲染」类失败 (no-canvas / scene-not-clickable) 退出 1,
 *                     console 报错与错误提示条降级为 WARN 仍上报 —— 给 PR 门禁用,
 *                     不被已知存量问题（或目录顺序变动）卡死正常 PR
 *   QA_PERF_TIER      性能判定档位: pr (默认, 宽预算, 耗时超限只 WARN) |
 *                     nightly (严预算, 内存/耗时超限都 ERROR)
 *   QA_HEAP_BUDGET_MB 覆盖内存增量预算 (默认按档位: nightly 12 / pr 24)
 *   QA_SWITCH_BUDGET_MS 覆盖单场景切换耗时预算 (默认按档位: nightly 10000 / pr 25000)
 *
 * 退出码: 0 = 无 ERROR 级问题; 1 = 存在 ERROR (console/pageerror/场景未找到/性能内存超限,
 *         nightly 下含切换耗时超限)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.QA_BASE || 'http://localhost:5199/';
const ONLY = process.env.QA_ONLY || '';
const LIMIT = Number(process.env.QA_LIMIT || '0');
const SKIP_PARAMS = process.env.QA_SKIP_PARAMS === '1';
const OUT = process.env.QA_OUT || '.scratch/qa-sweep.json';
const CHANNEL = process.env.QA_CHANNEL || '';
/** 'canvas' = 只把「舞台未渲染/场景打不开」当作失败; 其余口径下 console 报错也算 ERROR */
const STRICT = process.env.QA_STRICT || 'error';

/** 每跑 N 个场景重载一次页面, 规避浏览器 WebGL 上下文数量上限造成的假红 */
const RELOAD_EVERY = 20;

const ANOMALY_RE = /\bNaN\b|\bInfinity\b|\bundefined\b/;

// ---- 性能判定 (#80) ----
const PERF_TIER = process.env.QA_PERF_TIER || 'pr';
const PERF_SCENES = 30; // 双趟子集上限 (连续切换 ≥30 是 nightly 建议值)
const HEAP_BUDGET_MB = Number(process.env.QA_HEAP_BUDGET_MB ?? (PERF_TIER === 'nightly' ? 12 : 24));
const SWITCH_BUDGET_MS = Number(process.env.QA_SWITCH_BUDGET_MS ?? (PERF_TIER === 'nightly' ? 10000 : 25000));

/** 在浏览器里扫描可见文本中的异常值, 返回 [{ token, around }] */
async function scanText(page) {
    return page.evaluate(reSource => {
        const re = new RegExp(reSource, 'g');
        const root = document.querySelector('.main-content') || document.body;
        const text = root.innerText || '';
        const hits = [];
        let m;
        while ((m = re.exec(text)) !== null) {
            const around = text.slice(Math.max(0, m.index - 45), m.index + 45).replace(/\s+/g, ' ');
            hits.push({ token: m[0], around });
            if (hits.length >= 6) break;
        }
        return hits;
    }, ANOMALY_RE.source);
}

/** 扫描文本溢出裁切 (元素自身可滚动宽度超过可见宽度) */
async function scanClipped(page) {
    return page.evaluate(() => {
        const out = [];
        const nodes = document.querySelectorAll('.main-content *, .sidebar *, .panel-section *');
        for (const el of nodes) {
            const txt = (el.textContent || '').trim();
            if (!txt || txt.length > 60 || el.children.length > 0) continue;
            if (el.scrollWidth > el.clientWidth + 3 && el.clientWidth > 0) {
                out.push({
                    cls: el.className || el.tagName,
                    text: txt.slice(0, 40),
                    over: el.scrollWidth - el.clientWidth
                });
                if (out.length >= 4) break;
            }
        }
        return out;
    });
}

/** 2D 画布空白检测; WebGL 画布跳过 (getContext('2d') 返回 null) */
async function scanCanvas(page) {
    return page.evaluate(() => {
        const reports = [];
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach((c, i) => {
            if (!c.width || !c.height) {
                reports.push({ index: i, reason: 'zero-size', w: c.width, h: c.height });
                return;
            }
            let ctx = null;
            try {
                ctx = c.getContext('2d');
            } catch {
                ctx = null;
            }
            if (!ctx) return; // WebGL 或不可读, 跳过
            let data;
            try {
                data = ctx.getImageData(0, 0, c.width, c.height).data;
            } catch {
                return;
            }
            const seen = new Set();
            const step = Math.max(4, Math.floor((data.length / 4 / 4000) * 4));
            for (let p = 0; p < data.length; p += step) {
                if (data[p + 3] === 0) {
                    seen.add('transparent');
                    continue;
                }
                seen.add(`${data[p]},${data[p + 1]},${data[p + 2]}`);
                if (seen.size > 6) break;
            }
            if (seen.size <= 1) {
                reports.push({ index: i, reason: 'blank', colors: seen.size, w: c.width, h: c.height });
            }
        });
        return { canvasCount: canvases.length, reports };
    });
}

/** 扫描可见的错误提示条（红条/toast）—— 这类错误只写进 DOM 不进 console，靠文本扫描才能发现 */
async function scanBanners(page) {
    return page.evaluate(() => {
        const out = [];
        const nodes = document.querySelectorAll('.error-banner, .equipment-error, [role="alert"]');
        for (const el of nodes) {
            if (!el.offsetParent) continue; // 隐藏的不算
            const txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!txt) continue;
            out.push(txt.slice(0, 120));
            if (out.length >= 3) break;
        }
        return out;
    });
}

/** 用 React 认可的方式设置受控 input 的值 (native setter + input + change) */
async function setSlider(page, selector, index, value) {
    return page.evaluate(
        ({ sel, idx, val }) => {
            const els = document.querySelectorAll(sel);
            const el = els[idx];
            if (!el) return false;
            const proto = el.constructor.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
            setter.call(el, String(val));
            el.dispatchEvent(new document.defaultView.Event('input', { bubbles: true }));
            el.dispatchEvent(new document.defaultView.Event('change', { bubbles: true }));
            return true;
        },
        { sel: selector, index, val: value }
    );
}

async function sliderMeta(page, selector) {
    return page.evaluate(sel => {
        return [...document.querySelectorAll(sel)].map(el => ({
            min: el.min,
            max: el.max,
            value: el.value,
            label: (el.closest('.param-item')?.querySelector('.param-label')?.textContent || '').trim()
        }));
    }, selector);
}

(async () => {
    const browser = await chromium.launch({ headless: true, ...(CHANNEL ? { channel: CHANNEL } : {}) });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    let current = '';
    const logs = [];
    // 性能双趟期间 (inPerfPass) 的报错单独归档, 不与主巡检 findings 混算
    let inPerfPass = false;
    const perfLogs = [];
    page.on('pageerror', e => {
        (inPerfPass ? perfLogs : logs).push({
            scene: current,
            level: 'ERROR',
            kind: 'pageerror',
            text: e.message
        });
    });
    page.on('console', m => {
        if (m.type() === 'error')
            (inPerfPass ? perfLogs : logs).push({
                scene: current,
                level: 'ERROR',
                kind: 'console',
                text: m.text().slice(0, 300)
            });
    });

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('.directory-scene', { timeout: 60000 });
    await page.evaluate(() => {
        document.querySelectorAll('details').forEach(d => {
            d.open = true;
        });
    });

    const names = await page.$$eval('.directory-scene span:first-child', els => [
        ...new Set(els.map(e => e.textContent.trim()).filter(Boolean))
    ]);

    const targets = names.filter(n => !ONLY || n.includes(ONLY));
    const list = LIMIT > 0 ? targets.slice(0, LIMIT) : targets;
    console.log(`QA sweep: 目录共 ${names.length} 个场景名, 本轮跑 ${list.length} 个 (base=${BASE})`);

    const results = [];
    for (let i = 0; i < list.length; i++) {
        const name = list[i];
        current = name;
        const findings = [];
        const before = logs.length;

        if (i > 0 && i % RELOAD_EVERY === 0) {
            await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
            await page.waitForSelector('.directory-scene', { timeout: 60000 });
            await page.evaluate(() => {
                document.querySelectorAll('details').forEach(d => {
                    d.open = true;
                });
            });
        }

        const clicked = await page.$$eval(
            '.directory-scene',
            (els, t) => {
                const el = [...els].find(e => (e.querySelector('span')?.textContent || '').trim() === t);
                if (el) {
                    el.click();
                    return true;
                }
                return false;
            },
            name
        );
        if (!clicked) {
            findings.push({ level: 'ERROR', kind: 'scene-not-clickable', text: '目录里找不到该场景名' });
        }
        await page.waitForTimeout(1400);

        // 1) 默认态文本异常 / 画布空白 / 裁切
        const textHits = await scanText(page);
        textHits.forEach(h =>
            findings.push({ level: 'WARN', kind: 'text-anomaly', text: `${h.token} :: ${h.around}` })
        );
        const canvas = await scanCanvas(page);
        // 一个 canvas 都没有 = 舞台从未挂载 (3D rig 卡 loading / 2D 链路未渲染),
        // 单靠 console 错误根本看不出来 —— 必须当 ERROR 报
        if (canvas.canvasCount === 0) {
            findings.push({
                level: 'ERROR',
                kind: 'no-canvas',
                text: '视口内 0 个 canvas, 舞台未渲染 (疑似永久 loading 态)'
            });
        }
        canvas.reports.forEach(r => findings.push({ level: 'WARN', kind: 'canvas', text: JSON.stringify(r) }));
        const banners = await scanBanners(page);
        banners.forEach(t =>
            findings.push({
                level: STRICT === 'canvas' ? 'WARN' : 'ERROR',
                kind: 'error-banner',
                text: t
            })
        );
        const clipped = await scanClipped(page);
        clipped.forEach(c =>
            findings.push({ level: 'INFO', kind: 'clipped', text: `${c.cls} "${c.text}" +${c.over}px` })
        );

        // 2) 播放链路: 时间是否推进
        const t0 = await page.evaluate(() => {
            const el = document.querySelector('.timeline-slider');
            return el ? Number(el.value) : -1;
        });
        const played = await page.evaluate(() => {
            const btn = document.querySelector('.playback-buttons .btn-primary');
            if (!btn) return false;
            btn.click();
            return true;
        });
        if (played) {
            await page.waitForTimeout(1600);
            const t1 = await page.evaluate(() => {
                const el = document.querySelector('.timeline-slider');
                return el ? Number(el.value) : -1;
            });
            if (t0 >= 0 && t1 <= t0) {
                findings.push({ level: 'WARN', kind: 'playback', text: `播放后时间未推进 (${t0} → ${t1})` });
            }
            const midHits = await scanText(page);
            midHits.forEach(h =>
                findings.push({ level: 'WARN', kind: 'text-anomaly-during-play', text: `${h.token} :: ${h.around}` })
            );
            await page.evaluate(() => {
                const btn = document.querySelector('.playback-buttons .btn-primary');
                if (btn) btn.click();
            });
            await page.evaluate(() => {
                const btns = [...document.querySelectorAll('.playback-buttons .btn-icon')];
                const reset = btns.find(b => (b.getAttribute('title') || '').includes('重置'));
                if (reset) reset.click();
            });
            await page.waitForTimeout(300);
        }

        // 3) 时间轴拖到末尾
        const tl = await sliderMeta(page, '.timeline-slider');
        if (tl.length && tl[0].max && Number(tl[0].max) > 0) {
            await setSlider(page, '.timeline-slider', 0, tl[0].max);
            await page.waitForTimeout(700);
            const endHits = await scanText(page);
            endHits.forEach(h =>
                findings.push({ level: 'WARN', kind: 'text-anomaly-at-end', text: `${h.token} :: ${h.around}` })
            );
        }

        // 4) 参数边界 min / max
        if (!SKIP_PARAMS) {
            const params = await sliderMeta(page, '.param-slider');
            for (let p = 0; p < params.length; p++) {
                const meta = params[p];
                for (const edge of ['min', 'max']) {
                    const v = meta[edge];
                    if (!v && v !== '0' && v !== 0) continue;
                    await setSlider(page, '.param-slider', p, v);
                    await page.waitForTimeout(600);
                    const hits = await scanText(page);
                    hits.forEach(h =>
                        findings.push({
                            level: 'WARN',
                            kind: 'boundary-anomaly',
                            text: `${meta.label || 'param#' + p}=${edge}(${v}) → ${h.token} :: ${h.around}`
                        })
                    );
                }
                await setSlider(page, '.param-slider', p, meta.value);
                await page.waitForTimeout(200);
            }
        }

        const newLogs = logs.slice(before);
        newLogs.forEach(l =>
            findings.push({
                level: STRICT === 'canvas' ? 'WARN' : 'ERROR',
                kind: l.kind,
                text: l.text
            })
        );

        const worst = findings.some(f => f.level === 'ERROR')
            ? 'ERROR'
            : findings.some(f => f.level === 'WARN')
              ? 'WARN'
              : 'OK';
        results.push({ index: i + 1, name, worst, params: (await sliderMeta(page, '.param-slider')).length, findings });
        const tag = worst === 'OK' ? '·' : worst === 'WARN' ? '⚠' : '✗';
        console.log(
            `${tag} [${i + 1}/${list.length}] ${worst.padEnd(5)} ${name}` +
                (findings.length
                    ? ` — ${findings.length} 项 (${[...new Set(findings.map(f => f.kind))].join(',')})`
                    : '')
        );
    }

    current = '';

    // ---- 性能判定 (#80): 暖场趟 + 计量趟 双趟切换前 N 个场景 ----
    // 刻意不触发 RELOAD_EVERY 的整页重载: 重载会清空 JS 堆, 两趟增量就没有可比性。
    // 合法缓存 (场景配置/rig 模块) 在暖场趟建立; 计量趟的增长只可能来自真泄漏。
    // 看门狗纪律: 泄漏构建下页面可能卡死/崩溃, 本段每个 await 都必须有界,
    // 总时长超 PERF_DEADLINE_MS 即提前终止并记为性能 ERROR —— 门禁脚本绝不允许挂死。
    const PERF_DEADLINE_MS = 8 * 60 * 1000;
    const perfDeadline = Date.now() + PERF_DEADLINE_MS;
    const withTimeout = (promise, ms, label) => {
        let timer;
        const timeout = new Promise((_, rej) => {
            timer = setTimeout(() => rej(new Error(`${label} 超时(${ms}ms)`)), ms);
        });
        return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
    };
    const perfSubset = list.slice(0, Math.min(PERF_SCENES, list.length));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const heapMB = async () => {
        try {
            await withTimeout(cdp.send('HeapProfiler.collectGarbage'), 30000, 'CDP GC');
        } catch (e) {
            console.log(`  (GC 未完成: ${e.message} — 采样仍继续, 可能偏高)`);
        }
        const { metrics } = await withTimeout(cdp.send('Performance.getMetrics'), 15000, 'Performance.getMetrics');
        const heap = metrics.find(m => m.name === 'JSHeapUsedSize');
        return heap ? heap.value / 1048576 : NaN;
    };
    const perfVisit = async name => {
        const t0 = Date.now();
        let readyOk = true;
        await withTimeout(
            page.evaluate(() => {
                document.querySelectorAll('details').forEach(d => {
                    d.open = true;
                });
            }),
            15000,
            '展开目录'
        );
        const clicked = await withTimeout(
            page.$$eval(
                '.directory-scene',
                (els, t) => {
                    const el = [...els].find(e => (e.querySelector('span')?.textContent || '').trim() === t);
                    if (el) {
                        el.click();
                        return true;
                    }
                    return false;
                },
                name
            ),
            15000,
            '点击场景'
        );
        if (clicked) {
            try {
                // #81 后 canvas 跨场景常驻, 「canvas 可见」不再随切换变化;
                // 就绪信号 = 目录激活项匹配到目标场景 (store 已切) + 2 个 rAF (React 提交 + 首帧渲染完成)
                await page.waitForFunction(
                    target => {
                        const el = document.querySelector('.directory-scene.active span');
                        return el ? el.textContent.trim() === target : false;
                    },
                    name,
                    { timeout: SWITCH_BUDGET_MS, polling: 100 }
                );
                await page.evaluate(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))));
            } catch {
                readyOk = false; // 计时超限判定会兜住; canvas 缺失在主巡检已按 ERROR 报
            }
        } else {
            readyOk = false;
        }
        const elapsed = Date.now() - t0;
        await page.waitForTimeout(600); // 等自动运行首帧渲染完成, 保证两趟采样点同相位
        return { elapsed, readyOk, clicked };
    };

    let perf = null;
    if (perfSubset.length > 0) {
        inPerfPass = true;
        console.log(`\n--- 性能判定 (#80, 档位 ${PERF_TIER}): ${perfSubset.length} 场景 × 2 趟 ---`);
        const perfProblems = [];
        let aborted = false;
        for (const name of perfSubset) {
            if (Date.now() > perfDeadline) {
                aborted = true;
                break;
            }
            current = name;
            await perfVisit(name).catch(e => perfProblems.push(`暖场趟 ${name}: ${e.message}`));
        }
        let heapBaseline = NaN;
        let heapFinal = NaN;
        const times = [];
        let readyMisses = 0;
        if (!aborted) {
            heapBaseline = await heapMB();
            for (const name of perfSubset) {
                if (Date.now() > perfDeadline) {
                    aborted = true;
                    break;
                }
                current = name;
                try {
                    const { elapsed, readyOk, clicked } = await perfVisit(name);
                    times.push({ name, ms: elapsed });
                    if (!readyOk) readyMisses += 1;
                    if (!clicked) perfProblems.push(`计量趟找不到场景: ${name}`);
                } catch (e) {
                    perfProblems.push(`计量趟 ${name}: ${e.message}`);
                }
            }
            if (!aborted) heapFinal = await heapMB();
        }
        inPerfPass = false;
        const deltaMB = heapFinal - heapBaseline; // NaN 传播 → 下面 ok=false
        const timesSafe = times.length ? times : [{ name: '(未完成)', ms: NaN }];
        const maxTime = Math.max(...timesSafe.map(t => t.ms));
        const heapBreach = Number.isFinite(deltaMB) && deltaMB > HEAP_BUDGET_MB;
        const timeBreaches = times.filter(t => t.ms > SWITCH_BUDGET_MS);
        const perfErrors = [];
        if (heapBreach) {
            perfErrors.push(
                `内存判定命中: 双趟切换 ${perfSubset.length} 场景后 JS 堆增量 ${deltaMB.toFixed(1)} MB > 预算 ${HEAP_BUDGET_MB} MB (疑似泄漏)`
            );
        }
        if (aborted) {
            perfErrors.push(
                `性能双趟看门狗终止 (上限 ${PERF_DEADLINE_MS / 60000} 分钟): 页面疑似卡死/崩溃, 本身即异常信号`
            );
        }
        perf = {
            tier: PERF_TIER,
            scenes: perfSubset.length,
            heap: {
                baselineMB: Number(heapBaseline.toFixed(1)),
                finalMB: Number(heapFinal.toFixed(1)),
                deltaMB: Number(deltaMB.toFixed(1)),
                budgetMB: HEAP_BUDGET_MB,
                ok: !heapBreach && Number.isFinite(deltaMB)
            },
            switchTime: {
                budgetMs: SWITCH_BUDGET_MS,
                maxMs: maxTime,
                readyMisses,
                breached: timeBreaches.map(t => ({ name: t.name, ms: t.ms })),
                ok: timeBreaches.length === 0
            },
            times,
            problems: perfProblems,
            consoleErrorsDuringPass: perfLogs.length
        };
        if (readyMisses > 0) {
            perfErrors.push(`计量趟 ${readyMisses} 个场景切换未在预算内就绪 (激活项未匹配/首帧未完成, 见 perf.times)`);
        }
        perf.errors = perfErrors;
        console.log(
            `内存: 基线 ${heapBaseline.toFixed(1)} MB → 终态 ${heapFinal.toFixed(1)} MB, 增量 ${deltaMB.toFixed(1)} MB / 预算 ${HEAP_BUDGET_MB} MB ${heapBreach ? '✗' : '✓'}`
        );
        console.log(
            `耗时: 单场景最长 ${maxTime} ms / 预算 ${SWITCH_BUDGET_MS} ms, 超限 ${timeBreaches.length} 个${
                timeBreaches.length ? ` (${timeBreaches.map(t => `${t.name} ${t.ms}ms`).join(', ')})` : ''
            }`
        );
        if (perfProblems.length) console.log(`双趟过程问题: ${perfProblems.slice(0, 5).join(' | ')}`);
    }

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(
        OUT,
        JSON.stringify({ base: BASE, at: new Date().toISOString(), strict: STRICT, perf, results }, null, 2)
    );

    const errN = results.filter(r => r.worst === 'ERROR').length;
    const warnN = results.filter(r => r.worst === 'WARN').length;
    // 性能判定: perf.errors 中的条目 (内存命中/看门狗终止/canvas 缺失) 恒为 ERROR;
    // 切换耗时超限 nightly ERROR / pr WARN
    let perfErrN = 0;
    let perfWarnN = 0;
    if (perf) {
        if (perf.errors.length > 0) perfErrN += 1;
        if (perf.switchTime.breached.length > 0) {
            if (PERF_TIER === 'nightly') perfErrN += 1;
            else perfWarnN += 1;
        }
    }
    console.log(
        `\n=== 汇总 === ${results.length} 场景: ERROR ${errN + perfErrN} / WARN ${warnN + perfWarnN} / OK ${
            results.length - errN - warnN
        }` +
            (perf
                ? ` | 性能(${perf.tier}): 堆增量 ${perf.heap.deltaMB} MB, 耗时超限 ${perf.switchTime.breached.length}`
                : '')
    );
    console.log(
        `口径: QA_STRICT=${STRICT}` +
            (STRICT === 'canvas' ? ' (console 报错与错误提示条已降级为 WARN — 仍上报但不拦截)' : '')
    );
    console.log(`报告: ${OUT}`);
    await browser.close();
    process.exit(errN + perfErrN > 0 ? 1 : 0);
})();

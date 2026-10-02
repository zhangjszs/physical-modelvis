/*
 * 全场景 QA 巡检 sweep (Playwright, 只读检查不改代码)
 *
 * 用途: 逐个遍历教材目录里的全部场景, 自动采集人工点查时容易漏掉的异常:
 *   1. console error / pageerror (含切场景与播放过程)
 *   2. 可见文本里的 NaN / Infinity / undefined (数据泄漏到 UI)
 *   3. 2D 画布空白 (整块像素同色) 与 canvas 数为 0 (舞台根本没挂载)
 *   4. 文本溢出裁切 (scrollWidth > clientWidth)
 *   5. 播放链路: 播放后时间是否推进
 *   6. 参数边界: 每个 .param-slider 拉到 min / max 后是否出现异常值或报错
 *   7. 时间轴拖到末尾后的状态
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
 *
 * 退出码: 0 = 无 ERROR 级问题; 1 = 存在 ERROR (console/pageerror/场景未找到)
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

/** 每跑 N 个场景重载一次页面, 规避浏览器 WebGL 上下文数量上限造成的假红 */
const RELOAD_EVERY = 20;

const ANOMALY_RE = /\bNaN\b|\bInfinity\b|\bundefined\b/;

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
    page.on('pageerror', e => logs.push({ scene: current, level: 'ERROR', kind: 'pageerror', text: e.message }));
    page.on('console', m => {
        if (m.type() === 'error')
            logs.push({ scene: current, level: 'ERROR', kind: 'console', text: m.text().slice(0, 300) });
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
        newLogs.forEach(l => findings.push({ level: 'ERROR', kind: l.kind, text: l.text }));

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
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));

    const errN = results.filter(r => r.worst === 'ERROR').length;
    const warnN = results.filter(r => r.worst === 'WARN').length;
    console.log(
        `\n=== 汇总 === ${results.length} 场景: ERROR ${errN} / WARN ${warnN} / OK ${results.length - errN - warnN}`
    );
    console.log(`报告: ${OUT}`);
    await browser.close();
    process.exit(errN > 0 ? 1 : 0);
})();

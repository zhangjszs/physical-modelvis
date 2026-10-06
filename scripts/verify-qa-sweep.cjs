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
 *  11. 数据抽屉覆盖 (#89): 每场景打开「数据/图像」懒加载抽屉 → 断言 0 console error /
 *      无 ErrorBoundary 粘滞 (图表加载失败等兜底文案) → 关闭。修 #78 类盲区:
 *      抽屉不打开, 里面的 hooks 崩溃与 ErrorBoundary 粘滞在全场景判定下全绿通过
 *  12. 交互后一致性 (#89, 抽样): 代表性子集上验证「改参数 → 诊断读数随动」与
 *      「拖时间轴 → 时间读数随动」, 覆盖 #87/#88 类「改完不重算/滞后一步」缺陷。
 *      抽样而非全场景, 控制 nightly 时长增幅
 *  13. OCR 面板 (#75): 顶栏「拍照解题」入口存在 → 打开面板 → 关闭 → 零 console error。
 *      与 scripts/verify-ocr-mount.cjs 同口径 (3001 后端未启动的网络错误属预期噪音);
 *      全局跑一次 (不随场景循环), QA_SKIP_OCR=1 跳过
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
 *   QA_STRICT         失败口径: 默认 error = 任何 ERROR(console/pageerror/no-canvas/error-banner/找不到场景/
 *                     抽屉 ErrorBoundary 粘滞/交互读数不随动)均退出 1;
 *                     canvas = 只对「舞台没渲染」类失败 (no-canvas / scene-not-clickable) 退出 1,
 *                     console 报错/错误提示条/抽屉与交互判定降级为 WARN 仍上报 —— 给 PR 门禁用,
 *                     不被已知存量问题（或目录顺序变动/CI 机器交互计时噪声）卡死正常 PR
 *   QA_PERF_TIER      性能判定档位: pr (默认, 宽预算, 耗时超限只 WARN) |
 *                     nightly (严预算, 内存/耗时超限都 ERROR)
 *   QA_HEAP_BUDGET_MB 覆盖内存增量预算 (默认按档位: nightly 12 / pr 24)
 *   QA_SWITCH_BUDGET_MS 覆盖单场景切换耗时预算 (默认按档位: nightly 10000 / pr 25000)
 *   QA_SKIP_DRAWER    1 = 跳过抽屉覆盖判定 (#89, 最快调试用)
 *   QA_SKIP_OCR       1 = 跳过 OCR 面板判定 (#75, 调试用)
 *   QA_INTERACT_EVERY 交互后一致性抽粒度 (#89): 每 N 个场景抽 1 个做深度交互断言,
 *                     默认 10; 0 = 关闭交互断言 (抽屉覆盖仍执行)
 *   QA_INTERACT_ONLY  只对名字含该子串的场景做交互断言 (调试用, 覆盖 EVERY 抽样)
 *   QA_INJECT_PERF_NAN 1 = 自检钩子 (#90): 让 heapMB 返回 NaN 模拟采样失败,
 *                     验证门禁对采样异常拒绝放行 (应 exit 1); 默认不启用
 *
 * 退出码: 0 = 无 ERROR 级问题; 1 = 存在 ERROR (console/pageerror/场景未找到/性能内存超限/
 *         性能采样异常(堆/耗时 NaN)/抽屉 ErrorBoundary 粘滞或抽屉内 console 错误/
 *         OCR 面板打不开/关不上/OCR 段 console 错误/
 *         交互读数不随动, nightly 下含切换耗时超限)
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

// ---- 数据抽屉覆盖 + 交互后一致性 (#89) ----
const SKIP_DRAWER = process.env.QA_SKIP_DRAWER === '1';
/** 交互断言抽样粒度: 每 N 个场景抽 1 个; 0 = 只做抽屉覆盖, 不做交互断言 */
const INTERACT_EVERY = Number(process.env.QA_INTERACT_EVERY || '10');
const INTERACT_ONLY = process.env.QA_INTERACT_ONLY || '';
/** 抽屉内 ErrorBoundary 兜底文案 (DataDrawer 三处 ErrorBoundary 的 fallback) */
const DRAWER_FALLBACK_RE = /图表加载失败|加载失败/;

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
        { sel: selector, idx: index, val: value }
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

// ---- #89: 抽屉开关 / 诊断读数 / 时间读数 的浏览器侧辅助 ----

/** OCR 面板 (#75): 后端未启动时的健康探测网络错误属预期噪音 (与 verify-ocr-mount.cjs 同口径) */
const OCR_NOISE_RE =
    /favicon|the server responded with a status of 404|localhost:3001|api\/ocr\/health|ERR_CONNECTION_REFUSED/i;
const SKIP_OCR = process.env.QA_SKIP_OCR === '1';

/** 「数据/图像」抽屉开关 (WorkbenchScene 顶栏按钮, 展开后文案变为「收起数据」) */
async function drawerToggleIndex(page) {
    return page.evaluate(() => {
        const btns = [...document.querySelectorAll('.btn-secondary')];
        const idx = btns.findIndex(b => (b.textContent || '').includes('数据/图像'));
        return idx;
    });
}

/**
 * 打开抽屉并等待懒加载 chunk 就绪。
 * 返回 'opened' (抽屉可见) | 'not-visible' (按钮点在但抽屉没展开) | 'no-button' (找不到开关)
 */
async function openDrawer(page) {
    const idx = await drawerToggleIndex(page);
    if (idx < 0) return 'no-button';
    await page.evaluate(i => {
        const btns = [...document.querySelectorAll('.btn-secondary')];
        btns[i]?.click();
    }, idx);
    try {
        await page.waitForSelector('.classroom-data-drawer .graph-panel, .classroom-data-drawer .empty-state', {
            timeout: 4000
        });
    } catch {
        // 兜底文案出现时没有上述节点 — scanDrawerFallbacks 会报; 这里不额外判错
    }
    await page.waitForTimeout(400);
    const visible = await page.evaluate(() => !!document.querySelector('.classroom-data-drawer-wrapper'));
    return visible ? 'opened' : 'not-visible';
}

/** 关闭抽屉 (抽屉头部的「✕ 收起」按钮) */
async function closeDrawer(page) {
    await page.evaluate(() => {
        const btn = document.querySelector('.classroom-data-drawer-wrapper [aria-label="收起数据抽屉"]');
        btn?.click();
    });
}

/** 扫描抽屉内可见的 ErrorBoundary 兜底文案 —— #78 崩溃的粘滞签名 */
async function scanDrawerFallbacks(page) {
    return page.evaluate(reSource => {
        const re = new RegExp(reSource);
        const out = [];
        const nodes = document.querySelectorAll('.classroom-data-drawer *');
        for (const el of nodes) {
            if (!el.offsetParent || el.children.length > 0) continue;
            const txt = (el.textContent || '').trim();
            if (txt && re.test(txt)) out.push(txt.slice(0, 60));
            if (out.length >= 3) break;
        }
        return out;
    }, DRAWER_FALLBACK_RE.source);
}

/** 诊断读数快照 (排除「计算耗时」—— 它随每次运行抖动, 不构成参数随动证据) */
async function readDiagValues(page) {
    return page.evaluate(() => {
        const items = [...document.querySelectorAll('.classroom-data-drawer .diag-item')];
        return items
            .map(it => ({
                label: (it.querySelector('.diag-label')?.textContent || '').trim(),
                value: (it.querySelector('.diag-value')?.textContent || '').trim()
            }))
            .filter(d => d.label && d.label !== '计算耗时')
            .map(d => `${d.label}=${d.value}`)
            .join(' | ');
    });
}

/**
 * 交互后一致性判定 A (#89): 改参数 → 诊断读数随动 (往返语义)。
 * 对前 3 个参数依次尝试「对侧边界 + 中值」两个目标:
 *   ① 目标值下读数相对变更前必须变化 (完全不响应 = 不重算/卡死);
 *   ② 还原后读数必须回到原值 (回不去 = 滞后一步: 本次结果对应上一个参数态,
 *      #88 的 DOM 签名)。
 * 任一参数/目标组合同时满足 ①② 即通过; 3 个参数 6 个组合全部无响应 → fail。
 * 为什么需要多候选: 离散参数存在别名值 (如电梯 mode 0=向上加速/3=向下减速
 * 加速度相同, 读数 legit 一致), 首个参数的单一目标值不能证明「无响应」。
 * 轮询等待重算落定 (3D 场景 rig 重建可能慢)。
 */
async function checkParamFollowsDiag(page) {
    const params = await sliderMeta(page, '.param-slider');
    if (params.length === 0) return { verdict: 'skip', reason: '无参数滑块' };
    const base = await readDiagValues(page);
    if (!base) return { verdict: 'skip', reason: '无诊断读数 (仿真未运行或无统计量)' };
    const candidates = params.slice(0, 3);
    const attempts = [];
    for (const meta of candidates) {
        const lo = Number(meta.min);
        const hi = Number(meta.max);
        const cur = Number(meta.value);
        const targets = [];
        if (Number.isFinite(lo) && Number.isFinite(hi) && hi > lo) {
            targets.push(cur <= (lo + hi) / 2 ? hi : lo);
            targets.push((lo + hi) / 2);
        }
        for (const target of targets) {
            if (String(target) === String(meta.value)) continue;
            attempts.push({ meta, target });
        }
    }
    for (const { meta, target } of attempts) {
        const before = await readDiagValues(page);
        if (!before) return { verdict: 'skip', reason: '读数中途消失' };
        await setSlider(page, '.param-slider', params.indexOf(meta), target);
        let after = before;
        for (let w = 0; w < 4 && after === before; w++) {
            await page.waitForTimeout(500);
            after = await readDiagValues(page);
        }
        if (after !== before) {
            // ② 还原 → 读数必须归位
            await setSlider(page, '.param-slider', params.indexOf(meta), meta.value);
            let restored = after;
            for (let w = 0; w < 4 && restored !== before; w++) {
                await page.waitForTimeout(500);
                restored = await readDiagValues(page);
            }
            if (restored !== before) {
                return {
                    verdict: 'fail',
                    reason: `参数「${meta.label || '#' + params.indexOf(meta)}」还原后读数未归位 (滞后一步签名; 当前: ${restored.slice(0, 80)})`
                };
            }
            return { verdict: 'pass', reason: `参数「${meta.label}」→ 读数随动且还原归位` };
        }
        // 无响应: 还原后重取基线再试下一组合 (还原可能触发重算, 基线必须现取)
        await setSlider(page, '.param-slider', params.indexOf(meta), meta.value);
        await page.waitForTimeout(400);
    }
    return {
        verdict: 'fail',
        reason: `前 ${candidates.length} 个参数的边界/中值组合均未改变诊断读数 (不重算/卡死签名; 基线: ${base.slice(0, 80)})`
    };
}

/**
 * 交互后一致性判定 B (#89): 拖时间轴 → 时间读数随动。
 * 受控 input 下「store 卡住」会让滑块与读数一起不变, 因此同时校验:
 * ① 拖拽后滑块值确实离开原位; ② 时间读数与滑块实际位置一致 (容忍 step 吸附)。
 * tSemantics ≠ 真实时间的场景 (#86 设计文档: 48 个 totalDuration=0 的
 * 单点占位/参数扫描场景, 时间轴滑块是扫描轴或无意义) 直接 SKIP ——
 * 判据按现状分层, sweeps 通道上线 (#86 实施单) 后随批次收紧。
 */
async function checkTimelineFollowsTime(page) {
    const tl = await sliderMeta(page, '.timeline-slider');
    if (!tl.length || !tl[0].max || Number(tl[0].max) <= 0) {
        return { verdict: 'skip', reason: '无有效时间轴' };
    }
    const totalDuration = await page.evaluate(() => {
        const labels = document.querySelectorAll('.time-label');
        // 第二个 .time-label 是 totalDuration (PlaybackControls 渲染 currentTime + totalDuration)
        return labels.length >= 2 ? Number.parseFloat(labels[1].textContent) : NaN;
    });
    if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
        return { verdict: 'skip', reason: `无真实时间轴 (totalDuration=${totalDuration}, tSemantics≠时间)` };
    }
    const beforeSlider = Number(tl[0].value);
    const target = beforeSlider < Number(tl[0].max) / 2 ? Number(tl[0].max) : 0;
    await setSlider(page, '.timeline-slider', 0, target);
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => ({
        slider: Number(document.querySelector('.timeline-slider')?.value),
        label: Number.parseFloat(document.querySelector('.time-label')?.textContent)
    }));
    // 复位到 0, 避免影响后续播放链路判定 (播放从 t0 推进到 t1)
    await setSlider(page, '.timeline-slider', 0, 0);
    await page.waitForTimeout(300);
    const moved = Math.abs(state.slider - beforeSlider) > 1e-6;
    const consistent =
        moved &&
        Number.isFinite(state.label) &&
        Math.abs(state.label - state.slider) <= Math.max(0.05, Math.abs(state.slider - target) + 0.02);
    if (!moved) return { verdict: 'fail', reason: `时间轴拖到 ${target} 后滑块值未动 (卡在 ${state.slider})` };
    if (!consistent) {
        return { verdict: 'fail', reason: `时间轴在 ${state.slider} 但读数显示 ${state.label}` };
    }
    return { verdict: 'pass', reason: `时间轴 → 读数随动 (${state.slider})` };
}

// ---- #90: 共享页面操作 (消除 perfVisit 与主循环的逐字复制) ----

/** 展开教材目录里全部 <details> 折叠分区 */
async function expandDetails(page) {
    await page.evaluate(() => {
        document.querySelectorAll('details').forEach(d => {
            d.open = true;
        });
    });
}

/** 点击目录里名字精确匹配的场景项; 返回是否点中 */
async function clickScene(page, name) {
    return page.$$eval(
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
    await expandDetails(page);

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
            await expandDetails(page);
        }

        const clicked = await clickScene(page, name);
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

        // 5) 数据抽屉覆盖 (#89): 打开「数据/图像」懒加载抽屉 → 断言 0 console error /
        //    无 ErrorBoundary 粘滞 (兜底文案) → 关闭。修 #78 盲区: 不打开抽屉,
        //    里面的崩溃与粘滞在全场景判定下全绿通过
        const drawerInfo = { opened: false, skipped: SKIP_DRAWER };
        let drawerLogsN = 0;
        if (!SKIP_DRAWER) {
            const drawerBefore = logs.length;
            const drawerState = await openDrawer(page);
            drawerInfo.opened = drawerState === 'opened';
            if (drawerState === 'no-button') {
                findings.push({
                    level: 'WARN',
                    kind: 'drawer-not-openable',
                    text: '找不到「数据/图像」抽屉开关'
                });
            } else if (drawerState === 'not-visible') {
                findings.push({
                    level: 'WARN',
                    kind: 'drawer-not-openable',
                    text: '点击开关后抽屉未展开 (覆盖判定降级)'
                });
            } else {
                await page.waitForTimeout(600); // 等懒加载 chunk 首帧图表渲染
                const fallbacks = await scanDrawerFallbacks(page);
                fallbacks.forEach(t =>
                    findings.push({
                        level: STRICT === 'canvas' ? 'WARN' : 'ERROR',
                        kind: 'drawer-errorboundary',
                        text: `ErrorBoundary 粘滞: ${t}`
                    })
                );
                // 抽屉段产生的 console/pageerror 以独立 kind 归入本段 (最终汇总时跳过, 避免重复上报)
                drawerLogsN = logs.length - drawerBefore;
                logs.slice(drawerBefore).forEach(l =>
                    findings.push({
                        level: STRICT === 'canvas' ? 'WARN' : 'ERROR',
                        kind: l.kind === 'pageerror' ? 'drawer-pageerror' : 'drawer-console',
                        text: l.text
                    })
                );

                // 交互后一致性 (#89, 抽样): 只对代表性子集做深度断言, 控制 nightly 时长
                const sampled =
                    INTERACT_EVERY > 0 &&
                    (i + 1) % INTERACT_EVERY === 0 &&
                    (!INTERACT_ONLY || name.includes(INTERACT_ONLY));
                drawerInfo.interaction = { sampled };
                if (sampled) {
                    const paramRes = await checkParamFollowsDiag(page);
                    drawerInfo.interaction.paramFollowsDiag = paramRes;
                    if (paramRes.verdict === 'fail') {
                        findings.push({
                            level: STRICT === 'canvas' ? 'WARN' : 'ERROR',
                            kind: 'param-diag-not-following',
                            text: `${paramRes.reason}`
                        });
                    }
                    const timeRes = await checkTimelineFollowsTime(page);
                    drawerInfo.interaction.timelineFollowsTime = timeRes;
                    if (timeRes.verdict === 'fail') {
                        findings.push({
                            level: STRICT === 'canvas' ? 'WARN' : 'ERROR',
                            kind: 'timeline-time-not-following',
                            text: `${timeRes.reason}`
                        });
                    }
                }
                await closeDrawer(page);
                await page.waitForTimeout(300);
            }
        }

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

        // 抽屉段日志已按 drawer-* kind 单列, 这里跳过避免重复上报
        const newLogs = logs.slice(before + drawerLogsN);
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
        results.push({
            index: i + 1,
            name,
            worst,
            params: (await sliderMeta(page, '.param-slider')).length,
            drawer: drawerInfo,
            findings
        });
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
        // 自检钩子 (#90): 模拟采样失败, 验证门禁对 NaN 拒绝放行 (红向验证用, 默认不启用)
        if (process.env.QA_INJECT_PERF_NAN === '1') return NaN;
        try {
            await withTimeout(cdp.send('HeapProfiler.collectGarbage'), 30000, 'CDP GC');
        } catch (e) {
            console.log(`  (GC 未完成: ${e.message} — 采样仍继续, 可能偏高)`);
        }
        try {
            const { metrics } = await withTimeout(cdp.send('Performance.getMetrics'), 15000, 'Performance.getMetrics');
            const heap = metrics.find(m => m.name === 'JSHeapUsedSize');
            return heap ? heap.value / 1048576 : NaN;
        } catch (e) {
            // 采样失败必须变成「可判定的 NaN」而不是抛出: 抛出会让整个脚本非正常崩溃,
            // 返回 NaN 则由下方 perfErrors 统一记「性能采样异常」并 exit 1
            console.log(`  (getMetrics 失败: ${e.message} — 记为采样异常, 门禁将拒绝放行)`);
            return NaN;
        }
    };
    const perfVisit = async name => {
        const t0 = Date.now();
        let readyOk = true;
        await withTimeout(expandDetails(page), 15000, '展开目录');
        const clicked = await withTimeout(clickScene(page, name), 15000, '点击场景');
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
        // #90: 采样异常 (NaN) 必须显式变成 perfErrors —— 此前 deltaMB 为 NaN 时
        // heapBreach/timeBreaches 双双为 false, 既不加 perfErrors 也不改退出码,
        // 内存判定在最需要报警的采样失败场景反而静默放行 (exit 0)
        const deltaMB = heapFinal - heapBaseline;
        const heapSampleOk = Number.isFinite(heapBaseline) && Number.isFinite(heapFinal) && Number.isFinite(deltaMB);
        const timeSampleOk = times.length > 0 && times.every(t => Number.isFinite(t.ms));
        const timesSafe = times.length ? times : [{ name: '(未完成)', ms: NaN }];
        const maxTime = Math.max(...timesSafe.map(t => t.ms));
        const heapBreach = heapSampleOk && deltaMB > HEAP_BUDGET_MB;
        const timeBreaches = timeSampleOk ? times.filter(t => t.ms > SWITCH_BUDGET_MS) : [];
        const perfErrors = [];
        if (heapBreach) {
            perfErrors.push(
                `内存判定命中: 双趟切换 ${perfSubset.length} 场景后 JS 堆增量 ${deltaMB.toFixed(1)} MB > 预算 ${HEAP_BUDGET_MB} MB (疑似泄漏)`
            );
        }
        if (!heapSampleOk) {
            perfErrors.push(
                `性能采样异常: 双趟 JS 堆采样失败 (基线=${heapBaseline}, 终态=${heapFinal}) — Performance.getMetrics 缺 JSHeapUsedSize 或超时, 内存判定不可信, 拒绝放行`
            );
        }
        if (!timeSampleOk) {
            const nNaN = times.filter(t => !Number.isFinite(t.ms)).length;
            perfErrors.push(
                `性能采样异常: 切换耗时应有 ${perfSubset.length} 个有限值, 实得 ${times.length} 个 (${nNaN} 个非有限), 拒绝放行`
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
                ok: !heapBreach && heapSampleOk
            },
            switchTime: {
                budgetMs: SWITCH_BUDGET_MS,
                maxMs: maxTime,
                readyMisses,
                breached: timeBreaches.map(t => ({ name: t.name, ms: t.ms })),
                ok: timeSampleOk && timeBreaches.length === 0
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
            `内存: 基线 ${heapBaseline.toFixed(1)} MB → 终态 ${heapFinal.toFixed(1)} MB, 增量 ${deltaMB.toFixed(1)} MB / 预算 ${HEAP_BUDGET_MB} MB ${
                heapBreach ? '✗' : heapSampleOk ? '✓' : '✗(采样异常)'
            }`
        );
        console.log(
            `耗时: 单场景最长 ${maxTime} ms / 预算 ${SWITCH_BUDGET_MS} ms, 超限 ${timeBreaches.length} 个${
                timeBreaches.length ? ` (${timeBreaches.map(t => `${t.name} ${t.ms}ms`).join(', ')})` : ''
            }${timeSampleOk ? '' : ' ✗(采样异常)'}`
        );
        if (perfProblems.length) console.log(`双趟过程问题: ${perfProblems.slice(0, 5).join(' | ')}`);
    }

    // ---- OCR 面板判定 (#75): 入口存在 → 打开 → 关闭 → 零 console error ----
    // 全局跑一次 (面板挂在顶栏, 不随场景循环); 3001 后端未启动的健康探测网络错误属预期噪音。
    // 每个有界等待 5s/1.2s, 与主巡检同纪律: 门禁脚本绝不允许挂死。
    let ocr = null;
    const ocrFindings = [];
    if (!SKIP_OCR) {
        current = '(ocr-panel)';
        const ocrBefore = logs.length;
        let overlayAppeared = false;
        let titleOk = false;
        let healthShown = false;
        let closed = false;
        const buttonIdx = await page.evaluate(() => {
            const btns = [...document.querySelectorAll('.top-bar-right button')];
            return btns.findIndex(b => (b.textContent || '').includes('拍照解题'));
        });
        if (buttonIdx < 0) {
            ocrFindings.push({ level: 'ERROR', kind: 'ocr-panel', text: '顶栏缺少「拍照解题」入口按钮' });
        } else {
            await page.evaluate(i => {
                const btns = [...document.querySelectorAll('.top-bar-right button')];
                btns[i]?.click();
            }, buttonIdx);
            try {
                await page.waitForSelector('.ocr-overlay', { timeout: 5000 });
                overlayAppeared = true;
            } catch {
                overlayAppeared = false;
            }
            if (!overlayAppeared) {
                ocrFindings.push({
                    level: 'ERROR',
                    kind: 'ocr-panel',
                    text: '点击入口后 .ocr-overlay 未出现 (面板打不开)'
                });
            } else {
                try {
                    const modalText = await page.textContent('.ocr-modal');
                    titleOk = (modalText || '').includes('AI 拍照解题');
                    healthShown = /(已连接|未连接|检测中)/.test(modalText || '');
                    if (!titleOk) {
                        ocrFindings.push({
                            level: 'ERROR',
                            kind: 'ocr-panel',
                            text: '面板已打开但缺少标题「AI 拍照解题」'
                        });
                    }
                    await page.$eval('.ocr-close', el => el.click());
                    await page.waitForTimeout(300);
                    closed = (await page.$('.ocr-overlay')) === null;
                    if (!closed) {
                        ocrFindings.push({
                            level: 'ERROR',
                            kind: 'ocr-panel',
                            text: '点击关闭钮后 .ocr-overlay 未消失 (面板关不上)'
                        });
                    }
                } catch (e) {
                    // 面板崩溃 (React 卸载整树等) → 结构化 ERROR 而非脚本带病死亡 (门禁不允许挂死)
                    ocrFindings.push({ level: 'ERROR', kind: 'ocr-panel', text: `OCR 面板操作异常: ${e.message}` });
                }
            }
            // 本段 console/pageerror — 打不开与打开成功两支都要归集, 滤掉 3001 未启动等预期噪音
            logs.slice(ocrBefore).forEach(l => {
                if (!OCR_NOISE_RE.test(l.text)) {
                    ocrFindings.push({
                        level: STRICT === 'canvas' ? 'WARN' : 'ERROR',
                        kind: l.kind === 'pageerror' ? 'ocr-pageerror' : 'ocr-console',
                        text: l.text
                    });
                }
            });
            ocr = { opened: titleOk && overlayAppeared, healthShown, closed, errorCount: ocrFindings.length };
        }
        // 汇总口径行 (ERROR/WARN 由下方统一计数; 入口缺失与点击后打不开是两种失败, ocr 状态区分)
        console.log(
            `OCR 面板 (#75): ${
                SKIP_OCR
                    ? '已跳过 (QA_SKIP_OCR=1)'
                    : ocr
                      ? `打开 ${ocr.opened ? '✓' : '✗'} / 关闭 ${ocr.closed ? '✓' : '✗'} / 后端状态${ocr.healthShown ? '可见' : '未显示'}`
                      : '入口按钮缺失'
            } — 问题 ${ocrFindings.length} 项`
        );
    }
    current = '';

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(
        OUT,
        JSON.stringify(
            {
                base: BASE,
                at: new Date().toISOString(),
                strict: STRICT,
                perf,
                // #75: checked=false = QA_SKIP_OCR 跳过; state 段缺省 = 入口缺失/未打开; findings 含结构性与 console 错误明细
                ocr: { checked: !SKIP_OCR, ...(ocr ?? {}), findings: ocrFindings },
                results
            },
            null,
            2
        )
    );

    const errN = results.filter(r => r.worst === 'ERROR').length;
    const warnN = results.filter(r => r.worst === 'WARN').length;
    // OCR 面板判定 (#75): 结构性失败/段内 console 错误恒为 ERROR; STRICT=canvas 时降级 WARN
    const ocrErrN = STRICT === 'canvas' ? 0 : ocrFindings.filter(f => f.level === 'ERROR').length;
    const ocrWarnN = ocrFindings.filter(f => f.level === 'WARN').length;
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
        `\n=== 汇总 === ${results.length} 场景: ERROR ${errN + perfErrN + ocrErrN} / WARN ${warnN + perfWarnN + ocrWarnN} / OK ${
            results.length - errN - warnN
        }` +
            (perf
                ? ` | 性能(${perf.tier}): 堆增量 ${perf.heap.deltaMB} MB, 耗时超限 ${perf.switchTime.breached.length}`
                : '')
    );
    // #89: 抽屉覆盖与交互后一致性汇总
    const drawerOpened = results.filter(r => r.drawer && r.drawer.opened).length;
    const drawerSticky = results.filter(r => r.findings.some(f => f.kind === 'drawer-errorboundary')).length;
    const drawerConsole = results.filter(r =>
        r.findings.some(f => f.kind === 'drawer-console' || f.kind === 'drawer-pageerror')
    ).length;
    const drawerNotOpenable = results.filter(r => r.findings.some(f => f.kind === 'drawer-not-openable')).length;
    const interactSampled = results.filter(r => r.drawer?.interaction?.sampled).length;
    const paramFails = results.filter(r => r.findings.some(f => f.kind === 'param-diag-not-following'));
    const timeFails = results.filter(r => r.findings.some(f => f.kind === 'timeline-time-not-following'));
    console.log(
        `抽屉覆盖 (#89): ${drawerOpened}/${results.length} 场景打开, ErrorBoundary 粘滞 ${drawerSticky}, ` +
            `抽屉内 console 错误 ${drawerConsole}, 开关缺失 ${drawerNotOpenable}`
    );
    console.log(
        `交互一致性 (#89, 抽样): ${interactSampled} 场景, 参数→读数不随动 ${paramFails.length}` +
            `${paramFails.length ? ` (${paramFails.map(r => r.name).join(', ')})` : ''}` +
            `, 时间轴→读数不随动 ${timeFails.length}` +
            `${timeFails.length ? ` (${timeFails.map(r => r.name).join(', ')})` : ''}`
    );
    console.log(
        `口径: QA_STRICT=${STRICT}` +
            (STRICT === 'canvas' ? ' (console 报错与错误提示条已降级为 WARN — 仍上报但不拦截)' : '')
    );
    console.log(`报告: ${OUT}`);
    await browser.close();
    process.exit(errN + perfErrN + ocrErrN > 0 ? 1 : 0);
})();

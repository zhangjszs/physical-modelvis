/* eslint-disable */
/*
 * ============================================================================
 *  PhysVis 3D 场景切换实测脚本（浏览器注入版）
 * ============================================================================
 *
 *  用途：
 *    自动遍历全部 123 个场景，触发场景切换 + rig 异步加载，捕获控制台
 *    错误/警告，验证上一轮修复（弃用 API、场景切换崩溃、try-catch 防御）
 *    是否真正生效。覆盖 3D_RENDERING_FIXES_SUMMARY.md 第 6.3 节清单。
 *
 *  运行方式（零依赖）：
 *    1. 启动开发服务器： cd visualization && npm run dev
 *    2. 浏览器打开 http://localhost:3000/
 *    3. 按 F12 打开 DevTools → Console 标签页
 *    4. 复制本文件全部内容，粘贴到 Console，回车运行
 *    5. 等待脚本跑完（约 4-6 分钟），查看汇总表格
 *
 *  输出说明：
 *    - 进度行：[12/123] 场景名 (3D|2D) ...
 *    - 汇总表：每个场景一行，含类型/Canvas/错误数/崩溃标记
 *    - 详情：有问题的场景会打印完整错误信息
 *    - 结果挂载到 window.__3D_VERIFY_RESULT 便于事后排查
 *
 *  重点检测项：
 *    [CRASH]   — ErrorBoundary 触发（场景切换崩溃，上一轮修复的核心 bug）
 *    [DEPREC]  — Three.js 弃用警告（如 PCFSoftShadowMap 残留）
 *    [ERROR]   — 其他运行时错误
 * ============================================================================
 */

(async () => {
    'use strict';

    // —— 配置 ——
    const CFG = {
        sceneOpenDelay: 180, // 展开分类后等待 dropdown 渲染 (ms)
        settleDelay2D: 900, // 2D 场景渲染等待
        settleDelay3D: 3000, // 3D 场景 rig 加载 + 首帧动画等待
        canvasPollTimeout: 5000, // canvas 出现最大等待
        canvasPollInterval: 200,
        errorKeyMaxLen: 220, // 错误摘要截断长度
    };

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const log = (...a) => console.log('%c[3D-VERIFY]', 'color:#6366f1;font-weight:bold', ...a);
    const warn = (...a) => console.log('%c[3D-VERIFY]', 'color:#f59e0b;font-weight:bold', ...a);

    // —— 旁路收集 console / 全局异常（不破坏原行为）——
    const buffer = [];
    const _err = console.error.bind(console);
    const _warn = console.warn.bind(console);
    console.error = (...a) => {
        buffer.push({ kind: 'error', msg: a.map(x => (x instanceof Error ? x.message : String(x))).join(' ') });
        _err(...a);
    };
    console.warn = (...a) => {
        buffer.push({ kind: 'warn', msg: a.map(x => (x instanceof Error ? x.message : String(x))).join(' ') });
        _warn(...a);
    };
    window.addEventListener('error', e => buffer.push({ kind: 'pageerror', msg: e.message + (e.error ? '\n' + e.error.stack : '') }));
    window.addEventListener('unhandledrejection', e =>
        buffer.push({ kind: 'promise', msg: 'UnhandledRejection: ' + (e.reason?.message ?? String(e.reason)) })
    );

    const takeBuffer = () => {
        const snap = buffer.slice();
        buffer.length = 0;
        return snap;
    };

    // —— 场景发现：遍历 6 个分类，收集 {category, name} ——
    log('阶段 1/2：发现场景…');
    const scenes = [];
    const catBtns = [...document.querySelectorAll('.scene-cat-btn')];
    for (const catBtn of catBtns) {
        catBtn.click();
        await sleep(CFG.sceneOpenDelay);
        const items = [...document.querySelectorAll('.scene-dropdown-item')];
        const catLabel = catBtn.textContent.replace(/[▴▾]/g, '').trim();
        for (const it of items) scenes.push({ category: catLabel, name: it.textContent.trim() });
        catBtn.click(); // 收起
        await sleep(60);
    }
    log(`发现 ${scenes.length} 个场景，开始逐一验证…\n`);

    // —— 切换到指定场景 ——
    async function switchTo(category, name) {
        const catBtn = [...document.querySelectorAll('.scene-cat-btn')].find(b =>
            b.textContent.replace(/[▴▾]/g, '').trim() === category
        );
        if (!catBtn) throw new Error('分类按钮未找到: ' + category);
        catBtn.click();
        await sleep(CFG.sceneOpenDelay);
        const item = [...document.querySelectorAll('.scene-dropdown-item')].find(b => b.textContent.trim() === name);
        if (!item) throw new Error('场景按钮未找到: ' + name);
        item.click();
    }

    // —— 检测 3D canvas（WebGL context）——
    function findWebGLCanvas() {
        for (const c of document.querySelectorAll('canvas')) {
            const r = c.getBoundingClientRect();
            if (r.width < 10 || r.height < 10) continue;
            // 一个 canvas 只能持有一种 context；尝试 webgl 即可区分 2D/3D
            const gl = c.getContext('webgl2') || c.getContext('webgl');
            if (gl) return c;
        }
        return null;
    }

    async function waitForCanvas() {
        const t0 = Date.now();
        while (Date.now() - t0 < CFG.canvasPollTimeout) {
            if (document.querySelector('canvas')) return document.querySelector('canvas');
            await sleep(CFG.canvasPollInterval);
        }
        return null;
    }

    // —— 错误分类 ——
    function classify(errs) {
        const crash = errs.filter(e => /\[ErrorBoundary/.test(e.msg));
        const deprec = errs.filter(e => /deprecat/i.test(e.msg));
        const others = errs.filter(e => !/\[ErrorBoundary/.test(e.msg) && !/deprecat/i.test(e.msg));
        return { crash, deprec, others };
    }

    function truncate(s) {
        const one = s.replace(/\s+/g, ' ').trim();
        return one.length > CFG.errorKeyMaxLen ? one.slice(0, CFG.errorKeyMaxLen) + '…' : one;
    }

    // —— 阶段 2：逐场景验证 ——
    const results = [];
    let prevWas3D = false; // 用于检测"3D→3D 连续切换"路径（上一轮 bug 的触发条件）

    for (let i = 0; i < scenes.length; i++) {
        const { category, name } = scenes[i];
        const tag = `[${i + 1}/${scenes.length}]`;
        takeBuffer(); // 清空前一场景残留

        let status = 'OK';
        let is3D = false;
        let canvasOk = false;
        let sample = '';
        let crashCount = 0;
        let deprecCount = 0;
        let otherErrCount = 0;

        try {
            await switchTo(category, name);
            await waitForCanvas();
            const gl = findWebGLCanvas();
            is3D = !!gl;
            canvasOk = !!document.querySelector('canvas');

            // 等待 rig 加载 + 动画循环跑几帧（3D 场景的 getVisualPosition 会被调用）
            await sleep(is3D ? CFG.settleDelay3D : CFG.settleDelay2D);

            const errs = takeBuffer();
            const c = classify(errs);
            crashCount = c.crash.length;
            deprecCount = c.deprec.length;
            otherErrCount = c.others.length;

            if (crashCount > 0) {
                status = 'CRASH';
                sample = truncate(c.crash[0].msg);
            } else if (deprecCount > 0) {
                status = 'DEPREC';
                sample = truncate(c.deprec[0].msg);
            } else if (otherErrCount > 0) {
                status = 'ERROR';
                sample = truncate(c.others[0].msg);
            } else if (!canvasOk) {
                status = 'NO_CANVAS';
                sample = 'canvas 未出现';
            }

            // 3D→3D 连续切换标记（上一轮崩溃 bug 的高发路径）
            const switchPath = prevWas3D && is3D ? '  ⚡3D→3D' : '';
            const flag = status === 'OK' ? '✓' : status === 'CRASH' ? '✗' : '⚠';
            log(`${tag} ${flag} ${name} (${is3D ? '3D' : '2D'})${switchPath}${status !== 'OK' ? '  → ' + status : ''}`);
        } catch (e) {
            status = 'SCRIPT_ERR';
            sample = truncate(e.message);
            log(`${tag} ✗ ${name} 脚本异常: ${e.message}`);
        }

        results.push({ category, name, type: is3D ? '3D' : '2D', canvasOk, status, crashCount, deprecCount, otherErrCount, sample });
        prevWas3D = is3D;
    }

    // —— 汇总报告 ——
    const total = results.length;
    const ok = results.filter(r => r.status === 'OK').length;
    const crashed = results.filter(r => r.status === 'CRASH');
    const deprecated = results.filter(r => r.status === 'DEPREC');
    const errored = results.filter(r => r.status === 'ERROR');
    const noCanvas = results.filter(r => r.status === 'NO_CANVAS');
    const n3D = results.filter(r => r.type === '3D').length;

    log('\n========== 3D 场景切换实测汇总 ==========');
    log(`总场景: ${total}  |  3D 场景: ${n3D}  |  通过: ${ok}`);
    if (crashed.length) warn(`💥 崩溃(ErrorBoundary): ${crashed.length} 个 — ${crashed.map(r => r.name).join(', ')}`);
    if (deprecated.length) warn(`⚠️  弃用警告: ${deprecated.length} 个 — ${deprecated.map(r => r.name).join(', ')}`);
    if (errored.length) warn(`⚠️  其他错误: ${errored.length} 个 — ${errored.map(r => r.name).join(', ')}`);
    if (noCanvas.length) warn(`⚠️  Canvas 缺失: ${noCanvas.length} 个`);
    if (ok === total) log('🎉 全部场景通过，上一轮修复验证生效！');

    // 表格视图（仅异常项，便于聚焦）
    const abnormal = results.filter(r => r.status !== 'OK');
    if (abnormal.length) {
        console.table(
            abnormal.map(r => ({
                场景: r.name,
                分类: r.category,
                类型: r.type,
                状态: r.status,
                崩溃: r.crashCount,
                弃用: r.deprecCount,
                错误: r.otherErrCount,
                摘要: r.sample,
            }))
        );
    } else {
        log('（无异常项，未输出详情表格）');
    }

    // 全量结果挂到全局，便于事后排查
    window.__3D_VERIFY_RESULT = { summary: { total, ok, crashed: crashed.length, deprecated: deprecated.length, errored: errored.length, n3D }, results };
    log('完整结果已挂载到 window.__3D_VERIFY_RESULT');

    // 恢复 console 原行为
    console.error = _err;
    console.warn = _warn;
    log('验证结束。');
})();

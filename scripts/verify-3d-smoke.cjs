/*
 * 3D 场景切换冒烟测试 (Playwright 版, 轻量)
 *
 * 用途: 快速回归 — 验证核心场景切换链路无 CRASH / 无 updateEquipment 错配。
 * 与全量 verify-3d-scene-switching.js 的区别: 只跑代表性场景 (3D 共享 rig / 3D 独有 rig / 2D),
 * 重点覆盖场景切换竞态 (旧 rig handles + 新 rig updateEquipment 错配崩溃的历史 bug)。
 *
 * 运行: node scripts/verify-3d-smoke.cjs  (需 dev server 运行在 http://localhost:3000/)
 *
 * 退出码: 0 = 全部通过; 1 = 存在 CRASH/ERROR
 */
const { chromium } = require('playwright');

// 代表性场景: 每类挑 1-2 个, 覆盖历史 bug 高发区 (共享 rig / 独有 rig / 2D 场景)
const SCENES = [
    { name: '抛体运动 (平抛+斜抛)', kind: '3D-own' },
    { name: '惯性实验 (棋子/鸡蛋/小车)', kind: '3D-shared' },
    { name: '碰撞', kind: '3D-shared' },
    { name: '动量定理与反冲', kind: '3D-shared' },
    { name: '超重与失重 (电梯台秤)', kind: '3D-own' },
    { name: '电磁复合场', kind: '3D-own' },
    { name: '黑体辐射', kind: '3D-own' },
    { name: '宇宙射线', kind: '3D-own' },
    { name: '自由落体', kind: '3D-own' },
    { name: '力的合成 (平行四边形定则)', kind: '3D-own' },
    { name: '安培力因素 (F=BIL·sinθ)', kind: '3D-own' },
    { name: '电容充放电 (RC 暂态电路)', kind: '3D-own' },
    { name: '牛顿第一定律 (惯性)', kind: '3D-own' },
    { name: '多普勒效应 (声源运动)', kind: '3D-own' }
];

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'msedge' });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push('PAGEERROR: ' + e.message));
    page.on('console', m => {
        if (m.type() === 'error') pageErrors.push('CONSOLE: ' + m.text());
    });

    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.directory-scene', { timeout: 30000 });

    const click = async (name) => {
        const ok = await page.$$eval('.directory-scene', (els, t) => {
            const el = els.find(e => e.textContent.trim() === t);
            if (el) { el.click(); return true; }
            return false;
        }, name);
        return ok;
    };

    // 每个场景切换 2 轮 (含"切走再切回"), 专门打击历史竞态 bug
    const failures = [];
    for (let round = 1; round <= 2; round++) {
        for (const s of SCENES) {
            pageErrors.length = 0;
            const ok = await click(s.name);
            await page.waitForTimeout(1500);
            const errs = pageErrors.slice();
            const bad = errs.filter(e => !/favicon/i.test(e));
            if (!ok) {
                failures.push({ scene: s.name, round, issue: '场景按钮未找到' });
            } else if (bad.length) {
                failures.push({ scene: s.name, round, issue: bad[0].slice(0, 180) });
            }
        }
    }

    await browser.close();

    if (failures.length === 0) {
        console.log(`SMOKE OK: ${SCENES.length} 场景 × 2 轮切换, 无 CRASH / 无 console error`);
        process.exit(0);
    }
    console.log(`SMOKE FAILED: ${failures.length} 处问题`);
    for (const f of failures) console.log(`  - [第${f.round}轮] ${f.scene}: ${f.issue}`);
    process.exit(1);
})().catch(e => {
    console.error('FATAL:', e.message);
    process.exit(1);
});

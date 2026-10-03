#!/usr/bin/env node
/**
 * 首屏包体积门禁 (#42) + 懒 chunk 硬门禁 (#80)。
 *
 * 首屏: 度量 visualization/dist/index.html 引用的首屏资源
 * (入口 JS + 首屏 CSS + index.html 本身) 的 gzip 字节之和，
 * 超过预算即失败。重 chunk (three/charts/physics) 均为懒加载，
 * 不计入首屏 (见 visualization/vite.config.ts manualChunks)。
 *
 * 阈值依据: 2026-09-29 实测首屏约 63kB (相对 plan.md 历史快照 57kB
 * 的增长来自 08-02 之后落地的 workbench/课堂脚本/测量工具箱等首屏功能);
 * 预算取 70kB (现状 + ~10% 裕量)，只防回归，不锁历史快照。
 *
 * 懒 chunk (#80): 入口未引用的 assets/*.js 逐个对照预算表 ——
 * 重 chunk 按 2026-10-03 构建实测值 +20% 裕量锁定，其余单文件走通用预算；
 * 「场景/器材越写越多 → 懒 chunk 无限膨胀」从此有拦截。
 * 预算表更新方法: npm run build:viz 后按本脚本打印的实测值调整 LAZY_BUDGETS
 * (实测值 ×1.2 向上取整到 1kB)，并在注释里记下测量日期。
 *
 * 用法: 前置需先构建 (npm run build:viz); 预算覆盖: BUNDLE_BUDGET_KB=70
 *   node scripts/check-bundle-size.mjs [--budget-kb 70] [--dist visualization/dist]
 * 调试: LAZY_BUDGET_SCALE=0.01 可把全部懒 chunk 预算压到近 0 (验证超限失败路径)
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { gzipSync } from 'zlib';
import { resolve, basename } from 'path';

const BUDGET_KB = 70;

/**
 * 懒 chunk 预算表 (gzip kB)。依据 2026-10-03 实测 (实测 gzip 值 ×1.2 向上取整):
 *   vendor-physics 151.2 / vendor-three 149.5 / GraphPanel 99 / SimulationCanvas 92 / FormulaPanel 35
 * 匹配规则: 文件名去掉内容哈希后的前缀 (如 vendor-three-<hash>.js → vendor-three-)
 */
const LAZY_BUDGETS = [
    { prefix: 'vendor-physics-', kb: 185 },
    { prefix: 'vendor-three-', kb: 175 },
    { prefix: 'GraphPanel-', kb: 120 },
    { prefix: 'SimulationCanvas-', kb: 115 },
    { prefix: 'FormulaPanel-', kb: 42 }
];
/** 未列入预算表的懒 chunk 单文件通用预算 (当前最大未列入者 WorkbenchScene 28kB) */
const GENERIC_LAZY_BUDGET_KB = 60;

function parseArgs(argv) {
    const out = { budgetKb: Number(process.env.BUNDLE_BUDGET_KB ?? BUDGET_KB), dist: 'visualization/dist' };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--budget-kb') out.budgetKb = Number(argv[i + 1]);
        if (argv[i] === '--dist') out.dist = argv[i + 1];
    }
    return out;
}

const { budgetKb, dist } = parseArgs(process.argv.slice(2));
const distDir = resolve(dist);
const indexHtml = resolve(distDir, 'index.html');

if (!existsSync(indexHtml)) {
    console.error(`首屏体积检查失败: 找不到 ${indexHtml}，请先运行 npm run build:viz 构建`);
    process.exit(1);
}

const html = readFileSync(indexHtml, 'utf-8');
const refs = new Set();
// index.html 内资源 URL 形如 /<base>/assets/x.js (base=VITE_BASE_PATH) 或 assets/x.js;
// 外部 CDN (https://) 不计入首屏包
for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = m[1];
    if (!url || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) continue;
    const i = url.indexOf('assets/');
    if (i >= 0) refs.add(url.slice(i));
}

const rows = [];
let total = gzipSync(html).length;
rows.push({ file: 'index.html', gzip: total });
for (const ref of [...refs].sort()) {
    const p = resolve(distDir, ref);
    if (!existsSync(p)) {
        console.error(`首屏体积检查失败: index.html 引用的 ${ref} 在 dist 中不存在`);
        process.exit(1);
    }
    const gz = gzipSync(readFileSync(p)).length;
    rows.push({ file: ref, gzip: gz });
    total += gz;
}

const totalKb = total / 1024;
console.log('=== 首屏包体积 (gzip) ===');
for (const r of rows) console.log(`  ${r.file}: ${(r.gzip / 1024).toFixed(1)} kB`);
console.log(`合计: ${totalKb.toFixed(1)} kB / 预算 ${budgetKb} kB`);

let entryFailed = false;
if (!Number.isFinite(budgetKb) || budgetKb <= 0) {
    console.error('预算非法: --budget-kb 必须为正数');
    process.exit(1);
}
if (totalKb > budgetKb) {
    console.error(`首屏体积超预算: ${totalKb.toFixed(1)} kB > ${budgetKb} kB`);
    entryFailed = true;
} else {
    console.log('首屏体积检查通过');
}

// ---- 懒 chunk 硬门禁 (#80) ----
const assetsDir = resolve(distDir, 'assets');
const scale = Number(process.env.LAZY_BUDGET_SCALE ?? '1');
const lazyRows = [];
if (existsSync(assetsDir)) {
    const entryFiles = new Set([...refs].map(ref => basename(ref)));
    for (const f of readdirSync(assetsDir)) {
        if (!f.endsWith('.js') || entryFiles.has(f)) continue;
        const gz = gzipSync(readFileSync(resolve(assetsDir, f))).length;
        lazyRows.push({ file: f, kb: gz / 1024 });
    }
}
const breaches = [];
console.log(`\n=== 懒 chunk 体积 (gzip, 共 ${lazyRows.length} 个) ===`);
for (const row of lazyRows.sort((a, b) => b.kb - a.kb)) {
    const named = LAZY_BUDGETS.find(b => row.file.startsWith(b.prefix));
    const budget = (named ? named.kb : GENERIC_LAZY_BUDGET_KB) * scale;
    const over = row.kb - budget;
    const mark = over > 0 ? ' ✗' : '';
    console.log(
        `  ${row.file}: ${row.kb.toFixed(1)} kB / 预算 ${named ? named.kb : GENERIC_LAZY_BUDGET_KB}${
            scale !== 1 ? `×${scale}` : ''
        } kB${mark}`
    );
    if (over > 0) breaches.push({ file: row.file, kb: row.kb, budget });
}
if (lazyRows.length === 0) {
    console.error('懒 chunk 检查失败: dist/assets 下未找到任何懒 chunk (构建产物异常?)');
    process.exit(1);
}
if (breaches.length > 0) {
    console.error(
        `懒 chunk 超预算 ${breaches.length} 个:\n` +
            breaches
                .map(
                    b =>
                        `  - ${b.file}: ${b.kb.toFixed(1)} kB > 预算 ${b.budget.toFixed(1)} kB (超 ${(
                            b.kb - b.budget
                        ).toFixed(1)} kB)`
                )
                .join('\n') +
            `\n若为有意增长: 调整 scripts/check-bundle-size.mjs 的 LAZY_BUDGETS (实测值 ×1.2 并记录日期)`
    );
    process.exit(1);
}
console.log('懒 chunk 体积检查通过');
if (entryFailed) process.exit(1);

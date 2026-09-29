#!/usr/bin/env node
/**
 * 首屏包体积门禁 (#42)。
 *
 * 度量 visualization/dist/index.html 引用的首屏资源
 * (入口 JS + 首屏 CSS + index.html 本身) 的 gzip 字节之和，
 * 超过预算即失败。重 chunk (three/charts/physics) 均为懒加载，
 * 不计入首屏 (见 visualization/vite.config.ts manualChunks)。
 *
 * 阈值依据: 2026-09-29 实测首屏约 63kB (相对 plan.md 历史快照 57kB
 * 的增长来自 08-02 之后落地的 workbench/课堂脚本/测量工具箱等首屏功能);
 * 预算取 70kB (现状 + ~10% 裕量)，只防回归，不锁历史快照。
 *
 * 用法: 前置需先构建 (npm run build:viz); 预算覆盖: BUNDLE_BUDGET_KB=70
 *   node scripts/check-bundle-size.mjs [--budget-kb 70] [--dist visualization/dist]
 */
import { readFileSync, existsSync } from 'fs';
import { gzipSync } from 'zlib';
import { resolve } from 'path';

const BUDGET_KB = 70;

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

if (!Number.isFinite(budgetKb) || budgetKb <= 0) {
    console.error('预算非法: --budget-kb 必须为正数');
    process.exit(1);
}
if (totalKb > budgetKb) {
    console.error(`首屏体积超预算: ${totalKb.toFixed(1)} kB > ${budgetKb} kB`);
    process.exit(1);
}
console.log('首屏体积检查通过');

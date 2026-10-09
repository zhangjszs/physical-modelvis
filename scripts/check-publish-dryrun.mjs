#!/usr/bin/env node
/**
 * physics-core 发布 dry-run 门禁 (#107 · D20 安全切片)
 *
 * 背景: #99（真实 npm 发布流水线）命中契约 1.8 红线，用户定夺「真实发布暂缓、
 * dry-run 先行为授权范围」（D20）。本门禁把「发布就绪度校验」与「对外发布」解耦:
 * 对 physics-core 跑 `npm pack --dry-run --json`，只读校验 tarball 清单，全程
 * 不发布、不触网、不需要任何 npm token。
 *
 * 校验面 (对应 #107 验收标准):
 *   1. 入口存在性: package.json 的 main / types / exports 指向的文件必须在 tarball 清单中;
 *   2. 内容收敛: 除 npm 自动包含的根级文件 (package.json / README / LICENSE / CHANGELOG)
 *      外，只允许 dist/** —— 防 src / tests / 配置文件意外混入发布包;
 *   3. 体积上界: packed ≤ MAX_PACKED_BYTES、unpacked ≤ MAX_UNPACKED_BYTES，
 *      防 dist 意外膨胀（含源码或大体积产物混入）;
 *   4. 元数据就绪: sideEffects / license / repository / engines / files / private 等发布必需项。
 *
 * 体积上界依据: 2026-10-09 实测 packed 542 kB / unpacked 2.58 MB
 * (其中 dist/*.map 占 unpacked 约 1.1 MB)，上界取约 2× 裕量、只防意外膨胀不锁快照;
 * 有意增长时更新常量并在注释里记下测量日期。
 *
 * 用法: 前置需先构建 (npm run build:core)
 *   node scripts/check-publish-dryrun.mjs
 *
 * exit-code: 0 = 就绪度通过; 1 = 任一校验失败（含 npm pack 执行失败）
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const CORE_DIR = join(root, 'physics-core');
const PACK_JSON = join(CORE_DIR, 'package.json');

/** tarball 体积上界 (字节); 依据与更新方法见文件头注释 */
const MAX_PACKED_BYTES = 1_000_000;
const MAX_UNPACKED_BYTES = 5_000_000;

/** npm 随包自动包含的根级文件（除 package.json 外）; 其余根级文件出现在清单即判泄漏 */
const ROOT_FILE_ALLOWLIST = [/^(README|LICENSE|LICENCE|CHANGELOG)(\..+)?$/i];

const failures = [];

function fail(message) {
    failures.push(message);
}

if (!existsSync(join(CORE_DIR, 'dist'))) {
    console.error('❌ 发布 dry-run 门禁失败: physics-core/dist 不存在，请先运行 npm run build:core');
    process.exit(1);
}

// ---- 执行 npm pack --dry-run (--ignore-scripts: 不触发任何生命周期脚本, 零副作用) ----
const isWin = process.platform === 'win32';
const res = spawnSync(isWin ? 'npm.cmd' : 'npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: CORE_DIR,
    encoding: 'utf8',
    env: process.env
});
if (res.status !== 0) {
    console.error('❌ 发布 dry-run 门禁失败: npm pack --dry-run 执行失败');
    console.error(res.stderr || res.error || `exit ${res.status}`);
    process.exit(1);
}

let packEntry;
try {
    const parsed = JSON.parse(res.stdout);
    packEntry = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!packEntry || !Array.isArray(packEntry.files)) throw new Error('输出缺少 files 清单');
} catch (err) {
    console.error(`❌ 发布 dry-run 门禁失败: 无法解析 npm pack --json 输出 (${err.message})`);
    console.error(res.stdout?.slice(0, 500));
    process.exit(1);
}

const pkg = JSON.parse(readFileSync(PACK_JSON, 'utf-8'));
const filePaths = packEntry.files.map(f => f.path);

// ---- ① 入口存在性: main / types / exports 目标必须随包 ----
const fileSet = new Set(filePaths);
const entryTargets = [];
if (typeof pkg.main === 'string') entryTargets.push(pkg.main);
if (typeof pkg.types === 'string') entryTargets.push(pkg.types);
const collectExportStrings = value => {
    if (typeof value === 'string') entryTargets.push(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(collectExportStrings);
};
collectExportStrings(pkg.exports);
for (const target of entryTargets) {
    const normalized = target.replace(/^\.\//, '');
    if (!fileSet.has(normalized)) fail(`入口文件不在 tarball 清单中: ${target} (package.json 声明 → 实际打包缺失)`);
}
const uniqueEntryTargets = [...new Set(entryTargets.map(t => t.replace(/^\.\//, '')))];

// ---- ② 内容收敛: 只允许 dist/** + 自动包含的根级白名单 ----
const allowedRoot = path => ROOT_FILE_ALLOWLIST.some(re => re.test(path));
const offenders = filePaths.filter(p => !p.startsWith('dist/') && p !== 'package.json' && !allowedRoot(p));
if (offenders.length > 0) {
    fail(
        `tarball 混入 dist/ 之外的非白名单文件 ${offenders.length} 个 (疑似 src/tests/配置泄漏):\n` +
            offenders
                .slice(0, 20)
                .map(p => `      - ${p}`)
                .join('\n') +
            (offenders.length > 20 ? `\n      … 其余 ${offenders.length - 20} 个` : '')
    );
}

// ---- ③ 体积上界 ----
if (typeof packEntry.size !== 'number' || !Number.isFinite(packEntry.size)) {
    fail('npm pack 输出缺少 size 字段');
} else if (packEntry.size > MAX_PACKED_BYTES) {
    fail(`packed 体积超上界: ${(packEntry.size / 1024).toFixed(1)} kB > ${(MAX_PACKED_BYTES / 1024).toFixed(1)} kB`);
}
if (typeof packEntry.unpackedSize !== 'number' || !Number.isFinite(packEntry.unpackedSize)) {
    fail('npm pack 输出缺少 unpackedSize 字段');
} else if (packEntry.unpackedSize > MAX_UNPACKED_BYTES) {
    fail(
        `unpacked 体积超上界: ${(packEntry.unpackedSize / 1024).toFixed(1)} kB > ${(MAX_UNPACKED_BYTES / 1024).toFixed(1)} kB`
    );
}

// ---- ④ 元数据就绪 ----
if (pkg.private === true) fail('package.json private:true —— 发布就绪度要求去掉 (或改走 scoped 决策, 见 #99)');
if (pkg.sideEffects !== false) fail('package.json sideEffects 应为 false (库包无副作用, 供 tree-shaking)');
if (typeof pkg.license !== 'string' || pkg.license.length === 0) fail('package.json 缺少 license');
if (typeof pkg.repository?.url !== 'string' || pkg.repository.url.length === 0)
    fail('package.json 缺少 repository.url');
if (pkg.repository?.directory !== 'physics-core')
    fail('package.json repository.directory 应为 "physics-core" (monorepo 子包)');
if (typeof pkg.engines?.node !== 'string' || pkg.engines.node.length === 0) fail('package.json 缺少 engines.node');
if (typeof pkg.name !== 'string' || pkg.name.length === 0) fail('package.json 缺少 name');
if (typeof pkg.version !== 'string' || pkg.version.length === 0) fail('package.json 缺少 version');
if (!Array.isArray(pkg.files) || !pkg.files.includes('dist')) fail('package.json files 应包含 "dist"');
if (!pkg.main || !pkg.types || !pkg.exports) fail('package.json main / types / exports 三者必须齐全');

// ---- 汇总 ----
const distCount = filePaths.filter(p => p.startsWith('dist/')).length;
console.log('=== physics-core 发布 dry-run 门禁 (#107) ===');
console.log(`  tarball（dry-run, 未写出）: ${packEntry.filename}`);
console.log(`  packed:   ${(packEntry.size / 1024).toFixed(1)} kB / 上界 ${(MAX_PACKED_BYTES / 1024).toFixed(1)} kB`);
console.log(
    `  unpacked: ${(packEntry.unpackedSize / 1024).toFixed(1)} kB / 上界 ${(MAX_UNPACKED_BYTES / 1024).toFixed(1)} kB`
);
console.log(`  文件: ${filePaths.length} 个 (dist ${distCount} + 根级 ${filePaths.length - distCount})`);
console.log(`  入口: ${uniqueEntryTargets.join(' · ')}`);

if (failures.length > 0) {
    console.error(`\n❌ 发布 dry-run 门禁失败 ${failures.length} 项:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
}
console.log('✅ 发布 dry-run 检查通过（未发布、未触网、未使用 token）');

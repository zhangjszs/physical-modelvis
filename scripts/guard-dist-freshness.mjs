#!/usr/bin/env node
/**
 * physics-core/dist 新鲜度守卫 (#15)
 *
 * 背景: visualization 通过 `file:../physics-core` 引用的是 **构建产物 dist/**, 不是源码。
 * 根 package.json 的 `typecheck` / `lint` / `test` 单命令均**不含** `build:core`
 * (只有 `precheck` 首步含), 于是 `npm run test:viz` 这类日常命令会静默消费旧 dist ——
 * 引擎修复"看起来没生效"。AGENTS.md / CONTRIBUTING.md 用文字提醒过这个陷阱, 但文字防不住。
 *
 * 本守卫比较 `physics-core/src` 与 `dist` 的 mtime, 过时则以非 0 退出并提示重建。
 * 接入 `pretest` / `pretypecheck`, 让日常单命令也无法消费陈旧产物。
 *
 * 用法:
 *   node scripts/guard-dist-freshness.mjs           仅检查
 *   node scripts/guard-dist-freshness.mjs --quiet   仅在失败时输出
 *
 * exit-code: 0 = dist 新鲜或不存在(首次构建); 1 = dist 陈旧
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const SRC = resolve(root, 'physics-core/src');
const DIST = resolve(root, 'physics-core/dist');

const quiet = process.argv.includes('--quiet');

/** 递归收集目录下所有文件的最新 mtime (ms); 目录不存在返回 0 */
function newestMtime(dir) {
    if (!existsSync(dir)) return 0;
    let newest = 0;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            newest = Math.max(newest, newestMtime(full));
        } else {
            newest = Math.max(newest, statSync(full).mtimeMs);
        }
    }
    return newest;
}

const srcTime = newestMtime(SRC);
const distTime = newestMtime(DIST);

function fail(message) {
    console.error(`❌ physics-core/dist 新鲜度检查失败: ${message}`);
    console.error('');
    console.error('   原因: visualization 依赖 physics-core 的构建产物 dist/, 而 dist 比 src 旧。');
    console.error('   继续跑测试会消费**陈旧**产物 —— 引擎修复会"看起来没生效"。');
    console.error('');
    console.error('   修复: npm run build:core    (或直接跑 npm run precheck, 首步即重建)');
    process.exit(1);
}

if (distTime === 0) {
    // 首次克隆、尚未构建 —— 不是错误, 交给后续 tsc / vitest 自然失败并给出提示
    if (!quiet) console.log('ℹ️  physics-core/dist 不存在, 跳过新鲜度检查 (请先 npm run build:core)');
    process.exit(0);
}

if (srcTime > distTime) {
    const lagSec = ((srcTime - distTime) / 1000).toFixed(1);
    fail(
        `dist 比 src 旧 ${lagSec}s (src 最新 ${new Date(srcTime).toISOString()}, dist 最新 ${new Date(distTime).toISOString()})`
    );
}

if (!quiet) {
    console.log(`✅ physics-core/dist 新鲜 (src 最新 ${new Date(srcTime).toISOString()})`);
}
process.exit(0);

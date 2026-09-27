#!/usr/bin/env node
/**
 * 测试数统计与文档一致性校验（单一真源）
 *
 * 口径: 各包 `npm test` 的 vitest JSON 报告 — numPassedTests (= 默认 reporter 的
 * "Tests N passed") 与 testResults.length (= "Test Files M passed (M)")。
 *
 * 用法:
 *   node scripts/count-tests.mjs                        实跑 core+viz 并输出统计
 *   node scripts/count-tests.mjs --check                实跑 + 校验文档三处数字
 *   node scripts/count-tests.mjs --check --from-report  只读已有报告 (供 precheck/CI)
 *   node scripts/count-tests.mjs --write                实跑 + 回写文档统计行
 *
 * 文档定位: 统计行以 <!-- test-count --> 标记 (README 顶部行 / 测试覆盖块、
 * plan.md 当前测试数行), 避免误伤 plan.md 中的历史测试数快照。
 *
 * 报告来源: 仅全量 `npm test` 会产出这两份报告; self-check.mjs 的分层调用直接跑
 * vitest、不经过 npm test, 故报告不会被单层结果覆盖。
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

/** 文档统计行的定位标记 */
const MARK = '<!-- test-count -->';

/** 三处标记统计行: README 顶部行 + README 测试覆盖块 + plan.md 当前测试数行 */
const EXPECTED_MARKERS = 3;

/** 各包 npm test (json reporter) 产出的报告路径 */
const REPORTS = {
  core: resolve(root, '.scratch/core-tests.json'),
  viz: resolve(root, '.scratch/viz-tests.json'),
};

const README = resolve(root, 'README.md');
const PLAN = resolve(root, 'docs/plan.md');

/** 实际统计 (core/viz 报告合并), 由 collectActual() 填充 */
const ACTUAL = { coreTests: 0, coreFiles: 0, vizTests: 0, vizFiles: 0, total: 0 };

const flags = new Set(process.argv.slice(2));
const VALID_FLAGS = new Set(['--check', '--from-report', '--write']);
const unknown = [...flags].filter((f) => !VALID_FLAGS.has(f));
if (unknown.length > 0) {
  console.error(`❌ 未知参数: ${unknown.join(' ')}`);
  console.error('   可用参数: --check 校验 / --from-report 只读已有报告 / --write 回写文档');
  process.exit(1);
}
const checkMode = flags.has('--check');
const fromReport = flags.has('--from-report');
const writeMode = flags.has('--write');

/**
 * 读取单份 vitest JSON 报告
 * @returns {{tests: number, files: number, failed: number} | null}
 */
function readReport(key) {
  const path = REPORTS[key];
  if (!existsSync(path)) return null;
  try {
    const json = JSON.parse(readFileSync(path, 'utf8'));
    return {
      tests: json.numPassedTests ?? 0,
      files: Array.isArray(json.testResults) ? json.testResults.length : 0,
      failed: json.numFailedTests ?? 0,
    };
  } catch {
    return null;
  }
}

/** 实跑 npm test (根脚本, 依次跑 core+viz 并产出报告) */
function runTests() {
  const isWin = process.platform === 'win32';
  const res = spawnSync(isWin ? 'npm.cmd' : 'npm', ['test'], {
    cwd: root,
    stdio: 'inherit',
    shell: isWin,
  });
  if (res.status !== 0) {
    console.error('❌ npm test 失败, 无法统计测试数');
    process.exit(res.status ?? 1);
  }
}

/** 收集实际统计 */
function collectActual() {
  const core = readReport('core');
  const viz = readReport('viz');
  if (!core || !viz) {
    console.error('❌ 缺少测试报告 (需 ' + Object.values(REPORTS).join(' 与 ') + ')');
    console.error('   请先运行 npm test, 或去掉 --from-report 让脚本自行实跑');
    process.exit(1);
  }
  if (core.failed > 0 || viz.failed > 0) {
    console.error(`❌ 存在失败测试 (core ${core.failed} / viz ${viz.failed})`);
    process.exit(1);
  }
  ACTUAL.coreTests = core.tests;
  ACTUAL.coreFiles = core.files;
  ACTUAL.vizTests = viz.tests;
  ACTUAL.vizFiles = viz.files;
  ACTUAL.total = core.tests + viz.tests;
}

/** 本地日期 YYYY-MM-DD (用于 plan.md "实测" 标注) */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 解析单行标记统计条目
 * @returns {{kind: 'line', label: string, expected: Array<{name: string, docValue: number, actualValue: number}>, patch: (line: string) => string} | null}
 */
function extractFromLine(line, label) {
  // 形态 A: README 顶部摘要 — core N / viz M / 总计 T
  const top = line.match(/core\s+(\d+)\s*\/\s*viz\s+(\d+)\s*\/\s*总计\s+(\d+)/);
  if (top) {
    return {
      kind: 'line',
      label,
      expected: [
        { name: 'core', docValue: +top[1], actualValue: ACTUAL.coreTests },
        { name: 'viz', docValue: +top[2], actualValue: ACTUAL.vizTests },
        { name: 'total', docValue: +top[3], actualValue: ACTUAL.total },
      ],
      patch: (l) =>
        l.replace(
          /core\s+\d+\s*\/\s*viz\s+\d+\s*\/\s*总计\s+\d+/,
          `core ${ACTUAL.coreTests} / viz ${ACTUAL.vizTests} / 总计 ${ACTUAL.total}`,
        ),
    };
  }
  // 形态 B: plan.md 当前行 — core N (F files) + viz M (G files) = T (YYYY-MM-DD 实测)
  const plan = line.match(/core\s+(\d+)\s*\((\d+)\s*files\)\s*\+\s*viz\s+(\d+)\s*\((\d+)\s*files\)\s*=\s*(\d+)/);
  if (plan) {
    return {
      kind: 'line',
      label,
      expected: [
        { name: 'core', docValue: +plan[1], actualValue: ACTUAL.coreTests },
        { name: 'core files', docValue: +plan[2], actualValue: ACTUAL.coreFiles },
        { name: 'viz', docValue: +plan[3], actualValue: ACTUAL.vizTests },
        { name: 'viz files', docValue: +plan[4], actualValue: ACTUAL.vizFiles },
        { name: 'total', docValue: +plan[5], actualValue: ACTUAL.total },
      ],
      patch: (l) =>
        l
          .replace(
            /core\s+\d+\s*\(\d+\s*files\)\s*\+\s*viz\s+\d+\s*\(\d+\s*files\)\s*=\s*\d+/,
            `core ${ACTUAL.coreTests} (${ACTUAL.coreFiles} files) + viz ${ACTUAL.vizTests} (${ACTUAL.vizFiles} files) = ${ACTUAL.total}`,
          )
          .replace(/\(\d{4}-\d{2}-\d{2} 实测\)/, `(${today()} 实测)`),
    };
  }
  return null;
}

/**
 * 形态 C: 标记单独成行, 其后紧跟测试覆盖代码块
 * @returns {{kind: 'block', label: string, expected: Array, patchLines: (lines: string[]) => string[]} | null}
 */
function extractBlock(lines, markerIdx) {
  let start = markerIdx + 1;
  while (start < lines.length && lines[start].trim() === '') start++;
  if (start >= lines.length || !lines[start].trim().startsWith('```')) return null;
  let end = start + 1;
  while (end < lines.length && !lines[end].trim().startsWith('```')) end++;
  if (end >= lines.length) return null;

  const block = lines.slice(start + 1, end);
  const offset = start + 1;
  const idx = (pred) => block.findIndex(pred);
  const coreAt = idx((l) => l.startsWith('physics-core:'));
  const vizAt = idx((l) => l.startsWith('visualization:'));
  const totalAt = idx((l) => l.startsWith('Total:'));
  if (coreAt < 0 || vizAt < 0 || totalAt < 0) return null;

  const coreM = block[coreAt].match(/(\d+)\s+tests passed\s*\((\d+)\s*files\)/);
  const vizM = block[vizAt].match(/(\d+)\s+tests passed\s*\((\d+)\s*files\)/);
  const totalM = block[totalAt].match(/(\d+)\s+tests passed/);
  if (!coreM || !vizM || !totalM) return null;

  return {
    kind: 'block',
    label: 'README 测试覆盖块',
    expected: [
      { name: 'physics-core', docValue: +coreM[1], actualValue: ACTUAL.coreTests },
      { name: 'physics-core files', docValue: +coreM[2], actualValue: ACTUAL.coreFiles },
      { name: 'visualization', docValue: +vizM[1], actualValue: ACTUAL.vizTests },
      { name: 'visualization files', docValue: +vizM[2], actualValue: ACTUAL.vizFiles },
      { name: 'Total', docValue: +totalM[1], actualValue: ACTUAL.total },
    ],
    /** 按实际值重建块内三行 (保持列对齐) */
    patchLines: (ls) => {
      const out = ls.slice();
      out[offset + coreAt] = `physics-core:   ${ACTUAL.coreTests} tests passed (${ACTUAL.coreFiles} files)`;
      out[offset + vizAt] = `visualization:  ${ACTUAL.vizTests} tests passed (${ACTUAL.vizFiles} files)`;
      out[offset + totalAt] = `Total:          ${ACTUAL.total} tests passed`;
      return out;
    },
  };
}

/**
 * 解析一个文档中所有标记统计位置
 * @returns {{text: string, entries: Array, problems: string[]}} entries=成功解析项, problems=标记无法解析的定位
 */
function parseDoc(filePath) {
  const rel = filePath.slice(root.length + 1);
  const text = readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const entries = [];
  const problems = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(MARK)) continue;
    const entry = extractFromLine(lines[i], rel) ?? extractBlock(lines, i);
    if (entry) entries.push({ ...entry, lineIdx: i });
    else problems.push(`${rel} 第 ${i + 1} 行的标记无法解析 (统计行格式被改动?)`);
  }
  return { path: filePath, rel, text, lines, entries, problems };
}

/** 解析全部文档; 标记缺失/损坏时打印原因并 exit 1 */
function parseAllDocs() {
  const docs = [parseDoc(README), parseDoc(PLAN)];
  const errors = [];
  let markerCount = 0;
  for (const doc of docs) {
    markerCount += doc.entries.length + doc.problems.length;
    errors.push(...doc.problems);
  }
  if (markerCount !== EXPECTED_MARKERS) {
    errors.push(`标记统计行共 ${markerCount} 处 (期望 ${EXPECTED_MARKERS} 处), 标记可能被误删`);
  }
  if (errors.length > 0) {
    console.error('❌ 文档标记统计行异常:');
    for (const e of errors) console.error('   - ' + e);
    console.error('   恢复方式: 手工补回 <!-- test-count --> 标记, 或对照 git 历史还原统计行');
    process.exit(1);
  }
  return docs;
}

/** 校验所有标记位置与实际是否一致 */
function checkDocs() {
  const docs = parseAllDocs();
  const diffs = [];
  let checked = 0;
  for (const doc of docs) {
    for (const e of doc.entries) {
      for (const f of e.expected) {
        checked++;
        if (f.docValue !== f.actualValue) {
          diffs.push(`${e.label}「${f.name}」: 文档 ${f.docValue} ≠ 实跑 ${f.actualValue}`);
        }
      }
    }
  }
  if (diffs.length > 0) {
    console.error('❌ 文档测试数与实跑不一致:');
    for (const d of diffs) console.error('   - ' + d);
    console.error('   同步方式: npm run count:sync (实跑并回写三处标记行)');
    process.exit(1);
  }
  console.log(`✅ 文档测试数与实跑一致 (${checked} 个数字, ${EXPECTED_MARKERS} 处标记)`);
}

/** 按实际值回写所有标记统计行 */
function writeDocs() {
  const docs = parseAllDocs();
  for (const doc of docs) {
    let lines = doc.lines;
    for (const e of doc.entries) {
      if (e.kind === 'line') lines = lines.map((l, idx) => (idx === e.lineIdx ? e.patch(l) : l));
      else lines = e.patchLines(lines);
    }
    const next = lines.join('\n');
    if (next !== doc.text) {
      writeFileSync(doc.path, next);
      console.log(`✏️  已回写 ${doc.rel}`);
    } else {
      console.log(`— ${doc.rel} 无需修改`);
    }
  }
}

function main() {
  if (!fromReport) runTests();
  collectActual();

  if (writeMode) writeDocs();

  console.log('=== 测试数统计 ===');
  console.log(`physics-core:  ${ACTUAL.coreTests} tests passed (${ACTUAL.coreFiles} files)`);
  console.log(`visualization: ${ACTUAL.vizTests} tests passed (${ACTUAL.vizFiles} files)`);
  console.log(`Total:         ${ACTUAL.total} tests passed`);

  if (checkMode) checkDocs();
}

main();

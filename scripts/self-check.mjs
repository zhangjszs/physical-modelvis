#!/usr/bin/env node
/**
 * PhysVis L0-L6 物理自检循环 — 整合 CLI
 *
 * 顺序运行 7 层自检, 生成报告到 stdout + .scratch/selfcheck-run-<ISO>.jsonl
 * exit-code: 0 = 全部通过; 1 = 存在失败
 *
 * 用法:
 *   node scripts/self-check.mjs           表格输出
 *   node scripts/self-check.mjs --json    JSON 输出
 */

import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const scratchDir = resolve(root, '.scratch');
if (!existsSync(scratchDir)) mkdirSync(scratchDir, { recursive: true });

const jsonMode = process.argv.includes('--json');

function log(line) {
  if (!jsonMode) console.log(line);
}

const LAYERS = [
  { id: 'L0', name: '物理常数完整性', pkg: 'physics-core', test: 'constants.test.ts' },
  { id: 'L1', name: '模型守恒律+解析解', pkg: 'physics-core', test: 'fixtures.test.ts' },
  { id: 'L2', name: 'SceneConfig↔引擎契约', pkg: 'visualization', test: 'scene-contract.test.ts' },
  { id: 'L3', name: '渲染器公式', pkg: 'visualization', test: 'renderers.test.ts' },
  { id: 'L4', name: 'FormulaPanel 漂移', pkg: 'visualization', test: 'formula-drift.test.ts' },
  { id: 'L5', name: '渲染器-场景路由', pkg: 'visualization', test: 'renderer-routing.test.ts' },
  { id: 'L6', name: '参数面板物理范围', pkg: 'visualization', test: 'parameter-ranges.test.ts' },
  { id: 'L8', name: 'Boris 数值积分正确性+收敛', pkg: 'physics-core', test: 'boris-correctness.test.ts' },
  { id: 'L9', name: '跨场景数值鲁棒性', pkg: 'visualization', test: 'physics-correctness.test.ts' },
];

/**
 * 在指定目录运行 npm test -- <testfile>, 返回 { code, passed }
 * 用 shell:true 在 Windows 保证 npm 找到正确 cmd 文件
 */
function runLayer(layer) {
  return new Promise((resolveP) => {
    const cwd = resolve(root, layer.pkg);
    const isWin = process.platform === 'win32';
    // 使用 npm test -- <testfile>
    const cmd = isWin ? 'npm.cmd' : 'npm';
    const args = ['test', '--', 'tests/accuracy/' + layer.test].filter(
      (_, i) => !(i === 2 && layer.pkg === 'physics-core' && layer.test === 'constants.test.ts')
    );
    if (layer.test === 'constants.test.ts') {
      // physics-core 的 constants.test.ts 在 tests/unit 下
      args[2] = 'tests/unit/constants.test.ts';
    }

    const proc = spawn(cmd, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isWin,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', (err) => {
      resolveP({ id: layer.id, name: layer.name, code: 2, passed: false, err: err.message, stdout, stderr });
    });
    proc.on('close', (code) => {
      const out = stdout + stderr;
      // 解析测试统计
      const passedMatch = out.match(/(\d+) passed/g);
      const failedMatch = out.match(/(\d+) failed/g);
      let passedCount = 0;
      if (passedMatch) {
        for (const m of passedMatch) {
          const n = parseInt(m.split(' ')[0], 10);
          if (n > passedCount) passedCount = n;
        }
      }
      const failedCount = failedMatch ? Math.max(...failedMatch.map(m => parseInt(m.split(' ')[0], 10))) : 0;
      resolveP({
        id: layer.id,
        name: layer.name,
        code: code ?? -1,
        passed: code === 0 && failedCount === 0,
        passedCount,
        failedCount,
        stdout,
        stderr,
      });
    });
  });
}

async function main() {
  const report = { timestamp: new Date().toISOString(), layers: [], failed: 0 };
  log(`=== PhysVis Self-Check ${report.timestamp} ===`);

  for (const layer of LAYERS) {
    const r = await runLayer(layer);
    const status = r.passed ? 'PASS' : 'FAIL';
    if (!r.passed) report.failed++;
    log(`[${status}] ${layer.id} ${layer.name}${r.passed ? `  ${r.passedCount} cases` : `  (exit=${r.code}, fail=${r.failedCount})`}`);
    if (!r.passed && r.stdout) {
      const failLines = r.stdout.split('\n').filter(l => /FAIL|AssertionError|Error|✗|×/.test(l)).slice(0, 4);
      for (const fl of failLines) log(`     ${fl.trim()}`);
    }
    report.layers.push({ id: r.id, name: r.name, status, passed: r.passedCount, failed: r.failedCount });
  }

  log(`\n=== 汇总 ===`);
  const passN = report.layers.filter(l => l.status === 'PASS').length;
  log(`  ${report.layers.length} 层: ${passN} PASS, ${report.failed} FAIL`);
  if (report.failed === 0) log('✅ 全部物理自检通过 — 教科书场景真实还原');

  appendFileSync(
    resolve(scratchDir, `selfcheck-run-${report.timestamp.replace(/[:.]/g, '-')}.jsonl`),
    JSON.stringify(report) + '\n',
  );

  if (jsonMode) console.log(JSON.stringify(report, null, 2));

  process.exit(report.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('self-check 运行失败:', e);
  process.exit(2);
});

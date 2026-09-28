#!/usr/bin/env node
/**
 * PhysVis 物理自检循环 — 整合 CLI
 *
 * 顺序运行 10 层自检 (L0-L6 + L8-L10; 无 L7, L7 编号为 CLI 自身的历史遗留),
 * 生成报告到 stdout + .scratch/selfcheck-run-<ISO>.jsonl
 * exit-code: 0 = 全部通过; 1 = 存在失败
 *
 * 层数以下方 LAYERS 数组为单一真源, 文档与 CI 步骤名应与之一致。
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
    {
        id: 'L9',
        name: '跨场景数值鲁棒性',
        pkg: 'visualization',
        test: [
            'physics-correctness.mechanics.test.ts',
            'physics-correctness.electromagnetism.test.ts',
            'physics-correctness.optics.test.ts',
            'physics-correctness.thermodynamics.test.ts',
            'physics-correctness.modern.test.ts'
        ]
    },
    { id: 'L10', name: '人类可读输出 NaN 扫描', pkg: 'visualization', test: 'physics-correctness.l10.test.ts' }
];

/**
 * 在指定目录直接运行 `vitest run <testfile>`, 返回 { code, passed }
 * (不走各包的 `npm test` 脚本, 避免其 JSON reporter 覆盖 .scratch/ 全量测试报告)
 * 用 shell:true 在 Windows 保证 npx 找到正确 cmd 文件
 */
function runLayer(layer) {
    return new Promise(resolveP => {
        const cwd = resolve(root, layer.pkg);
        const isWin = process.platform === 'win32';
        // 直接调 vitest 而非 `npm test`: 各包 test 脚本带 JSON reporter, 分层运行会把
        // .scratch/ 下的全量测试报告覆盖成单层结果, 破坏 count:check --from-report。
        const cmd = isWin ? 'npx.cmd' : 'npx';
        const testFiles = Array.isArray(layer.test) ? layer.test : [layer.test];
        const args = ['vitest', 'run', ...testFiles.map(t => 'tests/accuracy/' + t)];
        if (layer.pkg === 'physics-core' && testFiles.includes('constants.test.ts')) {
            // physics-core 的 constants.test.ts 在 tests/unit 下, 重定向路径
            const idx = args.findIndex(a => a.endsWith('constants.test.ts'));
            if (idx >= 0) args[idx] = 'tests/unit/constants.test.ts';
        }

        const proc = spawn(cmd, args, {
            cwd,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: isWin,
            env: { ...process.env }
        });

        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', d => (stdout += d.toString()));
        proc.stderr.on('data', d => (stderr += d.toString()));
        proc.on('error', err => {
            resolveP({ id: layer.id, name: layer.name, code: 2, passed: false, err: err.message, stdout, stderr });
        });
        proc.on('close', code => {
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
                stderr
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
        log(
            `[${status}] ${layer.id} ${layer.name}${r.passed ? `  ${r.passedCount} cases` : `  (exit=${r.code}, fail=${r.failedCount})`}`
        );
        if (!r.passed && r.stdout) {
            const failLines = r.stdout
                .split('\n')
                .filter(l => /FAIL|AssertionError|Error|✗|×/.test(l))
                .slice(0, 4);
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
        JSON.stringify(report) + '\n'
    );

    if (jsonMode) console.log(JSON.stringify(report, null, 2));

    process.exit(report.failed > 0 ? 1 : 0);
}

main().catch(e => {
    console.error('self-check 运行失败:', e);
    process.exit(2);
});

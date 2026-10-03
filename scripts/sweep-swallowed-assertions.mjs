#!/usr/bin/env node
/**
 * 测试断言空转静态守卫 (#84) —— 「断言不得被空 catch 吞掉」(#72 教训固化)
 *
 * 背景: #72 中 scene-contract.test.ts 把 `expect(v.valid).toBe(true)` 写在
 * `try { … } catch { /* skip *\/ }` 里 —— expect 抛出的 AssertionError 被空 catch 吞掉,
 * 断言空转全绿, 12 个场景的 validate 失败静默存活。这类门禁比没有门禁更糟。
 *
 * 检测两类模式 (AST, TypeScript 编译器 API):
 *   D2  空 catch 包住的 try 体内含断言调用   —— try 里断言抛错被吞 (#72 原型)
 *   D1  catch 块体内含断言调用               —— 若 try 未抛错, 断言根本不执行 (空转变体)
 *
 * 豁免: catch 子句的块内注释 / catch 关键字行 / 其上一行出现 `sweep-allow: 理由`
 * 即跳过 (有意豁免必须写明理由, 理由随代码进 review)。
 *
 * 扫描范围: 测试代码 —— physics-core/tests 与 visualization/tests 全部 ts/tsx,
 * 加上仓库其他位置的 *.test.ts(x) / *.spec.ts(x)。生产代码的防御性空 catch 不在范围 (#84 非目标)。
 *
 * 用法:
 *   node scripts/sweep-swallowed-assertions.mjs            扫描仓库, 违规输出 file:line 并退出 1
 *   node scripts/sweep-swallowed-assertions.mjs --self-test 跑内置用例自检 (不扫仓库)
 *
 * exit-code: 0 = 干净 / 自检通过; 1 = 存在违规 / 自检失败
 */

import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

/** 与其他 scripts 守卫一致的目录排除表 */
const SKIP_DIRS = new Set([
    'node_modules',
    'dist',
    'build',
    'coverage',
    '.git',
    '.agent',
    '.scratch',
    '.github',
    'experiments'
]);

const TEST_TREE_SEGMENTS = ['physics-core/tests', 'visualization/tests'];
const TEST_FILE_PATTERN = /\.(test|spec)\.tsx?$/;

/** 断言调用判定: expect(...) 或 assert* / assert.xxx(...) */
function isAssertionCall(node) {
    if (!ts.isCallExpression(node)) return false;
    const expr = node.expression;
    if (ts.isIdentifier(expr)) {
        return expr.text === 'expect' || /^assert/.test(expr.text);
    }
    if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression)) {
        return /^assert/.test(expr.expression.text);
    }
    return false;
}

/** 子树内是否存在断言调用 */
function containsAssertion(node) {
    let found = false;
    function walk(n) {
        if (found) return;
        if (isAssertionCall(n)) {
            found = true;
            return;
        }
        ts.forEachChild(n, walk);
    }
    walk(node);
    return found;
}

/** 去注释后的块体文本 (仅空白的块 = 空 catch) */
function strippedBlockText(catchClause) {
    const raw = catchClause.block.statements.map(s => s.getFullText()).join('');
    return raw
        .replace(/\/\/[^\n]*/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .trim();
}

/** 豁免标记: catch 块内注释 / catch 关键字行 / 其上一行 */
function hasSweepAllow(catchClause, sourceText, lines) {
    if (/sweep-allow:/.test(catchClause.block.getText(sourceText))) return true;
    const { line } = sourceText.getLineAndCharacterOfPosition(catchClause.getStart());
    const prev = line > 0 ? lines[line - 1] : '';
    const cur = lines[line] ?? '';
    return /sweep-allow:/.test(prev) || /sweep-allow:/.test(cur);
}

/**
 * 扫描单个源文件, 返回违规列表 [{ line, kind, detail }]
 * @param {string} fileName 用于报告的文件标识
 * @param {string} sourceText 源码文本
 */
export function scanSource(fileName, sourceText) {
    const violations = [];
    const lines = sourceText.split(/\r?\n/);
    const sf = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    function report(catchClause, kind, detail) {
        const { line } = sf.getLineAndCharacterOfPosition(catchClause.getStart());
        violations.push({ line: line + 1, kind, detail });
    }

    function visit(node) {
        if (ts.isCatchClause(node)) {
            const tryBlock = node.parent.tryBlock;
            const emptyBody = strippedBlockText(node) === '';
            const tryHasAssertion = tryBlock ? containsAssertion(tryBlock) : false;
            const catchHasAssertion = containsAssertion(node.block);

            if (!hasSweepAllow(node, sf, lines)) {
                if (emptyBody && tryHasAssertion) {
                    report(node, 'D2', '空 catch 包住的 try 体内含断言调用 (断言抛错被吞, #72 模式)');
                }
                if (catchHasAssertion) {
                    report(node, 'D1', 'catch 块体内含断言调用 (try 未抛错时断言空转)');
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(sf);
    return violations;
}

function walkFiles(dir, out) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            walkFiles(full, out);
        } else if (/\.tsx?$/.test(entry.name)) {
            const rel = relative(root, full).replaceAll('\\', '/');
            const inTestTree = TEST_TREE_SEGMENTS.some(seg => rel.startsWith(seg + '/'));
            if (inTestTree || TEST_FILE_PATTERN.test(entry.name)) out.push({ rel, full });
        }
    }
}

function scanRepo() {
    const files = [];
    walkFiles(root, files);
    if (files.length === 0) {
        console.error('❌ 未找到任何测试文件 —— 扫描范围配置可能失效, 请检查 SKIP_DIRS/测试树路径');
        process.exit(1);
    }
    let flagged = 0;
    for (const { rel, full } of files) {
        const violations = scanSource(rel, readFileSync(full, 'utf8'));
        for (const v of violations) {
            flagged++;
            console.error(`❌ ${rel}:${v.line}  [${v.kind}] ${v.detail}`);
        }
    }
    if (flagged > 0) {
        console.error('');
        console.error(`   共 ${flagged} 处 —— 测试断言被空 catch 吞掉/空转 (#84 门禁)。`);
        console.error(`   修复: 断言移出 catch、改为显式记录失败; 确需豁免时在 catch 块注释中写`);
        console.error(`   \`sweep-allow: 理由\` (理由此后进 code review)。`);
        process.exit(1);
    }
    console.log(`✅ 测试断言空转扫描通过 (${files.length} 个测试文件, 0 处空 catch 吞断言)`);
    process.exit(0);
}

// ---------------------------------------------------------------- self-test

function selfTest() {
    const fixture = `import { describe, it, expect } from 'vitest';

describe('fixture', () => {
    it('a: 空 catch 吞 try 断言 (#72 模式) → D2', () => {
        const v = { valid: false };
        try {
            expect(v.valid).toBe(true); // D2-ANCHOR-TRY
        } catch {
            // skip
        }
    });

    it('b: catch 体含断言 → D1', () => {
        try {
            JSON.parse('{');
        } catch (e) {
            expect(e).toBeInstanceOf(Error); // D1-ANCHOR-CATCH
        }
    });

    it('c: 豁免标记生效 → 不报', () => {
        try {
            expect(1).toBe(1);
        } catch {
            // sweep-allow: 旧格式兼容探测, 断言失败属预期分支
        }
    });

    it('d: 无断言防御性 catch → 不报', () => {
        try {
            JSON.parse('{');
        } catch {
            // 防御: 解析失败走默认值
        }
    });
});
`;
    const violations = scanSource('self-test-fixture.ts', fixture);
    const fixtureLines = fixture.split('\n');
    const lineOf = anchor => fixtureLines.findIndex(l => l.includes(anchor)) + 1;

    const expected = [
        { line: lineOf('D2-ANCHOR-TRY') + 1, kind: 'D2' }, // catch 关键字在 try 断言的下一行
        { line: lineOf('D1-ANCHOR-CATCH') - 1, kind: 'D1' } // catch 关键字在 catch 体断言的上一行
    ];
    const actual = violations.map(v => ({ line: v.line, kind: v.kind }));

    const pass =
        actual.length === expected.length &&
        expected.every(e => actual.some(a => a.line === e.line && a.kind === e.kind));

    if (!pass) {
        console.error(`❌ self-test 失败`);
        console.error(`   期望: ${JSON.stringify(expected)}`);
        console.error(`   实际: ${JSON.stringify(actual)}`);
        process.exit(1);
    }
    console.log('✅ self-test 通过: D2/D1 检出、行号正确、豁免与防御 catch 不误报');
    process.exit(0);
}

if (process.argv.includes('--self-test')) {
    selfTest();
} else {
    scanRepo();
}

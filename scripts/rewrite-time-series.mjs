// 确定性重写脚本：折叠 scenes/ 中 A/B 桶 timeConfig 块为 makeTimeSeries()
// 不能用随机值 —— 每个文件内 timeConfig 出现多次，必须按真实行表达式保真替换。
//
// 用法：
//   node scripts/rewrite-time-series.mjs --report     # dry-run：只输出 patch 头，不写
//   node scripts/rewrite-time-series.mjs --apply       # 真正写
//
// 替换契约：
//   A 桶: { duration[: EXPR], dt: EXPR/N, sampleCount: N }    → makeTimeSeries(EXPR, N)
//   B 桶: { duration[: EXPR], dt: <常数>, sampleCount: N }    → makeTimeSeries(EXPR, N, dt常数)
//   C 桶: 留 inline（不匹配任何规则 → 放入 skipReasons）
//   (dt 本身已是 EXPR/N 恰好等式时就算 A；否则 B）
//
// 保证"不损坏 margin 结构"：不碰 timeConfig 对象之外的任何字符。

import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCENES_DIR = path.join(ROOT, 'visualization', 'src', 'scenes', 'scenes');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const REPORT = !APPLY; // 默认 dry-run（违反最小权限：先报告、人工核对后再写）

const IMPORT_LINE = `import { makeTimeSeries } from '../../utils/timeSeries.js';`;

const RELATIVE_TARGETS = [
    'thermodynamics.ts',
    'optics.ts',
    'electromagnetism.ts',
    'modern.ts',
    'mechanics.ts',
];

const targets = RELATIVE_TARGETS.map((n) => path.join(SCENES_DIR, n));

const results = {};

for (const file of targets) {
    const src = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    const rewrites = [];
    const skipped = []; // C 桶 —— 留 inline，收集并打印
    const importEdit = { pos: 0, end: 0, text: IMPORT_LINE, hadImport: false };

    // 记录已有 makeTimeSeries import，避免重复插入
    sf.forEachChild((node) => {
        if (ts.isImportDeclaration(node)) {
            const spec = node.moduleSpecifier.text;
            if (spec.endsWith('utils/timeSeries.js') || spec.endsWith('utils/timeSeries')) {
                const nb = node.namedBindings;
                if (nb && ts.isNamedImports(nb) && nb.elements.some((e) => e.name.text === 'makeTimeSeries')) {
                    importEdit.hadImport = true;
                }
            }
        }
    });

    // 寻找 timeConfig: { ... } 对象字面量（只处理 PropertyAssignment 全形式）
    const visit = (node) => {
        if (ts.isPropertyAssignment(node) && node.name.text === 'timeConfig') {
            const init = node.initializer;
            if (ts.isObjectLiteralExpression(init)) {
                const replace = buildReplacement(init, file);
                if (replace) {
                    rewrites.push({
                        pos: node.getStart(sf),
                        end: node.getEnd(),
                        origin: node.getText(sf).replaceAll(/\s+/g, ' ').slice(0, 90),
                        replacement: replace,
                    });
                } else {
                    skipped.push(`${path.basename(file)}:${sf.getLineAndCharacterOfPosition(node.pos).line+1} ${node.getText(sf).replaceAll(/\s+/g,' ').slice(0,90)}`);
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);

    results[path.basename(file)] = { rewrites, skipped, importEdit, sf, src, file };
}

let totalRewrites = 0;
for (const [name, r] of Object.entries(results)) {
    totalRewrites += r.rewrites.length;
}

console.log(`\n=== 重写报告（${APPLY ? 'APPLY 真正写入' : 'REPORT dry-run 只输出 patch 头'}） ===`);
console.log(`共 ${targets.length} 个文件，${totalRewrites} 处 timeConfig 命中\n`);

// C 桶留 inline 检查：我们只替换 timeConfig 内部完全符合 A/B 规则的节点；其他未命中节点自然不会被放进 results，
// 为了完整也统计 C 桶数量（通过对比 Grep 总共 124 个 timeConfig）。
let totalInlinedLeft = 124 - totalRewrites;
console.log(`  A+B 桶替换: ${totalRewrites} 处`);
console.log(`  C 桶留 inline: ${totalInlinedLeft} 处（应为 3）\n`);

for (const [name, r] of Object.entries(results)) {
    console.log(`FILE ${name} (${r.rewrites.length} 处替换，已有 import ${r.importEdit.hadImport})`);
    for (const w of r.rewrites) {
        console.log(`  - ${w.origin}`);
        console.log(`    → ${w.replacement}`);
    }
}

console.log('\n=== C 桶留 inline（不替换） ===');
let sc = 0;
for (const [, r] of Object.entries(results)) for (const s of r.skipped) { console.log(`  C :: ${s}`); sc++; }
console.log(`C 桶总数: ${sc}`);

if (APPLY) {
    for (const [, r] of Object.entries(results)) {
        // 从末尾向前替换，这样 pos 不会因为前面字符串长度变化而错位。
        let out = r.src;
        const sorted = [...r.rewrites].sort((a, b) => b.pos - a.pos);
        for (const w of sorted) {
            out = out.slice(0, w.pos) + w.replacement + out.slice(w.end);
        }
        if (!r.importEdit.hadImport) {
            // 插入 import 行到现有第一位 import 之前。
            const firstImport = out.match(/^(import .*?;)/m);
            if (firstImport) {
                const idx = out.indexOf(firstImport[1]);
                out = out.slice(0, idx) + IMPORT_LINE + '\n' + out.slice(idx);
            } else {
                out = IMPORT_LINE + '\n' + out;
            }
        }
        fs.writeFileSync(r.file, out, 'utf8');
    }
    console.log('\n已写盘。');
} else {
    console.log('\n只报告；如需真正写盘请重跑 --apply 。');
}

// ---------- 核心分类逻辑 ----------
function buildReplacement(objLit, file) {
    const props = objLit.properties;
    let durExpr = null; // { text, node } — text 用于输出，node 用于 AST 形状判断
    let dtNode = null;
    let scNode = null;
    for (const p of props) {
        // 支持 PropertyAssignment (duration: expr) 与 ShorthandPropertyAssignment (duration)
        let nameText = '';
        if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) nameText = p.name.text;
        else if (ts.isShorthandPropertyAssignment(p)) nameText = p.name.text;
        else continue;

        if (nameText === 'duration') {
            // 简写形式 node 本身即 Identifier；显式形式取 initializer
            durExpr = {
                text: ts.isShorthandPropertyAssignment(p) ? p.name.text : p.initializer.getText(objLit.getSourceFile()),
                node: ts.isShorthandPropertyAssignment(p) ? p.name : p.initializer,
            };
        } else if (nameText === 'dt') {
            if (!ts.isPropertyAssignment(p)) return null; // dt 必须是显式（不可能简写）
            dtNode = p.initializer;
        } else if (nameText === 'sampleCount') {
            if (!ts.isPropertyAssignment(p)) return null;
            scNode = p.initializer;
        }
    }
    if (!durExpr || !dtNode || !scNode) return null; // 缺任一字段则视作 C 桶

    // 1) sampleCount 必须是字面量整数 → N
    if (!ts.isNumericLiteral(scNode)) return null; // 公式 C 桶
    const N = Number(scNode.text);

    // 2) duration 表达式文本（保留原始表达式以维护 margin 结构）
    const durText = durExpr.text;

    // 3) 判断 dt 形状
    //    A 桶：dt 是 EXPR/N 或 EXPR/N（duration 文本除以 N）
    const dtText = dtNode.getText(objLit.getSourceFile());

    if (isDurationDivN(durExpr.node, dtNode, dtText, durText, N)) {
        // A 桶
        return `timeConfig: makeTimeSeries(${durText}, ${N})`;
    }

    //    B 桶：dt 是常数（不与 duration 直接关联） → 三参数形式
    if (ts.isNumericLiteral(dtNode)) {
        const dtVal = dtNode.text;
        return `timeConfig: makeTimeSeries(${durText}, ${N}, ${dtVal})`;
    }

    //    dt 是二元表达式（如 duration/100）或带括号的表达式 → B 桶，三参数保留原表达式
    //    注意：CallExpression（Math.min/Math.max 等 clamp）不进入此分支，留 C 桶 inline
    if (dtNode.kind === ts.SyntaxKind.BinaryExpression || ts.isParenthesizedExpression(dtNode)) {
        // 在 B 桶里 dt 表达式恰好等于 duration/N 的已经在上面 A 桶抓走；此处是 dt 用不同公式
        // 保留原始 dt 表达式以避免损坏物理语义
        return `timeConfig: makeTimeSeries(${durText}, ${N}, ${dtText})`;
    }

    return null; // C 桶
}

// 判断 dt 节点是否"恰好是 duration / N"
function isDurationDivN(durNode, dtNode, dtText, durText, N) {
    // 模式 1：dt 是 BinaryExpression EXPR / NumericLiteral(N)，且左侧 EXPR 与 duration 文本一致
    if (ts.isBinaryExpression(dtNode) && dtNode.operatorToken.kind === ts.SyntaxKind.SlashToken) {
        const left = dtNode.left;
        const right = dtNode.right;
        if (ts.isNumericLiteral(right) && Number(right.text) === N) {
            const leftText = left.getText(dtNode.getSourceFile());
            if (leftText === durText) return true;
        }
    }
    // 模式 2：dt 文本直接等于 durText/N（比如 duration 是 (a*60) 外侧有括号之类）
    // 尝试化简看是否一致（安全保底，实际上模式 1 已覆盖）
    if (dtText === `${durText} / ${N}` || dtText === `(${durText}) / ${N}`) return true;
    return false;
}

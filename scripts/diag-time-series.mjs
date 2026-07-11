// 诊断脚本：对每个 timeConfig: { ... } 对象字面量，输出分类原因（A/B/C/skip）
// 用于查清 rewrite-time-series.mjs 为何只命中 16/121。
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCENES_DIR = path.join(ROOT, 'visualization', 'src', 'scenes', 'scenes');

const RELATIVE_TARGETS = ['thermodynamics.ts', 'optics.ts', 'electromagnetism.ts', 'modern.ts', 'mechanics.ts'];
const targets = RELATIVE_TARGETS.map((n) => path.join(SCENES_DIR, n));

const results = {};
for (const file of targets) {
    const src = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const records = [];
    const visit = (node) => {
        if (ts.isPropertyAssignment(node) && node.name.text === 'timeConfig') {
            const init = node.initializer;
            if (ts.isObjectLiteralExpression(init)) {
                records.push(classify(node, init, sf));
                return;
            }
            records.push({ kind: 'NOT_OBJ', text: node.getText(sf).slice(0, 80) });
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    records.forEach((r) => (r.file = path.basename(file)));
    results[path.basename(file)] = records;
}
for (const [f, recs] of Object.entries(results)) {
    console.log(`\n=== ${f} (${recs.length} timeConfig) ===`);
    for (const r of recs) {
        console.log(`  [${r.kind}] ${r.reason || ''} :: ${r.text}`);
    }
}

function classify(node, objLit, sf) {
    const text = node.getText(sf).replaceAll(/\s+/g, ' ').slice(0, 90);
    const props = objLit.properties;

    // 检查 kind 分布
    const kinds = props.map((p) => ts.SyntaxKind[p.kind]);
    let durNode = null, dtNode = null, scNode = null;
    for (const p of props) {
        if (!ts.isPropertyAssignment(p)) continue;
        if (p.name.text === 'duration') durNode = p.initializer;
        else if (p.name.text === 'dt') dtNode = p.initializer;
        else if (p.name.text === 'sampleCount') scNode = p.initializer;
    }
    if (!durNode || !dtNode || !scNode) {
        return { kind: 'INCOMPLETE', reason: `missing dur/dt/sc — kinds=${kinds.join(',')}`, text };
    }
    if (!ts.isNumericLiteral(scNode)) {
        const scKind = ts.SyntaxKind[scNode.kind];
        // 是不是 duration/N 之类？(example L726 sampleCount = Math.min(...)) 真留 inline
        return { kind: 'C_sampleCount', reason: `sampleCount kind=${scKind}`, text };
    }
    const N = Number(scNode.text);
    const durText = durNode.getText(sf);
    const dtText = dtNode.getText(sf);

    // 判断是否为 duration/N
    let isDiv = false;
    if (ts.isBinaryExpression(dtNode) && dtNode.operatorToken.kind === ts.SyntaxKind.SlashToken) {
        const right = dtNode.right;
        if (ts.isNumericLiteral(right) && Number(right.text) === N) {
            const leftText = dtNode.left.getText(sf);
            if (leftText === durText) isDiv = true;
        }
    }
    if (dtText === `${durText} / ${N}` || dtText === `(${durText}) / ${N}`) isDiv = true;

    if (isDiv) {
        return { kind: 'A', reason: `dt === ${durText}/${N}`, text };
    }
    if (ts.isNumericLiteral(dtNode)) {
        return { kind: 'B_literal', reason: `dt=${dtNode.text} (constant)`, text };
    }
    if (dtNode.kind === ts.SyntaxKind.BinaryExpression || ts.isIdentifier(dtNode) || ts.isParenthesizedExpression(dtNode)) {
        return { kind: 'B_expr', reason: `dt expr = ${dtText}`, text };
    }
    return { kind: 'C_other', reason: `dt kind=${ts.SyntaxKind[dtNode.kind]}`, text };
}

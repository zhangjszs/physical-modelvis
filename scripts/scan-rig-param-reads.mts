/**
 * 《高中核心》24 节 rig 参数读取一致性静态扫描 (#159 Phase 2)
 *
 * 根因模式 (#160 在 em-combined 发现, 本轮推广到 24 节):
 *   rig 读 `params['xxx']`, 但场景的 parameters 里根本没有 'xxx' →
 *   `num(params['xxx'], fallback)` 静默回退到 fallback →
 *   标牌显示的是一个**与引擎无关的冻结值**(如 v₀ = 1.0e+6 m/s, 比真值大 1000 倍)。
 *
 * 本脚本对每个场景:
 *   1. 取场景 parameters 的名字集合 S;
 *   2. 静态解析该场景 rig 源码里所有 `params['NAME']` / `params.NAME` 读取;
 *   3. 报告 NAME ∉ S 的读取 (含 fallback 线索)。
 *
 * 用法: npx tsx scripts/scan-rig-param-reads.mts
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadAllScenes, getSceneSync } from '../visualization/src/scenes/sceneRegistry';
import { SCENE_TO_MODULE } from '../visualization/src/components/simulation3d/rigs/index';
import { CLASSROOM_SCRIPTS } from '../visualization/src/scenes/classroomScripts';

const RIG_DIR = path.resolve(process.cwd(), 'visualization/src/components/simulation3d/rigs');
const BUNDLE_DIR = path.join(RIG_DIR, 'bundles');

/** sceneId → rig 文件路径 (从 bundle 源码里解析出 import 与映射) */
function resolveRigFile(sceneId: string): string | null {
    const modKey = SCENE_TO_MODULE[sceneId];
    if (!modKey) return null;
    const bundleFile = path.join(BUNDLE_DIR, `${modKey}Bundle.ts`);
    if (!fs.existsSync(bundleFile)) return null;
    const src = fs.readFileSync(bundleFile, 'utf8');

    // 收集 import { X } from '../xxxRig' 与 import { a, b } from '../xxxRig'
    const importMap = new Map<string, string>();
    const importRe = /import\s*\{([^}]+)\}\s*from\s*'\.\.\/([^']+)'/g;
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(src))) {
        const names = m[1]!
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        const file = m[2]!;
        for (const n of names) {
            const local = n.includes(' as ') ? n.split(' as ')[1]!.trim() : n;
            const orig = n.split(' as ')[0]!.trim();
            importMap.set(local, orig);
        }
    }

    // 找 bundle 默认导出里 sceneId 的值表达式
    const exportStart = src.indexOf('export default');
    const body = exportStart >= 0 ? src.slice(exportStart) : src;
    const lines = body.split('\n');
    for (const line of lines) {
        const mm = line.match(/^\s*['"]?([\w-]+)['"]?\s*:\s*([A-Za-z0-9_]+)\s*,?\s*$/);
        if (mm && mm[1] === sceneId) {
            const local = mm[2]!;
            const orig = importMap.get(local);
            if (!orig) return null;
            const file = path.join(RIG_DIR, `${orig.replace(/\.ts$/, '')}.ts`);
            return fs.existsSync(file) ? file : null;
        }
    }
    return null;
}

/** 提取 rig 源码里所有 params['X'] / params.X 读取 */
function extractParamReads(src: string): Array<{ name: string; index: number; line: number }> {
    const out: Array<{ name: string; index: number; line: number }> = [];
    const bracket = /params\[\s*['"]([\w-]+)['"]\s*\]/g;
    let m: RegExpExecArray | null;
    while ((m = bracket.exec(src))) {
        out.push({ name: m[1]!, index: m.index, line: src.slice(0, m.index).split('\n').length });
    }
    const dot = /params\.([A-Za-z_]\w*)/g;
    while ((m = dot.exec(src))) {
        // 排除 params 后面紧跟的是方法调用 (params.xxx() 是函数, 不是参数读取)
        const after = src[m.index + m[0].length];
        if (after === '(' || after === ')') continue;
        out.push({ name: m[1]!, index: m.index, line: src.slice(0, m.index).split('\n').length });
    }
    return out;
}

/** 该读取是否带 fallback (num(params[...], default) 形态) */
function hasFallback(src: string, index: number): boolean {
    const tail = src.slice(index, index + 120);
    return /,\s*(-?\d|[-'"])/.test(tail) && /num\s*\(/.test(src.slice(Math.max(0, index - 20), index + 10));
}

/**
 * 判断「读到未声明参数」是不是**真死读**。
 *
 * 典型写法: `num(params['theta'] ?? params['angle'], 30)`
 *   - `theta` 是场景声明的参数 → 第一个分支就命中 → `angle` 只是别名, **无害**;
 *   - 但 `num(params['U'] ?? params['voltage'], 100)` 且场景只声明 `Ey`
 *     → 两个分支都没命中 → 静默回退到常量 100 → **死读 (冻结读数)**。
 *
 * 规则: 取 `num(` 之后第一个 `,` 之前的**全部** params 读取链;
 *       链中若存在场景已声明的名字 → 无害; 否则 → 死读。
 */
function isDeadRead(src: string, index: number, declared: Set<string>): { dead: boolean; chain: string[] } {
    // 向前找最近的 `num(` 起点
    const before = src.slice(Math.max(0, index - 60), index);
    const numIdx = before.lastIndexOf('num(');
    const start = numIdx >= 0 ? Math.max(0, index - 60) + numIdx : index;

    // 从 num( 开始到第一个顶层 `,` 之间的内容 = 读取链
    let depth = 0;
    let comma = -1;
    for (let i = start + 4; i < src.length; i++) {
        const ch = src[i];
        if (ch === '(' || ch === '[') depth++;
        else if (ch === ')' || ch === ']') {
            if (depth === 0) break;
            depth--;
        } else if (ch === ',' && depth === 0) {
            comma = i;
            break;
        }
    }
    if (comma < 0) return { dead: false, chain: [] };

    const chainSrc = src.slice(start + 3, comma);
    const chain: string[] = [];
    const re = /params\[\s*['"]([\w-]+)['"]\s*\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(chainSrc))) chain.push(m[1]!);

    if (chain.length === 0) return { dead: false, chain: [] };
    const hit = chain.some(name => declared.has(name));
    return { dead: !hit, chain };
}

(async () => {
    await loadAllScenes();
    const ids = Object.keys(CLASSROOM_SCRIPTS);
    let totalBad = 0;

    for (const id of ids) {
        const scene = getSceneSync(id);
        if (!scene) continue;
        const declared = new Set(scene.parameters.map(p => p.name));
        const rigFile = resolveRigFile(id);
        if (!rigFile) {
            console.log(`[scan] ${id.padEnd(22)} ⚠ 未解析到 rig 文件`);
            continue;
        }
        const src = fs.readFileSync(rigFile, 'utf8');
        const reads = extractParamReads(src);
        const dead: Array<{ name: string; line: number; chain: string[] }> = [];
        for (const r of reads) {
            if (declared.has(r.name)) continue;
            const d = isDeadRead(src, r.index, declared);
            if (d.dead) dead.push({ name: r.name, line: r.line, chain: d.chain });
        }
        const uniqDead = Array.from(new Set(dead.map(b => b.chain.join(' ?? '))));
        if (uniqDead.length === 0) {
            console.log(`[scan] ${id.padEnd(22)} ✓ 参数读取一致 (${reads.length} 处读取 / 声明 ${declared.size} 个)`);
            continue;
        }
        totalBad += uniqDead.length;
        console.log(
            `[scan] ${id.padEnd(22)} ✗ 死读 (整条 ?? 链都没命中场景已声明参数 → 静默回退常量): ${uniqDead.join(' | ')}`
        );
        console.log(`        场景声明: ${[...declared].join(', ')}`);
        for (const b of dead) {
            console.log(
                `        ${path.basename(rigFile)}:${b.line}  ${b.chain.map(c => `params['${c}']`).join(' ?? ')}  ← 静默回退常量`
            );
        }
    }
    console.log(`\n[scan] 合计 ${totalBad} 处「读取场景未声明参数」`);
})().catch(e => {
    console.error('[scan] 失败', e);
    process.exit(1);
});

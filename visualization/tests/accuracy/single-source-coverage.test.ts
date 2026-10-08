/**
 * L11 扩展: 单一真源覆盖登记守卫 (#61, M3 前置 · D9)
 *
 * 把 docs/rendering-physics-audit.md 里原本纯手工复核的两件事固化为机器门禁:
 *   ① 消费守卫 — B-数值自算场景中, draw 函数体「未消费引擎结果」的集合必须恰好等于
 *      本文件登记的豁免表 EXEMPTION_TABLE (首版 = #61 实测 22 项; M3 批次 1 (#62) 销名 5 项,
 *      批次 2 (#63) 销名 4 项, 批次 3 (#64) 迁 B 销名 3 项后现余 10 项「待迁/C 保留」)。
 *      #62–#66 每迁完一个场景就从表里删掉它的名字, 想偷偷回退自算会被拦。
 *   ② 差集守卫 — audit 文档「迁移进展表场景集 Δ 契约覆盖场景集」必须恰好等于 7 项
 *      登记例外 (文档「已迁场景 → 契约覆盖对照」一节, 与本文件 EXCEPTIONS 互链)。
 *
 * 判定口径 (在 #61 issue 实测基础上于 2026-10-07 HEAD 复核, 归一化口径精确复现 22 项):
 *   - 路由: SimulationCanvas.tsx `case '<sceneId>': drawXxx(sceneOpts)` 逐行配对
 *   - 函数体: src/rendering/*.ts 按 `^export function drawXxx` 切到下一个 export function
 *   - 消费: 剥离「解构行」与「if (!simulationResult) 空值判断行」后, 函数体仍含
 *     simulationResult / charts / maxValues / getFrame / diagnostics 任一引用。
 *     仅作空值判断 ≠ 消费 —— thermistor 是 #61 issue 的 worked example
 *     (引擎结果送上门但只用于 drawEmptyState 判空)。
 *
 * 已知局限 (#61 issue 执行须知, 首版保守基线): 判定按 draw 函数体**直接文本引用**;
 * 若某场景经同文件 helper 间接消费引擎结果, 会被误登记为「未消费」。
 * #62–#66 逐场景迁移复核时修正, 不在本守卫内扩大判定复杂度。
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const VIZ_ROOT = join(import.meta.dirname, '../..');
const CANVAS_SRC = join(VIZ_ROOT, 'src/components/simulation/SimulationCanvas.tsx');
const RENDERING_DIR = join(VIZ_ROOT, 'src/rendering');
const CONTRACT_TEST = join(VIZ_ROOT, 'tests/accuracy/single-source-contract.test.ts');
const AUDIT_DOC = join(VIZ_ROOT, '../docs/rendering-physics-audit.md');

/** draw 函数体「消费引擎结果」的判定标记 (#61 口径) */
const CONSUME_RE = /simulationResult|charts|maxValues|getFrame|diagnostics/;

/**
 * ① 豁免表 (首版 22 项 @ 2026-10-07; #62 批次 1 销名 5 项 + #63 批次 2 销名 4 项 + #64 批次 3 迁 3 项 + #65 批次 4 迁 4 项销名后现余 **6 项**): B-数值自算场景中
 * draw 函数体未消费引擎结果的登记名单（含 perpetuum-mobile / heat-direction 两个 C 保留项）。全部「待迁」—— #66 收口批迁移后逐项销名。
 * 来源: #61 issue 未消费清单 (2026-10-02 实测 @ 93b846f), 按渲染文件归组注释。
 */
const EXEMPTION_TABLE: Array<{ sceneId: string; note: string }> = [
    // sensorElementScenes.ts (4) — 已迁 (#63): hall-effect/thermistor/photoresistor/strain-gauge
    //   均改为消费引擎 charts/maxValues, 已从本表销名。
    // thermodynamicLawScenes.ts — #64 批次 3: joule-electrical / adiabatic-compression / energy-transformation 已迁 B (读 maxValues) 销名;
    //   perpetuum-mobile / heat-direction 判 C, 沿用阶段 C 第 5 批「可保留」结论 (audit 文档)
    {
        sceneId: 'perpetuum-mobile',
        note: 'C 保留 (#64): 卡诺效率 1−Tc/Th 与引擎逐字同式 + 转轮为动画示意 (引用 audit 第 5 批可保留清单)'
    },
    {
        sceneId: 'heat-direction',
        note: 'C 保留 (#64): 热流方向为动画示意; Qdot=k·ΔT 取 arb 单位速率, 引擎 x_t/y_t 是 T–t 演化序列本画面不绘, 无对应可消费标量 (引用 audit 第 5 批可保留清单)'
    },
    // gasThermalScenes.ts / molecularKineticScenes.ts / electrostaticEnergyScenes.ts / nuclearRadiationScenes.ts — 已迁 (#65):
    //   gas-law / liquid-mixing / capacitor-charge / radioactive 均改为消费引擎 charts/maxValues, 已从本表销名。
    // electricCircuitScenes.ts (4) — 待迁 (#63–#66)
    { sceneId: 'load-voltage', note: '待迁: 路端电压自算 (兼 B-静态)' },
    { sceneId: 'resistance-law', note: '待迁: 电阻定律自算 (兼 B-静态)' },
    { sceneId: 'vernier-caliper-tool', note: '待迁: 游标卡尺读数自算 (兼 B-静态)' },
    { sceneId: 'micrometer-tool', note: '待迁: 螺旋测微器读数自算 (兼 B-静态)' }
];

/**
 * ② 差集守卫登记例外 (7 项): 迁移进展表 Δ 契约覆盖表的合法差集。
 * 与 docs/rendering-physics-audit.md「已迁场景 → 契约覆盖对照」一节互链 (#35 核定口径)。
 */
const EXCEPTIONS: Array<{ sceneId: string; side: 'migration-only' | 'contract-only'; note: string }> = [
    {
        sceneId: 'transmission-belt',
        side: 'migration-only',
        note: '豁免 (既定不需契约): 引擎仅输出静态关系 charts, 转轮动画属渲染层合理示意图'
    },
    { sceneId: 'decay-statistics', side: 'migration-only', note: '豁免 (装饰动画): 采样进度条/点亮时序无定量迁移' },
    {
        sceneId: 'fission-chain',
        side: 'migration-only',
        note: '豁免 (装饰动画): 级联点亮时序, 定量部分早先批次已读引擎'
    },
    { sceneId: 'uniform-magnetic-field', side: 'migration-only', note: '误入项: 见于「审计副产物」表, 不属迁移进展表' },
    { sceneId: 'newton-second-law', side: 'contract-only', note: '契约侧多出项: 补迁场景, 以用例为准' },
    { sceneId: 'bohr-orbit', side: 'contract-only', note: '契约侧多出项: 部分迁移场景, 以用例为准' },
    { sceneId: 'bohr', side: 'contract-only', note: '契约侧多出项: #31 加用例时漏登记, #35 补上' }
];

// ---------- 解析 (全部从源码/文档推导, 不硬编码场景总数) ----------

/** SimulationCanvas.tsx: case '<sceneId>': → drawXxx(sceneOpts) 路由表 */
function extractRouting(): Map<string, string> {
    const src = readFileSync(CANVAS_SRC, 'utf-8');
    const route = new Map<string, string>();
    for (const m of src.matchAll(/case\s+'([^']+)':\s*\n\s*(draw\w+)\(sceneOpts\)/g)) {
        route.set(m[1]!, m[2]!);
    }
    return route;
}

/** rendering/*.ts: `export function drawXxx` 函数体切片 (到下一个 export function / EOF) */
function extractDrawBodies(): Map<string, string> {
    const fnRe = /^export function (draw\w+)/gm;
    const bodies = new Map<string, string>();
    for (const f of readdirSync(RENDERING_DIR).filter(f => f.endsWith('.ts'))) {
        const src = readFileSync(join(RENDERING_DIR, f), 'utf-8');
        const marks = [...src.matchAll(fnRe)].map(m => ({ name: m[1]!, start: m.index }));
        for (let i = 0; i < marks.length; i++) {
            const end = i + 1 < marks.length ? marks[i + 1]!.start : src.length;
            bodies.set(marks[i]!.name, src.slice(marks[i]!.start, end));
        }
    }
    return bodies;
}

/**
 * 消费判定归一化: 剔除「解构行」与「if (!simulationResult) 判空行」——
 * 这两行是 sceneOpts 管道噪音, 不是对引擎结果的实质消费 (#61 口径, 见文件头注释)。
 */
function normalizedBody(body: string): string {
    return body
        .split('\n')
        .filter(l => !/if\s*\(\s*!simulationResult\s*\)/.test(l))
        .filter(l => !/const\s*\{[^}]*simulationResult[^}]*\}\s*=\s*o\s*;/.test(l))
        .join('\n');
}

/** audit 文档「B-数值自算 (N):a / b / ...」清单解析 */
function extractBNumericList(): { declared: number; items: string[] } {
    const doc = readFileSync(AUDIT_DOC, 'utf-8');
    const m = doc.match(/B-数值自算 \((\d+)\):([\s\S]*?)\n\n/);
    if (!m) throw new Error('audit 文档「B-数值自算 (N):」清单未找到 — 文档结构变更需同步本守卫');
    const declared = Number(m[1]);
    const items = m[2]!
        .split('/')
        .map(s => s.trim())
        .filter(Boolean);
    return { declared, items };
}

/** audit 文档迁移进展表场景集 (首列反引号 sceneId 的表行, 含登记的误入项) */
function extractMigrationSet(): Set<string> {
    const doc = readFileSync(AUDIT_DOC, 'utf-8');
    return new Set([...doc.matchAll(/^\| `([a-z0-9-]+)`/gm)].map(m => m[1]!));
}

/** single-source-contract.test.ts 契约覆盖场景集 (scene('<id>') 用例) */
function extractContractSet(): Set<string> {
    const src = readFileSync(CONTRACT_TEST, 'utf-8');
    return new Set([...src.matchAll(/scene\('([a-z0-9-]+)'\)/g)].map(m => m[1]!));
}

// ---------- 断言 ----------

describe('#61 消费守卫: B-数值自算场景 draw 函数体引擎结果消费登记', () => {
    const routing = extractRouting();
    const bodies = extractDrawBodies();
    const { declared, items: bNumeric } = extractBNumericList();
    const bSet = new Set(bNumeric);

    it('audit 文档 B-数值清单解析完整 (解析数 == 文档自报数)', () => {
        expect(
            { declared, parsed: bNumeric.length },
            'audit 文档「B-数值自算 (N):」清单解析数与自报计数不一致 — 清单可能被重排/截断, 需同步本守卫'
        ).toEqual({ declared, parsed: declared });
    });

    it('B-数值清单每一项都有 SimulationCanvas 路由 (宇宙全覆盖)', () => {
        const unrouted = bNumeric.filter(s => !routing.has(s));
        expect(
            unrouted,
            `以下 B-数值场景在 SimulationCanvas 路由中找不到 (case + drawXxx(sceneOpts) 口径): ${unrouted.join(', ')}`
        ).toEqual([]);
    });

    it('豁免表每一项都仍在 B-数值清单内 (登记表防腐烂)', () => {
        const stale = EXEMPTION_TABLE.map(e => e.sceneId).filter(s => !bSet.has(s));
        expect(stale, `豁免表含已不在 B-数值清单的 sceneId, 应从表中删除: ${stale.join(', ')}`).toEqual([]);
    });

    it('豁免表无重复登记', () => {
        const ids = EXEMPTION_TABLE.map(e => e.sceneId);
        const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
        expect(dup, `豁免表重复登记: ${dup.join(', ')}`).toEqual([]);
    });

    it('B-数值「未消费引擎结果」集合 == 豁免表 (迁移销项 + 回退拦截)', () => {
        const nonConsuming: string[] = [];
        for (const sceneId of bNumeric) {
            const fn = routing.get(sceneId)!;
            const body = bodies.get(fn);
            if (!body) throw new Error(`路由场景 ${sceneId} → ${fn} 的函数体在 src/rendering/*.ts 中未找到`);
            if (!CONSUME_RE.test(normalizedBody(body))) nonConsuming.push(sceneId);
        }
        const tableIds = EXEMPTION_TABLE.map(e => e.sceneId);
        const extra = nonConsuming.filter(s => !tableIds.includes(s));
        const missing = tableIds.filter(s => !nonConsuming.includes(s));
        expect(
            { extra, missing },
            `消费守卫漂移 —\n` +
                `  多出 (draw 函数体未消费引擎结果, 但不在豁免表; 若确认未消费请在表中登记, 已迁移则本断言不应报它):\n    ${extra.join('\n    ')}\n` +
                `  缺少 (豁免表登记为未消费, 但函数体现在有引擎结果引用; 迁移完成后应从表中销名):\n    ${missing.join('\n    ')}`
        ).toEqual({ extra: [], missing: [] });
    });
});

describe('#61 差集守卫: 迁移进展表 Δ 契约覆盖表 == 7 项登记例外', () => {
    const migSet = extractMigrationSet();
    const contractSet = extractContractSet();

    it('对称差集恰好等于登记例外 (多出任何一项即为覆盖缺口)', () => {
        const migOnly = [...migSet].filter(s => !contractSet.has(s)).sort();
        const contractOnly = [...contractSet].filter(s => !migSet.has(s)).sort();
        const expMigOnly = EXCEPTIONS.filter(e => e.side === 'migration-only')
            .map(e => e.sceneId)
            .sort();
        const expContractOnly = EXCEPTIONS.filter(e => e.side === 'contract-only')
            .map(e => e.sceneId)
            .sort();
        expect(
            { migOnly, contractOnly },
            `迁移表−契约表期望 ${JSON.stringify(expMigOnly)} / 契约表−迁移表期望 ${JSON.stringify(expContractOnly)};\n` +
                `实际差异超出登记例外 — 新增迁移场景需按 audit 文档口径同步契约用例或登记例外:\n` +
                `  迁移表−契约表: ${migOnly.join(', ')}\n  契约表−迁移表: ${contractOnly.join(', ')}`
        ).toEqual({ migOnly: expMigOnly, contractOnly: expContractOnly });
    });

    it('例外清单每一项仍在对应集合中 (例外防腐烂)', () => {
        const stale: string[] = [];
        for (const e of EXCEPTIONS) {
            const inMig = migSet.has(e.sceneId);
            const inContract = contractSet.has(e.sceneId);
            if (e.side === 'migration-only' && !inMig) stale.push(`${e.sceneId} 已不在迁移进展表`);
            if (e.side === 'contract-only' && !inContract) stale.push(`${e.sceneId} 已不在契约覆盖表`);
        }
        expect(stale, `登记例外已过时, 应从 EXCEPTIONS 删除或改登记: ${stale.join('; ')}`).toEqual([]);
    });
});

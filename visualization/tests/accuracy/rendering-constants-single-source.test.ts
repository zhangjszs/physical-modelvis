/**
 * 渲染层物理常量单一真源门禁 (#53)
 *
 * 引擎侧有 constants-single-source.test.ts 扫 src/models；本层用**同一套模式口径**
 * （由 physics-core 导出的 LITERAL_PATTERNS / stripCommentsAndStrings，单一真源、非复制粘贴）
 * 扫描 visualization/src/rendering，防止后续场景再内联 g/k/mu0/R/e/c 造成"引擎改了画面不动"的漂移。
 * 依 DECISIONS.md D3：门禁严格度与引擎侧对齐，不做白名单豁免。
 *
 * constants.ts 作为渲染层常量**定义处**被排除（它本就是这些字面量的唯一来源，允许出现）。
 * 模式本身写错会让门禁形同虚设，故与引擎侧共用同一 PATTERN_SAMPLES 做正/负样例自检。
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LITERAL_PATTERNS, stripCommentsAndStrings, PATTERN_SAMPLES } from 'physics-core';

const RENDERING_DIR = join(import.meta.dirname, '../../src/rendering');
const renderingFiles = readdirSync(RENDERING_DIR).filter(f => f.endsWith('.ts') && f !== 'constants.ts');

describe('#53 渲染层常量单一真源', () => {
    describe('rendering/ 计算路径不内联物理常量字面量', () => {
        for (const { name, re } of LITERAL_PATTERNS) {
            it(`rendering/ 中无内联的 ${name}`, () => {
                const offenders: string[] = [];
                for (const file of renderingFiles) {
                    const code = stripCommentsAndStrings(readFileSync(join(RENDERING_DIR, file), 'utf-8'));
                    if (re.test(code)) offenders.push(file);
                }
                expect(
                    offenders,
                    `以下渲染文件在计算代码中内联了 ${name}, 应改为引用 rendering/constants.ts:\n  ${offenders.join('\n  ')}`
                ).toEqual([]);
            });
        }
    });

    describe('#53 门禁模式自检 (正/负样例, 与引擎侧共用同一 PATTERN_SAMPLES)', () => {
        for (const { name, re } of LITERAL_PATTERNS) {
            const samples = PATTERN_SAMPLES[name];
            it(`${name}: 已在 PATTERN_SAMPLES 登记`, () => {
                expect(samples, `LITERAL_PATTERNS 里的 ${name} 缺少 PATTERN_SAMPLES 登记`).toBeDefined();
            });
            it(`${name}: 命中全部正样例`, () => {
                if (!samples) return;
                for (const s of samples.positive) expect(re.test(s), `正样例未被命中: ${JSON.stringify(s)}`).toBe(true);
            });
            it(`${name}: 不命中任何负样例`, () => {
                if (!samples) return;
                for (const s of samples.negative) expect(re.test(s), `负样例被误伤: ${JSON.stringify(s)}`).toBe(false);
            });
        }
    });
});

/**
 * #60 渲染层单位记号 Unicode 收口门禁 (D5/D5a 第四面)
 *
 * 引擎侧 (unit/xUnit/yUnit/explanation) 的断言在 physics-core constants-single-source.test.ts;
 * 本层管渲染展示串: HUD/读数里不得再出现 ASCII 角度/微米记号。防的是
 * `value: \`${theta} deg\`` 这类逐字复制 (#55 F2 的 solidLiquidScenes 原型)。
 *
 * 模式只认两种真实反模式 —— 窄模板 (${...} 后接 deg/um) 与整串 'deg'/'um';
 * `const deg = ...` 这类局部标识符不误伤 (无 ${{} 前缀且非整串字面量)。
 */
describe('#60 渲染层单位记号 Unicode 收口 (deg→° / um→μm, 防回潮)', () => {
    const ASCII_UNIT_RE = /'deg'|'um'|\$\{[^}]*\}\s+(?:deg|um)\b/;

    it('rendering/ 展示串中无 ASCII 单位记号 (${x} deg / ${x} um / 整串 deg|um)', () => {
        const offenders: string[] = [];
        for (const file of renderingFiles) {
            const src = readFileSync(join(RENDERING_DIR, file), 'utf-8');
            if (ASCII_UNIT_RE.test(src)) offenders.push(file);
        }
        expect(
            offenders,
            `以下渲染文件仍有 ASCII 单位展示记号, 应改为 '°' / 'μm' (D5a):\n  ${offenders.join('\n  ')}`
        ).toEqual([]);
    });
});

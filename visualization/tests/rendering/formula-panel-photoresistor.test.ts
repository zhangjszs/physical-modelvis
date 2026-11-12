/**
 * #128 FormulaPanel photoresistor 条目对齐指数式守卫
 *
 * 背景: FormulaPanel 之前用教科书幂律 `R = R₀·(E/E₀)^{−α}` 而引擎/画布用
 * 指数式 `R(E,T) = R_dark·exp(−k·E − 0.02(T−25))` — 同一场景两处面板
 * 模型口径不一致会误导学生。
 * 本文件固化:
 *   ① FormulaPanel photoresistor 条目主式含 exp 且不含幂律 `(E/E₀)^`;
 *   ② 幂律符号 α / E₀ / R₀ 零残留;
 *   ③ 温度系数 0.02 与引擎 TEMP_COEFF 同源出现.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const panelSrc = readFileSync(resolve(__dirname, '../../src/components/formula/FormulaPanel.tsx'), 'utf-8');

/** 提取 photoresistor 条目块 */
function getPhotoresistorBlock(src: string): string {
    const startRe = /^\s+photoresistor:\s*\{/m;
    const m = src.match(startRe);
    if (!m || m.index === undefined) {
        throw new Error('FormulaPanel 未找到 photoresistor 条目');
    }
    const start = m.index;
    // 找下一个同级 key (8 空格缩进 + 场景名 + ':')
    const rest = src.slice(start + 10);
    const endRe = /^\s{4}\w/; // 下一个同级条目开始
    const lines = rest.split('\n');
    let len = 0;
    for (let i = 0; i < lines.length; i++) {
        if (i > 0 && endRe.test(lines[i]!)) break;
        len += lines[i]!.length + 1;
    }
    return src.slice(start, start + 10 + len);
}

const block = getPhotoresistorBlock(panelSrc);

describe('#128 FormulaPanel photoresistor 指数式对齐', () => {
    it('主式含 exp 且不含幂律 (E/E₀)^', () => {
        expect(block, '条目含 exp 指数式').toContain('exp(');
        expect(block, '不再含幂律写法').not.toMatch(/\(E\/E₀\)\^/);
        expect(block, '不再含 (E/E_0)^ 变体').not.toMatch(/\(E\/E_0\)\^/);
    });

    it('幂律专属符号 α / E₀ / R₀ 零残留', () => {
        // α 仅作为灵敏度变量已不用——用 k 替代
        expect(block, '不应含 α (灵敏度指数符号)').not.toContain('α');
        expect(block, '不应含 E₀').not.toContain('E₀');
        expect(block, '不应含 R₀').not.toContain('R₀');
    });

    it('温度项系数 0.02 出现在主式中（与引擎 TEMP_COEFF 同源）', () => {
        // 从引擎提取 TEMP_COEFF 做跨包对照
        const engineSrc = readFileSync(
            resolve(__dirname, '../../../physics-core/src/models/photoresistor.ts'),
            'utf-8'
        );
        const coeffMatch = engineSrc.match(/TEMP_COEFF\s*=\s*([0-9.]+)/);
        expect(coeffMatch, '引擎含 TEMP_COEFF').not.toBeNull();
        const coeff = coeffMatch![1]!;
        expect(block, `展示式含引擎温度系数 ${coeff}`).toContain(coeff);
    });

    it('变量描述含 R_dark 和 k 而非旧式术语', () => {
        expect(block, '含 R_dark 术语').toContain('R_dark');
        expect(block, '含 k 灵敏度').toContain('k');
    });
});

/**
 * 物理常量单一真源契约 (#13)
 *
 * 背景: `units/constants.ts` 定义了 g=9.8 / k / μ₀, 但约 20 处模型各自内联字面量。
 * 数值当时一致(无笔误), 但属**双源** —— 改常量时必然漂移。
 *
 * 本文件固化口径:
 *   1. **计算路径**必须引用 PHYSICS_CONSTANTS, 不得内联物理常量字面量;
 *   2. **展示文本 / 场景参数默认值**允许写字面量(教学口径与 UI 语义, 不是物理计算);
 *   3. 常量表本身必须覆盖常用常数, 且与 CODATA / 教材取值一致。
 *
 * 口径理由: 教材展示常取 g=9.8 而非 9.80665, 混用会让公式讲解与计算值对不上。
 * 故约定"计算走 constants (g=9.8, 教学口径), 展示另行处理"。
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PHYSICS_CONSTANTS } from '../../src/units/constants.js';
// 门禁模式与样例由 units/constantPatterns.ts 提供 (引擎+渲染共用单一真源, #53), 此处不再重复定义。
import { LITERAL_PATTERNS, stripCommentsAndStrings, PATTERN_SAMPLES } from '../../src/units/constantPatterns.js';

const MODELS_DIR = join(import.meta.dirname, '../../src/models');

describe('#13 物理常量单一真源', () => {
    const modelFiles = readdirSync(MODELS_DIR).filter(f => f.endsWith('.ts') && f !== 'base.ts');

    describe('计算路径不内联物理常量字面量', () => {
        for (const { name, re } of LITERAL_PATTERNS) {
            it(`models/ 中无内联的 ${name}`, () => {
                const offenders: string[] = [];
                for (const file of modelFiles) {
                    const code = stripCommentsAndStrings(readFileSync(join(MODELS_DIR, file), 'utf-8'));
                    if (re.test(code)) offenders.push(file);
                }
                expect(
                    offenders,
                    `以下文件在计算代码中内联了 ${name}, 应改为引用 units/constants.js:\n  ${offenders.join('\n  ')}`
                ).toEqual([]);
            });
        }
    });

    describe('常量表覆盖与取值', () => {
        it('g = 9.8 (教材口径, 非 9.80665)', () => {
            expect(PHYSICS_CONSTANTS.g.value).toBe(9.8);
            expect(PHYSICS_CONSTANTS.g_precise.value).toBe(9.80665);
        });

        it('k / mu0 / R 与被替换前的内联值一致 (无数值漂移)', () => {
            expect(PHYSICS_CONSTANTS.k.value).toBe(8.9875517923e9);
            expect(PHYSICS_CONSTANTS.mu0.value).toBe(4 * Math.PI * 1e-7);
            expect(PHYSICS_CONSTANTS.R.value).toBe(8.314);
        });

        it('每个常量都带 value / unit / symbol 三字段', () => {
            for (const [key, c] of Object.entries(PHYSICS_CONSTANTS)) {
                expect(typeof c.value, `${key}.value`).toBe('number');
                expect(typeof c.unit, `${key}.unit`).toBe('string');
                expect(typeof c.symbol, `${key}.symbol`).toBe('string');
            }
        });
    });

    describe('场景参数默认值同样走 constants (无例外, 免得后人记规则)', () => {
        it('gravity 类参数的 defaultValue 引用 PHYSICS_CONSTANTS.g.value', () => {
            const gravityUsers = [
                'centrifugal.ts',
                'galileo-incline.ts',
                'inclined-plane.ts',
                'overweight.ts',
                'sliding-friction.ts',
                'vertical-circle.ts'
            ];
            for (const f of gravityUsers) {
                const src = readFileSync(join(MODELS_DIR, f), 'utf-8');
                expect(src, `${f} 的 defaultValue 应引用 constants`).toContain(
                    'defaultValue: PHYSICS_CONSTANTS.g.value'
                );
            }
        });

        it('gravity 缺省时所有模型回落到 constants.g.value', () => {
            const gravityUsers = [
                'projectile.ts',
                'inclined-plane.ts',
                'sliding-friction.ts',
                'uniform-circular-motion.ts',
                'newton-second-law.ts',
                'inertia.ts',
                'uniform-accelerated.ts',
                'simple-pendulum.ts'
            ];
            for (const f of gravityUsers) {
                const src = readFileSync(join(MODELS_DIR, f), 'utf-8');
                expect(src, `${f} 应引用 PHYSICS_CONSTANTS.g.value`).toContain('PHYSICS_CONSTANTS.g.value');
            }
        });
    });
});

// PATTERN_SAMPLES / LITERAL_PATTERNS 由 units/constantPatterns.ts 提供 (#53, 引擎+渲染共用)。
describe('#51 门禁模式自检 (正/负样例)', () => {
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

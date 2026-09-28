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

const MODELS_DIR = join(import.meta.dirname, '../../src/models');

/** 物理常量的字面量模式 —— 只针对"出现在计算表达式中"的情形 */
const LITERAL_PATTERNS: Array<{ name: string; re: RegExp }> = [
    // 重力加速度 (排除 9.80665 精确值与 9.8xxxx 变体)
    { name: 'g=9.8', re: /(?<![\d.])9\.8(?![\d])/ },
    // 库仑常数
    { name: 'k=8.9875517923e9', re: /8\.9875517923e9/ },
    // 真空磁导率 μ₀ = 4π×10⁻⁷ (展开写法)
    { name: 'mu0=4π×1e-7', re: /4\s*\*\s*Math\.PI\s*\*\s*1e-7/ },
    // 摩尔气体常量
    { name: 'R=8.314', re: /(?<![\d.])8\.314(?![\d])/ },
    // 基本电荷 / 光速
    { name: 'e=1.602176634e-19', re: /(?<![\d.])1\.602176634e-19/ },
    { name: 'c=299792458', re: /(?<![\d.])299792458(?![\d])/ }
];

/**
 * 去掉注释与字符串字面量后再检测 —— 注释/字符串里的常量是**展示文本**, 允许存在。
 */
function stripCommentsAndStrings(src: string): string {
    return (
        src
            // 块注释
            .replace(/\/\*[\s\S]*?\*\//g, ' ')
            // 行注释
            .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
            // 模板字符串 (含插值的整体移除会误伤, 故先移除普通串再处理)
            .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
            .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
            .replace(/`(?:[^`\\]|\\.)*`/g, '``')
    );
}

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

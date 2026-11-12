/**
 * Design Token 静态契约测试 (#138)
 *
 * 验证 visualization/src/styles.css 中设计令牌的完整性与单一真源：
 * 1. 所有 var(--x) 引用的 CSS 变量在 :root 或全局作用域均有明确定义（避免未定义变量隐式回退或解析为透明）；
 * 2. #130 规范 §2 的关键语义令牌全部就绪（--surface / --overlay-bg / --shadow-drawer / --space-* / --text-* / --radius-xs）；
 * 3. :root.light 覆盖浅色颜色令牌（--surface / --overlay-bg / --ok / --warn / --err）；
 * 4. 消除 --surface 的双源与局部硬编码回退（var(--surface, #1e293b) 与 .app.dark 里的 #1e293b）。
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CSS_PATH = join(import.meta.dirname, '../../src/styles.css');
const rawCssContent = readFileSync(CSS_PATH, 'utf-8');
// 剔除 CSS 注释，防注释中的样例或废弃行被误识别为有效定义
const cssContent = rawCssContent.replace(/\/\*[\s\S]*?\*\//g, '');

/** 从 CSS 源码提取特定选择器块内的 CSS 自定义属性定义 */
function extractBlockTokens(css: string, selector: string): Record<string, string> {
    const tokens: Record<string, string> = {};
    // 匹配特定选择器块，确保选择器边界完整（如 :root 不会误匹配 :root.light）
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const blockRegex = new RegExp(`${escapedSelector}(?![.\\w-])\\s*\\{([^}]+)\\}`, 'g');
    let match: RegExpExecArray | null;
    while ((match = blockRegex.exec(css)) !== null) {
        const body = match[1] ?? '';
        const propRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
        let propMatch: RegExpExecArray | null;
        while ((propMatch = propRegex.exec(body)) !== null) {
            const propName = propMatch[1]?.trim();
            const propValue = propMatch[2]?.trim();
            if (propName && propValue) {
                tokens[propName] = propValue;
            }
        }
    }
    return tokens;
}

/** 提取全局所有已定义的 CSS 变量名 */
function extractAllDefinedTokens(css: string): Set<string> {
    const defined = new Set<string>();
    const propRegex = /(--[\w-]+)\s*:/g;
    let match: RegExpExecArray | null;
    while ((match = propRegex.exec(css)) !== null) {
        if (match[1]) defined.add(match[1]);
    }
    return defined;
}

/** 提取全局所有通过 var(--x) 引用的 CSS 变量名 */
function extractAllUsedTokens(css: string): Set<string> {
    const used = new Set<string>();
    const varRegex = /var\(\s*(--[\w-]+)/g;
    let match: RegExpExecArray | null;
    while ((match = varRegex.exec(css)) !== null) {
        if (match[1]) used.add(match[1]);
    }
    return used;
}

describe('#138 Design Token 静态契约测试', () => {
    it('styles.css 中所有 var(--x) 引用的变量均有定义', () => {
        const definedTokens = extractAllDefinedTokens(cssContent);
        const usedTokens = extractAllUsedTokens(cssContent);

        const undefinedTokens: string[] = [];
        for (const token of usedTokens) {
            if (!definedTokens.has(token)) {
                undefinedTokens.push(token);
            }
        }

        expect(
            undefinedTokens,
            `以下 CSS 变量被 var(...) 使用但从未在 styles.css 中定义:\n  ${undefinedTokens.join('\n  ')}`
        ).toEqual([]);
    });

    it(':root 包含 #130 规范 §2 的全部必需 token', () => {
        const rootTokens = extractBlockTokens(cssContent, ':root');

        const requiredTokens = [
            '--surface',
            '--overlay-bg',
            '--shadow-drawer',
            '--space-xs',
            '--space-sm',
            '--space-md',
            '--space-lg',
            '--space-xl',
            '--radius-xs',
            '--text-h1',
            '--text-h2',
            '--text-h3',
            '--text-body',
            '--text-small',
            '--text-mono'
        ];

        const missing: string[] = [];
        for (const token of requiredTokens) {
            if (!(token in rootTokens)) {
                missing.push(token);
            }
        }

        expect(missing, `:root 缺失以下必需 Design Token:\n  ${missing.join('\n  ')}`).toEqual([]);
    });

    it(':root.light 覆盖浅色语义 token', () => {
        const lightTokens = extractBlockTokens(cssContent, ':root.light');

        const requiredLightTokens = ['--surface', '--overlay-bg', '--shadow-drawer', '--ok', '--warn', '--err'];

        const missing: string[] = [];
        for (const token of requiredLightTokens) {
            if (!(token in lightTokens)) {
                missing.push(token);
            }
        }

        expect(missing, `:root.light 缺失以下浅色覆盖 Token:\n  ${missing.join('\n  ')}`).toEqual([]);
        expect(lightTokens['--surface']).toBe('#ffffff');
    });

    it('消除 --surface 双源与硬编码 fallback', () => {
        // 禁止使用带默认值的 var(--surface, #1e293b)
        const fallbackRegex = /var\(\s*--surface\s*,\s*#1e293b\s*\)/g;
        const matches = cssContent.match(fallbackRegex) ?? [];
        expect(matches.length, 'styles.css 仍存在 var(--surface, #1e293b) 回退，应直接使用 var(--surface)').toBe(0);

        // 检查 .app.dark .inspector-tab-btn.active 与 .app.dark .stepper-btn.active 是否硬编码 #1e293b
        const hardcodedTabActive = /\.app\.dark\s+\.inspector-tab-btn\.active\s*\{[^}]*background:\s*#1e293b/i.test(
            cssContent
        );
        const hardcodedStepperActive = /\.app\.dark\s+\.stepper-btn\.active\s*\{[^}]*background:\s*#1e293b/i.test(
            cssContent
        );

        expect(hardcodedTabActive, '.app.dark .inspector-tab-btn.active 仍硬编码 background: #1e293b').toBe(false);
        expect(hardcodedStepperActive, '.app.dark .stepper-btn.active 仍硬编码 background: #1e293b').toBe(false);
    });

    it('styles.css 中不再存在 background: #1e293b 硬编码 (#142)', () => {
        const matches = cssContent.match(/background:\s*#1e293b/gi) ?? [];
        expect(
            matches.length,
            `styles.css 仍存在 ${matches.length} 处 background: #1e293b 硬编码，应使用 var(--surface)`
        ).toBe(0);
    });

    it('首批 Design Token 在 styles.css 中已有实际消费 (#142)', () => {
        const consumedTokens = ['--text-h3', '--text-body', '--text-small', '--space-lg', '--radius-xs'];
        for (const token of consumedTokens) {
            const count = (cssContent.match(new RegExp(`var\\(\\s*${token}\\s*\\)`, 'g')) ?? []).length;
            expect(count, `Token ${token} 在 styles.css 中无消费者`).toBeGreaterThanOrEqual(1);
        }
    });

    it('浮层遮罩与抽屉阴影使用 Design Token (#145)', () => {
        const overlayBgCount = (cssContent.match(/var\(\s*--overlay-bg\s*\)/g) ?? []).length;
        expect(overlayBgCount, 'styles.css 中 var(--overlay-bg) 消费数应至少为 4').toBeGreaterThanOrEqual(4);

        const shadowDrawerCount = (cssContent.match(/var\(\s*--shadow-drawer\s*\)/g) ?? []).length;
        expect(shadowDrawerCount, 'styles.css 中 var(--shadow-drawer) 消费数应至少为 1').toBeGreaterThanOrEqual(1);

        // 验证 4 处 overlay 类均使用 var(--overlay-bg)
        const overlayClasses = ['.ocr-overlay', '.guidance-overlay', '.problem-overlay', '.formula-drawer-overlay'];
        for (const cls of overlayClasses) {
            const escaped = cls.replace('.', '\\.');
            const regex = new RegExp(`${escaped}\\s*\\{[^}]*background:\\s*var\\(--overlay-bg\\)`, 'i');
            expect(regex.test(cssContent), `${cls} 必须使用 background: var(--overlay-bg)`).toBe(true);
        }

        // 验证 .formula-drawer 使用 var(--shadow-drawer)
        expect(
            /\.formula-drawer\s*\{[^}]*box-shadow:\s*var\(--shadow-drawer\)/i.test(cssContent),
            '.formula-drawer 必须使用 box-shadow: var(--shadow-drawer)'
        ).toBe(true);

        // 验证 z-index 梯队
        expect(/\.ocr-overlay\s*\{[^}]*z-index:\s*1000/i.test(cssContent), '.ocr-overlay z-index 应为 1000').toBe(true);
        expect(
            /\.problem-overlay\s*\{[^}]*z-index:\s*1000/i.test(cssContent),
            '.problem-overlay z-index 应为 1000'
        ).toBe(true);
        expect(
            /\.guidance-overlay\s*\{[^}]*z-index:\s*1000/i.test(cssContent),
            '.guidance-overlay z-index 应提升至 1000'
        ).toBe(true);
        expect(
            /\.formula-drawer-overlay\s*\{[^}]*z-index:\s*900/i.test(cssContent),
            '.formula-drawer-overlay z-index 应保持 900'
        ).toBe(true);
    });

    it('输入与按钮控件交互状态遵循设计规范 (#146)', () => {
        // param-input 状态规范
        expect(/\.param-input:hover\s*\{[^}]*border-color:\s*var\(--glass-border-hover\)/i.test(cssContent)).toBe(true);
        expect(
            /\.param-input:(focus-visible|focus)\s*\{[^}]*box-shadow:\s*0 0 0 3px var\(--ring\)/i.test(cssContent)
        ).toBe(true);
        expect(/\.param-input:disabled\s*\{[^}]*opacity:\s*0\.5/i.test(cssContent)).toBe(true);

        // param-slider 状态规范
        expect(/\.param-slider:focus-visible\s*\{[^}]*box-shadow:\s*0 0 0 3px var\(--ring\)/i.test(cssContent)).toBe(
            true
        );
        expect(/\.param-slider:disabled\s*\{[^}]*opacity:\s*0\.4/i.test(cssContent)).toBe(true);

        // composition-field 规范
        expect(
            /\.composition-field\s*input:hover\s*\{[^}]*border-color:\s*var\(--glass-border-hover\)/i.test(cssContent)
        ).toBe(true);
        expect(
            /\.composition-field\s*input:(focus-visible|focus)\s*\{[^}]*box-shadow:\s*0 0 0 3px var\(--ring\)/i.test(
                cssContent
            )
        ).toBe(true);
        expect(/\.composition-field\s*input:disabled\s*\{[^}]*opacity:\s*0\.5/i.test(cssContent)).toBe(true);

        // btn 与 btn-preset 状态规范
        expect(/\.btn:focus-visible\s*\{[^}]*box-shadow:\s*0 0 0 3px var\(--ring\)/i.test(cssContent)).toBe(true);
        expect(/\.btn:disabled\s*\{[^}]*opacity:\s*0\.4/i.test(cssContent)).toBe(true);
        expect(/\.btn-preset:focus-visible\s*\{[^}]*box-shadow:\s*0 0 0 3px var\(--ring\)/i.test(cssContent)).toBe(
            true
        );
        expect(/\.btn-preset:disabled\s*\{[^}]*opacity:\s*0\.4/i.test(cssContent)).toBe(true);
    });
});

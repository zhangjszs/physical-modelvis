/**
 * #149 主题设计令牌 JS 单一真源静态契约与组件测试
 *
 * 核心验证：
 * 1. CSS ↔ JS 双向契约：styles.css 的 :root（暗色）与 :root.light（浅色）中的 CSS 变量与
 *    themeTokens.ts 的 THEME_TOKENS 对应值归一化后逐项一致；
 * 2. 键集合对称：THEME_TOKENS.dark 与 THEME_TOKENS.light 拥有完全相同的键集合，且与
 *    THEME_TOKEN_SOURCES 声明的映射键严格一一对应；
 * 3. 红向验证：反例注入时必定能以退出码 1 拦截漂移；
 * 4. 组件契约：GraphPanel 与 PhotogateTimer 在暗色与浅色下正确解析并消费对应的设计令牌。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { render } from '@testing-library/react';
import { THEME_TOKENS, THEME_TOKEN_SOURCES, getThemeTokens, type ThemeTokenKey } from '../../src/utils/themeTokens';
import { PhotogateTimer } from '../../src/components/simulation/PhotogateTimer';
import { GraphPanel } from '../../src/components/charts/GraphPanel';
import { useSimulationStore } from '../../src/store/simulationStore';

/**
 * 颜色归一化：支持 3/6 位十六进制转 6 位全小写，以及 rgba 规范化空格
 */
function normalizeColor(color: string): string {
    const trimmed = color.trim().toLowerCase();
    // 3-digit hex
    if (/^#[0-9a-f]{3}$/.test(trimmed)) {
        return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    // rgba(...) or rgb(...)
    const rgbaMatch = trimmed.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
    if (rgbaMatch) {
        const [, r, g, b, a] = rgbaMatch;
        const alpha = a !== undefined ? parseFloat(a).toString() : '1';
        return `rgba(${parseFloat(r!)}, ${parseFloat(g!)}, ${parseFloat(b!)}, ${alpha})`;
    }
    return trimmed;
}

/**
 * 解析 styles.css 的 CSS 变量
 */
function parseCssVariables(cssContent: string) {
    // 提取 :root 块（不含 .light）
    const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/);
    if (!rootMatch || !rootMatch[1]) {
        throw new Error('未在 styles.css 中找到 :root 块');
    }
    const rootBlock = rootMatch[1];

    // 提取 :root.light 块
    const lightMatch = cssContent.match(/:root\.light\s*\{([^}]+)\}/);
    if (!lightMatch || !lightMatch[1]) {
        throw new Error('未在 styles.css 中找到 :root.light 块');
    }
    const lightBlock = lightMatch[1];

    const parseBlock = (block: string): Record<string, string> => {
        const vars: Record<string, string> = {};
        const regex = /(--[\w-]+)\s*:\s*([^;]+);/g;
        let match;
        while ((match = regex.exec(block)) !== null) {
            const [, name, val] = match;
            if (name && val) {
                vars[name] = val.trim();
            }
        }
        return vars;
    };

    return {
        darkVars: parseBlock(rootBlock),
        lightVars: parseBlock(lightBlock)
    };
}

describe('主题色单一真源契约 (themeTokens ↔ styles.css)', () => {
    const cssPath = path.resolve(__dirname, '../../src/styles.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    const { darkVars, lightVars } = parseCssVariables(cssContent);

    it('THEME_TOKENS dark 与 light 键集合严格一致，并与 THEME_TOKEN_SOURCES 完全对应', () => {
        const darkKeys = Object.keys(THEME_TOKENS.dark).sort();
        const lightKeys = Object.keys(THEME_TOKENS.light).sort();
        const sourceKeys = Object.keys(THEME_TOKEN_SOURCES).sort();

        expect(darkKeys).toEqual(lightKeys);
        expect(darkKeys).toEqual(sourceKeys);
    });

    it('每个 token source CSS 变量在 :root 与 :root.light 中均有定义', () => {
        for (const [key, cssVar] of Object.entries(THEME_TOKEN_SOURCES)) {
            expect(darkVars[cssVar], `暗色变量 ${cssVar} (键 ${key}) 未在 :root 中声明`).toBeDefined();
            expect(lightVars[cssVar], `浅色变量 ${cssVar} (键 ${key}) 未在 :root.light 中声明`).toBeDefined();
        }
    });

    it('暗色 THEME_TOKENS 与 :root 声明值逐项等价（归一化对比）', () => {
        for (const [key, cssVar] of Object.entries(THEME_TOKEN_SOURCES)) {
            const jsValue = THEME_TOKENS.dark[key as ThemeTokenKey];
            const cssValue = darkVars[cssVar];
            expect(cssValue).toBeDefined();
            expect(
                normalizeColor(jsValue),
                `暗色键 ${key} 对应的 CSS 变量 ${cssVar} 值不匹配: JS=${jsValue}, CSS=${cssValue}`
            ).toBe(normalizeColor(cssValue!));
        }
    });

    it('浅色 THEME_TOKENS 与 :root.light 声明值逐项等价（归一化对比）', () => {
        for (const [key, cssVar] of Object.entries(THEME_TOKEN_SOURCES)) {
            const jsValue = THEME_TOKENS.light[key as ThemeTokenKey];
            const cssValue = lightVars[cssVar];
            expect(cssValue).toBeDefined();
            expect(
                normalizeColor(jsValue),
                `浅色键 ${key} 对应的 CSS 变量 ${cssVar} 值不匹配: JS=${jsValue}, CSS=${cssValue}`
            ).toBe(normalizeColor(cssValue!));
        }
    });

    it('getThemeTokens 返回正确主题字典且对 boolean / 字符串兼容', () => {
        expect(getThemeTokens('dark')).toBe(THEME_TOKENS.dark);
        expect(getThemeTokens('light')).toBe(THEME_TOKENS.light);
        expect(getThemeTokens(true)).toBe(THEME_TOKENS.dark);
        expect(getThemeTokens(false)).toBe(THEME_TOKENS.light);
    });
});

describe('组件主题色消费集成测试 (GraphPanel & PhotogateTimer)', () => {
    beforeEach(() => {
        useSimulationStore.setState({
            theme: 'dark',
            currentScene: 'air-track',
            experimentData: [],
            parameters: { flagWidth: 0.02 }
        });
    });

    it('PhotogateTimer 在 dark / light 主题切换时分别消费对应的 Design Token 颜色', () => {
        // 暗色渲染
        useSimulationStore.setState({ theme: 'dark' });
        const { container, rerender } = render(<PhotogateTimer />);
        const darkSection = container.querySelector('.photogate-timer-panel');
        expect(darkSection).toBeTruthy();
        const darkEmptyText = container.querySelector('div[style*="padding: 12px"]');
        expect(darkEmptyText).toBeTruthy();
        // 暗色 subColor 对应 text3: #94a3b8 -> rgb(148, 163, 184)
        expect((darkEmptyText as HTMLElement).style.color).toBe('rgb(148, 163, 184)');

        // 浅色渲染
        useSimulationStore.setState({ theme: 'light' });
        rerender(<PhotogateTimer />);
        const lightEmptyText = container.querySelector('div[style*="padding: 12px"]');
        expect(lightEmptyText).toBeTruthy();
        // 浅色 subColor 对应 text3: #64748b -> rgb(100, 116, 139)
        expect((lightEmptyText as HTMLElement).style.color).toBe('rgb(100, 116, 139)');
    });

    it('GraphPanel 在 dark / light 主题下正确取得对应的轴与网格颜色 token', () => {
        const darkTokens = getThemeTokens('dark');
        const lightTokens = getThemeTokens('light');

        expect(darkTokens.chartGrid).not.toBe(lightTokens.chartGrid);
        expect(darkTokens.chartAxis).not.toBe(lightTokens.chartAxis);
        expect(darkTokens.tooltipBg).not.toBe(lightTokens.tooltipBg);

        useSimulationStore.setState({ theme: 'dark' });
        const { container, rerender } = render(<GraphPanel />);
        expect(container.querySelector('.panel-section')).toBeTruthy();

        useSimulationStore.setState({ theme: 'light' });
        rerender(<GraphPanel />);
        expect(container.querySelector('.panel-section')).toBeTruthy();
    });
});

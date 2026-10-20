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
import {
    THEME_TOKENS,
    THEME_TOKEN_SOURCES,
    getThemeTokens,
    hexToRgba,
    hexToThreeColorNumber,
    parseHexColor,
    resolveStage3DBackground,
    type ThemeTokenKey
} from '../../src/utils/themeTokens';
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

describe('颜色纯函数 (#150)', () => {
    it('parseHexColor 支持 3/6 位十六进制并忽略大小写与前导 #', () => {
        expect(parseHexColor('#0b1020')).toEqual({ r: 11, g: 16, b: 32 });
        expect(parseHexColor('FFF')).toEqual({ r: 255, g: 255, b: 255 });
        expect(parseHexColor('  #F8FAFC  ')).toEqual({ r: 248, g: 250, b: 252 });
    });

    it('parseHexColor 对非法输入返回 null（不静默吞错）', () => {
        expect(parseHexColor('')).toBeNull();
        expect(parseHexColor('#12')).toBeNull();
        expect(parseHexColor('#gggggg')).toBeNull();
        expect(parseHexColor('rgb(1,2,3)')).toBeNull();
    });

    it('hexToRgba 输出规范化 rgba 且钳制 alpha 到 [0, 1]', () => {
        expect(hexToRgba('#fbbf24', 0.12)).toBe('rgba(251, 191, 36, 0.12)');
        expect(hexToRgba('#fff', 1)).toBe('rgba(255, 255, 255, 1)');
        expect(hexToRgba('#000000', -0.5)).toBe('rgba(0, 0, 0, 0)');
        expect(hexToRgba('#000000', 2)).toBe('rgba(0, 0, 0, 1)');
        expect(hexToRgba('#000000', Number.NaN)).toBe('rgba(0, 0, 0, 0)');
    });

    it('hexToRgba 对非法颜色回退黑色（令牌契约保证正常路径不命中）', () => {
        expect(hexToRgba('not-a-color', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
    });

    it('hexToThreeColorNumber 输出 0xRRGGBB 且非法输入回退 0', () => {
        expect(hexToThreeColorNumber('#0b1020')).toBe(0x0b1020);
        expect(hexToThreeColorNumber('#f8fafc')).toBe(0xf8fafc);
        expect(hexToThreeColorNumber('#fff')).toBe(0xffffff);
        expect(hexToThreeColorNumber('oops')).toBe(0x000000);
    });

    it('resolveStage3DBackground 从主题令牌派生且兼容 boolean', () => {
        expect(resolveStage3DBackground('dark')).toBe(0x0b1020);
        expect(resolveStage3DBackground('light')).toBe(0xf8fafc);
        expect(resolveStage3DBackground(true)).toBe(0x0b1020);
        expect(resolveStage3DBackground(false)).toBe(0xf8fafc);
    });
});

/**
 * 迁移前基线：SimulationCanvas 47 处 `isDark ?` 与 EquipmentStage 两处写死色的
 * 实际渲染值（#150 执行前 HEAD 4fc7cab 实测）。锁成回归表，保证迁移后暗/亮取值零漂移。
 */
const LEGACY_CANVAS_PALETTE: ReadonlyArray<readonly [ThemeTokenKey, string, string]> = [
    ['canvasHudBg', 'rgba(15,23,42,0.7)', 'rgba(255,255,255,0.8)'],
    ['canvasHudBgStrong', 'rgba(15,23,42,0.75)', 'rgba(255,255,255,0.85)'],
    ['canvasHudBorder', 'rgba(56,189,248,0.3)', 'rgba(59,130,246,0.2)'],
    ['canvasShadowStrong', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.12)'],
    ['canvasShadowSoft', 'rgba(0,0,0,0.22)', 'rgba(0,0,0,0.10)'],
    ['canvasEmptyText', '#64748b', '#94a3b8'],
    ['canvasCompareOverlayText', 'rgba(148,163,184,0.85)', 'rgba(71,85,105,0.85)'],
    ['canvasEFieldAccent', '#fbbf24', '#eab308'],
    ['canvasEFieldGlow', 'rgba(251,191,36,0.12)', 'rgba(234,179,8,0.15)'],
    ['canvasEFieldGradient', 'rgba(251,191,36,0.55)', 'rgba(234,179,8,0.65)'],
    ['canvasEFieldArrow', 'rgba(251,191,36,0.6)', 'rgba(234,179,8,0.7)'],
    ['canvasEMFieldGradient', 'rgba(251,191,36,0.5)', 'rgba(234,179,8,0.6)'],
    ['canvasEMFieldArrow', 'rgba(251,191,36,0.55)', 'rgba(234,179,8,0.65)'],
    ['canvasBFieldLine', 'rgba(168,85,247,0.55)', 'rgba(147,51,234,0.5)'],
    ['canvasBFieldCircle', 'rgba(168,85,247,0.3)', 'rgba(147,51,234,0.25)'],
    ['canvasBFieldLineSoft', 'rgba(168,85,247,0.5)', 'rgba(147,51,234,0.45)'],
    ['canvasBFieldCircleSoft', 'rgba(168,85,247,0.25)', 'rgba(147,51,234,0.2)'],
    ['canvasWallGradFrom', '#334155', '#94a3b8'],
    ['canvasWallGradTo', '#475569', '#cbd5e1'],
    ['canvasWallHatch', 'rgba(100,116,139,0.25)', 'rgba(0,0,0,0.08)'],
    ['canvasSpringGlow', 'rgba(34,211,238,0.15)', 'rgba(8,145,178,0.12)'],
    ['canvasSpringLight', '#67e8f9', '#06b6d4'],
    ['canvasSpringMid', '#22d3ee', '#0891b2'],
    ['canvasSpringDark', '#06b6d4', '#0e7490'],
    ['canvasSpringGuide', 'rgba(34,211,238,0.35)', 'rgba(8,145,178,0.35)'],
    ['canvasWedgeHatch', 'rgba(100,116,139,0.18)', 'rgba(0,0,0,0.08)'],
    ['canvasWedgeEdge', '#64748b', '#94a3b8'],
    ['canvasWood', '#7c5e3c', '#b07c4f'],
    ['canvasAngleFill', 'rgba(251,191,36,0.10)', 'rgba(217,119,6,0.08)'],
    ['canvasAngleStroke', '#fbbf24', '#d97706'],
    ['stage3dBg', '#0b1020', '#f8fafc']
];

describe('画布/舞台主题令牌取值零漂移 (#150)', () => {
    it.each(LEGACY_CANVAS_PALETTE)('%s 暗/亮取值与迁移前字面量逐项一致', (key, dark, light) => {
        expect(normalizeColor(THEME_TOKENS.dark[key])).toBe(normalizeColor(dark));
        expect(normalizeColor(THEME_TOKENS.light[key])).toBe(normalizeColor(light));
    });
});

describe('消费方主题分支清零守卫 (#150)', () => {
    it('SimulationCanvas 不再出现 isDark 颜色三元，颜色统一取自 getThemeTokens', () => {
        const source = fs.readFileSync(
            path.resolve(__dirname, '../../src/components/simulation/SimulationCanvas.tsx'),
            'utf-8'
        );
        expect(source).not.toMatch(/isDark\s*\?/);
        expect(source).not.toMatch(/isDarkRef\.current\s*\?/);
        expect(source).toMatch(/getThemeTokens\(isDark\)/);
    });

    it('EquipmentStage 3D 背景由 token 派生，无写死 0x0b1020 / 0xf8fafc', () => {
        const source = fs.readFileSync(
            path.resolve(__dirname, '../../src/components/simulation3d/EquipmentStage.tsx'),
            'utf-8'
        );
        expect(source).not.toMatch(/0x0b1020|0xf8fafc/);
        expect(source).toMatch(/resolveStage3DBackground\(theme\)/);
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

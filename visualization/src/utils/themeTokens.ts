/**
 * 主题设计令牌 JS 单一真源映射表（#149 · D45 第 ④ 类专项）
 *
 * 核心原则：
 * 1. CSS 变量为唯一真源，定义于 styles.css 的 :root（暗色）与 :root.light（浅色）；
 * 2. THEME_TOKEN_SOURCES 声明每个语义键对应的 CSS 变量名；
 * 3. THEME_TOKENS 提供暗/浅色离线静态解析值（供 Canvas/SVG/Recharts 图表与内联样式消费）；
 * 4. 契约测试 theme-tokens.test.ts 逐项比对 styles.css，确保表值与 CSS 变量严格等价、键集合一致。
 */

export type ThemeMode = 'dark' | 'light';

export const THEME_TOKEN_SOURCES = {
    // 图表常用
    chartAxis: '--text3',
    chartGrid: '--chart-grid',
    chartMarker: '--chart-marker',
    tooltipBg: '--tooltip-bg',
    tooltipBorder: '--tooltip-border',
    tooltipText: '--tooltip-text',

    // 核心语义色
    ok: '--ok',
    warn: '--warn',
    err: '--err',
    text1: '--text',
    text3: '--text3',

    // 仪表读数与仪器
    readoutText: '--readout-text',
    readoutParamBg: '--readout-param-bg',
    readoutDivider: '--readout-divider',
    readoutUniformBg: '--readout-uniform-bg',
    readoutNonuniformBg: '--readout-nonuniform-bg',
    photogateCardBg: '--photogate-card-bg',
    photogateCardBlockedBg: '--photogate-card-blocked-bg',
    photogateCardBorder: '--photogate-card-border',
    photogatePillBg: '--photogate-pill-bg',
    photogateTubeBg: '--photogate-tube-bg',
    photogateTubeBorder: '--photogate-tube-border',
    photogateTubeMuted: '--photogate-tube-muted',
    photogateCyan: '--photogate-cyan',
    photogateTimeBlocked: '--photogate-time-blocked'
} as const;

export type ThemeTokenKey = keyof typeof THEME_TOKEN_SOURCES;
export type ThemeTokens = Record<ThemeTokenKey, string>;

export const THEME_TOKENS: Record<ThemeMode, ThemeTokens> = {
    dark: {
        chartAxis: '#94a3b8',
        chartGrid: '#1e293b',
        chartMarker: '#f59e0b',
        tooltipBg: '#1e293b',
        tooltipBorder: '#334155',
        tooltipText: '#e2e8f0',
        ok: '#22c55e',
        warn: '#f59e0b',
        err: '#ef4444',
        text1: '#f1f5f9',
        text3: '#94a3b8',
        readoutText: '#e2e8f0',
        readoutParamBg: 'rgba(15, 23, 42, 0.5)',
        readoutDivider: '#334155',
        readoutUniformBg: 'rgba(34, 197, 94, 0.15)',
        readoutNonuniformBg: 'rgba(245, 158, 11, 0.15)',
        photogateCardBg: 'rgba(15, 23, 42, 0.6)',
        photogateCardBlockedBg: 'rgba(239, 68, 68, 0.12)',
        photogateCardBorder: '#334155',
        photogatePillBg: 'rgba(0, 0, 0, 0.4)',
        photogateTubeBg: '#020617',
        photogateTubeBorder: '#1e293b',
        photogateTubeMuted: '#64748b',
        photogateCyan: '#22d3ee',
        photogateTimeBlocked: '#fca5a5'
    },
    light: {
        chartAxis: '#64748b',
        chartGrid: '#e2e8f0',
        chartMarker: '#b45309',
        tooltipBg: '#ffffff',
        tooltipBorder: '#e2e8f0',
        tooltipText: '#1e293b',
        ok: '#16a34a',
        warn: '#b45309',
        err: '#dc2626',
        text1: '#0f172a',
        text3: '#64748b',
        readoutText: '#1e293b',
        readoutParamBg: 'rgba(241, 245, 249, 0.8)',
        readoutDivider: '#cbd5e1',
        readoutUniformBg: 'rgba(34, 197, 94, 0.1)',
        readoutNonuniformBg: 'rgba(245, 158, 11, 0.1)',
        photogateCardBg: 'rgba(15, 23, 42, 0.85)',
        photogateCardBlockedBg: 'rgba(239, 68, 68, 0.08)',
        photogateCardBorder: '#1e293b',
        photogatePillBg: 'rgba(255, 255, 255, 0.1)',
        photogateTubeBg: '#000000',
        photogateTubeBorder: '#0f172a',
        photogateTubeMuted: '#64748b',
        photogateCyan: '#22d3ee',
        photogateTimeBlocked: '#fca5a5'
    }
};

/**
 * 获取当前主题的设计令牌解析值字典。
 * 支持传 'dark' | 'light' 或 boolean（true 代表 dark，false 代表 light）。
 */
export function getThemeTokens(theme: ThemeMode | boolean): ThemeTokens {
    const mode: ThemeMode = typeof theme === 'boolean' ? (theme ? 'dark' : 'light') : theme;
    return THEME_TOKENS[mode] ?? THEME_TOKENS.dark;
}

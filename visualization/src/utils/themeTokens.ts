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
    photogateTimeBlocked: '--photogate-time-blocked',

    // 2D 画布通用层（#150 · SimulationCanvas）
    canvasHudBg: '--canvas-hud-bg',
    canvasHudBgStrong: '--canvas-hud-bg-strong',
    canvasHudBorder: '--canvas-hud-border',
    canvasShadowStrong: '--canvas-shadow-strong',
    canvasShadowSoft: '--canvas-shadow-soft',
    canvasEmptyText: '--canvas-empty-text',
    canvasCompareOverlayText: '--canvas-compare-overlay-text',

    // 匀强电场 / 电磁复合场（#150）
    canvasEFieldAccent: '--canvas-efield-accent',
    canvasEFieldGlow: '--canvas-efield-glow',
    canvasEFieldGradient: '--canvas-efield-gradient',
    canvasEFieldArrow: '--canvas-efield-arrow',
    canvasEMFieldGradient: '--canvas-emfield-gradient',
    canvasEMFieldArrow: '--canvas-emfield-arrow',

    // 磁场符号（#150）
    canvasBFieldLine: '--canvas-bfield-line',
    canvasBFieldCircle: '--canvas-bfield-circle',
    canvasBFieldLineSoft: '--canvas-bfield-line-soft',
    canvasBFieldCircleSoft: '--canvas-bfield-circle-soft',

    // 弹簧振子 / 斜面楔体（#150）
    canvasWallGradFrom: '--canvas-wall-grad-from',
    canvasWallGradTo: '--canvas-wall-grad-to',
    canvasWallHatch: '--canvas-wall-hatch',
    canvasSpringGlow: '--canvas-spring-glow',
    canvasSpringLight: '--canvas-spring-light',
    canvasSpringMid: '--canvas-spring-mid',
    canvasSpringDark: '--canvas-spring-dark',
    canvasSpringGuide: '--canvas-spring-guide',
    canvasWedgeHatch: '--canvas-wedge-hatch',
    canvasWedgeEdge: '--canvas-wedge-edge',
    canvasWood: '--canvas-wood',
    canvasAngleFill: '--canvas-angle-fill',
    canvasAngleStroke: '--canvas-angle-stroke',

    // 3D 实验舞台（#150 · EquipmentStage）
    stage3dBg: '--stage3d-bg'
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
        photogateTimeBlocked: '#fca5a5',
        canvasHudBg: 'rgba(15, 23, 42, 0.7)',
        canvasHudBgStrong: 'rgba(15, 23, 42, 0.75)',
        canvasHudBorder: 'rgba(56, 189, 248, 0.3)',
        canvasShadowStrong: 'rgba(0, 0, 0, 0.3)',
        canvasShadowSoft: 'rgba(0, 0, 0, 0.22)',
        canvasEmptyText: '#64748b',
        canvasCompareOverlayText: 'rgba(148, 163, 184, 0.85)',
        canvasEFieldAccent: '#fbbf24',
        canvasEFieldGlow: 'rgba(251, 191, 36, 0.12)',
        canvasEFieldGradient: 'rgba(251, 191, 36, 0.55)',
        canvasEFieldArrow: 'rgba(251, 191, 36, 0.6)',
        canvasEMFieldGradient: 'rgba(251, 191, 36, 0.5)',
        canvasEMFieldArrow: 'rgba(251, 191, 36, 0.55)',
        canvasBFieldLine: 'rgba(168, 85, 247, 0.55)',
        canvasBFieldCircle: 'rgba(168, 85, 247, 0.3)',
        canvasBFieldLineSoft: 'rgba(168, 85, 247, 0.5)',
        canvasBFieldCircleSoft: 'rgba(168, 85, 247, 0.25)',
        canvasWallGradFrom: '#334155',
        canvasWallGradTo: '#475569',
        canvasWallHatch: 'rgba(100, 116, 139, 0.25)',
        canvasSpringGlow: 'rgba(34, 211, 238, 0.15)',
        canvasSpringLight: '#67e8f9',
        canvasSpringMid: '#22d3ee',
        canvasSpringDark: '#06b6d4',
        canvasSpringGuide: 'rgba(34, 211, 238, 0.35)',
        canvasWedgeHatch: 'rgba(100, 116, 139, 0.18)',
        canvasWedgeEdge: '#64748b',
        canvasWood: '#7c5e3c',
        canvasAngleFill: 'rgba(251, 191, 36, 0.1)',
        canvasAngleStroke: '#fbbf24',
        stage3dBg: '#0b1020'
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
        photogateTimeBlocked: '#fca5a5',
        canvasHudBg: 'rgba(255, 255, 255, 0.8)',
        canvasHudBgStrong: 'rgba(255, 255, 255, 0.85)',
        canvasHudBorder: 'rgba(59, 130, 246, 0.2)',
        canvasShadowStrong: 'rgba(0, 0, 0, 0.12)',
        canvasShadowSoft: 'rgba(0, 0, 0, 0.1)',
        canvasEmptyText: '#94a3b8',
        canvasCompareOverlayText: 'rgba(71, 85, 105, 0.85)',
        canvasEFieldAccent: '#eab308',
        canvasEFieldGlow: 'rgba(234, 179, 8, 0.15)',
        canvasEFieldGradient: 'rgba(234, 179, 8, 0.65)',
        canvasEFieldArrow: 'rgba(234, 179, 8, 0.7)',
        canvasEMFieldGradient: 'rgba(234, 179, 8, 0.6)',
        canvasEMFieldArrow: 'rgba(234, 179, 8, 0.65)',
        canvasBFieldLine: 'rgba(147, 51, 234, 0.5)',
        canvasBFieldCircle: 'rgba(147, 51, 234, 0.25)',
        canvasBFieldLineSoft: 'rgba(147, 51, 234, 0.45)',
        canvasBFieldCircleSoft: 'rgba(147, 51, 234, 0.2)',
        canvasWallGradFrom: '#94a3b8',
        canvasWallGradTo: '#cbd5e1',
        canvasWallHatch: 'rgba(0, 0, 0, 0.08)',
        canvasSpringGlow: 'rgba(8, 145, 178, 0.12)',
        canvasSpringLight: '#06b6d4',
        canvasSpringMid: '#0891b2',
        canvasSpringDark: '#0e7490',
        canvasSpringGuide: 'rgba(8, 145, 178, 0.35)',
        canvasWedgeHatch: 'rgba(0, 0, 0, 0.08)',
        canvasWedgeEdge: '#94a3b8',
        canvasWood: '#b07c4f',
        canvasAngleFill: 'rgba(217, 119, 6, 0.08)',
        canvasAngleStroke: '#d97706',
        stage3dBg: '#f8fafc'
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

/** 解析后的 RGB 通道（0-255，整数） */
export interface RgbChannels {
    r: number;
    g: number;
    b: number;
}

/**
 * 解析 #rgb / #rrggbb 十六进制颜色。
 *
 * 设计为纯函数：不依赖 DOM / Canvas，便于单测与在 Node 侧复用。
 * 非法输入返回 null（调用方决定回退策略，不在此静默吞错）。
 */
export function parseHexColor(hex: string): RgbChannels | null {
    const normalized = hex.trim().replace(/^#/, '').toLowerCase();
    if (/^[0-9a-f]{3}$/.test(normalized)) {
        return {
            r: parseInt(normalized[0]! + normalized[0]!, 16),
            g: parseInt(normalized[1]! + normalized[1]!, 16),
            b: parseInt(normalized[2]! + normalized[2]!, 16)
        };
    }
    if (/^[0-9a-f]{6}$/.test(normalized)) {
        return {
            r: parseInt(normalized.slice(0, 2), 16),
            g: parseInt(normalized.slice(2, 4), 16),
            b: parseInt(normalized.slice(4, 6), 16)
        };
    }
    return null;
}

/**
 * 十六进制颜色 + 透明度 → Canvas/CSS 可消费的 rgba() 字符串。
 *
 * - alpha 会被钳制到 [0, 1] 并保留 3 位小数；
 * - 非法颜色回退为黑色（令牌表由契约测试锁定，正常路径不会命中）。
 */
export function hexToRgba(hex: string, alpha: number): string {
    const rgb = parseHexColor(hex) ?? { r: 0, g: 0, b: 0 };
    const clamped = Math.min(1, Math.max(0, Number.isFinite(alpha) ? alpha : 0));
    const a = Math.round(clamped * 1000) / 1000;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

/**
 * 十六进制颜色 → THREE.Color 可消费的 24 位整数（0xRRGGBB）。
 *
 * 供 EquipmentStage 等 3D 路径把 CSS 真源令牌转成 Three.js 颜色数值；
 * 非法输入回退为 0x000000。
 */
export function hexToThreeColorNumber(hex: string): number {
    const rgb = parseHexColor(hex);
    if (!rgb) return 0x000000;
    return (rgb.r << 16) | (rgb.g << 8) | rgb.b;
}

/** 3D 实验舞台背景色（含雾效）的 Three.js 数值，由主题令牌派生。 */
export function resolveStage3DBackground(theme: ThemeMode | boolean): number {
    return hexToThreeColorNumber(getThemeTokens(theme).stage3dBg);
}

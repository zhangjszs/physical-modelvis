/** 组件配色方案 */
export const COLORS = {
    // 物体
    body: '#3b82f6',
    bodyAlt: '#ef4444',

    // 向量
    velocity: '#22c55e',
    acceleration: '#f97316',
    force: '#ef4444',
    gravity: '#a855f7',

    // 轨迹
    trajectory: '#60a5fa',

    // 坐标轴
    axis: '#64748b',
    grid: '#1e293b',
    gridLight: '#f1f5f9',

    // 能量
    kinetic: '#22c55e',
    potential: '#3b82f6',
    total: '#f59e0b',

    // 诊断
    ok: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',

    // 背景
    bgDark: '#0f172a',
    bgLight: '#ffffff',
    panelDark: '#1e293b',
    panelLight: '#f8fafc',
    textDark: '#e2e8f0',
    textLight: '#1e293b'
} as const;

/** 曲线图颜色 */
export const GRAPH_COLORS = [
    '#3b82f6',
    '#22c55e',
    '#ef4444',
    '#f59e0b',
    '#a855f7',
    '#ec4899',
    '#06b6d4',
    '#84cc16'
] as const;

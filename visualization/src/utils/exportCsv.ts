import type { SimulationResult, TrajectoryPoint } from 'physics-core';

/**
 * 仿真结果导出 — CSV 生成纯函数 + 浏览器下载。
 * CSV 采用逗号分隔, 支持 Excel 直接打开 (下载时附加 BOM)。
 */

/** 数字单元格格式化: 有限值截断到 6 位小数, 非有限值输出空串 */
export function formatCell(value: number): string {
    if (!Number.isFinite(value)) return '';
    return String(Math.round(value * 1e6) / 1e6);
}

/** 含逗号/引号/换行的字段加引号转义 */
export function escapeCsvField(field: string): string {
    if (/[",\n\r]/.test(field)) {
        return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
}

/** 生成一行 CSV */
export function csvRow(fields: Array<string | number>): string {
    return fields.map(f => (typeof f === 'number' ? formatCell(f) : escapeCsvField(f))).join(',');
}

/**
 * 轨迹 → CSV。列 = time + 每个物体 x/y/vx/vy;
 * 行数取最长轨迹, 缺帧的物体对应单元格留空。
 */
export function trajectoriesToCsv(trajectories: readonly TrajectoryPoint[][]): string {
    const header = csvRow([
        'time (s)',
        ...trajectories.flatMap((_, i) => [
            `body${i + 1} x (m)`,
            `body${i + 1} y (m)`,
            `body${i + 1} vx (m/s)`,
            `body${i + 1} vy (m/s)`
        ])
    ]);
    const rows: string[] = [header];
    const maxLen = trajectories.reduce((m, t) => Math.max(m, t.length), 0);
    for (let i = 0; i < maxLen; i++) {
        const row: Array<string | number> = [];
        const t = trajectories[0]?.[i]?.t;
        if (t !== undefined) row.push(t);
        for (const traj of trajectories) {
            const p = traj[i];
            if (p) {
                row.push(p.position.x, p.position.y, p.velocity.x, p.velocity.y);
            } else {
                row.push('', '', '', '');
            }
        }
        rows.push(csvRow(row));
    }
    return rows.join('\n');
}

/**
 * 图表 → CSV。每个图表一个块, 块之间空行分隔,
 * 块头为 `# 键名 — yLabel (yUnit)` 注释行。
 */
export function chartsToCsv(charts: SimulationResult['charts']): string {
    const blocks: string[] = [];
    for (const [key, series] of Object.entries(charts)) {
        if (!series || !('points' in series) || !Array.isArray(series.points)) continue;
        if (series.points.length === 0) continue;
        const title = `# ${key} — ${series.yLabel} (${series.yUnit})`;
        const header = csvRow([`${series.xLabel} (${series.xUnit})`, `${series.yLabel} (${series.yUnit})`]);
        const body = series.points.map(p => csvRow([p.x, p.y])).join('\n');
        blocks.push([title, header, body].join('\n'));
    }
    return blocks.join('\n\n');
}

/** 组合导出: 头部 meta 注释 + 轨迹 + 图表, 供「导出全部」使用 */
export function buildFullExport(result: SimulationResult, sceneName: string): string {
    const meta = [
        `# ${escapeCsvField(sceneName)} 仿真数据导出`,
        `# model: ${result.meta.model}`,
        `# solver: ${result.meta.solver}`,
        `# timestamp: ${result.meta.timestamp}`,
        `# version: ${result.meta.version}`
    ].join('\n');
    const sections: string[] = [meta];
    if (result.trajectories.some(t => t.length > 0)) {
        sections.push('# === 轨迹数据 ===', trajectoriesToCsv(result.trajectories));
    }
    const charts = chartsToCsv(result.charts);
    if (charts.length > 0) {
        sections.push('# === 图表数据 ===', charts);
    }
    return sections.join('\n\n');
}

/** 浏览器下载 CSV 文件 (UTF-8 BOM, Excel 中文兼容) */
export function downloadCsv(filename: string, content: string): void {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

import { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { downloadCsv, trajectoriesToCsv, chartsToCsv } from '../../utils/exportCsv';

function hasChartData(charts: SimulationResult['charts']): boolean {
    return Object.values(charts).some(c => c && 'points' in c && Array.isArray(c.points) && c.points.length > 0);
}

import type { SimulationResult } from 'physics-core';

/** 导出数据按钮组件 — 下拉菜单:轨迹 CSV / 图表 CSV / 全部 CSV */
export function ExportDataButton() {
    const simulationResult = useSimulationStore(s => s.simulationResult);
    const currentScene = useSimulationStore(s => s.currentScene);
    const [open, setOpen] = useState(false);

    const exportTrajectories = () => {
        if (!simulationResult) return;
        const csv = trajectoriesToCsv(simulationResult.trajectories);
        downloadCsv(`${currentScene}_trajectories.csv`, csv);
        setOpen(false);
    };

    const exportCharts = () => {
        if (!simulationResult) return;
        const csv = chartsToCsv(simulationResult.charts);
        if (!csv) return;
        downloadCsv(`${currentScene}_charts.csv`, csv);
        setOpen(false);
    };

    const exportAll = () => {
        if (!simulationResult) return;
        const trajCsv = trajectoriesToCsv(simulationResult.trajectories);
        const chartCsv = chartsToCsv(simulationResult.charts);
        const sections = [
            `# ${currentScene} 仿真数据导出`,
            `# model: ${simulationResult.meta.model}`,
            `# solver: ${simulationResult.meta.solver}`,
            `# timestamp: ${simulationResult.meta.timestamp}`,
            `# version: ${simulationResult.meta.version}`
        ];
        const combined = [...sections, '# === 轨迹数据 ===', trajCsv]
            .concat(chartCsv ? ['# === 图表数据 ===', chartCsv] : [])
            .filter(Boolean)
            .join('\n\n');
        downloadCsv(`${currentScene}_full.csv`, combined);
        setOpen(false);
    };

    return (
        <div className="export-wrap">
            <button
                className="btn btn-sm"
                onClick={() => setOpen(prev => !prev)}
                aria-haspopup="true"
                aria-expanded={open}
                aria-label="导出数据"
            >
                导出数据
            </button>
            {open && (
                <div className="export-menu" role="menu">
                    <button
                        className="export-menu-item"
                        role="menuitem"
                        onClick={exportTrajectories}
                        disabled={!simulationResult}
                    >
                        轨迹数据 CSV
                    </button>
                    <button
                        className="export-menu-item"
                        role="menuitem"
                        onClick={exportCharts}
                        disabled={!simulationResult || !hasChartData(simulationResult.charts)}
                    >
                        图表数据 CSV
                    </button>
                    <button
                        className="export-menu-item"
                        role="menuitem"
                        onClick={exportAll}
                        disabled={!simulationResult}
                    >
                        全部导出 CSV
                    </button>
                </div>
            )}
        </div>
    );
}

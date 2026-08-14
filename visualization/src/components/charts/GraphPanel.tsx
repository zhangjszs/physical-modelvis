import { useMemo } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { extractGraphSeries } from '../../adapters/simulationResultAdapter';
import type { GraphType } from '../../types/visualization';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Legend
} from 'recharts';

const GRAPH_OPTIONS: Array<{ key: GraphType; label: string }> = [
    { key: 'x_t', label: 'x-t' },
    { key: 'y_t', label: 'y-t' },
    { key: 'vx_t', label: 'vx-t' },
    { key: 'vy_t', label: 'vy-t' },
    { key: 'a_t', label: 'a-t' },
    { key: 'ke_t', label: 'Ek-t' },
    { key: 'pe_t', label: 'Ep-t' },
    { key: 'total_e_t', label: 'E-t' },
    { key: 'F_t', label: 'F-t' },
    { key: 'F_theta', label: 'F-θ' },
    { key: 'f_N', label: 'f-N' }
];

/** 不同图表类型的 x 轴标签配置 */
const X_AXIS_CONFIG: Record<GraphType, { label: string; unit: string }> = {
    x_t: { label: 't', unit: 's' },
    y_t: { label: 't', unit: 's' },
    vx_t: { label: 't', unit: 's' },
    vy_t: { label: 't', unit: 's' },
    a_t: { label: 't', unit: 's' },
    ke_t: { label: 't', unit: 's' },
    pe_t: { label: 't', unit: 's' },
    total_e_t: { label: 't', unit: 's' },
    p_t: { label: 't', unit: 's' },
    F_t: { label: 't', unit: 's' },
    F_theta: { label: 'θ', unit: '°' },
    f_N: { label: 'N', unit: 'N' }
};

/** 判断图表的 x 轴是否为时间轴 (用于决定是否显示当前时间参考线) */
function isTimeBasedChart(graphType: GraphType): boolean {
    return graphType !== 'F_theta' && graphType !== 'f_N';
}

export function GraphPanel() {
    const simulationResult = useSimulationStore(s => s.simulationResult);
    const selectedGraph = useSimulationStore(s => s.selectedGraph);
    const currentScene = useSimulationStore(s => s.currentScene);
    const theme = useSimulationStore(s => s.theme);
    // 高频字段独立订阅: 仅用于 ReferenceLine 位置, 不影响图表数据重建
    const currentTime = useSimulationStore(s => s.currentTime);
    const setSelectedGraph = useSimulationStore(s => s.setSelectedGraph);
    // 参数对比实验
    const compareMode = useSimulationStore(s => s.compareMode);
    const compareResults = useSimulationStore(s => s.compareResults);
    const isDark = theme === 'dark';

    // 对比模式: 从 compareResults 提取所有序列
    const compareSeries = useMemo(() => {
        if (!compareMode || compareResults.length === 0) return [];
        return compareResults
            .map(entry => {
                const series = extractGraphSeries(entry.result, selectedGraph);
                const s = series[0];
                if (!s) return null;
                return {
                    paramValue: entry.paramValue,
                    color: entry.color,
                    label: s.label,
                    unit: s.unit,
                    data: s.data
                };
            })
            .filter((s): s is NonNullable<typeof s> => s !== null);
    }, [compareMode, compareResults, selectedGraph]);

    const inCompareMode = compareMode && compareSeries.length > 0;

    if (!simulationResult && !inCompareMode) {
        return (
            <div className="panel-section">
                <div className="panel-title">曲线图</div>
                <div className="empty-state">等待仿真运行...</div>
            </div>
        );
    }

    // 单仿真模式: 提取序列
    const series = useMemo(
        () => extractGraphSeries(simulationResult!, selectedGraph),
        [simulationResult, selectedGraph]
    );
    const currentSeries = series[0];

    // 对比模式: 构建合并数据集 (按 t 值对齐, 扁平结构供 Recharts 使用)
    const { compareData, compareDataKeys } = useMemo(() => {
        if (!inCompareMode) return { compareData: [], compareDataKeys: [] as string[] };
        // 收集所有唯一的 t 值
        const tSet = new Set<number>();
        for (const s of compareSeries) {
            for (const p of s.data) {
                tSet.add(parseFloat(p.t.toFixed(4)));
            }
        }
        const tArray = Array.from(tSet).sort((a, b) => a - b);
        // 为每条序列分配一个 dataKey
        const dataKeys = compareSeries.map((_s, i) => `s${i}`);
        // 构建扁平行: { t, s0: v0, s1: v1, ... }
        const rows = tArray.map(t => {
            const row: Record<string, number> = { t };
            compareSeries.forEach((s, i) => {
                // 线性插值: 找到 t 在 s.data 中的位置
                let lo = 0;
                let hi = s.data.length - 1;
                while (lo < hi) {
                    const mid = (lo + hi) >> 1;
                    if (s.data[mid]!.t < t) lo = mid + 1;
                    else hi = mid;
                }
                const p0 = s.data[lo]!;
                const prevIdx = Math.max(0, lo - 1);
                const p1 = s.data[prevIdx]!;
                const dt = p0.t - p1.t;
                const frac = dt === 0 ? 0 : (t - p1.t) / dt;
                row[dataKeys[i]!] = p1.value + frac * (p0.value - p1.value);
            });
            return row;
        });
        return { compareData: rows, compareDataKeys: dataKeys };
    }, [inCompareMode, compareSeries]);

    const axisColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#1e293b' : '#e2e8f0';
    const xAxisCfg = X_AXIS_CONFIG[selectedGraph];
    const showTimeRefLine = isTimeBasedChart(selectedGraph);

    // 根据当前场景筛选可用的图表选项
    const availableOptions = GRAPH_OPTIONS.filter(opt => {
        // 第三章场景只显示相关图表
        if (currentScene === 'force-composition') {
            return opt.key === 'F_theta';
        }
        if (currentScene === 'sliding-friction') {
            return opt.key === 'f_N' || opt.key === 'vx_t';
        }
        if (currentScene === 'newton-third-law') {
            return opt.key === 'F_t' || opt.key === 'vx_t';
        }
        if (currentScene === 'hooke-law') {
            return opt.key === 'x_t' || opt.key === 'vx_t';
        }
        // 其他场景隐藏第三章专用图表
        return opt.key !== 'F_theta' && opt.key !== 'f_N' && opt.key !== 'F_t';
    });

    // 单仿真模式数据
    const singleData = useMemo(
        () => currentSeries?.data.map(d => ({ t: parseFloat(d.t.toFixed(4)), value: d.value })) ?? [],
        [currentSeries]
    );

    if (!inCompareMode && !currentSeries) return null;

    return (
        <div className="graph-panel">
            <div className="graph-tabs">
                {availableOptions.map(opt => (
                    <button
                        key={opt.key}
                        className={`btn btn-sm ${selectedGraph === opt.key ? 'active' : ''}`}
                        onClick={() => setSelectedGraph(opt.key)}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
            <div className="graph-container">
                <ResponsiveContainer width="100%" aspect={2.5}>
                    {inCompareMode ? (
                        <LineChart data={compareData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis
                                dataKey="t"
                                stroke={axisColor}
                                tick={{ fontSize: 11 }}
                                label={{
                                    value: `${xAxisCfg.label} (${xAxisCfg.unit})`,
                                    position: 'insideBottomRight',
                                    offset: -4,
                                    fill: axisColor,
                                    fontSize: 11
                                }}
                            />
                            <YAxis
                                stroke={axisColor}
                                tick={{ fontSize: 11 }}
                                label={{
                                    value: `${compareSeries[0]?.label ?? ''} (${compareSeries[0]?.unit ?? ''})`,
                                    angle: -90,
                                    position: 'insideLeft',
                                    fill: axisColor,
                                    fontSize: 11
                                }}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: isDark ? '#1e293b' : '#fff',
                                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                                    borderRadius: 8,
                                    color: isDark ? '#e2e8f0' : '#1e293b',
                                    fontSize: 12
                                }}
                                formatter={(value: number, name: string) => [
                                    `${value.toFixed(4)} ${compareSeries[0]?.unit ?? ''}`,
                                    name
                                ]}
                                labelFormatter={label => `${xAxisCfg.label} = ${label} ${xAxisCfg.unit}`}
                            />
                            <Legend />
                            {showTimeRefLine && (
                                <ReferenceLine
                                    x={parseFloat(currentTime.toFixed(4))}
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    label={{ value: '当前', fill: '#f59e0b', fontSize: 11 }}
                                />
                            )}
                            {compareSeries.map((s, i) => (
                                <Line
                                    key={i}
                                    type="monotone"
                                    dataKey={compareDataKeys[i]!}
                                    stroke={s.color}
                                    strokeWidth={2}
                                    dot={false}
                                    name={`${s.label}=${s.paramValue}`}
                                    connectNulls
                                />
                            ))}
                        </LineChart>
                    ) : (
                        <LineChart data={singleData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis
                                dataKey="t"
                                stroke={axisColor}
                                tick={{ fontSize: 11 }}
                                label={{
                                    value: `${xAxisCfg.label} (${xAxisCfg.unit})`,
                                    position: 'insideBottomRight',
                                    offset: -4,
                                    fill: axisColor,
                                    fontSize: 11
                                }}
                            />
                            <YAxis
                                stroke={axisColor}
                                tick={{ fontSize: 11 }}
                                label={{
                                    value: `${currentSeries!.label} (${currentSeries!.unit})`,
                                    angle: -90,
                                    position: 'insideLeft',
                                    fill: axisColor,
                                    fontSize: 11
                                }}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: isDark ? '#1e293b' : '#fff',
                                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                                    borderRadius: 8,
                                    color: isDark ? '#e2e8f0' : '#1e293b',
                                    fontSize: 12
                                }}
                                formatter={(value: number) => [
                                    `${value.toFixed(4)} ${currentSeries!.unit}`,
                                    currentSeries!.label
                                ]}
                                labelFormatter={label => `${xAxisCfg.label} = ${label} ${xAxisCfg.unit}`}
                            />
                            <Legend />
                            {showTimeRefLine && (
                                <ReferenceLine
                                    x={parseFloat(currentTime.toFixed(4))}
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    label={{ value: '当前', fill: '#f59e0b', fontSize: 11 }}
                                />
                            )}
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={currentSeries!.color}
                                strokeWidth={2}
                                dot={false}
                                name={currentSeries!.label}
                            />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}

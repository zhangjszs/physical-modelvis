import { useSimulationStore } from '../../store/simulationStore';
import { extractGraphSeries } from '../../adapters/simulationResultAdapter';
import type { GraphType } from '../../types/visualization';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
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
];

export function GraphPanel() {
  const { simulationResult, selectedGraph, setSelectedGraph, currentTime, theme } = useSimulationStore();
  const isDark = theme === 'dark';

  if (!simulationResult) {
    return (
      <div className="panel-section">
        <div className="panel-title">曲线图</div>
        <div className="empty-state">等待仿真运行...</div>
      </div>
    );
  }

  const series = extractGraphSeries(simulationResult, selectedGraph);
  const currentSeries = series[0];
  if (!currentSeries) return null;

  const data = currentSeries.data.map(d => ({ t: parseFloat(d.t.toFixed(4)), value: d.value }));
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  return (
    <div className="graph-panel">
      <div className="graph-tabs">
        {GRAPH_OPTIONS.map(opt => (
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
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="t"
              stroke={axisColor}
              tick={{ fontSize: 11 }}
              label={{ value: 't (s)', position: 'insideBottomRight', offset: -4, fill: axisColor, fontSize: 11 }}
            />
            <YAxis
              stroke={axisColor}
              tick={{ fontSize: 11 }}
              label={{ value: `${currentSeries.label} (${currentSeries.unit})`, angle: -90, position: 'insideLeft', fill: axisColor, fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: isDark ? '#1e293b' : '#fff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                borderRadius: 8,
                color: isDark ? '#e2e8f0' : '#1e293b',
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value.toFixed(4)} ${currentSeries.unit}`, currentSeries.label]}
              labelFormatter={(label) => `t = ${label} s`}
            />
            <Legend />
            <ReferenceLine
              x={parseFloat(currentTime.toFixed(4))}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{ value: '当前', fill: '#f59e0b', fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={currentSeries.color}
              strokeWidth={2}
              dot={false}
              name={currentSeries.label}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

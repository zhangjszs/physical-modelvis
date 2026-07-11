import { useSimulationStore } from '../../store/simulationStore';
import { formatValue } from '../../utils/unitFormat';

export function DiagnosticsPanel() {
    const simulationResult = useSimulationStore(s => s.simulationResult);

    if (!simulationResult) {
        return (
            <div className="panel-section">
                <div className="panel-title">诊断报告</div>
                <div className="empty-state">等待仿真运行...</div>
            </div>
        );
    }

    const { diagnostics, meta, errors, warnings } = simulationResult;

    return (
        <div className="panel-section">
            <div className="panel-title">诊断报告</div>

            {/* 求解信息 */}
            <div className="diag-group">
                <div className="diag-item">
                    <span className="diag-label">求解方法</span>
                    <span className="diag-value">{meta.solver === 'analytical' ? '解析解' : '数值积分'}</span>
                </div>
                <div className="diag-item">
                    <span className="diag-label">模型</span>
                    <span className="diag-value">{meta.model}</span>
                </div>
                <div className="diag-item">
                    <span className="diag-label">计算耗时</span>
                    <span className="diag-value">{meta.computationTime.toFixed(2)} ms</span>
                </div>
            </div>

            {/* 守恒量检查 */}
            {diagnostics.conservedQuantities.length > 0 && (
                <div className="diag-group">
                    <div className="diag-subtitle">守恒量检查</div>
                    {diagnostics.conservedQuantities.map((cq, i) => (
                        <div key={i} className={`diag-item ${cq.conserved ? 'ok' : 'warning'}`}>
                            <span className="diag-label">{cq.name}</span>
                            <span className="diag-value">
                                {cq.conserved ? '✓ 守恒' : '⚠ 偏差 ' + formatValue(cq.maxDeviation)}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* 极值 */}
            {Object.keys(diagnostics.maxValues).length > 0 && (
                <div className="diag-group">
                    <div className="diag-subtitle">极值统计</div>
                    {Object.entries(diagnostics.maxValues).map(([key, val]) => (
                        <div key={key} className="diag-item">
                            <span className="diag-label">{key}</span>
                            <span className="diag-value">{formatValue(val)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* 范围检查 */}
            {diagnostics.rangeCheck.warnings.length > 0 && (
                <div className="diag-group">
                    <div className="diag-subtitle">范围检查</div>
                    {diagnostics.rangeCheck.warnings.map((w, i) => (
                        <div key={i} className="diag-item warning">
                            <span className="diag-icon">⚠</span>
                            <span>{w}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* 警告 */}
            {warnings.length > 0 && (
                <div className="diag-group">
                    <div className="diag-subtitle">警告</div>
                    {warnings.map((w, i) => (
                        <div key={i} className="diag-item warning">
                            <span className="diag-icon">⚠</span>
                            <span>{w}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* 错误 */}
            {errors.length > 0 && (
                <div className="diag-group">
                    <div className="diag-subtitle">错误</div>
                    {errors.map((e, i) => (
                        <div key={i} className="diag-item error">
                            <span className="diag-icon">✕</span>
                            <span>
                                [{e.code}] {e.message}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* 一切正常 */}
            {warnings.length === 0 && errors.length === 0 && diagnostics.rangeCheck.warnings.length === 0 && (
                <div className="diag-item ok">
                    <span className="diag-icon">✓</span>
                    <span>所有检查通过</span>
                </div>
            )}
        </div>
    );
}

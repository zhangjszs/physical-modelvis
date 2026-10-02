import { useSimulationStore } from '../../store/simulationStore';
import { findFrameIndex, interpolateFrame } from '../../utils/frameUtils';
import { formatQuantity } from '../../utils/unitFormat';

export function StateInspector() {
    const simulationResult = useSimulationStore(s => s.simulationResult);
    const currentTime = useSimulationStore(s => s.currentTime);

    if (!simulationResult) {
        return (
            <div className="panel-section">
                <div className="panel-title">实时状态</div>
                <div className="empty-state">等待仿真运行...</div>
            </div>
        );
    }

    const points = simulationResult.trajectories[0] ?? [];
    if (points.length === 0) return null;

    const idx = findFrameIndex(simulationResult.trajectories, currentTime);
    const p0 = points[idx]!;
    const p1 = points[Math.min(idx + 1, points.length - 1)]!;
    const frame = interpolateFrame(p0, p1, currentTime);

    const speed = Math.sqrt(frame.velocity.x ** 2 + frame.velocity.y ** 2);
    // 引擎里 acceleration / kineticEnergy / potentialEnergy 都是可选字段:
    // 静态类实验（验电器、库仑构型、传感器曲线等）本就没有运动学与能量语义。
    // 以前一律 `?? 0` 会把"未计算"报成"等于 0 焦耳", 与真值混淆；缺失时显示占位符。
    const accVec = frame.acceleration;
    const accMag = accVec ? Math.sqrt(accVec.x ** 2 + accVec.y ** 2) : null;
    const ke = frame.kineticEnergy ?? null;
    const pe = frame.potentialEnergy ?? null;
    const totalE = ke !== null && pe !== null ? ke + pe : null;
    const NOT_APPLICABLE = '—';

    return (
        <div className="panel-section">
            <div className="panel-title">实时状态</div>
            <div className="state-grid">
                <StateRow label="时间 t" value={formatQuantity(frame.t, 's')} />
                <StateRow label="位置 x" value={formatQuantity(frame.position.x, 'm')} />
                <StateRow label="位置 y" value={formatQuantity(frame.position.y, 'm')} />
                <StateRow label="速度 vx" value={formatQuantity(frame.velocity.x, 'm/s')} />
                <StateRow label="速度 vy" value={formatQuantity(frame.velocity.y, 'm/s')} />
                <StateRow label="速率 |v|" value={formatQuantity(speed, 'm/s')} />
                <StateRow
                    label="加速度 |a|"
                    value={accMag === null ? NOT_APPLICABLE : formatQuantity(accMag, 'm/s²')}
                />
                <StateRow label="动能 Ek" value={ke === null ? NOT_APPLICABLE : formatQuantity(ke, 'J')} />
                <StateRow label="势能 Ep" value={pe === null ? NOT_APPLICABLE : formatQuantity(pe, 'J')} />
                <StateRow label="机械能 E" value={totalE === null ? NOT_APPLICABLE : formatQuantity(totalE, 'J')} />
            </div>
        </div>
    );
}

function StateRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="state-row">
            <span className="state-label">{label}</span>
            <span className="state-value">{value}</span>
        </div>
    );
}

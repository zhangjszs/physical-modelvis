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
    const accMag = frame.acceleration ? Math.sqrt(frame.acceleration.x ** 2 + frame.acceleration.y ** 2) : 0;
    const ke = frame.kineticEnergy ?? 0;
    const pe = frame.potentialEnergy ?? 0;
    const totalE = ke + pe;

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
                <StateRow label="加速度 |a|" value={formatQuantity(accMag, 'm/s²')} />
                <StateRow label="动能 Ek" value={formatQuantity(ke, 'J')} />
                <StateRow label="势能 Ep" value={formatQuantity(pe, 'J')} />
                <StateRow label="机械能 E" value={formatQuantity(totalE, 'J')} />
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

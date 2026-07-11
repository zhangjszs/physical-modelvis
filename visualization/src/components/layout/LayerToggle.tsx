import { useSimulationStore } from '../../store/simulationStore';
import type { VisibleLayers } from '../../types/visualization';

const LAYER_OPTIONS: Array<{ key: keyof VisibleLayers; label: string }> = [
    { key: 'axes', label: '坐标轴' },
    { key: 'grid', label: '网格' },
    { key: 'trajectory', label: '轨迹' },
    { key: 'velocityVector', label: '速度' },
    { key: 'accelerationVector', label: '加速度' },
    { key: 'forceVector', label: '受力' },
    { key: 'bodyLabels', label: '标签' }
];

export function LayerToggle() {
    const visibleLayers = useSimulationStore(s => s.visibleLayers);
    const toggleLayer = useSimulationStore(s => s.toggleLayer);

    return (
        <div className="layer-toggle">
            <div className="panel-title">图层</div>
            <div className="layer-list">
                {LAYER_OPTIONS.map(opt => (
                    <label key={opt.key} className="layer-item">
                        <input type="checkbox" checked={visibleLayers[opt.key]} onChange={() => toggleLayer(opt.key)} />
                        <span>{opt.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

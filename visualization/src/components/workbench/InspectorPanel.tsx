import { useSimulationStore } from '../../store/simulationStore';
import { ParameterPanel } from '../controls/ParameterPanel';
import { ComparePanel } from '../controls/ComparePanel';
import { LayerToggle } from '../layout/LayerToggle';
import { useSceneRig } from './useSceneRig';

interface InspectorPanelProps {
    onRunSimulation: () => void;
}

/** 检查器侧栏：参数面板 + 参数对比 + 图层开关 */
export function InspectorPanel({ onRunSimulation }: InspectorPanelProps) {
    const currentScene = useSimulationStore(s => s.currentScene);
    const { is3DScene } = useSceneRig(currentScene);

    return (
        <aside className="classroom-inspector">
            <div className="inspector-header">
                <span>参数检查器</span>
                <strong>{is3DScene ? '3D 器材' : 'Canvas'}</strong>
            </div>
            <ParameterPanel onRunSimulation={onRunSimulation} />
            <ComparePanel />
            <LayerToggle />
        </aside>
    );
}

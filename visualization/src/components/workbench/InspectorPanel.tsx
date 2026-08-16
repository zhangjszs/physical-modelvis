import { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { ParameterPanel } from '../controls/ParameterPanel';
import { ComparePanel } from '../controls/ComparePanel';
import { LayerToggle } from '../layout/LayerToggle';
import { ClassroomScriptPanel } from '../guidance/ClassroomScriptPanel';
import { getClassroomScript } from '../../scenes/classroomScripts';
import { useSceneRig } from './useSceneRig';

interface InspectorPanelProps {
    onRunSimulation: () => void;
}

type TabType = 'script' | 'params';

/** 检查器侧栏：课堂教案 + 参数面板 + 参数对比 + 图层开关 */
export function InspectorPanel({ onRunSimulation }: InspectorPanelProps) {
    const currentScene = useSimulationStore(s => s.currentScene);
    const { is3DScene } = useSceneRig(currentScene);
    const hasScript = Boolean(getClassroomScript(currentScene));
    const [tab, setTab] = useState<TabType>('script');

    const activeTab = hasScript ? tab : 'params';

    return (
        <aside className="classroom-inspector">
            <div className="inspector-header">
                <div className="inspector-tabs">
                    {hasScript && (
                        <button
                            className={`inspector-tab-btn ${activeTab === 'script' ? 'active' : ''}`}
                            onClick={() => setTab('script')}
                        >
                            📖 课堂教案
                        </button>
                    )}
                    <button
                        className={`inspector-tab-btn ${activeTab === 'params' ? 'active' : ''}`}
                        onClick={() => setTab('params')}
                    >
                        ⚙️ 参数调试
                    </button>
                </div>
                <strong className="stage-mode-badge">{is3DScene ? '3D 器材' : 'Canvas'}</strong>
            </div>

            {activeTab === 'script' ? (
                <ClassroomScriptPanel key={currentScene} />
            ) : (
                <>
                    <ParameterPanel onRunSimulation={onRunSimulation} />
                    <ComparePanel />
                    <LayerToggle />
                </>
            )}
        </aside>
    );
}

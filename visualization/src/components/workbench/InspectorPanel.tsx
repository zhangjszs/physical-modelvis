import { useEffect, useState } from 'react';
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

const NARROW_VIEWPORT_QUERY = '(max-width: 1180px)';

function isNarrowViewport(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia(NARROW_VIEWPORT_QUERY).matches
    );
}

/** 检查器侧栏：课堂教案 + 参数面板 + 参数对比 + 图层开关 */
export function InspectorPanel({ onRunSimulation }: InspectorPanelProps) {
    const currentScene = useSimulationStore(s => s.currentScene);
    const { is3DScene } = useSceneRig(currentScene);
    const hasScript = Boolean(getClassroomScript(currentScene));
    const [tab, setTab] = useState<TabType>('script');
    // 窄视口下检查器是 fixed 覆盖层；默认收起，避免遮挡 3D 舞台（展开按钮仍可见）
    const [collapsed, setCollapsed] = useState(isNarrowViewport);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const media = window.matchMedia(NARROW_VIEWPORT_QUERY);
        const onChange = () => setCollapsed(media.matches);
        media.addEventListener?.('change', onChange);
        return () => media.removeEventListener?.('change', onChange);
    }, []);

    const activeTab = hasScript ? tab : 'params';

    return (
        <aside className={`classroom-inspector${collapsed ? ' collapsed' : ''}`} aria-label="实验检查器">
            {collapsed ? (
                <button
                    type="button"
                    className="inspector-reopen-btn"
                    onClick={() => setCollapsed(false)}
                    title="展开实验面板"
                    aria-label="展开实验面板"
                >
                    实验面板
                </button>
            ) : (
                <>
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
                        <button
                            type="button"
                            className="inspector-collapse-btn"
                            onClick={() => setCollapsed(true)}
                            title="收起实验面板"
                            aria-label="收起实验面板"
                        >
                            收起
                        </button>
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
                </>
            )}
        </aside>
    );
}

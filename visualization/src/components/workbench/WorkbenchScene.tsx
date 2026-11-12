import { lazy, useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { LazyPanel } from '../common/LazyPanel';
import { OverlayDrawer } from '../common/OverlayDrawer';
import { ExportDataButton } from '../export/ExportDataButton';
import { PlaybackControls } from '../controls/PlaybackControls';
import { TextbookDirectory } from './TextbookDirectory';
import { SceneStage } from './SceneStage';
import { InspectorPanel } from './InspectorPanel';
import { DataDrawer } from './DataDrawer';
import { useSceneSimulation } from './useSceneSimulation';
import { useCompareSimulations } from './useCompareSimulations';
import { hasSceneRig } from '../simulation3d/rigs';

const FormulaPanel = lazy(() => import('../formula/FormulaPanel').then(m => ({ default: m.FormulaPanel })));

/**
 * 课堂演示工作台 — 所有场景的统一入口。
 * 壳组件只做布局编排；仿真/对比/3D 逻辑由 hooks 提供。
 */
export function WorkbenchScene() {
    const currentScene = useSimulationStore(s => s.currentScene);
    const scenes = useSimulationStore(s => s.scenes);
    const [formulaOpen, setFormulaOpen] = useState(false);
    const [dataOpen, setDataOpen] = useState(false);

    const [renderMode, setRenderMode] = useState<'3d' | '2d'>('3d');
    const is3DScene = hasSceneRig(currentScene);

    const scene = scenes.find(s => s.id === currentScene);
    const { runSimulation } = useSceneSimulation();
    useCompareSimulations();

    return (
        <div className="classroom-scene">
            <aside className="classroom-directory">
                <TextbookDirectory />
            </aside>

            <main className="classroom-stage">
                <div className="stage-toolbar">
                    <div>
                        <div className="stage-kicker">课堂演示模式</div>
                        <h2>{scene?.name ?? '物理实验'}</h2>
                    </div>
                    <div className="stage-actions">
                        {is3DScene && (
                            <div className="segmented-switch" aria-label="演示维度切换">
                                <button
                                    type="button"
                                    className={`btn btn-sm ${renderMode === '3d' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setRenderMode('3d')}
                                    title="切换到 3D 实验器材仿真模式"
                                >
                                    🧊 3D 器材
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm ${renderMode === '2d' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setRenderMode('2d')}
                                    title="切换到 2D 板书示意模式"
                                >
                                    📐 2D 板书
                                </button>
                            </div>
                        )}
                        <button className="btn btn-secondary" onClick={() => setDataOpen(prev => !prev)}>
                            {dataOpen ? '收起数据' : '数据/图像'}
                        </button>
                        <ExportDataButton />
                        <button className="btn btn-primary" onClick={() => setFormulaOpen(true)}>
                            公式推导
                        </button>
                    </div>
                </div>

                <SceneStage renderMode={renderMode} />
                <PlaybackControls />

                {dataOpen && <DataDrawer onClose={() => setDataOpen(false)} />}
            </main>

            <InspectorPanel onRunSimulation={runSimulation} />

            <OverlayDrawer
                open={formulaOpen}
                onClose={() => setFormulaOpen(false)}
                title="公式推导"
                headerBadge={<span>按需讲解</span>}
                overlayClassName="formula-drawer-overlay"
                panelClassName="formula-drawer"
                headerClassName="formula-drawer-head"
                closeClassName="btn btn-sm"
                closeText="关闭"
            >
                <LazyPanel label="公式推导" title="公式说明">
                    <FormulaPanel />
                </LazyPanel>
            </OverlayDrawer>
        </div>
    );
}

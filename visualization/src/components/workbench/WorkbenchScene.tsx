import { useState } from 'react';
import { lazy, Suspense } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { ExportDataButton } from '../export/ExportDataButton';
import { PlaybackControls } from '../controls/PlaybackControls';
import { TextbookDirectory } from './TextbookDirectory';
import { SceneStage } from './SceneStage';
import { InspectorPanel } from './InspectorPanel';
import { DataDrawer } from './DataDrawer';
import { useSceneSimulation } from './useSceneSimulation';
import { useCompareSimulations } from './useCompareSimulations';

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
                        <button className="btn btn-secondary" onClick={() => setDataOpen(prev => !prev)}>
                            {dataOpen ? '收起数据' : '数据/图像'}
                        </button>
                        <ExportDataButton />
                        <button className="btn btn-primary" onClick={() => setFormulaOpen(true)}>
                            公式推导
                        </button>
                    </div>
                </div>

                <SceneStage />
                <PlaybackControls />

                {dataOpen && <DataDrawer />}
            </main>

            <InspectorPanel onRunSimulation={runSimulation} />

            {formulaOpen && (
                <div className="formula-drawer-overlay" onClick={() => setFormulaOpen(false)}>
                    <aside className="formula-drawer" onClick={e => e.stopPropagation()} aria-label="公式推导">
                        <div className="formula-drawer-head">
                            <div>
                                <span>按需讲解</span>
                                <h3>公式推导</h3>
                            </div>
                            <button className="btn btn-sm" onClick={() => setFormulaOpen(false)}>
                                关闭
                            </button>
                        </div>
                        <ErrorBoundary
                            label="公式推导"
                            fallback={
                                <div className="panel-section">
                                    <div className="panel-title">公式说明</div>
                                    <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载失败</div>
                                </div>
                            }
                        >
                            <Suspense
                                fallback={
                                    <div className="panel-section">
                                        <div className="panel-title">公式说明</div>
                                        <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载中...</div>
                                    </div>
                                }
                            >
                                <FormulaPanel />
                            </Suspense>
                        </ErrorBoundary>
                    </aside>
                </div>
            )}
        </div>
    );
}

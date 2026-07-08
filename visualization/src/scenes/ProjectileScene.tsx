import { useEffect, useCallback, lazy, Suspense, useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { runSceneSimulation } from '../adapters/physicsCoreAdapter';
import { SCENES, getDefaultParams } from './sceneRegistry';
import { SimulationCanvas } from '../components/simulation/SimulationCanvas';
import { loadSceneRig, hasSceneRig } from '../components/simulation3d/rigs';
import type { SceneRig } from '../components/simulation3d/EquipmentStage';

// EquipmentStage 自带完整的 Three.js (≈450 kB gzip)，用 lazy 隔离出首屏 bundle，
// 只在用户进入任意 3D 实验时才下载该 chunk。type 导入会被编译期擦除，不产生运行时依赖。
const LazyEquipmentStage = lazy(() =>
    import('../components/simulation3d/EquipmentStage').then(m => ({ default: m.EquipmentStage }))
);
import { ParameterPanel } from '../components/controls/ParameterPanel';
import { PlaybackControls } from '../components/controls/PlaybackControls';
import { StateInspector } from '../components/simulation/StateInspector';
import { LayerToggle } from '../components/layout/LayerToggle';
import { SCENE_CATEGORIES } from '../components/layout/SceneSelector';
import { computePhotogateMeasurements } from '../utils/photogate';

// 底部面板 & 诊断面板：非首屏关键，懒加载以减少主 chunk 体积
const GraphPanel = lazy(() => import('../components/charts/GraphPanel').then(m => ({ default: m.GraphPanel })));
const FormulaPanel = lazy(() => import('../components/formula/FormulaPanel').then(m => ({ default: m.FormulaPanel })));
const DiagnosticsPanel = lazy(() =>
    import('../components/diagnostics/DiagnosticsPanel').then(m => ({ default: m.DiagnosticsPanel }))
);
const PhotogateTimer = lazy(() =>
    import('../components/simulation/PhotogateTimer').then(m => ({ default: m.PhotogateTimer }))
);

function TextbookDirectory() {
    const { currentScene, setScene } = useSimulationStore();
    const sceneMap = new Map(SCENES.map(s => [s.id, s.name]));

    return (
        <nav className="textbook-directory" aria-label="教材实验目录">
            <div className="directory-eyebrow">教材目录</div>
            <h2>选择实验</h2>
            <div className="directory-list">
                {SCENE_CATEGORIES.map(category => (
                    <details key={category.label} open={category.ids.includes(currentScene)}>
                        <summary>{category.label}</summary>
                        <div className="directory-scenes">
                            {category.ids.map(id => {
                                const isActive = id === currentScene;
                                return (
                                    <button
                                        key={id}
                                        className={`directory-scene ${isActive ? 'active' : ''}`}
                                        onClick={() => setScene(id)}
                                    >
                                        <span>{sceneMap.get(id) ?? id}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </details>
                ))}
            </div>
        </nav>
    );
}

export function ProjectileScene() {
    const {
        currentScene,
        parameters,
        sceneLoadVersion,
        setSimulationResult,
        setErrorMessage,
        ensureSceneParameters,
        simulationResult,
        setExperimentData
    } = useSimulationStore();
    const [formulaOpen, setFormulaOpen] = useState(false);
    const [dataOpen, setDataOpen] = useState(false);

    const scene = SCENES.find(s => s.id === currentScene);

    // 初始化默认参数
    useEffect(() => {
        if (!scene) return;
        const defaults = getDefaultParams(currentScene);
        ensureSceneParameters(currentScene, defaults);
    }, [currentScene, ensureSceneParameters, scene]);

    // 运行仿真
    const runSimulation = useCallback(() => {
        if (!scene) return;
        const { result, error } = runSceneSimulation(scene, parameters);
        if (error) {
            setErrorMessage(error);
            return;
        }
        if (result) {
            setSimulationResult(result);
        }
    }, [scene, parameters, setSimulationResult, setErrorMessage]);

    // 首次加载自动运行
    useEffect(() => {
        runSimulation();
    }, [currentScene, sceneLoadVersion]);

    // 计算气垫导轨实验的光电门测量数据
    useEffect(() => {
        if (currentScene !== 'air-track' || !simulationResult) {
            setExperimentData(null);
            return;
        }
        const trajectory = simulationResult.trajectories[0];
        if (!trajectory || trajectory.length === 0) {
            setExperimentData(null);
            return;
        }
        const x1 = parameters['x1'] ?? 0.3;
        const x2 = parameters['x2'] ?? 0.8;
        const flagWidth = parameters['flagWidth'] ?? 0.02;
        const measurements = computePhotogateMeasurements(trajectory, {
            gatePositions: [x1, x2],
            flagWidth
        });
        setExperimentData(measurements);
    }, [simulationResult, parameters, currentScene, setExperimentData]);

    // 异步加载当前场景的 rig（懒加载模块 chunk）
    const [rig, setRig] = useState<SceneRig | undefined>(undefined);
    const [rigLoading, setRigLoading] = useState(false);
    const [rigError, setRigError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const sceneId = currentScene;
        const is3D = hasSceneRig(sceneId);
        setRigLoading(is3D);
        setRigError(null);

        if (is3D) {
            loadSceneRig(sceneId)
                .then(loaded => {
                    if (!cancelled) {
                        setRig(loaded);
                        setRigLoading(false);
                    }
                })
                .catch(err => {
                    // chunk 加载失败（404/网络/部署路径错误）→ 回退 Canvas 并提示
                    console.error('[EquipmentStage] rig 加载失败:', err);
                    if (!cancelled) {
                        setRig(undefined);
                        setRigLoading(false);
                        setRigError('3D 实验器材加载失败，已回退 2D 画面');
                    }
                });
        } else {
            setRig(undefined);
            setRigLoading(false);
        }

        return () => {
            cancelled = true;
        };
    }, [currentScene]);

    const is3DScene = !!rig || rigLoading;

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
                        <button className="btn btn-primary" onClick={() => setFormulaOpen(true)}>
                            公式推导
                        </button>
                    </div>
                </div>

                <div className="stage-viewport">
                    {is3DScene ? (
                        rig ? (
                            <Suspense
                                fallback={
                                    <div className="equipment-loading">
                                        <div className="loading-spinner" />
                                        <span>加载 3D 实验器材…</span>
                                    </div>
                                }
                            >
                                <LazyEquipmentStage key={currentScene} rig={rig} />
                            </Suspense>
                        ) : (
                            <div className="equipment-loading">
                                <div className="loading-spinner" />
                                <span>加载 3D 实验器材…</span>
                            </div>
                        )
                    ) : (
                        <SimulationCanvas />
                    )}
                </div>
                {rigError && (
                    <div className="equipment-error" role="alert">
                        ⚠ {rigError}
                    </div>
                )}
                <PlaybackControls />

                {dataOpen && (
                    <div className="classroom-data-drawer">
                        <Suspense
                            fallback={
                                <div className="panel-section" style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>
                                    加载中...
                                </div>
                            }
                        >
                            <GraphPanel />
                        </Suspense>
                        <div className="classroom-data-side">
                            {currentScene === 'air-track' && (
                                <Suspense
                                    fallback={
                                        <div className="panel-section">
                                            <div className="panel-title">数字毫秒计</div>
                                            <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载中...</div>
                                        </div>
                                    }
                                >
                                    <PhotogateTimer />
                                </Suspense>
                            )}
                            <StateInspector />
                            <Suspense
                                fallback={
                                    <div className="panel-section">
                                        <div className="panel-title">诊断报告</div>
                                        <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载中...</div>
                                    </div>
                                }
                            >
                                <DiagnosticsPanel />
                            </Suspense>
                        </div>
                    </div>
                )}
            </main>

            <aside className="classroom-inspector">
                <div className="inspector-header">
                    <span>参数检查器</span>
                    <strong>{is3DScene ? '3D 器材' : 'Canvas'}</strong>
                </div>
                <ParameterPanel onRunSimulation={runSimulation} />
                <LayerToggle />
            </aside>

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
                    </aside>
                </div>
            )}
        </div>
    );
}

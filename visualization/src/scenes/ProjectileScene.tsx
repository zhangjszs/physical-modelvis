import { useEffect, useCallback, lazy, Suspense } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { runSceneSimulation } from '../adapters/physicsCoreAdapter';
import { SCENES, getDefaultParams } from './sceneRegistry';
import { SimulationCanvas } from '../components/simulation/SimulationCanvas';
import { ParameterPanel } from '../components/controls/ParameterPanel';
import { PlaybackControls } from '../components/controls/PlaybackControls';
import { StateInspector } from '../components/simulation/StateInspector';
import { LayerToggle } from '../components/layout/LayerToggle';
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

    const scene = SCENES.find(s => s.id === currentScene);

    // 初始化默认参数
    useEffect(() => {
        if (!scene) return;
        const defaults = getDefaultParams(currentScene);
        ensureSceneParameters(currentScene, defaults);
    }, [currentScene, ensureSceneParameters]);

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

    return (
        <div className="scene-container">
            {/* 左侧参数 */}
            <div className="sidebar left-sidebar">
                <ParameterPanel onRunSimulation={runSimulation} />
                <LayerToggle />
            </div>

            {/* 中间主画布 + 图表（整合在一起） */}
            <div className="main-area">
                <SimulationCanvas />
                <PlaybackControls />
                <Suspense
                    fallback={
                        <div className="panel-section" style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>
                            加载中…
                        </div>
                    }
                >
                    <GraphPanel />
                </Suspense>
            </div>

            {/* 右侧状态 */}
            <div className="sidebar right-sidebar">
                {currentScene === 'air-track' && (
                    <Suspense
                        fallback={
                            <div className="panel-section">
                                <div className="panel-title">数字毫秒计</div>
                                <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载中…</div>
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
                            <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载中…</div>
                        </div>
                    }
                >
                    <DiagnosticsPanel />
                </Suspense>
                <Suspense
                    fallback={
                        <div className="panel-section">
                            <div className="panel-title">公式说明</div>
                            <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>加载中…</div>
                        </div>
                    }
                >
                    <FormulaPanel />
                </Suspense>
            </div>
        </div>
    );
}

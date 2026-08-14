import { lazy, Suspense } from 'react';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { SimulationCanvas } from '../simulation/SimulationCanvas';
import { useSceneRig } from './useSceneRig';
import { useSimulationStore } from '../../store/simulationStore';

// EquipmentStage 自带完整的 Three.js (≈450 kB gzip)，用 lazy 隔离出首屏 bundle
const LazyEquipmentStage = lazy(() =>
    import('../simulation3d/EquipmentStage').then(m => ({ default: m.EquipmentStage }))
);

/** 舞台视口：3D 器材装载（失败回退 2D Canvas） */
export function SceneStage() {
    const currentScene = useSimulationStore(s => s.currentScene);
    const { rig, rigReady, rigError, is3DScene } = useSceneRig(currentScene);

    return (
        <>
            <div className="stage-viewport">
                <ErrorBoundary
                    label="3D 实验舞台"
                    fallback={
                        <>
                            <SimulationCanvas />
                            <div className="equipment-error" role="alert">
                                ⚠ 该实验 3D 渲染出错，已回退到 2D 画面
                            </div>
                        </>
                    }
                >
                    {is3DScene ? (
                        rigReady && rig ? (
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
                </ErrorBoundary>
            </div>
            {rigError && (
                <div className="equipment-error" role="alert">
                    ⚠ {rigError}
                </div>
            )}
        </>
    );
}

import { lazy, Suspense } from 'react';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { SimulationCanvas } from '../simulation/SimulationCanvas';
import { useSceneRig } from './useSceneRig';
import { useSimulationStore } from '../../store/simulationStore';
import { MeasurementToolbox } from '../tools/MeasurementToolbox';

// EquipmentStage 自带完整的 Three.js (≈450 kB gzip)，用 lazy 隔离出首屏 bundle
const LazyEquipmentStage = lazy(() =>
    import('../simulation3d/EquipmentStage').then(m => ({ default: m.EquipmentStage }))
);

interface SceneStageProps {
    renderMode?: '3d' | '2d';
}

/** 舞台视口：3D 器材装载（支持 3D/2D 模式切换与失败回退 2D Canvas） */
export function SceneStage({ renderMode = '3d' }: SceneStageProps) {
    const currentScene = useSimulationStore(s => s.currentScene);
    const { rig, rigReady, rigError, is3DScene } = useSceneRig(currentScene);
    const show3D = is3DScene && renderMode === '3d';

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
                    {show3D ? (
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

                {/* 交互测量工具箱 (尺子 + 光电门，在 3D 实验舞台中可自由拖拽取用) */}
                {show3D && <MeasurementToolbox />}
            </div>
            {rigError && (
                <div className="equipment-error" role="alert">
                    ⚠ {rigError}
                </div>
            )}
        </>
    );
}

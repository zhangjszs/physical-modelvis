import { useCallback, useEffect } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { runSceneSimulation } from '../../adapters/physicsCoreAdapter';
import { getDefaultParams } from '../../scenes/sceneRegistry';
import { computePhotogateMeasurements } from '../../utils/photogate';

/**
 * 仿真运行副作用 hook：场景初始化、自动运行、air-track 光电门数据。
 * 从 ProjectileScene 拆出，行为原样迁移。
 */
export function useSceneSimulation(): { runSimulation: () => void } {
    const currentScene = useSimulationStore(s => s.currentScene);
    const parameters = useSimulationStore(s => s.parameters);
    const sceneLoadVersion = useSimulationStore(s => s.sceneLoadVersion);
    const simulationResult = useSimulationStore(s => s.simulationResult);
    const scenes = useSimulationStore(s => s.scenes);
    // action / stable selectors 返回 stable 引用, 不会触发重渲染
    const setSimulationResult = useSimulationStore(s => s.setSimulationResult);
    const setErrorMessage = useSimulationStore(s => s.setErrorMessage);
    const ensureSceneParameters = useSimulationStore(s => s.ensureSceneParameters);
    const setExperimentData = useSimulationStore(s => s.setExperimentData);

    const scene = scenes.find(s => s.id === currentScene);

    // 初始化默认参数
    useEffect(() => {
        if (!scene) return;
        const defaults = getDefaultParams(currentScene);
        ensureSceneParameters(currentScene, defaults);
    }, [currentScene, ensureSceneParameters, scene]);

    // 运行仿真
    const runSimulation = useCallback(() => {
        if (!scene) return;
        const currentParams = Object.keys(parameters).length > 0 ? parameters : getDefaultParams(currentScene);
        const { result, error } = runSceneSimulation(scene, currentParams);
        if (error) {
            setErrorMessage(error);
            return;
        }
        if (result) {
            setSimulationResult(result);
        }
    }, [scene, parameters, currentScene, setSimulationResult, setErrorMessage]);

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

    return { runSimulation };
}

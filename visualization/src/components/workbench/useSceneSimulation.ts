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
    //
    // 参数与场景一律**在调用瞬间从 store 即时读取**，不用渲染期闭包快照。
    // 因为 ParameterPanel 的 150ms debounce 会持有“创建它的那一帧”的 runSimulation 身份，
    // 若从闭包读 parameters，每次重算用的都是上一个参数值 ——
    // 表现为“改完参数后仿真结果稳定滞后一次修改，必须再改一次或点重置才刷新”。
    const runSimulation = useCallback(() => {
        const { currentScene: activeSceneId, parameters: liveParams, scenes } = useSimulationStore.getState();
        const activeScene = scenes.find(s => s.id === activeSceneId);
        if (!activeScene) return;
        const currentParams = Object.keys(liveParams).length > 0 ? liveParams : getDefaultParams(activeSceneId);
        const { result, error } = runSceneSimulation(activeScene, currentParams);
        if (error) {
            setErrorMessage(error);
            return;
        }
        if (result) {
            setSimulationResult(result);
        }
    }, [setSimulationResult, setErrorMessage]);

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

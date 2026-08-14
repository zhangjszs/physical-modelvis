import { useEffect } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { runSceneSimulation } from '../../adapters/physicsCoreAdapter';
import { GRAPH_COLORS } from '../../utils/colorMap';
import type { CompareEntry } from '../../types/visualization';

const MAX_COMPARE = 8;
const MIN_COMPARE = 2;

/**
 * 参数对比实验副作用 hook。
 * 对比模式开启时生成均匀分布的参数变体并逐个求解；
 * 失败变体显式保留 (result=null + error)，由消费方过滤/展示，不再静默跳过。
 */
export function useCompareSimulations(): void {
    const compareMode = useSimulationStore(s => s.compareMode);
    const compareConfig = useSimulationStore(s => s.compareConfig);
    const currentScene = useSimulationStore(s => s.currentScene);
    const parameters = useSimulationStore(s => s.parameters);
    const scenes = useSimulationStore(s => s.scenes);
    const setCompareResults = useSimulationStore(s => s.setCompareResults);
    const scene = scenes.find(s => s.id === currentScene);

    useEffect(() => {
        if (!compareMode || !compareConfig || !scene) {
            // 未开启对比模式 → 清空结果，恢复单仿真渲染
            if (useSimulationStore.getState().compareResults.length > 0) {
                setCompareResults([]);
            }
            return;
        }

        const { paramName, count, min, max } = compareConfig;
        const clampedCount = Math.max(MIN_COMPARE, Math.min(MAX_COMPARE, count));

        // 生成 count 组均匀分布的参数值
        const variantValues: number[] = [];
        for (let i = 0; i < clampedCount; i++) {
            const value = min + ((max - min) * i) / (clampedCount - 1);
            variantValues.push(value);
        }

        // 逐变体求解（同步求解，无需 Promise.all）
        const entries: CompareEntry[] = variantValues.map((paramValue, i) => {
            const variantParams = { ...parameters, [paramName]: paramValue } as Record<string, number>;
            const { result, error } = runSceneSimulation(scene, variantParams);
            return {
                paramValue,
                result,
                color: GRAPH_COLORS[i % GRAPH_COLORS.length]!,
                error: error ?? undefined
            } satisfies CompareEntry;
        });

        setCompareResults(entries);
    }, [compareMode, compareConfig, currentScene, scene, parameters, setCompareResults]);
}

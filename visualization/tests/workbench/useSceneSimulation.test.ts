/**
 * useSceneSimulation 行为测试 — 仿真运行器 + air-track 光电门
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useSceneSimulation } from '../../src/components/workbench/useSceneSimulation';
import { useSimulationStore } from '../../src/store/simulationStore';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import type { SimulationResult } from 'physics-core';

vi.mock('../../src/adapters/physicsCoreAdapter', () => ({
    runSceneSimulation: vi.fn()
}));

const mockRun = vi.mocked(runSceneSimulation);

const okResult = {
    trajectories: [
        [
            { position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 }, t: 0 },
            { position: { x: 1, y: 1 }, velocity: { x: 1, y: 1 }, t: 1 }
        ]
    ],
    charts: {},
    diagnostics: { maxValues: {} }
} as unknown as SimulationResult;

function scene(id: string, params: Array<Record<string, number>> = []) {
    return {
        id,
        name: id,
        model: 'projectile',
        parameters: params,
        buildProblem: (p: Record<string, number>) => ({ model: 'projectile', parameters: p })
    } as unknown as Parameters<typeof runSceneSimulation>[0];
}

describe('useSceneSimulation', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        useSimulationStore.setState({
            currentScene: 'projectile',
            parameters: { angle: 45 },
            parametersSceneId: 'projectile',
            sceneLoadVersion: 0,
            scenes: [scene('projectile')],
            simulationResult: null,
            experimentData: null
        });
    });

    it('挂载时自动运行一次仿真', () => {
        mockRun.mockReturnValue({ result: okResult, error: null });
        renderHook(() => useSceneSimulation());
        expect(mockRun).toHaveBeenCalledTimes(1);
        expect(useSimulationStore.getState().simulationResult).toBe(okResult);
    });

    it('sceneLoadVersion 变化 → 重新运行', () => {
        mockRun.mockReturnValue({ result: okResult, error: null });
        renderHook(() => useSceneSimulation());
        expect(mockRun).toHaveBeenCalledTimes(1);
        act(() => useSimulationStore.setState({ sceneLoadVersion: 1 }));
        expect(mockRun).toHaveBeenCalledTimes(2);
    });

    it('求解失败 → 写入 errorMessage, 不写入 simulationResult', () => {
        mockRun.mockReturnValue({ result: null, error: '参数错误: angle 超出范围' });
        renderHook(() => useSceneSimulation());
        expect(useSimulationStore.getState().errorMessage).toContain('参数错误');
        expect(useSimulationStore.getState().simulationResult).toBeNull();
    });

    it('runSimulation 手动调用 → 重新求解', () => {
        mockRun.mockReturnValue({ result: okResult, error: null });
        const { result } = renderHook(() => useSceneSimulation());
        mockRun.mockClear();
        act(() => result.current.runSimulation());
        expect(mockRun).toHaveBeenCalledTimes(1);
    });

    it('air-track 场景 + 有结果 → 写入光电门数据', () => {
        mockRun.mockReturnValue({ result: okResult, error: null });
        useSimulationStore.setState({
            currentScene: 'air-track',
            scenes: [scene('air-track')],
            parameters: { x1: 0.3, x2: 0.8, flagWidth: 0.02 }
        });
        renderHook(() => useSceneSimulation());
        const data = useSimulationStore.getState().experimentData;
        expect(data).not.toBeNull();
    });

    it('非 air-track 场景 → experimentData 清空', () => {
        mockRun.mockReturnValue({ result: okResult, error: null });
        useSimulationStore.setState({
            experimentData: [
                {
                    gateIndex: 0,
                    gatePosition: 0.3,
                    blockStartTime: 0.1,
                    blockEndTime: 0.2,
                    deltaT: 0.1,
                    velocity: 0.5,
                    speed: 0.5,
                    valid: true
                }
            ]
        });
        renderHook(() => useSceneSimulation());
        expect(useSimulationStore.getState().experimentData).toBeNull();
    });
});

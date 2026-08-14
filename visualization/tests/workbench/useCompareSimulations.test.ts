/**
 * useCompareSimulations 行为测试 — 参数对比实验
 *
 * 核心新行为: 失败变体显式报错 (result=null + error), 不再静默跳过。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useCompareSimulations } from '../../src/components/workbench/useCompareSimulations';
import { useSimulationStore } from '../../src/store/simulationStore';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import type { SimulationResult } from 'physics-core';

vi.mock('../../src/adapters/physicsCoreAdapter', () => ({
    runSceneSimulation: vi.fn()
}));

const mockRun = vi.mocked(runSceneSimulation);

const okResult = { trajectories: [], charts: {}, diagnostics: { maxValues: {} } } as unknown as SimulationResult;

function okScene() {
    return {
        id: 'projectile',
        name: '抛体运动',
        model: 'projectile',
        parameters: [
            { name: 'angle', label: '发射角', unit: '°', value: 45, min: 0, max: 90, step: 1, default: 45, description: '' }
        ],
        buildProblem: (p: Record<string, number>) => ({ model: 'projectile', parameters: p })
    } as unknown as Parameters<typeof runSceneSimulation>[0];
}

describe('useCompareSimulations', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        useSimulationStore.setState({
            currentScene: 'projectile',
            parameters: { angle: 45 },
            scenes: [okScene()],
            compareMode: true,
            compareConfig: { paramName: 'angle', count: 3, min: 30, max: 60 },
            compareResults: []
        });
    });

    it('对比模式关闭 → 清空 compareResults', () => {
        useSimulationStore.setState({ compareMode: false, compareResults: [{
            paramValue: 30, result: okResult, color: '#000'
        }] });
        renderHook(() => useCompareSimulations());
        expect(useSimulationStore.getState().compareResults).toEqual([]);
    });

    it('全部参数有效 → 生成 N 个成功条目 (result 非空, 无 error)', () => {
        mockRun.mockReturnValue({ result: okResult, error: null });
        renderHook(() => useCompareSimulations());
        const entries = useSimulationStore.getState().compareResults;
        expect(entries).toHaveLength(3);
        for (const e of entries) {
            expect(e.result).not.toBeNull();
            expect(e.error).toBeUndefined();
        }
        // 均匀分布: 30 / 45 / 60
        expect(entries.map(e => e.paramValue)).toEqual([30, 45, 60]);
    });

    it('部分变体越界 → 失败变体 result=null + error 非空, 成功变体不受影响', () => {
        mockRun.mockImplementation((_scene, params) =>
            params['angle'] === 60 ? { result: null, error: '参数错误: angle 超出范围' } : { result: okResult, error: null }
        );
        renderHook(() => useCompareSimulations());
        const entries = useSimulationStore.getState().compareResults;
        expect(entries).toHaveLength(3); // 不再静默丢弃失败变体
        const failed = entries.find(e => e.paramValue === 60)!;
        expect(failed.result).toBeNull();
        expect(failed.error).toContain('参数错误');
        const ok = entries.filter(e => e.paramValue !== 60);
        for (const e of ok) {
            expect(e.result).not.toBeNull();
            expect(e.error).toBeUndefined();
        }
    });

    it('全部变体失败 → 保留 N 个 error 条目 (不清空)', () => {
        mockRun.mockReturnValue({ result: null, error: '求解失败: 越界' });
        renderHook(() => useCompareSimulations());
        const entries = useSimulationStore.getState().compareResults;
        expect(entries).toHaveLength(3);
        for (const e of entries) {
            expect(e.result).toBeNull();
            expect(e.error).toBeDefined();
        }
    });

    it('count 越界 clamp 到 2..8', () => {
        mockRun.mockReturnValue({ result: okResult, error: null });
        useSimulationStore.setState({ compareConfig: { paramName: 'angle', count: 99, min: 30, max: 60 } });
        renderHook(() => useCompareSimulations());
        expect(useSimulationStore.getState().compareResults).toHaveLength(8);
    });

    it('卸载后不再 setCompareResults (竞态保护)', async () => {
        mockRun.mockReturnValue({ result: okResult, error: null });
        const { unmount } = renderHook(() => useCompareSimulations());
        unmount();
        // 卸载后 store 不因异步残留更新 —— 同步实现下本用例验证 store 未被再次写入
        const before = useSimulationStore.getState().compareResults;
        await act(async () => {});
        expect(useSimulationStore.getState().compareResults).toBe(before);
    });
});
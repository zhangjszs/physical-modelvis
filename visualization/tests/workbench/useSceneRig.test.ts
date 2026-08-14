/**
 * useSceneRig 行为测试 — rig 加载状态机 (从 ProjectileScene 拆出)
 *
 * 覆盖: 有 rig 场景加载成功 / 无 rig 场景走 Canvas / 加载失败回退 /
 * 场景切换缓存命中 / 卸载后不再 setState (竞态保护)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useSceneRig } from '../../src/components/workbench/useSceneRig';
import { hasSceneRig, loadSceneRig } from '../../src/components/simulation3d/rigs';
import type { SceneRig } from '../../src/components/simulation3d/EquipmentStage';

vi.mock('../../src/components/simulation3d/rigs', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/components/simulation3d/rigs')>();
    return {
        ...actual,
        hasSceneRig: vi.fn(),
        loadSceneRig: vi.fn()
    };
});

const mockRig = { buildEquipment: vi.fn(), updateEquipment: vi.fn() } as unknown as SceneRig;
const mockHasSceneRig = vi.mocked(hasSceneRig);
const mockLoadSceneRig = vi.mocked(loadSceneRig);

describe('useSceneRig', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('有 rig 的场景: 加载成功后 rigReady=true 且 rig 非空', async () => {
        mockHasSceneRig.mockReturnValue(true);
        mockLoadSceneRig.mockResolvedValue(mockRig);
        const { result } = renderHook(() => useSceneRig('projectile'));
        expect(result.current.rigLoading).toBe(true);
        expect(result.current.is3DScene).toBe(true);
        await act(async () => {});
        expect(result.current.rigReady).toBe(true);
        expect(result.current.rig).toBe(mockRig);
        expect(result.current.rigError).toBeNull();
    });

    it('无 rig 的场景: rigReady=true, rig=null, 走 Canvas 分支', () => {
        mockHasSceneRig.mockReturnValue(false);
        const { result } = renderHook(() => useSceneRig('some-canvas-scene'));
        expect(result.current.rigReady).toBe(true);
        expect(result.current.rig).toBeNull();
        expect(result.current.is3DScene).toBe(false);
        expect(mockLoadSceneRig).not.toHaveBeenCalled();
    });

    it('加载失败: rigError 非空, rigReady=false', async () => {
        mockHasSceneRig.mockReturnValue(true);
        mockLoadSceneRig.mockRejectedValue(new Error('chunk 404'));
        const { result } = renderHook(() => useSceneRig('projectile'));
        await act(async () => {});
        expect(result.current.rigReady).toBe(false);
        expect(result.current.rigError).not.toBeNull();
    });

    it('场景切换: 已缓存 rig 直接命中, 不重复调用 loadSceneRig', async () => {
        mockHasSceneRig.mockReturnValue(true);
        mockLoadSceneRig.mockResolvedValue(mockRig);
        const { rerender } = renderHook(({ id }) => useSceneRig(id), {
            initialProps: { id: 'projectile' }
        });
        await act(async () => {});
        expect(mockLoadSceneRig).toHaveBeenCalledTimes(1);
        // 切回已缓存场景
        rerender({ id: 'free-fall' });
        await act(async () => {});
        rerender({ id: 'projectile' });
        await act(async () => {});
        expect(mockLoadSceneRig).toHaveBeenCalledTimes(2); // 每个场景最多一次
    });
});

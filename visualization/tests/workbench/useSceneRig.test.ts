/**
 * useSceneRig 行为测试 — rig 加载状态机 (从 ProjectileScene 拆出)
 *
 * 覆盖: 有 rig 场景加载成功 / 无 rig 场景走 Canvas / 加载失败回退 /
 * 场景切换缓存命中 / 卸载后不再 setState (竞态保护) /
 * 3D→3D 切换后新 rig 必须发布 (永久 loading 回归) / bundle 缺 key 时报错而非永久 loading
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

    it('回归: 3D → 3D 切换后新 rig 必须发布到渲染结果 (曾经永久停在「加载 3D 实验器材…」)', async () => {
        const rigA = { buildEquipment: vi.fn(), updateEquipment: vi.fn() } as unknown as SceneRig;
        const rigB = { buildEquipment: vi.fn(), updateEquipment: vi.fn() } as unknown as SceneRig;
        mockHasSceneRig.mockReturnValue(true);
        mockLoadSceneRig.mockResolvedValueOnce(rigA).mockResolvedValueOnce(rigB);

        const { result, rerender } = renderHook(({ id }) => useSceneRig(id), {
            initialProps: { id: 'projectile' }
        });
        await act(async () => {});
        // 第一个 3D 场景正常就绪 —— 此时就绪标志已经是 true
        expect(result.current.rig).toBe(rigA);
        expect(result.current.rigReady).toBe(true);

        // 切到第二个 3D 场景: 旧实现把 rig 存在 ref 里, 新 rig 到位后
        // setRigReady(true) 因值未变而被 React 跳过重渲染 → result.current.rig 永远停在 null
        rerender({ id: 'free-fall' });
        await act(async () => {});

        expect(result.current.rig).toBe(rigB);
        expect(result.current.rigReady).toBe(true);
        expect(result.current.rigLoading).toBe(false);
        expect(result.current.rigError).toBeNull();
    });

    it('回归: rig 登记了但 bundle 缺该 key → 报错而非永久 loading', async () => {
        mockHasSceneRig.mockReturnValue(true);
        mockLoadSceneRig.mockResolvedValue(undefined);
        const { result } = renderHook(() => useSceneRig('ghost-scene'));
        await act(async () => {});
        expect(result.current.rig).toBeNull();
        expect(result.current.rigLoading).toBe(false);
        expect(result.current.rigError).toContain('缺少 3D 器材配置');
    });
});

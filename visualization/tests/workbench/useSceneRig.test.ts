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

    it('回归: 切场景的中间帧不得把旧场景 rig 泄漏给新场景 (防旧 rig 建器材 + 新 rig 调 update 的句柄错配)', async () => {
        const rigA = { buildEquipment: vi.fn(), updateEquipment: vi.fn() } as unknown as SceneRig;
        const rigB = { buildEquipment: vi.fn(), updateEquipment: vi.fn() } as unknown as SceneRig;
        // 可控延迟: 把新场景的加载挂在 pending 状态, 才能观察到“切换那一帧”的 rig 到底是什么
        let resolveB: (r: SceneRig) => void = () => {};
        const pendingB = new Promise<SceneRig>(res => {
            resolveB = res;
        });
        mockHasSceneRig.mockReturnValue(true);
        mockLoadSceneRig.mockResolvedValueOnce(rigA).mockReturnValueOnce(pendingB);

        const { result, rerender } = renderHook(({ id }) => useSceneRig(id), {
            initialProps: { id: 'projectile' }
        });
        await act(async () => {});
        expect(result.current.rig).toBe(rigA);

        // 切到 free-fall, 但新 rig 还在路上 → 绝不能继续把 rigA 当作当前场景的 rig 交出去,
        // 否则 SceneStage 的 key={currentScene} 会让 EquipmentStage 用**旧 rig** 建器材,
        // 新 rig 到位后再调 updateEquipment(旧 handles) → 各场景报不同的 undefined 属性
        rerender({ id: 'free-fall' });
        expect(result.current.rig).toBeNull();
        expect(result.current.rigReady).toBe(false);
        expect(result.current.rigLoading).toBe(true);

        await act(async () => {
            resolveB(rigB);
            await pendingB;
        });
        expect(result.current.rig).toBe(rigB);
        expect(result.current.rigReady).toBe(true);
    });
});

describe('useSceneRig 缓存上限 LRU (#79)', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    /** 每个场景一个独立 rig (带 dispose 清理钩子), 模拟真实按场景注册的 rig 表 */
    function makeRigRegistry() {
        const rigs = new Map<string, SceneRig>();
        mockLoadSceneRig.mockImplementation(async (id: string) => {
            let rig = rigs.get(id);
            if (!rig) {
                rig = {
                    buildEquipment: vi.fn(),
                    updateEquipment: vi.fn(),
                    dispose: vi.fn()
                } as unknown as SceneRig;
                rigs.set(id, rig);
            }
            return rig;
        });
        return rigs;
    }

    it('超过 8 个场景后最久未用的 rig 被淘汰, 其 dispose 清理钩子被调用', async () => {
        mockHasSceneRig.mockReturnValue(true);
        const rigs = makeRigRegistry();

        const { result, rerender } = renderHook(({ id }) => useSceneRig(id), {
            initialProps: { id: 's0' }
        });
        await act(async () => {});
        for (let i = 1; i <= 8; i++) {
            rerender({ id: `s${i}` });
            await act(async () => {});
        }
        // 9 个场景都触发过加载
        expect(mockLoadSceneRig).toHaveBeenCalledTimes(9);
        // s0 最久未用 → 被淘汰且清理钩子被调用; 当前场景 s8 的 rig 不受影响
        const rig0 = rigs.get('s0');
        expect((rig0 as { dispose?: ReturnType<typeof vi.fn> } | undefined)?.dispose).toHaveBeenCalled();
        expect(result.current.rig).toBe(rigs.get('s8'));

        // 重访 s0: 缓存已淘汰 → 必须重新 load
        const callsBefore = mockLoadSceneRig.mock.calls.length;
        rerender({ id: 's0' });
        await act(async () => {});
        expect(mockLoadSceneRig.mock.calls.length).toBe(callsBefore + 1);
    });

    it('命中缓存时刷新 LRU 顺序: 触碰最旧的 s1 后, 下一次淘汰的是 s2 而非 s1', async () => {
        mockHasSceneRig.mockReturnValue(true);
        const rigs = makeRigRegistry();

        const { rerender } = renderHook(({ id }) => useSceneRig(id), {
            initialProps: { id: 's0' }
        });
        await act(async () => {});
        for (let i = 1; i <= 8; i++) {
            rerender({ id: `s${i}` });
            await act(async () => {});
        }
        // 缓存顺序 [s1..s8] (s0 已淘汰), s1 最旧。触碰 s1 把它移到队尾,
        // 再插入 s9 → 被淘汰的应是新的队首 s2
        rerender({ id: 's1' });
        await act(async () => {});
        rerender({ id: 's9' });
        await act(async () => {});
        const rig1 = rigs.get('s1');
        expect((rig1 as { dispose?: ReturnType<typeof vi.fn> } | undefined)?.dispose).not.toHaveBeenCalled();
        const rig2 = rigs.get('s2');
        expect((rig2 as { dispose?: ReturnType<typeof vi.fn> } | undefined)?.dispose).toHaveBeenCalled();
    });
});

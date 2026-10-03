import { useEffect, useRef, useState } from 'react';
import { loadSceneRig, hasSceneRig } from '../simulation3d/rigs';
import type { SceneRig } from '../simulation3d/EquipmentStage';

/** rig 加载结果与它**属于哪个场景**绑成一个对象 —— 见下方"关键不变量" */
interface RigEntry {
    sceneId: string;
    rig: SceneRig | null;
    error: string | null;
}

export interface SceneRigState {
    rig: SceneRig | null;
    rigReady: boolean;
    rigLoading: boolean;
    rigError: string | null;
    is3DScene: boolean;
}

/**
 * rig 缓存容量上限 (#79)。
 * 当前 rig 是无状态单例、常驻影响≈0，但一旦某个 rig 在单例上捕获每次 build 的 handles
 * 就会升级为无界泄漏 —— 用 LRU 上限兜底；淘汰时调用 rig.dispose?.() 清理钩子
 * (无状态 rig 未实现即 no-op，为根治后的有状态场景预留，见 SceneRig.dispose)。
 */
const RIG_CACHE_LIMIT = 8;

/**
 * 3D 实验器材 (rig) 加载状态机。
 * 按场景 ID 缓存已加载 rig；同步识别是否 3D 场景，杜绝切换时的 2D Canvas 瞬间闪烁。
 *
 * 关键不变量: **rig 必须与"它属于哪个 sceneId"同源同批**。
 * 两条历史 bug 都源于把二者拆开:
 *   1. rig 存 ref、就绪存 boolean → 从已就绪的 3D 场景切走时就绪标志仍为 true，新 rig 到位后
 *      setRigReady(true) 值未变 → React 跳过重渲染 → 舞台永久停在「加载 3D 实验器材…」(#69, 101/123 场景)。
 *   2. rig 存 state 但不带 sceneId → 切场景的那一帧 `currentScene` 已是新场景、`rig` 还是旧场景的,
 *      而 SceneStage 用 `key={currentScene}` 强制重挂 → EquipmentStage 拿**旧 rig** 建器材
 *      (mount effect 依赖 `[]`), 新 rig 到位后调 `updateEquipment(旧 handles)` →
 *      55 个场景各抛各的 `Cannot read properties of undefined`(属性名取决于两个 rig 的结构差)。
 * 现在所有派生值都先按 sceneId 过滤, 不匹配即视为"还没有 rig"。
 */
export function useSceneRig(sceneId: string): SceneRigState {
    // Map 保持插入序即 LRU 序：命中时 delete+set 移到队尾，淘汰时从队首取最久未用
    const rigCacheRef = useRef<Map<string, SceneRig>>(new Map());
    const is3DScene = hasSceneRig(sceneId);

    const [entry, setEntry] = useState<RigEntry | null>(() => {
        const cached = rigCacheRef.current.get(sceneId);
        return cached ? { sceneId, rig: cached, error: null } : null;
    });

    // 渲染期就过滤掉"属于别的场景"的 rig/error, 杜绝旧 rig 泄漏进新场景的首帧
    const current = entry && entry.sceneId === sceneId ? entry : null;
    const rig = current?.rig ?? null;
    const rigError = current?.error ?? null;

    useEffect(() => {
        let cancelled = false;

        // 非 3D 场景: 清空, 避免上一个场景的状态残留
        if (!is3DScene) {
            setEntry({ sceneId, rig: null, error: null });
            return;
        }

        const cache = rigCacheRef.current;
        const cached = cache.get(sceneId);
        if (cached) {
            // LRU 触碰: 移到队尾标记"最近使用"
            cache.delete(sceneId);
            cache.set(sceneId, cached);
            setEntry({ sceneId, rig: cached, error: null });
            return;
        }

        setEntry({ sceneId, rig: null, error: null });

        loadSceneRig(sceneId)
            .then(loaded => {
                if (cancelled) return;
                if (loaded) {
                    cache.set(sceneId, loaded);
                    // 容量兜底: 淘汰最久未用的 rig, 并调用其清理钩子
                    while (cache.size > RIG_CACHE_LIMIT) {
                        const oldest = cache.keys().next().value;
                        if (oldest === undefined) break;
                        const evicted = cache.get(oldest);
                        cache.delete(oldest);
                        try {
                            evicted?.dispose?.();
                        } catch (err) {
                            console.error('[useSceneRig] rig 清理钩子失败:', err);
                        }
                    }
                    setEntry({ sceneId, rig: loaded, error: null });
                } else {
                    // SCENE_TO_MODULE 有登记但 bundle 里缺该 key: 报错而非永久转圈
                    setEntry({ sceneId, rig: null, error: '该场景缺少 3D 器材配置，已回退 2D 画面' });
                }
            })
            .catch(err => {
                console.error('[useSceneRig] rig 加载失败:', err);
                if (cancelled) return;
                setEntry({ sceneId, rig: null, error: '3D 实验器材加载失败，已回退 2D 画面' });
            });

        return () => {
            cancelled = true;
        };
    }, [sceneId, is3DScene]);

    return {
        rig,
        rigReady: is3DScene ? Boolean(rig) : true,
        rigLoading: is3DScene && !rig && !rigError,
        rigError,
        is3DScene
    };
}

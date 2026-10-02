import { useEffect, useRef, useState } from 'react';
import { loadSceneRig, hasSceneRig } from '../simulation3d/rigs';
import type { SceneRig } from '../simulation3d/EquipmentStage';

export interface SceneRigState {
    rig: SceneRig | null;
    rigReady: boolean;
    rigLoading: boolean;
    rigError: string | null;
    is3DScene: boolean;
}

/**
 * 3D 实验器材 (rig) 加载状态机。
 * 按场景 ID 缓存已加载 rig；同步识别是否 3D 场景，杜绝切换时的 2D Canvas 瞬间闪烁。
 *
 * 关键不变量: **rig 本体与"是否就绪"必须同源于 state**。
 * 若把 rig 存在 ref 里、只把就绪标志存 state，那么从"已就绪的 3D 场景"切到另一个 3D 场景时,
 * 就绪标志此刻仍是 true → 新 rig 到位后 setRigReady(true) 值未变 → React 跳过重渲染 →
 * 渲染期永远读到 null rig → 舞台永久停在「加载 3D 实验器材…」且零报错 (实测影响 101/123 场景)。
 */
export function useSceneRig(sceneId: string): SceneRigState {
    const rigCacheRef = useRef<Record<string, SceneRig>>({});
    const is3DScene = hasSceneRig(sceneId);

    const [rig, setRig] = useState<SceneRig | null>(() => rigCacheRef.current[sceneId] ?? null);
    const [rigLoading, setRigLoading] = useState(is3DScene && !rig);
    const [rigError, setRigError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setRigError(null);

        // 非 3D 场景: 清掉上一个场景的 rig, 避免状态残留
        if (!is3DScene) {
            setRig(null);
            setRigLoading(false);
            return;
        }

        const cached = rigCacheRef.current[sceneId];
        if (cached) {
            setRig(cached);
            setRigLoading(false);
            return;
        }

        setRig(null);
        setRigLoading(true);

        loadSceneRig(sceneId)
            .then(loaded => {
                if (cancelled) return;
                if (loaded) {
                    rigCacheRef.current[sceneId] = loaded;
                    setRig(loaded);
                    setRigLoading(false);
                } else {
                    // SCENE_TO_MODULE 有登记但 bundle 里缺该 key: 以前会永久静默 loading
                    setRigLoading(false);
                    setRigError('该场景缺少 3D 器材配置，已回退 2D 画面');
                }
            })
            .catch(err => {
                console.error('[useSceneRig] rig 加载失败:', err);
                if (cancelled) return;
                setRigLoading(false);
                setRigError('3D 实验器材加载失败，已回退 2D 画面');
            });

        return () => {
            cancelled = true;
        };
    }, [sceneId, is3DScene]);

    return {
        rig,
        rigReady: is3DScene ? Boolean(rig) : true,
        rigLoading: is3DScene && !rig && rigLoading,
        rigError,
        is3DScene
    };
}

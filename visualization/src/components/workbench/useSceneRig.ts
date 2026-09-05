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
 */
export function useSceneRig(sceneId: string): SceneRigState {
    const rigCacheRef = useRef<Record<string, SceneRig>>({});
    const is3DScene = hasSceneRig(sceneId);
    const cachedRig = rigCacheRef.current[sceneId] ?? null;

    const [rigReady, setRigReady] = useState(Boolean(cachedRig) || !is3DScene);
    const [rigLoading, setRigLoading] = useState(is3DScene && !cachedRig);
    const [rigError, setRigError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setRigError(null);

        if (!is3DScene) {
            setRigReady(true);
            setRigLoading(false);
            return;
        }

        if (rigCacheRef.current[sceneId]) {
            setRigReady(true);
            setRigLoading(false);
            return;
        }

        setRigReady(false);
        setRigLoading(true);

        loadSceneRig(sceneId)
            .then(loaded => {
                if (!cancelled && loaded) {
                    rigCacheRef.current[sceneId] = loaded;
                    setRigReady(true);
                    setRigLoading(false);
                }
            })
            .catch(err => {
                console.error('[useSceneRig] rig 加载失败:', err);
                if (!cancelled) {
                    setRigReady(false);
                    setRigLoading(false);
                    setRigError('3D 实验器材加载失败，已回退 2D 画面');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [sceneId, is3DScene]);

    const rig = rigCacheRef.current[sceneId] ?? null;

    return {
        rig,
        rigReady: is3DScene ? (rig ? rigReady : false) : true,
        rigLoading: is3DScene && !rig && rigLoading,
        rigError,
        is3DScene
    };
}

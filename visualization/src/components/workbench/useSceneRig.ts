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
 * 按场景 ID 缓存已加载 rig；渲染条件 = 缓存中存在当前场景 rig。
 * 从 ProjectileScene 拆出，竞态保护 (cancelled) 与场景缓存逻辑原样迁移。
 */
export function useSceneRig(sceneId: string): SceneRigState {
    const rigCacheRef = useRef<Record<string, SceneRig>>({});
    const [rigReady, setRigReady] = useState(false);
    const [rigLoading, setRigLoading] = useState(false);
    const [rigError, setRigError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setRigError(null);
        setRigLoading(hasSceneRig(sceneId));

        if (hasSceneRig(sceneId)) {
            if (rigCacheRef.current[sceneId]) {
                setRigReady(true);
            } else {
                setRigReady(false);
                loadSceneRig(sceneId)
                    .then(loaded => {
                        if (!cancelled && loaded) {
                            rigCacheRef.current[sceneId] = loaded;
                            setRigReady(true);
                            setRigLoading(false);
                        }
                    })
                    .catch(err => {
                        // chunk 加载失败（404/网络/部署路径错误）→ 回退 Canvas 并提示
                        console.error('[useSceneRig] rig 加载失败:', err);
                        if (!cancelled) {
                            setRigReady(false);
                            setRigLoading(false);
                            setRigError('3D 实验器材加载失败，已回退 2D 画面');
                        }
                    });
            }
        } else {
            setRigReady(true);
            setRigLoading(false);
        }

        return () => {
            cancelled = true;
        };
    }, [sceneId]);

    const rig = rigCacheRef.current[sceneId] ?? null;
    const is3DScene = !!rig || rigLoading;

    return { rig, rigReady, rigLoading, rigError, is3DScene };
}

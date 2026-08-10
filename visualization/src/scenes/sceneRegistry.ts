import type { SceneConfig } from '../types/visualization';

/**
 * 场景配置注册表 — 首屏体积优化版。
 *
 * 118 个场景定义按领域拆为 5 个动态 import chunk(mechanics / electromagnetism /
 * optics / thermodynamics / modern),首屏不再打包全部场景文件。
 * 消费模式:
 *   - React 组件:读 store.scenes(state, 由 App 挂载时 ensureScenesLoaded 预载)
 *   - 纯逻辑/测试:先 await loadAllScenes(), 再用 getSceneSync 同步读缓存
 */

let scenesCache: SceneConfig[] | null = null;
let scenesPromise: Promise<SceneConfig[]> | null = null;

/** 懒加载全部场景配置(领域 chunk 并行使之加载), 幂等 + 并发安全。 */
export function loadAllScenes(): Promise<SceneConfig[]> {
    if (scenesCache) return Promise.resolve(scenesCache);
    if (!scenesPromise) {
        scenesPromise = import('./scenes')
            .then(m => m.getAllScenes())
            .then(list => {
                scenesCache = list;
                return list;
            });
    }
    return scenesPromise;
}

/** 同步读场景配置 — 仅当 loadAllScenes() 已完成(缓存就绪)。 */
export function getSceneSync(sceneId: string): SceneConfig | undefined {
    return scenesCache?.find(s => s.id === sceneId);
}

/** 同步读全部场景配置(缓存未就绪时返回空数组)。 */
export function getScenesSync(): SceneConfig[] {
    return scenesCache ?? [];
}

export function getDefaultParams(sceneId: string): Record<string, number> {
    const scene = getSceneSync(sceneId);
    if (!scene) return {};
    const params: Record<string, number> = {};
    for (const p of scene.parameters) {
        params[p.name] = p.default;
    }
    return params;
}

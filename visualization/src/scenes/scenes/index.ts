import type { SceneConfig } from '../../types/visualization';

/**
 * 全部物理场景配置 — 按章节分组、按领域动态 import。
 * 5 个领域包各成一个懒加载 chunk,首屏不再打包 118 个场景定义。
 * 导出顺序=教学章节顺序,场景内顺序保留原 sceneRegistry.ts 注册顺序。
 */
export async function getAllScenes(): Promise<SceneConfig[]> {
    const [mechanics, electromagnetism, optics, thermodynamics, modern] = await Promise.all([
        import('./mechanics').then(m => m.MechanicsScenes),
        import('./electromagnetism').then(m => m.ElectromagnetismScenes),
        import('./optics').then(m => m.OpticsScenes),
        import('./thermodynamics').then(m => m.ThermodynamicsScenes),
        import('./modern').then(m => m.ModernScenes)
    ]);
    return [...mechanics, ...electromagnetism, ...optics, ...thermodynamics, ...modern];
}

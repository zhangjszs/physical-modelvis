import type { SceneConfig } from '../../types/visualization';

import { MechanicsScenes } from './mechanics';
import { ElectromagnetismScenes } from './electromagnetism';
import { OpticsScenes } from './optics';
import { ThermodynamicsScenes } from './thermodynamics';
import { ModernScenes } from './modern';

/**
 * 全部物理场景配置 — 按章节分组汇总。
 * 导出顺序=教学章节顺序，场景内顺序保留原 sceneRegistry.ts 注册顺序。
 */
export const SCENES: SceneConfig[] = [
    ...MechanicsScenes,
    ...ElectromagnetismScenes,
    ...OpticsScenes,
    ...ThermodynamicsScenes,
    ...ModernScenes
];

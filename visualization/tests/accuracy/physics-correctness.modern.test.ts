import { ModernScenes } from '../../src/scenes/scenes/modern';
import { describeSceneRobustness } from './physics-correctness.shared';

describeSceneRobustness(ModernScenes, 'modern');

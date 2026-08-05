import { ElectromagnetismScenes } from '../../src/scenes/scenes/electromagnetism';
import { describeSceneRobustness } from './physics-correctness.shared';

describeSceneRobustness(ElectromagnetismScenes, 'electromagnetism');

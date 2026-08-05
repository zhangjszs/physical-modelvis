import { OpticsScenes } from '../../src/scenes/scenes/optics';
import { describeSceneRobustness } from './physics-correctness.shared';

describeSceneRobustness(OpticsScenes, 'optics');

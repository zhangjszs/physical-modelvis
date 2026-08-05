import { MechanicsScenes } from '../../src/scenes/scenes/mechanics';
import { describeSceneRobustness } from './physics-correctness.shared';

describeSceneRobustness(MechanicsScenes, 'mechanics');

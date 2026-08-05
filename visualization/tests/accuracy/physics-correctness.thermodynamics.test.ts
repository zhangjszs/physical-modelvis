import { ThermodynamicsScenes } from '../../src/scenes/scenes/thermodynamics';
import { describeSceneRobustness } from './physics-correctness.shared';

describeSceneRobustness(ThermodynamicsScenes, 'thermodynamics');

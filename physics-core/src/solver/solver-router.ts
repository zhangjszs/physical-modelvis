import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult } from '../types/result.js';
import { getModel, registerModel } from '../models/base.js';
import { UniformLinearModel } from '../models/uniform-linear.js';
import { UniformAcceleratedModel } from '../models/uniform-accelerated.js';
import { UniformElectricModel } from '../models/uniform-electric-field.js';
import { UniformMagneticModel } from '../models/uniform-magnetic-field.js';
import { InclinedPlaneModel } from '../models/inclined-plane.js';
import { SpringOscillatorModel } from '../models/spring-oscillator.js';
import { EMCombinedFieldModel } from '../models/em-combined-field.js';
import { CollisionModel, InelasticCollisionModel } from '../models/collision.js';
import { UniformCircularMotionModel } from '../models/uniform-circular-motion.js';
import { ForceCompositionModel } from '../models/force-composition.js';
import { NewtonThirdLawModel } from '../models/newton-third-law.js';
import { SlidingFrictionModel } from '../models/sliding-friction.js';
import { NewtonSecondLawModel } from '../models/newton-second-law.js';
import { ProjectileModel } from '../models/projectile.js';

registerModel(new UniformLinearModel());
registerModel(new UniformAcceleratedModel());
registerModel(new UniformElectricModel());
registerModel(new UniformMagneticModel());
registerModel(new InclinedPlaneModel());
registerModel(new SpringOscillatorModel());
registerModel(new EMCombinedFieldModel());
registerModel(new CollisionModel());
registerModel(new InelasticCollisionModel());
registerModel(new UniformCircularMotionModel());
// 必修一 第三章 相互作用——力
registerModel(new ForceCompositionModel());
registerModel(new NewtonThirdLawModel());
registerModel(new SlidingFrictionModel());
// 必修一 第四章 运动和力的关系
registerModel(new NewtonSecondLawModel());
// 必修二 第一章 抛体运动
registerModel(new ProjectileModel());

export function solveProblem(problem: PhysicsProblem): SimulationResult {
  const model = getModel(problem.model);
  const t0 = Date.now();
  const result = model.solve(problem);
  const computationTime = Date.now() - t0;
  return { ...result, meta: { ...result.meta, computationTime } };
}

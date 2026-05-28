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

// 自动注册所有内置模型
let registered = false;
function ensureRegistered() {
  if (registered) return;
  registerModel(new UniformLinearModel());
  registerModel(new UniformAcceleratedModel());
  registerModel(new UniformElectricModel());
  registerModel(new UniformMagneticModel());
  registerModel(new InclinedPlaneModel());
  registerModel(new SpringOscillatorModel());
  registerModel(new EMCombinedFieldModel());
  registerModel(new CollisionModel());
  registerModel(new InelasticCollisionModel());
  registered = true;
}

/** 根据问题的 model 字段自动路由到正确的模型求解 */
export function solveProblem(problem: PhysicsProblem): SimulationResult {
  ensureRegistered();
  const model = getModel(problem.model);
  return model.solve(problem);
}

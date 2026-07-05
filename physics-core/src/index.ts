// physics-core: 面向高中物理教学的二维物理模拟引擎

// === 类型导出 ===
export type { Vector2D, Quantity, ParameterSpec, ValidationResult, PhysicalBody, RenderHint } from './types/common.js';
export type {
  PhysicsProblem, ModelType, NewtonSecondLawConstraint, ForceCompositionConstraint,
  NewtonThirdLawConstraint, SlidingFrictionConstraint, ProjectileConstraint, OrbitalConstraint,
} from './types/problem.js';
export type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep, FormulaUsage } from './types/result.js';

// === 错误类导出 ===
export { PhysicsError, UnsupportedModelError, ParameterOutOfRangeError, ConsistencyViolationError } from './errors/index.js';

// === 基础设施导出 ===
export { Vec2 } from './math/vector2d.js';
export { QuantityFactory, convert, quantity } from './units/quantity.js';
export { PHYSICS_CONSTANTS } from './units/constants.js';

// === 模型导出 ===
export { PhysicsModelBase, registerModel, getModel, listModels } from './models/base.js';
export { UniformLinearModel } from './models/uniform-linear.js';
export { UniformAcceleratedModel } from './models/uniform-accelerated.js';
export { UniformElectricModel } from './models/uniform-electric-field.js';
export { UniformMagneticModel } from './models/uniform-magnetic-field.js';
export { SpringOscillatorModel } from './models/spring-oscillator.js';
export { InclinedPlaneModel } from './models/inclined-plane.js';
export { EMCombinedFieldModel } from './models/em-combined-field.js';
export { CollisionModel, InelasticCollisionModel } from './models/collision.js';
export { UniformCircularMotionModel } from './models/uniform-circular-motion.js';
// 必修一 第三章 相互作用——力
export { ForceCompositionModel } from './models/force-composition.js';
export { NewtonThirdLawModel } from './models/newton-third-law.js';
export { SlidingFrictionModel } from './models/sliding-friction.js';
// 必修一 第四章 运动和力的关系
export { NewtonSecondLawModel } from './models/newton-second-law.js';
// 必修二 第一章 抛体运动
export { ProjectileModel } from './models/projectile.js';
// 必修二 第三章 万有引力与航天
export { OrbitalModel } from './models/orbital.js';

// === 求解器导出 ===
export { solveProblem } from './solver/solver-router.js';

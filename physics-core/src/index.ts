// physics-core: 面向高中物理教学的二维物理模拟引擎

// === 类型导出 ===
export type { Vector2D, Quantity, ParameterSpec, ValidationResult, PhysicalBody, RenderHint } from './types/common.js';
export type {
  PhysicsProblem, ModelType, NewtonSecondLawConstraint, ForceCompositionConstraint,
  NewtonThirdLawConstraint, SlidingFrictionConstraint, ProjectileConstraint, OrbitalConstraint,
  MomentumConstraint, WaveConstraint, RefractionConstraint, InterferenceConstraint, CircuitConstraint, GasLawConstraint,
  PhotoelectricConstraint, BohrModelConstraint, RadioactiveDecayConstraint,
  MagneticForceConstraint, EMInductionConstraint, ACCurrentConstraint, LCOscillatorConstraint,
  TickerTimerConstraint, MicroDeformationConstraint, ReactionTimeConstraint,
  GalileoInclineConstraint, GalileoInclineMode,
  InertiaConstraint, InertiaMode,
  OverweightConstraint, OverweightMode,
  CenterOfGravityConstraint,
  TransmissionConstraint,
  VerticalCircleConstraint,
  CentrifugalConstraint,
  CurveVelocityConstraint,
  CurveTrackShape,
  CurveConditionConstraint,
  MotionCompositionConstraint,
  CavendishConstraint, MoonEarthTestConstraint,
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
// 必修二 第一章 曲线运动 (速度方向 / 曲线条件 / 运动合成)
export { CurveVelocityDirectionModel } from './models/curve-velocity-direction.js';
export { CurveConditionModel } from './models/curve-condition.js';
export { MotionCompositionModel } from './models/motion-composition.js';
// 必修二 第二章 圆周运动
export { TransmissionBeltModel } from './models/transmission-belt.js';
export { VerticalCircleModel } from './models/vertical-circle.js';
export { CentrifugalModel } from './models/centrifugal.js';
// 必修二 第三章 万有引力与航天
export { OrbitalModel } from './models/orbital.js';
export { CavendishModel } from './models/cavendish.js';
export { MoonEarthTestModel } from './models/moon-earth-test.js';
// 选必一 第一章 动量守恒定律
export { MomentumModel } from './models/momentum.js';
// 选必一 第二章 机械振动
export { SimplePendulumModel } from './models/simple-pendulum.js';
// 选必一 第三章 机械波
export { MechanicalWaveModel } from './models/mechanical-wave.js';
// 选必一 第四章 光
export { RefractionModel } from './models/refraction.js';
export { InterferenceModel } from './models/interference.js';
// 必修三 第十一章 电路及其应用
export { CircuitModel } from './models/circuit.js';
// 选必三 气体/热学
export { GasLawModel } from './models/gas-law.js';
// 选必三 §4 原子结构和波粒二象性
export { PhotoelectricModel } from './models/photoelectric.js';
export { BohrModel } from './models/bohr.js';
// 选必三 §5 原子核
export { RadioactiveDecayModel } from './models/radioactive-decay.js';
// 选必二 §1 安培力与洛伦兹力
export { MagneticForceModel } from './models/magnetic-force.js';
// 选必二 §2 电磁感应
export { EMInductionModel } from './models/em-induction.js';
// 选必二 §3 交变电流 + §4 LC 振荡
export { ACCurrentModel } from './models/ac-current.js';
export { LCOscillatorModel } from './models/lc-oscillator.js';
// 打点计时器实验 (必修一 第一章 实验)
export { TickerTimerModel } from './models/ticker-timer.js';
// 必修一 第四章 牛顿第一定律 — 伽利略斜面理想实验
export { GalileoInclineModel } from './models/galileo-incline.js';
// 必修一 第四章 牛顿第一定律 — 惯性实验组合
export { InertiaModel } from './models/inertia.js';
// 选必一 §5 实验: 光杠杆放大法演示桌面微小形变
export { MicroDeformationModel } from './models/micro-deformation.js';
// 互动实验: 测反应时间 (自由落体法)
export { ReactionTimeModel } from './models/reaction-time.js';
// 必修一 第四章 运动和力的关系: 超重与失重
export { OverweightModel } from './models/overweight.js';
// 重心实验 (悬挂法)
export { CenterOfGravityModel } from './models/center-of-gravity.js';

// === 求解器导出 ===
export { solveProblem } from './solver/solver-router.js';

// physics-core: 面向高中物理教学的二维物理模拟引擎

// === 类型导出 ===
export type { Vector2D, Quantity, ParameterSpec, ValidationResult, PhysicalBody, RenderHint } from './types/common.js';
export type {
    PhysicsProblem,
    ModelType,
    NewtonSecondLawConstraint,
    ForceCompositionConstraint,
    NewtonThirdLawConstraint,
    SlidingFrictionConstraint,
    ProjectileConstraint,
    OrbitalConstraint,
    MomentumConstraint,
    WaveConstraint,
    RefractionConstraint,
    InterferenceConstraint,
    CircuitConstraint,
    GasLawConstraint,
    PhotoelectricConstraint,
    BohrModelConstraint,
    RadioactiveDecayConstraint,
    MagneticForceConstraint,
    EMInductionConstraint,
    ACCurrentConstraint,
    LCOscillatorConstraint,
    TickerTimerConstraint,
    MicroDeformationConstraint,
    ReactionTimeConstraint,
    GalileoInclineConstraint,
    GalileoInclineMode,
    InertiaConstraint,
    InertiaMode,
    OverweightConstraint,
    OverweightMode,
    CenterOfGravityConstraint,
    TransmissionConstraint,
    VerticalCircleConstraint,
    CentrifugalConstraint,
    CurveVelocityConstraint,
    CurveTrackShape,
    CurveConditionConstraint,
    MotionCompositionConstraint,
    CavendishConstraint,
    MoonEarthTestConstraint,
    VernierCaliperConstraint,
    MicrometerConstraint,
    MultimeterConstraint,
    MultimeterMode,
    AmpereForceConstraint,
    HertzExperimentConstraint,
    CapacitorConstraint,
    ParallelPlateConstraint,
    ResistanceLawConstraint,
    LoadVoltageConstraint,
    ResistanceMaterial,
    ElectrostaticInductionConstraint,
    ElectroscopeConstraint,
    CoulombForceConstraint,
    CoulombForceMode,
    ElectrostaticShieldingConstraint,
    FaradayCupConstraint,
    ProjectileCollisionConstraint,
    DoublePendulumConstraint,
    ForcedVibrationConstraint,
    ResonanceConstraint,
    SoundWaveformConstraint,
    WaterDiffractionConstraint,
    SoundInterferenceConstraint,
    DopplerConstraint,
    ThinFilmConstraint,
    HologramConstraint,
    SingleSlitConstraint,
    DiffractionGratingConstraint,
    PolarizationConstraint,
    ElectricFieldLinesConstraint,
    CurrentMagneticFieldConstraint,
    FieldCharge
} from './types/problem.js';
export { RESISTIVITY } from './types/problem.js';
export type {
    SimulationResult,
    TrajectoryPoint,
    Keyframe,
    ChartSeries,
    ExplanationStep,
    FormulaUsage
} from './types/result.js';

// === 错误类导出 ===
export {
    PhysicsError,
    UnsupportedModelError,
    ParameterOutOfRangeError,
    ConsistencyViolationError
} from './errors/index.js';

// === 基础设施导出 ===
export { Vec2 } from './math/vector2d.js';
// QuantityFactory/convert/quantity 无外部消费者 (仅测试使用), 不再通过 barrel 公开
export { PHYSICS_CONSTANTS } from './units/constants.js';

// === 模型导出 ===
export { PhysicsModelBase, registerModel, getModel, listModels } from './models/base.js';
// 全部具体模型类由 models/index.ts 聚合 barrel 统一 re-export（单一维护源）
export * from './models/index.js';

// === 求解器导出 ===
export { solveProblem } from './solver/solver-router.js';

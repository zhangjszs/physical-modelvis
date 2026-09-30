// physics-core: 面向高中物理教学的二维物理模拟引擎

// === 类型导出 ===
export type {
    Vector2D,
    Vector3D,
    Quantity,
    ParameterSpec,
    ValidationResult,
    PhysicalBody,
    RenderHint
} from './types/common.js';
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
    TimeConfig,
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
export { Vec3 } from './math/vector3d.js';
// QuantityFactory/convert/quantity 无外部消费者 (仅测试使用), 不再通过 barrel 公开
export { PHYSICS_CONSTANTS } from './units/constants.js';

// === 3D 场源与数值积分 (拖拽组合实验的地基) ===
export type { ElectricFieldSource, MagneticFieldSource, FieldSource } from './physics/fields3d.js';
export {
    pointChargeElectricField,
    chargedPlateElectricField,
    straightWireMagneticField,
    circularCoilMagneticField,
    totalElectricField,
    totalMagneticField
} from './physics/fields3d.js';
export type {
    FieldAtPoint,
    FieldEvaluator,
    TrajectoryPoint3D,
    BorisTrajectory3DOptions,
    BorisTrajectory3DResult
} from './physics/boris3d.js';
export { borisTrajectory3D } from './physics/boris3d.js';

// === 3D 组合实验层 (拖拽实验台: 描述 → 校验 → 求解 / 场线) ===
export type { CompositionParticle, CompositionExperiment, CompositionSimResult } from './physics/composition.js';
export { validateComposition, compositionFieldAt, simulateComposition } from './physics/composition.js';
export type { FieldLineOptions } from './physics/fieldlines.js';
export { traceFieldLine } from './physics/fieldlines.js';

// === 模型导出 ===
export { PhysicsModelBase, registerModel, getModel, listModels } from './models/base.js';
// 全部具体模型类由 models/index.ts 聚合 barrel 统一 re-export（单一维护源）
export * from './models/index.js';

// === 求解器导出 ===
export { solveProblem } from './solver/solver-router.js';

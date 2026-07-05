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
  VernierCaliperConstraint, MicrometerConstraint, MultimeterConstraint, MultimeterMode,
  AmpereForceConstraint, HertzExperimentConstraint,
  CapacitorConstraint, ParallelPlateConstraint, ResistanceLawConstraint, LoadVoltageConstraint,
  ResistanceMaterial,
  ElectrostaticInductionConstraint, ElectroscopeConstraint,
  CoulombForceConstraint, CoulombForceMode,
  ElectrostaticShieldingConstraint, FaradayCupConstraint,
  ProjectileCollisionConstraint,
  DoublePendulumConstraint, ForcedVibrationConstraint, ResonanceConstraint,
  SoundWaveformConstraint, WaterDiffractionConstraint,
  SoundInterferenceConstraint, DopplerConstraint,
  ThinFilmConstraint, HologramConstraint,
  SingleSlitConstraint, DiffractionGratingConstraint, PolarizationConstraint,
} from './types/problem.js';
export { RESISTIVITY } from './types/problem.js';
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
export { CapacitorChargeModel } from './models/capacitor-charge.js';
export { ParallelPlateCapacitorModel } from './models/parallel-plate-capacitor.js';
export { ResistanceLawModel } from './models/resistance-law.js';
export { LoadVoltageModel } from './models/load-voltage.js';
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
// 必修三 实验: 测量仪器读数练习
export { VernierCaliperModel } from './models/vernier-caliper.js';
export { MicrometerModel } from './models/micrometer.js';
export { MultimeterModel } from './models/multimeter.js';
// 必修三 第十二章 安培力因素实验
export { AmpereForceModel } from './models/ampere-force.js';
// 必修三 第十三章 赫兹电磁波实验
export { HertzExperimentModel } from './models/em-wave-hertz.js';
// 必修三 第十二章 静电感应与静电屏蔽
export { ElectrostaticInductionModel } from './models/electrostatic-induction.js';
export { ElectroscopeModel } from './models/electroscope.js';
export { CoulombForceExploreModel } from './models/coulomb-force-explore.js';
export { ElectrostaticShieldingModel } from './models/electrostatic-shielding.js';
export { FaradayCupModel } from './models/faraday-cup.js';
// 选必二 电路与电磁感应
export { CurrentBalanceModel } from './models/current-balance.js';
export { EddyCurrentModel } from './models/eddy-current.js';
export { EMDampingModel } from './models/em-damping.js';
export { MutualInductanceModel } from './models/mutual-inductance.js';
export { SelfInductanceModel } from './models/self-inductance.js';
// 选必二 电磁波与传感器
export { EMWaveCommunicationModel } from './models/em-wave-communication.js';
export { EMSpectrumModel } from './models/em-spectrum.js';
export { HallEffectModel } from './models/hall-effect.js';
export { ReedSwitchModel } from './models/reed-switch.js';
export { ThermistorModel } from './models/thermistor.js';
export { PhotoresistorModel } from './models/photoresistor.js';
export { StrainGaugeModel } from './models/strain-gauge.js';
export { SecurityAlarmModel } from './models/security-alarm.js';
export { LightControlSwitchModel } from './models/light-control-switch.js';
// 选必三 §1-2 分子动理论/物态
export { DiffusionModel } from './models/diffusion.js';
export { BrownianMotionModel } from './models/brownian-motion.js';
export { MolecularForceModel } from './models/molecular-force.js';
export { LiquidMixingModel } from './models/liquid-mixing.js';
export { OilFilmModel } from './models/oil-film.js';
export { MeltingCurveModel } from './models/melting-curve.js';
export { SurfaceTensionModel } from './models/surface-tension.js';
export { CapillaryModel } from './models/capillary.js';
export { WettingModel } from './models/wetting.js';
export { LiquidCrystalModel } from './models/liquid-crystal.js';
// 选必三 §3 热力学
export { JouleMechanicalModel } from './models/joule-mechanical.js';
export { JouleElectricalModel } from './models/joule-electrical.js';
export { AdiabaticCompressionModel } from './models/adiabatic-compression.js';
export { HeatTransferModel } from './models/heat-transfer.js';
export { EnergyTransformationModel } from './models/energy-transformation.js';
export { PerpetuumMobileModel } from './models/perpetuum-mobile.js';
// 选必三 §4 原子物理
export { BlackBodyModel } from './models/black-body.js';
// 选必三 §5 原子核
export { HeatDirectionModel } from './models/heat-direction.js';
export { AlphaScatteringModel } from './models/alpha-scattering.js';
export { ElectronDiffractionModel } from './models/electron-diffraction.js';
export { RadiationDeflectionModel } from './models/radiation-deflection.js';
export { DecayStatisticsModel } from './models/decay-statistics.js';
export { CosmicRayModel } from './models/cosmic-ray.js';
export { NeutronDiscoveryModel } from './models/neutron-discovery.js';
export { FissionChainModel } from './models/fission-chain.js';
// 选必一 第一章 实验
export { ProjectileCollisionModel } from './models/projectile-collision.js';
// 选必一 第二章 振动
export { DoublePendulumSyncModel } from './models/double-pendulum.js';
export { ForcedVibrationModel } from './models/forced-vibration.js';
export { ResonanceModel } from './models/resonance.js';
// 选必一 第三章 波
export { SoundWaveformModel } from './models/sound-waveform.js';
export { WaterDiffractionModel } from './models/water-diffraction.js';
export { SoundInterferenceModel } from './models/sound-interference.js';
export { DopplerModel } from './models/doppler.js';
// 选必一 第四章 光
export { ThinFilmModel } from './models/thin-film.js';
export { HologramModel } from './models/hologram.js';
export { SingleSlitModel } from './models/single-slit.js';
export { DiffractionGratingModel } from './models/diffraction-grating.js';
export { PolarizationModel } from './models/polarization.js';

// === 求解器导出 ===
export { solveProblem } from './solver/solver-router.js';

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
import { CurveVelocityDirectionModel } from '../models/curve-velocity-direction.js';
import { CurveConditionModel } from '../models/curve-condition.js';
import { MotionCompositionModel } from '../models/motion-composition.js';
import { TransmissionBeltModel } from '../models/transmission-belt.js';
import { VerticalCircleModel } from '../models/vertical-circle.js';
import { CentrifugalModel } from '../models/centrifugal.js';
import { OrbitalModel } from '../models/orbital.js';
import { CavendishModel } from '../models/cavendish.js';
import { MoonEarthTestModel } from '../models/moon-earth-test.js';
import { MomentumModel } from '../models/momentum.js';
import { SimplePendulumModel } from '../models/simple-pendulum.js';
import { MechanicalWaveModel } from '../models/mechanical-wave.js';
import { RefractionModel } from '../models/refraction.js';
import { InterferenceModel } from '../models/interference.js';
import { CircuitModel } from '../models/circuit.js';
import { CapacitorChargeModel } from '../models/capacitor-charge.js';
import { ParallelPlateCapacitorModel } from '../models/parallel-plate-capacitor.js';
import { ResistanceLawModel } from '../models/resistance-law.js';
import { LoadVoltageModel } from '../models/load-voltage.js';
import { GasLawModel } from '../models/gas-law.js';
import { PhotoelectricModel } from '../models/photoelectric.js';
import { BohrModel } from '../models/bohr.js';
import { RadioactiveDecayModel } from '../models/radioactive-decay.js';
import { MagneticForceModel } from '../models/magnetic-force.js';
import { EMInductionModel } from '../models/em-induction.js';
import { ACCurrentModel } from '../models/ac-current.js';
import { LCOscillatorModel } from '../models/lc-oscillator.js';
import { TickerTimerModel } from '../models/ticker-timer.js';
import { GalileoInclineModel } from '../models/galileo-incline.js';
import { InertiaModel } from '../models/inertia.js';
import { MicroDeformationModel } from '../models/micro-deformation.js';
import { ReactionTimeModel } from '../models/reaction-time.js';
import { OverweightModel } from '../models/overweight.js';
import { CenterOfGravityModel } from '../models/center-of-gravity.js';
import { VernierCaliperModel } from '../models/vernier-caliper.js';
import { MicrometerModel } from '../models/micrometer.js';
import { MultimeterModel } from '../models/multimeter.js';
import { AmpereForceModel } from '../models/ampere-force.js';
import { HertzExperimentModel } from '../models/em-wave-hertz.js';
import { ElectrostaticInductionModel } from '../models/electrostatic-induction.js';
import { ElectroscopeModel } from '../models/electroscope.js';
import { CoulombForceExploreModel } from '../models/coulomb-force-explore.js';
import { ElectrostaticShieldingModel } from '../models/electrostatic-shielding.js';
import { FaradayCupModel } from '../models/faraday-cup.js';
// 选必二 电路与电磁感应
import { CurrentBalanceModel } from '../models/current-balance.js';
import { EddyCurrentModel } from '../models/eddy-current.js';
import { EMDampingModel } from '../models/em-damping.js';
import { MutualInductanceModel } from '../models/mutual-inductance.js';
import { SelfInductanceModel } from '../models/self-inductance.js';
// 选必二 电磁波与传感器
import { EMWaveCommunicationModel } from '../models/em-wave-communication.js';
import { EMSpectrumModel } from '../models/em-spectrum.js';
import { HallEffectModel } from '../models/hall-effect.js';
import { ReedSwitchModel } from '../models/reed-switch.js';
import { ThermistorModel } from '../models/thermistor.js';
import { PhotoresistorModel } from '../models/photoresistor.js';
import { StrainGaugeModel } from '../models/strain-gauge.js';
import { SecurityAlarmModel } from '../models/security-alarm.js';
import { LightControlSwitchModel } from '../models/light-control-switch.js';
// 选必三 §1-2 分子动理论/物态
import { DiffusionModel } from '../models/diffusion.js';
import { BrownianMotionModel } from '../models/brownian-motion.js';
import { MolecularForceModel } from '../models/molecular-force.js';
import { LiquidMixingModel } from '../models/liquid-mixing.js';
import { OilFilmModel } from '../models/oil-film.js';
import { MeltingCurveModel } from '../models/melting-curve.js';
import { SurfaceTensionModel } from '../models/surface-tension.js';
import { CapillaryModel } from '../models/capillary.js';
import { WettingModel } from '../models/wetting.js';
import { LiquidCrystalModel } from '../models/liquid-crystal.js';
// 选必三 §3 热力学
import { JouleMechanicalModel } from '../models/joule-mechanical.js';
import { JouleElectricalModel } from '../models/joule-electrical.js';
import { AdiabaticCompressionModel } from '../models/adiabatic-compression.js';
import { HeatTransferModel } from '../models/heat-transfer.js';
import { EnergyTransformationModel } from '../models/energy-transformation.js';
import { PerpetuumMobileModel } from '../models/perpetuum-mobile.js';
// 选必三 §4 原子物理
import { BlackBodyModel } from '../models/black-body.js';
// 选必三 §5 原子核
import { HeatDirectionModel } from '../models/heat-direction.js';
import { AlphaScatteringModel } from '../models/alpha-scattering.js';
import { ElectronDiffractionModel } from '../models/electron-diffraction.js';
import { RadiationDeflectionModel } from '../models/radiation-deflection.js';
import { DecayStatisticsModel } from '../models/decay-statistics.js';
import { CosmicRayModel } from '../models/cosmic-ray.js';
import { NeutronDiscoveryModel } from '../models/neutron-discovery.js';
import { FissionChainModel } from '../models/fission-chain.js';
// 选必一 第一章 实验
import { ProjectileCollisionModel } from '../models/projectile-collision.js';
// 选必一 第二章 振动
import { DoublePendulumSyncModel } from '../models/double-pendulum.js';
import { ForcedVibrationModel } from '../models/forced-vibration.js';
import { ResonanceModel } from '../models/resonance.js';
// 选必一 第三章 波
import { SoundWaveformModel } from '../models/sound-waveform.js';
import { WaterDiffractionModel } from '../models/water-diffraction.js';
import { SoundInterferenceModel } from '../models/sound-interference.js';
import { DopplerModel } from '../models/doppler.js';
// 选必一 第四章 光
import { ThinFilmModel } from '../models/thin-film.js';
import { HologramModel } from '../models/hologram.js';
import { SingleSlitModel } from '../models/single-slit.js';
import { DiffractionGratingModel } from '../models/diffraction-grating.js';
import { PolarizationModel } from '../models/polarization.js';

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
// 必修二 第一章 曲线运动 (速度方向 / 曲线条件 / 运动合成)
registerModel(new CurveVelocityDirectionModel());
registerModel(new CurveConditionModel());
registerModel(new MotionCompositionModel());
// 必修二 第二章 圆周运动
registerModel(new TransmissionBeltModel());
registerModel(new VerticalCircleModel());
registerModel(new CentrifugalModel());
// 必修二 第三章 万有引力与航天
registerModel(new OrbitalModel());
registerModel(new CavendishModel());
registerModel(new MoonEarthTestModel());
// 选必一 第一章 动量守恒定律
registerModel(new MomentumModel());
// 选必一 第二章 机械振动 (单摆)
registerModel(new SimplePendulumModel());
// 选必一 第三章 机械波
registerModel(new MechanicalWaveModel());
// 选必一 第四章 光
registerModel(new RefractionModel());
registerModel(new InterferenceModel());
// 必修三 第十一章 电路及其应用
registerModel(new CircuitModel());
registerModel(new CapacitorChargeModel());
registerModel(new ParallelPlateCapacitorModel());
registerModel(new ResistanceLawModel());
registerModel(new LoadVoltageModel());
// 选必三 气体/热学
registerModel(new GasLawModel());
// 选必三 §4 原子结构和波粒二象性
registerModel(new PhotoelectricModel());
registerModel(new BohrModel());
// 选必三 §5 原子核
registerModel(new RadioactiveDecayModel());
// 选必二 §1 安培力与洛伦兹力
registerModel(new MagneticForceModel());
// 选必二 §2 电磁感应
registerModel(new EMInductionModel());
// 选必二 §3+4 交变电流 + LC 振荡
registerModel(new ACCurrentModel());
registerModel(new LCOscillatorModel());
// 打点计时器实验 (必修一 第一章 实验)
registerModel(new TickerTimerModel());
// 必修一 第四章 牛顿第一定律 — 伽利略斜面理想实验
registerModel(new GalileoInclineModel());
// 必修一 第四章 牛顿第一定律 — 惯性实验组合
registerModel(new InertiaModel());
// 选必一 §5 实验: 光杠杆放大法演示桌面微小形变
registerModel(new MicroDeformationModel());
// 互动实验: 测反应时间 (自由落体法)
registerModel(new ReactionTimeModel());
// 必修一 第四章 运动和力的关系: 超重与失重
registerModel(new OverweightModel());
// 重心实验 (悬挂法)
registerModel(new CenterOfGravityModel());
// 必修三 实验: 测量仪器读数练习
registerModel(new VernierCaliperModel());
registerModel(new MicrometerModel());
registerModel(new MultimeterModel());
// 必修三 第十二章 安培力因素实验
registerModel(new AmpereForceModel());
// 必修三 第十三章 赫兹电磁波实验
registerModel(new HertzExperimentModel());
// 必修三 第十二章 静电感应与静电屏蔽
registerModel(new ElectrostaticInductionModel());
registerModel(new ElectroscopeModel());
registerModel(new CoulombForceExploreModel());
registerModel(new ElectrostaticShieldingModel());
registerModel(new FaradayCupModel());
// 选必一 第一章 实验 (平抛验证动量守恒)
registerModel(new ProjectileCollisionModel());
// 选必一 第二章 振动 (双单摆/受迫/共振)
registerModel(new DoublePendulumSyncModel());
registerModel(new ForcedVibrationModel());
registerModel(new ResonanceModel());
// 选必一 第三章 波 (声波/水波/干涉/多普勒)
registerModel(new SoundWaveformModel());
registerModel(new WaterDiffractionModel());
registerModel(new SoundInterferenceModel());
registerModel(new DopplerModel());
// 选必一 第四章 光 (薄膜/全息/单缝/光栅/偏振)
registerModel(new ThinFilmModel());
registerModel(new HologramModel());
registerModel(new SingleSlitModel());
registerModel(new DiffractionGratingModel());
registerModel(new PolarizationModel());
// 选必二 电路与电磁感应
registerModel(new CurrentBalanceModel());
registerModel(new EddyCurrentModel());
registerModel(new EMDampingModel());
registerModel(new MutualInductanceModel());
registerModel(new SelfInductanceModel());
// 选必二 电磁波与传感器
registerModel(new EMWaveCommunicationModel());
registerModel(new EMSpectrumModel());
registerModel(new HallEffectModel());
registerModel(new ReedSwitchModel());
registerModel(new ThermistorModel());
registerModel(new PhotoresistorModel());
registerModel(new StrainGaugeModel());
registerModel(new SecurityAlarmModel());
registerModel(new LightControlSwitchModel());
// 选必三 §1-2
registerModel(new DiffusionModel());
registerModel(new BrownianMotionModel());
registerModel(new MolecularForceModel());
registerModel(new LiquidMixingModel());
registerModel(new OilFilmModel());
registerModel(new MeltingCurveModel());
registerModel(new SurfaceTensionModel());
registerModel(new CapillaryModel());
registerModel(new WettingModel());
registerModel(new LiquidCrystalModel());
// 选必三 §3
registerModel(new JouleMechanicalModel());
registerModel(new JouleElectricalModel());
registerModel(new AdiabaticCompressionModel());
registerModel(new HeatTransferModel());
registerModel(new EnergyTransformationModel());
registerModel(new PerpetuumMobileModel());
// 选必三 §4
registerModel(new BlackBodyModel());
// 选必三 §5
registerModel(new HeatDirectionModel());
registerModel(new AlphaScatteringModel());
registerModel(new ElectronDiffractionModel());
registerModel(new RadiationDeflectionModel());
registerModel(new DecayStatisticsModel());
registerModel(new CosmicRayModel());
registerModel(new NeutronDiscoveryModel());
registerModel(new FissionChainModel());

export function solveProblem(problem: PhysicsProblem): SimulationResult {
  const model = getModel(problem.model);
  const t0 = Date.now();
  const result = model.solve(problem);
  const computationTime = Date.now() - t0;
  return { ...result, meta: { ...result.meta, computationTime } };
}

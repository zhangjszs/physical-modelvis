//
// 自动聚合：physics-core 全部模型类的唯一注册源。
// 新增模型只需在此文件三处追加（import / 具名导出 / MODELS 实例），
// 由 index.ts 与 solver-router.ts 分别 re-export 与注册，消除双维护。
//

import type { PhysicsModelBase } from './base.js';

import { UniformLinearModel } from './uniform-linear.js';
import { UniformAcceleratedModel } from './uniform-accelerated.js';
import { UniformElectricModel } from './uniform-electric-field.js';
import { UniformMagneticModel } from './uniform-magnetic-field.js';
import { SpringOscillatorModel } from './spring-oscillator.js';
import { InclinedPlaneModel } from './inclined-plane.js';
import { EMCombinedFieldModel } from './em-combined-field.js';
import { CollisionModel, InelasticCollisionModel } from './collision.js';
import { UniformCircularMotionModel } from './uniform-circular-motion.js';
import { ForceCompositionModel } from './force-composition.js';
import { NewtonThirdLawModel } from './newton-third-law.js';
import { SlidingFrictionModel } from './sliding-friction.js';
import { NewtonSecondLawModel } from './newton-second-law.js';
import { ProjectileModel } from './projectile.js';
import { CurveVelocityDirectionModel } from './curve-velocity-direction.js';
import { CurveConditionModel } from './curve-condition.js';
import { MotionCompositionModel } from './motion-composition.js';
import { TransmissionBeltModel } from './transmission-belt.js';
import { VerticalCircleModel } from './vertical-circle.js';
import { CentrifugalModel } from './centrifugal.js';
import { OrbitalModel } from './orbital.js';
import { CavendishModel } from './cavendish.js';
import { MoonEarthTestModel } from './moon-earth-test.js';
import { MomentumModel } from './momentum.js';
import { SimplePendulumModel } from './simple-pendulum.js';
import { MechanicalWaveModel } from './mechanical-wave.js';
import { RefractionModel } from './refraction.js';
import { InterferenceModel } from './interference.js';
import { CircuitModel } from './circuit.js';
import { CapacitorChargeModel } from './capacitor-charge.js';
import { ParallelPlateCapacitorModel } from './parallel-plate-capacitor.js';
import { ResistanceLawModel } from './resistance-law.js';
import { LoadVoltageModel } from './load-voltage.js';
import { GasLawModel } from './gas-law.js';
import { PhotoelectricModel } from './photoelectric.js';
import { BohrModel } from './bohr.js';
import { RadioactiveDecayModel } from './radioactive-decay.js';
import { MagneticForceModel } from './magnetic-force.js';
import { EMInductionModel } from './em-induction.js';
import { ACCurrentModel } from './ac-current.js';
import { LCOscillatorModel } from './lc-oscillator.js';
import { TickerTimerModel } from './ticker-timer.js';
import { GalileoInclineModel } from './galileo-incline.js';
import { InertiaModel } from './inertia.js';
import { MicroDeformationModel } from './micro-deformation.js';
import { ReactionTimeModel } from './reaction-time.js';
import { OverweightModel } from './overweight.js';
import { CenterOfGravityModel } from './center-of-gravity.js';
import { VernierCaliperModel } from './vernier-caliper.js';
import { MicrometerModel } from './micrometer.js';
import { MultimeterModel } from './multimeter.js';
import { AmpereForceModel } from './ampere-force.js';
import { HertzExperimentModel } from './em-wave-hertz.js';
import { ElectrostaticInductionModel } from './electrostatic-induction.js';
import { ElectroscopeModel } from './electroscope.js';
import { CoulombForceExploreModel } from './coulomb-force-explore.js';
import { ElectrostaticShieldingModel } from './electrostatic-shielding.js';
import { FaradayCupModel } from './faraday-cup.js';
import { CurrentBalanceModel } from './current-balance.js';
import { EddyCurrentModel } from './eddy-current.js';
import { EMDampingModel } from './em-damping.js';
import { MutualInductanceModel } from './mutual-inductance.js';
import { SelfInductanceModel } from './self-inductance.js';
import { EMWaveCommunicationModel } from './em-wave-communication.js';
import { EMSpectrumModel } from './em-spectrum.js';
import { HallEffectModel } from './hall-effect.js';
import { ReedSwitchModel } from './reed-switch.js';
import { ThermistorModel } from './thermistor.js';
import { PhotoresistorModel } from './photoresistor.js';
import { StrainGaugeModel } from './strain-gauge.js';
import { SecurityAlarmModel } from './security-alarm.js';
import { LightControlSwitchModel } from './light-control-switch.js';
import { DiffusionModel } from './diffusion.js';
import { BrownianMotionModel } from './brownian-motion.js';
import { MolecularForceModel } from './molecular-force.js';
import { LiquidMixingModel } from './liquid-mixing.js';
import { OilFilmModel } from './oil-film.js';
import { MeltingCurveModel } from './melting-curve.js';
import { SurfaceTensionModel } from './surface-tension.js';
import { CapillaryModel } from './capillary.js';
import { WettingModel } from './wetting.js';
import { LiquidCrystalModel } from './liquid-crystal.js';
import { JouleMechanicalModel } from './joule-mechanical.js';
import { JouleElectricalModel } from './joule-electrical.js';
import { AdiabaticCompressionModel } from './adiabatic-compression.js';
import { HeatTransferModel } from './heat-transfer.js';
import { EnergyTransformationModel } from './energy-transformation.js';
import { PerpetuumMobileModel } from './perpetuum-mobile.js';
import { BlackBodyModel } from './black-body.js';
import { HeatDirectionModel } from './heat-direction.js';
import { AlphaScatteringModel } from './alpha-scattering.js';
import { ElectronDiffractionModel } from './electron-diffraction.js';
import { RadiationDeflectionModel } from './radiation-deflection.js';
import { DecayStatisticsModel } from './decay-statistics.js';
import { CosmicRayModel } from './cosmic-ray.js';
import { NeutronDiscoveryModel } from './neutron-discovery.js';
import { FissionChainModel } from './fission-chain.js';
import { ProjectileCollisionModel } from './projectile-collision.js';
import { DoublePendulumSyncModel } from './double-pendulum.js';
import { ForcedVibrationModel } from './forced-vibration.js';
import { ResonanceModel } from './resonance.js';
import { SoundWaveformModel } from './sound-waveform.js';
import { WaterDiffractionModel } from './water-diffraction.js';
import { SoundInterferenceModel } from './sound-interference.js';
import { DopplerModel } from './doppler.js';
import { ThinFilmModel } from './thin-film.js';
import { HologramModel } from './hologram.js';
import { SingleSlitModel } from './single-slit.js';
import { DiffractionGratingModel } from './diffraction-grating.js';
import { PolarizationModel } from './polarization.js';
import { ElectricFieldLinesModel } from './electric-field-lines.js';
import { CurrentMagneticFieldModel } from './current-magnetic-field.js';
export {
    UniformLinearModel,
    UniformAcceleratedModel,
    UniformElectricModel,
    UniformMagneticModel,
    SpringOscillatorModel,
    InclinedPlaneModel,
    EMCombinedFieldModel,
    CollisionModel,
    InelasticCollisionModel,
    UniformCircularMotionModel,
    ForceCompositionModel,
    NewtonThirdLawModel,
    SlidingFrictionModel,
    NewtonSecondLawModel,
    ProjectileModel,
    CurveVelocityDirectionModel,
    CurveConditionModel,
    MotionCompositionModel,
    TransmissionBeltModel,
    VerticalCircleModel,
    CentrifugalModel,
    OrbitalModel,
    CavendishModel,
    MoonEarthTestModel,
    MomentumModel,
    SimplePendulumModel,
    MechanicalWaveModel,
    RefractionModel,
    InterferenceModel,
    CircuitModel,
    CapacitorChargeModel,
    ParallelPlateCapacitorModel,
    ResistanceLawModel,
    LoadVoltageModel,
    GasLawModel,
    PhotoelectricModel,
    BohrModel,
    RadioactiveDecayModel,
    MagneticForceModel,
    EMInductionModel,
    ACCurrentModel,
    LCOscillatorModel,
    TickerTimerModel,
    GalileoInclineModel,
    InertiaModel,
    MicroDeformationModel,
    ReactionTimeModel,
    OverweightModel,
    CenterOfGravityModel,
    VernierCaliperModel,
    MicrometerModel,
    MultimeterModel,
    AmpereForceModel,
    HertzExperimentModel,
    ElectrostaticInductionModel,
    ElectroscopeModel,
    CoulombForceExploreModel,
    ElectrostaticShieldingModel,
    FaradayCupModel,
    CurrentBalanceModel,
    EddyCurrentModel,
    EMDampingModel,
    MutualInductanceModel,
    SelfInductanceModel,
    EMWaveCommunicationModel,
    EMSpectrumModel,
    HallEffectModel,
    ReedSwitchModel,
    ThermistorModel,
    PhotoresistorModel,
    StrainGaugeModel,
    SecurityAlarmModel,
    LightControlSwitchModel,
    DiffusionModel,
    BrownianMotionModel,
    MolecularForceModel,
    LiquidMixingModel,
    OilFilmModel,
    MeltingCurveModel,
    SurfaceTensionModel,
    CapillaryModel,
    WettingModel,
    LiquidCrystalModel,
    JouleMechanicalModel,
    JouleElectricalModel,
    AdiabaticCompressionModel,
    HeatTransferModel,
    EnergyTransformationModel,
    PerpetuumMobileModel,
    BlackBodyModel,
    HeatDirectionModel,
    AlphaScatteringModel,
    ElectronDiffractionModel,
    RadiationDeflectionModel,
    DecayStatisticsModel,
    CosmicRayModel,
    NeutronDiscoveryModel,
    FissionChainModel,
    ProjectileCollisionModel,
    DoublePendulumSyncModel,
    ForcedVibrationModel,
    ResonanceModel,
    SoundWaveformModel,
    WaterDiffractionModel,
    SoundInterferenceModel,
    DopplerModel,
    ThinFilmModel,
    HologramModel,
    SingleSlitModel,
    DiffractionGratingModel,
    PolarizationModel,
    ElectricFieldLinesModel,
    CurrentMagneticFieldModel
};

/** 全部模型实例 — 单一注册源 (single source of truth) */
export const MODELS: readonly PhysicsModelBase[] = [
    new UniformLinearModel(),
    new UniformAcceleratedModel(),
    new UniformElectricModel(),
    new UniformMagneticModel(),
    new SpringOscillatorModel(),
    new InclinedPlaneModel(),
    new EMCombinedFieldModel(),
    new CollisionModel(),
    new InelasticCollisionModel(),
    new UniformCircularMotionModel(),
    new ForceCompositionModel(),
    new NewtonThirdLawModel(),
    new SlidingFrictionModel(),
    new NewtonSecondLawModel(),
    new ProjectileModel(),
    new CurveVelocityDirectionModel(),
    new CurveConditionModel(),
    new MotionCompositionModel(),
    new TransmissionBeltModel(),
    new VerticalCircleModel(),
    new CentrifugalModel(),
    new OrbitalModel(),
    new CavendishModel(),
    new MoonEarthTestModel(),
    new MomentumModel(),
    new SimplePendulumModel(),
    new MechanicalWaveModel(),
    new RefractionModel(),
    new InterferenceModel(),
    new CircuitModel(),
    new CapacitorChargeModel(),
    new ParallelPlateCapacitorModel(),
    new ResistanceLawModel(),
    new LoadVoltageModel(),
    new GasLawModel(),
    new PhotoelectricModel(),
    new BohrModel(),
    new RadioactiveDecayModel(),
    new MagneticForceModel(),
    new EMInductionModel(),
    new ACCurrentModel(),
    new LCOscillatorModel(),
    new TickerTimerModel(),
    new GalileoInclineModel(),
    new InertiaModel(),
    new MicroDeformationModel(),
    new ReactionTimeModel(),
    new OverweightModel(),
    new CenterOfGravityModel(),
    new VernierCaliperModel(),
    new MicrometerModel(),
    new MultimeterModel(),
    new AmpereForceModel(),
    new HertzExperimentModel(),
    new ElectrostaticInductionModel(),
    new ElectroscopeModel(),
    new CoulombForceExploreModel(),
    new ElectrostaticShieldingModel(),
    new FaradayCupModel(),
    new CurrentBalanceModel(),
    new EddyCurrentModel(),
    new EMDampingModel(),
    new MutualInductanceModel(),
    new SelfInductanceModel(),
    new EMWaveCommunicationModel(),
    new EMSpectrumModel(),
    new HallEffectModel(),
    new ReedSwitchModel(),
    new ThermistorModel(),
    new PhotoresistorModel(),
    new StrainGaugeModel(),
    new SecurityAlarmModel(),
    new LightControlSwitchModel(),
    new DiffusionModel(),
    new BrownianMotionModel(),
    new MolecularForceModel(),
    new LiquidMixingModel(),
    new OilFilmModel(),
    new MeltingCurveModel(),
    new SurfaceTensionModel(),
    new CapillaryModel(),
    new WettingModel(),
    new LiquidCrystalModel(),
    new JouleMechanicalModel(),
    new JouleElectricalModel(),
    new AdiabaticCompressionModel(),
    new HeatTransferModel(),
    new EnergyTransformationModel(),
    new PerpetuumMobileModel(),
    new BlackBodyModel(),
    new HeatDirectionModel(),
    new AlphaScatteringModel(),
    new ElectronDiffractionModel(),
    new RadiationDeflectionModel(),
    new DecayStatisticsModel(),
    new CosmicRayModel(),
    new NeutronDiscoveryModel(),
    new FissionChainModel(),
    new ProjectileCollisionModel(),
    new DoublePendulumSyncModel(),
    new ForcedVibrationModel(),
    new ResonanceModel(),
    new SoundWaveformModel(),
    new WaterDiffractionModel(),
    new SoundInterferenceModel(),
    new DopplerModel(),
    new ThinFilmModel(),
    new HologramModel(),
    new SingleSlitModel(),
    new DiffractionGratingModel(),
    new PolarizationModel(),
    new ElectricFieldLinesModel(),
    new CurrentMagneticFieldModel()
];

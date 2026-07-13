/**
 * 热学/量子/原子/现代物理 rig 包 — 选必三
 * 气体定律/热传递/相变/光电效应/玻尔模型/衰变/裂变/黑体/粒子
 */
import type { SceneRig } from '../../EquipmentStage';
import { quantumRig } from '../quantumRig';
import { nuclearRig } from '../nuclearRig';
import { blackBodyRig } from '../blackBodyRig';
import { cosmicRayRig } from '../cosmicRayRig';
import { electronDiffractionRig } from '../electronDiffractionRig';
import { faradayCupRig } from '../faradayCupRig';
import { liquidMixingRig } from '../liquidMixingRig';
import { molecularForceRig } from '../molecularForceRig';
import { neutronDiscoveryRig } from '../neutronDiscoveryRig';
import { radiationDeflectionRig } from '../radiationDeflectionRig';
import { gasLawRig } from '../gasLawRig';
import { diffusionRig } from '../diffusionRig';
import { brownianMotionRig } from '../brownianMotionRig';
import { oilFilmRig } from '../oilFilmRig';
import { meltingCurveRig } from '../meltingCurveRig';
import { surfaceTensionRig } from '../surfaceTensionRig';
import { capillaryRig } from '../capillaryRig';
import { wettingRig } from '../wettingRig';
import { liquidCrystalRig } from '../liquidCrystalRig';
import { jouleMechanicalRig } from '../jouleMechanicalRig';
import { jouleElectricalRig } from '../jouleElectricalRig';
import { adiabaticCompressionRig } from '../adiabaticCompressionRig';
import { heatTransferRig } from '../heatTransferRig';
import { energyTransformationRig } from '../energyTransformationRig';
import { perpetuumMobileRig } from '../perpetuumMobileRig';
import { heatDirectionRig } from '../heatDirectionRig';

export default {
    'gas-law': gasLawRig,
    photoelectric: quantumRig,
    bohr: quantumRig,
    'bohr-orbit': quantumRig,
    radioactive: nuclearRig,
    'geiger-counter': nuclearRig,
    diffusion: diffusionRig,
    'brownian-motion': brownianMotionRig,
    'oil-film': oilFilmRig,
    'melting-curve': meltingCurveRig,
    'surface-tension': surfaceTensionRig,
    capillary: capillaryRig,
    wetting: wettingRig,
    'liquid-crystal': liquidCrystalRig,
    'joule-mechanical': jouleMechanicalRig,
    'joule-electrical': jouleElectricalRig,
    'adiabatic-compression': adiabaticCompressionRig,
    'heat-transfer': heatTransferRig,
    'energy-transformation': energyTransformationRig,
    'perpetuum-mobile': perpetuumMobileRig,
    'heat-direction': heatDirectionRig,
    'alpha-scattering': nuclearRig,
    'decay-statistics': nuclearRig,
    'fission-chain': nuclearRig,
    'black-body': blackBodyRig,
    'cosmic-ray': cosmicRayRig,
    'electron-diffraction': electronDiffractionRig,
    'faraday-cup': faradayCupRig,
    'liquid-mixing': liquidMixingRig,
    'molecular-force': molecularForceRig,
    'neutron-discovery': neutronDiscoveryRig,
    'radiation-deflection': radiationDeflectionRig
} as Record<string, SceneRig>;

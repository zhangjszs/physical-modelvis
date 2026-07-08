/**
 * 热学/量子/原子/现代物理 rig 包 — 选必三
 * 气体定律/热传递/相变/光电效应/玻尔模型/衰变/裂变/黑体/粒子
 */
import type { SceneRig } from '../../EquipmentStage';
import { thermalRig } from '../thermalRig';
import { quantumRig } from '../quantumRig';
import { nuclearRig } from '../nuclearRig';
import { modernPhysicsRig } from '../modernPhysicsRig';

export default {
    'gas-law': thermalRig,
    photoelectric: quantumRig,
    bohr: quantumRig,
    'bohr-orbit': quantumRig,
    radioactive: nuclearRig,
    'geiger-counter': nuclearRig,
    diffusion: thermalRig,
    'brownian-motion': thermalRig,
    'oil-film': thermalRig,
    'melting-curve': thermalRig,
    'surface-tension': thermalRig,
    capillary: thermalRig,
    wetting: thermalRig,
    'liquid-crystal': thermalRig,
    'joule-mechanical': thermalRig,
    'joule-electrical': thermalRig,
    'adiabatic-compression': thermalRig,
    'heat-transfer': thermalRig,
    'energy-transformation': thermalRig,
    'perpetuum-mobile': thermalRig,
    'heat-direction': thermalRig,
    'alpha-scattering': nuclearRig,
    'decay-statistics': nuclearRig,
    'fission-chain': nuclearRig,
    'black-body': modernPhysicsRig,
    'cosmic-ray': modernPhysicsRig,
    'electron-diffraction': modernPhysicsRig,
    'faraday-cup': modernPhysicsRig,
    'liquid-mixing': modernPhysicsRig,
    'molecular-force': modernPhysicsRig,
    'neutron-discovery': modernPhysicsRig,
    'radiation-deflection': modernPhysicsRig
} as Record<string, SceneRig>;

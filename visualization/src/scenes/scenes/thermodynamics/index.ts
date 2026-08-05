import type { SceneConfig } from '../../../types/visualization';
import { gas_lawScene } from './gas-law';
import { diffusionScene } from './diffusion';
import { brownian_motionScene } from './brownian-motion';
import { oil_filmScene } from './oil-film';
import { liquid_mixingScene } from './liquid-mixing';
import { molecular_forceScene } from './molecular-force';
import { melting_curveScene } from './melting-curve';
import { surface_tensionScene } from './surface-tension';
import { capillaryScene } from './capillary';
import { wettingScene } from './wetting';
import { liquid_crystalScene } from './liquid-crystal';
import { joule_mechanicalScene } from './joule-mechanical';
import { joule_electricalScene } from './joule-electrical';
import { adiabatic_compressionScene } from './adiabatic-compression';
import { heat_transferScene } from './heat-transfer';
import { energy_transformationScene } from './energy-transformation';
import { perpetuum_mobileScene } from './perpetuum-mobile';
import { heat_directionScene } from './heat-direction';

export const ThermodynamicsScenes: SceneConfig[] = [
    gas_lawScene,
    diffusionScene,
    brownian_motionScene,
    oil_filmScene,
    liquid_mixingScene,
    molecular_forceScene,
    melting_curveScene,
    surface_tensionScene,
    capillaryScene,
    wettingScene,
    liquid_crystalScene,
    joule_mechanicalScene,
    joule_electricalScene,
    adiabatic_compressionScene,
    heat_transferScene,
    energy_transformationScene,
    perpetuum_mobileScene,
    heat_directionScene
];

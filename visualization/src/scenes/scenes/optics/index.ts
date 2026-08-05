import type { SceneConfig } from '../../../types/visualization';
import { refractionScene } from './refraction';
import { interferenceScene } from './interference';
import { thin_filmScene } from './thin-film';
import { single_slitScene } from './single-slit';
import { diffraction_gratingScene } from './diffraction-grating';
import { polarization_malusScene } from './polarization-malus';
import { hologramScene } from './hologram';
import { total_internal_reflectionScene } from './total-internal-reflection';

export const OpticsScenes: SceneConfig[] = [
    refractionScene,
    interferenceScene,
    thin_filmScene,
    single_slitScene,
    diffraction_gratingScene,
    polarization_malusScene,
    hologramScene,
    total_internal_reflectionScene
];

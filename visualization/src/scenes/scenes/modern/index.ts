import type { SceneConfig } from '../../../types/visualization';
import { photoelectricScene } from './photoelectric';
import { bohrScene } from './bohr';
import { radioactiveScene } from './radioactive';
import { micro_deformationScene } from './micro-deformation';
import { alpha_scatteringScene } from './alpha-scattering';
import { black_bodyScene } from './black-body';
import { electron_diffractionScene } from './electron-diffraction';
import { radiation_deflectionScene } from './radiation-deflection';
import { decay_statisticsScene } from './decay-statistics';
import { cosmic_rayScene } from './cosmic-ray';
import { neutron_discoveryScene } from './neutron-discovery';
import { fission_chainScene } from './fission-chain';
import { bohr_orbitScene } from './bohr-orbit';
import { geiger_counterScene } from './geiger-counter';

export const ModernScenes: SceneConfig[] = [
    photoelectricScene,
    bohrScene,
    radioactiveScene,
    micro_deformationScene,
    alpha_scatteringScene,
    black_bodyScene,
    electron_diffractionScene,
    radiation_deflectionScene,
    decay_statisticsScene,
    cosmic_rayScene,
    neutron_discoveryScene,
    fission_chainScene,
    bohr_orbitScene,
    geiger_counterScene
];

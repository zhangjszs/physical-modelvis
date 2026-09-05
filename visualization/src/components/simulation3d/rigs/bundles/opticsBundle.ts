/**
 * 振动/波/光学 rig 包 — 选必一
 * 机械波/声波/折射/全反射/偏振/干涉/衍射/振动/共振
 */
import type { SceneRig } from '../../EquipmentStage';
import { waveRig } from '../waveRig';
import { opticsRig } from '../opticsRig';
import { waveOpticsRig } from '../waveOpticsRig';
import { vibrationRig } from '../vibrationRig';
import { collisionRig } from '../collisionRig';
import { soundWaveformRig } from '../soundWaveformRig';
import { doublePendulumRig } from '../doublePendulumRig';

export default {
    'mechanical-wave': waveRig,
    'sound-waveform': soundWaveformRig,
    'doppler-effect': waveRig,
    refraction: opticsRig,
    'total-internal-reflection': opticsRig,
    'polarization-malus': opticsRig,
    hologram: opticsRig,
    interference: waveOpticsRig,
    'water-diffraction': waveOpticsRig,
    'sound-interference': waveOpticsRig,
    'single-slit': waveOpticsRig,
    'diffraction-grating': waveOpticsRig,
    'thin-film': waveOpticsRig,
    'forced-vibration-freq': vibrationRig,
    'resonance-curve': vibrationRig,
    'double-pendulum-sync': doublePendulumRig,
    'projectile-collision': collisionRig
} as Record<string, SceneRig>;

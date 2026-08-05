import type { SceneConfig } from '../../../types/visualization';
import { projectileScene } from './projectile';
import { uniform_acceleratedScene } from './uniform-accelerated';
import { free_fallScene } from './free-fall';
import { collisionScene } from './collision';
import { springScene } from './spring';
import { inclined_planeScene } from './inclined-plane';
import { circular_motionScene } from './circular-motion';
import { orbitalScene } from './orbital';
import { air_trackScene } from './air-track';
import { energy_conservationScene } from './energy-conservation';
import { momentumScene } from './momentum';
import { mechanical_waveScene } from './mechanical-wave';
import { simple_pendulumScene } from './simple-pendulum';
import { hooke_lawScene } from './hooke-law';
import { sliding_frictionScene } from './sliding-friction';
import { force_compositionScene } from './force-composition';
import { newton_second_lawScene } from './newton-second-law';
import { newton_first_lawScene } from './newton-first-law';
import { newton_third_lawScene } from './newton-third-law';
import { ticker_timerScene } from './ticker-timer';
import { reaction_timeScene } from './reaction-time';
import { galileo_inclineScene } from './galileo-incline';
import { center_of_gravityScene } from './center-of-gravity';
import { inertiaScene } from './inertia';
import { overweightScene } from './overweight';
import { curve_velocity_directionScene } from './curve-velocity-direction';
import { curve_conditionScene } from './curve-condition';
import { motion_compositionScene } from './motion-composition';
import { transmission_beltScene } from './transmission-belt';
import { vertical_circleScene } from './vertical-circle';
import { centrifugalScene } from './centrifugal';
import { cavendishScene } from './cavendish';
import { moon_earth_testScene } from './moon-earth-test';
import { double_pendulum_syncScene } from './double-pendulum-sync';
import { forced_vibration_freqScene } from './forced-vibration-freq';
import { resonance_curveScene } from './resonance-curve';
import { sound_waveformScene } from './sound-waveform';
import { doppler_effectScene } from './doppler-effect';
import { water_diffractionScene } from './water-diffraction';
import { sound_interferenceScene } from './sound-interference';
import { projectile_collisionScene } from './projectile-collision';
import { newton_tubeScene } from './newton-tube';
import { work_energyScene } from './work-energy';
import { ball_xtScene } from './ball-xt';

export const MechanicsScenes: SceneConfig[] = [
    projectileScene,
    uniform_acceleratedScene,
    free_fallScene,
    collisionScene,
    springScene,
    inclined_planeScene,
    circular_motionScene,
    orbitalScene,
    air_trackScene,
    energy_conservationScene,
    momentumScene,
    mechanical_waveScene,
    simple_pendulumScene,
    hooke_lawScene,
    sliding_frictionScene,
    force_compositionScene,
    newton_second_lawScene,
    newton_first_lawScene,
    newton_third_lawScene,
    ticker_timerScene,
    reaction_timeScene,
    galileo_inclineScene,
    center_of_gravityScene,
    inertiaScene,
    overweightScene,
    curve_velocity_directionScene,
    curve_conditionScene,
    motion_compositionScene,
    transmission_beltScene,
    vertical_circleScene,
    centrifugalScene,
    cavendishScene,
    moon_earth_testScene,
    double_pendulum_syncScene,
    forced_vibration_freqScene,
    resonance_curveScene,
    sound_waveformScene,
    doppler_effectScene,
    water_diffractionScene,
    sound_interferenceScene,
    projectile_collisionScene,
    newton_tubeScene,
    work_energyScene,
    ball_xtScene
];

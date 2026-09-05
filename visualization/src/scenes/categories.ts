/**
 * 教材实验分类标准定义（人教版高中物理 6 册）
 */

export interface SceneCategory {
    label: string;
    ids: string[];
}

export const SCENE_CATEGORIES: SceneCategory[] = [
    {
        label: '必修一 (力学基础)',
        ids: [
            'projectile',
            'uniform-accelerated',
            'free-fall',
            'newton-first-law',
            'newton-tube',
            'inclined-plane',
            'air-track',
            'ticker-timer',
            'reaction-time',
            'galileo-incline',
            'inertia',
            'overweight',
            'center-of-gravity',
            'micro-deformation',
            'vernier-caliper-tool',
            'micrometer-tool',
            'multimeter-tool',
            'force-composition',
            'newton-third-law',
            'sliding-friction',
            'hooke-law',
            'newton-second-law',
            'spring'
        ]
    },
    {
        label: '必修二 (曲线运动/能量)',
        ids: [
            'curve-velocity-direction',
            'curve-condition',
            'motion-composition',
            'transmission-belt',
            'vertical-circle',
            'centrifugal',
            'circular-motion',
            'collision',
            'orbital',
            'cavendish',
            'moon-earth-test',
            'work-energy',
            'energy-conservation'
        ]
    },
    {
        label: '必修三 (电磁学)',
        ids: [
            'electric-field',
            'efield-lines',
            'magnetic-field',
            'current-magnetic',
            'circuit',
            'bulb-vi',
            'capacitor-charge',
            'parallel-plate-capacitor',
            'resistance-law',
            'load-voltage',
            'electrostatic-induction',
            'electroscope',
            'coulomb-force-explore',
            'electrostatic-shielding',
            'faraday-cup',
            'ampere-force',
            'em-combined',
            'em-wave-hertz'
        ]
    },
    {
        label: '选必一 (振动/波/光)',
        ids: [
            'simple-pendulum',
            'mechanical-wave',
            'refraction',
            'interference',
            'momentum',
            'sound-waveform',
            'water-diffraction',
            'sound-interference',
            'doppler-effect',
            'thin-film',
            'hologram',
            'single-slit',
            'diffraction-grating',
            'polarization-malus',
            'forced-vibration-freq',
            'resonance-curve',
            'double-pendulum-sync',
            'ball-xt',
            'total-internal-reflection',
            'projectile-collision'
        ]
    },
    {
        label: '选必二 (电磁感应/传感器)',
        ids: [
            'magnetic-force',
            'em-induction',
            'ac-current',
            'lc-oscillator',
            'current-balance',
            'eddy-current',
            'em-damping',
            'mutual-inductance',
            'self-inductance',
            'em-wave-communication',
            'em-spectrum',
            'hall-effect',
            'reed-switch',
            'thermistor',
            'photoresistor',
            'strain-gauge',
            'security-alarm',
            'light-control-switch'
        ]
    },
    {
        label: '选必三 (热学/量子/原子)',
        ids: [
            'gas-law',
            'photoelectric',
            'bohr',
            'bohr-orbit',
            'radioactive',
            'geiger-counter',
            'diffusion',
            'brownian-motion',
            'molecular-force',
            'liquid-mixing',
            'oil-film',
            'melting-curve',
            'surface-tension',
            'capillary',
            'wetting',
            'liquid-crystal',
            'joule-mechanical',
            'joule-electrical',
            'adiabatic-compression',
            'heat-transfer',
            'energy-transformation',
            'perpetuum-mobile',
            'heat-direction',
            'alpha-scattering',
            'black-body',
            'electron-diffraction',
            'radiation-deflection',
            'decay-statistics',
            'cosmic-ray',
            'neutron-discovery',
            'fission-chain'
        ]
    }
];

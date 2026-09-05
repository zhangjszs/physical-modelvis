/**
 * 电磁感应/传感器 rig 包 — 选必二
 * 安培力/交流电/电磁阻尼/互感/自感/电磁谱/霍尔效应/传感器
 */
import type { SceneRig } from '../../EquipmentStage';
import { ampereForceRig } from '../ampereForceRig';
import { circuitRig } from '../circuitRig';
import { lcOscillatorRig } from '../lcOscillatorRig';
import { emWaveRig } from '../emWaveRig';
import { fieldRig } from '../fieldRig';
import { thermistorRig } from '../thermistorRig';
import { photoresistorRig } from '../photoresistorRig';
import { reedSwitchRig } from '../reedSwitchRig';
import { strainGaugeRig } from '../strainGaugeRig';

export default {
    'magnetic-force': ampereForceRig,
    'ac-current': circuitRig,
    'lc-oscillator': lcOscillatorRig,
    'current-balance': ampereForceRig,
    'eddy-current': ampereForceRig,
    'em-damping': ampereForceRig,
    'mutual-inductance': ampereForceRig,
    'self-inductance': ampereForceRig,
    'em-spectrum': emWaveRig,
    'hall-effect': fieldRig,
    'reed-switch': reedSwitchRig,
    thermistor: thermistorRig,
    photoresistor: photoresistorRig,
    'strain-gauge': strainGaugeRig,
    'security-alarm': circuitRig,
    'light-control-switch': circuitRig
} as Record<string, SceneRig>;

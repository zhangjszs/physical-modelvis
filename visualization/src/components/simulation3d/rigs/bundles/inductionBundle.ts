/**
 * 电磁感应/传感器 rig 包 — 选必二
 * 安培力/交流电/电磁阻尼/互感/自感/电磁谱/霍尔效应/传感器
 */
import type { SceneRig } from '../../EquipmentStage';
import { ampereForceRig } from '../ampereForceRig';
import { circuitRig } from '../circuitRig';
import { emWaveRig } from '../emWaveRig';
import { fieldRig } from '../fieldRig';
import { electroscopeRig } from '../electroscopeRig';
import { thermalRig } from '../thermalRig';
import { springRig } from '../springRig';

export default {
    'magnetic-force': ampereForceRig,
    'ac-current': circuitRig,
    'lc-oscillator': circuitRig,
    'current-balance': ampereForceRig,
    'eddy-current': ampereForceRig,
    'em-damping': ampereForceRig,
    'mutual-inductance': ampereForceRig,
    'self-inductance': ampereForceRig,
    'em-spectrum': emWaveRig,
    'hall-effect': fieldRig,
    'reed-switch': electroscopeRig,
    thermistor: thermalRig,
    photoresistor: electroscopeRig,
    'strain-gauge': springRig,
    'security-alarm': circuitRig,
    'light-control-switch': circuitRig
} as Record<string, SceneRig>;

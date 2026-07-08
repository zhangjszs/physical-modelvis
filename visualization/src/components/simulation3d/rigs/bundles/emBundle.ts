/**
 * 电磁学 rig 包 — 必修三
 * 电场/磁场/电路/电磁感应/电磁波
 */
import type { SceneRig } from '../../EquipmentStage';
import { fieldRig } from '../fieldRig';
import { circuitRig } from '../circuitRig';
import { capacitorRig } from '../capacitorRig';
import { electroscopeRig } from '../electroscopeRig';
import { ampereForceRig } from '../ampereForceRig';
import { emWaveRig } from '../emWaveRig';

export default {
    'electric-field': fieldRig,
    'magnetic-field': fieldRig,
    'em-combined': fieldRig,
    'efield-lines': fieldRig,
    circuit: circuitRig,
    'load-voltage': circuitRig,
    'resistance-law': circuitRig,
    'bulb-vi': circuitRig,
    'capacitor-charge': capacitorRig,
    'parallel-plate-capacitor': capacitorRig,
    electroscope: electroscopeRig,
    'electrostatic-induction': electroscopeRig,
    'electrostatic-shielding': electroscopeRig,
    'coulomb-force-explore': electroscopeRig,
    'ampere-force': ampereForceRig,
    'current-magnetic': fieldRig,
    'em-induction': ampereForceRig,
    'em-wave-communication': emWaveRig,
    'em-wave-hertz': emWaveRig
} as Record<string, SceneRig>;

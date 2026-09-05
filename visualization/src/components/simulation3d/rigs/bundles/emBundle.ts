/**
 * 电磁学 rig 包 — 必修三
 * 电场/磁场/电路/电磁感应/电磁波
 */
import type { SceneRig } from '../../EquipmentStage';
import { fieldRig } from '../fieldRig';
import { circuitRig } from '../circuitRig';
import { electricFieldRig } from '../electricFieldRig';
import { magneticFieldRig } from '../magneticFieldRig';
import { emCombinedRig } from '../emCombinedRig';
import { resistanceLawRig } from '../resistanceLawRig';
import { capacitorRig } from '../capacitorRig';
import { electroscopeRig } from '../electroscopeRig';
import { ampereForceRig } from '../ampereForceRig';
import { emWaveRig } from '../emWaveRig';

export default {
    'electric-field': electricFieldRig,
    'magnetic-field': magneticFieldRig,
    'em-combined': emCombinedRig,
    'efield-lines': fieldRig,
    circuit: circuitRig,
    'load-voltage': circuitRig,
    'resistance-law': resistanceLawRig,
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

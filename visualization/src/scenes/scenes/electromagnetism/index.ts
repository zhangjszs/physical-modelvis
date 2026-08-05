import type { SceneConfig } from '../../../types/visualization';
import { electric_fieldScene } from './electric-field';
import { magnetic_fieldScene } from './magnetic-field';
import { em_combinedScene } from './em-combined';
import { circuitScene } from './circuit';
import { magnetic_forceScene } from './magnetic-force';
import { em_inductionScene } from './em-induction';
import { ac_currentScene } from './ac-current';
import { lc_oscillatorScene } from './lc-oscillator';
import { current_balanceScene } from './current-balance';
import { eddy_currentScene } from './eddy-current';
import { em_dampingScene } from './em-damping';
import { mutual_inductanceScene } from './mutual-inductance';
import { self_inductanceScene } from './self-inductance';
import { em_wave_communicationScene } from './em-wave-communication';
import { em_spectrumScene } from './em-spectrum';
import { hall_effectScene } from './hall-effect';
import { reed_switchScene } from './reed-switch';
import { photoresistorScene } from './photoresistor';
import { thermistorScene } from './thermistor';
import { strain_gaugeScene } from './strain-gauge';
import { security_alarmScene } from './security-alarm';
import { light_control_switchScene } from './light-control-switch';
import { capacitor_chargeScene } from './capacitor-charge';
import { parallel_plate_capacitorScene } from './parallel-plate-capacitor';
import { load_voltageScene } from './load-voltage';
import { resistance_lawScene } from './resistance-law';
import { coulomb_force_exploreScene } from './coulomb-force-explore';
import { electroscopeScene } from './electroscope';
import { electrostatic_inductionScene } from './electrostatic-induction';
import { electrostatic_shieldingScene } from './electrostatic-shielding';
import { faraday_cupScene } from './faraday-cup';
import { ampere_forceScene } from './ampere-force';
import { em_wave_hertzScene } from './em-wave-hertz';
import { multimeter_toolScene } from './multimeter-tool';
import { vernier_caliper_toolScene } from './vernier-caliper-tool';
import { micrometer_toolScene } from './micrometer-tool';
import { current_magneticScene } from './current-magnetic';
import { efield_linesScene } from './efield-lines';
import { bulb_viScene } from './bulb-vi';

export const ElectromagnetismScenes: SceneConfig[] = [
    electric_fieldScene,
    magnetic_fieldScene,
    em_combinedScene,
    circuitScene,
    magnetic_forceScene,
    em_inductionScene,
    ac_currentScene,
    lc_oscillatorScene,
    current_balanceScene,
    eddy_currentScene,
    em_dampingScene,
    mutual_inductanceScene,
    self_inductanceScene,
    em_wave_communicationScene,
    em_spectrumScene,
    hall_effectScene,
    reed_switchScene,
    photoresistorScene,
    thermistorScene,
    strain_gaugeScene,
    security_alarmScene,
    light_control_switchScene,
    capacitor_chargeScene,
    parallel_plate_capacitorScene,
    load_voltageScene,
    resistance_lawScene,
    coulomb_force_exploreScene,
    electroscopeScene,
    electrostatic_inductionScene,
    electrostatic_shieldingScene,
    faraday_cupScene,
    ampere_forceScene,
    em_wave_hertzScene,
    multimeter_toolScene,
    vernier_caliper_toolScene,
    micrometer_toolScene,
    current_magneticScene,
    efield_linesScene,
    bulb_viScene
];

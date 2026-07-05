import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { CurrentBalanceModel } from '../../src/models/current-balance.js';
import { EddyCurrentModel } from '../../src/models/eddy-current.js';
import { EMDampingModel } from '../../src/models/em-damping.js';
import { MutualInductanceModel } from '../../src/models/mutual-inductance.js';
import { SelfInductanceModel } from '../../src/models/self-inductance.js';
import { EMWaveCommunicationModel } from '../../src/models/em-wave-communication.js';
import { EMSpectrumModel } from '../../src/models/em-spectrum.js';
import { HallEffectModel } from '../../src/models/hall-effect.js';
import { ReedSwitchModel } from '../../src/models/reed-switch.js';
import { PhotoresistorModel } from '../../src/models/photoresistor.js';
import { ThermistorModel } from '../../src/models/thermistor.js';
import { StrainGaugeModel } from '../../src/models/strain-gauge.js';
import { SecurityAlarmModel } from '../../src/models/security-alarm.js';
import { LightControlSwitchModel } from '../../src/models/light-control-switch.js';

function makeBody(id = 'b1', mass = 1) {
  return { id, mass: { value: mass, unit: 'kg' as const }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
}
function makeProblem(modelType: string, constraints: Record<string, unknown>, bodies: ReturnType<typeof makeBody>[] = [makeBody()]): PhysicsProblem {
  return { id: 'test-' + modelType, model: modelType as PhysicsProblem['model'], bodies, constraints: constraints as unknown as PhysicsProblem['constraints'], timeConfig: { duration: 5, sampleCount: 100 }, environment: {} };
}

describe('F1: CurrentBalanceModel', () => {
  const model = new CurrentBalanceModel();
  it('metadata ok', () => { expect(model.modelType).toBe('current-balance'); });
  it('equilibrium chart', () => {
    const r = model.solve(makeProblem('current-balance', { currentBalance: { wireLen: 0.05, turns: 100, mass: 0.01, current: 1, magneticField: 0.2, armLen: 0.1, gravity: 9.8 } }));
    expect(r.charts.tilt_angle_vs_current).toBeDefined();
    expect(r.charts.mg_vs_t).toBeDefined();
  });
});

describe('F2: EddyCurrentModel', () => {
  const model = new EddyCurrentModel();
  it('metadata ok', () => { expect(model.modelType).toBe('eddy-current'); });
  it('generate result', () => {
    const r = model.solve(makeProblem('eddy-current', { eddyCurrent: { magneticField: 1.0, frequency: 50, conductivity: 1e6, thickness: 0.001 } }));
    expect(r.meta.model).toBe('eddy-current');
  });
});

describe('F3: EMDampingModel', () => {
  const model = new EMDampingModel();
  it('metadata ok', () => { expect(model.modelType).toBe('em-damping'); });
  it('chart ok', () => {
    const r = model.solve(makeProblem('em-damping', { emDamping: { mode: 'damping', magneticField: 0.5, angularSpeed: 100, conductivity: 1e6, inertia: 0.01 } }));
    expect(r.charts.angular_velocity_vs_time).toBeDefined();
  });
});

describe('F4: MutualInductanceModel', () => {
  const model = new MutualInductanceModel();
  it('metadata ok', () => { expect(model.modelType).toBe('mutual-inductance'); });
  it('chart ok', () => {
    const r = model.solve(makeProblem('mutual-inductance', { mutualInductance: { L1: 0.1, L2: 0.4, coupling: 0.8, frequency: 50, primaryCurrent: 2 } }));
    expect(r.charts.primary_current_vs_time).toBeDefined();
    expect(r.charts.secondary_emf_vs_time).toBeDefined();
  });
});

describe('F5: SelfInductanceModel', () => {
  const model = new SelfInductanceModel();
  it('metadata ok', () => { expect(model.modelType).toBe('self-inductance'); });
  it('chart ok', () => {
    const r = model.solve(makeProblem('self-inductance', { selfInductance: { inductance: 0.1, resistance: 10, emf: 12, mode: 'turnOn' } }));
    expect(r.charts.current_vs_time).toBeDefined();
    expect(r.charts.voltage_vs_time).toBeDefined();
  });
});

describe('F6: EMWaveCommunicationModel', () => {
  const model = new EMWaveCommunicationModel();
  it('metadata ok', () => { expect(model.modelType).toBe('em-wave-communication'); });
  it('AM chart', () => {
    const r = model.solve(makeProblem('em-wave-communication', { emWaveComm: { carrierFreq: 1e6, modulationType: 'AM', audioFreq: 1e3 } }));
    expect(r.charts.wave_t).toBeDefined();
    expect(r.charts.envelope_t).toBeDefined();
  });
});

describe('F7: EMSpectrumModel', () => {
  const model = new EMSpectrumModel();
  it('metadata ok', () => { expect(model.modelType).toBe('em-spectrum'); });
  it('spectrum chart', () => {
    const r = model.solve(makeProblem('em-spectrum', { emSpectrum: { freqMin: 1, freqMax: 1e20 } }));
    expect(r.charts.spectrum_curve).toBeDefined();
  });
});

describe('F8: HallEffectModel', () => {
  const model = new HallEffectModel();
  it('metadata ok', () => { expect(model.modelType).toBe('hall-effect'); });
  it('chart ok', () => {
    const r = model.solve(makeProblem('hall-effect', { hallEffect: { current: 0.1, magneticField: 0.5, chargeDensity: 1e22, thickness: 1e-3 } }));
    expect(r.charts.x_t).toBeDefined();
    expect(r.charts.y_t).toBeDefined();
  });
});

describe('F9: ReedSwitchModel', () => {
  const model = new ReedSwitchModel();
  it('metadata ok', () => { expect(model.modelType).toBe('reed-switch'); });
  it('result ok', () => {
    const r = model.solve(makeProblem('reed-switch', { reedSwitch: { mode: 'magnetic', magnetDistance: 5 } }));
    expect(r.explanation.summary).toBeTruthy();
  });
});

describe('F10: PhotoresistorModel', () => {
  const model = new PhotoresistorModel();
  it('metadata ok', () => { expect(model.modelType).toBe('photoresistor'); });
  it('chart ok', () => {
    const r = model.solve(makeProblem('photoresistor', { photoresistor: { lightIntensity: 10, darkResistance: 10000, sensitivity: 0.5 } }));
    expect(r.charts.x_t).toBeDefined();
  });
});

describe('F11: ThermistorModel', () => {
  const model = new ThermistorModel();
  it('metadata ok', () => { expect(model.modelType).toBe('thermistor'); });
  it('chart ok', () => {
    const r = model.solve(makeProblem('thermistor', { thermistor: { temperature: 300, mode: 'NTC', R0: 10000, BValue: 3950 } }));
    expect(r.charts.x_t).toBeDefined();
  });
});

describe('F12: StrainGaugeModel', () => {
  const model = new StrainGaugeModel();
  it('metadata ok', () => { expect(model.modelType).toBe('strain-gauge'); });
  it('result ok', () => {
    const r = model.solve(makeProblem('strain-gauge', { strainGauge: { strain: 100e-6, gaugeFactor: 2, bridgeVoltage: 5 } }));
    expect(r.explanation.summary).toBeTruthy();
  });
});

describe('F13: SecurityAlarmModel', () => {
  const model = new SecurityAlarmModel();
  it('metadata ok', () => { expect(model.modelType).toBe('security-alarm'); });
  it('result ok', () => {
    const r = model.solve(makeProblem('security-alarm', { securityAlarm: { doorState: 'open', magnetDistance: 50 } }));
    expect(r.explanation.summary).toBeTruthy();
  });
});

describe('F14: LightControlSwitchModel', () => {
  const model = new LightControlSwitchModel();
  it('metadata ok', () => { expect(model.modelType).toBe('light-control-switch'); });
  it('chart ok', () => {
    const r = model.solve(makeProblem('light-control-switch', { lightControlSwitch: { lightIntensity: 1000, threshold: 100 } }));
    expect(r.charts.x_t).toBeDefined();
  });
});

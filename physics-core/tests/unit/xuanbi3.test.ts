import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { DiffusionModel } from '../../src/models/diffusion.js';
import { BrownianMotionModel } from '../../src/models/brownian-motion.js';
import { MolecularForceModel } from '../../src/models/molecular-force.js';
import { LiquidMixingModel } from '../../src/models/liquid-mixing.js';
import { OilFilmModel } from '../../src/models/oil-film.js';
import { MeltingCurveModel } from '../../src/models/melting-curve.js';
import { SurfaceTensionModel } from '../../src/models/surface-tension.js';
import { CapillaryModel } from '../../src/models/capillary.js';
import { WettingModel } from '../../src/models/wetting.js';
import { LiquidCrystalModel } from '../../src/models/liquid-crystal.js';
import { JouleMechanicalModel } from '../../src/models/joule-mechanical.js';
import { JouleElectricalModel } from '../../src/models/joule-electrical.js';
import { AdiabaticCompressionModel } from '../../src/models/adiabatic-compression.js';
import { HeatTransferModel } from '../../src/models/heat-transfer.js';
import { EnergyTransformationModel } from '../../src/models/energy-transformation.js';
import { PerpetuumMobileModel } from '../../src/models/perpetuum-mobile.js';
import { BlackBodyModel } from '../../src/models/black-body.js';
import { HeatDirectionModel } from '../../src/models/heat-direction.js';
import { AlphaScatteringModel } from '../../src/models/alpha-scattering.js';
import { ElectronDiffractionModel } from '../../src/models/electron-diffraction.js';
import { RadiationDeflectionModel } from '../../src/models/radiation-deflection.js';
import { DecayStatisticsModel } from '../../src/models/decay-statistics.js';
import { CosmicRayModel } from '../../src/models/cosmic-ray.js';
import { NeutronDiscoveryModel } from '../../src/models/neutron-discovery.js';
import { FissionChainModel } from '../../src/models/fission-chain.js';

function makeBody(id = 'b1', mass = 1) {
  return { id, mass: { value: mass, unit: 'kg' as const }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
}
function makeProblem(modelType: string, constraints: Record<string, unknown>, bodies: ReturnType<typeof makeBody>[] = [makeBody()]): PhysicsProblem {
  return { id: 'test-' + modelType, model: modelType as PhysicsProblem['model'], bodies, constraints: constraints as unknown as PhysicsProblem['constraints'], timeConfig: { duration: 5, sampleCount: 100 }, environment: {} };
}

describe('G1: Diffusion', () => {
  const m = new DiffusionModel();
  it('meta', () => { expect(m.modelType).toBe('diffusion'); });
  it('chart', () => { expect(m.solve(makeProblem('diffusion', { diffusion: { temperature: 300, mode: 'liquid', particleCount: 100 } })).charts.x_t).toBeDefined(); });
});
describe('G2: Brownian', () => {
  const m = new BrownianMotionModel();
  it('meta', () => { expect(m.modelType).toBe('brownian-motion'); });
  it('chart', () => { expect(m.solve(makeProblem('brownian-motion', { brownianMotion: { particleRadius: 1e-6, liquidTemp: 300, fluidViscosity: 1e-3, duration: 1 } })).charts.x_t).toBeDefined(); });
});
describe('G3: MolecularForce', () => {
  const m = new MolecularForceModel();
  it('meta', () => { expect(m.modelType).toBe('molecular-force'); });
  it('chart', () => { expect(m.solve(makeProblem('molecular-force', { molecularForce: { epsilon: 0.01, sigma: 0.3 } })).charts.x_t).toBeDefined(); });
});
describe('G4: LiquidMixing', () => {
  const m = new LiquidMixingModel();
  it('meta', () => { expect(m.modelType).toBe('liquid-mixing'); });
  it('chart', () => { expect(m.solve(makeProblem('liquid-mixing', { liquidMixing: { volumeWater: 50, volumeAlcohol: 50 } })).explanation.summary).toBeTruthy(); });
});
describe('G5: OilFilm', () => {
  const m = new OilFilmModel();
  it('meta', () => { expect(m.modelType).toBe('oil-film'); });
  it('chart', () => { expect(m.solve(makeProblem('oil-film', { oilFilm: { oilConcentration: 0.01, dropsPerMl: 100, filmArea: 0.1 } })).explanation.summary).toBeTruthy(); });
});
describe('G6: MeltingCurve', () => {
  const m = new MeltingCurveModel();
  it('meta', () => { expect(m.modelType).toBe('melting-curve'); });
  it('chart', () => { expect(m.solve(makeProblem('melting-curve', { meltingCurve: { mode: 'crystal', meltingPoint: 373, heatingRate: 1 } })).charts.x_t).toBeDefined(); });
});
describe('G7: SurfaceTension', () => {
  const m = new SurfaceTensionModel();
  it('meta', () => { expect(m.modelType).toBe('surface-tension'); });
  it('chart', () => { expect(m.solve(makeProblem('surface-tension', { surfaceTension: { liquidMode: 'water', sliderLength: 0.05, temperature: 293 } })).charts.x_t).toBeDefined(); });
});
describe('G8: Capillary', () => {
  const m = new CapillaryModel();
  it('meta', () => { expect(m.modelType).toBe('capillary'); });
  it('chart', () => { expect(m.solve(makeProblem('capillary', { capillary: { tubeRadius: 0.0005, liquidMode: 'water', materialMode: 'glass' } })).charts.x_t).toBeDefined(); });
});
describe('G9: Wetting', () => {
  const m = new WettingModel();
  it('meta', () => { expect(m.modelType).toBe('wetting'); });
  it('result', () => { expect(m.solve(makeProblem('wetting', { wetting: { liquidMode: 'water', surfaceMode: 'glass' } })).explanation.summary).toBeTruthy(); });
});
describe('G10: LiquidCrystal', () => {
  const m = new LiquidCrystalModel();
  it('meta', () => { expect(m.modelType).toBe('liquid-crystal'); });
  it('chart', () => { expect(m.solve(makeProblem('liquid-crystal', { liquidCrystal: { temperature: 300, voltage: 5, mode: 'nematic' } })).charts.x_t).toBeDefined(); });
});
describe('G11: JouleMech', () => {
  const m = new JouleMechanicalModel();
  it('meta', () => { expect(m.modelType).toBe('joule-mechanical'); });
  it('chart', () => { expect(m.solve(makeProblem('joule-mechanical', { jouleMechanical: { mass: 5, height: 1, drops: 50, waterMass: 0.1 } })).explanation.summary).toBeTruthy(); });
});
describe('G12: JouleElec', () => {
  const m = new JouleElectricalModel();
  it('meta', () => { expect(m.modelType).toBe('joule-electrical'); });
  it('chart', () => { expect(m.solve(makeProblem('joule-electrical', { jouleElectrical: { voltage: 12, resistance: 5, time: 120, waterMass: 0.1 } })).explanation.summary).toBeTruthy(); });
});
describe('G13: Adiabatic', () => {
  const m = new AdiabaticCompressionModel();
  it('meta', () => { expect(m.modelType).toBe('adiabatic-compression'); });
  it('chart', () => { expect(m.solve(makeProblem('adiabatic-compression', { adiabaticCompression: { initialTemp: 300, compressionRatio: 18 } })).charts.x_t).toBeDefined(); });
});
describe('G14: HeatTransfer', () => {
  const m = new HeatTransferModel();
  it('meta', () => { expect(m.modelType).toBe('heat-transfer'); });
  it('chart', () => { expect(m.solve(makeProblem('heat-transfer', { heatTransfer: { mode: 'conduction', temperatureDiff: 100 } })).charts.x_t).toBeDefined(); });
});
describe('G15: EnergyXform', () => {
  const m = new EnergyTransformationModel();
  it('meta', () => { expect(m.modelType).toBe('energy-transformation'); });
  it('chart', () => { expect(m.solve(makeProblem('energy-transformation', { energyTransformation: { mode: 'pendulum', inputEnergy: 100 } })).charts.x_t).toBeDefined(); });
});
describe('G16: Perpetuum', () => {
  const m = new PerpetuumMobileModel();
  it('meta', () => { expect(m.modelType).toBe('perpetuum-mobile'); });
  it('chart', () => { expect(m.solve(makeProblem('perpetuum-mobile', { perpetuumMobile: { hotTemp: 500, coldTemp: 300, mode: 'carnot' } })).explanation.summary).toBeTruthy(); });
});
describe('G17: HeatDirection', () => {
  const m = new HeatDirectionModel();
  it('meta', () => { expect(m.modelType).toBe('heat-direction'); });
  it('chart', () => { expect(m.solve(makeProblem('heat-direction', { heatDirection: { hotTemp: 400, coldTemp: 300, thermalConductivity: 1 } })).charts.x_t).toBeDefined(); });
});
describe('G18: AlphaScattering', () => {
  const m = new AlphaScatteringModel();
  it('meta', () => { expect(m.modelType).toBe('alpha-scattering'); });
  it('chart', () => { expect(m.solve(makeProblem('alpha-scattering', { alphaScattering: { alphaEnergy: 5, targetZ: 79, foilThickness: 1e-6 } })).charts.x_t).toBeDefined(); });
});
describe('G19: BlackBody', () => {
  const m = new BlackBodyModel();
  it('meta', () => { expect(m.modelType).toBe('black-body'); });
  it('chart', () => { expect(m.solve(makeProblem('black-body', { blackBody: { temperature: 5800 } })).charts.x_t).toBeDefined(); });
});
describe('G20: ElectronDiffraction', () => {
  const m = new ElectronDiffractionModel();
  it('meta', () => { expect(m.modelType).toBe('electron-diffraction'); });
  it('chart', () => { expect(m.solve(makeProblem('electron-diffraction', { electronDiffraction: { accVoltage: 10000, crystalLattice: 0.213 } })).charts.x_t).toBeDefined(); });
});
describe('G21: RadiationDeflection', () => {
  const m = new RadiationDeflectionModel();
  it('meta', () => { expect(m.modelType).toBe('radiation-deflection'); });
  it('chart', () => { expect(m.solve(makeProblem('radiation-deflection', { radiationDeflection: { Bfield: 0.5, particleType: 'alpha', particleEnergy: 5 } })).charts.x_t).toBeDefined(); });
});
describe('G22: DecayStatistics', () => {
  const m = new DecayStatisticsModel();
  it('meta', () => { expect(m.modelType).toBe('decay-statistics'); });
  it('chart', () => { expect(m.solve(makeProblem('decay-statistics', { decayStatistics: { meanCount: 100, nTrials: 500 } })).charts.x_t).toBeDefined(); });
});
describe('G23: CosmicRay', () => {
  const m = new CosmicRayModel();
  it('meta', () => { expect(m.modelType).toBe('cosmic-ray'); });
  it('chart', () => { expect(m.solve(makeProblem('cosmic-ray', { cosmicRay: { altitude: 1000, shieldingMode: 'air' } })).charts.x_t).toBeDefined(); });
});
describe('G24: NeutronDiscovery', () => {
  const m = new NeutronDiscoveryModel();
  it('meta', () => { expect(m.modelType).toBe('neutron-discovery'); });
  it('chart', () => { expect(m.solve(makeProblem('neutron-discovery', { neutronDiscovery: { alphaEnergy: 5.5, targetMass: 1 } })).charts.x_t).toBeDefined(); });
});
describe('G25: FissionChain', () => {
  const m = new FissionChainModel();
  it('meta', () => { expect(m.modelType).toBe('fission-chain'); });
  it('chart', () => { expect(m.solve(makeProblem('fission-chain', { fissionChain: { multiplicationFactor: 1.02, generations: 10 } })).charts.x_t).toBeDefined(); });
});

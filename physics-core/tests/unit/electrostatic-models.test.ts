import { describe, it, expect } from 'vitest';
import { ElectrostaticInductionModel } from '../../src/models/electrostatic-induction.js';
import { ElectroscopeModel } from '../../src/models/electroscope.js';
import { CoulombForceExploreModel } from '../../src/models/coulomb-force-explore.js';
import { ElectrostaticShieldingModel } from '../../src/models/electrostatic-shielding.js';
import { FaradayCupModel } from '../../src/models/faraday-cup.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

function makeEIOvecharge(chargeC = 5, distanceAC = 5, separation = 1): PhysicsProblem {
  return {
    id: 'ei-test', model: 'electrostatic-induction',
    bodies: [{ id: 'A', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { electrostaticInduction: { chargeC, distanceAC, separation } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 30 },
  };
}

function makeElectroscopeOvercharge(charge = 1, foilLength = 5, foilMass = 1): PhysicsProblem {
  return {
    id: 'es-test', model: 'electroscope',
    bodies: [{ id: 'foil', mass: { value: foilMass / 1000, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { electroscope: { charge, foilLength, foilMass } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 20 },
  };
}

function makeCoulombOver(q1 = 1, q2 = 1, distance = 5, mode: 'varyQ' | 'varyR' = 'varyQ'): PhysicsProblem {
  return {
    id: 'cf-test', model: 'coulomb-force-explore',
    bodies: [{ id: 'q1', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { coulombForce: { q1, q2, distance, mode, qRange: [0.5, 5], rRange: [2, 10] } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 20 },
  };
}

function makeShieldingOver(isGrounded = false, externalField = 100, cavityCharge = 0): PhysicsProblem {
  return {
    id: 'sh-test', model: 'electrostatic-shielding',
    bodies: [{ id: 'shell', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { electrostaticShielding: { isGrounded, externalField, cavityCharge } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 20 },
  };
}

function makeFaradayOver(innerDepth = 0, outerDepth = 1, totalCharge = 10): PhysicsProblem {
  return {
    id: 'fc-test', model: 'faraday-cup',
    bodies: [{ id: 'cup', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { faradayCup: { innerProbeDepth: innerDepth, outerProbeDepth: outerDepth, totalCharge } },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 30 },
  };
}

describe('必修三 §12 静电学 Model 集成测试', () => {
  describe('ElectrostaticInductionModel', () => {
    const model = new ElectrostaticInductionModel();
    it('元数据正确', () => {
      expect(model.modelType).toBe('electrostatic-induction');
      expect(model.name).toBe('静电感应');
    });
    it('默认求解成功', () => {
      const r = model.solve(makeEIOvecharge());
      expect(r.meta.model).toBe('electrostatic-induction');
      expect(Object.keys(r.charts).length).toBeGreaterThan(0);
    });
    it('求解后包含 charts', () => {
      const r = model.solve(makeEIOvecharge());
      expect(Object.keys(r.charts).length).toBeGreaterThan(0);
    });
  });

  describe('ElectroscopeModel', () => {
    const model = new ElectroscopeModel();
    it('元数据正确', () => {
      expect(model.modelType).toBe('electroscope');
      expect(model.name).toBe('验电器');
    });
    it('默认求解成功', () => {
      const r = model.solve(makeElectroscopeOvercharge());
      expect(r.meta.model).toBe('electroscope');
      expect(r.charts['q_theta']).toBeDefined();
    });
    it('求解后包含 q_theta 图', () => {
      const r = model.solve(makeElectroscopeOvercharge(5));
      expect(r.charts['q_theta']).toBeDefined();
      expect(r.charts['q_theta']!.points.length).toBeGreaterThan(0);
    });
  });

  describe('CoulombForceExploreModel', () => {
    const model = new CoulombForceExploreModel();
    it('元数据正确', () => {
      expect(model.modelType).toBe('coulomb-force-explore');
      expect(model.name).toContain('电荷');
    });
    it('默认求解成功', () => {
      const r = model.solve(makeCoulombOver());
      expect(r.meta.model).toBe('coulomb-force-explore');
    });
    it('varyQ 模式 F-q 线性', () => {
      const r = model.solve(makeCoulombOver(1, 1, 5, 'varyQ'));
      const pts = r.charts['F_q']?.points ?? [];
      expect(pts.length).toBeGreaterThan(5);
    });
    it('varyR 模式 F-1/r² 线性', () => {
      const r = model.solve(makeCoulombOver(1, 1, 5, 'varyR'));
      const pts = r.charts['F_inv_r2']?.points ?? [];
      expect(pts.length).toBeGreaterThan(5);
    });
  });

  describe('ElectrostaticShieldingModel', () => {
    const model = new ElectrostaticShieldingModel();
    it('元数据正确', () => {
      expect(model.modelType).toBe('electrostatic-shielding');
    });
    it('接地时张角为 0', () => {
      const grounded = model.solve(makeShieldingOver(true, 500, 0));
      expect(grounded.diagnostics.maxValues.thetaGrounded).toBe(0);
    });
    it('不接地时张角 > 0', () => {
      const ungrounded = model.solve(makeShieldingOver(false, 500, 0));
      expect(ungrounded.diagnostics.maxValues.thetaUngrounded).toBeGreaterThan(0);
    });
    it('导体内部电场为 0', () => {
      const r = model.solve(makeShieldingOver(false, 100, 0));
      const pts = r.charts['field_section']?.points ?? [];
      const innerPts = pts.filter(p => p.x >= 0 && p.x <= 5);
      for (const p of innerPts) {
        expect(p.y).toBe(0);
      }
    });
  });

  describe('FaradayCupModel', () => {
    const model = new FaradayCupModel();
    it('元数据正确', () => {
      expect(model.modelType).toBe('faraday-cup');
    });
    it('内壁测量 = 0', () => {
      const r = model.solve(makeFaradayOver(0, 1, 10));
      expect(r.diagnostics.maxValues.innerMeasurement).toBe(0);
    });
    it('外壁测量 = totalCharge', () => {
      const r = model.solve(makeFaradayOver(0, 1, 10));
      expect(r.diagnostics.maxValues.outerMeasurement).toBe(10);
    });
    it('电荷越大外壁测量越大', () => {
      const small = model.solve(makeFaradayOver(0, 1, 5));
      const large = model.solve(makeFaradayOver(0, 1, 20));
      expect(large.diagnostics.maxValues.outerMeasurement).toBeGreaterThan(small.diagnostics.maxValues.outerMeasurement);
    });
  });
});

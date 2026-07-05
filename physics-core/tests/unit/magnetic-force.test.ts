import { describe, it, expect } from 'vitest';
import { MagneticForceModel } from '../../src/models/magnetic-force.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new MagneticForceModel();

function makeProblem(overrides: {
  magneticField?: number;
  current?: number;
  wireLength?: number;
  wireAngleDeg?: number;
  charge?: number;
  velocity?: number;
  velocityAngleDeg?: number;
  particleMass?: number;
} = {}): PhysicsProblem {
  const { magneticField = 0.5, current, wireLength, wireAngleDeg, charge, velocity, velocityAngleDeg, particleMass } = overrides;
  const mc: { magneticField: number; current?: number; wireLength?: number; wireAngleDeg?: number; charge?: number; velocity?: number; velocityAngleDeg?: number; particleMass?: number } = { magneticField };
  if (current !== undefined) mc.current = current;
  if (wireLength !== undefined) mc.wireLength = wireLength;
  if (wireAngleDeg !== undefined) mc.wireAngleDeg = wireAngleDeg;
  if (charge !== undefined) mc.charge = charge;
  if (velocity !== undefined) mc.velocity = velocity;
  if (velocityAngleDeg !== undefined) mc.velocityAngleDeg = velocityAngleDeg;
  if (particleMass !== undefined) mc.particleMass = particleMass;
  return {
    id: 'mf-test',
    model: 'magnetic-force',
    bodies: [{ id: 'body', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { magneticForce: mc },
    environment: {},
    timeConfig: { duration: 1, sampleCount: 10 },
  };
}

describe('MagneticForceModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('magnetic-force');
    expect(model.name).toBe('安培力与洛伦兹力');
  });

  it('安培力: B=0.5T, I=2A, L=0.3m, θ=90° → F=0.3N', () => {
    const r = model.solve(makeProblem({ magneticField: 0.5, current: 2, wireLength: 0.3, wireAngleDeg: 90 }));
    expect(r.diagnostics.maxValues.ampereForce).toBeCloseTo(0.3, 5);
  });

  it('安培力 θ=0° → F=0 (平行于磁场)', () => {
    const r = model.solve(makeProblem({ magneticField: 0.5, current: 2, wireLength: 0.3, wireAngleDeg: 0 }));
    expect(r.diagnostics.maxValues.ampereForce).toBeCloseTo(0, 5);
  });

  it('安培力 θ=30° → F=BI·L·sin30°', () => {
    const r = model.solve(makeProblem({ magneticField: 1, current: 3, wireLength: 0.2, wireAngleDeg: 30 }));
    expect(r.diagnostics.maxValues.ampereForce).toBeCloseTo(0.3, 5); // 1×3×0.2×0.5=0.3
  });

  it('洛伦兹力: q=1.6e-19, v=1e6, B=0.01, φ=90° → F=1.6e-15N', () => {
    const r = model.solve(makeProblem({ magneticField: 0.01, charge: 1.6e-19, velocity: 1e6, velocityAngleDeg: 90 }));
    expect(r.diagnostics.maxValues.lorentzForce).toBeCloseTo(1.6e-15, 20);
  });

  it('圆周运动: m=9.1e-31, v=1e6, q=1.6e-19, B=0.01 → r≈0.57mm', () => {
    const r = model.solve(makeProblem({
      magneticField: 0.01, charge: 1.6e-19, velocity: 1e6, velocityAngleDeg: 90, particleMass: 9.1e-31,
    }));
    // r = mv/(qB) = 9.1e-31 × 1e6 / (1.6e-19 × 0.01) = 5.69e-4 m
    expect(r.diagnostics.maxValues.radius).toBeCloseTo(5.69e-4, 6);
  });

  it('圆周周期 T = 2πm/(qB)', () => {
    const r = model.solve(makeProblem({
      magneticField: 0.01, charge: 1.6e-19, velocity: 1e6, velocityAngleDeg: 90, particleMass: 9.1e-31,
    }));
    // T = 2π × 9.1e-31 / (1.6e-19 × 0.01) = 3.58e-10 s
    expect(r.diagnostics.maxValues.period).toBeCloseTo(2 * Math.PI * 9.1e-31 / (1.6e-19 * 0.01), 15);
  });

  it('F-θ 曲线峰值在 θ=90°', () => {
    const r = model.solve(makeProblem({ magneticField: 0.5, current: 2, wireLength: 0.3 }));
    const chart = r.charts.x_t!;
    // 最大 F 在 θ=90°
    const maxPt = chart.points.reduce((a, b) => b.y > a.y ? b : a);
    expect(maxPt.x).toBe(90);
    expect(maxPt.y).toBeCloseTo(0.3, 5);
  });
});

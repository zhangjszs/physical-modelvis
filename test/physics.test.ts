// ============================================================
// 物理回归测试 - test/physics.test.ts
// ============================================================

import { Vec3 } from '../physim/src/vec3';
import { createParticleState, kineticEnergy, cyclotronRadius, cyclotronPeriod } from '../physim/src/particle';
import { UniformElectricField, UniformMagneticField, PointChargeField, CompositeField } from '../physim/src/fields';
import { BorisIntegrator, VelocityVerletIntegrator, RK4Integrator } from '../physim/src/integrators';
import { Simulation, runSimulation } from '../physim/src/simulation';
import { BoxBoundary } from '../physim/src/boundaries';

// ================================================================
// 辅助断言
// ================================================================
function assert(condition: boolean, message: string) {
    if (!condition) throw new Error('ASSERTION FAILED: ' + message);
}

function assertApprox(actual: number, expected: number, tolerance: number, message: string) {
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
        throw new Error(`ASSERTION FAILED: ${message}. Expected ${expected}, got ${actual}, diff=${diff}`);
    }
}

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
    try {
        fn();
        console.log('  PASS:', name);
        passed++;
    } catch (err: any) {
        console.log('  FAIL:', name, '-', err.message);
        failed++;
    }
}

// ================================================================
// 测试套件
// ================================================================

console.log('\n========== PhysSim Physics Regression Tests ==========\n');

// ---------------- Vec3 ----------------
test('Vec3 basic arithmetic', () => {
    const a = new Vec3(1, 2, 3);
    const b = new Vec3(4, 5, 6);
    const c = a.add(b);
    assert(c.x === 5 && c.y === 7 && c.z === 9, 'add failed');
    const d = a.dot(b);
    assert(d === 32, 'dot failed');
});

test('Vec3 cross product', () => {
    const i = new Vec3(1, 0, 0);
    const j = new Vec3(0, 1, 0);
    const k = i.cross(j);
    assert(k.x === 0 && k.y === 0 && k.z === 1, 'cross i x j = k');
});

// ---------------- Particle State ----------------
test('createParticleState initializes correctly', () => {
    const p = createParticleState(new Vec3(1, 2, 3), new Vec3(4, 0, 0), -1.6e-19, 9.1e-31);
    assert(p.position.x === 1, 'position x');
    assert(p.velocity.x === 4, 'velocity x');
    assert(p.charge === -1.6e-19, 'charge');
    assert(p.mass === 9.1e-31, 'mass');
    assert(p.alive === true, 'alive');
    assert(p.trail.length === 1, 'initial trail');
});

test('kineticEnergy calculation', () => {
    const p = createParticleState(Vec3.ZERO, new Vec3(3, 4, 0), -1, 2);
    const ke = kineticEnergy(p);
    // 0.5 * 2 * 25 = 25
    assertApprox(ke, 25, 1e-10, 'kinetic energy');
});

// ---------------- Cyclotron Formulas ----------------
test('cyclotronRadius formula', () => {
    const p = createParticleState(Vec3.ZERO, new Vec3(1e6, 0, 0), 1.6e-19, 1.67e-27);
    const B = 0.5;
    const r = cyclotronRadius(p, B);
    // R = mv/(qB) = 1.67e-27 * 1e6 / (1.6e-19 * 0.5)
    const expected = (1.67e-27 * 1e6) / (1.6e-19 * 0.5);
    assertApprox(r, expected, expected * 0.01, 'cyclotron radius');
});

test('cyclotronPeriod formula', () => {
    const p = createParticleState(Vec3.ZERO, new Vec3(1e6, 0, 0), 1.6e-19, 1.67e-27);
    const B = 0.5;
    const T = cyclotronPeriod(p, B);
    // T = 2*pi*m/(qB)
    const expected = 2 * Math.PI * 1.67e-27 / (1.6e-19 * 0.5);
    assertApprox(T, expected, expected * 0.01, 'cyclotron period');
});

// ---------------- Field Sources ----------------
test('UniformElectricField inside region', () => {
    const E = new UniformElectricField(new Vec3(0, -1, 0), {
        min: new Vec3(-5, -2, -1),
        max: new Vec3(5, 2, 1)
    });
    const inside = E.electricFieldAt(new Vec3(0, 0, 0), 0);
    assertApprox(inside.y, -1, 1e-10, 'E inside region');
    const outside = E.electricFieldAt(new Vec3(0, 3, 0), 0);
    assertApprox(outside.y, 0, 1e-10, 'E outside region');
});

test('UniformMagneticField inside region', () => {
    const B = new UniformMagneticField(new Vec3(0, 0, -0.5), {
        min: new Vec3(-5, -5, -1),
        max: new Vec3(5, 5, 1)
    });
    const inside = B.magneticFieldAt(new Vec3(0, 0, 0), 0);
    assertApprox(inside.z, -0.5, 1e-10, 'B inside region');
});

test('PointChargeField inverse square law', () => {
    const q = new PointChargeField(1e-9, Vec3.ZERO);
    const r1m = q.electricFieldAt(new Vec3(1, 0, 0), 0);
    const r2m = q.electricFieldAt(new Vec3(2, 0, 0), 0);
    // E at 2m should be 1/4 of E at 1m
    assertApprox(Math.abs(r2m.x), Math.abs(r1m.x) / 4, Math.abs(r1m.x) * 0.01, 'inverse square');
});

test('CompositeField superposition', () => {
    const e1 = new UniformElectricField(new Vec3(1, 0, 0));
    const e2 = new UniformElectricField(new Vec3(0, 2, 0));
    const comp = new CompositeField([e1, e2]);
    const E = comp.electricFieldAt(Vec3.ZERO, 0);
    assertApprox(E.x, 1, 1e-10, 'composite x');
    assertApprox(E.y, 2, 1e-10, 'composite y');
});

// ---------------- Boris Integrator - Energy Conservation ----------------
test('Boris integrator preserves kinetic energy in pure B field', () => {
    const B = new UniformMagneticField(new Vec3(0, 0, 0.5));
    const p = createParticleState(Vec3.ZERO, new Vec3(1e6, 0, 0), -1.6e-19, 9.1e-31);
    const initialKE = kineticEnergy(p);

    const boris = new BorisIntegrator();
    let state = p;
    const dt = 1e-12;

    for (let i = 0; i < 1000; i++) {
        state = boris.step(state, B, dt);
    }

    const finalKE = kineticEnergy(state);
    const relativeError = Math.abs(finalKE - initialKE) / initialKE;
    assert(relativeError < 0.01, `KE conservation failed: relative error = ${relativeError}`);
});

// ---------------- Uniform E Field - Parabolic Motion ----------------
test('Uniform E field produces parabolic trajectory', () => {
    // Electron in downward E field: class projectile motion
    const E = new UniformElectricField(new Vec3(0, -1e4, 0));
    const v0 = new Vec3(1e7, 0, 0);
    const p = createParticleState(Vec3.ZERO, v0, -1.6e-19, 9.1e-31);

    const sim = new Simulation(E, [], { integrator: 'boris', dt: 1e-13, maxSteps: 10000, trailLength: 5000 });
    sim.addParticle(Vec3.ZERO, v0, -1.6e-19, 9.1e-31);

    // Run for time T
    const T = 1e-9;
    const steps = Math.floor(T / sim.config.dt);
    sim.stepN(steps);

    const final = sim.getParticle(0)!;
    // y = 0.5 * a * t^2, a = qE/m (electron q is negative, E is negative => force upward)
    // Actually: F = qE = (-1.6e-19) * (-1e4) = +1.6e-15 N (upward)
    // a = F/m = 1.6e-15 / 9.1e-31 = 1.758e15 m/s^2
    const a = (1.6e-19 * 1e4) / 9.1e-31;
    const expectedY = 0.5 * a * T * T;
    const expectedX = 1e7 * T;

    assertApprox(final.position.x, expectedX, expectedX * 0.05, 'parabolic x');
    assertApprox(final.position.y, expectedY, expectedY * 0.05, 'parabolic y');
});

// ---------------- Velocity Selector ----------------
test('Velocity selector balance condition v = E/B', () => {
    const E = new UniformElectricField(new Vec3(0, -1e4, 0));
    const B = new UniformMagneticField(new Vec3(0, 0, 0.5));
    const composite = new CompositeField([E, B]);

    // For positive charge: F_electric = qE (down), F_magnetic = qvB (up when v to right)
    // Balance: v = E/B = 1e4 / 0.5 = 2e4 m/s
    const vBalance = 1e4 / 0.5;
    const p = createParticleState(Vec3.ZERO, new Vec3(vBalance, 0, 0), 1.6e-19, 1.67e-27);

    const boris = new BorisIntegrator();
    let state = p;
    const dt = 1e-12;

    // Run for many steps, y should stay near zero
    for (let i = 0; i < 50000; i++) {
        state = boris.step(state, composite, dt);
    }

    // In a velocity selector, particle should travel nearly straight
    assert(Math.abs(state.position.y) < 0.01, `Velocity selector drifted: y=${state.position.y}`);
});

// ---------------- runSimulation convenience ----------------
test('runSimulation completes and returns final state', () => {
    const B = new UniformMagneticField(new Vec3(0, 0, 0.5));
    const result = runSimulation(
        B,
        [],
        { position: new Vec3(0, 0, 0), velocity: new Vec3(1e6, 0, 0), charge: -1.6e-19, mass: 9.1e-31 },
        { integrator: 'boris', dt: 1e-12, maxSteps: 1000 }
    );
    assert(result.alive, 'particle should still be alive');
    assert(result.trail.length > 10, 'trail should have accumulated points');
});

// ---------------- Boundary detection ----------------
test('BoxBoundary stops particle', () => {
    const E = new UniformElectricField(new Vec3(1, 0, 0));
    const boundary = new BoxBoundary(1, 1);
    const sim = new Simulation(E, [boundary], { integrator: 'boris', dt: 1e-10, maxSteps: 20000, trailLength: 5000 });
    sim.addParticle(Vec3.ZERO, new Vec3(1e7, 0, 0), -1.6e-19, 9.1e-31);

    // Run many steps
    for (let i = 0; i < 20000; i++) {
        sim.step();
        const p = sim.getParticle(0)!;
        if (!p.alive) break;
    }

    const final = sim.getParticle(0)!;
    assert(!final.alive, 'particle should have hit boundary');
    assert(final.hitPoint !== null, 'hitPoint should be set');
});

// ================================================================
// 结果汇总
// ================================================================
console.log('\n------------------------------------------------');
console.log(`Total: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);
console.log('------------------------------------------------\n');

if (failed > 0) {
    process.exit(1);
}

// ============================================================
// PhysVis Bridge 测试 - 验证归一化单位制
// ============================================================

const fs = require('fs');
const path = require('path');

// 加载 PhysSim IIFE — 替换为 global 赋值使其在 Node 中可用
eval(fs.readFileSync(path.join(__dirname, '../physim/dist/physim.js'), 'utf8').replace('var PhysSim = ', 'global.PhysSim = '));

// 加载 PhysVis Framework — 替换为 global 赋值
eval(fs.readFileSync(path.join(__dirname, '../js/framework.js'), 'utf8').replace('const PhysVis = ', 'global.PhysVis = '));

// ================================================================
// 辅助断言
// ================================================================
function assert(condition, message) {
    if (!condition) throw new Error('ASSERTION FAILED: ' + message);
}

function assertApprox(actual, expected, tolerance, message) {
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
        throw new Error(`ASSERTION FAILED: ${message}. Expected ${expected}, got ${actual}, diff=${diff}`);
    }
}

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log('  PASS:', name);
        passed++;
    } catch (err) {
        console.log('  FAIL:', name, '-', err.message);
        failed++;
    }
}

// ================================================================
// 辅助函数
// ================================================================
function runBoris(particle, env, dt, steps) {
    const p = particle;
    for (let i = 0; i < steps; i++) {
        const result = PhysVis.Integrators.boris.step(p, env, dt);
        p.x = result.position.x;
        p.y = result.position.y;
        p.z = result.position.z;
        p.vx = result.velocity.x;
        p.vy = result.velocity.y;
        p.vz = result.velocity.z;
        p.age += dt;
    }
    return p;
}

// ================================================================
// 测试套件
// ================================================================

console.log('\n========== PhysVis Bridge Normalized Unit Tests ==========\n');

// ---------------- getNormalizedChargeMass ----------------
test('Normalized charge is sign only (+1 for positive)', () => {
    const result = PhysVis.Integrators._getNormalizedChargeMass({ charge: 5, speed: 1, radius: 2 }, 0.5);
    assert(result.charge === 1, 'charge should be +1');
});

test('Normalized charge is sign only (-1 for negative)', () => {
    const result = PhysVis.Integrators._getNormalizedChargeMass({ charge: -1.6e-19, speed: 1, radius: 2 }, 0.5);
    assert(result.charge === -1, 'charge should be -1');
});

test('Normalized mass from R=2, B=0.5, v=1 gives m=1', () => {
    const result = PhysVis.Integrators._getNormalizedChargeMass({ charge: -1, speed: 1, radius: 2 }, 0.5);
    assertApprox(result.mass, 1.0, 1e-10, 'mass should be 1');
});

test('Normalized mass from R=1, B=1, v=1 gives m=1', () => {
    const result = PhysVis.Integrators._getNormalizedChargeMass({ charge: -1, speed: 1, radius: 1 }, 1.0);
    assertApprox(result.mass, 1.0, 1e-10, 'mass should be 1');
});

// ---------------- analytic_circular vs boris ----------------
test('analytic_circular: electron starts at origin, moves right', () => {
    const p = { startX: 0, startY: 0, speed: 1, radius: 2, angle: 0, age: 0 };
    const result = PhysVis.Integrators.analytic_circular.step(p, 0.001);
    assertApprox(result.position.x, 0.001, 1e-6, 'x should be small positive');
    assertApprox(result.position.y, -0.00000025, 1e-6, 'y should be slightly negative');
});

test('boris matches analytic_circular for 100 steps (R=2, B=0.5, v=1)', () => {
    const dt = 0.016;
    const fields = [{ type: 'magnetic', x: 0, y: 0, z: -0.5 }];
    const env = { fields };

    let borisP = { x: 0, y: 0, z: 0, vx: 1, vy: 0, vz: 0, charge: -1, mass: 1, speed: 1, radius: 2, angle: 0, age: 0, alive: true };
    let analyticP = { startX: 0, startY: 0, speed: 1, radius: 2, angle: 0, age: 0 };

    runBoris(borisP, env, dt, 100);
    analyticP.age += 100 * dt;

    const analyticResult = PhysVis.Integrators.analytic_circular.step(analyticP, 0);

    const dx = Math.abs(borisP.x - analyticResult.position.x);
    const dy = Math.abs(borisP.y - analyticResult.position.y);
    const tol = 0.05; // 5% of radius
    assert(dx < tol, `x drift too large: ${dx}`);
    assert(dy < tol, `y drift too large: ${dy}`);
});

test('boris matches analytic_circular for 1000 steps (R=2, B=0.5, v=1)', () => {
    const dt = 0.016;
    const fields = [{ type: 'magnetic', x: 0, y: 0, z: -0.5 }];
    const env = { fields };

    let borisP = { x: 0, y: 0, z: 0, vx: 1, vy: 0, vz: 0, charge: -1, mass: 1, speed: 1, radius: 2, angle: 0, age: 0, alive: true };
    let analyticP = { startX: 0, startY: 0, speed: 1, radius: 2, angle: 0, age: 0 };

    runBoris(borisP, env, dt, 1000);
    analyticP.age += 1000 * dt;

    const analyticResult = PhysVis.Integrators.analytic_circular.step(analyticP, 0);

    const dx = Math.abs(borisP.x - analyticResult.position.x);
    const dy = Math.abs(borisP.y - analyticResult.position.y);
    const tol = 0.1; // 5% of radius = 0.1
    assert(dx < tol, `x drift too large after 1000 steps: ${dx}`);
    assert(dy < tol, `y drift too large after 1000 steps: ${dy}`);
});

// ---------------- Velocity Selector ----------------
test('velocity selector: v=E/B=1 goes straight (1000 steps)', () => {
    const dt = 0.016;
    const fields = [
        { type: 'electric', x: 0, y: -1, z: 0 },
        { type: 'magnetic', x: 0, y: 0, z: -1 }
    ];
    const env = { fields };

    let p = { x: -5, y: 0, z: 0, vx: 1, vy: 0, vz: 0, charge: -1, mass: 1, speed: 1, radius: 1, age: 0, alive: true };
    runBoris(p, env, dt, 1000);
    assert(Math.abs(p.y) < 0.01, `velocity selector drifted: y=${p.y}`);
});

// ---------------- Parallel Plate Electric ----------------
test('parallel plate electric: E=1, m=1 gives a=1 (parabolic)', () => {
    const dt = 0.016;
    const fields = [{ type: 'electric', x: 0, y: -1, z: 0 }];
    const env = { fields };

    let p = { x: 0, y: 0, z: 0, vx: 1, vy: 0, vz: 0, charge: -1, mass: 1, speed: 1, radius: 1, age: 0, alive: true };

    // For electron (q=-1) in E=(0,-1,0): F = qE = (-1)*(0,-1,0) = (0,1,0) = upward
    // a = F/m = 1/1 = 1 upward
    // y = 0.5 * a * t^2 = 0.5 * t^2
    const steps = 100;
    runBoris(p, env, dt, steps);

    const T = steps * dt;
    const expectedY = 0.5 * 1 * T * T;
    const expectedX = 1 * T;

    assertApprox(p.y, expectedY, expectedY * 0.05, 'parabolic y');
    assertApprox(p.x, expectedX, expectedX * 0.05, 'parabolic x');
});

// ---------------- Electron Rotation Direction ----------------
test('electron rotates clockwise in B into page (q<0, v right)', () => {
    const dt = 0.016;
    const fields = [{ type: 'magnetic', x: 0, y: 0, z: -0.5 }];
    const env = { fields };

    let p = { x: 0, y: 0, z: 0, vx: 1, vy: 0, vz: 0, charge: -1, mass: 1, speed: 1, radius: 2, age: 0, alive: true };

    // After a small time, electron should move DOWN (y < 0) for clockwise rotation
    runBoris(p, env, dt, 10);

    assert(p.y < 0, `electron should move down initially for clockwise rotation, got y=${p.y}`);
});

// ---------------- ProblemRegistry ----------------
test('ProblemRegistry registers and retrieves problems', () => {
    const pc = PhysVis.ProblemRegistry.register({
        id: 'test-problem',
        title: 'Test',
        options: [{ letter: 'A', text: 'Test' }]
    });
    assert(pc.id === 'test-problem', 'id should match');
    const retrieved = PhysVis.ProblemRegistry.get('test-problem');
    assert(retrieved !== null, 'should retrieve problem');
    assert(retrieved.title === 'Test', 'title should match');
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

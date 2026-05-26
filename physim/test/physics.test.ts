import { Vec3 } from '../src/vec3';
import { UniformMagneticField, UniformElectricField, CompositeField } from '../src/fields';
import { VerticalPlatesBoundary, BoxBoundary } from '../src/boundaries';
import { Simulation } from '../src/simulation';
import { kineticEnergy, cyclotronRadius, cyclotronPeriod } from '../src/particle';

const e = 1.6e-19;
const me = 9.1e-31;
const v0 = 2e6;

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail: string = '') {
    if (condition) {
        console.log(`  ✅ ${testName}`);
        passed++;
    } else {
        console.log(`  ❌ ${testName} ${detail}`);
        failed++;
    }
}

function assertApprox(actual: number, expected: number, tolerance: number, testName: string) {
    const relError = Math.abs((actual - expected) / expected);
    assert(relError < tolerance, testName, `actual=${actual.toExponential(4)}, expected=${expected.toExponential(4)}, relError=${relError.toExponential(4)}`);
}

console.log('\n🧪 PhysSim 物理引擎验证测试\n');

// ===== 测试1: 纯磁场中电子回旋半径 =====
console.log('📋 测试1: 回旋半径 R = mv/(eB)');
{
    const B = 0.5;
    const field = new UniformMagneticField(new Vec3(0, 0, -B));
    const sim = new Simulation(field, [], { integrator: 'boris', dt: 1e-12, maxSteps: 10000 });
    sim.addParticle(new Vec3(0, 0, 0), new Vec3(v0, 0, 0), -e, me);

    const initialKE = kineticEnergy(sim.getParticle(0)!);
    const expectedR = me * v0 / (e * B);

    for (let i = 0; i < 5000; i++) {
        sim.step();
    }

    const p = sim.getParticle(0)!;

    const positions = p.trail;
    let maxX = 0;
    for (const pos of positions) {
        if (pos.x > maxX) maxX = pos.x;
    }

    const measuredR = maxX;
    assertApprox(measuredR, expectedR, 0.05, `回旋半径测量值 ≈ 理论值 R=${expectedR.toExponential(4)}m`);

    const finalKE = kineticEnergy(p);
    const keError = Math.abs(finalKE - initialKE) / initialKE;
    assert(keError < 0.001, `Boris积分器能量守恒 (相对误差=${keError.toExponential(4)})`);
}

// ===== 测试2: 回旋周期 =====
console.log('\n📋 测试2: 回旋周期 T = 2πm/(eB)');
{
    const B = 0.5;
    const field = new UniformMagneticField(new Vec3(0, 0, -B));
    const sim = new Simulation(field, [], { integrator: 'boris', dt: 1e-12, maxSteps: 100000 });
    sim.addParticle(new Vec3(0, 0, 0), new Vec3(v0, 0, 0), -e, me);

    const expectedT = 2 * Math.PI * me / (e * B);

    let crossCount = 0;
    let lastY = 0;
    let firstCrossTime = -1;
    let secondCrossTime = -1;

    for (let i = 0; i < 100000; i++) {
        sim.step();
        const p = sim.getParticle(0)!;
        const y = p.position.y;

        if (lastY < 0 && y >= 0 && p.position.x < 0) {
            crossCount++;
            if (crossCount === 1) firstCrossTime = p.time;
            if (crossCount === 2) {
                secondCrossTime = p.time;
                break;
            }
        }
        lastY = y;
    }

    if (firstCrossTime > 0 && secondCrossTime > 0) {
        const measuredT = secondCrossTime - firstCrossTime;
        assertApprox(measuredT, expectedT, 0.05, `回旋周期测量值 ≈ 理论值 T=${expectedT.toExponential(4)}s`);
    } else {
        assert(false, '回旋周期测量', '未能捕获两个完整周期');
    }
}

// ===== 测试3: 白银三模题目验证 R=2d =====
console.log('\n📋 测试3: 白银三模 R=2d 验证');
{
    const d = 1e-2;
    const B_val = me * v0 / (2 * e * d);
    const field = new UniformMagneticField(new Vec3(0, 0, -B_val), {
        min: new Vec3(-2 * d, -10, -1),
        max: new Vec3(2 * d, 10, 1)
    });
    const boundary = new VerticalPlatesBoundary(4 * d);

    const sim = new Simulation(field, [boundary], { integrator: 'boris', dt: 5e-13, maxSteps: 1000000 });
    sim.addParticle(new Vec3(0, 0, 0), new Vec3(v0, 0, 0), -e, me);

    const expectedR = 2 * d;

    for (let i = 0; i < 500000; i++) {
        const p = sim.getParticle(0)!;
        if (!p.alive) break;
        sim.step();
    }

    const p = sim.getParticle(0)!;
    assert(!p.alive, '电子打到极板');
    assert(p.hitPoint !== null, '记录了击中点');

    if (p.hitPoint) {
        const hitX = Math.abs(p.hitPoint.x);
        assertApprox(hitX, 2 * d, 0.05, `击中点x ≈ 2d (R=2d验证)`);
    }
}

// ===== 测试4: 速度选择器 v=E/B 直线通过 =====
console.log('\n📋 测试4: 速度选择器 v=E/B');
{
    const B = 0.5;
    const E_val = v0 * B;
    const field = new CompositeField([
        new UniformElectricField(new Vec3(0, -E_val, 0)),
        new UniformMagneticField(new Vec3(0, 0, -B))
    ]);

    const sim = new Simulation(field, [], { integrator: 'boris', dt: 1e-12, maxSteps: 50000 });
    sim.addParticle(new Vec3(0, 0, 0), new Vec3(v0, 0, 0), -e, me);

    for (let i = 0; i < 10000; i++) {
        sim.step();
    }

    const p = sim.getParticle(0)!;
    const yOffset = Math.abs(p.position.y);
    assert(yOffset < 1e-4, `v=E/B时电子直线运动 (y偏移=${yOffset.toExponential(4)}m)`);
}

// ===== 测试5: RK45积分器精度 =====
console.log('\n📋 测试5: RK4积分器能量守恒（有电场场景）');
{
    const B = 0.5;
    const E_val = 1e3;
    const field = new CompositeField([
        new UniformElectricField(new Vec3(E_val, 0, 0)),
        new UniformMagneticField(new Vec3(0, 0, -B))
    ]);

    const sim = new Simulation(field, [], { integrator: 'rk4', dt: 1e-12, maxSteps: 10000, rk45Tolerance: 1e-4 });
    sim.addParticle(new Vec3(0, 0, 0), new Vec3(v0, 0, 0), -e, me);

    const initialKE = kineticEnergy(sim.getParticle(0)!);

    for (let i = 0; i < 1000; i++) {
        sim.step();
    }

    const p = sim.getParticle(0)!;
    const finalKE = kineticEnergy(p);
    const workDone = E_val * (-e) * p.position.x;
    const keChange = finalKE - initialKE;
    const relError = Math.abs(keChange - workDone) / (Math.abs(workDone) + 1e-30);
    assert(relError < 0.1, `RK4功能验证 (动能变化与电场做功一致, 误差=${(relError * 100).toFixed(2)}%)`);
}

// ===== 测试6: 100%击中率验证 =====
console.log('\n📋 测试6: R=2d时所有电子打到极板 (100%击中率)');
{
    const d = 1e-2;
    const B_val = me * v0 / (2 * e * d);
    const field = new UniformMagneticField(new Vec3(0, 0, -B_val), {
        min: new Vec3(-2 * d, -10, -1),
        max: new Vec3(2 * d, 10, 1)
    });
    const boundary = new VerticalPlatesBoundary(4 * d);

    const sim = new Simulation(field, [boundary], { integrator: 'boris', dt: 5e-13, maxSteps: 1000000 });

    const numParticles = 36;
    for (let i = 0; i < numParticles; i++) {
        const angle = (i / numParticles) * 2 * Math.PI;
        sim.addParticle(
            new Vec3(0, 0, 0),
            new Vec3(v0 * Math.cos(angle), v0 * Math.sin(angle), 0),
            -e, me
        );
    }

    for (let step = 0; step < 1000000; step++) {
        if (sim.getAliveCount() === 0) break;
        sim.step();
    }

    const hitRatio = sim.getHitRatio();
    assert(hitRatio >= 0.95, `击中率 ≈ 100% (实际=${(hitRatio * 100).toFixed(1)}%)`);
}

// ===== 结果汇总 =====
console.log('\n' + '='.repeat(50));
console.log(`📊 测试结果: ${passed} 通过, ${failed} 失败, 共 ${passed + failed} 项`);
if (failed === 0) {
    console.log('🎉 所有物理验证测试通过！');
} else {
    console.log(`⚠️ 有 ${failed} 项测试未通过，请检查`);
}
console.log('='.repeat(50) + '\n');

process.exit(failed > 0 ? 1 : 0);

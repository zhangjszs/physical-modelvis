import { describe, it, expect } from 'vitest';
import { ElectrostaticInductionModel } from '../../src/models/electrostatic-induction.js';
import { ElectroscopeModel } from '../../src/models/electroscope.js';
import { CoulombForceExploreModel } from '../../src/models/coulomb-force-explore.js';
import { ElectrostaticShieldingModel } from '../../src/models/electrostatic-shielding.js';
import { FaradayCupModel } from '../../src/models/faraday-cup.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

function makeEIOvecharge(chargeC = 5, distanceAC = 5, separation = 1): PhysicsProblem {
    return {
        id: 'ei-test',
        model: 'electrostatic-induction',
        bodies: [{ id: 'A', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { electrostaticInduction: { chargeC, distanceAC, separation } },
        environment: {},
        timeConfig: { duration: 1, sampleCount: 30 }
    };
}

function makeElectroscopeOvercharge(charge = 1, foilLength = 5, foilMass = 1): PhysicsProblem {
    return {
        id: 'es-test',
        model: 'electroscope',
        bodies: [
            {
                id: 'foil',
                mass: { value: foilMass / 1000, unit: 'kg' },
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 }
            }
        ],
        constraints: { electroscope: { charge, foilLength, foilMass } },
        environment: {},
        timeConfig: { duration: 1, sampleCount: 20 }
    };
}

function makeCoulombOver(q1 = 1, q2 = 1, distance = 5, mode: 'varyQ' | 'varyR' = 'varyQ'): PhysicsProblem {
    return {
        id: 'cf-test',
        model: 'coulomb-force-explore',
        bodies: [{ id: 'q1', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { coulombForce: { q1, q2, distance, mode, qRange: [0.5, 5], rRange: [2, 10] } },
        environment: {},
        timeConfig: { duration: 1, sampleCount: 20 }
    };
}

function makeShieldingOver(isGrounded = false, externalField = 100, cavityCharge = 0): PhysicsProblem {
    return {
        id: 'sh-test',
        model: 'electrostatic-shielding',
        bodies: [{ id: 'shell', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { electrostaticShielding: { isGrounded, externalField, cavityCharge } },
        environment: {},
        timeConfig: { duration: 1, sampleCount: 20 }
    };
}

function makeFaradayOver(innerDepth = 0, outerDepth = 1, totalCharge = 10): PhysicsProblem {
    return {
        id: 'fc-test',
        model: 'faraday-cup',
        bodies: [{ id: 'cup', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { faradayCup: { innerProbeDepth: innerDepth, outerProbeDepth: outerDepth, totalCharge } },
        environment: {},
        timeConfig: { duration: 1, sampleCount: 30 }
    };
}

describe('必修三 §12 静电学 Model 集成测试', () => {
    describe('ElectrostaticInductionModel', () => {
        const model = new ElectrostaticInductionModel();
        it('元数据正确', () => {
            expect(model.modelType).toBe('electrostatic-induction');
            expect(model.name).toBe('静电感应');
        });
        it('默认求解成功并满足硬电荷守恒与合理箔片张角区间 (#180)', () => {
            const r = model.solve(makeEIOvecharge(1, 10, 2));
            expect(r.meta.model).toBe('electrostatic-induction');
            expect(Object.keys(r.charts).length).toBeGreaterThan(0);

            const mv = r.diagnostics.maxValues as Record<string, number>;
            expect(Math.abs(mv.qNear + mv.qFar)).toBeLessThan(1e-12);
            expect(Math.abs(mv.qNear_uC + mv.qFar_uC)).toBeLessThan(1e-12);
            expect(mv.netCharge_uC).toBe(0);
            expect(Math.abs(mv.qNear_uC)).toBeLessThanOrEqual(1);
            expect(mv.qNear_uC).toBeLessThan(0); // Q_C > 0 → 近端异号为负
            expect(mv.qFar_uC).toBeGreaterThan(0); // 远端同号为正
            expect(mv.theta_deg).toBeGreaterThanOrEqual(15);
            expect(mv.theta_deg).toBeLessThanOrEqual(45);
            expect(mv.inductionRatio).toBeGreaterThan(0);
            expect(mv.inductionRatio).toBeLessThan(1);
            expect(mv.fieldRatio).toBeCloseTo((10 / 12) ** 2, 6);

            const cq = r.diagnostics.conservedQuantities.find(q => q.name.includes('净电荷守恒'));
            expect(cq).toBeDefined();
            expect(cq!.conserved).toBe(true);
            expect(cq!.maxDeviation).toBeLessThan(1e-12);
        });
        it('远/近 d_AC 单调性：距离越近感应越强、张角越大且始终 < 90° (#180)', () => {
            const near = model.solve(makeEIOvecharge(5, 2, 1));
            const mid = model.solve(makeEIOvecharge(5, 10, 1));
            const far = model.solve(makeEIOvecharge(5, 40, 1));
            const mvNear = near.diagnostics.maxValues as Record<string, number>;
            const mvMid = mid.diagnostics.maxValues as Record<string, number>;
            const mvFar = far.diagnostics.maxValues as Record<string, number>;

            expect(Math.abs(mvNear.qNear_uC)).toBeGreaterThan(Math.abs(mvMid.qNear_uC));
            expect(Math.abs(mvMid.qNear_uC)).toBeGreaterThan(Math.abs(mvFar.qNear_uC));
            expect(mvNear.theta_deg).toBeGreaterThan(mvMid.theta_deg);
            expect(mvMid.theta_deg).toBeGreaterThan(mvFar.theta_deg);
            expect(mvNear.theta_deg).toBeLessThan(90);
            expect(mvFar.theta_deg).toBeGreaterThan(0);
        });
        it('正/负 chargeC 符号翻转严格对称，Q=0 安全归零无 NaN (#180)', () => {
            const pos = model.solve(makeEIOvecharge(3, 8, 2));
            const neg = model.solve(makeEIOvecharge(-3, 8, 2));
            const zero = model.solve(makeEIOvecharge(0, 8, 2));

            const mvPos = pos.diagnostics.maxValues as Record<string, number>;
            const mvNeg = neg.diagnostics.maxValues as Record<string, number>;
            const mvZero = zero.diagnostics.maxValues as Record<string, number>;

            expect(mvNeg.qNear_uC).toBeCloseTo(-mvPos.qNear_uC, 12);
            expect(mvNeg.qFar_uC).toBeCloseTo(-mvPos.qFar_uC, 12);
            expect(Math.abs(mvNeg.qNear_uC + mvNeg.qFar_uC)).toBeLessThan(1e-12);
            expect(mvNeg.theta_deg).toBeCloseTo(mvPos.theta_deg, 12);

            expect(mvZero.qNear_uC).toBe(0);
            expect(mvZero.qFar_uC).toBe(0);
            expect(mvZero.theta_deg).toBe(0);
            for (const v of Object.values(mvZero)) {
                expect(Number.isFinite(v)).toBe(true);
            }
            for (const pt of zero.charts['static-diagram']!.points) {
                expect(Number.isFinite(pt.x)).toBe(true);
                expect(Number.isFinite(pt.y)).toBe(true);
            }
        });
        it('几何极值边界 (d=0.5cm, s=0.1cm, Q=100μC) 严格守恒且 θ ∈ [0°, 90°) (#180)', () => {
            const r = model.solve(makeEIOvecharge(100, 0.5, 0.1));
            const mv = r.diagnostics.maxValues as Record<string, number>;
            expect(Math.abs(mv.qNear + mv.qFar)).toBeLessThan(1e-12);
            expect(Math.abs(mv.qNear_uC)).toBeLessThanOrEqual(100);
            expect(mv.theta_deg).toBeGreaterThanOrEqual(0);
            expect(mv.theta_deg).toBeLessThan(90);
            for (const v of Object.values(mv)) {
                expect(Number.isFinite(v)).toBe(true);
            }
            expect(r.diagnostics.conservedQuantities[0]!.conserved).toBe(true);
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
        it('纯场模型允许 bodies 为空 (与场景侧 buildProblem 一致)', () => {
            // 回归: 场景 visualization/src/scenes/scenes/electromagnetism/electrostatic-shielding.ts
            // 传的是 bodies: [] —— 以前被基类「至少需要一个物理物体」拦下，
            // 页面表现为「求解失败」红条 + 3D 舞台全空。
            const problem: PhysicsProblem = {
                id: 'shield-empty',
                model: 'electrostatic-shielding',
                bodies: [],
                constraints: { electrostaticShielding: { isGrounded: true, externalField: 500, cavityCharge: 0 } },
                environment: {},
                timeConfig: { duration: 1, sampleCount: 20 }
            };
            expect(model.validate(problem).valid).toBe(true);
            const r = model.solve(problem);
            expect(r.diagnostics.maxValues.thetaGrounded).toBe(0);
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
            expect(large.diagnostics.maxValues.outerMeasurement).toBeGreaterThan(
                small.diagnostics.maxValues.outerMeasurement
            );
        });
    });
});

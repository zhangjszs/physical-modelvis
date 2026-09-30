import { describe, it, expect } from 'vitest';
import {
    validateComposition,
    compositionFieldAt,
    simulateComposition,
    type CompositionExperiment
} from '../../src/physics/composition.js';
import { totalElectricField, totalMagneticField } from '../../src/physics/fields3d.js';
import { Vec3 } from '../../src/math/vector3d.js';
import { PHYSICS_CONSTANTS } from '../../src/units/constants.js';
import type { Vector3D } from '../../src/types/common.js';

const ZERO3: Vector3D = { x: 0, y: 0, z: 0 };

/** 平行板组合实验: σ=±1e-6 的两块极板置于 z=±0.01, 板间匀强场 E = σ/ε₀ (沿 −z) */
function parallelPlateExperiment(overrides?: Partial<CompositionExperiment>): CompositionExperiment {
    const sigma = 1e-6;
    return {
        sources: [
            { kind: 'charged-plate', sigma, center: Vec3.create(0, 0, 0.01), normal: Vec3.create(0, 0, 1) },
            { kind: 'charged-plate', sigma: -sigma, center: Vec3.create(0, 0, -0.01), normal: Vec3.create(0, 0, 1) }
        ],
        particle: {
            charge: 1e-9,
            mass: 1e-6,
            position: ZERO3,
            velocity: Vec3.create(1, 0, 0)
        },
        duration: 0.01,
        sampleCount: 10,
        ...overrides
    };
}

describe('composition 组合实验层', () => {
    describe('validateComposition 校验', () => {
        it('合法实验通过校验', () => {
            expect(validateComposition(parallelPlateExperiment()).valid).toBe(true);
        });

        it('粒子质量非正 → INVALID_PARAMETER', () => {
            const v = validateComposition(
                parallelPlateExperiment({ particle: { charge: 1, mass: 0, position: ZERO3, velocity: ZERO3 } })
            );
            expect(v.valid).toBe(false);
            expect(v.errors.some(e => e.param === 'particle.mass')).toBe(true);
        });

        it('线圈半径 ≤ 0 → INVALID_SOURCE', () => {
            const v = validateComposition({
                sources: [
                    {
                        kind: 'circular-coil',
                        current: 1,
                        turns: 10,
                        radius: 0,
                        center: ZERO3,
                        axis: Vec3.create(0, 0, 1)
                    }
                ],
                particle: { charge: 1, mass: 1, position: ZERO3, velocity: ZERO3 },
                duration: 1
            });
            expect(v.valid).toBe(false);
            expect(v.errors[0]?.code).toBe('INVALID_SOURCE');
        });

        it('极板零法线 / 导线零方向 → INVALID_SOURCE', () => {
            const v1 = validateComposition({
                sources: [{ kind: 'charged-plate', sigma: 1e-6, center: ZERO3, normal: ZERO3 }],
                particle: { charge: 1, mass: 1, position: ZERO3, velocity: ZERO3 },
                duration: 1
            });
            const v2 = validateComposition({
                sources: [{ kind: 'straight-wire', current: 1, point: ZERO3, direction: ZERO3 }],
                particle: { charge: 1, mass: 1, position: ZERO3, velocity: ZERO3 },
                duration: 1
            });
            expect(v1.valid).toBe(false);
            expect(v2.valid).toBe(false);
        });
    });

    describe('compositionFieldAt 场求值器', () => {
        it('电场/磁场分别等于 total*Field 的直接叠加', () => {
            const sources = [
                { kind: 'point-charge', charge: 1e-9, position: ZERO3 },
                { kind: 'straight-wire', current: 1, point: ZERO3, direction: Vec3.create(0, 0, 1) }
            ] as const;
            const at = Vec3.create(0.05, 0.02, 0.03);
            const evaluator = compositionFieldAt(sources);
            expect(evaluator(at).E).toEqual(totalElectricField(sources, at));
            expect(evaluator(at).B).toEqual(totalMagneticField(sources, at));
        });
    });

    describe('simulateComposition 求解', () => {
        it('平行板匀强场: 类平抛运动与解析运动学逐帧一致 (常数加速度下 Verlet 精确)', () => {
            const exp = parallelPlateExperiment();
            const { trajectory, completed } = simulateComposition(exp);
            expect(completed).toBe(true);
            const sigma = 1e-6;
            const a = (exp.particle.charge * (sigma / PHYSICS_CONSTANTS.epsilon0.value)) / exp.particle.mass; // 沿 −z
            for (const p of trajectory) {
                expect(p.position.x).toBeCloseTo(p.t, 12); // x = v₀·t
                expect(p.position.z).toBeCloseTo((-a * p.t * p.t) / 2, 12); // z = −½at²
                const vz = (-a * p.t) / 1;
                expect(p.velocity.z).toBeCloseTo(vz, 12); // v_z = −at
            }
        });

        it('描述非法时抛错, 消息含全部问题', () => {
            expect(() =>
                simulateComposition(
                    parallelPlateExperiment({
                        particle: { charge: NaN, mass: -1, position: ZERO3, velocity: ZERO3 },
                        duration: -1
                    })
                )
            ).toThrow(/组合实验描述非法/);
        });

        it('数值发散不抛错: completed=false + 告警回填', () => {
            // 点电荷 1e301 C 在 0.5 m 处场强溢出为 Inf → 首步即发散
            const result = simulateComposition({
                sources: [{ kind: 'point-charge', charge: 1e301, position: ZERO3 }],
                particle: { charge: 1, mass: 1, position: Vec3.create(0.5, 0, 0), velocity: ZERO3 },
                duration: 1,
                sampleCount: 100
            });
            expect(result.completed).toBe(false);
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.trajectory.length).toBeLessThan(101);
        });
    });
});

/**
 * 电磁模型数值守卫契约 (#5) + 约束字段守卫 (#27)
 *
 * #5 覆盖:
 *   1. magnetic-force  B=0 → radius=mv/|q|B、period 均为 Inf (值守卫)
 *   2. magnetic-force  φ=90° 判定用容差, 89.999° 不丢失圆周分支
 *   3. capillary       r=0 → h=2σcosθ/(ρgr) 为 Inf (值守卫)
 *   4. capillary       θ=90° → R=r/|cosθ| 除零 (前瞻守卫, 当前查表恰好避开)
 *   5. hall-effect     n/t 为零 → Inf/NaN (值守卫)
 *
 * #27 覆盖: 约束**字段缺失**时抛可定位的 PhysicsError, 而非不可读的 TypeError。
 */

import { describe, it, expect } from 'vitest';
import { MagneticForceModel } from '../../src/models/magnetic-force.js';
import { CapillaryModel } from '../../src/models/capillary.js';
import { HallEffectModel } from '../../src/models/hall-effect.js';
import { requireConstraintNumber, optionalConstraintNumber } from '../../src/models/constraint-guard.js';
import { PhysicsError, ParameterOutOfRangeError } from '../../src/errors/index.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

function problem(model: PhysicsProblem['model'], constraints: Record<string, unknown>): PhysicsProblem {
    return {
        id: 'em-guard-test',
        model,
        bodies: [{ id: 'b1', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: constraints as unknown as PhysicsProblem['constraints'],
        environment: {},
        timeConfig: { duration: 5, sampleCount: 100 }
    };
}

const MAG = (magneticField: number, velocityAngleDeg = 90) => ({
    mode: 'particle',
    magneticField,
    charge: 1.6e-19,
    velocity: 1e6,
    particleMass: 9.11e-31,
    velocityAngleDeg
});

const HALL = (chargeDensity: number, thickness: number) => ({
    current: 1,
    magneticField: 0.5,
    chargeDensity,
    thickness
});

describe('#5 magnetic-force: B 与 φ 守卫', () => {
    const model = new MagneticForceModel();

    it('正例: B=0.5T, φ=90° → 有限半径与周期', () => {
        const r = model.solve(problem('magnetic-force', { magneticForce: MAG(0.5) }));
        const mv = r.diagnostics.maxValues as Record<string, number>;
        expect(Number.isFinite(mv.radius)).toBe(true);
        expect(Number.isFinite(mv.period)).toBe(true);
        expect(mv.radius).toBeGreaterThan(0);
    });

    it('B=0 → 拒绝 (r=mv/|q|B 会为 Inf)', () => {
        const p = problem('magnetic-force', { magneticForce: MAG(0) });
        expect(model.validate(p).errors.some(e => e.param === 'magneticField')).toBe(true);
        expect(() => model.solve(p)).toThrow(ParameterOutOfRangeError);
    });

    it('φ=89.999° 仍在容差内, 不丢失圆周分支', () => {
        const r = model.solve(problem('magnetic-force', { magneticForce: MAG(0.5, 89.999) }));
        const mv = r.diagnostics.maxValues as Record<string, number>;
        expect(mv.radius).toBeGreaterThan(0);
        expect(mv.period).toBeGreaterThan(0);
    });

    it('φ=60° 非垂直入射 → 不产出圆周量', () => {
        const r = model.solve(problem('magnetic-force', { magneticForce: MAG(0.5, 60) }));
        const mv = r.diagnostics.maxValues as Record<string, number>;
        expect(mv.radius).toBe(0);
        expect(mv.period).toBe(0);
    });

    it('全结果无 NaN/Inf', () => {
        const r = model.solve(problem('magnetic-force', { magneticForce: MAG(0.5) }));
        for (const kf of r.keyframes) {
            expect(Number.isFinite(kf.position.x) && Number.isFinite(kf.position.y)).toBe(true);
        }
    });
});

describe('#5 capillary: r 与 θ 守卫', () => {
    const model = new CapillaryModel();
    const cap = (tubeRadius: number) => ({ tubeRadius, liquidMode: 'water', materialMode: 'glass' });

    it('正例: r=0.5mm 水+玻璃 → 有限上升高度', () => {
        const r = model.solve(problem('capillary', { capillary: cap(0.0005) }));
        const mv = r.diagnostics.maxValues as Record<string, number>;
        expect(Number.isFinite(mv.riseHeight ?? mv.h ?? mv.hMm ?? 0)).toBe(true);
    });

    it('r=0 → 拒绝 (h=2σcosθ/(ρgr) 会为 Inf)', () => {
        const p = problem('capillary', { capillary: cap(0) });
        expect(model.validate(p).errors.some(e => e.param === 'tubeRadius')).toBe(true);
        expect(() => model.solve(p)).toThrow(ParameterOutOfRangeError);
    });

    it('低于声明下限的 r → 同样被拒绝', () => {
        const p = problem('capillary', { capillary: cap(1e-9) });
        expect(model.validate(p).valid).toBe(false);
    });

    it('正常工况无除零告警', () => {
        const r = model.solve(problem('capillary', { capillary: cap(0.0005) }));
        expect(r.warnings.join()).not.toContain('退化为平面');
    });
});

describe('#5 hall-effect: n 与 t 守卫', () => {
    const model = new HallEffectModel();

    it('正例: n=1e22, t=1mm → 有限霍尔电压', () => {
        const r = model.solve(problem('hall-effect', { hallEffect: HALL(1e22, 1e-3) }));
        const mv = r.diagnostics.maxValues as Record<string, number>;
        expect(Number.isFinite(mv.UH ?? mv.hallVoltage ?? 0)).toBe(true);
    });

    it('n=0 → 拒绝 (作分母)', () => {
        const p = problem('hall-effect', { hallEffect: HALL(0, 1e-3) });
        expect(model.validate(p).errors.some(e => e.param === 'chargeDensity')).toBe(true);
        expect(() => model.solve(p)).toThrow(ParameterOutOfRangeError);
    });

    it('t=0 → 拒绝 (作分母)', () => {
        const p = problem('hall-effect', { hallEffect: HALL(1e22, 0) });
        expect(model.validate(p).errors.some(e => e.param === 'thickness')).toBe(true);
        expect(() => model.solve(p)).toThrow(ParameterOutOfRangeError);
    });
});

describe('#27 约束字段守卫', () => {
    const model = new HallEffectModel();

    it('缺 chargeDensity → PhysicsError, 信息含模型名与字段名 (非 TypeError)', () => {
        const p = problem('hall-effect', { hallEffect: { current: 1, magneticField: 0.5, thickness: 1e-3 } });
        let caught: unknown;
        try {
            model.solve(p);
        } catch (e) {
            caught = e;
        }
        expect(caught).toBeInstanceOf(PhysicsError);
        expect((caught as Error).message).toContain('hall-effect');
        expect((caught as Error).message).toContain('chargeDensity');
        expect((caught as Error).message).not.toContain('Cannot read properties of undefined');
    });

    it('缺 thickness → 同样给出可定位错误', () => {
        const p = problem('hall-effect', { hallEffect: { current: 1, magneticField: 0.5, chargeDensity: 1e22 } });
        expect(() => model.solve(p)).toThrow(/thickness/);
    });

    it('缺 constraints 整体 → MISSING_CONSTRAINT', () => {
        const p = problem('hall-effect', {});
        expect(() => model.solve(p)).toThrow(/约束/);
    });

    it('正常参数行为不受守卫影响 (回归保护)', () => {
        const before = model.solve(problem('hall-effect', { hallEffect: HALL(1e22, 1e-3) }));
        const after = model.solve(problem('hall-effect', { hallEffect: HALL(1e22, 1e-3) }));
        expect(after.diagnostics.maxValues).toEqual(before.diagnostics.maxValues);
    });

    describe('守卫工具函数', () => {
        it('requireConstraintNumber: 正常返回数值', () => {
            expect(requireConstraintNumber({ a: 1.5 }, 'a', 'test')).toBe(1.5);
        });

        it('requireConstraintNumber: 字段缺失 → MISSING_CONSTRAINT_FIELD', () => {
            expect(() => requireConstraintNumber({}, 'a', 'test')).toThrow(/缺少必需字段 "a"/);
        });

        it('requireConstraintNumber: 值非有限 → INVALID_CONSTRAINT_FIELD', () => {
            expect(() => requireConstraintNumber({ a: Number.NaN }, 'a', 'test')).toThrow(/必须是有限数/);
            expect(() => requireConstraintNumber({ a: Infinity }, 'a', 'test')).toThrow(PhysicsError);
        });

        it('requireConstraintNumber: 值非 number 类型 → 拒绝', () => {
            expect(() =>
                requireConstraintNumber({ a: 'x' } as unknown as Record<string, unknown>, 'a', 'test')
            ).toThrow(PhysicsError);
        });

        it('requireConstraintNumber: constraints 为 undefined → MISSING_CONSTRAINT', () => {
            expect(() => requireConstraintNumber(undefined, 'a', 'test')).toThrow(/未提供/);
        });

        it('optionalConstraintNumber: 缺失/非法时回落到 fallback', () => {
            expect(optionalConstraintNumber({ a: 2 }, 'a', 9)).toBe(2);
            expect(optionalConstraintNumber({}, 'a', 9)).toBe(9);
            expect(optionalConstraintNumber({ a: Number.NaN }, 'a', 9)).toBe(9);
            expect(optionalConstraintNumber(undefined, 'a', 9)).toBe(9);
        });
    });
});

/** Regression coverage for finite vector magnitudes at extreme scales. */
import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../src/math/vector2d.js';
import { Vec3 } from '../../src/math/vector3d.js';

describe('stable vector magnitudes', () => {
    it('Vec2 avoids overflow for large finite coordinates', () => {
        const vector = Vec2.create(3e200, 4e200);
        expect(Vec2.magnitude(vector) / 1e200).toBeCloseTo(5, 12);
        const unit = Vec2.normalize(vector);
        expect(unit.x).toBeCloseTo(0.6, 12);
        expect(unit.y).toBeCloseTo(0.8, 12);
        expect(Vec2.distance(vector, Vec2.zero()) / 1e200).toBeCloseTo(5, 12);
    });

    it('Vec2 avoids underflow for tiny finite coordinates', () => {
        const vector = Vec2.create(3e-200, 4e-200);
        expect(Vec2.magnitude(vector) / 1e-200).toBeCloseTo(5, 12);
        const unit = Vec2.normalize(vector);
        expect(unit.x).toBeCloseTo(0.6, 12);
        expect(unit.y).toBeCloseTo(0.8, 12);
    });

    it('Vec3 avoids overflow for large finite coordinates', () => {
        const vector = Vec3.create(2e200, 3e200, 6e200);
        expect(Vec3.magnitude(vector) / 1e200).toBeCloseTo(7, 12);
        const unit = Vec3.normalize(vector);
        expect(unit.x).toBeCloseTo(2 / 7, 12);
        expect(unit.y).toBeCloseTo(3 / 7, 12);
        expect(unit.z).toBeCloseTo(6 / 7, 12);
        expect(Vec3.distance(vector, Vec3.zero()) / 1e200).toBeCloseTo(7, 12);
    });

    it('Vec3 avoids underflow for tiny finite coordinates', () => {
        const vector = Vec3.create(2e-200, 3e-200, 6e-200);
        expect(Vec3.magnitude(vector) / 1e-200).toBeCloseTo(7, 12);
        const unit = Vec3.normalize(vector);
        expect(unit.x).toBeCloseTo(2 / 7, 12);
        expect(unit.y).toBeCloseTo(3 / 7, 12);
        expect(unit.z).toBeCloseTo(6 / 7, 12);
    });

    it('preserves the zero-vector contract', () => {
        expect(Vec2.magnitude(Vec2.zero())).toBe(0);
        expect(Vec3.magnitude(Vec3.zero())).toBe(0);
        expect(() => Vec2.normalize(Vec2.zero())).toThrow('Cannot normalize a zero vector');
        expect(() => Vec3.normalize(Vec3.zero())).toThrow('Cannot normalize a zero vector');
    });
});

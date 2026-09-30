import { describe, it, expect } from 'vitest';
import { Vec3 } from '../../src/math/vector3d.js';

describe('Vec3 三维向量运算', () => {
    it('create / zero 构造', () => {
        expect(Vec3.create(1, 2, 3)).toEqual({ x: 1, y: 2, z: 3 });
        expect(Vec3.zero()).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('add / sub / scale 基本运算', () => {
        const a = Vec3.create(1, 2, 3);
        const b = Vec3.create(4, 5, 6);
        expect(Vec3.add(a, b)).toEqual({ x: 5, y: 7, z: 9 });
        expect(Vec3.sub(b, a)).toEqual({ x: 3, y: 3, z: 3 });
        expect(Vec3.scale(a, 2)).toEqual({ x: 2, y: 4, z: 6 });
    });

    it('dot 点积: 正交向量点积为 0', () => {
        expect(Vec3.dot(Vec3.create(1, 2, 3), Vec3.create(4, 5, 6))).toBe(32);
        expect(Vec3.dot(Vec3.create(1, 0, 0), Vec3.create(0, 1, 0))).toBe(0);
    });

    it('cross 叉积: x̂ × ŷ = ẑ (右手系)', () => {
        const result = Vec3.cross(Vec3.create(1, 0, 0), Vec3.create(0, 1, 0));
        expect(result).toEqual({ x: 0, y: 0, z: 1 });
    });

    it('cross 边界: 反交换性 (a×b = −b×a) 与平行向量叉积为零', () => {
        const a = Vec3.create(1, 2, 3);
        const b = Vec3.create(4, 5, 6);
        const ab = Vec3.cross(a, b);
        const ba = Vec3.cross(b, a);
        expect(ab).toEqual({ x: ba.x * -1, y: ba.y * -1, z: ba.z * -1 });
        // 平行向量叉积为零向量
        expect(Vec3.cross(a, Vec3.scale(a, 5))).toEqual(Vec3.zero());
    });

    it('magnitude / magnitudeSq 模长', () => {
        const v = Vec3.create(3, 4, 12); // 3-4-12 → 13
        expect(Vec3.magnitude(v)).toBeCloseTo(13, 10);
        expect(Vec3.magnitudeSq(v)).toBeCloseTo(169, 10);
    });

    it('normalize 归一化为单位向量', () => {
        const n = Vec3.normalize(Vec3.create(0, 3, 4));
        expect(Vec3.magnitude(n)).toBeCloseTo(1, 12);
        expect(n.x).toBeCloseTo(0, 12);
        expect(n.z).toBeCloseTo(0.8, 12);
    });

    it('normalize 边界: 零向量抛错 (与 Vec2 同一约定)', () => {
        expect(() => Vec3.normalize(Vec3.zero())).toThrow();
    });

    it('distance / negate', () => {
        expect(Vec3.distance(Vec3.create(1, 2, 3), Vec3.create(4, 6, 3))).toBe(5);
        expect(Vec3.negate(Vec3.create(1, -2, 3))).toEqual({ x: -1, y: 2, z: -3 });
    });
});

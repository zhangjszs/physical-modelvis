import { describe, it, expect } from 'vitest';
import type { FieldSource, Vector3D } from 'physics-core';
import { fieldLineSeeds, FIELD_LINE_SEED_CONFIG } from '../../src/components/composition/fieldLineSeeds';

/**
 * fieldLineSeeds 场线种子生成器测试 — 纯函数, 只验证几何布点;
 * 追踪正确性由 physics-core 的 fieldlines.test.ts 负责。
 */

const ZERO3: Vector3D = { x: 0, y: 0, z: 0 };

function sub(a: Vector3D, b: Vector3D): Vector3D {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function dot(a: Vector3D, b: Vector3D): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}
function norm(v: Vector3D): number {
    return Math.hypot(v.x, v.y, v.z);
}

describe('fieldLineSeeds 场线种子生成', () => {
    it('点电荷: 球面均布, 全部种子到电荷等距且方向反号和≈0', () => {
        const center: Vector3D = { x: 0.1, y: -0.2, z: 0.3 };
        const seeds = fieldLineSeeds([{ kind: 'point-charge', charge: 2e-6, position: center }]);
        const { radius, count, lineLength } = FIELD_LINE_SEED_CONFIG.pointCharge;
        expect(seeds).toHaveLength(count);
        let sum: Vector3D = { ...ZERO3 };
        for (const s of seeds) {
            expect(s.kind).toBe('electric');
            expect(s.bidirectional).toBe(true);
            expect(s.maxArcLength).toBe(lineLength);
            const d = sub(s.start, center);
            expect(norm(d)).toBeCloseTo(radius, 10);
            sum = { x: sum.x + d.x / radius, y: sum.y + d.y / radius, z: sum.z + d.z / radius };
        }
        // Fibonacci 球面为一阶均布: 质心远离球心一个量级地小 (非精确为 0)
        expect(norm(sum) / count).toBeLessThan(0.1);
        // 关于赤道面对称 → y 分量求和为 0
        expect(Math.abs(sum.y)).toBeLessThan(1e-9);
    });

    it('极板: 板面网格两侧偏移, 法向距离 = sideOffset, 单向追踪', () => {
        const center: Vector3D = { x: 0, y: 0, z: 0.4 };
        const normal: Vector3D = { x: 0, y: 1, z: 0 };
        const seeds = fieldLineSeeds([{ kind: 'charged-plate', sigma: 2e-6, center, normal }]);
        const { divisions, halfU, halfV, sideOffset } = FIELD_LINE_SEED_CONFIG.plate;
        expect(seeds).toHaveLength(divisions * divisions * 2);
        const sides = new Set<number>();
        for (const s of seeds) {
            expect(s.kind).toBe('electric');
            expect(s.bidirectional).toBe(false);
            const rel = sub(s.start, center);
            const normalOffset = dot(rel, normal);
            expect(Math.abs(Math.abs(normalOffset) - sideOffset)).toBeLessThan(1e-10);
            sides.add(Math.sign(normalOffset));
            // 面内分量不超出网格外框
            const inPlane = Math.hypot(rel.x, rel.z);
            expect(inPlane).toBeLessThanOrEqual(Math.hypot(halfU, halfV) + 1e-10);
        }
        expect(sides).toEqual(new Set([1, -1]));
    });

    it('导线: 垂直平面圆周种子, 到导线垂距等于设定半径、轴向偏移正确', () => {
        const point: Vector3D = { x: -0.3, y: 0, z: 0.2 };
        const direction: Vector3D = { x: 0, y: 1, z: 0 };
        const seeds = fieldLineSeeds([{ kind: 'straight-wire', current: 10, point, direction }]);
        const { radii, axialOffsets } = FIELD_LINE_SEED_CONFIG.wire;
        expect(seeds).toHaveLength(radii.length * axialOffsets.length);
        for (const s of seeds) {
            expect(s.kind).toBe('magnetic');
            expect(s.bidirectional).toBe(true);
            const rel = sub(s.start, point);
            const axial = dot(rel, direction);
            const perp = {
                x: rel.x - direction.x * axial,
                y: rel.y - direction.y * axial,
                z: rel.z - direction.z * axial
            };
            const rho = norm(perp);
            expect(radii.some(r => Math.abs(rho - r) < 1e-9)).toBe(true);
            expect(axialOffsets.some(a => Math.abs(axial - a) < 1e-9)).toBe(true);
        }
    });

    it('线圈: 环向种子到轴等距, 轴向位置为 axialFactor × 半径', () => {
        const center: Vector3D = { x: 0.4, y: 0, z: 0.15 };
        const axis: Vector3D = { x: 0, y: 1, z: 0 };
        const radius = 0.15;
        const seeds = fieldLineSeeds([{ kind: 'circular-coil', current: 5, turns: 20, radius, center, axis }]);
        const { radialFactor, axialFactors, azimuthCount } = FIELD_LINE_SEED_CONFIG.coil;
        expect(seeds).toHaveLength(axialFactors.length * azimuthCount);
        for (const s of seeds) {
            expect(s.kind).toBe('magnetic');
            expect(s.bidirectional).toBe(true);
            const rel = sub(s.start, center);
            const axial = dot(rel, axis);
            const perp = { x: rel.x - axis.x * axial, y: rel.y - axis.y * axial, z: rel.z - axis.z * axial };
            expect(norm(perp)).toBeCloseTo(radialFactor * radius, 10);
            expect(axialFactors.some(f => Math.abs(axial - f * radius) < 1e-9)).toBe(true);
        }
    });

    it('多源叠加: 种子按源类型拼接, 各源互不干扰', () => {
        const sources: FieldSource[] = [
            { kind: 'point-charge', charge: 1e-6, position: { x: -0.3, y: 0, z: 0.15 } },
            { kind: 'straight-wire', current: 5, point: { x: 0.3, y: 0, z: 0.2 }, direction: { x: 0, y: 1, z: 0 } }
        ];
        const seeds = fieldLineSeeds(sources);
        expect(seeds).toHaveLength(FIELD_LINE_SEED_CONFIG.pointCharge.count + 6);
        expect(seeds.filter(s => s.kind === 'electric')).toHaveLength(FIELD_LINE_SEED_CONFIG.pointCharge.count);
        expect(seeds.filter(s => s.kind === 'magnetic')).toHaveLength(6);
    });

    it('空场源返回空数组', () => {
        expect(fieldLineSeeds([])).toEqual([]);
    });

    it('方向退化的源跳过 (不抛错, 校验层负责报错)', () => {
        expect(fieldLineSeeds([{ kind: 'charged-plate', sigma: 1e-6, center: ZERO3, normal: ZERO3 }])).toEqual([]);
        expect(fieldLineSeeds([{ kind: 'straight-wire', current: 1, point: ZERO3, direction: ZERO3 }])).toEqual([]);
        expect(
            fieldLineSeeds([{ kind: 'circular-coil', current: 1, turns: 1, radius: 0.1, center: ZERO3, axis: ZERO3 }])
        ).toEqual([]);
    });

    it('线圈半径非正时跳过', () => {
        expect(
            fieldLineSeeds([
                { kind: 'circular-coil', current: 1, turns: 1, radius: 0, center: ZERO3, axis: { x: 0, y: 1, z: 0 } }
            ])
        ).toEqual([]);
    });

    it('纯函数: 同输入两次调用结果相同且输入不被修改', () => {
        const sources: FieldSource[] = [{ kind: 'point-charge', charge: 1e-6, position: { x: 0.1, y: 0, z: 0.15 } }];
        const snapshot = JSON.parse(JSON.stringify(sources));
        const a = fieldLineSeeds(sources);
        const b = fieldLineSeeds(sources);
        expect(a).toEqual(b);
        expect(sources).toEqual(snapshot);
    });
});

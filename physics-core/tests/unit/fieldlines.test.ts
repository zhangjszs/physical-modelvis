import { describe, it, expect } from 'vitest';
import { traceFieldLine } from '../../src/physics/fieldlines.js';
import { Vec3 } from '../../src/math/vector3d.js';
import type { Vector3D } from '../../src/types/common.js';

const ZERO3: Vector3D = { x: 0, y: 0, z: 0 };

describe('fieldlines 3D 场线追踪', () => {
    it('点电荷电场线: 从 +x 轴种子出发严格沿径向 (y/z 恒为 0)', () => {
        const line = traceFieldLine([{ kind: 'point-charge', charge: 1e-9, position: ZERO3 }], {
            start: Vec3.create(0.5, 0, 0),
            kind: 'electric',
            bidirectional: false,
            stepLength: 0.01,
            maxArcLength: 0.5
        });
        expect(line.length).toBeGreaterThan(10);
        expect(line[0]).toEqual(Vec3.create(0.5, 0, 0)); // 含种子点
        for (const p of line) {
            expect(p.y).toBe(0);
            expect(p.z).toBe(0);
            expect(p.x).toBeGreaterThanOrEqual(0.5);
        }
    });

    it('直导线磁场线: 所有顶点到导线垂距恒定 (同心圆)', () => {
        const line = traceFieldLine(
            [{ kind: 'straight-wire', current: 1, point: ZERO3, direction: Vec3.create(0, 0, 1) }],
            {
                start: Vec3.create(0.1, 0, 0),
                kind: 'magnetic',
                bidirectional: false,
                stepLength: 0.01,
                maxArcLength: 1.0
            }
        );
        expect(line.length).toBeGreaterThan(50);
        for (const p of line) {
            const rho = Math.hypot(p.x, p.y);
            expect(Math.abs(rho - 0.1)).toBeLessThan(5e-4);
        }
    });

    it('中性点 (等量同号电荷连线中点 E=0): 无法起线, 仅返回种子点', () => {
        const line = traceFieldLine(
            [
                { kind: 'point-charge', charge: 1e-9, position: Vec3.create(-0.1, 0, 0) },
                { kind: 'point-charge', charge: 1e-9, position: Vec3.create(0.1, 0, 0) }
            ],
            { start: ZERO3, kind: 'electric', stepLength: 0.01, maxArcLength: 1 }
        );
        expect(line).toEqual([ZERO3]);
    });

    it('双向追踪: 平行板间场线沿 ±z 对称延伸, 且严格在轴上', () => {
        const sigma = 1e-6;
        const line = traceFieldLine(
            [
                { kind: 'charged-plate', sigma, center: Vec3.create(0, 0, 0.01), normal: Vec3.create(0, 0, 1) },
                { kind: 'charged-plate', sigma: -sigma, center: Vec3.create(0, 0, -0.01), normal: Vec3.create(0, 0, 1) }
            ],
            { start: ZERO3, kind: 'electric', stepLength: 0.002, maxArcLength: 0.008 }
        );
        expect(line.length).toBeGreaterThan(5);
        expect(line[0].z).toBeGreaterThan(0); // 负向端 (+z, 逆着 E)
        expect(line[line.length - 1].z).toBeLessThan(0); // 正向端 (−z, 沿 E)
        for (const p of line) {
            expect(p.x).toBe(0);
            expect(p.y).toBe(0);
        }
    });

    it('边界半径: 超界即停, 终点不越过 boundRadius 一个步长以上', () => {
        const line = traceFieldLine([{ kind: 'point-charge', charge: 1e-9, position: ZERO3 }], {
            start: Vec3.create(0.5, 0, 0),
            kind: 'electric',
            bidirectional: false,
            stepLength: 0.02,
            maxArcLength: 100,
            boundRadius: 1
        });
        const last = line[line.length - 1];
        expect(Vec3.magnitude(last)).toBeLessThanOrEqual(1.02);
        expect(Vec3.magnitude(last)).toBeGreaterThan(0.95);
    });

    it('非法步长抛错', () => {
        expect(() =>
            traceFieldLine([{ kind: 'point-charge', charge: 1e-9, position: ZERO3 }], {
                start: Vec3.create(0.5, 0, 0),
                kind: 'electric',
                stepLength: 0
            })
        ).toThrow(/步长/);
    });
});

/**
 * 几何 / 单位 / 注释-实现一致性契约 (#9)
 *
 * 覆盖三处已修复的缺陷:
 *   1. electric-field-lines 平行板电场线纵坐标硬编码 ±1, 无视实际 plateGap → 场线与极板错位
 *   2. magnetic-force 用 `phiDeg === 90` 精确浮点比较判垂直入射 → 89.999° 静默丢失圆周分支;
 *      且圆轨迹时间轴 t 用分数 (i/steps) 而非秒
 *   3. Vec2.normalize 注释称"零向量返回零向量", 实现却抛错 → 契约与实现矛盾
 */

import { describe, it, expect } from 'vitest';
import { ElectricFieldLinesModel } from '../../src/models/electric-field-lines.js';
import type { ElectricFieldExtra } from '../../src/models/electric-field-lines.js';
import { MagneticForceModel } from '../../src/models/magnetic-force.js';
import { Vec2 } from '../../src/math/vector2d.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

function makeProblem(model: PhysicsProblem['model'], constraints: Record<string, unknown>): PhysicsProblem {
    return {
        id: 'geometry-test',
        model,
        bodies: [{ id: 'b1', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: constraints as unknown as PhysicsProblem['constraints'],
        environment: {},
        timeConfig: { duration: 5, sampleCount: 100 }
    };
}

describe('#9 平行板电场线几何随 plateGap 联动', () => {
    const model = new ElectricFieldLinesModel();

    // SimulationResult.extra 的静态类型是 Record<string, unknown>; 此处还原模型声明的真实结构
    const build = (
        plateGap: number
    ): {
        plates: NonNullable<ElectricFieldExtra['plates']>;
        lines: ElectricFieldExtra['fieldLines'];
        plateField: ElectricFieldExtra['plateField'];
    } => {
        const r = model.solve(
            makeProblem('electric-field-lines', {
                electricFieldLines: { mode: 'parallel-plate', charges: [], plateGap, plateLength: 2, plateVoltage: 12 }
            })
        );
        const extra = r.extra as unknown as ElectricFieldExtra;
        return { plates: extra.plates!, lines: extra.fieldLines, plateField: extra.plateField };
    };

    it('场线纵坐标范围与极板位置一致 (不再硬编码 ±1)', () => {
        const { plates, lines } = build(1.2);
        expect(plates).toBeDefined();
        expect(plates!.top).toBeCloseTo(0.6, 6);
        expect(plates!.bottom).toBeCloseTo(-0.6, 6);

        const ys = lines[0]!.points.map(p => p.y);
        expect(Math.min(...ys)).toBeCloseTo(plates!.bottom, 4);
        expect(Math.max(...ys)).toBeCloseTo(plates!.top, 4);
    });

    it('改变 plateGap 时场线几何跟随变化', () => {
        const narrow = build(0.4);
        const wide = build(1.2);
        const span = (g: { plates: { top: number; bottom: number } }) => g.plates.top - g.plates.bottom;

        expect(span(narrow)).toBeCloseTo(0.4, 6);
        expect(span(wide)).toBeCloseTo(1.2, 6);
        // 若场线仍硬编码 ±1, 两者 y 跨度会相同 —— 此断言即为回归防线
        const narrowYs = narrow.lines[0]!.points.map(p => p.y);
        const wideYs = wide.lines[0]!.points.map(p => p.y);
        expect(Math.max(...narrowYs) - Math.min(...narrowYs)).not.toBeCloseTo(
            Math.max(...wideYs) - Math.min(...wideYs),
            3
        );
    });

    it('板间场强 E = U/d 量纲正确 (d 先折算为米)', () => {
        // plateGap=1.2 场景单位 × SCENE_TO_M(0.1) = 0.12 m → E = 12/0.12 = 100 V/m
        expect(build(1.2).plateField).toBeCloseTo(100, 6);
        expect(build(0.4).plateField).toBeCloseTo(300, 6);
    });
});

describe('#9 洛伦兹力垂直入射判定用容差', () => {
    const model = new MagneticForceModel();

    const build = (velocityAngleDeg: number) =>
        model.solve(
            makeProblem('magnetic-force', {
                magneticForce: {
                    mode: 'particle',
                    magneticField: 0.5,
                    charge: 1.6e-19,
                    velocity: 1e6,
                    particleMass: 9.11e-31,
                    velocityAngleDeg
                }
            })
        );

    it('正例: φ=90° 得到圆周半径与周期', () => {
        const m = build(90).diagnostics.maxValues as Record<string, number>;
        expect(m.radius).toBeGreaterThan(0);
        expect(m.period).toBeGreaterThan(0);
    });

    it('φ=89.999° 仍识别为垂直入射 (容差内)', () => {
        const m = build(89.999).diagnostics.maxValues as Record<string, number>;
        expect(m.radius, '89.999° 应落在容差内, 不应丢失圆周分支').toBeGreaterThan(0);
        expect(m.period).toBeGreaterThan(0);
    });

    it('φ=60° 非垂直入射, 不产出圆周轨迹', () => {
        const m = build(60).diagnostics.maxValues as Record<string, number>;
        expect(m.radius).toBe(0);
        expect(m.period).toBe(0);
    });

    it('圆轨迹时间轴以秒为单位, 末点 t 等于一个周期', () => {
        const r = build(90);
        const period = (r.diagnostics.maxValues as Record<string, number>).period;
        const path = r.trajectories[0]!;
        expect(path.length).toBeGreaterThan(1);
        expect(path[0]!.t).toBe(0);
        // 修复前 t = i/steps (0~1 的分数), 与 TrajectoryPoint.t 的"秒"约定不符
        expect(path[path.length - 1]!.t).toBeCloseTo(period, 6);
    });

    it('圆轨迹速度大小处处相等 (v = rω)', () => {
        const r = build(90);
        const m = r.diagnostics.maxValues as Record<string, number>;
        const vExpected = m.radius * ((2 * Math.PI) / m.period);
        for (const p of r.trajectories[0]!) {
            expect(Math.hypot(p.velocity.x, p.velocity.y)).toBeCloseTo(vExpected, 3);
        }
    });
});

describe('#9 Vec2.normalize 注释与实现一致', () => {
    it('非零向量归一化后模长为 1', () => {
        const n = Vec2.normalize({ x: 3, y: 4 });
        expect(Vec2.magnitude(n)).toBeCloseTo(1, 12);
    });

    it('零向量抛错 (方向未定义, 不静默返回零向量)', () => {
        expect(() => Vec2.normalize({ x: 0, y: 0 })).toThrow('zero vector');
    });
});

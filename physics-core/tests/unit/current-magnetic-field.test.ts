import { describe, it, expect } from 'vitest';
import { CurrentMagneticFieldModel } from '../../src/models/current-magnetic-field.js';
import type { PhysicsProblem } from '../../src/types/problem.js';
import type { MagFieldExtra } from '../../src/models/current-magnetic-field.js';

const model = new CurrentMagneticFieldModel();

function makeProblem(constraint: PhysicsProblem['constraints']): PhysicsProblem {
    return {
        id: 'cmf-test',
        model: 'current-magnetic-field',
        bodies: [],
        constraints: constraint,
        timeConfig: { duration: 1, sampleCount: 10 }
    };
}

function readExtra(r: ReturnType<typeof model.solve>): MagFieldExtra {
    return r.extra as unknown as MagFieldExtra;
}

describe('CurrentMagneticFieldModel', () => {
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('current-magnetic-field');
        expect(model.name).toBe('电流的磁场');
    });

    it('通电直导线: 磁场线为以导线为中心的同心圆 (半径近似恒定)', () => {
        const r = model.solve(
            makeProblem({ currentMagneticField: { mode: 'straight-wire', current: 1.0 } })
        );
        const extra = readExtra(r);
        expect(extra.wire).toBeDefined();
        expect(extra.fieldLines.length).toBeGreaterThan(0);
        // 取第一条场线, 各顶点到导线中心距离应近似相等
        const line = extra.fieldLines[0]!;
        const r0 = Math.hypot(line.points[0]!.x, line.points[0]!.y);
        for (const p of line.points) {
            const rr = Math.hypot(p.x, p.y);
            expect(Math.abs(rr - r0)).toBeLessThan(0.06);
        }
    });

    it('通电直导线: 磁感应强度随距离反比衰减 (B(1/3) / B(2/3) ≈ 2)', () => {
        const r = model.solve(
            makeProblem({ currentMagneticField: { mode: 'straight-wire', current: 1.0 } })
        );
        const extra = readExtra(r);
        // 采样网格为 n=7: 坐标取 -1 + 2i/6, 即 ±1/3、±2/3 等
        const b033 = extra.samples.find(s => Math.abs(s.y) < 1e-6 && Math.abs(Math.abs(s.x) - 1 / 3) < 1e-3);
        const b067 = extra.samples.find(s => Math.abs(s.y) < 1e-6 && Math.abs(Math.abs(s.x) - 2 / 3) < 1e-3);
        expect(b033).toBeDefined();
        expect(b067).toBeDefined();
        const ratio = b033!.magnitude / b067!.magnitude;
        expect(ratio).toBeGreaterThan(1.8);
        expect(ratio).toBeLessThan(2.2);
    });

    it('线圈 (磁偶极): 轴线上方 B_y 与磁矩同向, 赤道面 B_y 反向', () => {
        const r = model.solve(
            makeProblem({ currentMagneticField: { mode: 'coil', current: 1.0, turns: 10, radius: 0.6 } })
        );
        const extra = readExtra(r);
        expect(extra.poles).toBeDefined();
        // 采样网格 n=7: 坐标取 ±1/3、±2/3、±1
        const top = extra.samples.find(s => Math.abs(s.x) < 1e-6 && Math.abs(s.y - 2 / 3) < 1e-3);
        const side = extra.samples.find(s => Math.abs(s.y) < 1e-6 && Math.abs(s.x - 2 / 3) < 1e-3);
        expect(top).toBeDefined();
        expect(side).toBeDefined();
        // 偶极 m 沿 +y: 轴线上方 (x=0) B_y > 0; 赤道面 (y=0) B_y < 0 (反向)
        expect(top!.by).toBeGreaterThan(0);
        expect(side!.by).toBeLessThan(0);
    });

    it('螺线管: 同样给出 N/S 极与闭合磁场线', () => {
        const r = model.solve(
            makeProblem({
                currentMagneticField: { mode: 'solenoid', current: 1.0, turns: 10, radius: 0.6, halfLength: 1.0 }
            })
        );
        const extra = readExtra(r);
        expect(extra.poles).toBeDefined();
        expect(extra.fieldLines.length).toBeGreaterThan(0);
    });

    it('缺少约束时抛出 PhysicsError', () => {
        const bad = makeProblem({});
        expect(() => model.solve(bad)).toThrow();
    });
});

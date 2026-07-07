import { describe, it, expect } from 'vitest';
import { ElectricFieldLinesModel } from '../../src/models/electric-field-lines.js';
import type { PhysicsProblem } from '../../src/types/problem.js';
import type { ElectricFieldExtra } from '../../src/models/electric-field-lines.js';

const model = new ElectricFieldLinesModel();

function makeProblem(constraint: PhysicsProblem['constraints']): PhysicsProblem {
    return {
        id: 'efl-test',
        model: 'electric-field-lines',
        // 场分布模型不依赖运动物体
        bodies: [],
        constraints: constraint,
        timeConfig: { duration: 1, sampleCount: 10 }
    };
}

function readExtra(r: ReturnType<typeof model.solve>): ElectricFieldExtra {
    return r.extra as unknown as ElectricFieldExtra;
}

describe('ElectricFieldLinesModel', () => {
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('electric-field-lines');
        expect(model.name).toBe('电场线分布');
    });

    it('单点正电荷: 电场线呈径向 (各点相对原点夹角恒定)', () => {
        const r = model.solve(
            makeProblem({ electricFieldLines: { mode: 'point-charge', charges: [{ x: 0, y: 0, q: 1 }] } })
        );
        const extra = readExtra(r);
        expect(extra.fieldLines.length).toBeGreaterThan(0);
        for (const line of extra.fieldLines) {
            const a0 = Math.atan2(line.points[1]!.y, line.points[1]!.x);
            const last = line.points[line.points.length - 1]!;
            const a1 = Math.atan2(last.y, last.x);
            // 夹角应基本不变 (径向射线)
            expect(Math.abs(a1 - a0)).toBeLessThan(0.15);
        }
    });

    it('单点正电荷: 场强随距离平方反比衰减 (|E(1/3)| / |E(2/3)| ≈ 4)', () => {
        const r = model.solve(
            makeProblem({ electricFieldLines: { mode: 'point-charge', charges: [{ x: 0, y: 0, q: 1 }] } })
        );
        const extra = readExtra(r);
        // 采样网格为 n=7: 坐标取 -1 + 2i/6, 即 ±1/3、±2/3 等
        const e033 = extra.samples.find(s => Math.abs(s.y) < 1e-6 && Math.abs(Math.abs(s.x) - 1 / 3) < 1e-3);
        const e067 = extra.samples.find(s => Math.abs(s.y) < 1e-6 && Math.abs(Math.abs(s.x) - 2 / 3) < 1e-3);
        expect(e033).toBeDefined();
        expect(e067).toBeDefined();
        const ratio = e033!.magnitude / e067!.magnitude;
        expect(ratio).toBeGreaterThan(3.5);
        expect(ratio).toBeLessThan(4.5);
    });

    it('电偶极子: 从正电荷发出的场线汇入负电荷 (末点接近负电荷)', () => {
        const r = model.solve(
            makeProblem({ electricFieldLines: { mode: 'dipole', dipoleCharge: 5, dipoleSeparation: 1.0 } })
        );
        const extra = readExtra(r);
        // 至少有一条场线终结于负电荷 (+0.5, 0) 附近
        const endsAtNegative = extra.fieldLines.some(line => {
            const last = line.points[line.points.length - 1]!;
            return Math.hypot(last.x - 0.5, last.y) < 0.1;
        });
        expect(endsAtNegative).toBe(true);
    });

    it('平行板: 生成竖直电场线且给出板间场强', () => {
        const r = model.solve(
            makeProblem({
                electricFieldLines: { mode: 'parallel-plate', plateGap: 1.2, plateVoltage: 12, plateLength: 2.0 }
            })
        );
        const extra = readExtra(r);
        expect(extra.plates).toBeDefined();
        expect(extra.plateField).toBeGreaterThan(0);
        expect(extra.fieldLines.length).toBeGreaterThan(0);
        // 场线近似竖直 (x 几乎不变)
        const line = extra.fieldLines[0]!;
        const dx = Math.abs(line.points[line.points.length - 1]!.x - line.points[0]!.x);
        expect(dx).toBeLessThan(0.3);
    });

    it('缺少约束时抛出 PhysicsError', () => {
        const bad = makeProblem({});
        expect(() => model.solve(bad)).toThrow();
    });
});

import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { ProjectileCollisionModel } from '../../src/models/projectile-collision.js';

function makeBody(id = 'b1', mass = 1) {
    return {
        id,
        mass: { value: mass, unit: 'kg' as const },
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 }
    };
}
function makeProblemPartial(
    modelType: string,
    constraints: Record<string, unknown>,
    bodies: ReturnType<typeof makeBody>[] = [makeBody()]
): PhysicsProblem {
    return {
        id: 'test-' + modelType,
        model: modelType as PhysicsProblem['model'],
        bodies,
        constraints: constraints as PhysicsProblem['constraints'],
        timeConfig: { duration: 5, sampleCount: 100 },
        environment: {}
    };
}

describe('E1: ProjectileCollisionModel', () => {
    const model = new ProjectileCollisionModel();
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('projectile-collision');
        expect(model.name).toContain('平抛');
        expect(model.version).toBe('1.0.0');
    });
    it('动量守恒: m1=m2=1, v1=2, e=1 → OM+ON = OP', () => {
        const r = model.solve(
            makeProblemPartial('projectile-collision', {
                projectileCollision: { m1: 1, m2: 1, v1Initial: 2, tableHeight: 1, restitution: 1, gravity: 9.8 }
            })
        );
        const OP = r.diagnostics.maxValues.OP as number;
        const OM = r.diagnostics.maxValues.OM as number;
        const ON = r.diagnostics.maxValues.ON as number;
        expect(OP).toBeGreaterThan(0);
        expect(OM).toBeCloseTo(0, 5);
        expect(ON).toBeCloseTo(OP, 5);
    });
    it('完全非弹性 (e=0): OM≈ON', () => {
        const r = model.solve(
            makeProblemPartial('projectile-collision', {
                projectileCollision: { m1: 1, m2: 1, v1Initial: 4, tableHeight: 1.25, restitution: 0 }
            })
        );
        const OM = r.diagnostics.maxValues.OM as number;
        const ON = r.diagnostics.maxValues.ON as number;
        expect(Math.abs(OM - ON)).toBeLessThan(0.01);
    });
    it('动量守恒相对误差 < 1e-6', () => {
        const r = model.solve(
            makeProblemPartial('projectile-collision', {
                projectileCollision: { m1: 0.5, m2: 2, v1Initial: 3, tableHeight: 1, restitution: 1 }
            })
        );
        const relErr = r.diagnostics.maxValues.momentumRelErr as number;
        expect(relErr).toBeLessThan(1e-6);
    });
    it('conservedQuantities 包含水平动量', () => {
        const r = model.solve(
            makeProblemPartial('projectile-collision', {
                projectileCollision: { m1: 1, m2: 1, v1Initial: 2, tableHeight: 1 }
            })
        );
        expect(r.diagnostics.conservedQuantities.length).toBeGreaterThanOrEqual(1);
        expect(r.diagnostics.conservedQuantities[0]!.name).toContain('动量');
        expect(r.diagnostics.conservedQuantities[0]!.conserved).toBe(true);
    });

    it('m₂ > m₁ 反弹时 OM_signed < 0, 关键帧/图表/动量代数和一致', () => {
        const m1 = 0.1;
        const m2 = 0.2;
        const v1 = 2;
        const h = 0.8;
        const g = 9.8;
        const r = model.solve(
            makeProblemPartial('projectile-collision', {
                projectileCollision: { m1, m2, v1Initial: v1, tableHeight: h, restitution: 1, gravity: g }
            })
        );
        const mv = r.diagnostics.maxValues;
        const tFall = Math.sqrt((2 * h) / g);
        const expectedOMSigned = (-1 / 3) * v1 * tFall;
        const expectedONSigned = (2 / 3) * v1 * tFall;

        expect(mv.v1After).toBeLessThan(0);
        expect(mv.OM_signed).toBeCloseTo(expectedOMSigned, 6);
        expect(mv.ON_signed).toBeCloseTo(expectedONSigned, 6);
        expect(mv.OM).toBeCloseTo(Math.abs(expectedOMSigned), 6);
        expect(mv.ON).toBeCloseTo(expectedONSigned, 6);
        expect(m1 * mv.OP!).toBeCloseTo(m1 * mv.OM_signed! + m2 * mv.ON_signed!, 6);

        // 关键帧 OM 落点在负半轴
        const kfOM = r.keyframes.find(k => k.label.includes('OM'))!;
        expect(kfOM.position.x).toBeCloseTo(expectedOMSigned, 6);
        expect(kfOM.position.x).toBeLessThan(0);

        // range_diagram 包含负向坐标点与足够负半轴范围
        const pts = r.charts.range_diagram!.points;
        expect(pts.some(p => Math.abs(p.x - expectedOMSigned) < 1e-6 && p.y === 1.5)).toBe(true);
        expect(Math.min(...pts.map(p => p.x))).toBeLessThan(expectedOMSigned);

        // 步骤 4 公式与计算使用带符号位移
        const step4 = r.explanation.steps.find(s => s.order === 4)!;
        expect(step4.formula).toContain('OM_signed');
        expect(step4.calculation).toContain(expectedOMSigned.toFixed(3));
    });

    it('质量比与恢复系数矩阵 (m₂>m₁ / m₂=m₁ / m₂<m₁, e=0/0.5/1): 动量守恒、动能损失与碰撞文案准确', () => {
        const cases = [
            { m1: 0.1, m2: 0.3, e: 1, expectLabel: '完全弹性' },
            { m1: 0.2, m2: 0.2, e: 0.5, expectLabel: '非弹性' },
            { m1: 0.3, m2: 0.1, e: 0, expectLabel: '完全非弹性' }
        ];
        for (const c of cases) {
            const v1 = 3;
            const r = model.solve(
                makeProblemPartial('projectile-collision', {
                    projectileCollision: { m1: c.m1, m2: c.m2, v1Initial: v1, tableHeight: 1.25, restitution: c.e }
                })
            );
            const mv = r.diagnostics.maxValues;
            expect(c.m1 * mv.OP!).toBeCloseTo(c.m1 * mv.OM_signed! + c.m2 * mv.ON_signed!, 6);
            expect(mv.momentumRelErr).toBeLessThan(1e-6);

            const expectedLoss = ((1 - c.e * c.e) * (c.m1 * c.m2) * v1 * v1) / (2 * (c.m1 + c.m2));
            expect(mv.KEloss).toBeCloseTo(expectedLoss, 6);

            const kfColl = r.keyframes.find(k => k.label === '碰撞瞬间')!;
            expect(kfColl.description).toContain(c.expectLabel);
            if (c.e < 1) {
                expect(kfColl.description).not.toContain('完全弹性');
            }
        }
    });
});

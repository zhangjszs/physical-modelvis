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
});

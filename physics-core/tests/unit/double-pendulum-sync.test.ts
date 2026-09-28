import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { DoublePendulumSyncModel } from '../../src/models/double-pendulum.js';

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

describe('E2: DoublePendulumSyncModel', () => {
    const model = new DoublePendulumSyncModel();
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('double-pendulum');
        expect(model.name).toContain('单摆');
    });
    it('同摆长+同相: T1=T2', () => {
        const r = model.solve(
            makeProblemPartial('double-pendulum', {
                doublePendulum: { length1: 1, length2: 1, initialAngle1: 5, initialAngle2: 5, phaseDiff: 0 }
            })
        );
        const T1 = r.diagnostics.maxValues.T1 as number;
        const T2 = r.diagnostics.maxValues.T2 as number;
        expect(Math.abs(T1 - T2)).toBeLessThan(1e-9);
        expect(r.diagnostics.flags?.sameLength).toBe(true);
        expect(r.diagnostics.flags?.inPhase).toBe(true);
    });
    it('不同摆长: T1≠T2', () => {
        const r = model.solve(
            makeProblemPartial('double-pendulum', {
                doublePendulum: { length1: 1, length2: 4, initialAngle1: 5, initialAngle2: 5, phaseDiff: 0 }
            })
        );
        const T1 = r.diagnostics.maxValues.T1 as number;
        const T2 = r.diagnostics.maxValues.T2 as number;
        expect(Math.abs(T1 - T2)).toBeGreaterThan(0.1);
        expect(r.diagnostics.flags?.sameLength).toBe(false);
    });
    it('反相: antiPhase flag', () => {
        const r = model.solve(
            makeProblemPartial('double-pendulum', {
                doublePendulum: { length1: 1, length2: 1, initialAngle1: 5, initialAngle2: 5, phaseDiff: 180 }
            })
        );
        expect(r.diagnostics.flags?.antiPhase).toBe(true);
    });
    it('θ-t 图表正确生成', () => {
        const r = model.solve(
            makeProblemPartial('double-pendulum', {
                doublePendulum: { length1: 1, length2: 1, initialAngle1: 10, initialAngle2: 10, phaseDiff: 0 }
            })
        );
        expect(r.charts.theta_t!.points.length).toBeGreaterThan(50);
        expect(r.charts.y_t!.points.length).toBeGreaterThan(50);
    });
});

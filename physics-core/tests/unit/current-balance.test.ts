import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { CurrentBalanceModel } from '../../src/models/current-balance.js';

function makeBody(id = 'b1', mass = 1) {
    return { id, mass: { value: mass, unit: 'kg' as const }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
}
function makeProblem(
    modelType: string,
    constraints: Record<string, unknown>,
    bodies: ReturnType<typeof makeBody>[] = [makeBody()]
): PhysicsProblem {
    return {
        id: 'test-' + modelType,
        model: modelType as PhysicsProblem['model'],
        bodies,
        constraints: constraints as unknown as PhysicsProblem['constraints'],
        timeConfig: { duration: 5, sampleCount: 100 },
        environment: {}
    };
}

describe('F1: CurrentBalanceModel', () => {
    const model = new CurrentBalanceModel();
    it('metadata ok', () => {
        expect(model.modelType).toBe('current-balance');
    });
    it('equilibrium chart', () => {
        const r = model.solve(
            makeProblem('current-balance', {
                currentBalance: {
                    wireLen: 0.05,
                    turns: 100,
                    mass: 0.01,
                    current: 1,
                    magneticField: 0.2,
                    armLen: 0.1,
                    gravity: 9.8
                }
            })
        );
        expect(r.charts.tilt_angle_vs_current).toBeDefined();
        expect(r.charts.mg_vs_t).toBeDefined();
    });
});

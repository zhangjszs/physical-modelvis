import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { MutualInductanceModel } from '../../src/models/mutual-inductance.js';

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

describe('F4: MutualInductanceModel', () => {
    const model = new MutualInductanceModel();
    it('metadata ok', () => {
        expect(model.modelType).toBe('mutual-inductance');
    });
    it('chart ok', () => {
        const r = model.solve(
            makeProblem('mutual-inductance', {
                mutualInductance: { L1: 0.1, L2: 0.4, coupling: 0.8, frequency: 50, primaryCurrent: 2 }
            })
        );
        expect(r.charts.primary_current_vs_time).toBeDefined();
        expect(r.charts.secondary_emf_vs_time).toBeDefined();
    });
});

import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { EddyCurrentModel } from '../../src/models/eddy-current.js';

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

describe('F2: EddyCurrentModel', () => {
    const model = new EddyCurrentModel();
    it('metadata ok', () => {
        expect(model.modelType).toBe('eddy-current');
    });
    it('generate result', () => {
        const r = model.solve(
            makeProblem('eddy-current', {
                eddyCurrent: { magneticField: 1.0, frequency: 50, conductivity: 1e6, thickness: 0.001 }
            })
        );
        expect(r.meta.model).toBe('eddy-current');
    });
});

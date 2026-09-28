import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { PerpetuumMobileModel } from '../../src/models/perpetuum-mobile.js';

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

describe('G16: Perpetuum', () => {
    const m = new PerpetuumMobileModel();
    it('meta', () => {
        expect(m.modelType).toBe('perpetuum-mobile');
    });
    it('chart', () => {
        expect(
            m.solve(
                makeProblem('perpetuum-mobile', { perpetuumMobile: { hotTemp: 500, coldTemp: 300, mode: 'carnot' } })
            ).explanation.summary
        ).toBeTruthy();
    });
});

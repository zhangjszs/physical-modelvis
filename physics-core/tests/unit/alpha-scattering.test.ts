import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { AlphaScatteringModel } from '../../src/models/alpha-scattering.js';

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

describe('G18: AlphaScattering', () => {
    const m = new AlphaScatteringModel();
    it('meta', () => {
        expect(m.modelType).toBe('alpha-scattering');
    });
    it('chart', () => {
        expect(
            m.solve(
                makeProblem('alpha-scattering', {
                    alphaScattering: { alphaEnergy: 5, targetZ: 79, foilThickness: 1e-6 }
                })
            ).charts.x_t
        ).toBeDefined();
    });
});

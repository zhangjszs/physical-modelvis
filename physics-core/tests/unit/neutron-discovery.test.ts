import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { NeutronDiscoveryModel } from '../../src/models/neutron-discovery.js';

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

describe('G24: NeutronDiscovery', () => {
    const m = new NeutronDiscoveryModel();
    it('meta', () => {
        expect(m.modelType).toBe('neutron-discovery');
    });
    it('chart', () => {
        expect(
            m.solve(makeProblem('neutron-discovery', { neutronDiscovery: { alphaEnergy: 5.5, targetMass: 1 } })).charts
                .x_t
        ).toBeDefined();
    });
});

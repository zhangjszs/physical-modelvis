import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { BrownianMotionModel } from '../../src/models/brownian-motion.js';

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

describe('G2: Brownian', () => {
    const m = new BrownianMotionModel();
    it('meta', () => {
        expect(m.modelType).toBe('brownian-motion');
    });
    it('chart', () => {
        expect(
            m.solve(
                makeProblem('brownian-motion', {
                    brownianMotion: { particleRadius: 1e-6, liquidTemp: 300, fluidViscosity: 1e-3, duration: 1 }
                })
            ).charts.x_t
        ).toBeDefined();
    });
});

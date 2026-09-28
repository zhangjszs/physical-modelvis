import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { JouleMechanicalModel } from '../../src/models/joule-mechanical.js';

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

describe('G11: JouleMech', () => {
    const m = new JouleMechanicalModel();
    it('meta', () => {
        expect(m.modelType).toBe('joule-mechanical');
    });
    it('chart', () => {
        expect(
            m.solve(
                makeProblem('joule-mechanical', { jouleMechanical: { mass: 5, height: 1, drops: 50, waterMass: 0.1 } })
            ).explanation.summary
        ).toBeTruthy();
    });
});

import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { ReedSwitchModel } from '../../src/models/reed-switch.js';

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

describe('F9: ReedSwitchModel', () => {
    const model = new ReedSwitchModel();
    it('metadata ok', () => {
        expect(model.modelType).toBe('reed-switch');
    });
    it('result ok', () => {
        const r = model.solve(makeProblem('reed-switch', { reedSwitch: { mode: 'magnetic', magnetDistance: 5 } }));
        expect(r.explanation.summary).toBeTruthy();
    });
});

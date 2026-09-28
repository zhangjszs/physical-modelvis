import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { SelfInductanceModel } from '../../src/models/self-inductance.js';

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

describe('F5: SelfInductanceModel', () => {
    const model = new SelfInductanceModel();
    it('metadata ok', () => {
        expect(model.modelType).toBe('self-inductance');
    });
    it('chart ok', () => {
        const r = model.solve(
            makeProblem('self-inductance', {
                selfInductance: { inductance: 0.1, resistance: 10, emf: 12, mode: 'turnOn' }
            })
        );
        expect(r.charts.current_vs_time).toBeDefined();
        expect(r.charts.voltage_vs_time).toBeDefined();
    });
});

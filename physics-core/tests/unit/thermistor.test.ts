import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { ThermistorModel } from '../../src/models/thermistor.js';

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

describe('F11: ThermistorModel', () => {
    const model = new ThermistorModel();
    it('metadata ok', () => {
        expect(model.modelType).toBe('thermistor');
    });
    it('chart ok', () => {
        const r = model.solve(
            makeProblem('thermistor', { thermistor: { temperature: 300, mode: 'NTC', R0: 10000, BValue: 3950 } })
        );
        expect(r.charts.x_t).toBeDefined();
    });
});

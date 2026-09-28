import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { OilFilmModel } from '../../src/models/oil-film.js';

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

describe('G5: OilFilm', () => {
    const m = new OilFilmModel();
    it('meta', () => {
        expect(m.modelType).toBe('oil-film');
    });
    // oilConcentration 为 1:x 稀释比 (x ∈ [100, 10000]), 与 requiredParameters 声明一致
    it('chart', () => {
        expect(
            m.solve(makeProblem('oil-film', { oilFilm: { oilConcentration: 500, dropsPerMl: 100, filmArea: 100 } }))
                .explanation.summary
        ).toBeTruthy();
    });
});

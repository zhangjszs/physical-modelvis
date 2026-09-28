import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { SurfaceTensionModel } from '../../src/models/surface-tension.js';

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

describe('G7: SurfaceTension', () => {
    const m = new SurfaceTensionModel();
    it('meta', () => {
        expect(m.modelType).toBe('surface-tension');
    });
    // temperature 单位为 °C (非 K) — 与 requiredParameters 声明一致
    it('chart', () => {
        expect(
            m.solve(
                makeProblem('surface-tension', {
                    surfaceTension: { liquidMode: 'water', sliderLength: 0.05, temperature: 20 }
                })
            ).charts.x_t
        ).toBeDefined();
    });
});

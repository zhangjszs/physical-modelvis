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
        const res = m.solve(
            makeProblem('surface-tension', {
                surfaceTension: { liquidMode: 'water', sliderLength: 0.05, temperature: 20 }
            })
        );
        expect(res.charts.x_t).toBeDefined();
        // #58 单一真源: 水 σ₀ 取自 PHYSICS_CONSTANTS.sigmaWater20C (0.0728), 不得回退内联 0.072
        const mv = res.diagnostics.maxValues as Record<string, number>;
        expect(mv.sigma0).toBeCloseTo(0.0728, 6);
        expect(mv.sigma).toBeCloseTo(0.0728, 6); // T=20 → σ=σ₀
    });
});

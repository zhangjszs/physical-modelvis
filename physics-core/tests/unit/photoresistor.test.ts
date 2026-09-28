import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { PhotoresistorModel } from '../../src/models/photoresistor.js';

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

describe('F10: PhotoresistorModel', () => {
    const model = new PhotoresistorModel();
    it('metadata ok', () => {
        expect(model.modelType).toBe('photoresistor');
    });
    it('chart ok', () => {
        // sensitivity 单位为 1/lx (10⁻³ 量级) — 与 requiredParameters 声明一致
        const r = model.solve(
            makeProblem('photoresistor', {
                photoresistor: { lightIntensity: 10, darkResistance: 10000, sensitivity: 0.002 }
            })
        );
        expect(r.charts.x_t).toBeDefined();
    });
});

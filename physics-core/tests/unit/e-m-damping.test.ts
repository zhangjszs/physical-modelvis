import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { EMDampingModel } from '../../src/models/em-damping.js';

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

describe('F3: EMDampingModel', () => {
    const model = new EMDampingModel();
    it('metadata ok', () => {
        expect(model.modelType).toBe('em-damping');
    });
    it('chart ok', () => {
        const r = model.solve(
            makeProblem('em-damping', {
                emDamping: { mode: 'damping', magneticField: 0.5, angularSpeed: 100, conductivity: 1e6, inertia: 0.01 }
            })
        );
        expect(r.charts.angular_velocity_vs_time).toBeDefined();
    });
});

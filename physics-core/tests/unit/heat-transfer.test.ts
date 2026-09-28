import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { HeatTransferModel } from '../../src/models/heat-transfer.js';

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

describe('G14: HeatTransfer', () => {
    const m = new HeatTransferModel();
    it('meta', () => {
        expect(m.modelType).toBe('heat-transfer');
    });
    it('chart', () => {
        expect(
            m.solve(makeProblem('heat-transfer', { heatTransfer: { mode: 'conduction', temperatureDiff: 100 } })).charts
                .x_t
        ).toBeDefined();
    });
});

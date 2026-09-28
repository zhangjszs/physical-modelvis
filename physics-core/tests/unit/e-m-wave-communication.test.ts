import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { EMWaveCommunicationModel } from '../../src/models/em-wave-communication.js';

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

describe('F6: EMWaveCommunicationModel', () => {
    const model = new EMWaveCommunicationModel();
    it('metadata ok', () => {
        expect(model.modelType).toBe('em-wave-communication');
    });
    it('AM chart', () => {
        const r = model.solve(
            makeProblem('em-wave-communication', {
                emWaveComm: { carrierFreq: 1e6, modulationType: 'AM', audioFreq: 1e3 }
            })
        );
        expect(r.charts.wave_t).toBeDefined();
        expect(r.charts.envelope_t).toBeDefined();
    });
});

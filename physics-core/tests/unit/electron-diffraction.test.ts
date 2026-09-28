import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { ElectronDiffractionModel } from '../../src/models/electron-diffraction.js';

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

describe('G20: ElectronDiffraction', () => {
    const m = new ElectronDiffractionModel();
    it('meta', () => {
        expect(m.modelType).toBe('electron-diffraction');
    });
    it('chart', () => {
        expect(
            m.solve(
                makeProblem('electron-diffraction', {
                    electronDiffraction: { accVoltage: 10000, crystalLattice: 0.213 }
                })
            ).charts.x_t
        ).toBeDefined();
    });
});

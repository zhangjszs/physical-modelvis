import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { DopplerModel } from '../../src/models/doppler.js';

function makeBody(id = 'b1', mass = 1) {
    return {
        id,
        mass: { value: mass, unit: 'kg' as const },
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 }
    };
}
function makeProblemPartial(
    modelType: string,
    constraints: Record<string, unknown>,
    bodies: ReturnType<typeof makeBody>[] = [makeBody()]
): PhysicsProblem {
    return {
        id: 'test-' + modelType,
        model: modelType as PhysicsProblem['model'],
        bodies,
        constraints: constraints as PhysicsProblem['constraints'],
        timeConfig: { duration: 5, sampleCount: 100 },
        environment: {}
    };
}

describe('E8: DopplerModel', () => {
    const model = new DopplerModel();
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('doppler');
        expect(model.name).toContain('多普勒');
    });
    it('朝向运动 → f_prime > f', () => {
        const r = model.solve(
            makeProblemPartial('doppler', {
                doppler: { soundSpeed: 340, sourceFreq: 1000, sourceSpeed: 30, directionAngle: 0 }
            })
        );
        expect(r.diagnostics.flags?.isApproaching).toBe(true);
        expect(r.diagnostics.maxValues.fObserved).toBeGreaterThan(1000);
    });
    it('远离运动 → f_prime < f', () => {
        const r = model.solve(
            makeProblemPartial('doppler', {
                doppler: { soundSpeed: 340, sourceFreq: 1000, sourceSpeed: 30, directionAngle: 180 }
            })
        );
        expect(r.diagnostics.flags?.isReceding).toBe(true);
        expect(r.diagnostics.maxValues.fObserved).toBeLessThan(1000);
    });
    it('拍频计算', () => {
        const r = model.solve(
            makeProblemPartial('doppler', {
                doppler: { soundSpeed: 340, sourceFreq: 1000, sourceSpeed: 30, directionAngle: 0 }
            })
        );
        expect(r.diagnostics.maxValues.fBeat).toBeGreaterThan(0);
    });
    it('近声速警告', () => {
        const r = model.solve(
            makeProblemPartial('doppler', {
                doppler: { soundSpeed: 340, sourceFreq: 1000, sourceSpeed: 300, directionAngle: 0 }
            })
        );
        expect(r.warnings.length).toBeGreaterThan(0);
    });
});

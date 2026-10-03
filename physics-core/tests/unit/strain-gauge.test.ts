import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { StrainGaugeModel } from '../../src/models/strain-gauge.js';

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

describe('F12: StrainGaugeModel', () => {
    const model = new StrainGaugeModel();
    it('metadata ok', () => {
        expect(model.modelType).toBe('strain-gauge');
    });
    it('result ok', () => {
        const r = model.solve(
            makeProblem('strain-gauge', { strainGauge: { strain: 100e-6, gaugeFactor: 2, bridgeVoltage: 5 } })
        );
        expect(r.explanation.summary).toBeTruthy();
    });
    it('NaN 参数 → validate 拒绝 (NON_FINITE_PARAMETER, #85 守卫恢复)', () => {
        const v = model.validate(
            makeProblem('strain-gauge', { strainGauge: { strain: NaN, gaugeFactor: 2, bridgeVoltage: 5 } })
        );
        expect(v.valid).toBe(false);
        expect(v.errors.some(e => e.code === 'NON_FINITE_PARAMETER')).toBe(true);
    });
});

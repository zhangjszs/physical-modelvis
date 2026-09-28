import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { DiffractionGratingModel } from '../../src/models/diffraction-grating.js';

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

describe('E12: DiffractionGratingModel', () => {
    const model = new DiffractionGratingModel();
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('diffraction-grating');
        expect(model.name).toContain('光栅');
    });
    it('光栅方程: k_max = floor(d/lambda)', () => {
        // d=2um, lambda=500nm => d/lambda=4 => k_max=4
        const r = model.solve(
            makeProblemPartial('diffraction-grating', {
                diffractionGrating: {
                    gratingConstant: 2,
                    slitWidth: 0.5,
                    wavelength: 500,
                    orderMax: 10,
                    slitCount: 1000
                }
            })
        );
        const kMax = r.diagnostics.maxValues.orderMax as number;
        expect(kMax).toBeLessThanOrEqual(4);
    });
    it('缺级检测: d/a=2 => k=2,4,6 缺级', () => {
        const r = model.solve(
            makeProblemPartial('diffraction-grating', {
                diffractionGrating: { gratingConstant: 2, slitWidth: 1, wavelength: 500, orderMax: 5, slitCount: 1000 }
            })
        );
        expect(r.diagnostics.flags?.hasMissingOrders).toBe(true);
        expect(r.diagnostics.maxValues.missingOrderCount).toBeGreaterThan(0);
    });
    it('衍射图生成', () => {
        const r = model.solve(
            makeProblemPartial('diffraction-grating', {
                diffractionGrating: { gratingConstant: 2, slitWidth: 1, wavelength: 500, orderMax: 3, slitCount: 1000 }
            })
        );
        expect(r.charts.grating_intensity!.points.length).toBeGreaterThan(200);
    });
    it('角色散大于 0', () => {
        const r = model.solve(
            makeProblemPartial('diffraction-grating', {
                diffractionGrating: { gratingConstant: 3, slitWidth: 1, wavelength: 500, orderMax: 2, slitCount: 1000 }
            })
        );
        expect(r.explanation.summary).toContain('d=');
    });
});

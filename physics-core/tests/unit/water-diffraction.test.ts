import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { WaterDiffractionModel } from '../../src/models/water-diffraction.js';

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

describe('E6: WaterDiffractionModel', () => {
    const model = new WaterDiffractionModel();
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('water-diffraction');
    });
    it('a/lambda<1 => strong', () => {
        const r = model.solve(
            makeProblemPartial('water-diffraction', {
                waterDiffraction: { wavelength: 10, slitWidth: 5, screenDist: 50, waveAmplitude: 1 }
            })
        );
        expect(r.diagnostics.flags?.isStrong).toBe(true);
        expect(r.diagnostics.maxValues.ratio).toBeCloseTo(0.5, 1);
    });
    it('a/lambda >> 1 => negligible', () => {
        const r = model.solve(
            makeProblemPartial('water-diffraction', {
                waterDiffraction: { wavelength: 2, slitWidth: 50, screenDist: 50, waveAmplitude: 1 }
            })
        );
        expect(r.diagnostics.flags?.isNegligible).toBe(true);
    });
    it('integration_curve 图正确生成', () => {
        const r = model.solve(
            makeProblemPartial('water-diffraction', {
                waterDiffraction: { wavelength: 10, slitWidth: 20, screenDist: 50, waveAmplitude: 1 }
            })
        );
        expect(r.charts.intensity_angle!.points.length).toBeGreaterThan(100);
    });
    it('中央主极大宽度计算', () => {
        const r = model.solve(
            makeProblemPartial('water-diffraction', {
                waterDiffraction: { wavelength: 5, slitWidth: 10, screenDist: 50, waveAmplitude: 1 }
            })
        );
        const halfW = r.diagnostics.maxValues.halfWidthAngle as number;
        expect(halfW).toBeGreaterThan(0);
        expect(halfW).toBeLessThan(90);
    });
});

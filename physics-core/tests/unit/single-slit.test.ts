import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { SingleSlitModel } from '../../src/models/single-slit.js';

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

describe('E11: SingleSlitModel', () => {
    const model = new SingleSlitModel();
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('single-slit');
        expect(model.name).toContain('单缝');
    });
    it('中央主极大宽度公式: Delta_x = 2*lambda*L/a', () => {
        const lambdaNm = 500,
            aMm = 0.1,
            L = 1.0;
        const expectedWidth = ((2 * lambdaNm * 1e-9 * L) / (aMm * 1e-3)) * 1000; // mm
        const r = model.solve(
            makeProblemPartial('single-slit', {
                singleSlit: { slitWidth: aMm, wavelength: lambdaNm, screenDist: L }
            })
        );
        const width = r.diagnostics.maxValues.centralWidthMm as number;
        expect(width).toBeCloseTo(expectedWidth, 2);
    });
    it('极小位置 sin(theta)=lambda/a', () => {
        const r = model.solve(
            makeProblemPartial('single-slit', {
                singleSlit: { slitWidth: 0.1, wavelength: 500, screenDist: 1 }
            })
        );
        const sinT = r.diagnostics.maxValues.sinTheta1 as number;
        expect(sinT).toBeCloseTo(500e-9 / 0.1e-3, 5);
    });
    it('单缝衍射图生成', () => {
        const r = model.solve(
            makeProblemPartial('single-slit', {
                singleSlit: { slitWidth: 0.2, wavelength: 600, screenDist: 1 }
            })
        );
        expect(r.charts.intensity_angle!.points.length).toBeGreaterThan(200);
    });
    it('缝宽扫描图生成', () => {
        const r = model.solve(
            makeProblemPartial('single-slit', {
                singleSlit: { slitWidth: 0.1, wavelength: 500, screenDist: 1 }
            })
        );
        expect(r.charts.width_scan!.points.length).toBeGreaterThan(20);
    });
});

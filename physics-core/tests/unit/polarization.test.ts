import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { PolarizationModel } from '../../src/models/polarization.js';

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

describe('E13: PolarizationModel', () => {
    const model = new PolarizationModel();
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('polarization');
        expect(model.name).toContain('偏振');
    });
    it('马吕斯定律: theta=0 => I=I_0', () => {
        const r = model.solve(
            makeProblemPartial('polarization', {
                polarization: { initialIntensity: 1, nPolarizers: 1, polarizerAngles: [0] }
            })
        );
        expect(r.diagnostics.maxValues.Ifinal).toBeCloseTo(1, 5);
    });
    it('马吕斯定律: theta=90 => I=0 (消光)', () => {
        const r = model.solve(
            makeProblemPartial('polarization', {
                polarization: { initialIntensity: 1, nPolarizers: 1, polarizerAngles: [90] }
            })
        );
        expect(r.diagnostics.maxValues.Ifinal).toBeCloseTo(0, 5);
        expect(r.diagnostics.flags?.isExtinct).toBe(true);
    });
    it('马吕斯定律: theta=60 => I=I_0*cos^2(60)=I_0*0.25', () => {
        const r = model.solve(
            makeProblemPartial('polarization', {
                polarization: { initialIntensity: 1, nPolarizers: 1, polarizerAngles: [60] }
            })
        );
        expect(r.diagnostics.maxValues.Ifinal).toBeCloseTo(0.25, 3);
    });
    it('两偏振片 0/90 => I=0', () => {
        const r = model.solve(
            makeProblemPartial('polarization', {
                polarization: { initialIntensity: 1, nPolarizers: 2, polarizerAngles: [0, 90] }
            })
        );
        expect(r.diagnostics.maxValues.Ifinal).toBeCloseTo(0, 5);
    });
    it('三偏振片 0/45/90 => I>0 (0.25)', () => {
        const r = model.solve(
            makeProblemPartial('polarization', {
                polarization: { initialIntensity: 1, nPolarizers: 3, polarizerAngles: [0, 45, 90] }
            })
        );
        // After 1st: 1*cos^2(0)=1; after 2nd: 1*cos^2(45)=0.5; after 3rd: 0.5*cos^2(45)=0.25
        expect(r.diagnostics.maxValues.Ifinal).toBeCloseTo(0.25, 3);
    });
});

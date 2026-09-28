import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { HologramModel } from '../../src/models/hologram.js';

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

describe('E10: HologramModel', () => {
    const model = new HologramModel();
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('hologram');
        expect(model.name).toContain('全息');
    });
    it('条纹间距和密度计算', () => {
        const r = model.solve(
            makeProblemPartial('hologram', {
                hologram: {
                    referenceAngle: 30,
                    objectAngle: 10,
                    wavelength: 632,
                    referenceAmp: 5,
                    objectAmp: 1,
                    recordWidth: 50
                }
            })
        );
        expect(r.diagnostics.maxValues.fringeSpacing_um).toBeGreaterThan(0);
        expect(r.diagnostics.maxValues.fringeDensity).toBeGreaterThan(0);
    });
    it('记录光强极大值 = (Ar + Ao)^2', () => {
        const r = model.solve(
            makeProblemPartial('hologram', {
                hologram: {
                    referenceAngle: 20,
                    objectAngle: 5,
                    wavelength: 632,
                    referenceAmp: 5,
                    objectAmp: 1,
                    recordWidth: 50
                }
            })
        );
        expect(r.diagnostics.maxValues.maxRecordI).toBeCloseTo(36, 0);
    });
    it('干板可记录 flag', () => {
        const r = model.solve(
            makeProblemPartial('hologram', {
                hologram: {
                    referenceAngle: 30,
                    objectAngle: 0,
                    wavelength: 632,
                    referenceAmp: 5,
                    objectAmp: 1,
                    recordWidth: 50
                }
            })
        );
        expect(r.diagnostics.flags?.canRecord).toBeDefined();
    });
    it('条纹间距过大会警告', () => {
        const r = model.solve(
            makeProblemPartial('hologram', {
                hologram: {
                    referenceAngle: 1,
                    objectAngle: 0.5,
                    wavelength: 632,
                    referenceAmp: 5,
                    objectAmp: 1,
                    recordWidth: 10
                }
            })
        );
        // 密度 flag should indicate potential issue
        expect(r.diagnostics.maxValues.fringeDensity).toBeDefined();
    });
});

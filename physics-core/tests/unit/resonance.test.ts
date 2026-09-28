import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { ResonanceModel } from '../../src/models/resonance.js';

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

describe('E4: ResonanceModel', () => {
    const model = new ResonanceModel();
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('resonance');
        expect(model.name).toContain('共振');
    });
    it('基本共振曲线生成', () => {
        const r = model.solve(
            makeProblemPartial('resonance', {
                resonance: {
                    mass: 1,
                    springConstant: 100,
                    forceAmplitude: 5,
                    dampingBetas: [0.1, 0.3],
                    freqMin: 0.1,
                    freqMax: 5
                }
            })
        );
        expect(r.charts.A_f_drive!.points.length).toBeGreaterThan(50);
        expect(r.diagnostics.maxValues.Q).toBeGreaterThan(0);
    });
    it('阻尼越小 Q 越大', () => {
        const r1 = model.solve(
            makeProblemPartial('resonance', {
                resonance: {
                    mass: 1,
                    springConstant: 100,
                    forceAmplitude: 5,
                    dampingBetas: [0.05],
                    freqMin: 0.1,
                    freqMax: 5
                }
            })
        );
        const r2 = model.solve(
            makeProblemPartial('resonance', {
                resonance: {
                    mass: 1,
                    springConstant: 100,
                    forceAmplitude: 5,
                    dampingBetas: [0.5],
                    freqMin: 0.1,
                    freqMax: 5
                }
            })
        );
        const Q1 = r1.diagnostics.maxValues.Q as number;
        const Q2 = r2.diagnostics.maxValues.Q as number;
        expect(Q1).toBeGreaterThan(Q2);
    });
    it('峰值位置正数', () => {
        const r = model.solve(
            makeProblemPartial('resonance', {
                resonance: {
                    mass: 1,
                    springConstant: 100,
                    forceAmplitude: 5,
                    dampingBetas: [0.2],
                    freqMin: 0.1,
                    freqMax: 5
                }
            })
        );
        const peakF = r.diagnostics.maxValues.peakF as number;
        const peakA = r.diagnostics.maxValues.peakA as number;
        expect(peakF).toBeGreaterThan(0);
        expect(peakA).toBeGreaterThan(0);
    });
    it('多阻尼曲线 flag', () => {
        const r = model.solve(
            makeProblemPartial('resonance', {
                resonance: {
                    mass: 1,
                    springConstant: 100,
                    forceAmplitude: 5,
                    dampingBetas: [0.1, 0.3, 0.5],
                    freqMin: 0.1,
                    freqMax: 5
                }
            })
        );
        expect(r.diagnostics.flags?.hasMultipleDamping).toBe(true);
    });
});

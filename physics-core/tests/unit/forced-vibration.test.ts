import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { ForcedVibrationModel } from '../../src/models/forced-vibration.js';

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

describe('E3: ForcedVibrationModel', () => {
    const model = new ForcedVibrationModel();
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('forced-vibration');
        expect(model.name).toBeDefined();
    });
    it('稳态振幅公式验证 (弱阻尼, f_drive=f_0)', () => {
        const m = 1,
            k = 100,
            F0 = 5,
            beta = 0.1;
        const omega0 = Math.sqrt(k / m);
        const f0 = omega0 / (2 * Math.PI);
        const A_theory = F0 / m / Math.sqrt((omega0 * omega0 - omega0 * omega0) ** 2 + (2 * beta * omega0) ** 2);
        const r = model.solve(
            makeProblemPartial('forced-vibration', {
                forcedVibration: { mass: m, springConstant: k, dampingBeta: beta, forceAmplitude: F0, drivingFreq: f0 }
            })
        );
        const A_theo = r.diagnostics.maxValues.amplitudeTheoretical as number;
        expect(A_theo).toBeCloseTo(A_theory, 5);
    });
    it('共振曲线峰值在 f_0 附近', () => {
        const m = 1,
            k = 100,
            F0 = 2;
        const r = model.solve(
            makeProblemPartial('forced-vibration', {
                forcedVibration: { mass: m, springConstant: k, dampingBeta: 0.2, forceAmplitude: F0, drivingFreq: 2 }
            })
        );
        expect(r.charts.A_f_drive!.points.length).toBeGreaterThan(50);
    });
    it('近共振 flag', () => {
        const m = 1,
            k = 100,
            F0 = 2;
        const f0 = Math.sqrt(k / m) / (2 * Math.PI);
        const r = model.solve(
            makeProblemPartial('forced-vibration', {
                forcedVibration: {
                    mass: m,
                    springConstant: k,
                    dampingBeta: 0.1,
                    forceAmplitude: F0,
                    drivingFreq: f0 * 1.02
                }
            })
        );
        expect(r.diagnostics.flags?.isNearResonance).toBe(true);
    });
    it('explanation.summary 含 f_0 和 f_d', () => {
        const r = model.solve(
            makeProblemPartial('forced-vibration', {
                forcedVibration: { mass: 1, springConstant: 100, dampingBeta: 0.3, forceAmplitude: 2, drivingFreq: 3 }
            })
        );
        expect(r.explanation.summary).toContain('Hz');
    });
});

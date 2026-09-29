import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { AlphaScatteringModel } from '../../src/models/alpha-scattering.js';

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

describe('G18: AlphaScattering', () => {
    const m = new AlphaScatteringModel();
    it('meta', () => {
        expect(m.modelType).toBe('alpha-scattering');
    });
    it('chart', () => {
        expect(
            m.solve(
                makeProblem('alpha-scattering', {
                    alphaScattering: { alphaEnergy: 5, targetZ: 79, foilThickness: 1e-6 }
                })
            ).charts.x_t
        ).toBeDefined();
    });
    it('deterministic: 同输入两次求解深相等 (#36)', () => {
        const params = { alphaScattering: { alphaEnergy: 5, targetZ: 79, foilThickness: 1e-6 } };
        const r1 = m.solve(makeProblem('alpha-scattering', params));
        const r2 = m.solve(makeProblem('alpha-scattering', params));
        expect(r1.trajectories).toEqual(r2.trajectories);
        expect(r1.charts).toEqual(r2.charts);
    });
    it('seeded: 不同 Z 直方图不同，且总数 = n (#36)', () => {
        const run = (z: number) =>
            m.solve(makeProblem('alpha-scattering', { alphaScattering: { alphaEnergy: 5, targetZ: z } }));
        const a = run(79);
        const b = run(13);
        const sum = (r: ReturnType<typeof m.solve>) =>
            (r.charts.x_t as { points: Array<{ y: number }> }).points.reduce((s, p) => s + p.y, 0);
        expect(sum(a)).toBe(100);
        expect(sum(b)).toBe(100);
        expect(a.charts).not.toEqual(b.charts);
    });
    it('range: 散射角 ∈ (0, π)，轨迹 t 单调 (#36)', () => {
        const r = m.solve(makeProblem('alpha-scattering', { alphaScattering: { alphaEnergy: 5, targetZ: 79 } }));
        for (const track of r.trajectories) {
            expect(track.length).toBeGreaterThan(0);
            for (let i = 1; i < track.length; i++) {
                expect(track[i]!.t).toBeGreaterThanOrEqual(track[i - 1]!.t);
            }
        }
        const hist = (r.charts.x_t as { points: Array<{ x: number; y: number }> }).points;
        expect(hist).toHaveLength(18);
        expect(hist[0]!.x).toBe(10);
        expect(hist[17]!.x).toBe(180);
    });
});

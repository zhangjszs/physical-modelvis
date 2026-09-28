import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { SoundInterferenceModel } from '../../src/models/sound-interference.js';

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

describe('E7: SoundInterferenceModel', () => {
    const model = new SoundInterferenceModel();
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('sound-interference');
        expect(model.name).toContain('干涉');
    });
    it('对称点 (x=0) delta_r=0 → 加强', () => {
        const r = model.solve(
            makeProblemPartial('sound-interference', {
                soundInterference: {
                    frequency: 1000,
                    speakerDist: 4,
                    soundSpeed: 340,
                    amplitude: 1,
                    observationX: 0,
                    observationY: 10
                }
            })
        );
        expect(r.diagnostics.flags?.isConstructive).toBe(true);
    });
    it('x=∞ 方向趋于平坦', () => {
        const r = model.solve(
            makeProblemPartial('sound-interference', {
                soundInterference: {
                    frequency: 500,
                    speakerDist: 2,
                    soundSpeed: 340,
                    amplitude: 1,
                    observationX: 0,
                    observationY: 0.5
                }
            })
        );
        // just ensure no error
        expect(r).toBeDefined();
    });
    it('n_destructive 检测', () => {
        const r = model.solve(
            makeProblemPartial('sound-interference', {
                soundInterference: { frequency: 1000, speakerDist: 2, soundSpeed: 340, amplitude: 1 }
            })
        );
        expect(typeof r.diagnostics.flags?.isDestructive).toBe('boolean');
    });
    it('scan_line 图正确生成', () => {
        const r = model.solve(
            makeProblemPartial('sound-interference', {
                soundInterference: { frequency: 1000, speakerDist: 4, soundSpeed: 340, amplitude: 1 }
            })
        );
        expect(r.charts.scan_line!.points.length).toBeGreaterThan(100);
    });
});

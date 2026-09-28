import { describe, it, expect } from 'vitest';
import type { PhysicsProblem } from '../../src/types/problem.js';
import { SoundWaveformModel } from '../../src/models/sound-waveform.js';

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

describe('E5: SoundWaveformModel', () => {
    const model = new SoundWaveformModel();
    it('模型元数据正确', () => {
        expect(model.modelType).toBe('sound-waveform');
    });
    it('纯音: 峰值=A', () => {
        const r = model.solve(
            makeProblemPartial('sound-waveform', {
                soundWaveform: { frequency: 441, amplitude: 0.8, waveType: 'pure' }
            })
        );
        const maxDisp = r.diagnostics.maxValues.maxDisp as number;
        expect(maxDisp).toBeCloseTo(0.8, 1);
    });
    it('噪声: 最大振幅 <= A', () => {
        const r = model.solve(
            makeProblemPartial('sound-waveform', {
                soundWaveform: { frequency: 440, amplitude: 0.5, waveType: 'noise' }
            })
        );
        const maxDisp = r.diagnostics.maxValues.maxDisp as number;
        expect(maxDisp).toBeLessThanOrEqual(0.5 + 1e-6);
    });
    it('复合音生成成功', () => {
        const r = model.solve(
            makeProblemPartial('sound-waveform', {
                soundWaveform: { frequency: 200, amplitude: 0.7, waveType: 'complex', harmonics: [0.5, 0.3] }
            })
        );
        expect(r.diagnostics.maxValues.harmonicCount).toBe(2);
    });
    it('超高频警告', () => {
        const r = model.solve(
            makeProblemPartial('sound-waveform', {
                soundWaveform: { frequency: 25000, amplitude: 0.5, waveType: 'pure' }
            })
        );
        expect(r.warnings.length).toBeGreaterThan(0);
    });
    it('波形数据点正确', () => {
        const r = model.solve(
            makeProblemPartial('sound-waveform', {
                soundWaveform: { frequency: 1000, amplitude: 1, waveType: 'pure' }
            })
        );
        expect(r.charts.waveform_t!.points.length).toBeGreaterThan(50);
    });
});

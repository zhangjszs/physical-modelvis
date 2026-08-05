import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const sound_waveformScene: SceneConfig = {
    id: 'sound-waveform',
    name: '声音波形 (纯音+复合)',
    model: 'sound-waveform' as const,
    parameters: [
        {
            name: 'frequency',
            label: '基频 f',
            unit: 'Hz',
            value: 440,
            min: 20,
            max: 5000,
            step: 10,
            default: 440,
            description: '声波基频 (A4 = 440 Hz)'
        },
        {
            name: 'amplitude',
            label: '振幅 A',
            unit: '',
            value: 0.8,
            min: 0,
            max: 1,
            step: 0.05,
            default: 0.8,
            description: '振动幅度相对值 (0-1)'
        },
        {
            name: 'waveType',
            label: '波形 (0=纯音 1=复合 2=噪声)',
            unit: '',
            value: 0,
            min: 0,
            max: 2,
            step: 1,
            default: 0,
            description: '0=纯音 (正弦); 1=复合音 (基频+谐波); 2=噪声'
        },
        {
            name: 'harmonic1',
            label: '2 倍频振幅',
            unit: '',
            value: 0.3,
            min: 0,
            max: 1,
            step: 0.05,
            default: 0.3,
            description: '二次谐波相对振幅 (仅复合音模式有效)'
        },
        {
            name: 'harmonic2',
            label: '3 倍频振幅',
            unit: '',
            value: 0.2,
            min: 0,
            max: 1,
            step: 0.05,
            default: 0.2,
            description: '三次谐波相对振幅 (仅复合音模式有效)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 0.05,
            min: 0.001,
            max: 0.5,
            step: 0.001,
            default: 0.05,
            description: '仿真总时长 (建议取 5-10 个基频周期)'
        }
    ],
    buildProblem: params => {
        const frequency = params['frequency'] ?? 440;
        const amplitude = params['amplitude'] ?? 0.8;
        const waveTypeIdx = params['waveType'] ?? 0;
        const waveTypes = ['pure', 'complex', 'noise'] as const;
        const waveType = waveTypes[waveTypeIdx] ?? 'pure';
        const h1 = params['harmonic1'] ?? 0.3;
        const h2 = params['harmonic2'] ?? 0.2;
        const harmonics = waveType === 'complex' ? [h1, h2] : [];
        const duration = params['duration'] ?? 0.05;
        return {
            id: `sw-${Date.now()}`,
            title: '声音波形 (纯音+复合)',
            model: 'sound-waveform',
            bodies: [
                {
                    id: 'medium',
                    mass: { value: 0.1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                soundWaveform: { frequency, amplitude, waveType, harmonics }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 500)
        };
    }
};

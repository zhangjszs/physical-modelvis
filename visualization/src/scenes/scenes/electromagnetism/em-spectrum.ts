import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const em_spectrumScene: SceneConfig = {
    id: 'em-spectrum',
    name: '电磁波谱 (频段分布)',
    model: 'em-spectrum' as const,
    parameters: [
        {
            name: 'freqMinExp',
            label: '频率下限 (10^n)',
            unit: '',
            value: 1,
            min: 0,
            max: 15,
            step: 1,
            default: 1,
            description: '频率下限: 10^{n} Hz (n=1 → 10 Hz)'
        },
        {
            name: 'freqMaxExp',
            label: '频率上限 (10^n)',
            unit: '',
            value: 16,
            min: 3,
            max: 22,
            step: 1,
            default: 16,
            description: '频率上限: 10^{n} Hz (n=16 → 10 PHz)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 1,
            min: 0.1,
            max: 5,
            step: 0.1,
            default: 1,
            description: '静态场景, 仅决定图表显示刷新'
        }
    ],
    buildProblem: params => {
        const freqMin = Math.pow(10, params['freqMinExp'] ?? 1);
        const freqMax = Math.pow(10, params['freqMaxExp'] ?? 16);
        const duration = params['duration'] ?? 1;
        return {
            id: `emSpec-${Date.now()}`,
            title: '电磁波谱 (频段分布)',
            model: 'em-spectrum',
            bodies: [
                { id: 'probe', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                emSpectrum: { freqMin, freqMax, highlightBand: 'visible' }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 400, duration / 100)
        };
    }
};

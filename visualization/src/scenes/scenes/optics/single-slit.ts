import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const single_slitScene: SceneConfig = {
    id: 'single-slit',
    name: '单缝衍射 (光强分布)',
    model: 'single-slit' as const,
    parameters: [
        {
            name: 'slitWidth',
            label: '缝宽 a',
            unit: 'mm',
            value: 0.1,
            min: 0.005,
            max: 1,
            step: 0.005,
            default: 0.1,
            description: '单缝宽度 (建议 0.05-0.5 mm 以获得明显衍射图样)'
        },
        {
            name: 'wavelength',
            label: '波长 λ',
            unit: 'nm',
            value: 550,
            min: 380,
            max: 780,
            step: 5,
            default: 550,
            description: '入射单色光波长'
        },
        {
            name: 'screenDist',
            label: '缝-屏距离 L',
            unit: 'm',
            value: 1.5,
            min: 0.1,
            max: 10,
            step: 0.1,
            default: 1.5,
            description: '单缝到观察屏的距离'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 1,
            min: 0.5,
            max: 5,
            step: 0.1,
            default: 1,
            description: '静态场景 (仅显示衍射图样)'
        }
    ],
    buildProblem: params => {
        const slitWidth = params['slitWidth'] ?? 0.1;
        const wavelength = params['wavelength'] ?? 550;
        const screenDist = params['screenDist'] ?? 1.5;
        const duration = params['duration'] ?? 1;
        return {
            id: `ss-${Date.now()}`,
            title: '单缝衍射 (光强分布)',
            model: 'single-slit',
            bodies: [
                { id: 'photon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                singleSlit: { slitWidth, wavelength, screenDist }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};

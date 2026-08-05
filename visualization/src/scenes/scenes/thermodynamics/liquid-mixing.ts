import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const liquid_mixingScene: SceneConfig = {
    id: 'liquid-mixing',
    name: '液体混合 (扩散)',
    model: 'liquid-mixing',
    parameters: [
        {
            name: 'volumeWater',
            label: '水的体积 V_w',
            unit: 'mL',
            value: 50,
            min: 0,
            max: 200,
            step: 5,
            default: 50,
            description: '水的体积'
        },
        {
            name: 'volumeAlcohol',
            label: '酒精体积 V_a',
            unit: 'mL',
            value: 50,
            min: 0,
            max: 200,
            step: 5,
            default: 50,
            description: '无水酒精体积'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 3,
            min: 0.5,
            max: 10,
            step: 0.5,
            default: 3,
            description: '图形展示时长'
        }
    ],
    buildProblem: params => {
        const volumeWater = params['volumeWater'] ?? 50;
        const volumeAlcohol = params['volumeAlcohol'] ?? 50;
        const duration = params['duration'] ?? 3;
        return {
            id: `liquid-mix-${Date.now()}`,
            title: '液体混合 (扩散)',
            model: 'liquid-mixing',
            bodies: [{ id: 'mix', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
            constraints: {
                liquidMixing: { volumeWater, volumeAlcohol }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 50)
        };
    }
};

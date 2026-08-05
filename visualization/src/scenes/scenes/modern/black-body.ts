import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const black_bodyScene: SceneConfig = {
    id: 'black-body',
    name: '黑体辐射',
    model: 'black-body' as const,
    parameters: [
        {
            name: 'temperature',
            label: '黑体温度',
            unit: 'K',
            value: 3000,
            min: 300,
            max: 10000,
            step: 100,
            default: 3000,
            description: '黑体绝对温度'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 5,
            min: 2,
            max: 10,
            step: 0.5,
            default: 5,
            description: '仿真总时长'
        }
    ],
    buildProblem: params => {
        const temperature = params['temperature'] ?? 3000;
        const duration = params['duration'] ?? 5;
        return {
            id: `black-body-${Date.now()}`,
            title: '黑体辐射',
            model: 'black-body' as const,
            bodies: [
                { id: 'photon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: { blackBody: { temperature } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};

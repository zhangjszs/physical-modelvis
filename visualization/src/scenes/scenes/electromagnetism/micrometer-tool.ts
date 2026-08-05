import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const micrometer_toolScene: SceneConfig = {
    id: 'micrometer-tool',
    name: '螺旋测微器读数',
    model: 'micrometer' as const,
    parameters: [
        {
            name: 'thickness',
            label: '被测物体厚度',
            unit: 'mm',
            value: 5.75,
            min: 0.01,
            max: 25,
            step: 0.01,
            default: 5.75,
            description: '被测物体厚度 (L = a + b + n×0.01 mm)'
        },
        {
            name: 'duration',
            label: '动画时长',
            unit: 's',
            value: 3,
            min: 0.5,
            max: 10,
            step: 0.5,
            default: 3,
            description: '动画播放时长'
        }
    ],
    buildProblem: params => {
        const thickness = params['thickness'] ?? 5.75;
        const duration = params['duration'] ?? 3;
        return {
            id: `micrometer-tool-${Date.now()}`,
            title: '螺旋测微器读数',
            model: 'micrometer' as const,
            bodies: [],
            constraints: { micrometer: { thickness } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 60)
        };
    }
};

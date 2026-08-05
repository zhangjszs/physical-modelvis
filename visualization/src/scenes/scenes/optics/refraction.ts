import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const refractionScene: SceneConfig = {
    id: 'refraction',
    name: '光的折射定律 (Snell)',
    model: 'refraction',
    parameters: [
        {
            name: 'n1',
            label: '介质 1 折射率 n₁',
            unit: '',
            value: 1.0,
            min: 1.0,
            max: 2.5,
            step: 0.01,
            default: 1.0,
            description: '光疏介质 (空气=1.00, 水=1.33, 玻璃=1.50, 金刚石=2.42)'
        },
        {
            name: 'n2',
            label: '介质 2 折射率 n₂',
            unit: '',
            value: 1.5,
            min: 1.0,
            max: 2.5,
            step: 0.01,
            default: 1.5,
            description: '光密介质'
        },
        {
            name: 'angle',
            label: '入射角 θ₁',
            unit: '°',
            value: 30,
            min: 0,
            max: 89,
            step: 1,
            default: 30,
            description: '入射光线与法线夹角'
        }
    ],
    buildProblem: params => {
        const n1 = params['n1'] ?? 1.0;
        const n2 = params['n2'] ?? 1.5;
        const angleDeg = params['angle'] ?? 30;
        return {
            id: `refraction-${Date.now()}`,
            title: '光的折射定律 (Snell 定律)',
            model: 'refraction',
            bodies: [
                { id: 'light', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: { refraction: { n1, n2, incidentAngleDeg: angleDeg } },
            environment: {},
            timeConfig: makeTimeSeries(1, 10, 0.1)
        };
    }
};

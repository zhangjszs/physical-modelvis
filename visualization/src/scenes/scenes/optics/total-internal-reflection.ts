import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const total_internal_reflectionScene: SceneConfig = {
    id: 'total-internal-reflection',
    name: '全反射与光导',
    model: 'refraction',
    parameters: [
        {
            name: 'n1',
            label: '介质1 折射率 n₁',
            unit: '',
            value: 1.5,
            min: 1.0,
            max: 2.5,
            step: 0.01,
            default: 1.5,
            description: '入射侧介质 (光密侧, 如玻璃 1.50)'
        },
        {
            name: 'n2',
            label: '介质2 折射率 n₂',
            unit: '',
            value: 1.0,
            min: 1.0,
            max: 2.5,
            step: 0.01,
            default: 1.0,
            description: '透射侧介质 (光疏侧, 如空气 1.00)'
        },
        {
            name: 'angle',
            label: '入射角 θ₁',
            unit: '°',
            value: 50,
            min: 0,
            max: 89,
            step: 1,
            default: 50,
            description: '入射光线与法线夹角'
        },
        {
            name: 'mode',
            label: '模式 (0折射 1全反射 2光导)',
            unit: '',
            value: 1,
            min: 0,
            max: 2,
            step: 1,
            default: 1,
            description: '0=普通折射; 1=全反射; 2=光导纤维'
        },
        {
            name: 'duration',
            label: '动画时长',
            unit: 's',
            value: 3,
            min: 1,
            max: 10,
            step: 0.5,
            default: 3,
            description: '动画播放时长'
        }
    ],
    buildProblem: params => {
        const n1 = params['n1'] ?? 1.5;
        const n2 = params['n2'] ?? 1.0;
        const angleDeg = params['angle'] ?? 50;
        const duration = params['duration'] ?? 3;
        return {
            id: `tir-${Date.now()}`,
            title: '全反射与光导',
            model: 'refraction' as const,
            bodies: [
                { id: 'light', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: { refraction: { n1, n2, incidentAngleDeg: angleDeg } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 10, 0.1)
        };
    }
};

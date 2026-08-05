import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const wettingScene: SceneConfig = {
    id: 'wetting',
    name: '润湿/不润湿 (接触角)',
    model: 'wetting',
    parameters: [
        {
            name: 'medium',
            label: '液体 (0=水 1=水银)',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 1,
            default: 0,
            description: '水/水银'
        },
        {
            name: 'surface',
            label: '固体 (0=玻璃 1=蜡面)',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 1,
            default: 0,
            description: '玻璃 θ 小 (亲水)；蜡面 θ 大 (疏水)'
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
            description: '接触角示意图展示时长'
        }
    ],
    buildProblem: params => {
        const medium = (params['medium'] ?? 0) === 1 ? ('mercury' as const) : ('water' as const);
        const surface = (params['surface'] ?? 0) === 1 ? ('wax' as const) : ('glass' as const);
        const duration = params['duration'] ?? 3;
        return {
            id: `wetting-${Date.now()}`,
            title: '润湿/不润湿 (接触角)',
            model: 'wetting',
            bodies: [
                { id: 'drop', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: { wetting: { liquidMode: medium, surfaceMode: surface } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 50)
        };
    }
};

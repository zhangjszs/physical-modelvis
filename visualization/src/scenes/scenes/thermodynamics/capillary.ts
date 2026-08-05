import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const capillaryScene: SceneConfig = {
    id: 'capillary',
    name: '毛细现象 (液面升降)',
    model: 'capillary',
    parameters: [
        {
            name: 'tubeRadius',
            label: '毛细管半径 r',
            unit: 'mm',
            value: 0.5,
            min: 0.01,
            max: 1.0,
            step: 0.01,
            default: 0.5,
            description: '毛细管半径 (越小毛细效应越显著)'
        },
        {
            name: 'medium',
            label: '液体 (0=水 1=水银)',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 1,
            default: 0,
            description: '水 (浸润, h>0 上升)；水银 (不浸润, h<0 下降)'
        },
        {
            name: 'material',
            label: '管壁材料 (0=玻璃 1=石蜡)',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 1,
            default: 0,
            description: '玻璃-水完全浸润 θ≈0°；石蜡-水不浸润 θ≈105°'
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
            description: '毛细高度展示时长'
        }
    ],
    buildProblem: params => {
        const tubeRadius = (params['tubeRadius'] ?? 0.5) * 1e-3;
        const medium = (params['medium'] ?? 0) === 1 ? ('mercury' as const) : ('water' as const);
        const material = (params['material'] ?? 0) === 1 ? ('paraffin' as const) : ('glass' as const);
        const duration = params['duration'] ?? 3;
        return {
            id: `capillary-${Date.now()}`,
            title: '毛细现象 (液面升降)',
            model: 'capillary',
            bodies: [
                {
                    id: 'meniscus',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: { capillary: { tubeRadius, liquidMode: medium, materialMode: material } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 50)
        };
    }
};

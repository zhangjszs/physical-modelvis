import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const springScene: SceneConfig = {
    id: 'spring',
    name: '弹簧振子',
    model: 'spring-oscillator',
    parameters: [
        {
            name: 'm',
            label: '质量 m',
            unit: 'kg',
            value: 1,
            min: 0.1,
            max: 100,
            step: 0.1,
            default: 1,
            description: '振子质量'
        },
        {
            name: 'k',
            label: '劲度系数 k',
            unit: 'N/m',
            value: 10,
            min: 0.1,
            max: 1000,
            step: 0.5,
            default: 10,
            description: '弹簧劲度系数'
        },
        {
            name: 'A',
            label: '振幅 A',
            unit: 'm',
            value: 0.5,
            min: 0.01,
            max: 10,
            step: 0.05,
            default: 0.5,
            description: '初始振幅（偏离平衡位置的距离）'
        },
        {
            name: 'damping',
            label: '阻尼系数',
            unit: '',
            value: 0,
            min: 0,
            max: 5,
            step: 0.05,
            default: 0,
            description: '0=无阻尼，越大阻尼越强'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 5,
            min: 0.5,
            max: 30,
            step: 0.5,
            default: 5,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const m = params['m'] ?? 1;
        const k = params['k'] ?? 10;
        const A = params['A'] ?? 0.5;
        const damping = params['damping'] ?? 0;
        const duration = params['duration'] ?? 5;
        return {
            id: `spring-${Date.now()}`,
            title: '弹簧振子',
            model: 'spring-oscillator',
            bodies: [
                {
                    id: 'block',
                    mass: { value: m, unit: 'kg' },
                    position: { x: A, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                spring: { springConstant: k, naturalLength: 0, anchorPoint: { x: 0, y: 0 } }
            },
            environment: damping > 0 ? { airResistance: { enabled: true, coefficient: damping } } : {},
            timeConfig: makeTimeSeries(duration, 1000, 0.001)
        };
    }
};

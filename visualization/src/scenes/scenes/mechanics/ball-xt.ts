import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const ball_xtScene: SceneConfig = {
    id: 'ball-xt',
    name: '小球 x-t 图像 (简谐运动)',
    model: 'simple-pendulum',
    parameters: [
        {
            name: 'length',
            label: '摆长 L',
            unit: 'm',
            value: 1.0,
            min: 0.2,
            max: 5,
            step: 0.05,
            default: 1.0,
            description: '摆线长度 (m)'
        },
        {
            name: 'angle',
            label: '初始摆角 θ₀',
            unit: '°',
            value: 15,
            min: 1,
            max: 80,
            step: 1,
            default: 15,
            description: '初始偏离竖直方向角度'
        },
        {
            name: 'mass',
            label: '摆球质量 m',
            unit: 'kg',
            value: 1,
            min: 0.1,
            max: 5,
            step: 0.1,
            default: 1,
            description: '摆球质量'
        },
        {
            name: 'g',
            label: '重力加速度 g',
            unit: 'm/s²',
            value: 9.8,
            min: 1,
            max: 30,
            step: 0.1,
            default: 9.8,
            description: '重力加速度'
        },
        {
            name: 'damping',
            label: '阻尼系数',
            unit: '',
            value: 0,
            min: 0,
            max: 2,
            step: 0.05,
            default: 0,
            description: '0=无阻尼'
        },
        {
            name: 'duration',
            label: '动画时长',
            unit: 's',
            value: 10,
            min: 1,
            max: 60,
            step: 1,
            default: 10,
            description: '动画播放时长'
        }
    ],
    buildProblem: params => {
        const L = params['length'] ?? 1.0;
        const angleDeg = params['angle'] ?? 15;
        const mass = params['mass'] ?? 1;
        const g = params['g'] ?? 9.8;
        const damping = params['damping'] ?? 0;
        const duration = params['duration'] ?? 10;
        return {
            id: `ball-xt-${Date.now()}`,
            title: '小球 x-t 图像',
            model: 'simple-pendulum' as const,
            bodies: [
                {
                    id: 'bob',
                    mass: { value: mass, unit: 'kg' },
                    position: {
                        x: L * Math.sin((angleDeg * Math.PI) / 180),
                        y: L * Math.cos((angleDeg * Math.PI) / 180)
                    },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: { simplePendulum: { length: L, g, initialAngleDeg: angleDeg, damping } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 1000)
        };
    }
};

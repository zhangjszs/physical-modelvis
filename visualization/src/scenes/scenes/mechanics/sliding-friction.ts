import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';
import { PHYSICS_CONSTANTS } from 'physics-core';

export const sliding_frictionScene: SceneConfig = {
    id: 'sliding-friction',
    name: '滑动摩擦力 f=μN',
    model: 'sliding-friction',
    parameters: [
        {
            name: 'mu',
            label: '动摩擦因数 μ',
            unit: '',
            value: 0.3,
            min: 0,
            max: 1.5,
            step: 0.01,
            default: 0.3,
            description: '动摩擦因数，由接触面材料和粗糙程度决定'
        },
        {
            name: 'mass',
            label: '物体质量 m',
            unit: 'kg',
            value: 1,
            min: 0.1,
            max: 10,
            step: 0.1,
            default: 1,
            description: '物体质量 (改变正压力 N=mg)'
        },
        {
            name: 'v0',
            label: '初速度 v₀',
            unit: 'm/s',
            value: 0.5,
            min: 0,
            max: 5,
            step: 0.1,
            default: 0.5,
            description: '物体初速度'
        },
        {
            name: 'uniformMotion',
            label: '运动模式 (1=匀速 0=加速)',
            unit: '',
            value: 1,
            min: 0,
            max: 1,
            step: 1,
            default: 1,
            description: '1=外力等于摩擦力做匀速运动；0=外力大于摩擦力做加速运动'
        },
        {
            name: 'g',
            label: '重力加速度 g',
            unit: 'm/s²',
            value: PHYSICS_CONSTANTS.g.value,
            min: 1,
            max: 20,
            step: 0.1,
            default: PHYSICS_CONSTANTS.g.value,
            description: '重力加速度'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 4,
            min: 0.5,
            max: 20,
            step: 0.5,
            default: 4,
            description: '仿真总时长'
        }
    ],
    buildProblem: params => {
        const mu = params['mu'] ?? 0.3;
        const mass = params['mass'] ?? 1;
        const v0 = params['v0'] ?? 0.5;
        const uniformMotion = (params['uniformMotion'] ?? 1) === 1;
        const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
        const duration = params['duration'] ?? 4;
        return {
            id: `sliding-friction-${Date.now()}`,
            title: '滑动摩擦力 (f=μN)',
            model: 'sliding-friction',
            bodies: [
                {
                    id: 'block',
                    mass: { value: mass, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: v0, y: 0 }
                }
            ],
            constraints: {
                slidingFriction: { frictionCoefficient: mu, uniformMotion }
            },
            environment: { gravity: { enabled: true, value: g } },
            timeConfig: makeTimeSeries(duration, 400)
        };
    }
};

import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';
import { PHYSICS_CONSTANTS } from 'physics-core';

export const uniform_acceleratedScene: SceneConfig = {
    id: 'uniform-accelerated',
    name: '自由落体(竖直)',
    model: 'uniform-accelerated',
    parameters: [
        {
            name: 'v0y',
            label: '竖直初速度 vy₀',
            unit: 'm/s',
            value: 0,
            min: -50,
            max: 50,
            step: 1,
            default: 0,
            description: '竖直方向初速度（向上为正）'
        },
        {
            name: 'g',
            label: '重力加速度 g',
            unit: 'm/s²',
            value: PHYSICS_CONSTANTS.g.value,
            min: 0.1,
            max: 30,
            step: 0.1,
            default: PHYSICS_CONSTANTS.g.value,
            description: '重力加速度大小'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 3,
            min: 0.5,
            max: 30,
            step: 0.5,
            default: 3,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const v0y = params['v0y'] ?? 0;
        const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
        const duration = params['duration'] ?? 3;
        return {
            id: `uniform-accel-${Date.now()}`,
            title: '自由落体(竖直)',
            model: 'uniform-accelerated',
            bodies: [
                {
                    id: 'object',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: v0y }
                }
            ],
            environment: {
                gravity: { enabled: true, value: g }
            },
            timeConfig: makeTimeSeries(duration, 1000, 0.01)
        };
    }
};

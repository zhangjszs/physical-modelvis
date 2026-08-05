import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';
import { PHYSICS_CONSTANTS } from 'physics-core';

export const free_fallScene: SceneConfig = {
    id: 'free-fall',
    name: '自由落体',
    model: 'uniform-accelerated',
    parameters: [
        {
            name: 'height',
            label: '初始高度 h',
            unit: 'm',
            value: 20,
            min: 1,
            max: 200,
            step: 1,
            default: 20,
            description: '物体开始下落的高度'
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
        const height = params['height'] ?? 20;
        const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
        const duration = params['duration'] ?? 3;
        return {
            id: `free-fall-${Date.now()}`,
            title: '自由落体',
            model: 'uniform-accelerated',
            bodies: [
                {
                    id: 'ball',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: height },
                    velocity: { x: 0, y: 0 }
                }
            ],
            environment: {
                gravity: { enabled: true, value: g }
            },
            timeConfig: makeTimeSeries(duration, 1000, 0.01)
        };
    }
};

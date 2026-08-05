import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';
import { PHYSICS_CONSTANTS } from 'physics-core';

export const reaction_timeScene: SceneConfig = {
    id: 'reaction-time',
    name: '测反应时间',
    model: 'reaction-time',
    parameters: [
        {
            name: 'distance',
            label: '尺子下落距离 h',
            unit: 'm',
            value: 0.2,
            min: 0.05,
            max: 0.5,
            step: 0.01,
            default: 0.2,
            description: '尺子被抓住时下落的位置 (读数越大=反应越慢)'
        },
        {
            name: 'gravity',
            label: '重力加速度 g',
            unit: 'm/s²',
            value: PHYSICS_CONSTANTS.g.value,
            min: 1,
            max: 20,
            step: 0.1,
            default: PHYSICS_CONSTANTS.g.value,
            description: '地球 g≈9.8, 月球 g≈1.6'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 1,
            min: 0.1,
            max: 3,
            step: 0.1,
            default: 1,
            description: '仿真的总时长 (覆盖反应时间)'
        }
    ],
    buildProblem: params => {
        const distance = params['distance'] ?? 0.2;
        const gravity = params['gravity'] ?? PHYSICS_CONSTANTS.g.value;
        const duration = params['duration'] ?? 1;
        const tReact = Math.sqrt((2 * distance) / gravity);
        return {
            id: `reaction-${Date.now()}`,
            title: '测反应时间',
            model: 'reaction-time',
            bodies: [
                {
                    id: 'ruler',
                    mass: { value: 0.1, unit: 'kg' },
                    position: { x: 0, y: distance },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: { reactionTime: { distance, gravity } },
            environment: { gravity: { enabled: true, value: gravity } },
            timeConfig: makeTimeSeries(Math.max(duration, tReact * 1.5), 1000, 0.001)
        };
    }
};

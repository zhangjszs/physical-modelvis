import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const newton_first_lawScene: SceneConfig = {
    id: 'newton-first-law',
    name: '牛顿第一定律 (惯性)',
    model: 'uniform-linear',
    parameters: [
        {
            name: 'v0',
            label: '初速度 v₀',
            unit: 'm/s',
            value: 2,
            min: -10,
            max: 10,
            step: 0.1,
            default: 2,
            description: '物体初速度 (不受外力时保持此速度匀速运动)'
        },
        {
            name: 'mass',
            label: '物体质量 m',
            unit: 'kg',
            value: 0.5,
            min: 0.1,
            max: 5,
            step: 0.1,
            default: 0.5,
            description: '物体质量 (仅展示，不影响匀速运动)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 5,
            min: 1,
            max: 20,
            step: 0.5,
            default: 5,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const v0 = params['v0'] ?? 2;
        const mass = params['mass'] ?? 0.5;
        const duration = params['duration'] ?? 5;
        return {
            id: `newton-first-law-${Date.now()}`,
            title: '牛顿第一定律 (惯性)',
            model: 'uniform-linear',
            bodies: [
                {
                    id: 'block',
                    mass: { value: mass, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: v0, y: 0 }
                }
            ],
            environment: {},
            timeConfig: makeTimeSeries(duration, 500)
        };
    }
};

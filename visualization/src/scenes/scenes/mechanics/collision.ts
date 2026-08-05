import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const collisionScene: SceneConfig = {
    id: 'collision',
    name: '碰撞',
    model: 'collision-elastic',
    parameters: [
        {
            name: 'm1',
            label: '物体1质量 m₁',
            unit: 'kg',
            value: 1,
            min: 0.1,
            max: 100,
            step: 0.1,
            default: 1,
            description: '第一个物体的质量'
        },
        {
            name: 'm2',
            label: '物体2质量 m₂',
            unit: 'kg',
            value: 1,
            min: 0.1,
            max: 100,
            step: 0.1,
            default: 1,
            description: '第二个物体的质量'
        },
        {
            name: 'v1',
            label: '物体1初速度 v₁',
            unit: 'm/s',
            value: 5,
            min: -100,
            max: 100,
            step: 0.5,
            default: 5,
            description: '第一个物体的初速度（正=向右）'
        },
        {
            name: 'v2',
            label: '物体2初速度 v₂',
            unit: 'm/s',
            value: 0,
            min: -100,
            max: 100,
            step: 0.5,
            default: 0,
            description: '第二个物体的初速度（正=向右）'
        },
        {
            name: 'e',
            label: '恢复系数 e',
            unit: '',
            value: 1,
            min: 0,
            max: 1,
            step: 0.01,
            default: 1,
            description: '1=弹性碰撞, 0=完全非弹性碰撞'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 3,
            min: 0.5,
            max: 20,
            step: 0.5,
            default: 3,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const m1 = params['m1'] ?? 1;
        const m2 = params['m2'] ?? 1;
        const v1 = params['v1'] ?? 5;
        const v2 = params['v2'] ?? 0;
        const e = params['e'] ?? 1;
        const duration = params['duration'] ?? 3;
        const model = e >= 0.99 ? ('collision-elastic' as const) : ('collision-inelastic' as const);
        return {
            id: `collision-${Date.now()}`,
            title: e >= 0.99 ? '弹性碰撞' : '非弹性碰撞',
            model,
            bodies: [
                {
                    id: 'body1',
                    mass: { value: m1, unit: 'kg' },
                    position: { x: -2, y: 0 },
                    velocity: { x: v1, y: 0 }
                },
                {
                    id: 'body2',
                    mass: { value: m2, unit: 'kg' },
                    position: { x: 2, y: 0 },
                    velocity: { x: v2, y: 0 }
                }
            ],
            constraints: e < 0.99 ? { collision: { restitution: e } } : {},
            environment: {},
            timeConfig: makeTimeSeries(duration, 1000, 0.001)
        };
    }
};

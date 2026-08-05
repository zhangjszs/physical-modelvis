import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const centrifugalScene: SceneConfig = {
    id: 'centrifugal',
    name: '离心现象',
    model: 'centrifugal',
    parameters: [
        {
            name: 'mass',
            label: '物块质量 m',
            unit: 'kg',
            value: 1,
            min: 0.1,
            max: 10,
            step: 0.1,
            default: 1,
            description: '放置在转盘上的物体质量'
        },
        {
            name: 'radius',
            label: '转动半径 r',
            unit: 'm',
            value: 0.3,
            min: 0.05,
            max: 1,
            step: 0.05,
            default: 0.3,
            description: '物块到转盘中心的距离'
        },
        {
            name: 'angularSpeed',
            label: '角速度 ω',
            unit: 'rad/s',
            value: 5,
            min: 1,
            max: 15,
            step: 0.5,
            default: 5,
            description: '转盘角速度'
        },
        {
            name: 'frictionCoeff',
            label: '摩擦系数 μ',
            unit: '',
            value: 0.5,
            min: 0,
            max: 1,
            step: 0.05,
            default: 0.5,
            description: '物块与转盘间的静摩擦系数'
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
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const mass = params['mass'] ?? 1;
        const radius = params['radius'] ?? 0.3;
        const angularSpeed = params['angularSpeed'] ?? 5;
        const frictionCoeff = params['frictionCoeff'] ?? 0.5;
        const duration = params['duration'] ?? 3;
        return {
            id: `cent-${Date.now()}`,
            title: '离心现象',
            model: 'centrifugal',
            bodies: [
                {
                    id: 'block',
                    mass: { value: mass, unit: 'kg' },
                    position: { x: radius, y: 0 },
                    velocity: { x: 0, y: angularSpeed * radius }
                }
            ],
            constraints: { centrifugal: { mass, radius, angularSpeed, frictionCoeff } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 200)
        };
    }
};

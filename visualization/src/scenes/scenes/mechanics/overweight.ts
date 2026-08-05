import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';
import { PHYSICS_CONSTANTS } from 'physics-core';

export const overweightScene: SceneConfig = {
    id: 'overweight',
    name: '超重与失重 (电梯台秤)',
    model: 'overweight',
    parameters: [
        {
            name: 'mode',
            label: '电梯运动阶段',
            unit: '',
            value: 0,
            min: 0,
            max: 3,
            step: 1,
            default: 0,
            description: '0=向上加速(超重) 1=向上减速(失重) 2=向下加速(失重) 3=向下减速(超重)'
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
            description: '放置在台秤上的物体质量'
        },
        {
            name: 'accMagnitude',
            label: '加速度大小 a',
            unit: 'm/s²',
            value: 2,
            min: 0.5,
            max: 9.8,
            step: 0.1,
            default: 2,
            description: '电梯的加速度大小 (a=g 时为完全失重 N=0)'
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
            description: '当地重力加速度'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 4,
            min: 1,
            max: 10,
            step: 0.5,
            default: 4,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const modeIdx = Math.round(params['mode'] ?? 0);
        const modes = ['upStart', 'upStop', 'downStart', 'downStop'] as const;
        const mode = modes[modeIdx] ?? 'upStart';
        const mass = params['mass'] ?? 1;
        const accMagnitude = params['accMagnitude'] ?? 2;
        const gravity = params['gravity'] ?? PHYSICS_CONSTANTS.g.value;
        const duration = params['duration'] ?? 4;
        return {
            id: `overweight-${Date.now()}`,
            title: '超重与失重',
            model: 'overweight',
            bodies: [
                {
                    id: 'object',
                    mass: { value: mass, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: { overweight: { mass, accMagnitude, mode, gravity } },
            environment: { gravity: { enabled: true, value: gravity } },
            timeConfig: makeTimeSeries(duration, 500)
        };
    }
};

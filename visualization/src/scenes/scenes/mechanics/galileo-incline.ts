import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';
import { PHYSICS_CONSTANTS } from 'physics-core';

export const galileo_inclineScene: SceneConfig = {
    id: 'galileo-incline',
    name: '伽利略斜面理想实验',
    model: 'galileo-incline',
    parameters: [
        {
            name: 'angleDeg',
            label: '斜面倾角 θ',
            unit: '°',
            value: 30,
            min: 5,
            max: 90,
            step: 1,
            default: 30,
            description: '斜面与水平面的夹角 (冲淡重力: θ↓→a↓→t↑)'
        },
        {
            name: 'inclineLength',
            label: '斜面长度 L',
            unit: 'm',
            value: 2,
            min: 0.5,
            max: 5,
            step: 0.1,
            default: 2,
            description: '斜面长度 (纸带可测量的运动距离)'
        },
        {
            name: 'mode',
            label: '演示模式',
            unit: '',
            value: 3,
            min: 0,
            max: 3,
            step: 1,
            default: 3,
            description: '0=单斜面 1=对接斜面 2=水平面外推 3=三段完整演示'
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
            description: '不同星球的重力加速度'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 5,
            min: 1,
            max: 15,
            step: 0.5,
            default: 5,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const angleDeg = params['angleDeg'] ?? 30;
        const inclineLength = params['inclineLength'] ?? 2;
        const modeIdx = Math.round(params['mode'] ?? 3);
        const modes = ['single', 'docked', 'horizontal', 'all'] as const;
        const mode = modes[modeIdx] ?? 'all';
        const gravity = params['gravity'] ?? PHYSICS_CONSTANTS.g.value;
        const duration = params['duration'] ?? 5;
        return {
            id: `galileo-${Date.now()}`,
            title: '伽利略斜面',
            model: 'galileo-incline',
            bodies: [
                { id: 'ball', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: { galileoIncline: { angleDeg, inclineLength, mode, gravity } },
            environment: { gravity: { enabled: true, value: gravity } },
            timeConfig: makeTimeSeries(duration, 1000)
        };
    }
};

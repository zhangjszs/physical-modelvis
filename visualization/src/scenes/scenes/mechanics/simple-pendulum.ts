import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';
import { PHYSICS_CONSTANTS } from 'physics-core';

export const simple_pendulumScene: SceneConfig = {
    id: 'simple-pendulum',
    name: '单摆 (简谐运动)',
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
            description: '初始偏离竖直方向角度 (<15° 近似简谐)'
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
            description: '摆球质量 (单摆周期与质量无关)'
        },
        {
            name: 'g',
            label: '重力加速度 g',
            unit: 'm/s²',
            value: PHYSICS_CONSTANTS.g.value,
            min: 1,
            max: 30,
            step: 0.1,
            default: PHYSICS_CONSTANTS.g.value,
            description: '重力加速度 (地球 9.8, 月球 1.6)'
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
            description: '0=无阻尼 (机械能守恒); >0=有阻尼 (振幅衰减)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 10,
            min: 1,
            max: 60,
            step: 1,
            default: 10,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const L = params['length'] ?? 1.0;
        const angleDeg = params['angle'] ?? 15;
        const mass = params['mass'] ?? 1;
        const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
        const damping = params['damping'] ?? 0;
        const duration = params['duration'] ?? 10;
        return {
            id: `pendulum-${Date.now()}`,
            title: '单摆 (简谐运动)',
            model: 'simple-pendulum',
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

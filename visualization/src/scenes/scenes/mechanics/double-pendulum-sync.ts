import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';
import { PHYSICS_CONSTANTS } from 'physics-core';

export const double_pendulum_syncScene: SceneConfig = {
    id: 'double-pendulum-sync',
    name: '双单摆步调比较',
    model: 'double-pendulum' as const,
    parameters: [
        {
            name: 'length1',
            label: '摆1摆长 L₁',
            unit: 'm',
            value: 1.0,
            min: 0.1,
            max: 5,
            step: 0.05,
            default: 1.0,
            description: '第一个单摆的摆线长度 (m)'
        },
        {
            name: 'length2',
            label: '摆2摆长 L₂',
            unit: 'm',
            value: 0.5,
            min: 0.1,
            max: 5,
            step: 0.05,
            default: 0.5,
            description: '第二个单摆的摆线长度 (m)'
        },
        {
            name: 'angle1',
            label: '摆1初始角 θ₁',
            unit: '°',
            value: 10,
            min: 0,
            max: 15,
            step: 1,
            default: 10,
            description: '第一个摆初始偏离角度 (建议 ≤15°, 小角度近似)'
        },
        {
            name: 'angle2',
            label: '摆2初始角 θ₂',
            unit: '°',
            value: 10,
            min: 0,
            max: 15,
            step: 1,
            default: 10,
            description: '第二个摆初始偏离角度 (建议 ≤15°, 小角度近似)'
        },
        {
            name: 'phaseDiff',
            label: '相位差 Δφ',
            unit: '°',
            value: 0,
            min: 0,
            max: 360,
            step: 5,
            default: 0,
            description: '两摆相位差 (0°=同相, 180°=反相)'
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
            value: 10,
            min: 1,
            max: 60,
            step: 1,
            default: 10,
            description: '仿真总时长 (建议覆盖 ≥2 个长摆周期)'
        }
    ],
    buildProblem: params => {
        const L1 = params['length1'] ?? 1.0;
        const L2 = params['length2'] ?? 0.5;
        const th1 = params['angle1'] ?? 10;
        const th2 = params['angle2'] ?? 10;
        const phase = params['phaseDiff'] ?? 0;
        const g = params['gravity'] ?? PHYSICS_CONSTANTS.g.value;
        const duration = params['duration'] ?? 10;
        return {
            id: `dp-${Date.now()}`,
            title: '双单摆步调比较',
            model: 'double-pendulum',
            bodies: [
                {
                    id: 'pendulum1',
                    mass: { value: 0.2, unit: 'kg' },
                    position: { x: L1 * Math.sin((th1 * Math.PI) / 180), y: L1 * Math.cos((th1 * Math.PI) / 180) },
                    velocity: { x: 0, y: 0 }
                },
                {
                    id: 'pendulum2',
                    mass: { value: 0.2, unit: 'kg' },
                    position: { x: L2 * Math.sin((th2 * Math.PI) / 180), y: L2 * Math.cos((th2 * Math.PI) / 180) },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                doublePendulum: {
                    length1: L1,
                    length2: L2,
                    initialAngle1: th1,
                    initialAngle2: th2,
                    phaseDiff: phase,
                    gravity: g
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 500)
        };
    }
};

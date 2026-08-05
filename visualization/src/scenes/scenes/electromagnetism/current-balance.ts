import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';
import { PHYSICS_CONSTANTS } from 'physics-core';

export const current_balanceScene: SceneConfig = {
    id: 'current-balance',
    name: '电流天平 (安培力测量)',
    model: 'current-balance' as const,
    parameters: [
        {
            name: 'wireLen',
            label: '导线有效长度 l',
            unit: 'm',
            value: 0.05,
            min: 0.001,
            max: 1,
            step: 0.001,
            default: 0.05,
            description: '线圈垂直于磁场的单匝导线有效长度'
        },
        {
            name: 'turns',
            label: '线圈匝数 n',
            unit: '匝',
            value: 20,
            min: 1,
            max: 1000,
            step: 1,
            default: 20,
            description: '线圈匝数'
        },
        {
            name: 'mass',
            label: '砝码质量 m',
            unit: 'kg',
            value: 0.01,
            min: 0.001,
            max: 1,
            step: 0.001,
            default: 0.01,
            description: '天平砝码质量'
        },
        {
            name: 'current',
            label: '电流 I',
            unit: 'A',
            value: 1,
            min: 0,
            max: 100,
            step: 0.1,
            default: 1,
            description: '通过线圈的电流'
        },
        {
            name: 'magneticField',
            label: '磁感应强度 B',
            unit: 'T',
            value: 0.5,
            min: 0.01,
            max: 10,
            step: 0.01,
            default: 0.5,
            description: '匀强磁场磁感应强度'
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
            value: 5,
            min: 0.5,
            max: 30,
            step: 0.5,
            default: 5,
            description: '仿真总时长'
        }
    ],
    buildProblem: params => {
        const wireLen = params['wireLen'] ?? 0.05;
        const turns = params['turns'] ?? 20;
        const mass = params['mass'] ?? 0.01;
        const current = params['current'] ?? 1;
        const magneticField = params['magneticField'] ?? 0.5;
        const g = params['gravity'] ?? PHYSICS_CONSTANTS.g.value;
        const duration = params['duration'] ?? 5;
        return {
            id: `curBal-${Date.now()}`,
            title: '电流天平 (安培力测量)',
            model: 'current-balance',
            bodies: [
                {
                    id: 'balance',
                    mass: { value: mass, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                currentBalance: { wireLen, turns, mass, current, magneticField, gravity: g }
            },
            environment: {
                gravity: { enabled: true, value: g }
            },
            timeConfig: makeTimeSeries(duration, 300)
        };
    }
};

import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const em_dampingScene: SceneConfig = {
    id: 'em-damping',
    name: '电磁阻尼/驱动',
    model: 'em-damping' as const,
    parameters: [
        {
            name: 'magneticField',
            label: '磁感应强度 B',
            unit: 'T',
            value: 0.3,
            min: 0.01,
            max: 5,
            step: 0.01,
            default: 0.3,
            description: '匀强磁场磁感应强度'
        },
        {
            name: 'angularSpeed',
            label: '初始/目标角速度 ω₀',
            unit: 'rad/s',
            value: 100,
            min: 0,
            max: 5000,
            step: 10,
            default: 100,
            description: '初始 (阻尼) 或目标 (驱动) 角速度'
        },
        {
            name: 'conductivity',
            label: '电导率 σ',
            unit: 'S/m',
            value: 5.8e7,
            min: 1e3,
            max: 1e8,
            step: 1e5,
            default: 5.8e7,
            description: '导体电导率'
        },
        {
            name: 'inertia',
            label: '转动惯量 J',
            unit: 'kg·m²',
            value: 0.01,
            min: 1e-9,
            max: 100,
            step: 0.01,
            default: 0.01,
            description: '导体盘转动惯量'
        },
        {
            name: 'radius',
            label: '导体盘半径 R',
            unit: 'm',
            value: 0.1,
            min: 0.001,
            max: 10,
            step: 0.01,
            default: 0.1,
            description: '导体盘半径'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 5,
            min: 0.1,
            max: 60,
            step: 0.5,
            default: 5,
            description: '仿真总时长'
        }
    ],
    buildProblem: params => {
        const magneticField = params['magneticField'] ?? 0.3;
        const angularSpeed = params['angularSpeed'] ?? 100;
        const conductivity = params['conductivity'] ?? 5.8e7;
        const inertia = params['inertia'] ?? 0.01;
        const radius = params['radius'] ?? 0.1;
        const duration = params['duration'] ?? 5;
        return {
            id: `emd-${Date.now()}`,
            title: '电磁阻尼/驱动',
            model: 'em-damping',
            bodies: [
                { id: 'disc', mass: { value: 0.5, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                emDamping: { mode: 'damping', magneticField, angularSpeed, conductivity, inertia, radius }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 500)
        };
    }
};

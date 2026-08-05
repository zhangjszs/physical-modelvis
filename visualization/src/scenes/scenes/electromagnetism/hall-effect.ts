import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const hall_effectScene: SceneConfig = {
    id: 'hall-effect',
    name: '霍尔元件 (VH-IS)',
    model: 'hall-effect' as const,
    parameters: [
        {
            name: 'current',
            label: '控制电流 I',
            unit: 'A',
            value: 1,
            min: 0,
            max: 100,
            step: 0.1,
            default: 1,
            description: '霍尔元件控制电流 I'
        },
        {
            name: 'magneticField',
            label: '磁感应强度 B',
            unit: 'T',
            value: 0.3,
            min: 0.001,
            max: 5,
            step: 0.01,
            default: 0.3,
            description: '垂直于元件表面的磁场 B'
        },
        {
            name: 'chargeDensity',
            label: '载流子浓度 n',
            unit: 'm^-3',
            value: 1e22,
            min: 1e18,
            max: 1e28,
            step: 1e20,
            default: 1e22,
            description: '半导体载流子浓度 n'
        },
        {
            name: 'thickness',
            label: '元件厚度 t',
            unit: 'm',
            value: 0.001,
            min: 1e-7,
            max: 0.01,
            step: 1e-4,
            default: 0.001,
            description: '霍尔元件厚度 t (m)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 1,
            min: 0.1,
            max: 5,
            step: 0.1,
            default: 1,
            description: '静态场景显示时长'
        }
    ],
    buildProblem: params => {
        const current = params['current'] ?? 1;
        const magneticField = params['magneticField'] ?? 0.3;
        const chargeDensity = params['chargeDensity'] ?? 1e22;
        const thickness = params['thickness'] ?? 0.001;
        const duration = params['duration'] ?? 1;
        return {
            id: `hall-${Date.now()}`,
            title: '霍尔元件 (VH-IS)',
            model: 'hall-effect',
            bodies: [
                {
                    id: 'element',
                    mass: { value: 0.01, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                hallEffect: { current, magneticField, chargeDensity, thickness, carrierType: 'electron' }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 200)
        };
    }
};

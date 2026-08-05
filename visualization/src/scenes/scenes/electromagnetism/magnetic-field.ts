import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const magnetic_fieldScene: SceneConfig = {
    id: 'magnetic-field',
    name: '匀强磁场',
    model: 'uniform-magnetic-field',
    parameters: [
        {
            name: 'v0x',
            label: '水平初速度 vx₀',
            unit: 'm/s',
            value: 1000,
            min: 1,
            max: 100000,
            step: 100,
            default: 1000,
            description: '水平方向初速度'
        },
        {
            name: 'v0y',
            label: '竖直初速度 vy₀',
            unit: 'm/s',
            value: 0,
            min: -100000,
            max: 100000,
            step: 100,
            default: 0,
            description: '竖直方向初速度'
        },
        {
            name: 'charge',
            label: '电荷量 q',
            unit: '×10⁻¹⁹ C',
            value: 1.6,
            min: -10,
            max: 10,
            step: 0.1,
            default: 1.6,
            description: '带电粒子电荷量'
        },
        {
            name: 'mass',
            label: '质量 m',
            unit: '×10⁻²⁷ kg',
            value: 1.67,
            min: 0.01,
            max: 100,
            step: 0.1,
            default: 1.67,
            description: '粒子质量'
        },
        {
            name: 'Bz',
            label: '磁感应强度 B',
            unit: 'T',
            value: 0.01,
            min: 0.0001,
            max: 10,
            step: 0.001,
            default: 0.01,
            description: '匀强磁场强度（垂直于运动平面）'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 0.01,
            min: 0.0001,
            max: 1,
            step: 0.001,
            default: 0.01,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const v0x = params['v0x'] ?? 1000;
        const v0y = params['v0y'] ?? 0;
        const q = (params['charge'] ?? 1.6) * 1e-19;
        const m = (params['mass'] ?? 1.67) * 1e-27;
        const Bz = params['Bz'] ?? 0.01;
        const duration = params['duration'] ?? 0.01;
        return {
            id: `magnetic-field-${Date.now()}`,
            title: '匀强磁场',
            model: 'uniform-magnetic-field',
            bodies: [
                {
                    id: 'charge',
                    mass: { value: m, unit: 'kg' },
                    charge: { value: q, unit: 'C' },
                    position: { x: 0, y: 0 },
                    velocity: { x: v0x, y: v0y }
                }
            ],
            environment: {
                magneticField: { enabled: true, fieldStrength: Bz, direction: 'out' }
            },
            timeConfig: makeTimeSeries(duration, 1000)
        };
    }
};

import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const electric_fieldScene: SceneConfig = {
    id: 'electric-field',
    name: '匀强电场',
    model: 'uniform-electric-field',
    parameters: [
        {
            name: 'v0x',
            label: '水平初速度 vx₀',
            unit: 'm/s',
            value: 5,
            min: -100,
            max: 100,
            step: 0.5,
            default: 5,
            description: '水平方向初速度'
        },
        {
            name: 'v0y',
            label: '竖直初速度 vy₀',
            unit: 'm/s',
            value: 0,
            min: -100,
            max: 100,
            step: 0.5,
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
            description: '带电粒子电荷量（正=正电荷，负=负电荷）'
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
            name: 'Ey',
            label: '电场强度 Ey',
            unit: 'N/C',
            value: 100,
            min: -1000,
            max: 1000,
            step: 10,
            default: 100,
            description: '匀强电场的 y 分量（正=向上，负=向下）'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 2,
            min: 0.1,
            max: 20,
            step: 0.1,
            default: 2,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const v0x = params['v0x'] ?? 5;
        const v0y = params['v0y'] ?? 0;
        const q = (params['charge'] ?? 1.6) * 1e-19;
        const m = (params['mass'] ?? 1.67) * 1e-27;
        const Ey = params['Ey'] ?? 100;
        const duration = params['duration'] ?? 2;
        return {
            id: `electric-field-${Date.now()}`,
            title: '匀强电场',
            model: 'uniform-electric-field',
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
                electricField: { enabled: true, fieldVector: { x: 0, y: Ey } }
            },
            timeConfig: makeTimeSeries(duration, 1000, 0.001)
        };
    }
};

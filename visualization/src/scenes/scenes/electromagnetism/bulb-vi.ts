import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const bulb_viScene: SceneConfig = {
    id: 'bulb-vi',
    name: '小灯泡伏安特性',
    model: 'circuit',
    parameters: [
        {
            name: 'emf',
            label: '电动势 E',
            unit: 'V',
            value: 12,
            min: 1,
            max: 36,
            step: 0.5,
            default: 12,
            description: '电源电动势'
        },
        {
            name: 'r',
            label: '内阻 r',
            unit: 'Ω',
            value: 1,
            min: 0,
            max: 10,
            step: 0.1,
            default: 1,
            description: '电源内阻'
        },
        {
            name: 'R_bulb',
            label: '灯泡冷态电阻 R₀',
            unit: 'Ω',
            value: 10,
            min: 1,
            max: 50,
            step: 0.5,
            default: 10,
            description: '小灯泡冷态电阻 (温度系数 α=0.01)'
        },
        {
            name: 'duration',
            label: '动画时长',
            unit: 's',
            value: 3,
            min: 1,
            max: 10,
            step: 0.5,
            default: 3,
            description: '动画播放时长'
        }
    ],
    buildProblem: params => {
        const emf = params['emf'] ?? 12;
        const r = params['r'] ?? 1;
        const R_bulb = params['R_bulb'] ?? 10;
        const duration = params['duration'] ?? 3;
        return {
            id: `bulb-vi-${Date.now()}`,
            title: '小灯泡伏安特性',
            model: 'circuit' as const,
            bodies: [
                { id: 'wire', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                circuit: { emf, internalResistance: r, resistors: [{ resistance: R_bulb, connection: 'series' }] }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 10, 0.1)
        };
    }
};

import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const transmission_beltScene: SceneConfig = {
    id: 'transmission-belt',
    name: '传动方式 (皮带/齿轮/摩擦轮/同轴)',
    model: 'transmission-belt',
    parameters: [
        {
            name: 'mode',
            label: '传动方式',
            unit: '',
            value: 0,
            min: 0,
            max: 3,
            step: 1,
            default: 0,
            description: '0=皮带 1=齿轮 2=摩擦轮 3=同轴'
        },
        {
            name: 'r1',
            label: '主动轮半径 r₁',
            unit: 'm',
            value: 0.1,
            min: 0.01,
            max: 0.5,
            step: 0.01,
            default: 0.1,
            description: '主动轮半径'
        },
        {
            name: 'r2',
            label: '从动轮半径 r₂',
            unit: 'm',
            value: 0.2,
            min: 0.01,
            max: 0.5,
            step: 0.01,
            default: 0.2,
            description: '从动轮半径'
        },
        {
            name: 'omega1',
            label: '主动轮角速度 ω₁',
            unit: 'rad/s',
            value: 10,
            min: 1,
            max: 100,
            step: 1,
            default: 10,
            description: '主动轮角速度'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 2,
            min: 0.5,
            max: 5,
            step: 0.5,
            default: 2,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const modes = ['belt', 'gear', 'friction', 'coax'] as const;
        const modeIdx = Math.round(params['mode'] ?? 0);
        const r1 = params['r1'] ?? 0.1;
        const r2 = params['r2'] ?? 0.2;
        const omega1 = params['omega1'] ?? 10;
        const duration = params['duration'] ?? 2;
        return {
            id: `tb-${Date.now()}`,
            title: '传动方式',
            model: 'transmission-belt',
            bodies: [
                {
                    id: 'wheel1',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: -1, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: { transmission: { mode: modes[modeIdx] ?? 'belt', r1, r2, omega1 } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};

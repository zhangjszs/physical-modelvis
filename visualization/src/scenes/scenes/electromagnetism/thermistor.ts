import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const thermistorScene: SceneConfig = {
    id: 'thermistor',
    name: '热敏电阻 (R-T特性)',
    model: 'thermistor' as const,
    parameters: [
        {
            name: 'temperature',
            label: '当前温度 T',
            unit: 'K',
            value: 300,
            min: 200,
            max: 600,
            step: 1,
            default: 300,
            description: '热敏电阻工作温度 (K)'
        },
        {
            name: 'R0',
            label: '基准电阻 R₀',
            unit: 'Ω',
            value: 1e4,
            min: 1,
            max: 1e6,
            step: 100,
            default: 1e4,
            description: 'T₀=298 K 时的基准电阻'
        },
        {
            name: 'BValue',
            label: '材料常数 B',
            unit: 'K',
            value: 3950,
            min: 1000,
            max: 6000,
            step: 100,
            default: 3950,
            description: 'NTC B 常数'
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
            description: '静态场景显示'
        }
    ],
    buildProblem: params => {
        const temperature = params['temperature'] ?? 300;
        const R0 = params['R0'] ?? 1e4;
        const BValue = params['BValue'] ?? 3950;
        const duration = params['duration'] ?? 1;
        return {
            id: `therm-${Date.now()}`,
            title: '热敏电阻 (R-T特性)',
            model: 'thermistor',
            bodies: [
                {
                    id: 'thermBody',
                    mass: { value: 0.01, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                thermistor: { temperature, mode: 'NTC', R0, BValue }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 200)
        };
    }
};

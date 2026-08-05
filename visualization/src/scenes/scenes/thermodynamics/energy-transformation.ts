import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const energy_transformationScene: SceneConfig = {
    id: 'energy-transformation',
    name: '能量转化 (能量守恒)',
    model: 'energy-transformation',
    parameters: [
        {
            name: 'mode',
            label: '实验模式',
            unit: '',
            value: 0,
            min: 0,
            max: 2,
            step: 1,
            default: 0,
            description: '0=单摆; 1=发电机; 2=光伏电池'
        },
        {
            name: 'inputEnergy',
            label: '输入能量 E_in',
            unit: 'J',
            value: 100,
            min: 1,
            max: 100000,
            step: 1,
            default: 100,
            description: '输入能量的大小 (J)'
        },
        {
            name: 'efficiency',
            label: '转化效率 η',
            unit: '',
            value: 0.85,
            min: 0.05,
            max: 0.99,
            step: 0.01,
            default: 0.85,
            description: '有用输出 / 输入 (0~1)'
        },
        {
            name: 'duration',
            label: '展示时长',
            unit: 's',
            value: 5,
            min: 1,
            max: 30,
            step: 0.5,
            default: 5,
            description: '能量柱 + 效率曲线展示时长'
        }
    ],
    buildProblem: params => {
        const modeNum = params['mode'] ?? 0;
        const modeVal =
            modeNum === 1 ? ('generator' as const) : modeNum === 2 ? ('photovoltaic' as const) : ('pendulum' as const);
        const inputEnergy = params['inputEnergy'] ?? 100;
        const efficiency = params['efficiency'] ?? 0.85;
        const duration = params['duration'] ?? 5;
        return {
            id: `energy-trans-${Date.now()}`,
            title: '能量转化 (能量守恒)',
            model: 'energy-transformation' as const,
            bodies: [
                { id: 'device', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                energyTransformation: {
                    mode: modeVal,
                    inputEnergy,
                    efficiency
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};

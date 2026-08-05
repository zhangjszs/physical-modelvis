import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const photoresistorScene: SceneConfig = {
    id: 'photoresistor',
    name: '光敏电阻 (R-L特性)',
    model: 'photoresistor' as const,
    parameters: [
        {
            name: 'darkResistance',
            label: '暗电阻 R_dark',
            unit: 'Ohm',
            value: 1e6,
            min: 1e3,
            max: 1e9,
            step: 1e5,
            default: 1e6,
            description: '无光照时的暗电阻 (Ω)'
        },
        {
            name: 'sensitivity',
            label: '灵敏度 k',
            unit: '1/lx',
            value: 2e-3,
            min: 1e-5,
            max: 0.1,
            step: 1e-4,
            default: 2e-3,
            description: '指数灵敏度系数 k'
        },
        {
            name: 'lightIntensity',
            label: '工作点光照度 E',
            unit: 'lx',
            value: 100,
            min: 0.1,
            max: 1e5,
            step: 10,
            default: 100,
            description: '当前光照度 E (图亮度单位)'
        },
        {
            name: 'temperature',
            label: '环境温度 T',
            unit: '°C',
            value: 25,
            min: -20,
            max: 80,
            step: 1,
            default: 25,
            description: '环境温度 (℃)'
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
        const darkResistance = params['darkResistance'] ?? 1e6;
        const sensitivity = params['sensitivity'] ?? 2e-3;
        const lightIntensity = params['lightIntensity'] ?? 100;
        const temperatureCelsius = params['temperature'] ?? 25;
        const duration = params['duration'] ?? 5;
        return {
            id: `photo-${Date.now()}`,
            title: '光敏电阻 (R-L特性)',
            model: 'photoresistor',
            bodies: [
                { id: 'ldr', mass: { value: 0.01, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                photoresistor: { darkResistance, sensitivity, lightIntensity, temperatureCelsius }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 300)
        };
    }
};

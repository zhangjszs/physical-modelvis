import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const eddy_currentScene: SceneConfig = {
    id: 'eddy-current',
    name: '涡流现象 (阻尼摆动)',
    model: 'eddy-current' as const,
    parameters: [
        {
            name: 'magneticField',
            label: '磁感应强度 B',
            unit: 'T',
            value: 0.2,
            min: 0.01,
            max: 5,
            step: 0.01,
            default: 0.2,
            description: '交变磁场峰值 B'
        },
        {
            name: 'frequency',
            label: '磁场频率 f',
            unit: 'Hz',
            value: 50,
            min: 0.1,
            max: 1e6,
            step: 1,
            default: 50,
            description: '交变磁场频率'
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
            description: '导体电导率 (铜~5.8x10⁷ S/m)'
        },
        {
            name: 'thickness',
            label: '导体厚度 d',
            unit: 'm',
            value: 0.001,
            min: 1e-5,
            max: 0.1,
            step: 0.0001,
            default: 0.001,
            description: '金属板厚度 (m)'
        },
        {
            name: 'muR',
            label: '相对磁导率 μᵣ',
            unit: '',
            value: 1,
            min: 1,
            max: 5000,
            step: 1,
            default: 1,
            description: '导体相对磁导率 (非铁磁体=1)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 10,
            min: 0.5,
            max: 60,
            step: 0.5,
            default: 10,
            description: '仿真总时长'
        }
    ],
    buildProblem: params => {
        const magneticField = params['magneticField'] ?? 0.2;
        const frequency = params['frequency'] ?? 50;
        const conductivity = params['conductivity'] ?? 5.8e7;
        const thickness = params['thickness'] ?? 0.001;
        const muR = params['muR'] ?? 1;
        const duration = params['duration'] ?? 10;
        return {
            id: `eddy-${Date.now()}`,
            title: '涡流现象 (阻尼摆动)',
            model: 'eddy-current',
            bodies: [
                {
                    id: 'plate',
                    mass: { value: 0.1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                eddyCurrent: { magneticField, frequency, conductivity, thickness, muR }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 500)
        };
    }
};

import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const surface_tensionScene: SceneConfig = {
    id: 'surface-tension',
    name: '表面张力 (膜收缩)',
    model: 'surface-tension',
    parameters: [
        {
            name: 'medium',
            label: '液体 (0=水 1=水银)',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 1,
            default: 0,
            description: '水 σ₀=0.072 N/m; 水银 σ₀=0.487 N/m (20°C)'
        },
        {
            name: 'sliderLength',
            label: '吊环长度 L',
            unit: 'cm',
            value: 4,
            min: 0.5,
            max: 20,
            step: 0.5,
            default: 4,
            description: '与液面接触的吊环长度 (F_sigma = 2·sigma·L)'
        },
        {
            name: 'temperature',
            label: '温度',
            unit: '°C',
            value: 20,
            min: 0,
            max: 80,
            step: 1,
            default: 20,
            description: '液体温度 (sigma 随 T 升高而降低)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 3,
            min: 0.5,
            max: 10,
            step: 0.5,
            default: 3,
            description: '图形展示时长'
        }
    ],
    buildProblem: params => {
        const medium = (params['medium'] ?? 0) === 1 ? ('mercury' as const) : ('water' as const);
        const sliderLength = (params['sliderLength'] ?? 4) / 100;
        const temperature = params['temperature'] ?? 20;
        const duration = params['duration'] ?? 3;
        return {
            id: `surf-tension-${Date.now()}`,
            title: '表面张力 (膜收缩)',
            model: 'surface-tension',
            bodies: [
                { id: 'ring', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                surfaceTension: { liquidMode: medium, sliderLength, temperature }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};

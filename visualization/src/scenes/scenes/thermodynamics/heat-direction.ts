import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const heat_directionScene: SceneConfig = {
    id: 'heat-direction',
    name: '热力学方向性 (热二定律)',
    model: 'heat-direction',
    parameters: [
        {
            name: 'hotTemp',
            label: '高温物体 T_hot',
            unit: 'K',
            value: 400,
            min: 250,
            max: 550,
            step: 5,
            default: 400,
            description: '高温热源初始温度 (K)'
        },
        {
            name: 'coldTemp',
            label: '低温物体 T_cold',
            unit: 'K',
            value: 250,
            min: 150,
            max: 350,
            step: 5,
            default: 250,
            description: '低温物体初始温度 (K)'
        },
        {
            name: 'thermalConductivity',
            label: '等效导热系数 k',
            unit: 'W/(m·K)',
            value: 5,
            min: 0.1,
            max: 100,
            step: 0.1,
            default: 5,
            description: '接触界面等效导热系数 (τ = 10 / (k+0.01))'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 5,
            min: 1,
            max: 30,
            step: 0.5,
            default: 5,
            description: '温度趋衡 T-t 曲线展示时长'
        }
    ],
    buildProblem: params => {
        const hotTemp = params['hotTemp'] ?? 400;
        const coldTemp = params['coldTemp'] ?? 250;
        const thermalConductivity = params['thermalConductivity'] ?? 5;
        const duration = params['duration'] ?? 5;
        return {
            id: `heat-dir-${Date.now()}`,
            title: '热力学方向性 (热二定律)',
            model: 'heat-direction' as const,
            bodies: [
                {
                    id: 'contact',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                heatDirection: {
                    hotTemp,
                    coldTemp,
                    thermalConductivity,
                    duration
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};

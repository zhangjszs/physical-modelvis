import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const strain_gaugeScene: SceneConfig = {
    id: 'strain-gauge',
    name: '电阻应变片 (惠斯通电桥)',
    model: 'strain-gauge' as const,
    parameters: [
        {
            name: 'strain',
            label: '应变 ε',
            unit: 'με',
            value: 1000,
            min: -5000,
            max: 5000,
            step: 50,
            default: 1000,
            description: '当前应变 (微应变单位)'
        },
        {
            name: 'gaugeFactor',
            label: '灵敏系数 K',
            unit: '',
            value: 2.1,
            min: 1,
            max: 200,
            step: 0.1,
            default: 2.1,
            description: '应变片灵敏系数 K (金属~2, 半导体~100)'
        },
        {
            name: 'bridgeVoltage',
            label: '桥路供电 U_K',
            unit: 'V',
            value: 5,
            min: 0.5,
            max: 30,
            step: 0.5,
            default: 5,
            description: '惠斯通电桥供电电压'
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
        const strain = params['strain'] ?? 1000;
        const gaugeFactor = params['gaugeFactor'] ?? 2.1;
        const bridgeVoltage = params['bridgeVoltage'] ?? 5;
        const duration = params['duration'] ?? 1;
        return {
            id: `strain-${Date.now()}`,
            title: '电阻应变片 (惠斯通电桥)',
            model: 'strain-gauge',
            bodies: [
                {
                    id: 'element',
                    mass: { value: 0.1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                strainGauge: { strain, gaugeFactor, bridgeVoltage }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 200)
        };
    }
};

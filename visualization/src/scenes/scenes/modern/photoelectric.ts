import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const photoelectricScene: SceneConfig = {
    id: 'photoelectric',
    name: '光电效应 (爱因斯坦方程)',
    model: 'photoelectric',
    parameters: [
        {
            name: 'W0',
            label: '逸出功 W₀',
            unit: 'eV',
            value: 2.3,
            min: 1,
            max: 6,
            step: 0.05,
            default: 2.3,
            description: '金属逸出功 (钠≈2.28, 钾≈2.3, 锌≈4.3, 铜≈4.7)'
        },
        {
            name: 'nuMin',
            label: '起始频率 ν_min',
            unit: 'THz',
            value: 300,
            min: 100,
            max: 1500,
            step: 50,
            default: 300,
            description: '入射光频率范围下限'
        },
        {
            name: 'nuMax',
            label: '终止频率 ν_max',
            unit: 'THz',
            value: 1500,
            min: 500,
            max: 5000,
            step: 50,
            default: 1500,
            description: '入射光频率范围上限'
        }
    ],
    buildProblem: params => {
        const workFunction = params['W0'] ?? 2.3;
        const freqMinTHz = params['nuMin'] ?? Math.max(workFunction * 110, 100);
        const freqMaxTHz = params['nuMax'] ?? workFunction * 400;
        return {
            id: `photoelectric-${Date.now()}`,
            title: '光电效应 (爱因斯坦光电方程)',
            model: 'photoelectric' as const,
            bodies: [
                {
                    id: 'electron',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: { photoelectric: { workFunction, freqMinTHz, freqMaxTHz } },
            environment: {},
            // 6s 演示时间轴：与 3D 装置的频率扫描周期一致，2D 板书播放时同步扫频
            timeConfig: makeTimeSeries(6, 120)
        };
    }
};

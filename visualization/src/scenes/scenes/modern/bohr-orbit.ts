import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const bohr_orbitScene: SceneConfig = {
    id: 'bohr-orbit',
    name: '玻尔氢原子模型 (轨道能级)',
    model: 'bohr-model' as const,
    parameters: [
        {
            name: 'seriesB',
            label: '线系 (0=赖曼 1=巴尔末 2=帕邢)',
            unit: '',
            value: 1,
            min: 0,
            max: 2,
            step: 1,
            default: 1,
            description: '0=赖曼系(紫外,n₁=1); 1=巴尔末系(可见,n₁=2); 2=帕邢系(红外,n₁=3)'
        },
        {
            name: 'maxN',
            label: '最大主量子数 n_max',
            unit: '',
            value: 6,
            min: 3,
            max: 10,
            step: 1,
            default: 6,
            description: '决定计算多少条谱线'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 2,
            min: 1,
            max: 5,
            step: 0.5,
            default: 2,
            description: '仿真总时长'
        }
    ],
    buildProblem: params => {
        const seriesNum = params['seriesB'] ?? 1;
        const series =
            seriesNum === 0 ? ('Lyman' as const) : seriesNum === 2 ? ('Paschen' as const) : ('Balmer' as const);
        const maxN = params['maxN'] ?? 6;
        const duration = params['duration'] ?? 2;
        return {
            id: `bohr-orbit-${Date.now()}`,
            title: '玻尔氢原子模型 (轨道能级)',
            model: 'bohr-model' as const,
            bodies: [
                {
                    id: 'electron',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: { bohr: { series, maxN } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 10, 0.1)
        };
    }
};

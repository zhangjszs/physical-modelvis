import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const bohrScene: SceneConfig = {
    id: 'bohr',
    name: '玻尔氢原子模型 (能级与光谱)',
    model: 'bohr-model',
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
        }
    ],
    buildProblem: params => {
        const seriesNum = params['seriesB'] ?? 1;
        const series =
            seriesNum === 0 ? ('Lyman' as const) : seriesNum === 2 ? ('Paschen' as const) : ('Balmer' as const);
        const maxN = params['maxN'] ?? 6;
        return {
            id: `bohr-${Date.now()}`,
            title: '玻尔氢原子模型 (能级与发射光谱)',
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
            timeConfig: makeTimeSeries(1, 10, 0.1)
        };
    }
};

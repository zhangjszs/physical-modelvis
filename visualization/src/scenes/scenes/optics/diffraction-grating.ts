import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const diffraction_gratingScene: SceneConfig = {
    id: 'diffraction-grating',
    name: '光栅衍射 (光栅方程)',
    model: 'diffraction-grating' as const,
    parameters: [
        {
            name: 'gratingConst',
            label: '光栅常数 d',
            unit: 'μm',
            value: 2,
            min: 0.5,
            max: 10,
            step: 0.1,
            default: 2,
            description: '相邻狭缝中心距 (d=1/N, N=刻线数)'
        },
        {
            name: 'slitWidth',
            label: '缝宽 a',
            unit: 'μm',
            value: 1,
            min: 0.2,
            max: 5,
            step: 0.1,
            default: 1,
            description: '单条狭缝的宽度'
        },
        {
            name: 'wavelength',
            label: '波长 λ',
            unit: 'nm',
            value: 550,
            min: 380,
            max: 780,
            step: 5,
            default: 550,
            description: '入射单色光波长'
        },
        {
            name: 'orderMax',
            label: '最大级次 k_max',
            unit: '',
            value: 4,
            min: 1,
            max: 10,
            step: 1,
            default: 4,
            description: '计算的最大衍射级次'
        },
        {
            name: 'slitCount',
            label: '总缝数 N',
            unit: '',
            value: 500,
            min: 10,
            max: 10000,
            step: 10,
            default: 500,
            description: '光栅总刻线数 (越多谱线越锐利)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 1,
            min: 0.5,
            max: 5,
            step: 0.1,
            default: 1,
            description: '静态场景 (仅显示衍射谱线)'
        }
    ],
    buildProblem: params => {
        const gratingConstant = params['gratingConst'] ?? 2;
        const slitWidth = params['slitWidth'] ?? 1;
        const wavelength = params['wavelength'] ?? 550;
        const orderMax = params['orderMax'] ?? 4;
        const slitCount = params['slitCount'] ?? 500;
        const duration = params['duration'] ?? 1;
        return {
            id: `dg-${Date.now()}`,
            title: '光栅衍射 (光栅方程)',
            model: 'diffraction-grating',
            bodies: [
                { id: 'photon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                diffractionGrating: { gratingConstant, slitWidth, wavelength, orderMax, slitCount }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};

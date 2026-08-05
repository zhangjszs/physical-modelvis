import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const thin_filmScene: SceneConfig = {
    id: 'thin-film',
    name: '薄膜干涉 (等厚)',
    model: 'thin-film' as const,
    parameters: [
        {
            name: 'thickness',
            label: '薄膜厚度 d',
            unit: 'nm',
            value: 300,
            min: 10,
            max: 2000,
            step: 10,
            default: 300,
            description: '薄膜中心厚度 (可见光波长的 1-3 倍)'
        },
        {
            name: 'refIndex',
            label: '薄膜折射率 n',
            unit: '',
            value: 1.38,
            min: 1,
            max: 3,
            step: 0.01,
            default: 1.38,
            description: '薄膜材料折射率 (MgF₂=1.38, 玻璃=1.5)'
        },
        {
            name: 'wavelength',
            label: '入射光波长 λ',
            unit: 'nm',
            value: 550,
            min: 380,
            max: 780,
            step: 5,
            default: 550,
            description: '入射单色光波长 (绿光≈550nm)'
        },
        {
            name: 'incAngle',
            label: '入射角 θ',
            unit: '°',
            value: 0,
            min: 0,
            max: 89,
            step: 1,
            default: 0,
            description: '入射光线与法线的夹角'
        },
        {
            name: 'subsIndex',
            label: '基片折射率 n_s',
            unit: '',
            value: 1.5,
            min: 1,
            max: 4,
            step: 0.01,
            default: 1.5,
            description: '薄膜下方基片折射率 (玻璃=1.5)'
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
            description: '静态场景 (仅显示反射率曲线)'
        }
    ],
    buildProblem: params => {
        const thickness = params['thickness'] ?? 300;
        const refIndex = params['refIndex'] ?? 1.38;
        const wavelength = params['wavelength'] ?? 550;
        const incAngle = params['incAngle'] ?? 0;
        const subsIndex = params['subsIndex'] ?? 1.5;
        const duration = params['duration'] ?? 1;
        return {
            id: `tf-${Date.now()}`,
            title: '薄膜干涉 (等厚)',
            model: 'thin-film',
            bodies: [
                { id: 'photon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                thinFilm: { thickness, refIndex, wavelength, incidentAngle: incAngle, substrateIndex: subsIndex }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};

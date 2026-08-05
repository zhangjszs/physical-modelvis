import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const hologramScene: SceneConfig = {
    id: 'hologram',
    name: '全息照相 (干涉记录)',
    model: 'hologram' as const,
    parameters: [
        {
            name: 'refAngle',
            label: '参考光角度 θ_r',
            unit: '°',
            value: 30,
            min: 0,
            max: 60,
            step: 1,
            default: 30,
            description: '参考光与光轴夹角'
        },
        {
            name: 'objAngle',
            label: '物光角度 θ_o',
            unit: '°',
            value: -10,
            min: -30,
            max: 30,
            step: 1,
            default: -10,
            description: '物光与光轴夹角 (反号表示另一侧)'
        },
        {
            name: 'wavelength',
            label: '激光波长 λ',
            unit: 'nm',
            value: 632.8,
            min: 380,
            max: 780,
            step: 5,
            default: 632.8,
            description: '激光波长 (He-Ne 激光器 632.8nm)'
        },
        {
            name: 'refAmp',
            label: '参考光振幅 A_r',
            unit: '',
            value: 1,
            min: 0.1,
            max: 10,
            step: 0.1,
            default: 1,
            description: '参考光振幅相对值'
        },
        {
            name: 'objAmp',
            label: '物光振幅 A_o',
            unit: '',
            value: 0.5,
            min: 0.1,
            max: 10,
            step: 0.1,
            default: 0.5,
            description: '物光振幅相对值 (通常 < 参考光)'
        },
        {
            name: 'recordWidth',
            label: '干板宽度 W',
            unit: 'mm',
            value: 20,
            min: 1,
            max: 100,
            step: 1,
            default: 20,
            description: '全息干板宽度 (mm)'
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
            description: '静态场景 (仅显示记录/再现条纹)'
        }
    ],
    buildProblem: params => {
        const referenceAngle = params['refAngle'] ?? 30;
        const objectAngle = params['objAngle'] ?? -10;
        const wavelength = params['wavelength'] ?? 632.8;
        const refAmp = params['refAmp'] ?? 1;
        const objAmp = params['objAmp'] ?? 0.5;
        const recordWidth = params['recordWidth'] ?? 20;
        const duration = params['duration'] ?? 1;
        return {
            id: `hlg-${Date.now()}`,
            title: '全息照相 (干涉记录)',
            model: 'hologram',
            bodies: [
                { id: 'plate', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                hologram: {
                    referenceAngle,
                    objectAngle,
                    wavelength,
                    referenceAmp: refAmp,
                    objectAmp: objAmp,
                    recordWidth
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};

import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const interferenceScene: SceneConfig = {
    id: 'interference',
    name: '双缝干涉 (杨氏实验)',
    model: 'interference',
    parameters: [
        {
            name: 'wavelength',
            label: '波长 λ',
            unit: 'nm',
            value: 600,
            min: 380,
            max: 780,
            step: 5,
            default: 600,
            description: '光波长 (红~620-780, 绿~495-570, 蓝~450-495)'
        },
        {
            name: 'slitSep',
            label: '缝距 d',
            unit: 'mm',
            value: 0.5,
            min: 0.1,
            max: 2,
            step: 0.05,
            default: 0.5,
            description: '双缝间距'
        },
        {
            name: 'screenDist',
            label: '缝-屏距离 L',
            unit: 'm',
            value: 2.0,
            min: 0.5,
            max: 5,
            step: 0.1,
            default: 2.0,
            description: '双缝到观察屏的距离'
        },
        {
            name: 'filmThickness',
            label: '薄膜厚度 (可选)',
            unit: 'μm',
            value: 0,
            min: 0,
            max: 2,
            step: 0.01,
            default: 0,
            description: '薄膜干涉时输入 (0=不启用薄膜模式)'
        },
        {
            name: 'filmN',
            label: '薄膜折射率',
            unit: '',
            value: 1.38,
            min: 1,
            max: 2.5,
            step: 0.01,
            default: 1.38,
            description: '薄膜材料折射率 (MgF₂=1.38, 玻璃=1.5)'
        }
    ],
    presets: [
        {
            id: 'red-light',
            name: '红光',
            description: 'λ=650nm 红光干涉',
            parameters: { wavelength: 650, slitSep: 0.5, screenDist: 2.0, filmThickness: 0, filmN: 1.38 }
        },
        {
            id: 'green-light',
            name: '绿光',
            description: 'λ=550nm 绿光干涉',
            parameters: { wavelength: 550, slitSep: 0.5, screenDist: 2.0, filmThickness: 0, filmN: 1.38 }
        },
        {
            id: 'blue-light',
            name: '蓝光',
            description: 'λ=450nm 蓝光干涉',
            parameters: { wavelength: 450, slitSep: 0.5, screenDist: 2.0, filmThickness: 0, filmN: 1.38 }
        },
        {
            id: 'thin-film',
            name: '薄膜干涉',
            description: 'MgF₂ 薄膜 500nm',
            parameters: { wavelength: 550, slitSep: 0.5, screenDist: 2.0, filmThickness: 0.5, filmN: 1.38 }
        },
        {
            id: 'narrow-slit',
            name: '窄缝',
            description: 'd=0.2mm 条纹更宽',
            parameters: { wavelength: 600, slitSep: 0.2, screenDist: 2.0, filmThickness: 0, filmN: 1.38 }
        }
    ],
    liveUpdate: true,
    buildProblem: params => {
        const wavelengthNm = params['wavelength'] ?? 600;
        const slitSeparationMm = params['slitSep'] ?? 0.5;
        const screenDistanceM = params['screenDist'] ?? 2.0;
        const filmThicknessUm = params['filmThickness'] ?? 0;
        const filmN = params['filmN'] ?? 1.38;
        const ic: {
            wavelengthNm: number;
            slitSeparationMm: number;
            screenDistanceM: number;
            filmThicknessUm?: number;
            filmN?: number;
        } = {
            wavelengthNm,
            slitSeparationMm,
            screenDistanceM
        };
        if (filmThicknessUm > 0) {
            ic.filmThicknessUm = filmThicknessUm;
            ic.filmN = filmN;
        }
        return {
            id: `interference-${Date.now()}`,
            title: '双缝干涉 (杨氏实验)',
            model: 'interference',
            bodies: [
                { id: 'light', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: { interference: ic },
            environment: {},
            timeConfig: makeTimeSeries(1, 10, 0.1)
        };
    }
};

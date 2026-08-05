import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const resonance_curveScene: SceneConfig = {
    id: 'resonance-curve',
    name: '共振曲线 (幅-频)',
    model: 'resonance' as const,
    parameters: [
        {
            name: 'mass',
            label: '振子质量 m',
            unit: 'kg',
            value: 1,
            min: 0.01,
            max: 10,
            step: 0.01,
            default: 1,
            description: '振子质量 (kg)'
        },
        {
            name: 'k',
            label: '弹簧劲度系数 k',
            unit: 'N/m',
            value: 100,
            min: 0.1,
            max: 1000,
            step: 1,
            default: 100,
            description: '决定固有频率 f₀ = √(k/m)/(2π)'
        },
        {
            name: 'forceAmp',
            label: '驱动力幅值 F₀',
            unit: 'N',
            value: 1,
            min: 0.01,
            max: 100,
            step: 0.1,
            default: 1,
            description: '保持恒定的驱动力幅值'
        },
        {
            name: 'beta',
            label: '阻尼系数 β',
            unit: '1/s',
            value: 0.5,
            min: 0.02,
            max: 3,
            step: 0.02,
            default: 0.5,
            description: '阻尼越小, 共振峰越高越尖'
        },
        {
            name: 'freqMin',
            label: '扫描下限 f_min',
            unit: 'Hz',
            value: 0.1,
            min: 0.1,
            max: 20,
            step: 0.1,
            default: 0.1,
            description: '振幅-频率曲线扫描下限'
        },
        {
            name: 'freqMax',
            label: '扫描上限 f_max',
            unit: 'Hz',
            value: 10,
            min: 0.5,
            max: 30,
            step: 0.1,
            default: 10,
            description: '振幅-频率曲线扫描上限 (应覆盖 f₀)'
        }
    ],
    buildProblem: params => {
        const mass = params['mass'] ?? 1;
        const springConstant = params['k'] ?? 100;
        const forceAmplitude = params['forceAmp'] ?? 1;
        const beta = params['beta'] ?? 0.5;
        const freqMin = params['freqMin'] ?? 0.1;
        const freqMax = params['freqMax'] ?? 10;
        return {
            id: `res-${Date.now()}`,
            title: '共振曲线 (幅-频)',
            model: 'resonance',
            bodies: [
                { id: 'osc', mass: { value: mass, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                resonance: {
                    mass,
                    springConstant,
                    forceAmplitude,
                    dampingBetas: [beta],
                    freqMin,
                    freqMax
                }
            },
            environment: {},
            // 静态图 (A-f 曲线): 不需要长时间演化
            timeConfig: makeTimeSeries(1, 100, 0.1)
        };
    }
};

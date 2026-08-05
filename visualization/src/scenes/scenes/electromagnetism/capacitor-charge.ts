import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const capacitor_chargeScene: SceneConfig = {
    id: 'capacitor-charge',
    name: '电容充放电 (RC 暂态电路)',
    model: 'capacitor-charge' as const,
    parameters: [
        {
            name: 'resistance',
            label: '电阻 R',
            unit: 'Ω',
            value: 1000,
            min: 1,
            max: 1e6,
            step: 100,
            default: 1000,
            description: '回路电阻'
        },
        {
            name: 'capacitance',
            label: '电容 C',
            unit: 'μF',
            value: 100,
            min: 0.001,
            max: 1000,
            step: 1,
            default: 100,
            description: '电容值 (μF)'
        },
        {
            name: 'emf',
            label: '电动势 E',
            unit: 'V',
            value: 10,
            min: 0.1,
            max: 100,
            step: 0.5,
            default: 10,
            description: '电源电动势'
        },
        {
            name: 'mode',
            label: '充/放电 (0=充电, 1=放电)',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 1,
            default: 0,
            description: '充电: Uc 从 0 升到 E; 放电: Uc 从 E 降到 0'
        },
        {
            name: 'duration',
            label: '模拟时长 (5τ)',
            unit: 's',
            value: 5,
            min: 2,
            max: 20,
            step: 0.5,
            default: 5,
            description: '仿真总时长 (对应 5τ)'
        }
    ],
    buildProblem: params => {
        const resistance = params['resistance'] ?? 1000;
        const capacitanceMuF = params['capacitance'] ?? 100;
        const capacitance = capacitanceMuF * 1e-6;
        const emf = params['emf'] ?? 10;
        const modeNum = params['mode'] ?? 0;
        const mode = modeNum >= 1 ? ('discharge' as const) : ('charge' as const);
        const duration = params['duration'] ?? 5;
        return {
            id: `capacitor-charge-${Date.now()}`,
            title: '电容充放电 (RC 暂态电路)',
            model: 'capacitor-charge' as const,
            bodies: [],
            constraints: { capacitor: { resistance, capacitance, emf, mode } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};

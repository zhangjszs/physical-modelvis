import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const load_voltageScene: SceneConfig = {
    id: 'load-voltage',
    name: '路端电压与负载 (U=E−Ir)',
    model: 'load-voltage' as const,
    parameters: [
        {
            name: 'emf',
            label: '电动势 E',
            unit: 'V',
            value: 12,
            min: 0.1,
            max: 50,
            step: 0.5,
            default: 12,
            description: '电源电动势'
        },
        {
            name: 'internalResistance',
            label: '内阻 r',
            unit: 'Ω',
            value: 2,
            min: 0,
            max: 100,
            step: 0.5,
            default: 2,
            description: '电源内阻'
        },
        {
            name: 'loadRMin',
            label: '负载电阻下限',
            unit: 'Ω',
            value: 1,
            min: 0.1,
            max: 100,
            step: 0.5,
            default: 1,
            description: '负载扫描范围下限'
        },
        {
            name: 'loadRMax',
            label: '负载电阻上限',
            unit: 'kΩ',
            value: 10,
            min: 0.01,
            max: 100,
            step: 0.5,
            default: 10,
            description: '负载扫描范围上限 (kΩ)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 5,
            min: 2,
            max: 10,
            step: 0.5,
            default: 5,
            description: '仿真总时长'
        }
    ],
    buildProblem: params => {
        const emf = params['emf'] ?? 12;
        const internalResistance = params['internalResistance'] ?? 2;
        const loadRMin = params['loadRMin'] ?? 1;
        const loadRMax = (params['loadRMax'] ?? 10) * 1000;
        const duration = params['duration'] ?? 5;
        return {
            id: `load-voltage-${Date.now()}`,
            title: '路端电压与负载',
            model: 'load-voltage' as const,
            bodies: [],
            constraints: { loadVoltage: { emf, internalResistance, loadRange: [loadRMin, loadRMax] } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};

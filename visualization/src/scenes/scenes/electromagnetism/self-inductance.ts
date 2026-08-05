import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const self_inductanceScene: SceneConfig = {
    id: 'self-inductance',
    name: '自感现象 (断电自感)',
    model: 'self-inductance' as const,
    parameters: [
        {
            name: 'inductance',
            label: '自感 L',
            unit: 'H',
            value: 0.5,
            min: 1e-6,
            max: 1000,
            step: 0.01,
            default: 0.5,
            description: '线圈自感 L'
        },
        {
            name: 'resistance',
            label: '电阻 R',
            unit: 'Ω',
            value: 10,
            min: 0.01,
            max: 1e6,
            step: 1,
            default: 10,
            description: '电路电阻 R'
        },
        {
            name: 'emf',
            label: '电源电动势 E',
            unit: 'V',
            value: 12,
            min: 0,
            max: 1000,
            step: 0.5,
            default: 12,
            description: '直流电源电动势 E'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 0.5,
            min: 0.1,
            max: 5,
            step: 0.05,
            default: 0.5,
            description: '仿真总时长 (含暂态过程)'
        }
    ],
    buildProblem: params => {
        const inductance = params['inductance'] ?? 0.5;
        const resistance = params['resistance'] ?? 10;
        const emf = params['emf'] ?? 12;
        const duration = params['duration'] ?? 0.5;
        return {
            id: `selfInd-${Date.now()}`,
            title: '自感现象 (断电自感)',
            model: 'self-inductance',
            bodies: [
                { id: 'coil', mass: { value: 0.2, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                selfInductance: { inductance, resistance, emf, mode: 'turnOff' }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 500)
        };
    }
};

import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const lc_oscillatorScene: SceneConfig = {
    id: 'lc-oscillator',
    name: 'LC 电磁振荡',
    model: 'lc-oscillator',
    parameters: [
        {
            name: 'C',
            label: '电容 C',
            unit: 'pF',
            value: 100,
            min: 1,
            max: 1e6,
            step: 1,
            default: 100,
            description: '电容值 (pF)'
        },
        {
            name: 'Lind',
            label: '电感 L',
            unit: 'μH',
            value: 10,
            min: 0.001,
            max: 100000,
            step: 0.001,
            default: 10,
            description: '电感值 (μH)'
        },
        {
            name: 'Q0',
            label: '初始电荷 Q₀',
            unit: 'μC',
            value: 1,
            min: 0.001,
            max: 100,
            step: 0.001,
            default: 1,
            description: '电容初始充电量'
        }
    ],
    buildProblem: params => {
        return {
            id: `lc-${Date.now()}`,
            title: 'LC 电磁振荡',
            model: 'lc-oscillator' as const,
            bodies: [
                { id: 'wire', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                lc: {
                    capacitance: (params['C'] ?? 100) * 1e-12,
                    inductance: (params['Lind'] ?? 10) * 1e-6,
                    initialCharge: (params['Q0'] ?? 1) * 1e-6
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(1, 100, 0.01)
        };
    }
};

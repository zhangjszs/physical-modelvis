import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const electron_diffractionScene: SceneConfig = {
    id: 'electron-diffraction',
    name: '电子衍射',
    model: 'electron-diffraction' as const,
    parameters: [
        {
            name: 'accVoltage',
            label: '加速电压',
            unit: 'V',
            value: 10000,
            min: 100,
            max: 50000,
            step: 100,
            default: 10000,
            description: '电子加速电压'
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
        const accVoltage = params['accVoltage'] ?? 10000;
        const duration = params['duration'] ?? 5;
        return {
            id: `electron-diffraction-${Date.now()}`,
            title: '电子衍射',
            model: 'electron-diffraction' as const,
            bodies: [
                {
                    id: 'electron',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: { electronDiffraction: { accVoltage, crystalLattice: 0.213 } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};

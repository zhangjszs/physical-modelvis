import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const radiation_deflectionScene: SceneConfig = {
    id: 'radiation-deflection',
    name: '放射线磁场偏转',
    model: 'radiation-deflection' as const,
    parameters: [
        {
            name: 'Bfield',
            label: '磁感应强度 B',
            unit: 'T',
            value: 0.5,
            min: 0.01,
            max: 5,
            step: 0.01,
            default: 0.5,
            description: '匀强磁场强度'
        },
        {
            name: 'particleEnergy',
            label: '粒子动能',
            unit: 'MeV',
            value: 5,
            min: 0.1,
            max: 20,
            step: 0.1,
            default: 5,
            description: '粒子入射动能'
        },
        {
            name: 'particleType',
            label: '粒子类型 (0=α 1=β 2=γ)',
            unit: '',
            value: 0,
            min: 0,
            max: 2,
            step: 1,
            default: 0,
            description: 'α=氦核, β=电子, γ=光子'
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
        const Bfield = params['Bfield'] ?? 0.5;
        const particleEnergy = params['particleEnergy'] ?? 5;
        const particleTypeNum = params['particleType'] ?? 0;
        const particleType =
            particleTypeNum === 1 ? ('beta' as const) : particleTypeNum === 2 ? ('gamma' as const) : ('alpha' as const);
        const duration = params['duration'] ?? 5;
        return {
            id: `radiation-deflection-${Date.now()}`,
            title: '放射线磁场偏转',
            model: 'radiation-deflection' as const,
            bodies: [
                {
                    id: 'particle',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: { radiationDeflection: { Bfield, particleEnergy, particleType } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};

import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const alpha_scatteringScene: SceneConfig = {
    id: 'alpha-scattering',
    name: 'α 粒子散射实验',
    model: 'alpha-scattering' as const,
    parameters: [
        {
            name: 'alphaEnergy',
            label: 'α 粒子能量',
            unit: 'MeV',
            value: 5,
            min: 0.5,
            max: 15,
            step: 0.5,
            default: 5,
            description: 'α 粒子入射动能'
        },
        {
            name: 'targetZ',
            label: '靶核电荷数 Z',
            unit: '',
            value: 79,
            min: 1,
            max: 92,
            step: 1,
            default: 79,
            description: '靶核质子数 (金=79)'
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
        const alphaEnergy = params['alphaEnergy'] ?? 5;
        const targetZ = params['targetZ'] ?? 79;
        const duration = params['duration'] ?? 5;
        return {
            id: `alpha-scattering-${Date.now()}`,
            title: 'α 粒子散射实验',
            model: 'alpha-scattering' as const,
            bodies: [
                { id: 'alpha', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: { alphaScattering: { alphaEnergy, targetZ, foilThickness: 1e-6 } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};

import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const neutron_discoveryScene: SceneConfig = {
    id: 'neutron-discovery',
    name: '中子发现 (查德威克实验)',
    model: 'neutron-discovery' as const,
    parameters: [
        {
            name: 'alphaEnergy',
            label: 'α 粒子能量',
            unit: 'MeV',
            value: 5,
            min: 1,
            max: 10,
            step: 0.5,
            default: 5,
            description: 'α 粒子入射动能'
        },
        {
            name: 'targetMass',
            label: '靶核质量',
            unit: 'u',
            value: 1,
            min: 1,
            max: 14,
            step: 1,
            default: 1,
            description: '靶核质量数 (氢=1, 氮=14)'
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
        const targetMass = params['targetMass'] ?? 1;
        const duration = params['duration'] ?? 5;
        return {
            id: `neutron-discovery-${Date.now()}`,
            title: '中子发现 (查德威克实验)',
            model: 'neutron-discovery' as const,
            bodies: [
                { id: 'alpha', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: { neutronDiscovery: { alphaEnergy, targetMass } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};

import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const fission_chainScene: SceneConfig = {
    id: 'fission-chain',
    name: '核裂变链式反应',
    model: 'fission-chain' as const,
    parameters: [
        {
            name: 'multiplicationFactor',
            label: '有效增殖因子 k',
            unit: '',
            value: 1.0,
            min: 0.5,
            max: 1.5,
            step: 0.01,
            default: 1.0,
            description: 'k=1临界, k>1超临界, k<1次临界'
        },
        {
            name: 'generations',
            label: '代数',
            unit: '',
            value: 10,
            min: 3,
            max: 30,
            step: 1,
            default: 10,
            description: '链式反应代数'
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
        const multiplicationFactor = params['multiplicationFactor'] ?? 1.0;
        const generations = params['generations'] ?? 10;
        const duration = params['duration'] ?? 5;
        return {
            id: `fission-chain-${Date.now()}`,
            title: '核裂变链式反应',
            model: 'fission-chain' as const,
            bodies: [
                {
                    id: 'neutron',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: { fissionChain: { multiplicationFactor, generations } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};

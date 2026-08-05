import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const electroscopeScene: SceneConfig = {
    id: 'electroscope',
    name: '验电器 (箔片张角 vs 电量)',
    model: 'electroscope' as const,
    parameters: [
        {
            name: 'charge',
            label: '带电量 q',
            unit: 'μC',
            value: 1,
            min: 0.01,
            max: 50,
            step: 0.1,
            default: 1,
            description: '验电器带电量'
        },
        {
            name: 'foilLength',
            label: '箔片长度 L',
            unit: 'cm',
            value: 5,
            min: 1,
            max: 20,
            step: 0.5,
            default: 5,
            description: '箔片长度 (cm)'
        },
        {
            name: 'foilMass',
            label: '箔片质量 m',
            unit: 'g',
            value: 1,
            min: 0.01,
            max: 10,
            step: 0.01,
            default: 1,
            description: '箔片质量 (g)'
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
        const charge = params['charge'] ?? 1;
        const foilLength = params['foilLength'] ?? 5;
        const foilMass = params['foilMass'] ?? 1;
        const duration = params['duration'] ?? 5;
        return {
            id: `electroscope-${Date.now()}`,
            title: '验电器',
            model: 'electroscope' as const,
            bodies: [],
            constraints: { electroscope: { charge, foilLength, foilMass } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};

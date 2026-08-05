import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const decay_statisticsScene: SceneConfig = {
    id: 'decay-statistics',
    name: '衰变统计规律',
    model: 'decay-statistics' as const,
    parameters: [
        {
            name: 'meanCount',
            label: '平均计数 N̄',
            unit: '',
            value: 50,
            min: 1,
            max: 200,
            step: 1,
            default: 50,
            description: '泊松分布均值'
        },
        {
            name: 'nTrials',
            label: '试验次数',
            unit: '',
            value: 1000,
            min: 100,
            max: 5000,
            step: 100,
            default: 1000,
            description: '蒙特卡洛试验次数'
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
        const meanCount = params['meanCount'] ?? 50;
        const nTrials = params['nTrials'] ?? 1000;
        const duration = params['duration'] ?? 5;
        return {
            id: `decay-statistics-${Date.now()}`,
            title: '衰变统计规律',
            model: 'decay-statistics' as const,
            bodies: [
                {
                    id: 'nucleus',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: { decayStatistics: { meanCount, nTrials } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};

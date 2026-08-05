import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const em_wave_hertzScene: SceneConfig = {
    id: 'em-wave-hertz',
    name: '赫兹电磁波实验 (LC振荡+驻波)',
    model: 'em-wave-hertz' as const,
    parameters: [
        {
            name: 'frequency',
            label: '振荡频率 f',
            unit: 'MHz',
            value: 100,
            min: 0.01,
            max: 300,
            step: 0.5,
            default: 100,
            description: 'LC 振荡频率 (MHz)'
        },
        {
            name: 'turns',
            label: '线圈匝数 N',
            unit: '匝',
            value: 10,
            min: 1,
            max: 100,
            step: 1,
            default: 10,
            description: '接收线圈匝数'
        },
        {
            name: 'sparkGap',
            label: '火花间隙',
            unit: 'mm',
            value: 1,
            min: 0.1,
            max: 10,
            step: 0.1,
            default: 1,
            description: '振子火花间隙 (mm)'
        },
        {
            name: 'distance',
            label: '接收端距离 d',
            unit: 'm',
            value: 5,
            min: 0.5,
            max: 100,
            step: 0.5,
            default: 5,
            description: '接收端到发射端距离'
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
        const frequency = (params['frequency'] ?? 100) * 1e6;
        const turns = params['turns'] ?? 10;
        const sparkGap = params['sparkGap'] ?? 1;
        const distance = params['distance'] ?? 5;
        const duration = params['duration'] ?? 5;
        return {
            id: `em-wave-hertz-${Date.now()}`,
            title: '赫兹电磁波实验',
            model: 'em-wave-hertz' as const,
            bodies: [
                {
                    id: 'antenna',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: { hertzExperiment: { frequency, turns, sparkGap, distance } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};

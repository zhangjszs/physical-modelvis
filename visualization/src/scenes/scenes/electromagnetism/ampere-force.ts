import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const ampere_forceScene: SceneConfig = {
    id: 'ampere-force',
    name: '安培力因素 (F=BIL·sinθ)',
    model: 'ampere-force' as const,
    parameters: [
        {
            name: 'B',
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
            name: 'I',
            label: '电流 I',
            unit: 'A',
            value: 2,
            min: 0,
            max: 20,
            step: 0.1,
            default: 2,
            description: '导线电流'
        },
        {
            name: 'L',
            label: '导线长度 L',
            unit: 'm',
            value: 0.2,
            min: 0.01,
            max: 2,
            step: 0.01,
            default: 0.2,
            description: '导线有效长度'
        },
        {
            name: 'angle',
            label: '导线与磁场夹角 θ',
            unit: '°',
            value: 30,
            min: 0,
            max: 90,
            step: 1,
            default: 30,
            description: '电流与磁场夹角'
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
        const B = params['B'] ?? 0.5;
        const I = params['I'] ?? 2;
        const L = params['L'] ?? 0.2;
        const angle = params['angle'] ?? 30;
        const duration = params['duration'] ?? 5;
        return {
            id: `ampere-force-${Date.now()}`,
            title: '安培力因素',
            model: 'ampere-force' as const,
            bodies: [],
            constraints: { ampereForce: { B, I, L, angle } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};

import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const resistance_lawScene: SceneConfig = {
    id: 'resistance-law',
    name: '电阻定律 (R=ρ·L/S)',
    model: 'resistance-law' as const,
    parameters: [
        {
            name: 'length',
            label: '导线长度 L',
            unit: 'm',
            value: 1,
            min: 0.01,
            max: 100,
            step: 0.01,
            default: 1,
            description: '导线长度'
        },
        {
            name: 'diameter',
            label: '导线直径 d',
            unit: 'mm',
            value: 1,
            min: 0.1,
            max: 10,
            step: 0.1,
            default: 1,
            description: '导线直径 (mm)'
        },
        {
            name: 'material',
            label: '材料 (0=铜 1=铁 2=镍铬)',
            unit: '',
            value: 0,
            min: 0,
            max: 2,
            step: 1,
            default: 0,
            description: '导体材料'
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
        const length = params['length'] ?? 1;
        const diameter = params['diameter'] ?? 1;
        const matNum = params['material'] ?? 0;
        const material = (matNum === 1 ? 'Fe' : matNum === 2 ? 'Nichrome' : 'Cu') as 'Cu' | 'Fe' | 'Nichrome';
        const duration = params['duration'] ?? 5;
        return {
            id: `resistance-law-${Date.now()}`,
            title: '电阻定律',
            model: 'resistance-law' as const,
            bodies: [],
            constraints: { resistanceLaw: { length, diameter, material } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};

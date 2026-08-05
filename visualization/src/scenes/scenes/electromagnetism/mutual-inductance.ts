import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const mutual_inductanceScene: SceneConfig = {
    id: 'mutual-inductance',
    name: '互感现象 (双线圈)',
    model: 'mutual-inductance' as const,
    parameters: [
        {
            name: 'L1',
            label: '原线圈自感 L₁',
            unit: 'H',
            value: 0.1,
            min: 1e-6,
            max: 1000,
            step: 0.01,
            default: 0.1,
            description: '原线圈自感 L1'
        },
        {
            name: 'L2',
            label: '副线圈自感 L₂',
            unit: 'H',
            value: 0.05,
            min: 1e-6,
            max: 1000,
            step: 0.01,
            default: 0.05,
            description: '副线圈自感 L2'
        },
        {
            name: 'coupling',
            label: '耦合系数 k',
            unit: '',
            value: 0.6,
            min: 0,
            max: 1,
            step: 0.01,
            default: 0.6,
            description: '耦合系数 (0=无耦合, 1=理想变压器)'
        },
        {
            name: 'frequency',
            label: '交流频率 f',
            unit: 'Hz',
            value: 50,
            min: 1,
            max: 1e5,
            step: 1,
            default: 50,
            description: '原边交流频率'
        },
        {
            name: 'primaryCurrent',
            label: '原边电流峰值 I₀',
            unit: 'A',
            value: 1,
            min: 0,
            max: 100,
            step: 0.1,
            default: 1,
            description: '原边交流电流幅值 I0'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 0.2,
            min: 0.05,
            max: 2,
            step: 0.05,
            default: 0.2,
            description: '仿真总时长'
        }
    ],
    buildProblem: params => {
        const L1 = params['L1'] ?? 0.1;
        const L2 = params['L2'] ?? 0.05;
        const coupling = params['coupling'] ?? 0.6;
        const frequency = params['frequency'] ?? 50;
        const primaryCurrent = params['primaryCurrent'] ?? 1;
        const duration = params['duration'] ?? 0.2;
        return {
            id: `mutInd-${Date.now()}`,
            title: '互感现象 (双线圈)',
            model: 'mutual-inductance',
            bodies: [
                {
                    id: 'primary',
                    mass: { value: 0.1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                mutualInductance: { L1, L2, coupling, frequency, primaryCurrent }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 1000)
        };
    }
};

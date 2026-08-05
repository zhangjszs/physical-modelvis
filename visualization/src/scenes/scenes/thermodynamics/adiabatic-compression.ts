import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const adiabatic_compressionScene: SceneConfig = {
    id: 'adiabatic-compression',
    name: '绝热压缩 (气体点火)',
    model: 'adiabatic-compression',
    parameters: [
        {
            name: 'initialTemp',
            label: '初始温度 T₁',
            unit: 'K',
            value: 300,
            min: 250,
            max: 400,
            step: 5,
            default: 300,
            description: '压缩前气体初温 (K)'
        },
        {
            name: 'compressionRatio',
            label: '压缩比 r = V₁/V₂',
            unit: '',
            value: 9,
            min: 3,
            max: 20,
            step: 0.5,
            default: 9,
            description: '汽油机典型压缩比 8~12; 柴油机 15~22'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 5,
            min: 1,
            max: 30,
            step: 0.5,
            default: 5,
            description: '绝热 T-p-V 曲线展示时长'
        }
    ],
    buildProblem: params => {
        const initialTemp = params['initialTemp'] ?? 300;
        const compressionRatio = params['compressionRatio'] ?? 9;
        const duration = params['duration'] ?? 5;
        return {
            id: `adiabatic-${Date.now()}`,
            title: '绝热压缩 (气体点火)',
            model: 'adiabatic-compression' as const,
            bodies: [
                { id: 'piston', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                adiabaticCompression: {
                    initialTemp,
                    compressionRatio,
                    gamma: 1.4
                }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100)
        };
    }
};

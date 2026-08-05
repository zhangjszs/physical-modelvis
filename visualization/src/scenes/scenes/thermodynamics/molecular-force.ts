import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const molecular_forceScene: SceneConfig = {
    id: 'molecular-force',
    name: '分子力曲线 (F-r)',
    model: 'molecular-force',
    parameters: [
        {
            name: 'epsilon',
            label: '势阱深度 ε',
            unit: '×10⁻²¹ J',
            value: 1.0,
            min: 0.01,
            max: 10,
            step: 0.01,
            default: 1.0,
            description: 'Lennard-Jones 势参数 (典型 10⁻²¹ J 量级)'
        },
        {
            name: 'sigma',
            label: '分子直径 σ',
            unit: 'nm',
            value: 0.34,
            min: 0.1,
            max: 1.0,
            step: 0.01,
            default: 0.34,
            description: 'LJ 直径参数 (典型 0.3-0.5 nm)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 3,
            min: 0.5,
            max: 10,
            step: 0.5,
            default: 3,
            description: 'F-r 曲线展示时长'
        }
    ],
    buildProblem: params => {
        const epsilon = (params['epsilon'] ?? 1.0) * 1e-21;
        const sigma = (params['sigma'] ?? 0.34) * 1e-9;
        const duration = params['duration'] ?? 3;
        return {
            id: `mol-force-${Date.now()}`,
            title: '分子力曲线 (F-r)',
            model: 'molecular-force',
            bodies: [
                { id: 'pair', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: { molecularForce: { epsilon, sigma } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 50)
        };
    }
};

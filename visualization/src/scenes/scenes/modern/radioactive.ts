import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const radioactiveScene: SceneConfig = {
    id: 'radioactive',
    name: '放射性衰变 (云室径迹)',
    model: 'radioactive-decay',
    parameters: [
        {
            name: 'N0',
            label: '初始原子数 N₀',
            unit: '个',
            value: 1000,
            min: 100,
            max: 10000,
            step: 100,
            default: 1000,
            description: '放射性核素初始原子数'
        },
        {
            name: 'halfLife',
            label: '半衰期 T₁/₂',
            unit: 's',
            value: 10,
            min: 0.1,
            max: 3600,
            step: 0.1,
            default: 10,
            description: '半衰期 (秒)'
        },
        {
            name: 'tEnd',
            label: '模拟时长',
            unit: 's',
            value: 50,
            min: 1,
            max: 10000,
            step: 1,
            default: 50,
            description: '模拟时间 (建议 ≥ 3×T₁/₂)'
        },
        {
            name: 'rayType',
            label: '射线 (0=α 1=β 2=γ)',
            unit: '',
            value: 0,
            min: 0,
            max: 2,
            step: 1,
            default: 0,
            description: 'α=短直径迹; β=长弯径迹; γ=极少径迹'
        }
    ],
    buildProblem: params => {
        const initialAtoms = params['N0'] ?? 1000;
        const halfLife = params['halfLife'] ?? 10;
        const duration = params['tEnd'] ?? 5 * halfLife;
        const rayNum = params['rayType'] ?? 0;
        const radiationType = rayNum === 1 ? ('beta' as const) : rayNum === 2 ? ('gamma' as const) : ('alpha' as const);
        return {
            id: `radioactive-${Date.now()}`,
            title: '放射性衰变 (云室粒子径迹)',
            model: 'radioactive-decay' as const,
            bodies: [
                { id: 'nuclei', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: { radioactive: { initialAtoms, halfLife, duration, radiationType } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 300)
        };
    }
};

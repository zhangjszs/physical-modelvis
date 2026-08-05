import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const coulomb_force_exploreScene: SceneConfig = {
    id: 'coulomb-force-explore',
    name: '探究电荷间作用力 (库仑定律)',
    model: 'coulomb-force-explore' as const,
    parameters: [
        {
            name: 'q1',
            label: '电荷 q₁',
            unit: 'μC',
            value: 1,
            min: 0.01,
            max: 100,
            step: 0.1,
            default: 1,
            description: '电荷 1 电量'
        },
        {
            name: 'q2',
            label: '电荷 q₂',
            unit: 'μC',
            value: 1,
            min: 0.01,
            max: 100,
            step: 0.1,
            default: 1,
            description: '电荷 2 电量'
        },
        {
            name: 'distance',
            label: '间距 r',
            unit: 'cm',
            value: 5,
            min: 0.1,
            max: 200,
            step: 0.5,
            default: 5,
            description: '两电荷间距'
        },
        {
            name: 'mode',
            label: '探究模式 (0=改变q, 1=改变r)',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 1,
            default: 0,
            description: 'varyQ: 固定 r 改 q; varyR: 固定 q 改 r'
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
        const q1 = params['q1'] ?? 1;
        const q2 = params['q2'] ?? 1;
        const distance = params['distance'] ?? 5;
        const modeNum = params['mode'] ?? 0;
        const mode = modeNum >= 1 ? ('varyR' as const) : ('varyQ' as const);
        const duration = params['duration'] ?? 5;
        return {
            id: `coulomb-force-explore-${Date.now()}`,
            title: '探究电荷间作用力',
            model: 'coulomb-force-explore' as const,
            bodies: [],
            constraints: { coulombForce: { q1, q2, distance, mode } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};

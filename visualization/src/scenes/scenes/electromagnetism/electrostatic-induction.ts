import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const electrostatic_inductionScene: SceneConfig = {
    id: 'electrostatic-induction',
    name: '静电感应 (近/远端感应电荷)',
    model: 'electrostatic-induction' as const,
    parameters: [
        {
            name: 'chargeC',
            label: '带电体 C 电量',
            unit: 'μC',
            value: 1,
            min: 0.01,
            max: 100,
            step: 0.1,
            default: 1,
            description: '外部带电体电量'
        },
        {
            name: 'separation',
            label: 'A/B 间隙',
            unit: 'cm',
            value: 2,
            min: 0.1,
            max: 30,
            step: 0.5,
            default: 2,
            description: '两导体间隙 (cm)'
        },
        {
            name: 'distanceAC',
            label: 'A 到 C 的距离',
            unit: 'cm',
            value: 10,
            min: 0.5,
            max: 100,
            step: 0.5,
            default: 10,
            description: '导体 A 左端到 C 的距离'
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
        const chargeC = params['chargeC'] ?? 1;
        const separation = params['separation'] ?? 2;
        const distanceAC = params['distanceAC'] ?? 10;
        const duration = params['duration'] ?? 5;
        return {
            id: `electrostatic-induction-${Date.now()}`,
            title: '静电感应',
            model: 'electrostatic-induction' as const,
            bodies: [],
            constraints: { electrostaticInduction: { chargeC, separation, distanceAC } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 100, 0.01)
        };
    }
};

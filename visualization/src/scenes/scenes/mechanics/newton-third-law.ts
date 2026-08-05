import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const newton_third_lawScene: SceneConfig = {
    id: 'newton-third-law',
    name: '牛顿第三定律',
    model: 'newton-third-law',
    parameters: [
        {
            name: 'forceAB',
            label: '作用力 F_AB',
            unit: 'N',
            value: 5,
            min: -20,
            max: 20,
            step: 0.5,
            default: 5,
            description: 'A 对 B 施加的作用力 (正=向右)"'
        },
        {
            name: 'massA',
            label: '物体 A 质量',
            unit: 'kg',
            value: 1,
            min: 0.1,
            max: 10,
            step: 0.1,
            default: 1,
            description: '物体 A 的质量'
        },
        {
            name: 'massB',
            label: '物体 B 质量',
            unit: 'kg',
            value: 2,
            min: 0.1,
            max: 10,
            step: 0.1,
            default: 2,
            description: '物体 B 的质量'
        },
        {
            name: 'allowMotion',
            label: '运动模式 (1=加速 0=静止)',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 1,
            default: 0,
            description: '1=两物体在光滑水平面上共同加速；0=两物体固定，仅展示力'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 3,
            min: 0.5,
            max: 20,
            step: 0.5,
            default: 3,
            description: '仿真总时长'
        }
    ],
    buildProblem: params => {
        const forceAB = params['forceAB'] ?? 5;
        const massA = params['massA'] ?? 1;
        const massB = params['massB'] ?? 2;
        const allowMotion = (params['allowMotion'] ?? 0) === 1;
        const duration = params['duration'] ?? 3;
        return {
            id: `newton-third-law-${Date.now()}`,
            title: '牛顿第三定律 (作用力与反作用力)',
            model: 'newton-third-law',
            bodies: [
                {
                    id: 'A',
                    mass: { value: massA, unit: 'kg' },
                    position: { x: -1, y: 0 },
                    velocity: { x: 0, y: 0 }
                },
                { id: 'B', mass: { value: massB, unit: 'kg' }, position: { x: 1, y: 0 }, velocity: { x: 0, y: 0 } }
            ],
            constraints: {
                newtonThirdLaw: { forceAB, allowMotion }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 300)
        };
    }
};

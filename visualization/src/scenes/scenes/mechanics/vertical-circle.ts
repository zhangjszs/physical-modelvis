import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const vertical_circleScene: SceneConfig = {
    id: 'vertical-circle',
    name: '竖直圆周最高点条件',
    model: 'vertical-circle',
    parameters: [
        {
            name: 'modelType',
            label: '约束类型',
            unit: '',
            value: 0,
            min: 0,
            max: 2,
            step: 1,
            default: 0,
            description: '0=绳 1=杆 2=圆环'
        },
        {
            name: 'length',
            label: '半径 r',
            unit: 'm',
            value: 1,
            min: 0.1,
            max: 5,
            step: 0.1,
            default: 1,
            description: '圆周运动半径 (绳/杆长)'
        },
        {
            name: 'mass',
            label: '质量 m',
            unit: 'kg',
            value: 1,
            min: 0.1,
            max: 10,
            step: 0.1,
            default: 1,
            description: '运动物体质量'
        },
        {
            name: 'initialSpeed',
            label: '最低点速度 v₀',
            unit: 'm/s',
            value: 7.5,
            min: 0,
            max: 15,
            step: 0.5,
            default: 7.5,
            description: '最低点初速度 (决定能否通过最高点)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 5,
            min: 1,
            max: 15,
            step: 0.5,
            default: 5,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const types = ['rope', 'rod', 'ring'] as const;
        const typeIdx = Math.round(params['modelType'] ?? 0);
        const length = params['length'] ?? 1;
        const mass = params['mass'] ?? 1;
        const initialSpeed = params['initialSpeed'] ?? 7.5;
        const duration = params['duration'] ?? 5;
        return {
            id: `vc-${Date.now()}`,
            title: '竖直圆周最高点',
            model: 'vertical-circle',
            bodies: [
                {
                    id: 'ball',
                    mass: { value: mass, unit: 'kg' },
                    position: { x: length, y: 0 },
                    velocity: { x: 0, y: initialSpeed }
                }
            ],
            constraints: { verticalCircle: { length, mass, modelType: types[typeIdx] ?? 'rope', initialSpeed } },
            environment: { gravity: { enabled: true, value: 9.8 } },
            timeConfig: makeTimeSeries(duration, 500)
        };
    }
};

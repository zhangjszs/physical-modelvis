import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const curve_conditionScene: SceneConfig = {
    id: 'curve-condition',
    name: '曲线运动条件',
    model: 'curve-condition',
    parameters: [
        {
            name: 'forceAngle',
            label: '力的方向角',
            unit: '°',
            value: 45,
            min: 0,
            max: 180,
            step: 5,
            default: 45,
            description: '合力与水平面的夹角'
        },
        {
            name: 'initialSpeed',
            label: '初速度 v₀',
            unit: 'm/s',
            value: 5,
            min: 1,
            max: 30,
            step: 0.5,
            default: 5,
            description: '初速度大小 (水平向右)'
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
            description: '物体质量'
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
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const forceAngle = params['forceAngle'] ?? 45;
        const v0 = params['initialSpeed'] ?? 5;
        const m = params['mass'] ?? 1;
        const duration = params['duration'] ?? 3;
        return {
            id: `cc-${Date.now()}`,
            title: '曲线运动条件',
            model: 'curve-condition',
            bodies: [
                { id: 'obj', mass: { value: m, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: v0, y: 0 } }
            ],
            constraints: {
                curveCondition: { forceDirectionDeg: forceAngle, initialSpeed: v0, mass: m, forceMagnitude: m * 2 }
            },
            environment: {},
            timeConfig: makeTimeSeries(duration, 500)
        };
    }
};

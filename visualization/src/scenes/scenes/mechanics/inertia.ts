import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const inertiaScene: SceneConfig = {
    id: 'inertia',
    name: '惯性实验 (棋子/鸡蛋/小车)',
    model: 'inertia',
    parameters: [
        {
            name: 'mode',
            label: '演示实验',
            unit: '',
            value: 0,
            min: 0,
            max: 2,
            step: 1,
            default: 0,
            description: '0=棋子打击(静→动) 1=小车急停(动→静) 2=纸板抽拉鸡蛋落水'
        },
        {
            name: 'initialSpeed',
            label: '初速度 v₀',
            unit: 'm/s',
            value: 2,
            min: 0.5,
            max: 10,
            step: 0.5,
            default: 2,
            description: '初始运动速度 (模拟棋子被击打/小车行驶的速度)'
        },
        {
            name: 'massRatio',
            label: '质量比 m上/m下',
            unit: '',
            value: 0.1,
            min: 0.01,
            max: 1,
            step: 0.01,
            default: 0.1,
            description: '上下物体质量比 (越小, 惯性现象越明显)'
        },
        {
            name: 'frictionCoeff',
            label: '摩擦系数 μ',
            unit: '',
            value: 0.3,
            min: 0,
            max: 1,
            step: 0.01,
            default: 0.3,
            description: '接触面摩擦系数'
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
        const modeIdx = Math.round(params['mode'] ?? 0);
        const modes = ['stroke', 'stop', 'smoothPull'] as const;
        const mode = modes[modeIdx] ?? 'stroke';
        const initialSpeed = params['initialSpeed'] ?? 2;
        const massRatio = params['massRatio'] ?? 0.1;
        const frictionCoeff = params['frictionCoeff'] ?? 0.3;
        const duration = params['duration'] ?? 3;
        return {
            id: `inertia-${Date.now()}`,
            title: '惯性实验',
            model: 'inertia',
            bodies: [
                {
                    id: 'top',
                    mass: { value: massRatio, unit: 'kg' },
                    position: { x: 0, y: 0.5 },
                    velocity: { x: initialSpeed, y: 0 }
                },
                {
                    id: 'bottom',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: initialSpeed, y: 0 }
                }
            ],
            constraints: { inertia: { mode, initialSpeed, massRatio, frictionCoeff } },
            environment: { ground: { enabled: true, y: -0.5, friction: frictionCoeff } },
            timeConfig: makeTimeSeries(duration, 500)
        };
    }
};

import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const momentumScene: SceneConfig = {
    id: 'momentum',
    name: '动量定理与反冲',
    model: 'momentum',
    parameters: [
        {
            name: 'modeLabel',
            label: '模式 (0=动量定理 1=反冲)',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 1,
            default: 0,
            description: '0=恒力冲量演示 F·Δt = Δp；1=反冲运动 (两物体分离)'
        },
        {
            name: 'force',
            label: '恒力 F (动量定理模式)',
            unit: 'N',
            value: 10,
            min: -50,
            max: 50,
            step: 1,
            default: 10,
            description: '作用在物体上的恒力 (正=向右)'
        },
        {
            name: 'mass',
            label: '物体质量 m',
            unit: 'kg',
            value: 2,
            min: 0.1,
            max: 50,
            step: 0.5,
            default: 2,
            description: '物体1 (主物体) 质量'
        },
        {
            name: 'mass2',
            label: '物体2质量 (反冲模式)',
            unit: 'kg',
            value: 1,
            min: 0.01,
            max: 10,
            step: 0.1,
            default: 1,
            description: '反冲模式中喷出/分离的物体2质量'
        },
        {
            name: 'v2',
            label: '物体2碰后速度 (反冲)',
            unit: 'm/s',
            value: 5,
            min: -50,
            max: 50,
            step: 0.5,
            default: 5,
            description: '反冲模式中物体2获得的速度 (自动计算物体1速度)'
        },
        {
            name: 'v0',
            label: '物体1初速度',
            unit: 'm/s',
            value: 0,
            min: -30,
            max: 30,
            step: 1,
            default: 0,
            description: '物体1初始速度'
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
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const modeNum = params['modeLabel'] ?? 0;
        const mode = modeNum === 1 ? ('recoil' as const) : ('impulse' as const);
        const force = params['force'] ?? 10;
        const mass = params['mass'] ?? 2;
        const mass2 = params['mass2'] ?? 1;
        const v0 = params['v0'] ?? 0;
        const v2 = params['v2'] ?? 5;
        const duration = params['duration'] ?? 3;
        if (mode === 'recoil') {
            // 场景仅输入 m1, m2, v2；model 内部由动量守恒 (m1·v1 + m2·v2 = 0) 自动推导 v1
            // scene 不在 buildProblem 中重复计算, 避免与 model 计算结果不一致
            return {
                id: `momentum-${Date.now()}`,
                title: '反冲运动 (动量守恒)',
                model: 'momentum',
                bodies: [
                    {
                        id: 'A',
                        mass: { value: mass, unit: 'kg' },
                        position: { x: -1, y: 0 },
                        velocity: { x: 0, y: 0 }
                    },
                    {
                        id: 'B',
                        mass: { value: mass2, unit: 'kg' },
                        position: { x: 1, y: 0 },
                        velocity: { x: v2, y: 0 }
                    }
                ],
                constraints: { momentum: { mode: 'recoil' } },
                environment: {},
                timeConfig: makeTimeSeries(duration, 300)
            };
        }
        return {
            id: `momentum-${Date.now()}`,
            title: '动量定理 (F·Δt = Δp)',
            model: 'momentum',
            bodies: [
                {
                    id: 'block',
                    mass: { value: mass, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: v0, y: 0 }
                }
            ],
            constraints: { momentum: { mode: 'impulse', force } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 300)
        };
    }
};

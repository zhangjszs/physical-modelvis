import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';
import { PHYSICS_CONSTANTS } from 'physics-core';

export const projectile_collisionScene: SceneConfig = {
    id: 'projectile-collision',
    name: '平抛碰撞 (验证动量守恒)',
    model: 'projectile-collision' as const,
    parameters: [
        {
            name: 'm1',
            label: '入射球质量 m₁',
            unit: 'kg',
            value: 0.1,
            min: 0.01,
            max: 2,
            step: 0.01,
            default: 0.1,
            description: '入射小球质量 (从斜轨释放)'
        },
        {
            name: 'm2',
            label: '被撞球质量 m₂',
            unit: 'kg',
            value: 0.1,
            min: 0.01,
            max: 2,
            step: 0.01,
            default: 0.1,
            description: '静止被撞小球质量'
        },
        {
            name: 'v1Initial',
            label: '入射球碰前速度 v₁',
            unit: 'm/s',
            value: 2,
            min: 0.1,
            max: 10,
            step: 0.1,
            default: 2,
            description: '碰前入射球速度 (平抛初速)'
        },
        {
            name: 'tableHeight',
            label: '实验台高度 h',
            unit: 'm',
            value: 0.8,
            min: 0.1,
            max: 3,
            step: 0.01,
            default: 0.8,
            description: '实验台水平面高度 (决定平抛时间 t=√(2h/g))'
        },
        {
            name: 'restitution',
            label: '弹性系数 e',
            unit: '',
            value: 1,
            min: 0,
            max: 1,
            step: 0.01,
            default: 1,
            description: '1=完全弹性碰撞, 0=完全非弹性'
        },
        {
            name: 'gravity',
            label: '重力加速度 g',
            unit: 'm/s²',
            value: PHYSICS_CONSTANTS.g.value,
            min: 1,
            max: 20,
            step: 0.1,
            default: PHYSICS_CONSTANTS.g.value,
            description: '当地重力加速度'
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
            description: '仿真总时长 (覆盖完整平抛过程)'
        }
    ],
    buildProblem: params => {
        const m1 = params['m1'] ?? 0.1;
        const m2 = params['m2'] ?? 0.1;
        const v1Initial = params['v1Initial'] ?? 2;
        const tableHeight = params['tableHeight'] ?? 0.8;
        const restitution = params['restitution'] ?? 1;
        const g = params['gravity'] ?? PHYSICS_CONSTANTS.g.value;
        const duration = params['duration'] ?? 5;
        // 预计算平抛下落时长, 确保动画覆盖完整过程
        const tFall = Math.sqrt((2 * tableHeight) / g);
        const effDuration = Math.max(duration, tFall * 1.2);
        return {
            id: `pc-${Date.now()}`,
            title: '平抛碰撞 (验证动量守恒)',
            model: 'projectile-collision',
            bodies: [
                {
                    id: 'A',
                    mass: { value: m1, unit: 'kg' },
                    position: { x: 0, y: tableHeight },
                    velocity: { x: v1Initial, y: 0 }
                },
                {
                    id: 'B',
                    mass: { value: m2, unit: 'kg' },
                    position: { x: 0, y: tableHeight },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                projectileCollision: { m1, m2, v1Initial, tableHeight, restitution, gravity: g }
            },
            environment: {
                gravity: { enabled: true, value: g },
                ground: { enabled: true, y: 0 }
            },
            timeConfig: makeTimeSeries(effDuration, 300)
        };
    }
};

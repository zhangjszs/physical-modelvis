import type { SceneConfig } from '../../../types/visualization';
import { PHYSICS_CONSTANTS } from 'physics-core';

export const projectileScene: SceneConfig = {
    id: 'projectile',
    name: '抛体运动 (平抛+斜抛)',
    model: 'projectile',
    parameters: [
        {
            name: 'v0',
            label: '初速度 v₀',
            unit: 'm/s',
            value: 20,
            min: 1,
            max: 100,
            step: 1,
            default: 20,
            description: '物体开始运动时的速度大小'
        },
        {
            name: 'angle',
            label: '发射角 θ',
            unit: '°',
            value: 45,
            min: 0,
            max: 90,
            step: 1,
            default: 45,
            description: '初速度方向与水平面的夹角 (0°=平抛, 90°=竖直上抛)'
        },
        {
            name: 'h0',
            label: '发射高度 h₀',
            unit: 'm',
            value: 2,
            min: 0,
            max: 100,
            step: 1,
            default: 2,
            description: '发射点相对地面的初始高度'
        },
        {
            name: 'g',
            label: '重力加速度 g',
            unit: 'm/s²',
            value: PHYSICS_CONSTANTS.g.value,
            min: 0.1,
            max: 30,
            step: 0.1,
            default: PHYSICS_CONSTANTS.g.value,
            description: '重力加速度大小'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 5,
            min: 0.5,
            max: 30,
            step: 0.5,
            default: 5,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const v0 = params['v0'] ?? 20;
        const angleDeg = params['angle'] ?? 45;
        const h0 = params['h0'] ?? 0;
        const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
        const duration = params['duration'] ?? 5;
        const angleRad = (angleDeg * Math.PI) / 180;
        const v0x = v0 * Math.cos(angleRad);
        const v0y = v0 * Math.sin(angleRad);
        return {
            id: `projectile-${Date.now()}`,
            title: '抛体运动',
            model: 'projectile',
            bodies: [
                {
                    id: 'ball',
                    mass: { value: 1, unit: 'kg' },
                    position: { x: 0, y: h0 },
                    velocity: { x: v0x, y: v0y }
                }
            ],
            environment: {
                gravity: { enabled: true, value: g },
                ground: { enabled: true, y: 0 }
            },
            timeConfig: { duration, dt: Math.min(0.01, duration / 1000), sampleCount: 1000 }
        };
    }
};

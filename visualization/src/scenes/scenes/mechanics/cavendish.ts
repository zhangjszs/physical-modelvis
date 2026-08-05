import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const cavendishScene: SceneConfig = {
    id: 'cavendish',
    name: '卡文迪什扭秤测 G',
    model: 'cavendish',
    parameters: [
        {
            name: 'm1',
            label: '大球质量 m₁',
            unit: 'kg',
            value: 10,
            min: 0.1,
            max: 1000,
            step: 0.1,
            default: 10,
            description: '大铅球质量'
        },
        {
            name: 'm2',
            label: '小球质量 m₂',
            unit: 'kg',
            value: 0.5,
            min: 0.01,
            max: 10,
            step: 0.01,
            default: 0.5,
            description: '小铅球质量'
        },
        {
            name: 'distance',
            label: '球心距离 r',
            unit: 'm',
            value: 0.1,
            min: 0.01,
            max: 0.5,
            step: 0.01,
            default: 0.1,
            description: '大球与小球的球心距离'
        },
        {
            name: 'torsionConst',
            label: '悬丝扭转常数 k',
            unit: 'N·m/rad',
            value: 1e-4,
            min: 1e-10,
            max: 1e-2,
            step: 0,
            default: 1e-4,
            description: '悬丝的扭转常数 (torsion wire stiffness)'
        },
        {
            name: 'mirrorDist',
            label: '镜面到屏距离 D',
            unit: 'm',
            value: 5,
            min: 0.5,
            max: 20,
            step: 0.5,
            default: 5,
            description: '光杠杆的放大臂长'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 1,
            min: 0.5,
            max: 5,
            step: 0.1,
            default: 1,
            description: '静态演示场景'
        }
    ],
    buildProblem: params => {
        const m1 = params['m1'] ?? 10;
        const m2 = params['m2'] ?? 0.5;
        const distance = params['distance'] ?? 0.1;
        const torsionConst = params['torsionConst'] ?? 1e-4;
        const mirrorDist = params['mirrorDist'] ?? 5;
        const duration = params['duration'] ?? 1;
        return {
            id: `cav-${Date.now()}`,
            title: '卡文迪什扭秤',
            model: 'cavendish',
            bodies: [
                {
                    id: 'smallBall',
                    mass: { value: m2, unit: 'kg' },
                    position: { x: distance, y: 0 },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: { cavendish: { m1, m2, distance, torsionConst, mirrorDist, armLength: 1 } },
            environment: {},
            timeConfig: makeTimeSeries(duration, 50)
        };
    }
};

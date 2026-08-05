import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const newton_second_lawScene: SceneConfig = {
    id: 'newton-second-law',
    name: '牛顿第二定律 F=ma',
    model: 'newton-second-law',
    parameters: [
        {
            name: 'force',
            label: '合外力 F',
            unit: 'N',
            value: 10,
            min: -100,
            max: 100,
            step: 0.5,
            default: 10,
            description: '作用在物体上的合外力 (正=向右，负=向左)'
        },
        {
            name: 'mass',
            label: '物体质量 m',
            unit: 'kg',
            value: 2,
            min: 0.1,
            max: 50,
            step: 0.1,
            default: 2,
            description: '物体质量 (kg)'
        },
        {
            name: 'v0',
            label: '初速度 v₀',
            unit: 'm/s',
            value: 0,
            min: -50,
            max: 50,
            step: 0.5,
            default: 0,
            description: '物体初始速度'
        },
        {
            name: 'includeFriction',
            label: '考虑摩擦 (1=是 0=否)',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 1,
            default: 0,
            description: '是否考虑地面滑动摩擦力'
        },
        {
            name: 'friction',
            label: '摩擦系数 μ',
            unit: '',
            value: 0.2,
            min: 0,
            max: 1,
            step: 0.01,
            default: 0.2,
            description: '地面与物体间的动摩擦因数'
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
        const force = params['force'] ?? 10;
        const mass = params['mass'] ?? 2;
        const v0 = params['v0'] ?? 0;
        const includeFriction = (params['includeFriction'] ?? 0) === 1;
        const friction = params['friction'] ?? 0.2;
        const duration = params['duration'] ?? 5;
        return {
            id: `newton-second-law-${Date.now()}`,
            title: '牛顿第二定律 (F=ma)',
            model: 'newton-second-law',
            bodies: [
                {
                    id: 'block',
                    mass: { value: mass, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    velocity: { x: v0, y: 0 }
                }
            ],
            constraints: { newtonSecondLaw: { force, includeFriction } },
            environment: {
                ground: { enabled: true, y: 0, friction: includeFriction ? friction : 0 }
            },
            timeConfig: makeTimeSeries(duration, 500)
        };
    }
};

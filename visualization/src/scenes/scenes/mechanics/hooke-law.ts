import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';
import { PHYSICS_CONSTANTS } from 'physics-core';

export const hooke_lawScene: SceneConfig = {
    id: 'hooke-law',
    name: '胡克定律 F=kx',
    model: 'spring-oscillator',
    parameters: [
        {
            name: 'k',
            label: '劲度系数 k',
            unit: 'N/m',
            value: 20,
            min: 1,
            max: 200,
            step: 1,
            default: 20,
            description: '弹簧的劲度系数，反映弹簧"软硬程度"'
        },
        {
            name: 'massPerWeight',
            label: '钩码质量 m',
            unit: 'g',
            value: 50,
            min: 10,
            max: 200,
            step: 5,
            default: 50,
            description: '每个钩码的质量 (常见 50g)'
        },
        {
            name: 'weightCount',
            label: '钩码数量 n',
            unit: '个',
            value: 4,
            min: 0,
            max: 10,
            step: 1,
            default: 4,
            description: '悬挂的钩码个数'
        },
        {
            name: 'g',
            label: '重力加速度 g',
            unit: 'm/s²',
            value: PHYSICS_CONSTANTS.g.value,
            min: 1,
            max: 20,
            step: 0.1,
            default: PHYSICS_CONSTANTS.g.value,
            description: '重力加速度'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 2,
            min: 0.5,
            max: 10,
            step: 0.5,
            default: 2,
            description: '仿真总时长 (用于动画展示)'
        }
    ],
    buildProblem: params => {
        const k = params['k'] ?? 20;
        const massPerWeight_g = params['massPerWeight'] ?? 50;
        const weightCount = params['weightCount'] ?? 4;
        const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
        const duration = params['duration'] ?? 2;
        const m = (massPerWeight_g / 1000) * Math.max(1, weightCount); // 至少 1 个钩码避免 0 质量
        // 弹簧从原长 L0=0 开始，挂上钩码后平衡位置 x = mg/k
        const x_eq = (m * g) / k;
        return {
            id: `hooke-law-${Date.now()}`,
            title: '胡克定律 (弹簧弹力与形变量)',
            model: 'spring-oscillator',
            bodies: [
                {
                    id: 'weight',
                    mass: { value: m, unit: 'kg' },
                    position: { x: x_eq, y: 0 }, // 从平衡位置开始 (静止)
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                spring: { springConstant: k, naturalLength: 0, anchorPoint: { x: 0, y: 0 } }
            },
            environment: { gravity: { enabled: true, value: g } },
            timeConfig: makeTimeSeries(duration, 200)
        };
    }
};

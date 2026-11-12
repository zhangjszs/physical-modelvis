import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';
import { PHYSICS_CONSTANTS } from 'physics-core';

export const energy_conservationScene: SceneConfig = {
    id: 'energy-conservation',
    name: '机械能守恒定律 (动能↔势能)',
    model: 'uniform-accelerated',
    parameters: [
        {
            name: 'h0',
            label: '释放高度 h',
            unit: 'm',
            value: 10,
            min: 1,
            max: 100,
            step: 1,
            default: 10,
            description: '小球初始高度 (相对地面)'
        },
        {
            name: 'v0',
            label: '初速度 v₀ (水平)',
            unit: 'm/s',
            value: 0,
            min: -30,
            max: 30,
            step: 1,
            default: 0,
            description: '小球初始速度 (0=自由落体释放, >0=带初速抛射)'
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
            description: '小球质量'
        },
        {
            name: 'g',
            label: '重力加速度 g',
            unit: 'm/s²',
            value: PHYSICS_CONSTANTS.g.value,
            min: 1,
            max: 30,
            step: 0.1,
            default: PHYSICS_CONSTANTS.g.value,
            description: '重力加速度'
        },
        {
            name: 'friction',
            label: '摩擦力 (N)',
            unit: 'N',
            value: 0,
            min: 0,
            max: 20,
            step: 0.5,
            default: 0,
            description: '恒定阻力 (0=光滑 → 机械能守恒; >0 → 机械能损失)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 3,
            min: 0.5,
            max: 30,
            step: 0.5,
            default: 3,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const h0 = params['h0'] ?? 10;
        const v0 = params['v0'] ?? 0;
        const mass = params['mass'] ?? 1;
        const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
        const friction = params['friction'] ?? 0;
        const duration = params['duration'] ?? 3;
        const v0x = v0;
        const v0y = 0; // 平抛/自由落体
        // 仿真时长截到**触地时刻** (#159 逐节审计):
        // 引擎 uniform-accelerated 是解析模型, 不消费 environment.ground 的约束,
        // 若让它跑过落地点, 轨迹会继续外推到地面以下 (h₀=10m, 3s → y=−44.1m),
        // 势能变负、动能虚涨, 「机械能守恒」这一节的结论被引擎自身的数字否定。
        const tGround = Math.sqrt((2 * h0) / Math.max(1e-6, g));
        const simDuration = Math.max(0.1, Math.min(duration, tGround));
        return {
            id: `energy-${Date.now()}`,
            title: '机械能守恒定律',
            model: 'uniform-accelerated',
            bodies: [
                {
                    id: 'ball',
                    mass: { value: mass, unit: 'kg' },
                    position: { x: 0, y: h0 },
                    velocity: { x: v0x, y: v0y }
                }
            ],
            environment: {
                gravity: { enabled: true, value: g },
                // 摩擦设定保留在 environment 里 (引擎 uniform-accelerated 目前不消费它,
                // 板书已显式标注该事实, 避免「宣称能量损耗但引擎没算」的假象)
                ground:
                    friction > 0 ? { enabled: true, y: 0, friction: friction / (mass * g) } : { enabled: true, y: 0 }
            },
            timeConfig: makeTimeSeries(simDuration, 500)
        };
    }
};

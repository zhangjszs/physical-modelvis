import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const work_energyScene: SceneConfig = {
    id: 'work-energy',
    name: '动能定理 W = ΔEk',
    model: 'uniform-accelerated',
    parameters: [
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
            name: 'force',
            label: '合外力 F',
            unit: 'N',
            value: 5,
            min: 0.1,
            max: 50,
            step: 0.5,
            default: 5,
            description: '物体所受合外力 (沿运动方向)'
        },
        {
            name: 'v0',
            label: '初速度 v₀',
            unit: 'm/s',
            value: 0,
            min: 0,
            max: 20,
            step: 0.5,
            default: 0,
            description: '初速度'
        },
        {
            name: 'duration',
            label: '动画时长',
            unit: 's',
            value: 3,
            min: 0.5,
            max: 10,
            step: 0.5,
            default: 3,
            description: '动画播放时长'
        }
    ],
    buildProblem: params => {
        const m = params['mass'] ?? 1;
        const F = params['force'] ?? 5;
        const v0 = params['v0'] ?? 0;
        const duration = params['duration'] ?? 3;
        const a = F / Math.max(1e-6, m);
        return {
            id: `work-energy-${Date.now()}`,
            title: '动能定理',
            model: 'uniform-accelerated' as const,
            bodies: [
                {
                    id: 'object',
                    mass: { value: m, unit: 'kg' },
                    position: { x: 0, y: 0 },
                    // 初速度对齐合外力方向 (重力向下): 取 -v0, 使 v0 与加速度同向,
                    // 从而 W = F·s = ½m(v0+at)² − ½mv0² = ΔEk 对任意 v0 严格成立。
                    // 若取 +v0 (向上), 则模型为上抛, speed=|v0−at|, 与渲染器 W=F·s 在 v0≠0 时分歧。
                    velocity: { x: 0, y: -v0 }
                }
            ],
            environment: { gravity: { enabled: true, value: a } },
            timeConfig: makeTimeSeries(duration, 1000)
        };
    }
};

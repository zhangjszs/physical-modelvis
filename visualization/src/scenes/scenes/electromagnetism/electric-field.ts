import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

/**
 * 匀强电场中的带电粒子偏转 (类平抛实验)
 *
 * 口径修正 (#159 逐节审计 · 问题一·物理 · 阻断):
 *   旧默认 q = 1.6×10⁻¹⁹ C (质子)、m = 1.67×10⁻²⁷ kg、Ey = 100 N/C
 *   → a = qE/m = 9.58×10⁹ m/s², t = 2 s 时 v = 1.92×10¹⁰ m/s (64 倍光速)、
 *   y = 1.92×10¹⁰ m。引擎自己的适用条件写着「粒子速度远小于光速」, 默认参数却
 *   直接违反; 画面上粒子瞬间出屏, 无法观察任何偏转过程。
 *
 *   现在改用**演示用宏观带电小球量级**: q = 2×10⁻⁸ C、m = 2×10⁻⁷ kg
 *   (q/m = 0.1 C/kg), Ey = 10 N/C → a = 1 m/s², v₀x = 4 m/s, t = 1.5 s
 *   → x = 6.00 m、y = 1.125 m, 偏转/水平 = 18.8% (类平抛观感), 且全程亚光速。
 */
export const electric_fieldScene: SceneConfig = {
    id: 'electric-field',
    name: '匀强电场',
    model: 'uniform-electric-field',
    parameters: [
        {
            name: 'v0x',
            label: '水平初速度 vx₀',
            unit: 'm/s',
            value: 4,
            min: -20,
            max: 20,
            step: 0.5,
            default: 4,
            description: '水平方向初速度'
        },
        {
            name: 'v0y',
            label: '竖直初速度 vy₀',
            unit: 'm/s',
            value: 0,
            min: -20,
            max: 20,
            step: 0.5,
            default: 0,
            description: '竖直方向初速度'
        },
        {
            name: 'charge',
            label: '电荷量 q',
            unit: '×10⁻⁸ C',
            value: 2,
            min: -10,
            max: 10,
            step: 0.5,
            default: 2,
            description: '带电小球电荷量（正=正电荷，负=负电荷）'
        },
        {
            name: 'mass',
            label: '质量 m',
            unit: '×10⁻⁷ kg',
            value: 2,
            min: 0.1,
            max: 20,
            step: 0.1,
            default: 2,
            description: '带电小球质量'
        },
        {
            name: 'Ey',
            label: '电场强度 Ey',
            unit: 'N/C',
            value: 10,
            min: -100,
            max: 100,
            step: 1,
            default: 10,
            description: '匀强电场的 y 分量（正=向上，负=向下）'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 1.5,
            min: 0.1,
            max: 20,
            step: 0.1,
            default: 1.5,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const v0x = params['v0x'] ?? 4;
        const v0y = params['v0y'] ?? 0;
        const q = (params['charge'] ?? 2) * 1e-8;
        const m = (params['mass'] ?? 2) * 1e-7;
        const Ey = params['Ey'] ?? 10;
        const duration = params['duration'] ?? 1.5;
        return {
            id: `electric-field-${Date.now()}`,
            title: '匀强电场',
            model: 'uniform-electric-field',
            bodies: [
                {
                    id: 'charge',
                    mass: { value: m, unit: 'kg' },
                    charge: { value: q, unit: 'C' },
                    position: { x: 0, y: 0 },
                    velocity: { x: v0x, y: v0y }
                }
            ],
            environment: {
                electricField: { enabled: true, fieldVector: { x: 0, y: Ey } }
            },
            timeConfig: makeTimeSeries(duration, 1000, 0.001)
        };
    }
};

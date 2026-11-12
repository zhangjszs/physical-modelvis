import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

/**
 * 匀强磁场中的带电粒子回旋 (洛伦兹力提供向心力)
 *
 * 口径修正 (#159 逐节审计 · 问题一·物理 · 阻断):
 *   旧默认 q = 1.6×10⁻¹⁹ C、m = 1.67×10⁻²⁷ kg、v₀ = 1000 m/s、B = 0.01 T
 *   → R = mv/(qB) = 1.04×10⁻³ m (1 mm), 周期 T = 2πm/(qB) ≈ 6.6×10⁻⁷ s。
 *   10 ms 的仿真时长里粒子绕 1500 圈 —— 屏幕上看不出「回旋」, 只有一团静止大球。
 *
 *   现在改用**演示用宏观带电小球量级**: q = 2×10⁻⁶ C、m = 2×10⁻⁸ kg
 *   (q/m = 100 C/kg), B = 0.5 T、v₀ = 25 m/s
 *   → R = mv/(qB) = 0.50 m、T = 2πm/(qB) = 0.1257 s, 时长 0.30 s ≈ 2.4 个周期:
 *   轨道半径与器材同量级, 且一圈半之内就能看清「洛伦兹力垂直于速度、粒子做匀速圆周运动」。
 *
 * 磁场方向说明: 引擎 `uniform-magnetic-field` 只读 `environment.magneticField.fieldStrength`
 *   (恒为 +z, 即垂直纸面向外 ⊙), 不消费 `direction` 字段 —— 渲染层必须画 ⊙,
 *   与引擎保持一致 (旧版画 ⊗ = 垂直纸面向里, 与引擎的转向相反)。
 */
export const magnetic_fieldScene: SceneConfig = {
    id: 'magnetic-field',
    name: '匀强磁场',
    model: 'uniform-magnetic-field',
    parameters: [
        {
            name: 'v0x',
            label: '水平初速度 vx₀',
            unit: 'm/s',
            value: 25,
            min: 0,
            max: 200,
            step: 1,
            default: 25,
            description: '水平方向初速度'
        },
        {
            name: 'v0y',
            label: '竖直初速度 vy₀',
            unit: 'm/s',
            value: 0,
            min: -200,
            max: 200,
            step: 1,
            default: 0,
            description: '竖直方向初速度'
        },
        {
            name: 'charge',
            label: '电荷量 q',
            unit: '×10⁻⁶ C',
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
            unit: '×10⁻⁸ kg',
            value: 2,
            min: 0.1,
            max: 20,
            step: 0.1,
            default: 2,
            description: '带电小球质量'
        },
        {
            name: 'Bz',
            label: '磁感应强度 B',
            unit: 'T',
            value: 0.5,
            min: 0.01,
            max: 5,
            step: 0.01,
            default: 0.5,
            description: '匀强磁场强度（垂直于运动平面，方向⊙出纸面）'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 0.3,
            min: 0.01,
            max: 2,
            step: 0.01,
            default: 0.3,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const v0x = params['v0x'] ?? 25;
        const v0y = params['v0y'] ?? 0;
        const q = (params['charge'] ?? 2) * 1e-6;
        const m = (params['mass'] ?? 2) * 1e-8;
        const Bz = params['Bz'] ?? 0.5;
        const duration = params['duration'] ?? 0.3;
        return {
            id: `magnetic-field-${Date.now()}`,
            title: '匀强磁场',
            model: 'uniform-magnetic-field',
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
                // direction 字段引擎不消费 (恒按 +z 出纸面处理), 仍按约定填写
                magneticField: { enabled: true, fieldStrength: Bz, direction: 'out' }
            },
            timeConfig: makeTimeSeries(duration, 1000)
        };
    }
};

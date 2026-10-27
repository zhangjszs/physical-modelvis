import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

/**
 * 电磁复合场中的带电粒子运动 (速度选择器)
 *
 * 口径修正 (#159 逐节审计 · 问题一·物理 · 阻断):
 *   旧默认 q = 1.6×10⁻¹⁹ C、m = 1.67×10⁻²⁷ kg、Ey = 10 N/C、Bz = 0.01 T、
 *   v₀x = 1000 m/s ⇒ v选择 = E/B = **1000 m/s 恰好等于 v₀** —— 粒子正好走在
 *   平衡点上做匀速直线运动，画面上「看不出任何偏转」，复合场的核心现象缺席。
 *   且 q/m = 9.58×10⁷ C/kg 下 Boris 单步转角 |q|B·dt/(2m) = 4.79 rad ≫ π/4,
 *   一旦偏离平衡点走数值路径，引擎会直接告警「回旋分辨率不足」。
 *
 *   现在改用**演示用宏观带电小球量级**: q = 2×10⁻⁶ C、m = 2×10⁻⁸ kg
 *   (q/m = 100 C/kg), Bz = 0.5 T、Ey = 22 N/C、v₀x = 20 m/s、时长 0.1 s
 *   ⇒ v选择 = E/B = **44 m/s ≠ 20 m/s** (明显不等于), 复合场中粒子走**摆线**:
 *   漂移速度 v_d = E×B/B² = E/B = 44 m/s, 回旋角频率 ω = qB/m = 50 rad/s,
 *   相对漂移的速度 v₀ − v_d = −24 m/s ⇒ 摆线摆幅 |v−v_d|/ω = 0.48 m,
 *   轨迹在 4.9 m 行程内拱起约 0.96 m —— 偏转一眼可见。
 *   Boris 单步转角 |q|B·dt/(2m) = 0.0025 rad, 数值精度充裕。
 *   把 v₀x 调到 44 m/s (或把 Ey 调到 10 N/C) 即可看到「被选中 → 直线通过」。
 *
 * 磁场方向说明: 引擎 `em-combined-field` 只读 `environment.magneticField.fieldStrength`
 *   (恒为 +z, 即**垂直纸面向外 ⊙**), 不消费 `direction` 字段 —— 渲染层必须画 ⊙,
 *   与引擎保持一致 (旧版 2D 画 ⊗、3D 靠 y 轴翻转「抵消」, 两层口径互相打架)。
 */
export const em_combinedScene: SceneConfig = {
    id: 'em-combined',
    name: '电磁复合场',
    model: 'em-combined-field',
    parameters: [
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
            name: 'v0x',
            label: '水平初速度 vx₀',
            unit: 'm/s',
            value: 20,
            min: 0,
            max: 200,
            step: 1,
            default: 20,
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
            name: 'Ey',
            label: '电场强度 Ey',
            unit: 'N/C',
            value: 22,
            min: -100,
            max: 100,
            step: 1,
            default: 22,
            description: '匀强电场 y 分量 (垂直于初速度; 速度选择器要求 E ⊥ v)'
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
            description: '匀强磁场强度 (垂直于运动平面; 引擎取 Bz = +value, 即 ⊙ 垂直纸面向外)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 0.1,
            min: 0.01,
            max: 2,
            step: 0.01,
            default: 0.1,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const q = (params['charge'] ?? 2) * 1e-6;
        const m = (params['mass'] ?? 2) * 1e-8;
        const v0x = params['v0x'] ?? 20;
        const v0y = params['v0y'] ?? 0;
        // 电场必须垂直于初速度 (E ⊥ v) 才构成速度选择器:
        // 引擎 em-combined-field 仅在 |E.x| < 1e-12 时走解析速度选择路径 (v = E/B)。
        const Ey = params['Ey'] ?? 22;
        const Bz = params['Bz'] ?? 0.5;
        const duration = params['duration'] ?? 0.1;
        return {
            id: `em-combined-${Date.now()}`,
            title: '电磁复合场',
            model: 'em-combined-field',
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
                electricField: { enabled: true, fieldVector: { x: 0, y: Ey } },
                magneticField: { enabled: true, fieldStrength: Bz, direction: 'out' }
            },
            timeConfig: makeTimeSeries(duration, 1000)
        };
    }
};

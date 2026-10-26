import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const em_combinedScene: SceneConfig = {
    id: 'em-combined',
    name: '电磁复合场',
    model: 'em-combined-field',
    parameters: [
        {
            name: 'charge',
            label: '电荷量 q',
            unit: '×10⁻¹⁹ C',
            value: 1.6,
            min: -10,
            max: 10,
            step: 0.1,
            default: 1.6,
            description: '带电粒子电荷量'
        },
        {
            name: 'mass',
            label: '质量 m',
            unit: '×10⁻²⁷ kg',
            value: 1.67,
            min: 0.01,
            max: 100,
            step: 0.01,
            default: 1.67,
            description: '粒子质量'
        },
        {
            name: 'v0x',
            label: '水平初速度 vx₀',
            unit: 'm/s',
            value: 1000,
            min: 0,
            max: 100000,
            step: 100,
            default: 1000,
            description: '水平方向初速度'
        },
        {
            name: 'v0y',
            label: '竖直初速度 vy₀',
            unit: 'm/s',
            value: 0,
            min: -100000,
            max: 100000,
            step: 100,
            default: 0,
            description: '竖直方向初速度'
        },
        {
            name: 'Ey',
            label: '电场强度 Ey',
            unit: 'N/C',
            value: 10,
            min: -1000,
            max: 1000,
            step: 1,
            default: 10,
            description: '匀强电场 y 分量 (垂直于初速度; 速度选择器要求 E ⊥ v)'
        },
        {
            name: 'Bz',
            label: '磁感应强度 B',
            unit: 'T',
            value: 0.01,
            min: 0.001,
            max: 10,
            step: 0.001,
            default: 0.01,
            description: '匀强磁场强度 (垂直于运动平面; 引擎取 Bz = +value, 即 ⊗ 垂直纸面向里)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 0.01,
            min: 0.001,
            max: 1,
            step: 0.001,
            default: 0.01,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const q = (params['charge'] ?? 1.6) * 1e-19;
        const m = (params['mass'] ?? 1.67) * 1e-27;
        const v0x = params['v0x'] ?? 1000;
        const v0y = params['v0y'] ?? 0;
        // 电场必须垂直于初速度 (E ⊥ v) 才构成速度选择器:
        // 引擎 em-combined-field 仅在 |E.x| < 1e-12 时走解析速度选择路径 (v = E/B)。
        const Ey = params['Ey'] ?? 10;
        const Bz = params['Bz'] ?? 0.01;
        const duration = params['duration'] ?? 0.01;
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
                magneticField: { enabled: true, fieldStrength: Bz, direction: 'in' }
            },
            timeConfig: makeTimeSeries(duration, 1000)
        };
    }
};

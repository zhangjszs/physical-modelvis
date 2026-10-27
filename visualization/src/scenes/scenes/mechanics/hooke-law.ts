import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';
import { PHYSICS_CONSTANTS } from 'physics-core';

/**
 * 胡克定律 F=kx —— 竖直悬挂弹簧 + 钩码
 *
 * 物理设定 (#159 逐节审计·问题一):
 *   弹簧**竖直悬挂**, 钩码从弹簧原长处由静止释放, 在重力与弹力作用下
 *   绕平衡位置 x_eq = mg/k 振动 (有空气阻尼时逐渐稳定在 x_eq)。
 *
 * 旧配置把钩码放在**水平**弹簧轴上 (anchor (0,0), body (x_eq, 0)),
 * 而 spring-oscillator 模型当时**完全忽略重力** —— 钩码既不会停在 mg/k,
 * 也会在原长附近来回穿过 (出现负伸长)。现在:
 *   1. 模型计入重力沿轴分量 (水平轴时为 0, 行为与旧版逐位一致);
 *   2. 场景改为竖直悬挂, 钩码从原长释放 → 真实呈现"挂上→过冲→稳定在 mg/k"。
 */
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
            min: 1,
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
            name: 'damping',
            label: '空气阻尼 c',
            unit: 'N·s/m',
            value: 0.2,
            min: 0,
            max: 2,
            step: 0.05,
            default: 0.2,
            description: '空气阻尼系数 (c=0 时永不停息, 钩码持续等幅振动)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 4,
            min: 0.5,
            max: 10,
            step: 0.5,
            default: 4,
            description: '仿真总时长 (钩码从原长释放到稳定所需时间)'
        }
    ],
    buildProblem: params => {
        const k = params['k'] ?? 20;
        const massPerWeight_g = params['massPerWeight'] ?? 50;
        const weightCount = Math.max(1, params['weightCount'] ?? 4);
        const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
        const duration = params['duration'] ?? 4;
        const damping = params['damping'] ?? 0.2;
        const m = (massPerWeight_g / 1000) * weightCount; // 至少 1 个钩码避免 0 质量
        // 弹簧原长 10 cm: 物体初始位于 (0, −L0) → 引擎轴向 (0,−1), 伸长量 x₀ = 0
        const naturalLength = 0.1;
        return {
            id: `hooke-law-${Date.now()}`,
            title: '胡克定律 (弹簧弹力与形变量)',
            model: 'spring-oscillator',
            bodies: [
                {
                    id: 'weight',
                    mass: { value: m, unit: 'kg' },
                    // 锚点在 (0,0), 钩码从弹簧原长处 (自然下垂长度处) 由静止释放
                    position: { x: 0, y: -naturalLength },
                    velocity: { x: 0, y: 0 }
                }
            ],
            constraints: {
                spring: { springConstant: k, naturalLength, anchorPoint: { x: 0, y: 0 } }
            },
            environment: {
                gravity: { enabled: true, value: g },
                airResistance: { enabled: damping > 0, coefficient: damping }
            },
            timeConfig: makeTimeSeries(duration, 400)
        };
    }
};

import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';

export const inclined_planeScene: SceneConfig = {
    id: 'inclined-plane',
    name: '斜面运动',
    model: 'inclined-plane',
    parameters: [
        {
            name: 'm',
            label: '质量 m',
            unit: 'kg',
            value: 1,
            min: 0.1,
            max: 100,
            step: 0.1,
            default: 1,
            description: '物体质量'
        },
        {
            name: 'theta',
            label: '倾角 θ',
            unit: '°',
            value: 30,
            min: 5,
            max: 85,
            step: 1,
            default: 30,
            description: '斜面与水平面的夹角'
        },
        {
            name: 'mu',
            label: '摩擦系数 μ',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 0.01,
            default: 0,
            description: '斜面与物体间的摩擦系数（0=光滑）'
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
            description: '沿斜面向上的初速度'
        },
        {
            name: 'inclineLength',
            label: '斜面长度 L',
            unit: 'm',
            value: 6,
            min: 1,
            max: 20,
            step: 0.5,
            default: 6,
            description: '斜面沿坡面的长度 (物体滑到底端即停)'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 's',
            value: 3,
            min: 0.5,
            max: 20,
            step: 0.5,
            default: 3,
            description: '仿真的总时长'
        }
    ],
    buildProblem: params => {
        const m = params['m'] ?? 1;
        const thetaDeg = params['theta'] ?? 30;
        const mu = params['mu'] ?? 0;
        const v0 = params['v0'] ?? 0;
        const duration = params['duration'] ?? 3;
        const inclineLength = params['inclineLength'] ?? 6;
        const thetaRad = (thetaDeg * Math.PI) / 180;
        /**
         * 初速度分解 (#159 逐节审计·问题一·严重)
         *
         * 旧实现写 `v0x = v0·cosθ, v0y = v0·sinθ` —— x 分量符号反了。
         * 引擎的下滑方向是 (cosθ, −sinθ), 于是引擎算出的沿斜面初速度
         *   v∥ = v0x·cosθ − v0y·sinθ = v0·(cos²θ − sin²θ) = v0·cos2θ
         * θ=30° 时只有 0.5·v0 且方向朝下 (与「沿斜面向上的初速度」相反),
         * θ=45° 时变成 0, θ=60° 时符号翻转 —— 物理直接讲错。
         * 现在按「沿斜面向上」正确分解: 方向 = (−cosθ, +sinθ)。
         */
        const v0x = -v0 * Math.cos(thetaRad);
        const v0y = v0 * Math.sin(thetaRad);
        // 物体初始位于斜面顶端: 斜面底端在 (L·cosθ, 0), 顶端高 L·sinθ
        const startY = inclineLength * Math.sin(thetaRad);
        return {
            id: `inclined-plane-${Date.now()}`,
            title: '斜面运动',
            model: 'inclined-plane',
            bodies: [
                {
                    id: 'block',
                    mass: { value: m, unit: 'kg' },
                    position: { x: 0, y: startY },
                    velocity: { x: v0x, y: v0y }
                }
            ],
            constraints: {
                inclinedPlane: { angle: thetaDeg, frictionCoefficient: mu, inclineLength }
            },
            environment: {
                gravity: { enabled: true, value: 9.8 }
            },
            timeConfig: makeTimeSeries(duration, 1000, 0.001)
        };
    }
};

import type { SceneConfig } from '../../../types/visualization';
import { makeTimeSeries } from '../../../utils/timeSeries.js';
import { PHYSICS_CONSTANTS } from 'physics-core';

export const circular_motionScene: SceneConfig = {
    id: 'circular-motion',
    name: '匀速圆周运动 (向心力)',
    model: 'uniform-circular-motion',
    parameters: [
        {
            name: 'mass',
            label: '小球质量 m',
            unit: 'kg',
            value: 0.2,
            min: 0.01,
            max: 5,
            step: 0.01,
            default: 0.2,
            description: '做圆周运动的小球质量'
        },
        {
            name: 'radius',
            label: '圆周半径 r',
            unit: 'm',
            value: 1.0,
            min: 0.1,
            max: 5,
            step: 0.05,
            default: 1.0,
            description: '圆周运动半径（绳长）'
        },
        {
            name: 'omega',
            label: '角速度 ω',
            unit: 'rad/s',
            value: 3.0,
            min: 0.1,
            max: 20,
            step: 0.1,
            default: 3.0,
            description: '角速度大小，越大转得越快'
        },
        {
            name: 'initialAngle',
            label: '初始角度',
            unit: '°',
            value: 0,
            min: 0,
            max: 360,
            step: 5,
            default: 0,
            description: '小球初始位置的角度（0°=正右方）'
        },
        {
            name: 'revolutions',
            label: '转动圈数',
            unit: '周',
            value: 3,
            min: 0.5,
            max: 20,
            step: 0.5,
            default: 3,
            description: '仿真显示的转动圈数'
        },
        {
            name: 'conicalMode',
            label: '圆锥摆模式 (1=是 0=否)',
            unit: '',
            value: 0,
            min: 0,
            max: 1,
            step: 1,
            default: 0,
            description: '1=启用圆锥摆 (由绳长+摆角自动推导 ω)；0=手动指定 ω'
        },
        {
            name: 'ropeLength',
            label: '圆锥摆绳长 L',
            unit: 'm',
            value: 1.0,
            min: 0.2,
            max: 3,
            step: 0.05,
            default: 1.0,
            description: '圆锥摆的摆线长度 (启用圆锥摆时生效)'
        },
        {
            name: 'conicalAngle',
            label: '圆锥摆摆角 θ',
            unit: '°',
            value: 30,
            min: 1,
            max: 80,
            step: 1,
            default: 30,
            description: '圆锥摆细绳与竖直方向夹角 (启用圆锥摆时生效)'
        }
    ],
    buildProblem: params => {
        const mass = params['mass'] ?? 0.2;
        const radius = params['radius'] ?? 1.0;
        const omega = params['omega'] ?? 3.0;
        const initialAngleDeg = params['initialAngle'] ?? 0;
        const revolutions = params['revolutions'] ?? 3;
        const conicalMode = (params['conicalMode'] ?? 0) === 1;
        const ropeLength = params['ropeLength'] ?? 1.0;
        const conicalAngleDeg = params['conicalAngle'] ?? 30;
        const phi0 = (initialAngleDeg * Math.PI) / 180;
        // 圆锥摆：ω 由 model (physics-core) 单一推导 → ω = √(g / (L·cosθ))
        // scene 仅在圆锥摆模式下计算 omega 本地副本用于 duration 估算, 不写回 constraint.angularVelocity
        const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
        const conicalAngleRad = conicalMode ? (conicalAngleDeg * Math.PI) / 180 : 0;
        const computedOmega = conicalMode ? Math.sqrt(g / (ropeLength * Math.cos(conicalAngleRad))) : null;
        const finalRadius = conicalMode ? ropeLength * Math.sin(conicalAngleRad) : radius;
        // 用于时长计算的 omega：圆锥摆使用推导值, 否则使用 UI 值
        const effectiveOmega = computedOmega ?? omega;
        const duration = (2 * Math.PI * revolutions) / effectiveOmega;
        return {
            id: `circular-motion-${Date.now()}`,
            title: conicalMode ? '圆锥摆 (圆锥曲线运动)' : '匀速圆周运动 (向心力)',
            model: 'uniform-circular-motion' as const,
            bodies: [
                {
                    id: 'ball',
                    mass: { value: mass, unit: 'kg' },
                    position: { x: finalRadius * Math.cos(phi0), y: finalRadius * Math.sin(phi0) },
                    // 速度：非圆锥摆模式使用 scene omega；圆锥摆模式下 velocity 为占位，model 会重新计算
                    velocity: {
                        x: -finalRadius * effectiveOmega * Math.sin(phi0),
                        y: finalRadius * effectiveOmega * Math.cos(phi0)
                    }
                }
            ],
            constraints: {
                circularMotion: {
                    center: { x: 0, y: 0 },
                    radius: finalRadius,
                    // 圆锥摆模式下 angularVelocity 为占位值；model 根据 conicalAngleDeg + ropeLength + g 自动覆盖
                    angularVelocity: computedOmega ?? omega,
                    initialAngle: phi0,
                    ...(conicalMode ? { conicalAngleDeg, ropeLength } : {})
                }
            },
            environment: {
                gravity: { enabled: false }
            },
            timeConfig: makeTimeSeries(duration, 600)
        };
    }
};

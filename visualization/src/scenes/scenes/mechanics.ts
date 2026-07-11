import { makeTimeSeries } from '../../utils/timeSeries.js';
import type { SceneConfig } from '../../types/visualization';
import { PHYSICS_CONSTANTS } from 'physics-core';

/**
 * 力学 (必修一二 + 选必一 振动/动量/波)
 * 共 44 个 SceneConfig
 */
export const MechanicsScenes: SceneConfig[] = [
    {
            id: 'projectile',
            name: '抛体运动 (平抛+斜抛)',
            model: 'projectile',
            parameters: [
                {
                    name: 'v0',
                    label: '初速度 v₀',
                    unit: 'm/s',
                    value: 20,
                    min: 1,
                    max: 100,
                    step: 1,
                    default: 20,
                    description: '物体开始运动时的速度大小'
                },
                {
                    name: 'angle',
                    label: '发射角 θ',
                    unit: '°',
                    value: 45,
                    min: 0,
                    max: 90,
                    step: 1,
                    default: 45,
                    description: '初速度方向与水平面的夹角 (0°=平抛, 90°=竖直上抛)'
                },
                {
                    name: 'h0',
                    label: '发射高度 h₀',
                    unit: 'm',
                    value: 2,
                    min: 0,
                    max: 100,
                    step: 1,
                    default: 2,
                    description: '发射点相对地面的初始高度'
                },
                {
                    name: 'g',
                    label: '重力加速度 g',
                    unit: 'm/s²',
                    value: PHYSICS_CONSTANTS.g.value,
                    min: 0.1,
                    max: 30,
                    step: 0.1,
                    default: PHYSICS_CONSTANTS.g.value,
                    description: '重力加速度大小'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 5,
                    min: 0.5,
                    max: 30,
                    step: 0.5,
                    default: 5,
                    description: '仿真的总时长'
                }
            ],
            buildProblem: params => {
                const v0 = params['v0'] ?? 20;
                const angleDeg = params['angle'] ?? 45;
                const h0 = params['h0'] ?? 0;
                const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
                const duration = params['duration'] ?? 5;
                const angleRad = (angleDeg * Math.PI) / 180;
                const v0x = v0 * Math.cos(angleRad);
                const v0y = v0 * Math.sin(angleRad);
    
                return {
                    id: `projectile-${Date.now()}`,
                    title: '抛体运动',
                    model: 'projectile',
                    bodies: [
                        {
                            id: 'ball',
                            mass: { value: 1, unit: 'kg' },
                            position: { x: 0, y: h0 },
                            velocity: { x: v0x, y: v0y }
                        }
                    ],
                    environment: {
                        gravity: { enabled: true, value: g },
                        ground: { enabled: true, y: 0 }
                    },
                    timeConfig: { duration, dt: Math.min(0.01, duration / 1000), sampleCount: 1000 }
                };
            }
        },

    {
            id: 'uniform-accelerated',
            name: '自由落体(竖直)',
            model: 'uniform-accelerated',
            parameters: [
                {
                    name: 'v0y',
                    label: '竖直初速度 vy₀',
                    unit: 'm/s',
                    value: 0,
                    min: -50,
                    max: 50,
                    step: 1,
                    default: 0,
                    description: '竖直方向初速度（向上为正）'
                },
                {
                    name: 'g',
                    label: '重力加速度 g',
                    unit: 'm/s²',
                    value: PHYSICS_CONSTANTS.g.value,
                    min: 0.1,
                    max: 30,
                    step: 0.1,
                    default: PHYSICS_CONSTANTS.g.value,
                    description: '重力加速度大小'
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
                const v0y = params['v0y'] ?? 0;
                const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
                const duration = params['duration'] ?? 3;
                return {
                    id: `uniform-accel-${Date.now()}`,
                    title: '自由落体(竖直)',
                    model: 'uniform-accelerated',
                    bodies: [
                        {
                            id: 'object',
                            mass: { value: 1, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: 0, y: v0y }
                        }
                    ],
                    environment: {
                        gravity: { enabled: true, value: g }
                    },
                    timeConfig: makeTimeSeries(duration, 1000, 0.01)
                };
            }
        },

    {
            id: 'free-fall',
            name: '自由落体',
            model: 'uniform-accelerated',
            parameters: [
                {
                    name: 'height',
                    label: '初始高度 h',
                    unit: 'm',
                    value: 20,
                    min: 1,
                    max: 200,
                    step: 1,
                    default: 20,
                    description: '物体开始下落的高度'
                },
                {
                    name: 'g',
                    label: '重力加速度 g',
                    unit: 'm/s²',
                    value: PHYSICS_CONSTANTS.g.value,
                    min: 0.1,
                    max: 30,
                    step: 0.1,
                    default: PHYSICS_CONSTANTS.g.value,
                    description: '重力加速度大小'
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
                const height = params['height'] ?? 20;
                const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
                const duration = params['duration'] ?? 3;
                return {
                    id: `free-fall-${Date.now()}`,
                    title: '自由落体',
                    model: 'uniform-accelerated',
                    bodies: [
                        {
                            id: 'ball',
                            mass: { value: 1, unit: 'kg' },
                            position: { x: 0, y: height },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    environment: {
                        gravity: { enabled: true, value: g }
                    },
                    timeConfig: makeTimeSeries(duration, 1000, 0.01)
                };
            }
        },

    {
            id: 'collision',
            name: '碰撞',
            model: 'collision-elastic',
            parameters: [
                {
                    name: 'm1',
                    label: '物体1质量 m₁',
                    unit: 'kg',
                    value: 1,
                    min: 0.1,
                    max: 100,
                    step: 0.1,
                    default: 1,
                    description: '第一个物体的质量'
                },
                {
                    name: 'm2',
                    label: '物体2质量 m₂',
                    unit: 'kg',
                    value: 1,
                    min: 0.1,
                    max: 100,
                    step: 0.1,
                    default: 1,
                    description: '第二个物体的质量'
                },
                {
                    name: 'v1',
                    label: '物体1初速度 v₁',
                    unit: 'm/s',
                    value: 5,
                    min: -100,
                    max: 100,
                    step: 0.5,
                    default: 5,
                    description: '第一个物体的初速度（正=向右）'
                },
                {
                    name: 'v2',
                    label: '物体2初速度 v₂',
                    unit: 'm/s',
                    value: 0,
                    min: -100,
                    max: 100,
                    step: 0.5,
                    default: 0,
                    description: '第二个物体的初速度（正=向右）'
                },
                {
                    name: 'e',
                    label: '恢复系数 e',
                    unit: '',
                    value: 1,
                    min: 0,
                    max: 1,
                    step: 0.01,
                    default: 1,
                    description: '1=弹性碰撞, 0=完全非弹性碰撞'
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
                const m1 = params['m1'] ?? 1;
                const m2 = params['m2'] ?? 1;
                const v1 = params['v1'] ?? 5;
                const v2 = params['v2'] ?? 0;
                const e = params['e'] ?? 1;
                const duration = params['duration'] ?? 3;
                const model = e >= 0.99 ? ('collision-elastic' as const) : ('collision-inelastic' as const);
                return {
                    id: `collision-${Date.now()}`,
                    title: e >= 0.99 ? '弹性碰撞' : '非弹性碰撞',
                    model,
                    bodies: [
                        {
                            id: 'body1',
                            mass: { value: m1, unit: 'kg' },
                            position: { x: -2, y: 0 },
                            velocity: { x: v1, y: 0 }
                        },
                        {
                            id: 'body2',
                            mass: { value: m2, unit: 'kg' },
                            position: { x: 2, y: 0 },
                            velocity: { x: v2, y: 0 }
                        }
                    ],
                    constraints: e < 0.99 ? { collision: { restitution: e } } : {},
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 1000, 0.001)
                };
            }
        },

    {
            id: 'spring',
            name: '弹簧振子',
            model: 'spring-oscillator',
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
                    description: '振子质量'
                },
                {
                    name: 'k',
                    label: '劲度系数 k',
                    unit: 'N/m',
                    value: 10,
                    min: 0.1,
                    max: 1000,
                    step: 0.5,
                    default: 10,
                    description: '弹簧劲度系数'
                },
                {
                    name: 'A',
                    label: '振幅 A',
                    unit: 'm',
                    value: 0.5,
                    min: 0.01,
                    max: 10,
                    step: 0.05,
                    default: 0.5,
                    description: '初始振幅（偏离平衡位置的距离）'
                },
                {
                    name: 'damping',
                    label: '阻尼系数',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 5,
                    step: 0.05,
                    default: 0,
                    description: '0=无阻尼，越大阻尼越强'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 5,
                    min: 0.5,
                    max: 30,
                    step: 0.5,
                    default: 5,
                    description: '仿真的总时长'
                }
            ],
            buildProblem: params => {
                const m = params['m'] ?? 1;
                const k = params['k'] ?? 10;
                const A = params['A'] ?? 0.5;
                const damping = params['damping'] ?? 0;
                const duration = params['duration'] ?? 5;
                return {
                    id: `spring-${Date.now()}`,
                    title: '弹簧振子',
                    model: 'spring-oscillator',
                    bodies: [
                        {
                            id: 'block',
                            mass: { value: m, unit: 'kg' },
                            position: { x: A, y: 0 },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: {
                        spring: { springConstant: k, naturalLength: 0, anchorPoint: { x: 0, y: 0 } }
                    },
                    environment: damping > 0 ? { airResistance: { enabled: true, coefficient: damping } } : {},
                    timeConfig: makeTimeSeries(duration, 1000, 0.001)
                };
            }
        },

    {
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
                const thetaRad = (thetaDeg * Math.PI) / 180;
                const v0x = v0 * Math.cos(thetaRad);
                const v0y = v0 * Math.sin(thetaRad);
                return {
                    id: `inclined-plane-${Date.now()}`,
                    title: '斜面运动',
                    model: 'inclined-plane',
                    bodies: [
                        {
                            id: 'block',
                            mass: { value: m, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: v0x, y: v0y }
                        }
                    ],
                    constraints: {
                        inclinedPlane: { angle: thetaDeg, frictionCoefficient: mu }
                    },
                    environment: {
                        gravity: { enabled: true, value: 9.8 }
                    },
                    timeConfig: makeTimeSeries(duration, 1000, 0.001)
                };
            }
        },

    {
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
        },

    {
            id: 'orbital',
            name: '万有引力与航天 (卫星轨道)',
            model: 'orbital',
            parameters: [
                {
                    name: 'altitude',
                    label: '轨道高度 h',
                    unit: 'km',
                    value: 400,
                    min: 200,
                    max: 36000,
                    step: 50,
                    default: 400,
                    description: '卫星距地表高度 (ISS ≈ 400km, GEO ≈ 36000km)'
                },
                {
                    name: 'velocityFactor',
                    label: '速度/圆轨道速度',
                    unit: '',
                    value: 1.0,
                    min: 0.5,
                    max: 1.5,
                    step: 0.01,
                    default: 1.0,
                    description: '1.0 = 圆轨道; <1 = 椭圆(远地点在此); >1 = 椭圆(近地点在此)或逃逸'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 'min',
                    value: 120,
                    min: 1,
                    max: 1440,
                    step: 5,
                    default: 120,
                    description: '仿真总时长 (1440min = 1天，可观测多圈)'
                }
            ],
            buildProblem: params => {
                const h_km = params['altitude'] ?? 400;
                const velocityFactor = params['velocityFactor'] ?? 1.0;
                const durationMin = params['duration'] ?? 120;
    
                // 地球引力参数 GM (m³/s²)
                const GM = 3.986e14;
                const R_EARTH = 6.371e6;
                const r = R_EARTH + h_km * 1000;
                const vOrbit = Math.sqrt(GM / r);
                const v = vOrbit * velocityFactor;
    
                return {
                    id: `orbital-${Date.now()}`,
                    title: '万有引力与航天 (卫星轨道运动)',
                    model: 'orbital',
                    bodies: [
                        {
                            id: 'satellite',
                            mass: { value: 1000, unit: 'kg' },
                            position: { x: r, y: 0 },
                            velocity: { x: 0, y: v }
                        }
                    ],
                    constraints: { orbital: { GM, centralRadius: R_EARTH } },
                    environment: {},
                    // 步长自适应：近地轨道几分钟一圈，GEO 24h 一圈 — 每圈至少 600 步
                    timeConfig: { duration: durationMin * 60, dt: 1, sampleCount: Math.min(5000, durationMin * 60) }
                };
            }
        },

    {
            id: 'air-track',
            name: '气垫导轨测速度',
            model: 'uniform-linear',
            parameters: [
                {
                    name: 'mass',
                    label: '滑块质量 m',
                    unit: 'kg',
                    value: 0.2,
                    min: 0.05,
                    max: 2,
                    step: 0.01,
                    default: 0.2,
                    description: '滑块质量（仅展示，匀速运动不影响结果）'
                },
                {
                    name: 'v0',
                    label: '初速度 v₀',
                    unit: 'm/s',
                    value: 0.5,
                    min: 0.05,
                    max: 5,
                    step: 0.05,
                    default: 0.5,
                    description: '滑块在导轨上滑行的速度'
                },
                {
                    name: 'flagWidth',
                    label: '挡光片宽度 Δx',
                    unit: 'm',
                    value: 0.02,
                    min: 0.005,
                    max: 0.1,
                    step: 0.005,
                    default: 0.02,
                    description: '挡光片宽度（推荐 0.01/0.02/0.05/0.10 m）'
                },
                {
                    name: 'x1',
                    label: '光电门1位置 x₁',
                    unit: 'm',
                    value: 0.3,
                    min: 0,
                    max: 1.5,
                    step: 0.01,
                    default: 0.3,
                    description: '第一个光电门距导轨起点的距离'
                },
                {
                    name: 'x2',
                    label: '光电门2位置 x₂',
                    unit: 'm',
                    value: 0.8,
                    min: 0,
                    max: 1.5,
                    step: 0.01,
                    default: 0.8,
                    description: '第二个光电门距导轨起点的距离'
                },
                {
                    name: 'trackLength',
                    label: '导轨长度',
                    unit: 'm',
                    value: 1.5,
                    min: 0.5,
                    max: 3,
                    step: 0.1,
                    default: 1.5,
                    description: '气垫导轨总长度'
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
                    description: '仿真总时长'
                }
            ],
            buildProblem: params => {
                const v0 = params['v0'] ?? 0.5;
                const duration = params['duration'] ?? 2;
                const mass = params['mass'] ?? 0.2;
                return {
                    id: `air-track-${Date.now()}`,
                    title: '气垫导轨测速度',
                    model: 'uniform-linear',
                    bodies: [
                        {
                            id: 'glider',
                            mass: { value: mass, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: v0, y: 0 }
                        }
                    ],
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 400)
                };
            }
        },

    {
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
                        ground:
                            friction > 0
                                ? { enabled: true, y: 0, friction: friction / (mass * g) }
                                : { enabled: true, y: 0 }
                    },
                    timeConfig: makeTimeSeries(duration, 500)
                };
            }
        },

    {
            id: 'momentum',
            name: '动量定理与反冲',
            model: 'momentum',
            parameters: [
                {
                    name: 'modeLabel',
                    label: '模式 (0=动量定理 1=反冲)',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 1,
                    step: 1,
                    default: 0,
                    description: '0=恒力冲量演示 F·Δt = Δp；1=反冲运动 (两物体分离)'
                },
                {
                    name: 'force',
                    label: '恒力 F (动量定理模式)',
                    unit: 'N',
                    value: 10,
                    min: -50,
                    max: 50,
                    step: 1,
                    default: 10,
                    description: '作用在物体上的恒力 (正=向右)'
                },
                {
                    name: 'mass',
                    label: '物体质量 m',
                    unit: 'kg',
                    value: 2,
                    min: 0.1,
                    max: 50,
                    step: 0.5,
                    default: 2,
                    description: '物体1 (主物体) 质量'
                },
                {
                    name: 'mass2',
                    label: '物体2质量 (反冲模式)',
                    unit: 'kg',
                    value: 1,
                    min: 0.01,
                    max: 10,
                    step: 0.1,
                    default: 1,
                    description: '反冲模式中喷出/分离的物体2质量'
                },
                {
                    name: 'v2',
                    label: '物体2碰后速度 (反冲)',
                    unit: 'm/s',
                    value: 5,
                    min: -50,
                    max: 50,
                    step: 0.5,
                    default: 5,
                    description: '反冲模式中物体2获得的速度 (自动计算物体1速度)'
                },
                {
                    name: 'v0',
                    label: '物体1初速度',
                    unit: 'm/s',
                    value: 0,
                    min: -30,
                    max: 30,
                    step: 1,
                    default: 0,
                    description: '物体1初始速度'
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
                const modeNum = params['modeLabel'] ?? 0;
                const mode = modeNum === 1 ? ('recoil' as const) : ('impulse' as const);
                const force = params['force'] ?? 10;
                const mass = params['mass'] ?? 2;
                const mass2 = params['mass2'] ?? 1;
                const v0 = params['v0'] ?? 0;
                const v2 = params['v2'] ?? 5;
                const duration = params['duration'] ?? 3;
    
                if (mode === 'recoil') {
                    // 场景仅输入 m1, m2, v2；model 内部由动量守恒 (m1·v1 + m2·v2 = 0) 自动推导 v1
                    // scene 不在 buildProblem 中重复计算, 避免与 model 计算结果不一致
                    return {
                        id: `momentum-${Date.now()}`,
                        title: '反冲运动 (动量守恒)',
                        model: 'momentum',
                        bodies: [
                            {
                                id: 'A',
                                mass: { value: mass, unit: 'kg' },
                                position: { x: -1, y: 0 },
                                velocity: { x: 0, y: 0 }
                            },
                            {
                                id: 'B',
                                mass: { value: mass2, unit: 'kg' },
                                position: { x: 1, y: 0 },
                                velocity: { x: v2, y: 0 }
                            }
                        ],
                        constraints: { momentum: { mode: 'recoil' } },
                        environment: {},
                        timeConfig: makeTimeSeries(duration, 300)
                    };
                }
    
                return {
                    id: `momentum-${Date.now()}`,
                    title: '动量定理 (F·Δt = Δp)',
                    model: 'momentum',
                    bodies: [
                        {
                            id: 'block',
                            mass: { value: mass, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: v0, y: 0 }
                        }
                    ],
                    constraints: { momentum: { mode: 'impulse', force } },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 300)
                };
            }
        },

    {
            id: 'mechanical-wave',
            name: '机械波 (横波/纵波/干涉)',
            model: 'mechanical-wave',
            parameters: [
                {
                    name: 'waveMode',
                    label: '模式 (0=横波 1=纵波 2=干涉)',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 2,
                    step: 1,
                    default: 0,
                    description: '0=横波 (振动方向⊥传播方向); 1=纵波 (振动方向∥传播方向); 2=干涉 (两列对向波叠加)'
                },
                {
                    name: 'amplitude',
                    label: '振幅 A',
                    unit: 'm',
                    value: 0.1,
                    min: 0.01,
                    max: 0.5,
                    step: 0.01,
                    default: 0.1,
                    description: '质点振动的最大位移'
                },
                {
                    name: 'frequency',
                    label: '频率 f',
                    unit: 'Hz',
                    value: 2,
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                    default: 2,
                    description: '振动频率 (Hz)；频率越大波长越短'
                },
                {
                    name: 'wavelength',
                    label: '波长 λ',
                    unit: 'm',
                    value: 0.5,
                    min: 0.05,
                    max: 2,
                    step: 0.05,
                    default: 0.5,
                    description: '波在一个周期内传播的距离'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 3,
                    min: 0.5,
                    max: 15,
                    step: 0.5,
                    default: 3,
                    description: '仿真的总时长 (可观察到波传播过程)'
                }
            ],
            buildProblem: params => {
                const modeMap = ['transverse', 'longitudinal', 'interference'] as const;
                const modeIdx = params['waveMode'] ?? 0;
                const mode = modeMap[modeIdx] ?? 'transverse';
                const amplitude = params['amplitude'] ?? 0.1;
                const frequency = params['frequency'] ?? 2;
                const wavelength = params['wavelength'] ?? 0.5;
                const duration = params['duration'] ?? 3;
                return {
                    id: `wave-${Date.now()}`,
                    title: mode === 'transverse' ? '横波传播' : mode === 'longitudinal' ? '纵波传播' : '波的干涉',
                    model: 'mechanical-wave' as const,
                    bodies: [
                        {
                            id: 'medium',
                            mass: { value: 0.1, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: {
                        wave: {
                            mode,
                            amplitude,
                            frequency,
                            wavelength,
                            xStart: -1,
                            xEnd: 3,
                            particleCount: 81,
                            ...(mode === 'interference' ? { amplitude2: amplitude, direction2: -1, phaseDiff: 0 } : {})
                        }
                    },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 300)
                };
            }
        },

    {
            id: 'simple-pendulum',
            name: '单摆 (简谐运动)',
            model: 'simple-pendulum',
            parameters: [
                {
                    name: 'length',
                    label: '摆长 L',
                    unit: 'm',
                    value: 1.0,
                    min: 0.2,
                    max: 5,
                    step: 0.05,
                    default: 1.0,
                    description: '摆线长度 (m)'
                },
                {
                    name: 'angle',
                    label: '初始摆角 θ₀',
                    unit: '°',
                    value: 15,
                    min: 1,
                    max: 80,
                    step: 1,
                    default: 15,
                    description: '初始偏离竖直方向角度 (<15° 近似简谐)'
                },
                {
                    name: 'mass',
                    label: '摆球质量 m',
                    unit: 'kg',
                    value: 1,
                    min: 0.1,
                    max: 5,
                    step: 0.1,
                    default: 1,
                    description: '摆球质量 (单摆周期与质量无关)'
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
                    description: '重力加速度 (地球 9.8, 月球 1.6)'
                },
                {
                    name: 'damping',
                    label: '阻尼系数',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 2,
                    step: 0.05,
                    default: 0,
                    description: '0=无阻尼 (机械能守恒); >0=有阻尼 (振幅衰减)'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 10,
                    min: 1,
                    max: 60,
                    step: 1,
                    default: 10,
                    description: '仿真的总时长'
                }
            ],
            buildProblem: params => {
                const L = params['length'] ?? 1.0;
                const angleDeg = params['angle'] ?? 15;
                const mass = params['mass'] ?? 1;
                const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
                const damping = params['damping'] ?? 0;
                const duration = params['duration'] ?? 10;
                return {
                    id: `pendulum-${Date.now()}`,
                    title: '单摆 (简谐运动)',
                    model: 'simple-pendulum',
                    bodies: [
                        {
                            id: 'bob',
                            mass: { value: mass, unit: 'kg' },
                            position: {
                                x: L * Math.sin((angleDeg * Math.PI) / 180),
                                y: L * Math.cos((angleDeg * Math.PI) / 180)
                            },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: { simplePendulum: { length: L, g, initialAngleDeg: angleDeg, damping } },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 1000)
                };
            }
        },

    {
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
        },

    {
            id: 'sliding-friction',
            name: '滑动摩擦力 f=μN',
            model: 'sliding-friction',
            parameters: [
                {
                    name: 'mu',
                    label: '动摩擦因数 μ',
                    unit: '',
                    value: 0.3,
                    min: 0,
                    max: 1.5,
                    step: 0.01,
                    default: 0.3,
                    description: '动摩擦因数，由接触面材料和粗糙程度决定'
                },
                {
                    name: 'mass',
                    label: '物体质量 m',
                    unit: 'kg',
                    value: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                    default: 1,
                    description: '物体质量 (改变正压力 N=mg)'
                },
                {
                    name: 'v0',
                    label: '初速度 v₀',
                    unit: 'm/s',
                    value: 0.5,
                    min: 0,
                    max: 5,
                    step: 0.1,
                    default: 0.5,
                    description: '物体初速度'
                },
                {
                    name: 'uniformMotion',
                    label: '运动模式 (1=匀速 0=加速)',
                    unit: '',
                    value: 1,
                    min: 0,
                    max: 1,
                    step: 1,
                    default: 1,
                    description: '1=外力等于摩擦力做匀速运动；0=外力大于摩擦力做加速运动'
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
                    value: 4,
                    min: 0.5,
                    max: 20,
                    step: 0.5,
                    default: 4,
                    description: '仿真总时长'
                }
            ],
            buildProblem: params => {
                const mu = params['mu'] ?? 0.3;
                const mass = params['mass'] ?? 1;
                const v0 = params['v0'] ?? 0.5;
                const uniformMotion = (params['uniformMotion'] ?? 1) === 1;
                const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
                const duration = params['duration'] ?? 4;
                return {
                    id: `sliding-friction-${Date.now()}`,
                    title: '滑动摩擦力 (f=μN)',
                    model: 'sliding-friction',
                    bodies: [
                        {
                            id: 'block',
                            mass: { value: mass, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: v0, y: 0 }
                        }
                    ],
                    constraints: {
                        slidingFriction: { frictionCoefficient: mu, uniformMotion }
                    },
                    environment: { gravity: { enabled: true, value: g } },
                    timeConfig: makeTimeSeries(duration, 400)
                };
            }
        },

    {
            id: 'force-composition',
            name: '力的合成 (平行四边形定则)',
            model: 'force-composition',
            parameters: [
                {
                    name: 'f1',
                    label: '分力 F₁',
                    unit: 'N',
                    value: 3,
                    min: 0,
                    max: 20,
                    step: 0.1,
                    default: 3,
                    description: '第一个分力的大小'
                },
                {
                    name: 'f2',
                    label: '分力 F₂',
                    unit: 'N',
                    value: 4,
                    min: 0,
                    max: 20,
                    step: 0.1,
                    default: 4,
                    description: '第二个分力的大小'
                },
                {
                    name: 'angleDeg',
                    label: '夹角 θ',
                    unit: '°',
                    value: 90,
                    min: 0,
                    max: 180,
                    step: 1,
                    default: 90,
                    description: 'F₁ 与 F₂ 之间的夹角'
                },
                {
                    name: 'duration',
                    label: '动画时长',
                    unit: 's',
                    value: 1,
                    min: 0.5,
                    max: 5,
                    step: 0.5,
                    default: 1,
                    description: 'F-θ 曲线扫描时长'
                }
            ],
            buildProblem: params => {
                const f1 = params['f1'] ?? 3;
                const f2 = params['f2'] ?? 4;
                const angleDeg = params['angleDeg'] ?? 90;
                const duration = params['duration'] ?? 1;
                return {
                    id: `force-composition-${Date.now()}`,
                    title: '力的合成与分解 (平行四边形定则)',
                    model: 'force-composition',
                    bodies: [
                        {
                            id: 'point',
                            mass: { value: 1, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: {
                        forceComposition: { f1, f2, angleDeg, f1AngleDeg: 0 }
                    },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 360)
                };
            }
        },

    {
            id: 'newton-second-law',
            name: '牛顿第二定律 F=ma',
            model: 'newton-second-law',
            parameters: [
                {
                    name: 'force',
                    label: '合外力 F',
                    unit: 'N',
                    value: 10,
                    min: -100,
                    max: 100,
                    step: 0.5,
                    default: 10,
                    description: '作用在物体上的合外力 (正=向右，负=向左)'
                },
                {
                    name: 'mass',
                    label: '物体质量 m',
                    unit: 'kg',
                    value: 2,
                    min: 0.1,
                    max: 50,
                    step: 0.1,
                    default: 2,
                    description: '物体质量 (kg)'
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
                    description: '物体初始速度'
                },
                {
                    name: 'includeFriction',
                    label: '考虑摩擦 (1=是 0=否)',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 1,
                    step: 1,
                    default: 0,
                    description: '是否考虑地面滑动摩擦力'
                },
                {
                    name: 'friction',
                    label: '摩擦系数 μ',
                    unit: '',
                    value: 0.2,
                    min: 0,
                    max: 1,
                    step: 0.01,
                    default: 0.2,
                    description: '地面与物体间的动摩擦因数'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 5,
                    min: 0.5,
                    max: 30,
                    step: 0.5,
                    default: 5,
                    description: '仿真的总时长'
                }
            ],
            buildProblem: params => {
                const force = params['force'] ?? 10;
                const mass = params['mass'] ?? 2;
                const v0 = params['v0'] ?? 0;
                const includeFriction = (params['includeFriction'] ?? 0) === 1;
                const friction = params['friction'] ?? 0.2;
                const duration = params['duration'] ?? 5;
                return {
                    id: `newton-second-law-${Date.now()}`,
                    title: '牛顿第二定律 (F=ma)',
                    model: 'newton-second-law',
                    bodies: [
                        {
                            id: 'block',
                            mass: { value: mass, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: v0, y: 0 }
                        }
                    ],
                    constraints: { newtonSecondLaw: { force, includeFriction } },
                    environment: {
                        ground: { enabled: true, y: 0, friction: includeFriction ? friction : 0 }
                    },
                    timeConfig: makeTimeSeries(duration, 500)
                };
            }
        },

    {
            id: 'newton-first-law',
            name: '牛顿第一定律 (惯性)',
            model: 'uniform-linear',
            parameters: [
                {
                    name: 'v0',
                    label: '初速度 v₀',
                    unit: 'm/s',
                    value: 2,
                    min: -10,
                    max: 10,
                    step: 0.1,
                    default: 2,
                    description: '物体初速度 (不受外力时保持此速度匀速运动)'
                },
                {
                    name: 'mass',
                    label: '物体质量 m',
                    unit: 'kg',
                    value: 0.5,
                    min: 0.1,
                    max: 5,
                    step: 0.1,
                    default: 0.5,
                    description: '物体质量 (仅展示，不影响匀速运动)'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 5,
                    min: 1,
                    max: 20,
                    step: 0.5,
                    default: 5,
                    description: '仿真的总时长'
                }
            ],
            buildProblem: params => {
                const v0 = params['v0'] ?? 2;
                const mass = params['mass'] ?? 0.5;
                const duration = params['duration'] ?? 5;
                return {
                    id: `newton-first-law-${Date.now()}`,
                    title: '牛顿第一定律 (惯性)',
                    model: 'uniform-linear',
                    bodies: [
                        {
                            id: 'block',
                            mass: { value: mass, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: v0, y: 0 }
                        }
                    ],
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 500)
                };
            }
        },

    {
            id: 'newton-third-law',
            name: '牛顿第三定律',
            model: 'newton-third-law',
            parameters: [
                {
                    name: 'forceAB',
                    label: '作用力 F_AB',
                    unit: 'N',
                    value: 5,
                    min: -20,
                    max: 20,
                    step: 0.5,
                    default: 5,
                    description: 'A 对 B 施加的作用力 (正=向右)"'
                },
                {
                    name: 'massA',
                    label: '物体 A 质量',
                    unit: 'kg',
                    value: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                    default: 1,
                    description: '物体 A 的质量'
                },
                {
                    name: 'massB',
                    label: '物体 B 质量',
                    unit: 'kg',
                    value: 2,
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                    default: 2,
                    description: '物体 B 的质量'
                },
                {
                    name: 'allowMotion',
                    label: '运动模式 (1=加速 0=静止)',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 1,
                    step: 1,
                    default: 0,
                    description: '1=两物体在光滑水平面上共同加速；0=两物体固定，仅展示力'
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
                    description: '仿真总时长'
                }
            ],
            buildProblem: params => {
                const forceAB = params['forceAB'] ?? 5;
                const massA = params['massA'] ?? 1;
                const massB = params['massB'] ?? 2;
                const allowMotion = (params['allowMotion'] ?? 0) === 1;
                const duration = params['duration'] ?? 3;
                return {
                    id: `newton-third-law-${Date.now()}`,
                    title: '牛顿第三定律 (作用力与反作用力)',
                    model: 'newton-third-law',
                    bodies: [
                        {
                            id: 'A',
                            mass: { value: massA, unit: 'kg' },
                            position: { x: -1, y: 0 },
                            velocity: { x: 0, y: 0 }
                        },
                        { id: 'B', mass: { value: massB, unit: 'kg' }, position: { x: 1, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: {
                        newtonThirdLaw: { forceAB, allowMotion }
                    },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 300)
                };
            }
        },

    {
            id: 'ticker-timer',
            name: '打点计时器测瞬时速度',
            model: 'ticker-timer',
            parameters: [
                {
                    name: 'frequency',
                    label: '打点频率 f',
                    unit: 'Hz',
                    value: 50,
                    min: 10,
                    max: 100,
                    step: 5,
                    default: 50,
                    description: '电磁打点计时器电源频率 (50Hz=每隔 0.02s 打一点)'
                },
                {
                    name: 'acceleration',
                    label: '加速度 a',
                    unit: 'm/s²',
                    value: 2,
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                    default: 2,
                    description: '小车匀变速直线运动的加速度'
                },
                {
                    name: 'frictionCoeff',
                    label: '摩擦系数 μ',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 1,
                    step: 0.01,
                    default: 0,
                    description: '纸带与限位孔间的摩擦系数'
                },
                {
                    name: 'initialVelocity',
                    label: '初速度 v₀',
                    unit: 'm/s',
                    value: 0,
                    min: -5,
                    max: 5,
                    step: 0.1,
                    default: 0,
                    description: '第一个计数点对应的初速度'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 2,
                    min: 0.5,
                    max: 5,
                    step: 0.1,
                    default: 2,
                    description: '仿真的总时长 (影响打出纸带长度)'
                }
            ],
            buildProblem: params => {
                const frequency = params['frequency'] ?? 50;
                const acceleration = params['acceleration'] ?? 2;
                const frictionCoeff = params['frictionCoeff'] ?? 0;
                const initialVelocity = params['initialVelocity'] ?? 0;
                const duration = params['duration'] ?? 2;
                return {
                    id: `ticker-${Date.now()}`,
                    title: '打点计时器',
                    model: 'ticker-timer',
                    bodies: [
                        {
                            id: 'ticker',
                            mass: { value: 1, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: initialVelocity, y: 0 }
                        }
                    ],
                    constraints: {
                        tickerTimer: { frequency, acceleration, frictionCoefficient: frictionCoeff, initialVelocity }
                    },
                    environment: { gravity: { enabled: false } },
                    timeConfig: makeTimeSeries(duration, 1000)
                };
            }
        },

    {
            id: 'reaction-time',
            name: '测反应时间',
            model: 'reaction-time',
            parameters: [
                {
                    name: 'distance',
                    label: '尺子下落距离 h',
                    unit: 'm',
                    value: 0.2,
                    min: 0.05,
                    max: 0.5,
                    step: 0.01,
                    default: 0.2,
                    description: '尺子被抓住时下落的位置 (读数越大=反应越慢)'
                },
                {
                    name: 'gravity',
                    label: '重力加速度 g',
                    unit: 'm/s²',
                    value: PHYSICS_CONSTANTS.g.value,
                    min: 1,
                    max: 20,
                    step: 0.1,
                    default: PHYSICS_CONSTANTS.g.value,
                    description: '地球 g≈9.8, 月球 g≈1.6'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 1,
                    min: 0.1,
                    max: 3,
                    step: 0.1,
                    default: 1,
                    description: '仿真的总时长 (覆盖反应时间)'
                }
            ],
            buildProblem: params => {
                const distance = params['distance'] ?? 0.2;
                const gravity = params['gravity'] ?? PHYSICS_CONSTANTS.g.value;
                const duration = params['duration'] ?? 1;
                const tReact = Math.sqrt((2 * distance) / gravity);
                return {
                    id: `reaction-${Date.now()}`,
                    title: '测反应时间',
                    model: 'reaction-time',
                    bodies: [
                        {
                            id: 'ruler',
                            mass: { value: 0.1, unit: 'kg' },
                            position: { x: 0, y: distance },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: { reactionTime: { distance, gravity } },
                    environment: { gravity: { enabled: true, value: gravity } },
                    timeConfig: makeTimeSeries(Math.max(duration, tReact * 1.5), 1000, 0.001)
                };
            }
        },

    {
            id: 'galileo-incline',
            name: '伽利略斜面理想实验',
            model: 'galileo-incline',
            parameters: [
                {
                    name: 'angleDeg',
                    label: '斜面倾角 θ',
                    unit: '°',
                    value: 30,
                    min: 5,
                    max: 90,
                    step: 1,
                    default: 30,
                    description: '斜面与水平面的夹角 (冲淡重力: θ↓→a↓→t↑)'
                },
                {
                    name: 'inclineLength',
                    label: '斜面长度 L',
                    unit: 'm',
                    value: 2,
                    min: 0.5,
                    max: 5,
                    step: 0.1,
                    default: 2,
                    description: '斜面长度 (纸带可测量的运动距离)'
                },
                {
                    name: 'mode',
                    label: '演示模式',
                    unit: '',
                    value: 3,
                    min: 0,
                    max: 3,
                    step: 1,
                    default: 3,
                    description: '0=单斜面 1=对接斜面 2=水平面外推 3=三段完整演示'
                },
                {
                    name: 'gravity',
                    label: '重力加速度 g',
                    unit: 'm/s²',
                    value: PHYSICS_CONSTANTS.g.value,
                    min: 1,
                    max: 20,
                    step: 0.1,
                    default: PHYSICS_CONSTANTS.g.value,
                    description: '不同星球的重力加速度'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 5,
                    min: 1,
                    max: 15,
                    step: 0.5,
                    default: 5,
                    description: '仿真的总时长'
                }
            ],
            buildProblem: params => {
                const angleDeg = params['angleDeg'] ?? 30;
                const inclineLength = params['inclineLength'] ?? 2;
                const modeIdx = Math.round(params['mode'] ?? 3);
                const modes = ['single', 'docked', 'horizontal', 'all'] as const;
                const mode = modes[modeIdx] ?? 'all';
                const gravity = params['gravity'] ?? PHYSICS_CONSTANTS.g.value;
                const duration = params['duration'] ?? 5;
                return {
                    id: `galileo-${Date.now()}`,
                    title: '伽利略斜面',
                    model: 'galileo-incline',
                    bodies: [
                        { id: 'ball', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: { galileoIncline: { angleDeg, inclineLength, mode, gravity } },
                    environment: { gravity: { enabled: true, value: gravity } },
                    timeConfig: makeTimeSeries(duration, 1000)
                };
            }
        },

    {
            id: 'center-of-gravity',
            name: '悬挂法确定重心',
            model: 'center-of-gravity',
            parameters: [
                {
                    name: 'shapeType',
                    label: '薄板形状',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 2,
                    step: 1,
                    default: 0,
                    description: '0=L形 1=三角形 2=不规则四边形'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 1,
                    min: 0.5,
                    max: 5,
                    step: 0.1,
                    default: 1,
                    description: '静态场景 (该参数无实际物理影响)'
                }
            ],
            buildProblem: params => {
                const shapeIdx = Math.round(params['shapeType'] ?? 0);
                const shapes: Array<Array<{ x: number; y: number }>> = [
                    // L 形
                    [
                        { x: -1, y: -1 },
                        { x: 1, y: -1 },
                        { x: 1, y: 0 },
                        { x: 0, y: 0 },
                        { x: 0, y: 1 },
                        { x: -1, y: 1 }
                    ],
                    // 三角形
                    [
                        { x: -1, y: -1 },
                        { x: 1, y: -1 },
                        { x: 0, y: 1 }
                    ],
                    // 不规则四边形
                    [
                        { x: -1.2, y: -0.5 },
                        { x: 0.8, y: -1 },
                        { x: 1.2, y: 0.8 },
                        { x: -0.5, y: 1 }
                    ]
                ];
                const vertices = shapes[shapeIdx] ?? shapes[0]!;
                const duration = params['duration'] ?? 1;
                return {
                    id: `cog-${Date.now()}`,
                    title: '悬挂法确定重心',
                    model: 'center-of-gravity',
                    bodies: [
                        { id: 'plate', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: { centerOfGravity: { vertices } },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 100)
                };
            }
        },

    {
            id: 'inertia',
            name: '惯性实验 (棋子/鸡蛋/小车)',
            model: 'inertia',
            parameters: [
                {
                    name: 'mode',
                    label: '演示实验',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 2,
                    step: 1,
                    default: 0,
                    description: '0=棋子打击(静→动) 1=小车急停(动→静) 2=纸板抽拉鸡蛋落水'
                },
                {
                    name: 'initialSpeed',
                    label: '初速度 v₀',
                    unit: 'm/s',
                    value: 2,
                    min: 0.5,
                    max: 10,
                    step: 0.5,
                    default: 2,
                    description: '初始运动速度 (模拟棋子被击打/小车行驶的速度)'
                },
                {
                    name: 'massRatio',
                    label: '质量比 m上/m下',
                    unit: '',
                    value: 0.1,
                    min: 0.01,
                    max: 1,
                    step: 0.01,
                    default: 0.1,
                    description: '上下物体质量比 (越小, 惯性现象越明显)'
                },
                {
                    name: 'frictionCoeff',
                    label: '摩擦系数 μ',
                    unit: '',
                    value: 0.3,
                    min: 0,
                    max: 1,
                    step: 0.01,
                    default: 0.3,
                    description: '接触面摩擦系数'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 3,
                    min: 0.5,
                    max: 10,
                    step: 0.5,
                    default: 3,
                    description: '仿真的总时长'
                }
            ],
            buildProblem: params => {
                const modeIdx = Math.round(params['mode'] ?? 0);
                const modes = ['stroke', 'stop', 'smoothPull'] as const;
                const mode = modes[modeIdx] ?? 'stroke';
                const initialSpeed = params['initialSpeed'] ?? 2;
                const massRatio = params['massRatio'] ?? 0.1;
                const frictionCoeff = params['frictionCoeff'] ?? 0.3;
                const duration = params['duration'] ?? 3;
                return {
                    id: `inertia-${Date.now()}`,
                    title: '惯性实验',
                    model: 'inertia',
                    bodies: [
                        {
                            id: 'top',
                            mass: { value: massRatio, unit: 'kg' },
                            position: { x: 0, y: 0.5 },
                            velocity: { x: initialSpeed, y: 0 }
                        },
                        {
                            id: 'bottom',
                            mass: { value: 1, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: initialSpeed, y: 0 }
                        }
                    ],
                    constraints: { inertia: { mode, initialSpeed, massRatio, frictionCoeff } },
                    environment: { ground: { enabled: true, y: -0.5, friction: frictionCoeff } },
                    timeConfig: makeTimeSeries(duration, 500)
                };
            }
        },

    {
            id: 'overweight',
            name: '超重与失重 (电梯台秤)',
            model: 'overweight',
            parameters: [
                {
                    name: 'mode',
                    label: '电梯运动阶段',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 3,
                    step: 1,
                    default: 0,
                    description: '0=向上加速(超重) 1=向上减速(失重) 2=向下加速(失重) 3=向下减速(超重)'
                },
                {
                    name: 'mass',
                    label: '物体质量 m',
                    unit: 'kg',
                    value: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                    default: 1,
                    description: '放置在台秤上的物体质量'
                },
                {
                    name: 'accMagnitude',
                    label: '加速度大小 a',
                    unit: 'm/s²',
                    value: 2,
                    min: 0.5,
                    max: 9.8,
                    step: 0.1,
                    default: 2,
                    description: '电梯的加速度大小 (a=g 时为完全失重 N=0)'
                },
                {
                    name: 'gravity',
                    label: '重力加速度 g',
                    unit: 'm/s²',
                    value: PHYSICS_CONSTANTS.g.value,
                    min: 1,
                    max: 20,
                    step: 0.1,
                    default: PHYSICS_CONSTANTS.g.value,
                    description: '当地重力加速度'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 4,
                    min: 1,
                    max: 10,
                    step: 0.5,
                    default: 4,
                    description: '仿真的总时长'
                }
            ],
            buildProblem: params => {
                const modeIdx = Math.round(params['mode'] ?? 0);
                const modes = ['upStart', 'upStop', 'downStart', 'downStop'] as const;
                const mode = modes[modeIdx] ?? 'upStart';
                const mass = params['mass'] ?? 1;
                const accMagnitude = params['accMagnitude'] ?? 2;
                const gravity = params['gravity'] ?? PHYSICS_CONSTANTS.g.value;
                const duration = params['duration'] ?? 4;
                return {
                    id: `overweight-${Date.now()}`,
                    title: '超重与失重',
                    model: 'overweight',
                    bodies: [
                        {
                            id: 'object',
                            mass: { value: mass, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: { overweight: { mass, accMagnitude, mode, gravity } },
                    environment: { gravity: { enabled: true, value: gravity } },
                    timeConfig: makeTimeSeries(duration, 500)
                };
            }
        },

    {
            id: 'curve-velocity-direction',
            name: '曲线运动速度方向',
            model: 'curve-velocity-direction',
            parameters: [
                {
                    name: 'trackShape',
                    label: '轨道形状',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 2,
                    step: 1,
                    default: 0,
                    description: '0=圆形 1=抛物线 2=螺旋'
                },
                {
                    name: 'angularSpeed',
                    label: '角速度 ω',
                    unit: 'rad/s',
                    value: 1,
                    min: 0.1,
                    max: 5,
                    step: 0.1,
                    default: 1,
                    description: '物体沿曲线运动的角速度'
                },
                {
                    name: 'releaseIndex',
                    label: '脱离点序号',
                    unit: '',
                    value: 1,
                    min: 0,
                    max: 3,
                    step: 1,
                    default: 1,
                    description: '演示切线速度方向的脱离点位置'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 1,
                    min: 0.5,
                    max: 5,
                    step: 0.1,
                    default: 1,
                    description: '演示动画时长'
                }
            ],
            buildProblem: params => {
                const shapeIdx = Math.round(params['trackShape'] ?? 0);
                const angularSpeed = params['angularSpeed'] ?? 1;
                const releaseIndex = params['releaseIndex'] ?? 1;
                const duration = params['duration'] ?? 1;
                const shapes = ['circle', 'parabola', 'spiral'] as const;
                return {
                    id: `cvd-${Date.now()}`,
                    title: '曲线运动速度方向',
                    model: 'curve-velocity-direction',
                    bodies: [
                        {
                            id: 'ball',
                            mass: { value: 1, unit: 'kg' },
                            position: { x: 1, y: 0 },
                            velocity: { x: 0, y: angularSpeed }
                        }
                    ],
                    constraints: {
                        curveVelocity: { trackShape: shapes[shapeIdx] ?? 'circle', angularSpeed, releaseIndex }
                    },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 100)
                };
            }
        },

    {
            id: 'curve-condition',
            name: '曲线运动条件',
            model: 'curve-condition',
            parameters: [
                {
                    name: 'forceAngle',
                    label: '力的方向角',
                    unit: '°',
                    value: 45,
                    min: 0,
                    max: 180,
                    step: 5,
                    default: 45,
                    description: '合力与水平面的夹角'
                },
                {
                    name: 'initialSpeed',
                    label: '初速度 v₀',
                    unit: 'm/s',
                    value: 5,
                    min: 1,
                    max: 30,
                    step: 0.5,
                    default: 5,
                    description: '初速度大小 (水平向右)'
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
                    description: '物体质量'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 3,
                    min: 0.5,
                    max: 10,
                    step: 0.5,
                    default: 3,
                    description: '仿真的总时长'
                }
            ],
            buildProblem: params => {
                const forceAngle = params['forceAngle'] ?? 45;
                const v0 = params['initialSpeed'] ?? 5;
                const m = params['mass'] ?? 1;
                const duration = params['duration'] ?? 3;
                return {
                    id: `cc-${Date.now()}`,
                    title: '曲线运动条件',
                    model: 'curve-condition',
                    bodies: [
                        { id: 'obj', mass: { value: m, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: v0, y: 0 } }
                    ],
                    constraints: {
                        curveCondition: { forceDirectionDeg: forceAngle, initialSpeed: v0, mass: m, forceMagnitude: m * 2 }
                    },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 500)
                };
            }
        },

    {
            id: 'motion-composition',
            name: '运动的合成与分解',
            model: 'motion-composition',
            parameters: [
                {
                    name: 'vxConst',
                    label: '水平速度 vx',
                    unit: 'm/s',
                    value: 2,
                    min: 0,
                    max: 10,
                    step: 0.5,
                    default: 2,
                    description: '水平方向的匀速分运动速度'
                },
                {
                    name: 'vyAccel',
                    label: '竖直加速度 ay',
                    unit: 'm/s²',
                    value: 2,
                    min: 0,
                    max: 10,
                    step: 0.5,
                    default: 2,
                    description: '竖直方向的匀加速分运动加速度'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 3,
                    min: 0.5,
                    max: 10,
                    step: 0.5,
                    default: 3,
                    description: '仿真的总时长'
                }
            ],
            buildProblem: params => {
                const vxConst = params['vxConst'] ?? 2;
                const vyAccel = params['vyAccel'] ?? 2;
                const duration = params['duration'] ?? 3;
                return {
                    id: `mc-${Date.now()}`,
                    title: '运动的合成与分解',
                    model: 'motion-composition',
                    bodies: [
                        {
                            id: 'ball',
                            mass: { value: 1, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: vxConst, y: 0 }
                        }
                    ],
                    constraints: { motionComposition: { vxConst, vyAccel } },
                    environment: { gravity: { enabled: true, value: vyAccel } },
                    timeConfig: makeTimeSeries(duration, 500)
                };
            }
        },

    {
            id: 'transmission-belt',
            name: '传动方式 (皮带/齿轮/摩擦轮/同轴)',
            model: 'transmission-belt',
            parameters: [
                {
                    name: 'mode',
                    label: '传动方式',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 3,
                    step: 1,
                    default: 0,
                    description: '0=皮带 1=齿轮 2=摩擦轮 3=同轴'
                },
                {
                    name: 'r1',
                    label: '主动轮半径 r₁',
                    unit: 'm',
                    value: 0.1,
                    min: 0.01,
                    max: 0.5,
                    step: 0.01,
                    default: 0.1,
                    description: '主动轮半径'
                },
                {
                    name: 'r2',
                    label: '从动轮半径 r₂',
                    unit: 'm',
                    value: 0.2,
                    min: 0.01,
                    max: 0.5,
                    step: 0.01,
                    default: 0.2,
                    description: '从动轮半径'
                },
                {
                    name: 'omega1',
                    label: '主动轮角速度 ω₁',
                    unit: 'rad/s',
                    value: 10,
                    min: 1,
                    max: 100,
                    step: 1,
                    default: 10,
                    description: '主动轮角速度'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 2,
                    min: 0.5,
                    max: 5,
                    step: 0.5,
                    default: 2,
                    description: '仿真的总时长'
                }
            ],
            buildProblem: params => {
                const modes = ['belt', 'gear', 'friction', 'coax'] as const;
                const modeIdx = Math.round(params['mode'] ?? 0);
                const r1 = params['r1'] ?? 0.1;
                const r2 = params['r2'] ?? 0.2;
                const omega1 = params['omega1'] ?? 10;
                const duration = params['duration'] ?? 2;
                return {
                    id: `tb-${Date.now()}`,
                    title: '传动方式',
                    model: 'transmission-belt',
                    bodies: [
                        {
                            id: 'wheel1',
                            mass: { value: 1, unit: 'kg' },
                            position: { x: -1, y: 0 },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: { transmission: { mode: modes[modeIdx] ?? 'belt', r1, r2, omega1 } },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 100)
                };
            }
        },

    {
            id: 'vertical-circle',
            name: '竖直圆周最高点条件',
            model: 'vertical-circle',
            parameters: [
                {
                    name: 'modelType',
                    label: '约束类型',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 2,
                    step: 1,
                    default: 0,
                    description: '0=绳 1=杆 2=圆环'
                },
                {
                    name: 'length',
                    label: '半径 r',
                    unit: 'm',
                    value: 1,
                    min: 0.1,
                    max: 5,
                    step: 0.1,
                    default: 1,
                    description: '圆周运动半径 (绳/杆长)'
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
                    description: '运动物体质量'
                },
                {
                    name: 'initialSpeed',
                    label: '最低点速度 v₀',
                    unit: 'm/s',
                    value: 7.5,
                    min: 0,
                    max: 15,
                    step: 0.5,
                    default: 7.5,
                    description: '最低点初速度 (决定能否通过最高点)'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 5,
                    min: 1,
                    max: 15,
                    step: 0.5,
                    default: 5,
                    description: '仿真的总时长'
                }
            ],
            buildProblem: params => {
                const types = ['rope', 'rod', 'ring'] as const;
                const typeIdx = Math.round(params['modelType'] ?? 0);
                const length = params['length'] ?? 1;
                const mass = params['mass'] ?? 1;
                const initialSpeed = params['initialSpeed'] ?? 7.5;
                const duration = params['duration'] ?? 5;
                return {
                    id: `vc-${Date.now()}`,
                    title: '竖直圆周最高点',
                    model: 'vertical-circle',
                    bodies: [
                        {
                            id: 'ball',
                            mass: { value: mass, unit: 'kg' },
                            position: { x: length, y: 0 },
                            velocity: { x: 0, y: initialSpeed }
                        }
                    ],
                    constraints: { verticalCircle: { length, mass, modelType: types[typeIdx] ?? 'rope', initialSpeed } },
                    environment: { gravity: { enabled: true, value: 9.8 } },
                    timeConfig: makeTimeSeries(duration, 500)
                };
            }
        },

    {
            id: 'centrifugal',
            name: '离心现象',
            model: 'centrifugal',
            parameters: [
                {
                    name: 'mass',
                    label: '物块质量 m',
                    unit: 'kg',
                    value: 1,
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                    default: 1,
                    description: '放置在转盘上的物体质量'
                },
                {
                    name: 'radius',
                    label: '转动半径 r',
                    unit: 'm',
                    value: 0.3,
                    min: 0.05,
                    max: 1,
                    step: 0.05,
                    default: 0.3,
                    description: '物块到转盘中心的距离'
                },
                {
                    name: 'angularSpeed',
                    label: '角速度 ω',
                    unit: 'rad/s',
                    value: 5,
                    min: 1,
                    max: 15,
                    step: 0.5,
                    default: 5,
                    description: '转盘角速度'
                },
                {
                    name: 'frictionCoeff',
                    label: '摩擦系数 μ',
                    unit: '',
                    value: 0.5,
                    min: 0,
                    max: 1,
                    step: 0.05,
                    default: 0.5,
                    description: '物块与转盘间的静摩擦系数'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 3,
                    min: 0.5,
                    max: 10,
                    step: 0.5,
                    default: 3,
                    description: '仿真的总时长'
                }
            ],
            buildProblem: params => {
                const mass = params['mass'] ?? 1;
                const radius = params['radius'] ?? 0.3;
                const angularSpeed = params['angularSpeed'] ?? 5;
                const frictionCoeff = params['frictionCoeff'] ?? 0.5;
                const duration = params['duration'] ?? 3;
                return {
                    id: `cent-${Date.now()}`,
                    title: '离心现象',
                    model: 'centrifugal',
                    bodies: [
                        {
                            id: 'block',
                            mass: { value: mass, unit: 'kg' },
                            position: { x: radius, y: 0 },
                            velocity: { x: 0, y: angularSpeed * radius }
                        }
                    ],
                    constraints: { centrifugal: { mass, radius, angularSpeed, frictionCoeff } },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 200)
                };
            }
        },

    {
            id: 'cavendish',
            name: '卡文迪什扭秤测 G',
            model: 'cavendish',
            parameters: [
                {
                    name: 'm1',
                    label: '大球质量 m₁',
                    unit: 'kg',
                    value: 10,
                    min: 0.1,
                    max: 1000,
                    step: 0.1,
                    default: 10,
                    description: '大铅球质量'
                },
                {
                    name: 'm2',
                    label: '小球质量 m₂',
                    unit: 'kg',
                    value: 0.5,
                    min: 0.01,
                    max: 10,
                    step: 0.01,
                    default: 0.5,
                    description: '小铅球质量'
                },
                {
                    name: 'distance',
                    label: '球心距离 r',
                    unit: 'm',
                    value: 0.1,
                    min: 0.01,
                    max: 0.5,
                    step: 0.01,
                    default: 0.1,
                    description: '大球与小球的球心距离'
                },
                {
                    name: 'torsionConst',
                    label: '悬丝扭转常数 k',
                    unit: 'N·m/rad',
                    value: 1e-4,
                    min: 1e-10,
                    max: 1e-2,
                    step: 0,
                    default: 1e-4,
                    description: '悬丝的扭转常数 (torsion wire stiffness)'
                },
                {
                    name: 'mirrorDist',
                    label: '镜面到屏距离 D',
                    unit: 'm',
                    value: 5,
                    min: 0.5,
                    max: 20,
                    step: 0.5,
                    default: 5,
                    description: '光杠杆的放大臂长'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 1,
                    min: 0.5,
                    max: 5,
                    step: 0.1,
                    default: 1,
                    description: '静态演示场景'
                }
            ],
            buildProblem: params => {
                const m1 = params['m1'] ?? 10;
                const m2 = params['m2'] ?? 0.5;
                const distance = params['distance'] ?? 0.1;
                const torsionConst = params['torsionConst'] ?? 1e-4;
                const mirrorDist = params['mirrorDist'] ?? 5;
                const duration = params['duration'] ?? 1;
                return {
                    id: `cav-${Date.now()}`,
                    title: '卡文迪什扭秤',
                    model: 'cavendish',
                    bodies: [
                        {
                            id: 'smallBall',
                            mass: { value: m2, unit: 'kg' },
                            position: { x: distance, y: 0 },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: { cavendish: { m1, m2, distance, torsionConst, mirrorDist, armLength: 1 } },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 50)
                };
            }
        },

    {
            id: 'moon-earth-test',
            name: '月地检验 (牛顿)',
            model: 'moon-earth-test',
            parameters: [
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 1,
                    min: 0.5,
                    max: 5,
                    step: 0.1,
                    default: 1,
                    description: '静态演示场景'
                }
            ],
            buildProblem: params => {
                const duration = params['duration'] ?? 1;
                return {
                    id: `met-${Date.now()}`,
                    title: '月地检验',
                    model: 'moon-earth-test',
                    bodies: [
                        { id: 'moon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: {
                        moonEarthTest: {
                            earthRadius: 6.371e6,
                            moonDistance: 3.844e8,
                            moonPeriod: 27.3 * 86400
                        }
                    },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 50)
                };
            }
        },

    {
            id: 'double-pendulum-sync',
            name: '双单摆步调比较',
            model: 'double-pendulum' as const,
            parameters: [
                {
                    name: 'length1',
                    label: '摆1摆长 L₁',
                    unit: 'm',
                    value: 1.0,
                    min: 0.1,
                    max: 5,
                    step: 0.05,
                    default: 1.0,
                    description: '第一个单摆的摆线长度 (m)'
                },
                {
                    name: 'length2',
                    label: '摆2摆长 L₂',
                    unit: 'm',
                    value: 0.5,
                    min: 0.1,
                    max: 5,
                    step: 0.05,
                    default: 0.5,
                    description: '第二个单摆的摆线长度 (m)'
                },
                {
                    name: 'angle1',
                    label: '摆1初始角 θ₁',
                    unit: '°',
                    value: 10,
                    min: 0,
                    max: 15,
                    step: 1,
                    default: 10,
                    description: '第一个摆初始偏离角度 (建议 ≤15°, 小角度近似)'
                },
                {
                    name: 'angle2',
                    label: '摆2初始角 θ₂',
                    unit: '°',
                    value: 10,
                    min: 0,
                    max: 15,
                    step: 1,
                    default: 10,
                    description: '第二个摆初始偏离角度 (建议 ≤15°, 小角度近似)'
                },
                {
                    name: 'phaseDiff',
                    label: '相位差 Δφ',
                    unit: '°',
                    value: 0,
                    min: 0,
                    max: 360,
                    step: 5,
                    default: 0,
                    description: '两摆相位差 (0°=同相, 180°=反相)'
                },
                {
                    name: 'gravity',
                    label: '重力加速度 g',
                    unit: 'm/s²',
                    value: PHYSICS_CONSTANTS.g.value,
                    min: 1,
                    max: 20,
                    step: 0.1,
                    default: PHYSICS_CONSTANTS.g.value,
                    description: '当地重力加速度'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 10,
                    min: 1,
                    max: 60,
                    step: 1,
                    default: 10,
                    description: '仿真总时长 (建议覆盖 ≥2 个长摆周期)'
                }
            ],
            buildProblem: params => {
                const L1 = params['length1'] ?? 1.0;
                const L2 = params['length2'] ?? 0.5;
                const th1 = params['angle1'] ?? 10;
                const th2 = params['angle2'] ?? 10;
                const phase = params['phaseDiff'] ?? 0;
                const g = params['gravity'] ?? PHYSICS_CONSTANTS.g.value;
                const duration = params['duration'] ?? 10;
                return {
                    id: `dp-${Date.now()}`,
                    title: '双单摆步调比较',
                    model: 'double-pendulum',
                    bodies: [
                        {
                            id: 'pendulum1',
                            mass: { value: 0.2, unit: 'kg' },
                            position: { x: L1 * Math.sin((th1 * Math.PI) / 180), y: L1 * Math.cos((th1 * Math.PI) / 180) },
                            velocity: { x: 0, y: 0 }
                        },
                        {
                            id: 'pendulum2',
                            mass: { value: 0.2, unit: 'kg' },
                            position: { x: L2 * Math.sin((th2 * Math.PI) / 180), y: L2 * Math.cos((th2 * Math.PI) / 180) },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: {
                        doublePendulum: {
                            length1: L1,
                            length2: L2,
                            initialAngle1: th1,
                            initialAngle2: th2,
                            phaseDiff: phase,
                            gravity: g
                        }
                    },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 500)
                };
            }
        },

    {
            id: 'forced-vibration-freq',
            name: '受迫振动 (频率响应)',
            model: 'forced-vibration' as const,
            parameters: [
                {
                    name: 'mass',
                    label: '振子质量 m',
                    unit: 'kg',
                    value: 1,
                    min: 0.01,
                    max: 10,
                    step: 0.01,
                    default: 1,
                    description: '振子质量 (kg)'
                },
                {
                    name: 'k',
                    label: '弹簧劲度系数 k',
                    unit: 'N/m',
                    value: 100,
                    min: 0.1,
                    max: 1000,
                    step: 1,
                    default: 100,
                    description: '弹簧劲度系数 (越大固有频率越高)'
                },
                {
                    name: 'beta',
                    label: '阻尼系数 β',
                    unit: '1/s',
                    value: 0.3,
                    min: 0,
                    max: 5,
                    step: 0.05,
                    default: 0.3,
                    description: '粘滞阻尼系数 = c/(2m) (越大振幅衰减越快)'
                },
                {
                    name: 'forceAmp',
                    label: '驱动力幅值 F₀',
                    unit: 'N',
                    value: 1,
                    min: 0.01,
                    max: 100,
                    step: 0.1,
                    default: 1,
                    description: '周期驱动力的幅值'
                },
                {
                    name: 'driveFreq',
                    label: '驱动频率 f_d',
                    unit: 'Hz',
                    value: 2,
                    min: 0.1,
                    max: 20,
                    step: 0.1,
                    default: 2,
                    description: '驱动力的频率 (靠近固有频率时共振)'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 20,
                    min: 1,
                    max: 60,
                    step: 1,
                    default: 20,
                    description: '仿真总时长 (需足够长以观察稳态)'
                }
            ],
            buildProblem: params => {
                const mass = params['mass'] ?? 1;
                const springConstant = params['k'] ?? 100;
                const dampingBeta = params['beta'] ?? 0.3;
                const forceAmplitude = params['forceAmp'] ?? 1;
                const drivingFreq = params['driveFreq'] ?? 2;
                const duration = params['duration'] ?? 20;
                return {
                    id: `fv-${Date.now()}`,
                    title: '受迫振动 (频率响应)',
                    model: 'forced-vibration',
                    bodies: [
                        {
                            id: 'oscillator',
                            mass: { value: mass, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: {
                        forcedVibration: { mass, springConstant, dampingBeta, forceAmplitude, drivingFreq }
                    },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 2000)
                };
            }
        },

    {
            id: 'resonance-curve',
            name: '共振曲线 (幅-频)',
            model: 'resonance' as const,
            parameters: [
                {
                    name: 'mass',
                    label: '振子质量 m',
                    unit: 'kg',
                    value: 1,
                    min: 0.01,
                    max: 10,
                    step: 0.01,
                    default: 1,
                    description: '振子质量 (kg)'
                },
                {
                    name: 'k',
                    label: '弹簧劲度系数 k',
                    unit: 'N/m',
                    value: 100,
                    min: 0.1,
                    max: 1000,
                    step: 1,
                    default: 100,
                    description: '决定固有频率 f₀ = √(k/m)/(2π)'
                },
                {
                    name: 'forceAmp',
                    label: '驱动力幅值 F₀',
                    unit: 'N',
                    value: 1,
                    min: 0.01,
                    max: 100,
                    step: 0.1,
                    default: 1,
                    description: '保持恒定的驱动力幅值'
                },
                {
                    name: 'beta',
                    label: '阻尼系数 β',
                    unit: '1/s',
                    value: 0.5,
                    min: 0.02,
                    max: 3,
                    step: 0.02,
                    default: 0.5,
                    description: '阻尼越小, 共振峰越高越尖'
                },
                {
                    name: 'freqMin',
                    label: '扫描下限 f_min',
                    unit: 'Hz',
                    value: 0.1,
                    min: 0.1,
                    max: 20,
                    step: 0.1,
                    default: 0.1,
                    description: '振幅-频率曲线扫描下限'
                },
                {
                    name: 'freqMax',
                    label: '扫描上限 f_max',
                    unit: 'Hz',
                    value: 10,
                    min: 0.5,
                    max: 30,
                    step: 0.1,
                    default: 10,
                    description: '振幅-频率曲线扫描上限 (应覆盖 f₀)'
                }
            ],
            buildProblem: params => {
                const mass = params['mass'] ?? 1;
                const springConstant = params['k'] ?? 100;
                const forceAmplitude = params['forceAmp'] ?? 1;
                const beta = params['beta'] ?? 0.5;
                const freqMin = params['freqMin'] ?? 0.1;
                const freqMax = params['freqMax'] ?? 10;
                return {
                    id: `res-${Date.now()}`,
                    title: '共振曲线 (幅-频)',
                    model: 'resonance',
                    bodies: [
                        { id: 'osc', mass: { value: mass, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    constraints: {
                        resonance: {
                            mass,
                            springConstant,
                            forceAmplitude,
                            dampingBetas: [beta],
                            freqMin,
                            freqMax
                        }
                    },
                    environment: {},
                    // 静态图 (A-f 曲线): 不需要长时间演化
                    timeConfig: makeTimeSeries(1, 100, 0.1)
                };
            }
        },

    {
            id: 'sound-waveform',
            name: '声音波形 (纯音+复合)',
            model: 'sound-waveform' as const,
            parameters: [
                {
                    name: 'frequency',
                    label: '基频 f',
                    unit: 'Hz',
                    value: 440,
                    min: 20,
                    max: 5000,
                    step: 10,
                    default: 440,
                    description: '声波基频 (A4 = 440 Hz)'
                },
                {
                    name: 'amplitude',
                    label: '振幅 A',
                    unit: '',
                    value: 0.8,
                    min: 0,
                    max: 1,
                    step: 0.05,
                    default: 0.8,
                    description: '振动幅度相对值 (0-1)'
                },
                {
                    name: 'waveType',
                    label: '波形 (0=纯音 1=复合 2=噪声)',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 2,
                    step: 1,
                    default: 0,
                    description: '0=纯音 (正弦); 1=复合音 (基频+谐波); 2=噪声'
                },
                {
                    name: 'harmonic1',
                    label: '2 倍频振幅',
                    unit: '',
                    value: 0.3,
                    min: 0,
                    max: 1,
                    step: 0.05,
                    default: 0.3,
                    description: '二次谐波相对振幅 (仅复合音模式有效)'
                },
                {
                    name: 'harmonic2',
                    label: '3 倍频振幅',
                    unit: '',
                    value: 0.2,
                    min: 0,
                    max: 1,
                    step: 0.05,
                    default: 0.2,
                    description: '三次谐波相对振幅 (仅复合音模式有效)'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 0.05,
                    min: 0.001,
                    max: 0.5,
                    step: 0.001,
                    default: 0.05,
                    description: '仿真总时长 (建议取 5-10 个基频周期)'
                }
            ],
            buildProblem: params => {
                const frequency = params['frequency'] ?? 440;
                const amplitude = params['amplitude'] ?? 0.8;
                const waveTypeIdx = params['waveType'] ?? 0;
                const waveTypes = ['pure', 'complex', 'noise'] as const;
                const waveType = waveTypes[waveTypeIdx] ?? 'pure';
                const h1 = params['harmonic1'] ?? 0.3;
                const h2 = params['harmonic2'] ?? 0.2;
                const harmonics = waveType === 'complex' ? [h1, h2] : [];
                const duration = params['duration'] ?? 0.05;
                return {
                    id: `sw-${Date.now()}`,
                    title: '声音波形 (纯音+复合)',
                    model: 'sound-waveform',
                    bodies: [
                        {
                            id: 'medium',
                            mass: { value: 0.1, unit: 'kg' },
                            position: { x: 0, y: 0 },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: {
                        soundWaveform: { frequency, amplitude, waveType, harmonics }
                    },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 500)
                };
            }
        },

    {
            id: 'doppler-effect',
            name: '多普勒效应 (声源运动)',
            model: 'doppler' as const,
            parameters: [
                {
                    name: 'soundSpeed',
                    label: '声速 v',
                    unit: 'm/s',
                    value: 340,
                    min: 300,
                    max: 400,
                    step: 1,
                    default: 340,
                    description: '空气中声速 (20°C ≈ 343 m/s)'
                },
                {
                    name: 'sourceFreq',
                    label: '声源频率 f',
                    unit: 'Hz',
                    value: 500,
                    min: 50,
                    max: 5000,
                    step: 10,
                    default: 500,
                    description: '声源发出的原始频率'
                },
                {
                    name: 'sourceSpeed',
                    label: '声源速度 v_s',
                    unit: 'm/s',
                    value: 30,
                    min: 0,
                    max: 330,
                    step: 1,
                    default: 30,
                    description: '声源相对介质的运动速度'
                },
                {
                    name: 'dirAngle',
                    label: '方向角 θ',
                    unit: '°',
                    value: 0,
                    min: 0,
                    max: 360,
                    step: 1,
                    default: 0,
                    description: '声源运动方向与观察者连线夹角 (0°=靠近, 180°=远离)'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 10,
                    min: 0.5,
                    max: 30,
                    step: 0.5,
                    default: 10,
                    description: '仿真总时长 (仅影响声源运动轨迹动画)'
                }
            ],
            buildProblem: params => {
                const soundSpeed = params['soundSpeed'] ?? 340;
                const sourceFreq = params['sourceFreq'] ?? 500;
                const sourceSpeed = params['sourceSpeed'] ?? 30;
                const dirAngle = params['dirAngle'] ?? 0;
                const duration = params['duration'] ?? 10;
                return {
                    id: `dop-${Date.now()}`,
                    title: '多普勒效应 (声源运动)',
                    model: 'doppler',
                    bodies: [
                        {
                            id: 'source',
                            mass: { value: 0.1, unit: 'kg' },
                            position: { x: -10, y: 0 },
                            velocity: { x: sourceSpeed, y: 0 }
                        }
                    ],
                    constraints: {
                        doppler: { soundSpeed, sourceFreq, sourceSpeed, directionAngle: dirAngle }
                    },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 50)
                };
            }
        },

    {
            id: 'water-diffraction',
            name: '水波衍射 (遇障碍物)',
            model: 'water-diffraction' as const,
            parameters: [
                {
                    name: 'wavelength',
                    label: '波长 λ',
                    unit: 'cm',
                    value: 4,
                    min: 0.5,
                    max: 20,
                    step: 0.5,
                    default: 4,
                    description: '水波波长 (cm)'
                },
                {
                    name: 'slitWidth',
                    label: '狭缝宽度 a',
                    unit: 'cm',
                    value: 5,
                    min: 0.5,
                    max: 50,
                    step: 0.5,
                    default: 5,
                    description: '障碍物狭缝宽度 (a/λ<1 衍射明显)'
                },
                {
                    name: 'screenDist',
                    label: '缝-挡板距离 L',
                    unit: 'cm',
                    value: 50,
                    min: 5,
                    max: 200,
                    step: 5,
                    default: 50,
                    description: '狭缝到后方挡板距离'
                },
                {
                    name: 'waveAmp',
                    label: '入射波振幅 A',
                    unit: 'cm',
                    value: 1,
                    min: 0.1,
                    max: 5,
                    step: 0.1,
                    default: 1,
                    description: '入射水波振幅'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 1,
                    min: 0.5,
                    max: 5,
                    step: 0.1,
                    default: 1,
                    description: '静态场景 (仅显示衍射强度图样)'
                }
            ],
            buildProblem: params => {
                const wavelength = params['wavelength'] ?? 4;
                const slitWidth = params['slitWidth'] ?? 5;
                const screenDist = params['screenDist'] ?? 50;
                const waveAmp = params['waveAmp'] ?? 1;
                const duration = params['duration'] ?? 1;
                return {
                    id: `wd-${Date.now()}`,
                    title: '水波衍射 (遇障碍物)',
                    model: 'water-diffraction',
                    bodies: [
                        {
                            id: 'wave',
                            mass: { value: 1, unit: 'kg' },
                            position: { x: -screenDist, y: 0 },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: {
                        waterDiffraction: { wavelength, slitWidth, screenDist, waveAmplitude: waveAmp }
                    },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 200)
                };
            }
        },

    {
            id: 'sound-interference',
            name: '声波干涉 (双喇叭)',
            model: 'sound-interference' as const,
            parameters: [
                {
                    name: 'frequency',
                    label: '声波频率 f',
                    unit: 'Hz',
                    value: 500,
                    min: 50,
                    max: 5000,
                    step: 10,
                    default: 500,
                    description: '相干声波频率'
                },
                {
                    name: 'speakerDist',
                    label: '两扬声器距离 d',
                    unit: 'm',
                    value: 3,
                    min: 0.5,
                    max: 20,
                    step: 0.1,
                    default: 3,
                    description: '扬声器 S₁ 与 S₂ 的距离'
                },
                {
                    name: 'soundSpeed',
                    label: '声速 v',
                    unit: 'm/s',
                    value: 340,
                    min: 300,
                    max: 400,
                    step: 1,
                    default: 340,
                    description: '空气中声速 (λ=v/f)'
                },
                {
                    name: 'obsX',
                    label: '观察点 x',
                    unit: 'm',
                    value: 3,
                    min: -30,
                    max: 30,
                    step: 0.5,
                    default: 3,
                    description: '观察点水平坐标 (沿两源连线方向)'
                },
                {
                    name: 'obsY',
                    label: '观察点 y',
                    unit: 'm',
                    value: 10,
                    min: 0.5,
                    max: 30,
                    step: 0.5,
                    default: 10,
                    description: '观察点到连线中点的垂直距离'
                },
                {
                    name: 'amplitude',
                    label: '单源振幅 A₀',
                    unit: '',
                    value: 0.5,
                    min: 0.1,
                    max: 1,
                    step: 0.05,
                    default: 0.5,
                    description: '单个声源的振幅相对值'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 1,
                    min: 0.5,
                    max: 5,
                    step: 0.1,
                    default: 1,
                    description: '静态场景 (仅显示声强空间分布)'
                }
            ],
            buildProblem: params => {
                const frequency = params['frequency'] ?? 500;
                const speakerDist = params['speakerDist'] ?? 3;
                const soundSpeed = params['soundSpeed'] ?? 340;
                const obsX = params['obsX'] ?? 3;
                const obsY = params['obsY'] ?? 10;
                const amplitude = params['amplitude'] ?? 0.5;
                const duration = params['duration'] ?? 1;
                return {
                    id: `si-${Date.now()}`,
                    title: '声波干涉 (双喇叭)',
                    model: 'sound-interference',
                    bodies: [
                        {
                            id: 'S1',
                            mass: { value: 0.1, unit: 'kg' },
                            position: { x: -speakerDist / 2, y: 0 },
                            velocity: { x: 0, y: 0 }
                        },
                        {
                            id: 'S2',
                            mass: { value: 0.1, unit: 'kg' },
                            position: { x: speakerDist / 2, y: 0 },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: {
                        soundInterference: {
                            frequency,
                            speakerDist,
                            soundSpeed,
                            observationX: obsX,
                            observationY: obsY,
                            amplitude
                        }
                    },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 100)
                };
            }
        },

    {
            id: 'projectile-collision',
            name: '平抛碰撞 (验证动量守恒)',
            model: 'projectile-collision' as const,
            parameters: [
                {
                    name: 'm1',
                    label: '入射球质量 m₁',
                    unit: 'kg',
                    value: 0.1,
                    min: 0.01,
                    max: 2,
                    step: 0.01,
                    default: 0.1,
                    description: '入射小球质量 (从斜轨释放)'
                },
                {
                    name: 'm2',
                    label: '被撞球质量 m₂',
                    unit: 'kg',
                    value: 0.1,
                    min: 0.01,
                    max: 2,
                    step: 0.01,
                    default: 0.1,
                    description: '静止被撞小球质量'
                },
                {
                    name: 'v1Initial',
                    label: '入射球碰前速度 v₁',
                    unit: 'm/s',
                    value: 2,
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                    default: 2,
                    description: '碰前入射球速度 (平抛初速)'
                },
                {
                    name: 'tableHeight',
                    label: '实验台高度 h',
                    unit: 'm',
                    value: 0.8,
                    min: 0.1,
                    max: 3,
                    step: 0.01,
                    default: 0.8,
                    description: '实验台水平面高度 (决定平抛时间 t=√(2h/g))'
                },
                {
                    name: 'restitution',
                    label: '弹性系数 e',
                    unit: '',
                    value: 1,
                    min: 0,
                    max: 1,
                    step: 0.01,
                    default: 1,
                    description: '1=完全弹性碰撞, 0=完全非弹性'
                },
                {
                    name: 'gravity',
                    label: '重力加速度 g',
                    unit: 'm/s²',
                    value: PHYSICS_CONSTANTS.g.value,
                    min: 1,
                    max: 20,
                    step: 0.1,
                    default: PHYSICS_CONSTANTS.g.value,
                    description: '当地重力加速度'
                },
                {
                    name: 'duration',
                    label: '模拟时长',
                    unit: 's',
                    value: 5,
                    min: 1,
                    max: 30,
                    step: 0.5,
                    default: 5,
                    description: '仿真总时长 (覆盖完整平抛过程)'
                }
            ],
            buildProblem: params => {
                const m1 = params['m1'] ?? 0.1;
                const m2 = params['m2'] ?? 0.1;
                const v1Initial = params['v1Initial'] ?? 2;
                const tableHeight = params['tableHeight'] ?? 0.8;
                const restitution = params['restitution'] ?? 1;
                const g = params['gravity'] ?? PHYSICS_CONSTANTS.g.value;
                const duration = params['duration'] ?? 5;
                // 预计算平抛下落时长, 确保动画覆盖完整过程
                const tFall = Math.sqrt((2 * tableHeight) / g);
                const effDuration = Math.max(duration, tFall * 1.2);
                return {
                    id: `pc-${Date.now()}`,
                    title: '平抛碰撞 (验证动量守恒)',
                    model: 'projectile-collision',
                    bodies: [
                        {
                            id: 'A',
                            mass: { value: m1, unit: 'kg' },
                            position: { x: 0, y: tableHeight },
                            velocity: { x: v1Initial, y: 0 }
                        },
                        {
                            id: 'B',
                            mass: { value: m2, unit: 'kg' },
                            position: { x: 0, y: tableHeight },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: {
                        projectileCollision: { m1, m2, v1Initial, tableHeight, restitution, gravity: g }
                    },
                    environment: {
                        gravity: { enabled: true, value: g },
                        ground: { enabled: true, y: 0 }
                    },
                    timeConfig: makeTimeSeries(effDuration, 300)
                };
            }
        },

    {
            id: 'newton-tube',
            name: '牛顿管 (真空 vs 空气)',
            model: 'uniform-accelerated',
            parameters: [
                {
                    name: 'withAir',
                    label: '介质 (1空气 0真空)',
                    unit: '',
                    value: 1,
                    min: 0,
                    max: 1,
                    step: 1,
                    default: 1,
                    description: '1=有空气 (羽毛受阻力); 0=真空 (同时落地)'
                },
                {
                    name: 'height',
                    label: '管高',
                    unit: 'm',
                    value: 5,
                    min: 1,
                    max: 10,
                    step: 0.5,
                    default: 5,
                    description: '下落高度 (物理距离)'
                },
                {
                    name: 'g',
                    label: '重力加速度 g',
                    unit: 'm/s²',
                    value: 9.8,
                    min: 1,
                    max: 30,
                    step: 0.1,
                    default: 9.8,
                    description: '重力加速度'
                },
                {
                    name: 'duration',
                    label: '动画时长',
                    unit: 's',
                    value: 2,
                    min: 0.5,
                    max: 10,
                    step: 0.5,
                    default: 2,
                    description: '动画播放时长'
                }
            ],
            buildProblem: params => {
                const g = params['g'] ?? 9.8;
                const duration = params['duration'] ?? 2;
                return {
                    id: `newton-tube-${Date.now()}`,
                    title: '牛顿管',
                    model: 'uniform-accelerated' as const,
                    bodies: [
                        { id: 'object', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }
                    ],
                    environment: { gravity: { enabled: true, value: g } },
                    timeConfig: makeTimeSeries(duration, 1000)
                };
            }
        },

    {
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
        },

    {
            id: 'ball-xt',
            name: '小球 x-t 图像 (简谐运动)',
            model: 'simple-pendulum',
            parameters: [
                {
                    name: 'length',
                    label: '摆长 L',
                    unit: 'm',
                    value: 1.0,
                    min: 0.2,
                    max: 5,
                    step: 0.05,
                    default: 1.0,
                    description: '摆线长度 (m)'
                },
                {
                    name: 'angle',
                    label: '初始摆角 θ₀',
                    unit: '°',
                    value: 15,
                    min: 1,
                    max: 80,
                    step: 1,
                    default: 15,
                    description: '初始偏离竖直方向角度'
                },
                {
                    name: 'mass',
                    label: '摆球质量 m',
                    unit: 'kg',
                    value: 1,
                    min: 0.1,
                    max: 5,
                    step: 0.1,
                    default: 1,
                    description: '摆球质量'
                },
                {
                    name: 'g',
                    label: '重力加速度 g',
                    unit: 'm/s²',
                    value: 9.8,
                    min: 1,
                    max: 30,
                    step: 0.1,
                    default: 9.8,
                    description: '重力加速度'
                },
                {
                    name: 'damping',
                    label: '阻尼系数',
                    unit: '',
                    value: 0,
                    min: 0,
                    max: 2,
                    step: 0.05,
                    default: 0,
                    description: '0=无阻尼'
                },
                {
                    name: 'duration',
                    label: '动画时长',
                    unit: 's',
                    value: 10,
                    min: 1,
                    max: 60,
                    step: 1,
                    default: 10,
                    description: '动画播放时长'
                }
            ],
            buildProblem: params => {
                const L = params['length'] ?? 1.0;
                const angleDeg = params['angle'] ?? 15;
                const mass = params['mass'] ?? 1;
                const g = params['g'] ?? 9.8;
                const damping = params['damping'] ?? 0;
                const duration = params['duration'] ?? 10;
                return {
                    id: `ball-xt-${Date.now()}`,
                    title: '小球 x-t 图像',
                    model: 'simple-pendulum' as const,
                    bodies: [
                        {
                            id: 'bob',
                            mass: { value: mass, unit: 'kg' },
                            position: {
                                x: L * Math.sin((angleDeg * Math.PI) / 180),
                                y: L * Math.cos((angleDeg * Math.PI) / 180)
                            },
                            velocity: { x: 0, y: 0 }
                        }
                    ],
                    constraints: { simplePendulum: { length: L, g, initialAngleDeg: angleDeg, damping } },
                    environment: {},
                    timeConfig: makeTimeSeries(duration, 1000)
                };
            }
        }
];

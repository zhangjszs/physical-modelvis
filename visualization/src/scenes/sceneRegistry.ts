import type { SceneConfig } from '../types/visualization';
import { PHYSICS_CONSTANTS } from 'physics-core';

/** 已注册的场景列表 */
export const SCENES: SceneConfig[] = [
  {
    id: 'projectile',
    name: '抛体运动 (平抛+斜抛)',
    model: 'projectile',
    parameters: [
      { name: 'v0', label: '初速度 v₀', unit: 'm/s', value: 20, min: 1, max: 100, step: 1, default: 20, description: '物体开始运动时的速度大小' },
      { name: 'angle', label: '发射角 θ', unit: '°', value: 45, min: 0, max: 90, step: 1, default: 45, description: '初速度方向与水平面的夹角 (0°=平抛, 90°=竖直上抛)' },
      { name: 'h0', label: '发射高度 h₀', unit: 'm', value: 0, min: 0, max: 100, step: 1, default: 0, description: '发射点相对地面的初始高度' },
      { name: 'g', label: '重力加速度 g', unit: 'm/s²', value: PHYSICS_CONSTANTS.g.value, min: 0.1, max: 30, step: 0.1, default: PHYSICS_CONSTANTS.g.value, description: '重力加速度大小' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 5, min: 0.5, max: 30, step: 0.5, default: 5, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
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
        bodies: [{
          id: 'ball',
          mass: { value: 1, unit: 'kg' },
          position: { x: 0, y: h0 },
          velocity: { x: v0x, y: v0y },
        }],
        environment: {
          gravity: { enabled: true, value: g },
          ground: { enabled: true, y: 0 },
        },
        timeConfig: { duration, dt: Math.min(0.01, duration / 1000), sampleCount: 1000 },
      };
    },
  },
  {
    id: 'uniform-accelerated',
    name: '自由落体(竖直)',
    model: 'uniform-accelerated',
    parameters: [
      { name: 'v0y', label: '竖直初速度 vy₀', unit: 'm/s', value: 0, min: -50, max: 50, step: 1, default: 0, description: '竖直方向初速度（向上为正）' },
      { name: 'g', label: '重力加速度 g', unit: 'm/s²', value: PHYSICS_CONSTANTS.g.value, min: 0.1, max: 30, step: 0.1, default: PHYSICS_CONSTANTS.g.value, description: '重力加速度大小' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 3, min: 0.5, max: 30, step: 0.5, default: 3, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
      const v0y = params['v0y'] ?? 0;
      const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
      const duration = params['duration'] ?? 3;
      return {
        id: `uniform-accel-${Date.now()}`,
        title: '自由落体(竖直)',
        model: 'uniform-accelerated',
        bodies: [{
          id: 'object',
          mass: { value: 1, unit: 'kg' },
          position: { x: 0, y: 0 },
          velocity: { x: 0, y: v0y },
        }],
        environment: {
          gravity: { enabled: true, value: g },
        },
        timeConfig: { duration, dt: 0.01, sampleCount: 1000 },
      };
    },
  },
  {
    id: 'free-fall',
    name: '自由落体',
    model: 'uniform-accelerated',
    parameters: [
      { name: 'height', label: '初始高度 h', unit: 'm', value: 20, min: 1, max: 200, step: 1, default: 20, description: '物体开始下落的高度' },
      { name: 'g', label: '重力加速度 g', unit: 'm/s²', value: PHYSICS_CONSTANTS.g.value, min: 0.1, max: 30, step: 0.1, default: PHYSICS_CONSTANTS.g.value, description: '重力加速度大小' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 3, min: 0.5, max: 30, step: 0.5, default: 3, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
      const height = params['height'] ?? 20;
      const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
      const duration = params['duration'] ?? 3;
      return {
        id: `free-fall-${Date.now()}`,
        title: '自由落体',
        model: 'uniform-accelerated',
        bodies: [{
          id: 'ball',
          mass: { value: 1, unit: 'kg' },
          position: { x: 0, y: height },
          velocity: { x: 0, y: 0 },
        }],
        environment: {
          gravity: { enabled: true, value: g },
        },
        timeConfig: { duration, dt: 0.01, sampleCount: 1000 },
      };
    },
  },
  {
    id: 'electric-field',
    name: '匀强电场',
    model: 'uniform-electric-field',
    parameters: [
      { name: 'v0x', label: '水平初速度 vx₀', unit: 'm/s', value: 5, min: -100, max: 100, step: 0.5, default: 5, description: '水平方向初速度' },
      { name: 'v0y', label: '竖直初速度 vy₀', unit: 'm/s', value: 0, min: -100, max: 100, step: 0.5, default: 0, description: '竖直方向初速度' },
      { name: 'charge', label: '电荷量 q', unit: '×10⁻¹⁹ C', value: 1.6, min: -10, max: 10, step: 0.1, default: 1.6, description: '带电粒子电荷量（正=正电荷，负=负电荷）' },
      { name: 'mass', label: '质量 m', unit: '×10⁻²⁷ kg', value: 1.67, min: 0.01, max: 100, step: 0.1, default: 1.67, description: '粒子质量' },
      { name: 'Ey', label: '电场强度 Ey', unit: 'N/C', value: 100, min: -1000, max: 1000, step: 10, default: 100, description: '匀强电场的 y 分量（正=向上，负=向下）' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 2, min: 0.1, max: 20, step: 0.1, default: 2, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
      const v0x = params['v0x'] ?? 5;
      const v0y = params['v0y'] ?? 0;
      const q = (params['charge'] ?? 1.6) * 1e-19;
      const m = (params['mass'] ?? 1.67) * 1e-27;
      const Ey = params['Ey'] ?? 100;
      const duration = params['duration'] ?? 2;
      return {
        id: `electric-field-${Date.now()}`,
        title: '匀强电场',
        model: 'uniform-electric-field',
        bodies: [{
          id: 'charge',
          mass: { value: m, unit: 'kg' },
          charge: { value: q, unit: 'C' },
          position: { x: 0, y: 0 },
          velocity: { x: v0x, y: v0y },
        }],
        environment: {
          electricField: { enabled: true, fieldVector: { x: 0, y: Ey } },
        },
        timeConfig: { duration, dt: 0.001, sampleCount: 1000 },
      };
    },
  },
  {
    id: 'magnetic-field',
    name: '匀强磁场',
    model: 'uniform-magnetic-field',
    parameters: [
      { name: 'v0x', label: '水平初速度 vx₀', unit: 'm/s', value: 1000, min: 1, max: 100000, step: 100, default: 1000, description: '水平方向初速度' },
      { name: 'v0y', label: '竖直初速度 vy₀', unit: 'm/s', value: 0, min: -100000, max: 100000, step: 100, default: 0, description: '竖直方向初速度' },
      { name: 'charge', label: '电荷量 q', unit: '×10⁻¹⁹ C', value: 1.6, min: -10, max: 10, step: 0.1, default: 1.6, description: '带电粒子电荷量' },
      { name: 'mass', label: '质量 m', unit: '×10⁻²⁷ kg', value: 1.67, min: 0.01, max: 100, step: 0.1, default: 1.67, description: '粒子质量' },
      { name: 'Bz', label: '磁感应强度 B', unit: 'T', value: 0.01, min: 0.0001, max: 10, step: 0.001, default: 0.01, description: '匀强磁场强度（垂直于运动平面）' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 0.01, min: 0.0001, max: 1, step: 0.001, default: 0.01, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
      const v0x = params['v0x'] ?? 1000;
      const v0y = params['v0y'] ?? 0;
      const q = (params['charge'] ?? 1.6) * 1e-19;
      const m = (params['mass'] ?? 1.67) * 1e-27;
      const Bz = params['Bz'] ?? 0.01;
      const duration = params['duration'] ?? 0.01;
      return {
        id: `magnetic-field-${Date.now()}`,
        title: '匀强磁场',
        model: 'uniform-magnetic-field',
        bodies: [{
          id: 'charge',
          mass: { value: m, unit: 'kg' },
          charge: { value: q, unit: 'C' },
          position: { x: 0, y: 0 },
          velocity: { x: v0x, y: v0y },
        }],
        environment: {
          magneticField: { enabled: true, fieldStrength: Bz, direction: 'out' },
        },
        timeConfig: { duration, dt: duration / 1000, sampleCount: 1000 },
      };
    },
  },
  {
    id: 'collision',
    name: '碰撞',
    model: 'collision-elastic',
    parameters: [
      { name: 'm1', label: '物体1质量 m₁', unit: 'kg', value: 1, min: 0.1, max: 100, step: 0.1, default: 1, description: '第一个物体的质量' },
      { name: 'm2', label: '物体2质量 m₂', unit: 'kg', value: 1, min: 0.1, max: 100, step: 0.1, default: 1, description: '第二个物体的质量' },
      { name: 'v1', label: '物体1初速度 v₁', unit: 'm/s', value: 5, min: -100, max: 100, step: 0.5, default: 5, description: '第一个物体的初速度（正=向右）' },
      { name: 'v2', label: '物体2初速度 v₂', unit: 'm/s', value: 0, min: -100, max: 100, step: 0.5, default: 0, description: '第二个物体的初速度（正=向右）' },
      { name: 'e', label: '恢复系数 e', unit: '', value: 1, min: 0, max: 1, step: 0.01, default: 1, description: '1=弹性碰撞, 0=完全非弹性碰撞' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 3, min: 0.5, max: 20, step: 0.5, default: 3, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
      const m1 = params['m1'] ?? 1;
      const m2 = params['m2'] ?? 1;
      const v1 = params['v1'] ?? 5;
      const v2 = params['v2'] ?? 0;
      const e = params['e'] ?? 1;
      const duration = params['duration'] ?? 3;
      const model = e >= 0.99 ? 'collision-elastic' as const : 'collision-inelastic' as const;
      return {
        id: `collision-${Date.now()}`,
        title: e >= 0.99 ? '弹性碰撞' : '非弹性碰撞',
        model,
        bodies: [
          { id: 'body1', mass: { value: m1, unit: 'kg' }, position: { x: -2, y: 0 }, velocity: { x: v1, y: 0 } },
          { id: 'body2', mass: { value: m2, unit: 'kg' }, position: { x: 2, y: 0 }, velocity: { x: v2, y: 0 } },
        ],
        constraints: e < 0.99 ? { collision: { restitution: e } } : {},
        environment: {},
        timeConfig: { duration, dt: 0.001, sampleCount: 1000 },
      };
    },
  },
  {
    id: 'spring',
    name: '弹簧振子',
    model: 'spring-oscillator',
    parameters: [
      { name: 'm', label: '质量 m', unit: 'kg', value: 1, min: 0.1, max: 100, step: 0.1, default: 1, description: '振子质量' },
      { name: 'k', label: '劲度系数 k', unit: 'N/m', value: 10, min: 0.1, max: 1000, step: 0.5, default: 10, description: '弹簧劲度系数' },
      { name: 'A', label: '振幅 A', unit: 'm', value: 0.5, min: 0.01, max: 10, step: 0.05, default: 0.5, description: '初始振幅（偏离平衡位置的距离）' },
      { name: 'damping', label: '阻尼系数', unit: '', value: 0, min: 0, max: 5, step: 0.05, default: 0, description: '0=无阻尼，越大阻尼越强' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 5, min: 0.5, max: 30, step: 0.5, default: 5, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
      const m = params['m'] ?? 1;
      const k = params['k'] ?? 10;
      const A = params['A'] ?? 0.5;
      const damping = params['damping'] ?? 0;
      const duration = params['duration'] ?? 5;
      return {
        id: `spring-${Date.now()}`,
        title: '弹簧振子',
        model: 'spring-oscillator',
        bodies: [{
          id: 'block',
          mass: { value: m, unit: 'kg' },
          position: { x: A, y: 0 },
          velocity: { x: 0, y: 0 },
        }],
        constraints: {
          spring: { springConstant: k, naturalLength: 0, anchorPoint: { x: 0, y: 0 } },
        },
        environment: damping > 0 ? { airResistance: { enabled: true, coefficient: damping } } : {},
        timeConfig: { duration, dt: 0.001, sampleCount: 1000 },
      };
    },
  },
  {
    id: 'inclined-plane',
    name: '斜面运动',
    model: 'inclined-plane',
    parameters: [
      { name: 'm', label: '质量 m', unit: 'kg', value: 1, min: 0.1, max: 100, step: 0.1, default: 1, description: '物体质量' },
      { name: 'theta', label: '倾角 θ', unit: '°', value: 30, min: 5, max: 85, step: 1, default: 30, description: '斜面与水平面的夹角' },
      { name: 'mu', label: '摩擦系数 μ', unit: '', value: 0, min: 0, max: 1, step: 0.01, default: 0, description: '斜面与物体间的摩擦系数（0=光滑）' },
      { name: 'v0', label: '初速度 v₀', unit: 'm/s', value: 0, min: -50, max: 50, step: 0.5, default: 0, description: '沿斜面向上的初速度' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 3, min: 0.5, max: 20, step: 0.5, default: 3, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
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
        bodies: [{
          id: 'block',
          mass: { value: m, unit: 'kg' },
          position: { x: 0, y: 0 },
          velocity: { x: v0x, y: v0y },
        }],
        constraints: {
          inclinedPlane: { angle: thetaDeg, frictionCoefficient: mu },
        },
        environment: {
          gravity: { enabled: true, value: 9.8 },
        },
        timeConfig: { duration, dt: 0.001, sampleCount: 1000 },
      };
    },
  },
  {
    id: 'em-combined',
    name: '电磁复合场',
    model: 'em-combined-field',
    parameters: [
      { name: 'charge', label: '电荷量 q', unit: '×10⁻¹⁹ C', value: 1.6, min: -10, max: 10, step: 0.1, default: 1.6, description: '带电粒子电荷量' },
      { name: 'mass', label: '质量 m', unit: '×10⁻²⁷ kg', value: 1.67, min: 0.01, max: 100, step: 0.1, default: 1.67, description: '粒子质量' },
      { name: 'v0x', label: '水平初速度 vx₀', unit: 'm/s', value: 1000, min: 1, max: 100000, step: 100, default: 1000, description: '水平方向初速度' },
      { name: 'v0y', label: '竖直初速度 vy₀', unit: 'm/s', value: 0, min: -100000, max: 100000, step: 100, default: 0, description: '竖直方向初速度' },
      { name: 'Ex', label: '电场强度 Ex', unit: 'N/C', value: 100, min: -1000, max: 1000, step: 10, default: 100, description: '匀强电场 x 分量' },
      { name: 'Bz', label: '磁感应强度 B', unit: 'T', value: 0.01, min: 0.0001, max: 10, step: 0.001, default: 0.01, description: '匀强磁场强度（垂直于运动平面）' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 0.01, min: 0.0001, max: 1, step: 0.001, default: 0.01, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
      const q = (params['charge'] ?? 1.6) * 1e-19;
      const m = (params['mass'] ?? 1.67) * 1e-27;
      const v0x = params['v0x'] ?? 1000;
      const v0y = params['v0y'] ?? 0;
      const Ex = params['Ex'] ?? 100;
      const Bz = params['Bz'] ?? 0.01;
      const duration = params['duration'] ?? 0.01;
      return {
        id: `em-combined-${Date.now()}`,
        title: '电磁复合场',
        model: 'em-combined-field',
        bodies: [{
          id: 'charge',
          mass: { value: m, unit: 'kg' },
          charge: { value: q, unit: 'C' },
          position: { x: 0, y: 0 },
          velocity: { x: v0x, y: v0y },
        }],
        environment: {
          electricField: { enabled: true, fieldVector: { x: Ex, y: 0 } },
          magneticField: { enabled: true, fieldStrength: Bz, direction: 'out' },
        },
        timeConfig: { duration, dt: duration / 1000, sampleCount: 1000 },
      };
    },
  },
  {
    id: 'circular-motion',
    name: '匀速圆周运动 (向心力)',
    model: 'uniform-circular-motion',
    parameters: [
      { name: 'mass', label: '小球质量 m', unit: 'kg', value: 0.2, min: 0.01, max: 5, step: 0.01, default: 0.2, description: '做圆周运动的小球质量' },
      { name: 'radius', label: '圆周半径 r', unit: 'm', value: 1.0, min: 0.1, max: 5, step: 0.05, default: 1.0, description: '圆周运动半径（绳长）' },
      { name: 'omega', label: '角速度 ω', unit: 'rad/s', value: 3.0, min: 0.1, max: 20, step: 0.1, default: 3.0, description: '角速度大小，越大转得越快' },
      { name: 'initialAngle', label: '初始角度', unit: '°', value: 0, min: 0, max: 360, step: 5, default: 0, description: '小球初始位置的角度（0°=正右方）' },
      { name: 'revolutions', label: '转动圈数', unit: '周', value: 3, min: 0.5, max: 20, step: 0.5, default: 3, description: '仿真显示的转动圈数' },
      { name: 'conicalMode', label: '圆锥摆模式 (1=是 0=否)', unit: '', value: 0, min: 0, max: 1, step: 1, default: 0, description: '1=启用圆锥摆 (由绳长+摆角自动推导 ω)；0=手动指定 ω' },
      { name: 'ropeLength', label: '圆锥摆绳长 L', unit: 'm', value: 1.0, min: 0.2, max: 3, step: 0.05, default: 1.0, description: '圆锥摆的摆线长度 (启用圆锥摆时生效)' },
      { name: 'conicalAngle', label: '圆锥摆摆角 θ', unit: '°', value: 30, min: 1, max: 80, step: 1, default: 30, description: '圆锥摆细绳与竖直方向夹角 (启用圆锥摆时生效)' },
    ],
    buildProblem: (params) => {
      const mass = params['mass'] ?? 0.2;
      const radius = params['radius'] ?? 1.0;
      let omega = params['omega'] ?? 3.0;
      const initialAngleDeg = params['initialAngle'] ?? 0;
      const revolutions = params['revolutions'] ?? 3;
      const conicalMode = (params['conicalMode'] ?? 0) === 1;
      const ropeLength = params['ropeLength'] ?? 1.0;
      const conicalAngleDeg = params['conicalAngle'] ?? 30;
      const phi0 = (initialAngleDeg * Math.PI) / 180;
      // 圆锥摆：ω 由 model (physics-core) 单一推导 → ω = √(g / (L·cosθ))
      // scene 仅在圆锥摆模式下计算 omega 本地副本用于 duration 估算, 不写回 constraint.angularVelocity
      const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
      const conicalAngleRad = conicalMode ? (conicalAngleDeg * Math.PI / 180) : 0;
      const computedOmega = conicalMode ? Math.sqrt(g / (ropeLength * Math.cos(conicalAngleRad))) : null;
      const finalRadius = conicalMode ? ropeLength * Math.sin(conicalAngleRad) : radius;
      // 用于时长计算的 omega：圆锥摆使用推导值, 否则使用 UI 值
      const effectiveOmega = computedOmega ?? omega;
      const duration = (2 * Math.PI * revolutions) / effectiveOmega;
      return {
        id: `circular-motion-${Date.now()}`,
        title: conicalMode ? '圆锥摆 (圆锥曲线运动)' : '匀速圆周运动 (向心力)',
        model: 'uniform-circular-motion' as const,
        bodies: [{
          id: 'ball',
          mass: { value: mass, unit: 'kg' },
          position: { x: finalRadius * Math.cos(phi0), y: finalRadius * Math.sin(phi0) },
          // 速度：非圆锥摆模式使用 scene omega；圆锥摆模式下 velocity 为占位，model 会重新计算
          velocity: { x: -finalRadius * effectiveOmega * Math.sin(phi0), y: finalRadius * effectiveOmega * Math.cos(phi0) },
        }],
        constraints: {
          circularMotion: {
            center: { x: 0, y: 0 },
            radius: finalRadius,
            // 圆锥摆模式下 angularVelocity 为占位值；model 根据 conicalAngleDeg + ropeLength + g 自动覆盖
            angularVelocity: computedOmega ?? omega,
            initialAngle: phi0,
            ...(conicalMode ? { conicalAngleDeg, ropeLength } : {}),
          },
        },
        environment: {
          gravity: { enabled: false },
        },
        timeConfig: { duration, dt: duration / 600, sampleCount: 600 },
      };
    },
  },
  // ========================================================================
  // 必修二 第三章 万有引力与航天
  // ========================================================================
  {
    id: 'orbital',
    name: '万有引力与航天 (卫星轨道)',
    model: 'orbital',
    parameters: [
      { name: 'altitude', label: '轨道高度 h', unit: 'km', value: 400, min: 200, max: 36000, step: 50, default: 400, description: '卫星距地表高度 (ISS ≈ 400km, GEO ≈ 36000km)' },
      { name: 'velocityFactor', label: '速度/圆轨道速度', unit: '', value: 1.0, min: 0.5, max: 1.5, step: 0.01, default: 1.0, description: '1.0 = 圆轨道; <1 = 椭圆(远地点在此); >1 = 椭圆(近地点在此)或逃逸' },
      { name: 'duration', label: '模拟时长', unit: 'min', value: 120, min: 1, max: 1440, step: 5, default: 120, description: '仿真总时长 (1440min = 1天，可观测多圈)' },
    ],
    buildProblem: (params) => {
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
        bodies: [{
          id: 'satellite',
          mass: { value: 1000, unit: 'kg' },
          position: { x: r, y: 0 },
          velocity: { x: 0, y: v },
        }],
        constraints: { orbital: { GM, centralRadius: R_EARTH } },
        environment: {},
        // 步长自适应：近地轨道几分钟一圈，GEO 24h 一圈 — 每圈至少 600 步
        timeConfig: { duration: durationMin * 60, dt: 1, sampleCount: Math.min(5000, durationMin * 60) },
      };
    },
  },
  {
    id: 'air-track',
    name: '气垫导轨测速度',
    model: 'uniform-linear',
    parameters: [
      { name: 'mass', label: '滑块质量 m', unit: 'kg', value: 0.2, min: 0.05, max: 2, step: 0.01, default: 0.2, description: '滑块质量（仅展示，匀速运动不影响结果）' },
      { name: 'v0', label: '初速度 v₀', unit: 'm/s', value: 0.5, min: 0.05, max: 5, step: 0.05, default: 0.5, description: '滑块在导轨上滑行的速度' },
      { name: 'flagWidth', label: '挡光片宽度 Δx', unit: 'm', value: 0.02, min: 0.005, max: 0.10, step: 0.005, default: 0.02, description: '挡光片宽度（推荐 0.01/0.02/0.05/0.10 m）' },
      { name: 'x1', label: '光电门1位置 x₁', unit: 'm', value: 0.3, min: 0, max: 1.5, step: 0.01, default: 0.3, description: '第一个光电门距导轨起点的距离' },
      { name: 'x2', label: '光电门2位置 x₂', unit: 'm', value: 0.8, min: 0, max: 1.5, step: 0.01, default: 0.8, description: '第二个光电门距导轨起点的距离' },
      { name: 'trackLength', label: '导轨长度', unit: 'm', value: 1.5, min: 0.5, max: 3, step: 0.1, default: 1.5, description: '气垫导轨总长度' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 2, min: 0.5, max: 10, step: 0.5, default: 2, description: '仿真总时长' },
    ],
    buildProblem: (params) => {
      const v0 = params['v0'] ?? 0.5;
      const duration = params['duration'] ?? 2;
      const mass = params['mass'] ?? 0.2;
      return {
        id: `air-track-${Date.now()}`,
        title: '气垫导轨测速度',
        model: 'uniform-linear',
        bodies: [{
          id: 'glider',
          mass: { value: mass, unit: 'kg' },
          position: { x: 0, y: 0 },
          velocity: { x: v0, y: 0 },
        }],
        environment: {},
        timeConfig: { duration, dt: duration / 400, sampleCount: 400 },
      };
    },
  },
  // ========================================================================
  // 必修二 第四章 机械能及其守恒定律
  // ========================================================================
  {
    id: 'energy-conservation',
    name: '机械能守恒定律 (动能↔势能)',
    model: 'uniform-accelerated',
    parameters: [
      { name: 'h0', label: '释放高度 h', unit: 'm', value: 10, min: 1, max: 100, step: 1, default: 10, description: '小球初始高度 (相对地面)' },
      { name: 'v0', label: '初速度 v₀ (水平)', unit: 'm/s', value: 0, min: -30, max: 30, step: 1, default: 0, description: '小球初始速度 (0=自由落体释放, >0=带初速抛射)' },
      { name: 'mass', label: '质量 m', unit: 'kg', value: 1, min: 0.1, max: 10, step: 0.1, default: 1, description: '小球质量' },
      { name: 'g', label: '重力加速度 g', unit: 'm/s²', value: PHYSICS_CONSTANTS.g.value, min: 1, max: 30, step: 0.1, default: PHYSICS_CONSTANTS.g.value, description: '重力加速度' },
      { name: 'friction', label: '摩擦力 (N)', unit: 'N', value: 0, min: 0, max: 20, step: 0.5, default: 0, description: '恒定阻力 (0=光滑 → 机械能守恒; >0 → 机械能损失)' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 3, min: 0.5, max: 30, step: 0.5, default: 3, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
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
        bodies: [{
          id: 'ball',
          mass: { value: mass, unit: 'kg' },
          position: { x: 0, y: h0 },
          velocity: { x: v0x, y: v0y },
        }],
        environment: {
          gravity: { enabled: true, value: g },
          ground: friction > 0 ? { enabled: true, y: 0, friction: friction / (mass * g) } : { enabled: true, y: 0 },
        },
        timeConfig: { duration, dt: duration / 500, sampleCount: 500 },
      };
    },
  },
  // ========================================================================
  // 选必一 第一章 动量守恒定律
  // ========================================================================
  {
    id: 'momentum',
    name: '动量定理与反冲',
    model: 'momentum',
    parameters: [
      { name: 'modeLabel', label: '模式 (0=动量定理 1=反冲)', unit: '', value: 0, min: 0, max: 1, step: 1, default: 0, description: '0=恒力冲量演示 F·Δt = Δp；1=反冲运动 (两物体分离)' },
      { name: 'force', label: '恒力 F (动量定理模式)', unit: 'N', value: 10, min: -50, max: 50, step: 1, default: 10, description: '作用在物体上的恒力 (正=向右)' },
      { name: 'mass', label: '物体质量 m', unit: 'kg', value: 2, min: 0.1, max: 50, step: 0.5, default: 2, description: '物体1 (主物体) 质量' },
      { name: 'mass2', label: '物体2质量 (反冲模式)', unit: 'kg', value: 1, min: 0.01, max: 10, step: 0.1, default: 1, description: '反冲模式中喷出/分离的物体2质量' },
      { name: 'v2', label: '物体2碰后速度 (反冲)', unit: 'm/s', value: 5, min: -50, max: 50, step: 0.5, default: 5, description: '反冲模式中物体2获得的速度 (自动计算物体1速度)' },
      { name: 'v0', label: '物体1初速度', unit: 'm/s', value: 0, min: -30, max: 30, step: 1, default: 0, description: '物体1初始速度' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 3, min: 0.5, max: 20, step: 0.5, default: 3, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
      const modeNum = params['modeLabel'] ?? 0;
      const mode = modeNum === 1 ? 'recoil' as const : 'impulse' as const;
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
            { id: 'A', mass: { value: mass, unit: 'kg' }, position: { x: -1, y: 0 }, velocity: { x: 0, y: 0 } },
            { id: 'B', mass: { value: mass2, unit: 'kg' }, position: { x: 1, y: 0 }, velocity: { x: v2, y: 0 } },
          ],
          constraints: { momentum: { mode: 'recoil' } },
          environment: {},
          timeConfig: { duration, dt: duration / 300, sampleCount: 300 },
        };
      }

      return {
        id: `momentum-${Date.now()}`,
        title: '动量定理 (F·Δt = Δp)',
        model: 'momentum',
        bodies: [{
          id: 'block',
          mass: { value: mass, unit: 'kg' },
          position: { x: 0, y: 0 },
          velocity: { x: v0, y: 0 },
        }],
        constraints: { momentum: { mode: 'impulse', force } },
        environment: {},
        timeConfig: { duration, dt: duration / 300, sampleCount: 300 },
      };
    },
  },
  // ========================================================================
  // 选必一 第三章 机械波
  // ========================================================================
  {
    id: 'mechanical-wave',
    name: '机械波 (横波/纵波/干涉)',
    model: 'mechanical-wave',
    parameters: [
      { name: 'waveMode', label: '模式 (0=横波 1=纵波 2=干涉)', unit: '', value: 0, min: 0, max: 2, step: 1, default: 0, description: '0=横波 (振动方向⊥传播方向); 1=纵波 (振动方向∥传播方向); 2=干涉 (两列对向波叠加)' },
      { name: 'amplitude', label: '振幅 A', unit: 'm', value: 0.1, min: 0.01, max: 0.5, step: 0.01, default: 0.1, description: '质点振动的最大位移' },
      { name: 'frequency', label: '频率 f', unit: 'Hz', value: 2, min: 0.1, max: 10, step: 0.1, default: 2, description: '振动频率 (Hz)；频率越大波长越短' },
      { name: 'wavelength', label: '波长 λ', unit: 'm', value: 0.5, min: 0.05, max: 2, step: 0.05, default: 0.5, description: '波在一个周期内传播的距离' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 3, min: 0.5, max: 15, step: 0.5, default: 3, description: '仿真的总时长 (可观察到波传播过程)' },
    ],
    buildProblem: (params) => {
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
        bodies: [{ id: 'medium', mass: { value: 0.1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          wave: {
            mode, amplitude, frequency, wavelength,
            xStart: -1, xEnd: 3, particleCount: 81,
            ...(mode === 'interference' ? { amplitude2: amplitude, direction2: -1, phaseDiff: 0 } : {}),
          },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 300, sampleCount: 300 },
      };
    },
  },
  // ========================================================================
  // 选必一 第二章 机械振动 (单摆)
  // ========================================================================
  {
    id: 'simple-pendulum',
    name: '单摆 (简谐运动)',
    model: 'simple-pendulum',
    parameters: [
      { name: 'length', label: '摆长 L', unit: 'm', value: 1.0, min: 0.2, max: 5, step: 0.05, default: 1.0, description: '摆线长度 (m)' },
      { name: 'angle', label: '初始摆角 θ₀', unit: '°', value: 15, min: 1, max: 80, step: 1, default: 15, description: '初始偏离竖直方向角度 (<15° 近似简谐)' },
      { name: 'mass', label: '摆球质量 m', unit: 'kg', value: 1, min: 0.1, max: 5, step: 0.1, default: 1, description: '摆球质量 (单摆周期与质量无关)' },
      { name: 'g', label: '重力加速度 g', unit: 'm/s²', value: PHYSICS_CONSTANTS.g.value, min: 1, max: 30, step: 0.1, default: PHYSICS_CONSTANTS.g.value, description: '重力加速度 (地球 9.8, 月球 1.6)' },
      { name: 'damping', label: '阻尼系数', unit: '', value: 0, min: 0, max: 2, step: 0.05, default: 0, description: '0=无阻尼 (机械能守恒); >0=有阻尼 (振幅衰减)' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 10, min: 1, max: 60, step: 1, default: 10, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
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
        bodies: [{
          id: 'bob',
          mass: { value: mass, unit: 'kg' },
          position: { x: L * Math.sin(angleDeg * Math.PI / 180), y: L * Math.cos(angleDeg * Math.PI / 180) },
          velocity: { x: 0, y: 0 },
        }],
        constraints: { simplePendulum: { length: L, g, initialAngleDeg: angleDeg, damping } },
        environment: {},
        timeConfig: { duration, dt: duration / 1000, sampleCount: 1000 },
      };
    },
  },
  // ========================================================================
  // 必修一 第三章 相互作用——力
  // ========================================================================
  {
    id: 'hooke-law',
    name: '胡克定律 F=kx',
    model: 'spring-oscillator',
    parameters: [
      { name: 'k', label: '劲度系数 k', unit: 'N/m', value: 20, min: 1, max: 200, step: 1, default: 20, description: '弹簧的劲度系数，反映弹簧"软硬程度"' },
      { name: 'massPerWeight', label: '钩码质量 m', unit: 'g', value: 50, min: 10, max: 200, step: 5, default: 50, description: '每个钩码的质量 (常见 50g)' },
      { name: 'weightCount', label: '钩码数量 n', unit: '个', value: 4, min: 0, max: 10, step: 1, default: 4, description: '悬挂的钩码个数' },
      { name: 'g', label: '重力加速度 g', unit: 'm/s²', value: PHYSICS_CONSTANTS.g.value, min: 1, max: 20, step: 0.1, default: PHYSICS_CONSTANTS.g.value, description: '重力加速度' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 2, min: 0.5, max: 10, step: 0.5, default: 2, description: '仿真总时长 (用于动画展示)' },
    ],
    buildProblem: (params) => {
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
        bodies: [{
          id: 'weight',
          mass: { value: m, unit: 'kg' },
          position: { x: x_eq, y: 0 },  // 从平衡位置开始 (静止)
          velocity: { x: 0, y: 0 },
        }],
        constraints: {
          spring: { springConstant: k, naturalLength: 0, anchorPoint: { x: 0, y: 0 } },
        },
        environment: { gravity: { enabled: true, value: g } },
        timeConfig: { duration, dt: duration / 200, sampleCount: 200 },
      };
    },
  },
  {
    id: 'sliding-friction',
    name: '滑动摩擦力 f=μN',
    model: 'sliding-friction',
    parameters: [
      { name: 'mu', label: '动摩擦因数 μ', unit: '', value: 0.3, min: 0, max: 1.5, step: 0.01, default: 0.3, description: '动摩擦因数，由接触面材料和粗糙程度决定' },
      { name: 'mass', label: '物体质量 m', unit: 'kg', value: 1, min: 0.1, max: 10, step: 0.1, default: 1, description: '物体质量 (改变正压力 N=mg)' },
      { name: 'v0', label: '初速度 v₀', unit: 'm/s', value: 0.5, min: 0, max: 5, step: 0.1, default: 0.5, description: '物体初速度' },
      { name: 'uniformMotion', label: '运动模式 (1=匀速 0=加速)', unit: '', value: 1, min: 0, max: 1, step: 1, default: 1, description: '1=外力等于摩擦力做匀速运动；0=外力大于摩擦力做加速运动' },
      { name: 'g', label: '重力加速度 g', unit: 'm/s²', value: PHYSICS_CONSTANTS.g.value, min: 1, max: 20, step: 0.1, default: PHYSICS_CONSTANTS.g.value, description: '重力加速度' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 4, min: 0.5, max: 20, step: 0.5, default: 4, description: '仿真总时长' },
    ],
    buildProblem: (params) => {
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
        bodies: [{
          id: 'block',
          mass: { value: mass, unit: 'kg' },
          position: { x: 0, y: 0 },
          velocity: { x: v0, y: 0 },
        }],
        constraints: {
          slidingFriction: { frictionCoefficient: mu, uniformMotion },
        },
        environment: { gravity: { enabled: true, value: g } },
        timeConfig: { duration, dt: duration / 400, sampleCount: 400 },
      };
    },
  },
  {
    id: 'force-composition',
    name: '力的合成 (平行四边形定则)',
    model: 'force-composition',
    parameters: [
      { name: 'f1', label: '分力 F₁', unit: 'N', value: 3, min: 0, max: 20, step: 0.1, default: 3, description: '第一个分力的大小' },
      { name: 'f2', label: '分力 F₂', unit: 'N', value: 4, min: 0, max: 20, step: 0.1, default: 4, description: '第二个分力的大小' },
      { name: 'angleDeg', label: '夹角 θ', unit: '°', value: 90, min: 0, max: 180, step: 1, default: 90, description: 'F₁ 与 F₂ 之间的夹角' },
      { name: 'duration', label: '动画时长', unit: 's', value: 1, min: 0.5, max: 5, step: 0.5, default: 1, description: 'F-θ 曲线扫描时长' },
    ],
    buildProblem: (params) => {
      const f1 = params['f1'] ?? 3;
      const f2 = params['f2'] ?? 4;
      const angleDeg = params['angleDeg'] ?? 90;
      const duration = params['duration'] ?? 1;
      return {
        id: `force-composition-${Date.now()}`,
        title: '力的合成与分解 (平行四边形定则)',
        model: 'force-composition',
        bodies: [{
          id: 'point',
          mass: { value: 1, unit: 'kg' },
          position: { x: 0, y: 0 },
          velocity: { x: 0, y: 0 },
        }],
        constraints: {
          forceComposition: { f1, f2, angleDeg, f1AngleDeg: 0 },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 360, sampleCount: 360 },
      };
    },
  },
  // ========================================================================
  // 必修一 第四章 运动和力的关系
  // ========================================================================
  {
    id: 'newton-second-law',
    name: '牛顿第二定律 F=ma',
    model: 'newton-second-law',
    parameters: [
      { name: 'force', label: '合外力 F', unit: 'N', value: 10, min: -100, max: 100, step: 0.5, default: 10, description: '作用在物体上的合外力 (正=向右，负=向左)' },
      { name: 'mass', label: '物体质量 m', unit: 'kg', value: 2, min: 0.1, max: 50, step: 0.1, default: 2, description: '物体质量 (kg)' },
      { name: 'v0', label: '初速度 v₀', unit: 'm/s', value: 0, min: -50, max: 50, step: 0.5, default: 0, description: '物体初始速度' },
      { name: 'includeFriction', label: '考虑摩擦 (1=是 0=否)', unit: '', value: 0, min: 0, max: 1, step: 1, default: 0, description: '是否考虑地面滑动摩擦力' },
      { name: 'friction', label: '摩擦系数 μ', unit: '', value: 0.2, min: 0, max: 1, step: 0.01, default: 0.2, description: '地面与物体间的动摩擦因数' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 5, min: 0.5, max: 30, step: 0.5, default: 5, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
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
        bodies: [{
          id: 'block',
          mass: { value: mass, unit: 'kg' },
          position: { x: 0, y: 0 },
          velocity: { x: v0, y: 0 },
        }],
        constraints: { newtonSecondLaw: { force, includeFriction } },
        environment: {
          ground: { enabled: true, y: 0, friction: includeFriction ? friction : 0 },
        },
        timeConfig: { duration, dt: duration / 500, sampleCount: 500 },
      };
    },
  },
  {
    id: 'newton-first-law',
    name: '牛顿第一定律 (惯性)',
    model: 'uniform-linear',
    parameters: [
      { name: 'v0', label: '初速度 v₀', unit: 'm/s', value: 2, min: -10, max: 10, step: 0.1, default: 2, description: '物体初速度 (不受外力时保持此速度匀速运动)' },
      { name: 'mass', label: '物体质量 m', unit: 'kg', value: 0.5, min: 0.1, max: 5, step: 0.1, default: 0.5, description: '物体质量 (仅展示，不影响匀速运动)' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 5, min: 1, max: 20, step: 0.5, default: 5, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
      const v0 = params['v0'] ?? 2;
      const mass = params['mass'] ?? 0.5;
      const duration = params['duration'] ?? 5;
      return {
        id: `newton-first-law-${Date.now()}`,
        title: '牛顿第一定律 (惯性)',
        model: 'uniform-linear',
        bodies: [{
          id: 'block',
          mass: { value: mass, unit: 'kg' },
          position: { x: 0, y: 0 },
          velocity: { x: v0, y: 0 },
        }],
        environment: {},
        timeConfig: { duration, dt: duration / 500, sampleCount: 500 },
      };
    },
  },
  {
    id: 'newton-third-law',
    name: '牛顿第三定律',
    model: 'newton-third-law',
    parameters: [
      { name: 'forceAB', label: '作用力 F_AB', unit: 'N', value: 5, min: -20, max: 20, step: 0.5, default: 5, description: 'A 对 B 施加的作用力 (正=向右)"' },
      { name: 'massA', label: '物体 A 质量', unit: 'kg', value: 1, min: 0.1, max: 10, step: 0.1, default: 1, description: '物体 A 的质量' },
      { name: 'massB', label: '物体 B 质量', unit: 'kg', value: 2, min: 0.1, max: 10, step: 0.1, default: 2, description: '物体 B 的质量' },
      { name: 'allowMotion', label: '运动模式 (1=加速 0=静止)', unit: '', value: 0, min: 0, max: 1, step: 1, default: 0, description: '1=两物体在光滑水平面上共同加速；0=两物体固定，仅展示力' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 3, min: 0.5, max: 20, step: 0.5, default: 3, description: '仿真总时长' },
    ],
    buildProblem: (params) => {
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
          { id: 'A', mass: { value: massA, unit: 'kg' }, position: { x: -1, y: 0 }, velocity: { x: 0, y: 0 } },
          { id: 'B', mass: { value: massB, unit: 'kg' }, position: { x: 1, y: 0 }, velocity: { x: 0, y: 0 } },
        ],
        constraints: {
          newtonThirdLaw: { forceAB, allowMotion },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 300, sampleCount: 300 },
      };
    },
  },
  // ========================================================================
  // 选必一 第四章 光
  // ========================================================================
  {
    id: 'refraction',
    name: '光的折射定律 (Snell)',
    model: 'refraction',
    parameters: [
      { name: 'n1', label: '介质 1 折射率 n₁', unit: '', value: 1.0, min: 1.0, max: 2.5, step: 0.01, default: 1.0, description: '光疏介质 (空气=1.00, 水=1.33, 玻璃=1.50, 金刚石=2.42)' },
      { name: 'n2', label: '介质 2 折射率 n₂', unit: '', value: 1.5, min: 1.0, max: 2.5, step: 0.01, default: 1.5, description: '光密介质' },
      { name: 'angle', label: '入射角 θ₁', unit: '°', value: 30, min: 0, max: 89, step: 1, default: 30, description: '入射光线与法线夹角' },
    ],
    buildProblem: (params) => {
      const n1 = params['n1'] ?? 1.0;
      const n2 = params['n2'] ?? 1.5;
      const angleDeg = params['angle'] ?? 30;
      return {
        id: `refraction-${Date.now()}`,
        title: '光的折射定律 (Snell 定律)',
        model: 'refraction',
        bodies: [{ id: 'light', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { refraction: { n1, n2, incidentAngleDeg: angleDeg } },
        environment: {},
        timeConfig: { duration: 1, dt: 0.1, sampleCount: 10 },
      };
    },
  },
  {
    id: 'interference',
    name: '双缝干涉 (杨氏实验)',
    model: 'interference',
    parameters: [
      { name: 'wavelength', label: '波长 λ', unit: 'nm', value: 600, min: 380, max: 780, step: 5, default: 600, description: '光波长 (红~620-780, 绿~495-570, 蓝~450-495)' },
      { name: 'slitSep', label: '缝距 d', unit: 'mm', value: 0.5, min: 0.1, max: 2, step: 0.05, default: 0.5, description: '双缝间距' },
      { name: 'screenDist', label: '缝-屏距离 L', unit: 'm', value: 2.0, min: 0.5, max: 5, step: 0.1, default: 2.0, description: '双缝到观察屏的距离' },
      { name: 'filmThickness', label: '薄膜厚度 (可选)', unit: 'μm', value: 0, min: 0, max: 2, step: 0.01, default: 0, description: '薄膜干涉时输入 (0=不启用薄膜模式)' },
      { name: 'filmN', label: '薄膜折射率', unit: '', value: 1.38, min: 1, max: 2.5, step: 0.01, default: 1.38, description: '薄膜材料折射率 (MgF₂=1.38, 玻璃=1.5)' },
    ],
    buildProblem: (params) => {
      const wavelengthNm = params['wavelength'] ?? 600;
      const slitSeparationMm = params['slitSep'] ?? 0.5;
      const screenDistanceM = params['screenDist'] ?? 2.0;
      const filmThicknessUm = params['filmThickness'] ?? 0;
      const filmN = params['filmN'] ?? 1.38;
      const ic: { wavelengthNm: number; slitSeparationMm: number; screenDistanceM: number; filmThicknessUm?: number; filmN?: number } = {
        wavelengthNm, slitSeparationMm, screenDistanceM,
      };
      if (filmThicknessUm > 0) {
        ic.filmThicknessUm = filmThicknessUm;
        ic.filmN = filmN;
      }
      return {
        id: `interference-${Date.now()}`,
        title: '双缝干涉 (杨氏实验)',
        model: 'interference',
        bodies: [{ id: 'light', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { interference: ic },
        environment: {},
        timeConfig: { duration: 1, dt: 0.1, sampleCount: 10 },
      };
    },
  },
];
export function getDefaultParams(sceneId: string): Record<string, number> {
  const scene = SCENES.find(s => s.id === sceneId);
  if (!scene) return {};
  const params: Record<string, number> = {};
  for (const p of scene.parameters) {
    params[p.name] = p.default;
  }
  return params;
}

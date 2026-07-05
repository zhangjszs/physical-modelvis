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
  // 必修三 第十一章 电路及其应用
  // ========================================================================
  {
    id: 'circuit',
    name: '直流电路分析 (串并联)',
    model: 'circuit',
    parameters: [
      { name: 'emf', label: '电动势 E', unit: 'V', value: 12, min: 1, max: 36, step: 0.5, default: 12, description: '电源电动势 (1.5V 干电池×8 = 12V; 铅蓄电池 12V)' },
      { name: 'r', label: '内阻 r', unit: 'Ω', value: 1, min: 0, max: 10, step: 0.1, default: 1, description: '电源内阻 (理想电源=0)' },
      { name: 'r1', label: '电阻 R₁', unit: 'Ω', value: 10, min: 0.1, max: 100, step: 0.5, default: 10, description: '电阻 1 (串联)' },
      { name: 'r2', label: '电阻 R₂', unit: 'Ω', value: 10, min: 0.1, max: 100, step: 0.5, default: 10, description: '电阻 2' },
      { name: 'r2conn', label: 'R₂ 连接方式 (1=串联 0=并联)', unit: '', value: 1, min: 0, max: 1, step: 1, default: 1, description: '0=与 R₁ 并联, 1=与 R₁ 串联' },
      { name: 'r3', label: '电阻 R₃', unit: 'Ω', value: 20, min: 0, max: 100, step: 0.5, default: 20, description: '电阻 3 (0=不使用)' },
      { name: 'r3conn', label: 'R₃ 连接方式 (1=串联 0=并联)', unit: '', value: 1, min: 0, max: 1, step: 1, default: 1, description: '0=与当前拓扑并联, 1=串联' },
    ],
    buildProblem: (params) => {
      const emf = params['emf'] ?? 12;
      const r = params['r'] ?? 0;
      const r1 = params['r1'] ?? 10;
      const r2 = params['r2'] ?? 10;
      const r2conn = (params['r2conn'] ?? 1) === 1 ? 'series' : 'parallel';
      const r3 = params['r3'] ?? 0;
      const r3conn = (params['r3conn'] ?? 1) === 1 ? 'series' : 'parallel';

      const resistors: Array<{ resistance: number; connection: 'series' | 'parallel' }> = [
        { resistance: r1, connection: 'series' },
        { resistance: r2, connection: r2conn },
      ];
      if (r3 > 0) {
        resistors.push({ resistance: r3, connection: r3conn });
      }

      return {
        id: `circuit-${Date.now()}`,
        title: '直流电路分析 (串并联)',
        model: 'circuit' as const,
        bodies: [{ id: 'wire', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { circuit: { emf, internalResistance: r, resistors } },
        environment: {},
        timeConfig: { duration: 1, dt: 0.1, sampleCount: 10 },
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
  // ========================================================================
  // 选必三 第二章 气体 (选必三入门)
  // ========================================================================
  {
    id: 'gas-law',
    name: '理想气体状态方程',
    model: 'gas-law',
    parameters: [
      { name: 'n', label: '物质的量 n', unit: 'mol', value: 1, min: 0.1, max: 10, step: 0.1, default: 1, description: '气体物质的量 (1 mol 标况下 22.4 L)' },
      { name: 'modeG', label: '过程 (0=等温 1=等压 2=等容)', unit: '', value: 0, min: 0, max: 2, step: 1, default: 0, description: '0=等温 (pV=const); 1=等压 (V/T=const); 2=等容 (p/T=const)' },
      { name: 'p0', label: '初始压强 p₀', unit: 'kPa', value: 101.3, min: 10, max: 500, step: 5, default: 101.3, description: '初始压强 (标准大气压 = 101.3 kPa)' },
      { name: 'V0', label: '初始体积 V₀', unit: 'L', value: 22.4, min: 1, max: 100, step: 0.5, default: 22.4, description: '初始体积 (1mol 标况下 22.4 L)' },
      { name: 'T0', label: '初始温度 T₀', unit: 'K', value: 273.15, min: 50, max: 600, step: 5, default: 273.15, description: '初始温度 (标况 = 273.15 K)' },
    ],
    buildProblem: (params) => {
      const moles = params['n'] ?? 1;
      const modeNum = params['modeG'] ?? 0;
      const mode = modeNum === 1 ? 'isobaric' : modeNum === 2 ? 'isochoric' : 'isothermal';
      const pInit = (params['p0'] ?? 101.3) * 1e3; // kPa → Pa
      const VInit = (params['V0'] ?? 22.4) / 1e3; // L → m³
      const TInit = params['T0'] ?? 273.15;
      return {
        id: `gas-law-${Date.now()}`,
        title: '理想气体状态方程 (pV=nRT)',
        model: 'gas-law' as const,
        bodies: [{ id: 'gas', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          gasLaw: {
            moles,
            mode,
            initialPressure: pInit,
            initialVolume: VInit,
            initialTemperature: TInit,
          },
        },
        environment: {},
        timeConfig: { duration: 1, dt: 0.1, sampleCount: 10 },
      };
    },
  },
  // ========================================================================
  // 选必三 第四章 原子结构和波粒二象性
  // ========================================================================
  {
    id: 'photoelectric',
    name: '光电效应 (爱因斯坦方程)',
    model: 'photoelectric',
    parameters: [
      { name: 'W0', label: '逸出功 W₀', unit: 'eV', value: 2.3, min: 1, max: 6, step: 0.05, default: 2.3, description: '金属逸出功 (钠≈2.28, 钾≈2.3, 锌≈4.3, 铜≈4.7)' },
      { name: 'nuMin', label: '起始频率 ν_min', unit: 'THz', value: 300, min: 100, max: 1500, step: 50, default: 300, description: '入射光频率范围下限' },
      { name: 'nuMax', label: '终止频率 ν_max', unit: 'THz', value: 1500, min: 500, max: 5000, step: 50, default: 1500, description: '入射光频率范围上限' },
    ],
    buildProblem: (params) => {
      const workFunction = params['W0'] ?? 2.3;
      const freqMinTHz = params['nuMin'] ?? Math.max(workFunction * 110, 100);
      const freqMaxTHz = params['nuMax'] ?? workFunction * 400;
      return {
        id: `photoelectric-${Date.now()}`,
        title: '光电效应 (爱因斯坦光电方程)',
        model: 'photoelectric' as const,
        bodies: [{ id: 'electron', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { photoelectric: { workFunction, freqMinTHz, freqMaxTHz } },
        environment: {},
        timeConfig: { duration: 1, dt: 0.1, sampleCount: 10 },
      };
    },
  },
  {
    id: 'bohr',
    name: '玻尔氢原子模型 (能级与光谱)',
    model: 'bohr-model',
    parameters: [
      { name: 'seriesB', label: '线系 (0=赖曼 1=巴尔末 2=帕邢)', unit: '', value: 1, min: 0, max: 2, step: 1, default: 1, description: '0=赖曼系(紫外,n₁=1); 1=巴尔末系(可见,n₁=2); 2=帕邢系(红外,n₁=3)' },
      { name: 'maxN', label: '最大主量子数 n_max', unit: '', value: 6, min: 3, max: 10, step: 1, default: 6, description: '决定计算多少条谱线' },
    ],
    buildProblem: (params) => {
      const seriesNum = params['seriesB'] ?? 1;
      const series = seriesNum === 0 ? 'Lyman' as const : seriesNum === 2 ? 'Paschen' as const : 'Balmer' as const;
      const maxN = params['maxN'] ?? 6;
      return {
        id: `bohr-${Date.now()}`,
        title: '玻尔氢原子模型 (能级与发射光谱)',
        model: 'bohr-model' as const,
        bodies: [{ id: 'electron', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { bohr: { series, maxN } },
        environment: {},
        timeConfig: { duration: 1, dt: 0.1, sampleCount: 10 },
      };
    },
  },
  {
    id: 'radioactive',
    name: '放射性衰变 (云室径迹)',
    model: 'radioactive-decay',
    parameters: [
      { name: 'N0', label: '初始原子数 N₀', unit: '个', value: 1000, min: 100, max: 10000, step: 100, default: 1000, description: '放射性核素初始原子数' },
      { name: 'halfLife', label: '半衰期 T₁/₂', unit: 's', value: 10, min: 0.1, max: 3600, step: 0.1, default: 10, description: '半衰期 (秒)' },
      { name: 'tEnd', label: '模拟时长', unit: 's', value: 50, min: 1, max: 10000, step: 1, default: 50, description: '模拟时间 (建议 ≥ 3×T₁/₂)' },
      { name: 'rayType', label: '射线 (0=α 1=β 2=γ)', unit: '', value: 0, min: 0, max: 2, step: 1, default: 0, description: 'α=短直径迹; β=长弯径迹; γ=极少径迹' },
    ],
    buildProblem: (params) => {
      const initialAtoms = params['N0'] ?? 1000;
      const halfLife = params['halfLife'] ?? 10;
      const duration = params['tEnd'] ?? 5 * halfLife;
      const rayNum = params['rayType'] ?? 0;
      const radiationType = rayNum === 1 ? 'beta' as const : rayNum === 2 ? 'gamma' as const : 'alpha' as const;
      return {
        id: `radioactive-${Date.now()}`,
        title: '放射性衰变 (云室粒子径迹)',
        model: 'radioactive-decay' as const,
        bodies: [{ id: 'nuclei', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { radioactive: { initialAtoms, halfLife, duration, radiationType } },
        environment: {},
        timeConfig: { duration, dt: duration / 300, sampleCount: 300 },
      };
    },
  },
  // ========================================================================
  // 选必二 第一章 安培力与洛伦兹力
  // ========================================================================
  {
    id: 'magnetic-force',
    name: '安培力与洛伦兹力',
    model: 'magnetic-force',
    parameters: [
      { name: 'B', label: '磁感应强度 B', unit: 'T', value: 0.5, min: 0.01, max: 5, step: 0.01, default: 0.5, description: '匀强磁场磁感应强度' },
      { name: 'I', label: '电流 I (安培力)', unit: 'A', value: 2, min: 0, max: 30, step: 0.1, default: 2, description: '通电导线电流 (A)' },
      { name: 'L', label: '导线长度 L', unit: 'm', value: 0.3, min: 0.01, max: 5, step: 0.01, default: 0.3, description: '导线在磁场中的有效长度' },
      { name: 'theta', label: '导线与磁场夹角 θ', unit: '°', value: 90, min: 0, max: 180, step: 1, default: 90, description: '导线与磁场方向的夹角' },
      { name: 'q', label: '粒子电荷 q (洛伦兹力)', unit: '×10⁻¹⁹ C', value: 1.6, min: -10, max: 10, step: 0.1, default: 1.6, description: '运动粒子电荷 (元电荷 e = 1.6×10⁻¹⁹ C)' },
      { name: 'v', label: '粒子速度 v', unit: '×10⁶ m/s', value: 1, min: 0, max: 100, step: 0.1, default: 1, description: '粒子运动速度' },
      { name: 'phi', label: '速度与磁场夹角 φ', unit: '°', value: 90, min: 0, max: 180, step: 1, default: 90, description: '速度方向与磁场方向夹角' },
      { name: 'mass', label: '粒子质量 m', unit: '×10⁻³¹ kg', value: 9.1, min: 0.01, max: 100, step: 0.01, default: 9.1, description: '粒子质量 (电子 = 9.1×10⁻³¹ kg)' },
    ],
    buildProblem: (params) => {
      const B = params['B'] ?? 0.5;
      const current = params['I'] ?? 0;
      const wireLength = params['L'] ?? 0;
      const wireAngleDeg = params['theta'] ?? 90;
      const charge = (params['q'] ?? 0) * 1e-19;
      const velocity = (params['v'] ?? 0) * 1e6;
      const velocityAngleDeg = params['phi'] ?? 90;
      const particleMass = (params['mass'] ?? 0) * 1e-31;
      return {
        id: `magnetic-force-${Date.now()}`,
        title: '安培力与洛伦兹力',
        model: 'magnetic-force' as const,
        bodies: [{ id: 'particle', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          magneticForce: {
            magneticField: B,
            current: current > 0 ? current : undefined,
            wireLength: wireLength > 0 ? wireLength : undefined,
            wireAngleDeg,
            charge: charge !== 0 ? charge : undefined,
            velocity: velocity > 0 ? velocity : undefined,
            velocityAngleDeg,
            particleMass: particleMass > 0 ? particleMass : undefined,
          },
        },
        environment: {},
        timeConfig: { duration: 1, sampleCount: 200, dt: 0.01 },
      };
    },
  },
  // ========================================================================
  // 选必二 第二章 电磁感应 + 第三~四章 LC振荡/交变电流
  // ========================================================================
  {
    id: 'em-induction',
    name: '电磁感应 (法拉第定律)',
    model: 'em-induction',
    parameters: [
      { name: 'Bind', label: '磁感应强度 B', unit: 'T', value: 0.5, min: 0.01, max: 5, step: 0.01, default: 0.5, description: '磁场强度' },
      { name: 'A', label: '线圈面积 A', unit: 'm²', value: 0.01, min: 0.0001, max: 1, step: 0.0001, default: 0.01, description: '线圈面积' },
      { name: 'Nturns', label: '线圈匝数 N', unit: '', value: 100, min: 1, max: 1000, step: 1, default: 100, description: '线圈匝数' },
      { name: 'angleBind', label: '磁场与法线夹角 θ', unit: '°', value: 0, min: 0, max: 180, step: 1, default: 0, description: '磁场与线圈法线方向的夹角' },
      { name: 'Lcut', label: '切割导线长度 L (可选)', unit: 'm', value: 0, min: 0, max: 10, step: 0.01, default: 0, description: '导线切割磁感线的有效长度 (0=不启用切割)' },
      { name: 'vCut', label: '切割速度 v (可选)', unit: 'm/s', value: 0, min: 0, max: 100, step: 0.1, default: 0, description: '导线切割速度' },
    ],
    buildProblem: (params) => {
      const ec: { magneticField: number; area: number; turns?: number; angleDeg?: number; cuttingLength?: number; cuttingVelocity?: number } = {
        magneticField: params['Bind'] ?? 0.5,
        area: params['A'] ?? 0.01,
      };
      const Nturns = params['Nturns'] ?? 0;
      if (Nturns > 0) ec.turns = Nturns;
      const angleBind = params['angleBind'];
      if (angleBind !== undefined) ec.angleDeg = angleBind;
      const Lcut = params['Lcut'] ?? 0;
      const vCut = params['vCut'] ?? 0;
      if (Lcut > 0 && vCut > 0) {
        ec.cuttingLength = Lcut;
        ec.cuttingVelocity = vCut;
      }
      return {
        id: `em-induction-${Date.now()}`,
        title: '电磁感应 (法拉第定律)',
        model: 'em-induction' as const,
        bodies: [{ id: 'coil', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { emInduction: ec },
        environment: {},
        timeConfig: { duration: 0.04, dt: 0.001, sampleCount: 40 },
      };
    },
  },
  {
    id: 'ac-current',
    name: '交变电流与变压器 (选必二§3)',
    model: 'ac-current',
    parameters: [
      { name: 'Em', label: '峰值电动势 Eₘ', unit: 'V', value: 311, min: 1, max: 100000, step: 1, default: 311, description: '交流电峰值 (220V有效值对应 311V 峰值)' },
      { name: 'freq', label: '频率 f', unit: 'Hz', value: 50, min: 1, max: 10000, step: 1, default: 50, description: '市电 50Hz' },
      { name: 'nRatio', label: '变压器匝数比 n₂/n₁ (0=无)', unit: '', value: 0.1, min: 0, max: 100, step: 0.01, default: 0.1, description: '次级/初级匝数比；>1=升压；<1=降压；0=无变压器' },
    ],
    buildProblem: (params) => {
      const ac: { peakEmf: number; angularFreq: number; turnsRatio?: number } = {
        peakEmf: params['Em'] ?? 311,
        angularFreq: 2 * Math.PI * (params['freq'] ?? 50),
      };
      const nRatio = params['nRatio'] ?? 0;
      if (nRatio > 0) ac.turnsRatio = nRatio;
      return {
        id: `ac-${Date.now()}`,
        title: '交变电流与变压器',
        model: 'ac-current' as const,
        bodies: [{ id: 'wire', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { ac },
        environment: {},
        timeConfig: { duration: 0.04, dt: 0.001, sampleCount: 40 },
      };
    },
  },
  {
    id: 'lc-oscillator',
    name: 'LC 电磁振荡',
    model: 'lc-oscillator',
    parameters: [
      { name: 'C', label: '电容 C', unit: 'pF', value: 100, min: 1, max: 1e6, step: 1, default: 100, description: '电容值 (pF)' },
      { name: 'Lind', label: '电感 L', unit: 'μH', value: 10, min: 0.001, max: 100000, step: 0.001, default: 10, description: '电感值 (μH)' },
      { name: 'Q0', label: '初始电荷 Q₀', unit: 'μC', value: 1, min: 0.001, max: 100, step: 0.001, default: 1, description: '电容初始充电量' },
    ],
    buildProblem: (params) => {
      return {
        id: `lc-${Date.now()}`,
        title: 'LC 电磁振荡',
        model: 'lc-oscillator' as const,
        bodies: [{ id: 'wire', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          lc: {
            capacitance: (params['C'] ?? 100) * 1e-12,
            inductance: (params['Lind'] ?? 10) * 1e-6,
            initialCharge: (params['Q0'] ?? 1) * 1e-6,
          },
        },
        environment: {},
        timeConfig: { duration: 1, dt: 0.01, sampleCount: 100 },
      };
    },
  },
  // ========================================================================
  // 必修一 第一章 运动的描述
  // ========================================================================
  {
    id: 'ticker-timer',
    name: '打点计时器测瞬时速度',
    model: 'ticker-timer',
    parameters: [
      { name: 'frequency', label: '打点频率 f', unit: 'Hz', value: 50, min: 10, max: 100, step: 5, default: 50, description: '电磁打点计时器电源频率 (50Hz=每隔 0.02s 打一点)' },
      { name: 'acceleration', label: '加速度 a', unit: 'm/s²', value: 2, min: 0.1, max: 10, step: 0.1, default: 2, description: '小车匀变速直线运动的加速度' },
      { name: 'frictionCoeff', label: '摩擦系数 μ', unit: '', value: 0, min: 0, max: 1, step: 0.01, default: 0, description: '纸带与限位孔间的摩擦系数' },
      { name: 'initialVelocity', label: '初速度 v₀', unit: 'm/s', value: 0, min: -5, max: 5, step: 0.1, default: 0, description: '第一个计数点对应的初速度' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 2, min: 0.5, max: 5, step: 0.1, default: 2, description: '仿真的总时长 (影响打出纸带长度)' },
    ],
    buildProblem: (params) => {
      const frequency = params['frequency'] ?? 50;
      const acceleration = params['acceleration'] ?? 2;
      const frictionCoeff = params['frictionCoeff'] ?? 0;
      const initialVelocity = params['initialVelocity'] ?? 0;
      const duration = params['duration'] ?? 2;
      return {
        id: `ticker-${Date.now()}`,
        title: '打点计时器',
        model: 'ticker-timer',
        bodies: [{ id: 'ticker', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: initialVelocity, y: 0 } }],
        constraints: { tickerTimer: { frequency, acceleration, frictionCoefficient: frictionCoeff, initialVelocity } },
        environment: { gravity: { enabled: false } },
        timeConfig: { duration, dt: duration / 1000, sampleCount: 1000 },
      };
    },
  },
  {
    id: 'reaction-time',
    name: '测反应时间',
    model: 'reaction-time',
    parameters: [
      { name: 'distance', label: '尺子下落距离 h', unit: 'm', value: 0.2, min: 0.05, max: 0.5, step: 0.01, default: 0.2, description: '尺子被抓住时下落的位置 (读数越大=反应越慢)' },
      { name: 'gravity', label: '重力加速度 g', unit: 'm/s²', value: PHYSICS_CONSTANTS.g.value, min: 1, max: 20, step: 0.1, default: PHYSICS_CONSTANTS.g.value, description: '地球 g≈9.8, 月球 g≈1.6' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 1, min: 0.1, max: 3, step: 0.1, default: 1, description: '仿真的总时长 (覆盖反应时间)' },
    ],
    buildProblem: (params) => {
      const distance = params['distance'] ?? 0.2;
      const gravity = params['gravity'] ?? PHYSICS_CONSTANTS.g.value;
      const duration = params['duration'] ?? 1;
      const tReact = Math.sqrt(2 * distance / gravity);
      return {
        id: `reaction-${Date.now()}`,
        title: '测反应时间',
        model: 'reaction-time',
        bodies: [{ id: 'ruler', mass: { value: 0.1, unit: 'kg' }, position: { x: 0, y: distance }, velocity: { x: 0, y: 0 } }],
        constraints: { reactionTime: { distance, gravity } },
        environment: { gravity: { enabled: true, value: gravity } },
        timeConfig: { duration: Math.max(duration, tReact * 1.5), dt: 0.001, sampleCount: 1000 },
      };
    },
  },
  {
    id: 'galileo-incline',
    name: '伽利略斜面理想实验',
    model: 'galileo-incline',
    parameters: [
      { name: 'angleDeg', label: '斜面倾角 θ', unit: '°', value: 30, min: 5, max: 90, step: 1, default: 30, description: '斜面与水平面的夹角 (冲淡重力: θ↓→a↓→t↑)' },
      { name: 'inclineLength', label: '斜面长度 L', unit: 'm', value: 2, min: 0.5, max: 5, step: 0.1, default: 2, description: '斜面长度 (纸带可测量的运动距离)' },
      { name: 'mode', label: '演示模式', unit: '', value: 3, min: 0, max: 3, step: 1, default: 3, description: '0=单斜面 1=对接斜面 2=水平面外推 3=三段完整演示' },
      { name: 'gravity', label: '重力加速度 g', unit: 'm/s²', value: PHYSICS_CONSTANTS.g.value, min: 1, max: 20, step: 0.1, default: PHYSICS_CONSTANTS.g.value, description: '不同星球的重力加速度' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 5, min: 1, max: 15, step: 0.5, default: 5, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
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
        bodies: [{ id: 'ball', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { galileoIncline: { angleDeg, inclineLength, mode, gravity } },
        environment: { gravity: { enabled: true, value: gravity } },
        timeConfig: { duration, dt: duration / 1000, sampleCount: 1000 },
      };
    },
  },
  // ========================================================================
  // 必修一 第三章 相互作用——力
  // ========================================================================
  {
    id: 'center-of-gravity',
    name: '悬挂法确定重心',
    model: 'center-of-gravity',
    parameters: [
      { name: 'shapeType', label: '薄板形状', unit: '', value: 0, min: 0, max: 2, step: 1, default: 0, description: '0=L形 1=三角形 2=不规则四边形' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 1, min: 0.5, max: 5, step: 0.1, default: 1, description: '静态场景 (该参数无实际物理影响)' },
    ],
    buildProblem: (params) => {
      const shapeIdx = Math.round(params['shapeType'] ?? 0);
      const shapes: Array<Array<{ x: number; y: number }>> = [
        // L 形
        [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 1 }],
        // 三角形
        [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 0, y: 1 }],
        // 不规则四边形
        [{ x: -1.2, y: -0.5 }, { x: 0.8, y: -1 }, { x: 1.2, y: 0.8 }, { x: -0.5, y: 1 }],
      ];
      const vertices = shapes[shapeIdx] ?? shapes[0]!;
      const duration = params['duration'] ?? 1;
      return {
        id: `cog-${Date.now()}`,
        title: '悬挂法确定重心',
        model: 'center-of-gravity',
        bodies: [{ id: 'plate', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { centerOfGravity: { vertices } },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  {
    id: 'micro-deformation',
    name: '光杠杆放大微小形变',
    model: 'micro-deformation',
    parameters: [
      { name: 'pressure', label: '桌面压力 F', unit: 'N', value: 100, min: 10, max: 500, step: 10, default: 100, description: '按压桌面的力 (模拟重物放在桌面上)' },
      { name: 'laserDist', label: '激光到镜面距离', unit: 'm', value: 1, min: 0.5, max: 3, step: 0.1, default: 1, description: '激光笔到平面镜的距离' },
      { name: 'mirrorDist', label: '镜面到投影屏距离 D', unit: 'm', value: 5, min: 1, max: 20, step: 0.5, default: 5, description: '反射光路越长, 放大效果越明显 (光杠杆放大)' },
      { name: 'youngModulus', label: '杨氏模量 E', unit: 'GPa', value: 10, min: 1, max: 200, step: 1, default: 10, description: '桌面材料的杨氏模量 (玻璃约 70GPa, 木材约 10GPa)' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 1, min: 0.5, max: 3, step: 0.1, default: 1, description: '静态场景 (该参数仅用于仿真框架)' },
    ],
    buildProblem: (params) => {
      const pressure = params['pressure'] ?? 100;
      const laserDist = params['laserDist'] ?? 1;
      const mirrorDist = params['mirrorDist'] ?? 5;
      const youngModulusGPa = params['youngModulus'] ?? 10;
      const duration = params['duration'] ?? 1;
      return {
        id: `micro-def-${Date.now()}`,
        title: '光杠杆放大微小形变',
        model: 'micro-deformation',
        bodies: [{ id: 'table', mass: { value: 10, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          microDeformation: {
            laserDist, mirrorDist, pressure,
            youngModulus: youngModulusGPa * 1e9, thickness: 0.05, tableLength: 1,
          },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  // ========================================================================
  // 必修一 第四章 运动和力的关系 (牛顿运动定律)
  // ========================================================================
  {
    id: 'inertia',
    name: '惯性实验 (棋子/鸡蛋/小车)',
    model: 'inertia',
    parameters: [
      { name: 'mode', label: '演示实验', unit: '', value: 0, min: 0, max: 2, step: 1, default: 0, description: '0=棋子打击(静→动) 1=小车急停(动→静) 2=纸板抽拉鸡蛋落水' },
      { name: 'initialSpeed', label: '初速度 v₀', unit: 'm/s', value: 2, min: 0.5, max: 10, step: 0.5, default: 2, description: '初始运动速度 (模拟棋子被击打/小车行驶的速度)' },
      { name: 'massRatio', label: '质量比 m上/m下', unit: '', value: 0.1, min: 0.01, max: 1, step: 0.01, default: 0.1, description: '上下物体质量比 (越小, 惯性现象越明显)' },
      { name: 'frictionCoeff', label: '摩擦系数 μ', unit: '', value: 0.3, min: 0, max: 1, step: 0.01, default: 0.3, description: '接触面摩擦系数' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 3, min: 0.5, max: 10, step: 0.5, default: 3, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
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
          { id: 'top', mass: { value: massRatio, unit: 'kg' }, position: { x: 0, y: 0.5 }, velocity: { x: initialSpeed, y: 0 } },
          { id: 'bottom', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: initialSpeed, y: 0 } },
        ],
        constraints: { inertia: { mode, initialSpeed, massRatio, frictionCoeff } },
        environment: { ground: { enabled: true, y: -0.5, friction: frictionCoeff } },
        timeConfig: { duration, dt: duration / 500, sampleCount: 500 },
      };
    },
  },
  {
    id: 'overweight',
    name: '超重与失重 (电梯台秤)',
    model: 'overweight',
    parameters: [
      { name: 'mode', label: '电梯运动阶段', unit: '', value: 0, min: 0, max: 3, step: 1, default: 0, description: '0=向上加速(超重) 1=向上减速(失重) 2=向下加速(失重) 3=向下减速(超重)' },
      { name: 'mass', label: '物体质量 m', unit: 'kg', value: 1, min: 0.1, max: 10, step: 0.1, default: 1, description: '放置在台秤上的物体质量' },
      { name: 'accMagnitude', label: '加速度大小 a', unit: 'm/s²', value: 2, min: 0.5, max: 9.8, step: 0.1, default: 2, description: '电梯的加速度大小 (a=g 时为完全失重 N=0)' },
      { name: 'gravity', label: '重力加速度 g', unit: 'm/s²', value: PHYSICS_CONSTANTS.g.value, min: 1, max: 20, step: 0.1, default: PHYSICS_CONSTANTS.g.value, description: '当地重力加速度' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 4, min: 1, max: 10, step: 0.5, default: 4, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
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
        bodies: [{ id: 'object', mass: { value: mass, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { overweight: { mass, accMagnitude, mode, gravity } },
        environment: { gravity: { enabled: true, value: gravity } },
        timeConfig: { duration, dt: duration / 500, sampleCount: 500 },
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

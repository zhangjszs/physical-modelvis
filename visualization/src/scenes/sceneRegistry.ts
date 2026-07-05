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
  // ========================================================================
  // 必修二 第五章 曲线运动
  // ========================================================================
  {
    id: 'curve-velocity-direction',
    name: '曲线运动速度方向',
    model: 'curve-velocity-direction',
    parameters: [
      { name: 'trackShape', label: '轨道形状', unit: '', value: 0, min: 0, max: 2, step: 1, default: 0, description: '0=圆形 1=抛物线 2=螺旋' },
      { name: 'angularSpeed', label: '角速度 ω', unit: 'rad/s', value: 1, min: 0.1, max: 5, step: 0.1, default: 1, description: '物体沿曲线运动的角速度' },
      { name: 'releaseIndex', label: '脱离点序号', unit: '', value: 1, min: 0, max: 3, step: 1, default: 1, description: '演示切线速度方向的脱离点位置' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 1, min: 0.5, max: 5, step: 0.1, default: 1, description: '演示动画时长' },
    ],
    buildProblem: (params) => {
      const shapeIdx = Math.round(params['trackShape'] ?? 0);
      const angularSpeed = params['angularSpeed'] ?? 1;
      const releaseIndex = params['releaseIndex'] ?? 1;
      const duration = params['duration'] ?? 1;
      const shapes = ['circle', 'parabola', 'spiral'] as const;
      return {
        id: `cvd-${Date.now()}`,
        title: '曲线运动速度方向',
        model: 'curve-velocity-direction',
        bodies: [{ id: 'ball', mass: { value: 1, unit: 'kg' }, position: { x: 1, y: 0 }, velocity: { x: 0, y: angularSpeed } }],
        constraints: { curveVelocity: { trackShape: shapes[shapeIdx] ?? 'circle', angularSpeed, releaseIndex } },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  {
    id: 'curve-condition',
    name: '曲线运动条件',
    model: 'curve-condition',
    parameters: [
      { name: 'forceAngle', label: '力的方向角', unit: '°', value: 45, min: 0, max: 180, step: 5, default: 45, description: '合力与水平面的夹角' },
      { name: 'initialSpeed', label: '初速度 v₀', unit: 'm/s', value: 5, min: 1, max: 30, step: 0.5, default: 5, description: '初速度大小 (水平向右)' },
      { name: 'mass', label: '质量 m', unit: 'kg', value: 1, min: 0.1, max: 10, step: 0.1, default: 1, description: '物体质量' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 3, min: 0.5, max: 10, step: 0.5, default: 3, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
      const forceAngle = params['forceAngle'] ?? 45;
      const v0 = params['initialSpeed'] ?? 5;
      const m = params['mass'] ?? 1;
      const duration = params['duration'] ?? 3;
      return {
        id: `cc-${Date.now()}`,
        title: '曲线运动条件',
        model: 'curve-condition',
        bodies: [{ id: 'obj', mass: { value: m, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: v0, y: 0 } }],
        constraints: { curveCondition: { forceDirectionDeg: forceAngle, initialSpeed: v0, mass: m, forceMagnitude: m * 2 } },
        environment: {},
        timeConfig: { duration, dt: duration / 500, sampleCount: 500 },
      };
    },
  },
  {
    id: 'motion-composition',
    name: '运动的合成与分解',
    model: 'motion-composition',
    parameters: [
      { name: 'vxConst', label: '水平速度 vx', unit: 'm/s', value: 2, min: 0, max: 10, step: 0.5, default: 2, description: '水平方向的匀速分运动速度' },
      { name: 'vyAccel', label: '竖直加速度 ay', unit: 'm/s²', value: 2, min: 0, max: 10, step: 0.5, default: 2, description: '竖直方向的匀加速分运动加速度' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 3, min: 0.5, max: 10, step: 0.5, default: 3, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
      const vxConst = params['vxConst'] ?? 2;
      const vyAccel = params['vyAccel'] ?? 2;
      const duration = params['duration'] ?? 3;
      return {
        id: `mc-${Date.now()}`,
        title: '运动的合成与分解',
        model: 'motion-composition',
        bodies: [{ id: 'ball', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: vxConst, y: 0 } }],
        constraints: { motionComposition: { vxConst, vyAccel } },
        environment: { gravity: { enabled: true, value: vyAccel } },
        timeConfig: { duration, dt: duration / 500, sampleCount: 500 },
      };
    },
  },
  {
    id: 'transmission-belt',
    name: '传动方式 (皮带/齿轮/摩擦轮/同轴)',
    model: 'transmission-belt',
    parameters: [
      { name: 'mode', label: '传动方式', unit: '', value: 0, min: 0, max: 3, step: 1, default: 0, description: '0=皮带 1=齿轮 2=摩擦轮 3=同轴' },
      { name: 'r1', label: '主动轮半径 r₁', unit: 'm', value: 0.1, min: 0.01, max: 0.5, step: 0.01, default: 0.1, description: '主动轮半径' },
      { name: 'r2', label: '从动轮半径 r₂', unit: 'm', value: 0.2, min: 0.01, max: 0.5, step: 0.01, default: 0.2, description: '从动轮半径' },
      { name: 'omega1', label: '主动轮角速度 ω₁', unit: 'rad/s', value: 10, min: 1, max: 100, step: 1, default: 10, description: '主动轮角速度' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 2, min: 0.5, max: 5, step: 0.5, default: 2, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
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
        bodies: [{ id: 'wheel1', mass: { value: 1, unit: 'kg' }, position: { x: -1, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { transmission: { mode: modes[modeIdx] ?? 'belt', r1, r2, omega1 } },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  {
    id: 'vertical-circle',
    name: '竖直圆周最高点条件',
    model: 'vertical-circle',
    parameters: [
      { name: 'modelType', label: '约束类型', unit: '', value: 0, min: 0, max: 2, step: 1, default: 0, description: '0=绳 1=杆 2=圆环' },
      { name: 'length', label: '半径 r', unit: 'm', value: 1, min: 0.1, max: 5, step: 0.1, default: 1, description: '圆周运动半径 (绳/杆长)' },
      { name: 'mass', label: '质量 m', unit: 'kg', value: 1, min: 0.1, max: 10, step: 0.1, default: 1, description: '运动物体质量' },
      { name: 'initialSpeed', label: '最低点速度 v₀', unit: 'm/s', value: 7.5, min: 0, max: 15, step: 0.5, default: 7.5, description: '最低点初速度 (决定能否通过最高点)' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 5, min: 1, max: 15, step: 0.5, default: 5, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
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
        bodies: [{ id: 'ball', mass: { value: mass, unit: 'kg' }, position: { x: length, y: 0 }, velocity: { x: 0, y: initialSpeed } }],
        constraints: { verticalCircle: { length, mass, modelType: types[typeIdx] ?? 'rope', initialSpeed } },
        environment: { gravity: { enabled: true, value: 9.8 } },
        timeConfig: { duration, dt: duration / 500, sampleCount: 500 },
      };
    },
  },
  {
    id: 'centrifugal',
    name: '离心现象',
    model: 'centrifugal',
    parameters: [
      { name: 'mass', label: '物块质量 m', unit: 'kg', value: 1, min: 0.1, max: 10, step: 0.1, default: 1, description: '放置在转盘上的物体质量' },
      { name: 'radius', label: '转动半径 r', unit: 'm', value: 0.3, min: 0.05, max: 1, step: 0.05, default: 0.3, description: '物块到转盘中心的距离' },
      { name: 'angularSpeed', label: '角速度 ω', unit: 'rad/s', value: 5, min: 1, max: 15, step: 0.5, default: 5, description: '转盘角速度' },
      { name: 'frictionCoeff', label: '摩擦系数 μ', unit: '', value: 0.5, min: 0, max: 1, step: 0.05, default: 0.5, description: '物块与转盘间的静摩擦系数' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 3, min: 0.5, max: 10, step: 0.5, default: 3, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
      const mass = params['mass'] ?? 1;
      const radius = params['radius'] ?? 0.3;
      const angularSpeed = params['angularSpeed'] ?? 5;
      const frictionCoeff = params['frictionCoeff'] ?? 0.5;
      const duration = params['duration'] ?? 3;
      return {
        id: `cent-${Date.now()}`,
        title: '离心现象',
        model: 'centrifugal',
        bodies: [{ id: 'block', mass: { value: mass, unit: 'kg' }, position: { x: radius, y: 0 }, velocity: { x: 0, y: angularSpeed * radius } }],
        constraints: { centrifugal: { mass, radius, angularSpeed, frictionCoeff } },
        environment: {},
        timeConfig: { duration, dt: duration / 200, sampleCount: 200 },
      };
    },
  },
  {
    id: 'cavendish',
    name: '卡文迪什扭秤测 G',
    model: 'cavendish',
    parameters: [
      { name: 'm1', label: '大球质量 m₁', unit: 'kg', value: 10, min: 0.1, max: 1000, step: 0.1, default: 10, description: '大铅球质量' },
      { name: 'm2', label: '小球质量 m₂', unit: 'kg', value: 0.5, min: 0.01, max: 10, step: 0.01, default: 0.5, description: '小铅球质量' },
      { name: 'distance', label: '球心距离 r', unit: 'm', value: 0.1, min: 0.01, max: 0.5, step: 0.01, default: 0.1, description: '大球与小球的球心距离' },
      { name: 'torsionConst', label: '悬丝扭转常数 k', unit: 'N·m/rad', value: 1e-4, min: 1e-10, max: 1e-2, step: 0, default: 1e-4, description: '悬丝的扭转常数 (torsion wire stiffness)' },
      { name: 'mirrorDist', label: '镜面到屏距离 D', unit: 'm', value: 5, min: 0.5, max: 20, step: 0.5, default: 5, description: '光杠杆的放大臂长' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 1, min: 0.5, max: 5, step: 0.1, default: 1, description: '静态演示场景' },
    ],
    buildProblem: (params) => {
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
        bodies: [{ id: 'smallBall', mass: { value: m2, unit: 'kg' }, position: { x: distance, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: { cavendish: { m1, m2, distance, torsionConst, mirrorDist, armLength: 1 } },
        environment: {},
        timeConfig: { duration, dt: duration / 50, sampleCount: 50 },
      };
    },
  },
  {
    id: 'moon-earth-test',
    name: '月地检验 (牛顿)',
    model: 'moon-earth-test',
    parameters: [
      { name: 'duration', label: '模拟时长', unit: 's', value: 1, min: 0.5, max: 5, step: 0.1, default: 1, description: '静态演示场景' },
    ],
    buildProblem: (params) => {
      const duration = params['duration'] ?? 1;
      return {
        id: `met-${Date.now()}`,
        title: '月地检验',
        model: 'moon-earth-test',
        bodies: [{ id: 'moon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          moonEarthTest: {
            earthRadius: 6.371e6,
            moonDistance: 3.844e8,
            moonPeriod: 27.3 * 86400,
          },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 50, sampleCount: 50 },
      };
    },
  },
  // ========================================================================
  // 选必一 第二章 机械振动 — 双单摆 / 受迫振动 / 共振
  // ========================================================================
  {
    id: 'double-pendulum-sync',
    name: '双单摆步调比较',
    model: 'double-pendulum' as const,
    parameters: [
      { name: 'length1',   label: '摆1摆长 L₁',         unit: 'm',    value: 1.0,  min: 0.1, max: 5,   step: 0.05, default: 1.0,  description: '第一个单摆的摆线长度 (m)' },
      { name: 'length2',   label: '摆2摆长 L₂',         unit: 'm',    value: 0.5,  min: 0.1, max: 5,   step: 0.05, default: 0.5,  description: '第二个单摆的摆线长度 (m)' },
      { name: 'angle1',    label: '摆1初始角 θ₁',       unit: '°',   value: 10,   min: 0,   max: 15,  step: 1,    default: 10,   description: '第一个摆初始偏离角度 (建议 ≤15°, 小角度近似)' },
      { name: 'angle2',    label: '摆2初始角 θ₂',       unit: '°',   value: 10,   min: 0,   max: 15,  step: 1,    default: 10,   description: '第二个摆初始偏离角度 (建议 ≤15°, 小角度近似)' },
      { name: 'phaseDiff', label: '相位差 Δφ',          unit: '°',   value: 0,    min: 0,   max: 360, step: 5,    default: 0,    description: '两摆相位差 (0°=同相, 180°=反相)' },
      { name: 'gravity',   label: '重力加速度 g',        unit: 'm/s²', value: PHYSICS_CONSTANTS.g.value, min: 1, max: 20, step: 0.1, default: PHYSICS_CONSTANTS.g.value, description: '当地重力加速度' },
      { name: 'duration',  label: '模拟时长',            unit: 's',   value: 10,   min: 1,   max: 60,  step: 1,    default: 10,   description: '仿真总时长 (建议覆盖 ≥2 个长摆周期)' },
    ],
    buildProblem: (params) => {
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
          { id: 'pendulum1', mass: { value: 0.2, unit: 'kg' }, position: { x: L1 * Math.sin(th1 * Math.PI / 180), y: L1 * Math.cos(th1 * Math.PI / 180) }, velocity: { x: 0, y: 0 } },
          { id: 'pendulum2', mass: { value: 0.2, unit: 'kg' }, position: { x: L2 * Math.sin(th2 * Math.PI / 180), y: L2 * Math.cos(th2 * Math.PI / 180) }, velocity: { x: 0, y: 0 } },
        ],
        constraints: {
          doublePendulum: { length1: L1, length2: L2, initialAngle1: th1, initialAngle2: th2, phaseDiff: phase, gravity: g },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 500, sampleCount: 500 },
      };
    },
  },
  {
    id: 'forced-vibration-freq',
    name: '受迫振动 (频率响应)',
    model: 'forced-vibration' as const,
    parameters: [
      { name: 'mass',      label: '振子质量 m',         unit: 'kg',  value: 1,    min: 0.01, max: 10,   step: 0.01, default: 1,    description: '振子质量 (kg)' },
      { name: 'k',         label: '弹簧劲度系数 k',     unit: 'N/m', value: 100,  min: 0.1,  max: 1000, step: 1,    default: 100,  description: '弹簧劲度系数 (越大固有频率越高)' },
      { name: 'beta',      label: '阻尼系数 β',         unit: '1/s', value: 0.3,  min: 0,    max: 5,    step: 0.05, default: 0.3,  description: '粘滞阻尼系数 = c/(2m) (越大振幅衰减越快)' },
      { name: 'forceAmp',  label: '驱动力幅值 F₀',      unit: 'N',   value: 1,    min: 0.01, max: 100,  step: 0.1,  default: 1,    description: '周期驱动力的幅值' },
      { name: 'driveFreq', label: '驱动频率 f_d',       unit: 'Hz',  value: 2,    min: 0.1,  max: 20,   step: 0.1,  default: 2,    description: '驱动力的频率 (靠近固有频率时共振)' },
      { name: 'duration',  label: '模拟时长',            unit: 's',   value: 20,   min: 1,    max: 60,   step: 1,    default: 20,   description: '仿真总时长 (需足够长以观察稳态)' },
    ],
    buildProblem: (params) => {
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
        bodies: [{
          id: 'oscillator',
          mass: { value: mass, unit: 'kg' },
          position: { x: 0, y: 0 },
          velocity: { x: 0, y: 0 },
        }],
        constraints: {
          forcedVibration: { mass, springConstant, dampingBeta, forceAmplitude, drivingFreq },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 2000, sampleCount: 2000 },
      };
    },
  },
  {
    id: 'resonance-curve',
    name: '共振曲线 (幅-频)',
    model: 'resonance' as const,
    parameters: [
      { name: 'mass',      label: '振子质量 m',         unit: 'kg',  value: 1,    min: 0.01, max: 10,   step: 0.01, default: 1,    description: '振子质量 (kg)' },
      { name: 'k',         label: '弹簧劲度系数 k',     unit: 'N/m', value: 100,  min: 0.1,  max: 1000, step: 1,    default: 100,  description: '决定固有频率 f₀ = √(k/m)/(2π)' },
      { name: 'forceAmp',  label: '驱动力幅值 F₀',      unit: 'N',   value: 1,    min: 0.01, max: 100,  step: 0.1,  default: 1,    description: '保持恒定的驱动力幅值' },
      { name: 'beta',      label: '阻尼系数 β',         unit: '1/s', value: 0.5,  min: 0.02, max: 3,    step: 0.02, default: 0.5,  description: '阻尼越小, 共振峰越高越尖' },
      { name: 'freqMin',   label: '扫描下限 f_min',     unit: 'Hz',  value: 0.1,  min: 0.1,  max: 20,   step: 0.1,  default: 0.1,  description: '振幅-频率曲线扫描下限' },
      { name: 'freqMax',   label: '扫描上限 f_max',     unit: 'Hz',  value: 10,   min: 0.5,  max: 30,   step: 0.1,  default: 10,   description: '振幅-频率曲线扫描上限 (应覆盖 f₀)' },
    ],
    buildProblem: (params) => {
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
        bodies: [{ id: 'osc', mass: { value: mass, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          resonance: {
            mass, springConstant, forceAmplitude,
            dampingBetas: [beta],
            freqMin, freqMax,
          },
        },
        environment: {},
        // 静态图 (A-f 曲线): 不需要长时间演化
        timeConfig: { duration: 1, dt: 0.1, sampleCount: 100 },
      };
    },
  },
  // ========================================================================
  // 选必一 第三章 机械波 (声波/水波/多普勒)
  // ========================================================================
  {
    id: 'sound-waveform',
    name: '声音波形 (纯音+复合)',
    model: 'sound-waveform' as const,
    parameters: [
      { name: 'frequency', label: '基频 f',             unit: 'Hz',  value: 440,   min: 20,    max: 5000, step: 10,   default: 440, description: '声波基频 (A4 = 440 Hz)' },
      { name: 'amplitude', label: '振幅 A',              unit: '',    value: 0.8,   min: 0,     max: 1,   step: 0.05, default: 0.8, description: '振动幅度相对值 (0-1)' },
      { name: 'waveType',  label: '波形 (0=纯音 1=复合 2=噪声)', unit: '', value: 0, min: 0, max: 2, step: 1, default: 0, description: '0=纯音 (正弦); 1=复合音 (基频+谐波); 2=噪声' },
      { name: 'harmonic1', label: '2 倍频振幅',         unit: '',    value: 0.3,   min: 0,     max: 1,   step: 0.05, default: 0.3, description: '二次谐波相对振幅 (仅复合音模式有效)' },
      { name: 'harmonic2', label: '3 倍频振幅',         unit: '',    value: 0.2,   min: 0,     max: 1,   step: 0.05, default: 0.2, description: '三次谐波相对振幅 (仅复合音模式有效)' },
      { name: 'duration',  label: '模拟时长',            unit: 's',    value: 0.05,  min: 0.001, max: 0.5, step: 0.001, default: 0.05, description: '仿真总时长 (建议取 5-10 个基频周期)' },
    ],
    buildProblem: (params) => {
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
        bodies: [{ id: 'medium', mass: { value: 0.1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          soundWaveform: { frequency, amplitude, waveType, harmonics },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 500, sampleCount: 500 },
      };
    },
  },
  {
    id: 'doppler-effect',
    name: '多普勒效应 (声源运动)',
    model: 'doppler' as const,
    parameters: [
      { name: 'soundSpeed',  label: '声速 v',           unit: 'm/s', value: 340, min: 300,  max: 400,  step: 1,  default: 340, description: '空气中声速 (20°C ≈ 343 m/s)' },
      { name: 'sourceFreq',  label: '声源频率 f',       unit: 'Hz',  value: 500, min: 50,   max: 5000, step: 10, default: 500, description: '声源发出的原始频率' },
      { name: 'sourceSpeed', label: '声源速度 v_s',      unit: 'm/s', value: 30,  min: 0,    max: 330,  step: 1,  default: 30,  description: '声源相对介质的运动速度' },
      { name: 'dirAngle',    label: '方向角 θ',         unit: '°',   value: 0,   min: 0,    max: 360,  step: 1,  default: 0,   description: '声源运动方向与观察者连线夹角 (0°=靠近, 180°=远离)' },
      { name: 'duration',    label: '模拟时长',          unit: 's',   value: 10,  min: 0.5,  max: 30,   step: 0.5,default: 10,  description: '仿真总时长 (仅影响声源运动轨迹动画)' },
    ],
    buildProblem: (params) => {
      const soundSpeed = params['soundSpeed'] ?? 340;
      const sourceFreq = params['sourceFreq'] ?? 500;
      const sourceSpeed = params['sourceSpeed'] ?? 30;
      const dirAngle = params['dirAngle'] ?? 0;
      const duration = params['duration'] ?? 10;
      return {
        id: `dop-${Date.now()}`,
        title: '多普勒效应 (声源运动)',
        model: 'doppler',
        bodies: [{ id: 'source', mass: { value: 0.1, unit: 'kg' }, position: { x: -10, y: 0 }, velocity: { x: sourceSpeed, y: 0 } }],
        constraints: {
          doppler: { soundSpeed, sourceFreq, sourceSpeed, directionAngle: dirAngle },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 50, sampleCount: 50 },
      };
    },
  },
  {
    id: 'water-diffraction',
    name: '水波衍射 (遇障碍物)',
    model: 'water-diffraction' as const,
    parameters: [
      { name: 'wavelength', label: '波长 λ',           unit: 'cm', value: 4,   min: 0.5, max: 20,  step: 0.5, default: 4,   description: '水波波长 (cm)' },
      { name: 'slitWidth',  label: '狭缝宽度 a',       unit: 'cm', value: 5,   min: 0.5, max: 50,  step: 0.5, default: 5,   description: '障碍物狭缝宽度 (a/λ<1 衍射明显)' },
      { name: 'screenDist', label: '缝-挡板距离 L',    unit: 'cm', value: 50,  min: 5,   max: 200, step: 5,   default: 50,  description: '狭缝到后方挡板距离' },
      { name: 'waveAmp',    label: '入射波振幅 A',     unit: 'cm', value: 1,   min: 0.1, max: 5,   step: 0.1, default: 1,   description: '入射水波振幅' },
      { name: 'duration',   label: '模拟时长',          unit: 's',  value: 1,   min: 0.5, max: 5,   step: 0.1, default: 1,   description: '静态场景 (仅显示衍射强度图样)' },
    ],
    buildProblem: (params) => {
      const wavelength = params['wavelength'] ?? 4;
      const slitWidth = params['slitWidth'] ?? 5;
      const screenDist = params['screenDist'] ?? 50;
      const waveAmp = params['waveAmp'] ?? 1;
      const duration = params['duration'] ?? 1;
      return {
        id: `wd-${Date.now()}`,
        title: '水波衍射 (遇障碍物)',
        model: 'water-diffraction',
        bodies: [{ id: 'wave', mass: { value: 1, unit: 'kg' }, position: { x: -screenDist, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          waterDiffraction: { wavelength, slitWidth, screenDist, waveAmplitude: waveAmp },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 200, sampleCount: 200 },
      };
    },
  },
  {
    id: 'sound-interference',
    name: '声波干涉 (双喇叭)',
    model: 'sound-interference' as const,
    parameters: [
      { name: 'frequency',   label: '声波频率 f',      unit: 'Hz',  value: 500, min: 50,  max: 5000, step: 10,   default: 500,  description: '相干声波频率' },
      { name: 'speakerDist', label: '两扬声器距离 d',  unit: 'm',   value: 3,   min: 0.5, max: 20,  step: 0.1,  default: 3,    description: '扬声器 S₁ 与 S₂ 的距离' },
      { name: 'soundSpeed',  label: '声速 v',           unit: 'm/s', value: 340, min: 300, max: 400,  step: 1,    default: 340,  description: '空气中声速 (λ=v/f)' },
      { name: 'obsX',        label: '观察点 x',         unit: 'm',   value: 3,   min: -30, max: 30,  step: 0.5,  default: 3,    description: '观察点水平坐标 (沿两源连线方向)' },
      { name: 'obsY',        label: '观察点 y',         unit: 'm',   value: 10,  min: 0.5, max: 30,  step: 0.5,  default: 10,   description: '观察点到连线中点的垂直距离' },
      { name: 'amplitude',   label: '单源振幅 A₀',      unit: '',    value: 0.5, min: 0.1, max: 1,   step: 0.05, default: 0.5,  description: '单个声源的振幅相对值' },
      { name: 'duration',    label: '模拟时长',          unit: 's',   value: 1,   min: 0.5, max: 5,   step: 0.1,  default: 1,    description: '静态场景 (仅显示声强空间分布)' },
    ],
    buildProblem: (params) => {
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
          { id: 'S1', mass: { value: 0.1, unit: 'kg' }, position: { x: -speakerDist / 2, y: 0 }, velocity: { x: 0, y: 0 } },
          { id: 'S2', mass: { value: 0.1, unit: 'kg' }, position: { x: speakerDist / 2, y: 0 }, velocity: { x: 0, y: 0 } },
        ],
        constraints: {
          soundInterference: { frequency, speakerDist, soundSpeed, observationX: obsX, observationY: obsY, amplitude },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  // ========================================================================
  // 选必一 第四章 光
  // ========================================================================
  {
    id: 'thin-film',
    name: '薄膜干涉 (等厚)',
    model: 'thin-film' as const,
    parameters: [
      { name: 'thickness', label: '薄膜厚度 d',     unit: 'nm',  value: 300,   min: 10,    max: 2000, step: 10,   default: 300,   description: '薄膜中心厚度 (可见光波长的 1-3 倍)' },
      { name: 'refIndex',  label: '薄膜折射率 n',  unit: '',    value: 1.38,  min: 1,     max: 3,    step: 0.01, default: 1.38,  description: '薄膜材料折射率 (MgF₂=1.38, 玻璃=1.5)' },
      { name: 'wavelength', label: '入射光波长 λ', unit: 'nm',  value: 550,   min: 380,   max: 780,  step: 5,    default: 550,   description: '入射单色光波长 (绿光≈550nm)' },
      { name: 'incAngle',  label: '入射角 θ',       unit: '°',   value: 0,     min: 0,     max: 89,   step: 1,    default: 0,     description: '入射光线与法线的夹角' },
      { name: 'subsIndex', label: '基片折射率 n_s', unit: '',    value: 1.5,   min: 1,     max: 4,    step: 0.01, default: 1.5,   description: '薄膜下方基片折射率 (玻璃=1.5)' },
      { name: 'duration',  label: '模拟时长',        unit: 's',    value: 1,     min: 0.5,   max: 5,    step: 0.1,  default: 1,     description: '静态场景 (仅显示反射率曲线)' },
    ],
    buildProblem: (params) => {
      const thickness = params['thickness'] ?? 300;
      const refIndex = params['refIndex'] ?? 1.38;
      const wavelength = params['wavelength'] ?? 550;
      const incAngle = params['incAngle'] ?? 0;
      const subsIndex = params['subsIndex'] ?? 1.5;
      const duration = params['duration'] ?? 1;
      return {
        id: `tf-${Date.now()}`,
        title: '薄膜干涉 (等厚)',
        model: 'thin-film',
        bodies: [{ id: 'photon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          thinFilm: { thickness, refIndex, wavelength, incidentAngle: incAngle, substrateIndex: subsIndex },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  {
    id: 'single-slit',
    name: '单缝衍射 (光强分布)',
    model: 'single-slit' as const,
    parameters: [
      { name: 'slitWidth',  label: '缝宽 a',         unit: 'mm', value: 0.1,  min: 0.005, max: 1,   step: 0.005, default: 0.1,  description: '单缝宽度 (建议 0.05-0.5 mm 以获得明显衍射图样)' },
      { name: 'wavelength', label: '波长 λ',          unit: 'nm', value: 550,  min: 380,   max: 780, step: 5,     default: 550,  description: '入射单色光波长' },
      { name: 'screenDist', label: '缝-屏距离 L',     unit: 'm',  value: 1.5,  min: 0.1,   max: 10,  step: 0.1,   default: 1.5,  description: '单缝到观察屏的距离' },
      { name: 'duration',   label: '模拟时长',         unit: 's',  value: 1,    min: 0.5,   max: 5,   step: 0.1,   default: 1,    description: '静态场景 (仅显示衍射图样)' },
    ],
    buildProblem: (params) => {
      const slitWidth = params['slitWidth'] ?? 0.1;
      const wavelength = params['wavelength'] ?? 550;
      const screenDist = params['screenDist'] ?? 1.5;
      const duration = params['duration'] ?? 1;
      return {
        id: `ss-${Date.now()}`,
        title: '单缝衍射 (光强分布)',
        model: 'single-slit',
        bodies: [{ id: 'photon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          singleSlit: { slitWidth, wavelength, screenDist },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  {
    id: 'diffraction-grating',
    name: '光栅衍射 (光栅方程)',
    model: 'diffraction-grating' as const,
    parameters: [
      { name: 'gratingConst', label: '光栅常数 d', unit: 'μm', value: 2,    min: 0.5,   max: 10,   step: 0.1,  default: 2,    description: '相邻狭缝中心距 (d=1/N, N=刻线数)' },
      { name: 'slitWidth',    label: '缝宽 a',      unit: 'μm', value: 1,    min: 0.2,   max: 5,    step: 0.1,  default: 1,    description: '单条狭缝的宽度' },
      { name: 'wavelength',   label: '波长 λ',      unit: 'nm', value: 550,  min: 380,   max: 780,  step: 5,    default: 550,  description: '入射单色光波长' },
      { name: 'orderMax',     label: '最大级次 k_max', unit: '', value: 4, min: 1,     max: 10,   step: 1,    default: 4,    description: '计算的最大衍射级次' },
      { name: 'slitCount',    label: '总缝数 N',    unit: '',   value: 500,  min: 10,    max: 10000, step: 10, default: 500,  description: '光栅总刻线数 (越多谱线越锐利)' },
      { name: 'duration',     label: '模拟时长',     unit: 's',  value: 1,    min: 0.5,   max: 5,    step: 0.1,  default: 1,    description: '静态场景 (仅显示衍射谱线)' },
    ],
    buildProblem: (params) => {
      const gratingConstant = params['gratingConst'] ?? 2;
      const slitWidth = params['slitWidth'] ?? 1;
      const wavelength = params['wavelength'] ?? 550;
      const orderMax = params['orderMax'] ?? 4;
      const slitCount = params['slitCount'] ?? 500;
      const duration = params['duration'] ?? 1;
      return {
        id: `dg-${Date.now()}`,
        title: '光栅衍射 (光栅方程)',
        model: 'diffraction-grating',
        bodies: [{ id: 'photon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          diffractionGrating: { gratingConstant, slitWidth, wavelength, orderMax, slitCount },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  {
    id: 'polarization-malus',
    name: '偏振光 (马吕斯定律)',
    model: 'polarization' as const,
    parameters: [
      { name: 'initIntensity', label: '入射光强 I₀',   unit: '',  value: 1,   min: 0,    max: 1,   step: 0.05, default: 1,   description: '入射光强相对值' },
      { name: 'nPolarizers',   label: '偏振片数量 n',    unit: '',  value: 2,   min: 1,    max: 5,   step: 1,    default: 2,   description: '偏振片数目 (1=检偏, ≥2=多级系统)' },
      { name: 'angle0',        label: '第 1 片角度',     unit: '°', value: 0,   min: 0,    max: 360, step: 1,    default: 0,   description: '第一片偏振片透振方向 (相对入射偏振)' },
      { name: 'angle1',        label: '第 2 片角度',     unit: '°', value: 45,  min: 0,    max: 360, step: 1,    default: 45,  description: '第二片偏振片透振方向 (≥2 片时有效)' },
      { name: 'angle2',        label: '第 3 片角度',     unit: '°', value: 90,  min: 0,    max: 360, step: 1,    default: 90,  description: '第三片偏振片透振方向 (≥3 片时有效)' },
      { name: 'incAngle',       label: '入射偏振方向',    unit: '°', value: 0,   min: 0,    max: 360, step: 1,    default: 0,   description: '入射光偏振方向 (仅参考)' },
      { name: 'duration',       label: '模拟时长',          unit: 's', value: 1,   min: 0.5,  max: 5,   step: 0.1,  default: 1,   description: '静态场景 (仅显示光强曲线)' },
    ],
    buildProblem: (params) => {
      const initialIntensity = params['initIntensity'] ?? 1;
      const nPolarizers = params['nPolarizers'] ?? 2;
      const angle0 = params['angle0'] ?? 0;
      const angle1 = params['angle1'] ?? 45;
      const angle2 = params['angle2'] ?? 90;
      let extraAngles: number[] = [];
      if (nPolarizers >= 4) extraAngles = [angle0 + 22];
      if (nPolarizers >= 5) extraAngles = [angle0 + 22, angle0 + 67];
      const polarizerAngles = [angle0, angle1, angle2, ...extraAngles].slice(0, nPolarizers);
      const incidentAngle = params['incAngle'] ?? 0;
      const duration = params['duration'] ?? 1;
      return {
        id: `pol-${Date.now()}`,
        title: '偏振光 (马吕斯定律)',
        model: 'polarization',
        bodies: [{ id: 'photon', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          polarization: { initialIntensity, nPolarizers, polarizerAngles, incidentAngle },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 50, sampleCount: 50 },
      };
    },
  },
  {
    id: 'hologram',
    name: '全息照相 (干涉记录)',
    model: 'hologram' as const,
    parameters: [
      { name: 'refAngle',     label: '参考光角度 θ_r', unit: '°',   value: 30,    min: 0,     max: 60,   step: 1,    default: 30,    description: '参考光与光轴夹角' },
      { name: 'objAngle',     label: '物光角度 θ_o',    unit: '°',   value: -10,   min: -30,  max: 30,   step: 1,    default: -10,   description: '物光与光轴夹角 (反号表示另一侧)' },
      { name: 'wavelength',   label: '激光波长 λ',      unit: 'nm',  value: 632.8, min: 380,   max: 780,  step: 5,    default: 632.8, description: '激光波长 (He-Ne 激光器 632.8nm)' },
      { name: 'refAmp',       label: '参考光振幅 A_r',  unit: '',    value: 1,     min: 0.1,   max: 10,   step: 0.1,  default: 1,     description: '参考光振幅相对值' },
      { name: 'objAmp',       label: '物光振幅 A_o',    unit: '',    value: 0.5,   min: 0.1,   max: 10,   step: 0.1,  default: 0.5,   description: '物光振幅相对值 (通常 < 参考光)' },
      { name: 'recordWidth',  label: '干板宽度 W',      unit: 'mm',  value: 20,    min: 1,     max: 100,  step: 1,    default: 20,    description: '全息干板宽度 (mm)' },
      { name: 'duration',     label: '模拟时长',         unit: 's',    value: 1,     min: 0.5,   max: 5,    step: 0.1,  default: 1,     description: '静态场景 (仅显示记录/再现条纹)' },
    ],
    buildProblem: (params) => {
      const referenceAngle = params['refAngle'] ?? 30;
      const objectAngle = params['objAngle'] ?? -10;
      const wavelength = params['wavelength'] ?? 632.8;
      const refAmp = params['refAmp'] ?? 1;
      const objAmp = params['objAmp'] ?? 0.5;
      const recordWidth = params['recordWidth'] ?? 20;
      const duration = params['duration'] ?? 1;
      return {
        id: `hlg-${Date.now()}`,
        title: '全息照相 (干涉记录)',
        model: 'hologram',
        bodies: [{ id: 'plate', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          hologram: { referenceAngle, objectAngle, wavelength, referenceAmp: refAmp, objectAmp: objAmp, recordWidth },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  // ========================================================================
  // 选必一 第一章 实验 — 平抛验证动量守恒
  // ========================================================================
  {
    id: 'projectile-collision',
    name: '平抛碰撞 (验证动量守恒)',
    model: 'projectile-collision' as const,
    parameters: [
      { name: 'm1',          label: '入射球质量 m₁',   unit: 'kg',     value: 0.1, min: 0.01, max: 2,  step: 0.01, default: 0.1, description: '入射小球质量 (从斜轨释放)' },
      { name: 'm2',          label: '被撞球质量 m₂',   unit: 'kg',     value: 0.1, min: 0.01, max: 2,  step: 0.01, default: 0.1, description: '静止被撞小球质量' },
      { name: 'v1Initial',   label: '入射球碰前速度 v₁', unit: 'm/s', value: 2,   min: 0.1,  max: 10,  step: 0.1,  default: 2,   description: '碰前入射球速度 (平抛初速)' },
      { name: 'tableHeight', label: '实验台高度 h',      unit: 'm',     value: 0.8, min: 0.1,  max: 3,  step: 0.01, default: 0.8, description: '实验台水平面高度 (决定平抛时间 t=√(2h/g))' },
      { name: 'restitution', label: '弹性系数 e',        unit: '',       value: 1,   min: 0,    max: 1,  step: 0.01, default: 1,   description: '1=完全弹性碰撞, 0=完全非弹性' },
      { name: 'gravity',     label: '重力加速度 g',      unit: 'm/s²',  value: PHYSICS_CONSTANTS.g.value, min: 1, max: 20, step: 0.1, default: PHYSICS_CONSTANTS.g.value, description: '当地重力加速度' },
      { name: 'duration',    label: '模拟时长',           unit: 's',     value: 5,   min: 1,    max: 30, step: 0.5, default: 5,   description: '仿真总时长 (覆盖完整平抛过程)' },
    ],
    buildProblem: (params) => {
      const m1 = params['m1'] ?? 0.1;
      const m2 = params['m2'] ?? 0.1;
      const v1Initial = params['v1Initial'] ?? 2;
      const tableHeight = params['tableHeight'] ?? 0.8;
      const restitution = params['restitution'] ?? 1;
      const g = params['gravity'] ?? PHYSICS_CONSTANTS.g.value;
      const duration = params['duration'] ?? 5;
      // 预计算平抛下落时长, 确保动画覆盖完整过程
      const tFall = Math.sqrt(2 * tableHeight / g);
      const effDuration = Math.max(duration, tFall * 1.2);
      return {
        id: `pc-${Date.now()}`,
        title: '平抛碰撞 (验证动量守恒)',
        model: 'projectile-collision',
        bodies: [
          { id: 'A', mass: { value: m1, unit: 'kg' }, position: { x: 0, y: tableHeight }, velocity: { x: v1Initial, y: 0 } },
          { id: 'B', mass: { value: m2, unit: 'kg' }, position: { x: 0, y: tableHeight }, velocity: { x: 0, y: 0 } },
        ],
        constraints: {
          projectileCollision: { m1, m2, v1Initial, tableHeight, restitution, gravity: g },
        },
        environment: {
          gravity: { enabled: true, value: g },
          ground: { enabled: true, y: 0 },
        },
        timeConfig: { duration: effDuration, dt: effDuration / 300, sampleCount: 300 },
      };
    },
  },
  // ========================================================================
  // 选必二 电磁学 / 电磁波 / 传感器 / 互感 / 自感 / 传感器场景 — 14 模型
  // ========================================================================
  {
    id: 'current-balance',
    name: '电流天平 (安培力测量)',
    model: 'current-balance' as const,
    parameters: [
      { name: 'wireLen',       label: '导线有效长度 l',   unit: 'm',   value: 0.05,  min: 0.001, max: 1,   step: 0.001, default: 0.05,  description: '线圈垂直于磁场的单匝导线有效长度' },
      { name: 'turns',         label: '线圈匝数 n',         unit: '匝',  value: 20,    min: 1,     max: 1000, step: 1,    default: 20,    description: '线圈匝数' },
      { name: 'mass',          label: '砝码质量 m',         unit: 'kg',  value: 0.01,  min: 0.001, max: 1,   step: 0.001, default: 0.01,  description: '天平砝码质量' },
      { name: 'current',       label: '电流 I',              unit: 'A',   value: 1,     min: 0,     max: 100, step: 0.1,  default: 1,     description: '通过线圈的电流' },
      { name: 'magneticField', label: '磁感应强度 B',       unit: 'T',   value: 0.5,   min: 0.01, max: 10,  step: 0.01, default: 0.5,   description: '匀强磁场磁感应强度' },
      { name: 'gravity',       label: '重力加速度 g',       unit: 'm/s²', value: PHYSICS_CONSTANTS.g.value, min: 1, max: 20, step: 0.1, default: PHYSICS_CONSTANTS.g.value, description: '当地重力加速度' },
      { name: 'duration',      label: '模拟时长',           unit: 's',   value: 5,     min: 0.5,  max: 30,  step: 0.5,  default: 5,     description: '仿真总时长' },
    ],
    buildProblem: (params) => {
      const wireLen = params['wireLen'] ?? 0.05;
      const turns = params['turns'] ?? 20;
      const mass = params['mass'] ?? 0.01;
      const current = params['current'] ?? 1;
      const magneticField = params['magneticField'] ?? 0.5;
      const g = params['gravity'] ?? PHYSICS_CONSTANTS.g.value;
      const duration = params['duration'] ?? 5;
      return {
        id: `curBal-${Date.now()}`,
        title: '电流天平 (安培力测量)',
        model: 'current-balance',
        bodies: [{ id: 'balance', mass: { value: mass, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          currentBalance: { wireLen, turns, mass, current, magneticField, gravity: g },
        },
        environment: {
          gravity: { enabled: true, value: g },
        },
        timeConfig: { duration, dt: duration / 300, sampleCount: 300 },
      };
    },
  },
  {
    id: 'eddy-current',
    name: '涡流现象 (阻尼摆动)',
    model: 'eddy-current' as const,
    parameters: [
      { name: 'magneticField', label: '磁感应强度 B',   unit: 'T',   value: 0.2,           min: 0.01, max: 5,      step: 0.01,  default: 0.2,           description: '交变磁场峰值 B' },
      { name: 'frequency',     label: '磁场频率 f',      unit: 'Hz',  value: 50,            min: 0.1,  max: 1e6,    step: 1,     default: 50,            description: '交变磁场频率' },
      { name: 'conductivity',  label: '电导率 σ',   unit: 'S/m', value: 5.8e7,         min: 1e3,  max: 1e8,    step: 1e5,   default: 5.8e7,         description: '导体电导率 (铜~5.8x10⁷ S/m)' },
      { name: 'thickness',     label: '导体厚度 d',      unit: 'm',   value: 0.001,         min: 1e-5, max: 0.1,    step: 0.0001, default: 0.001,       description: '金属板厚度 (m)' },
      { name: 'muR',           label: '相对磁导率 μᵣ', unit: '',    value: 1,             min: 1,    max: 5000,  step: 1,     default: 1,             description: '导体相对磁导率 (非铁磁体=1)' },
      { name: 'duration',      label: '模拟时长',         unit: 's',   value: 10,            min: 0.5,  max: 60,    step: 0.5,   default: 10,            description: '仿真总时长' },
    ],
    buildProblem: (params) => {
      const magneticField = params['magneticField'] ?? 0.2;
      const frequency = params['frequency'] ?? 50;
      const conductivity = params['conductivity'] ?? 5.8e7;
      const thickness = params['thickness'] ?? 0.001;
      const muR = params['muR'] ?? 1;
      const duration = params['duration'] ?? 10;
      return {
        id: `eddy-${Date.now()}`,
        title: '涡流现象 (阻尼摆动)',
        model: 'eddy-current',
        bodies: [{ id: 'plate', mass: { value: 0.1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          eddyCurrent: { magneticField, frequency, conductivity, thickness, muR },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 500, sampleCount: 500 },
      };
    },
  },
  {
    id: 'em-damping',
    name: '电磁阻尼/驱动',
    model: 'em-damping' as const,
    parameters: [
      { name: 'magneticField',  label: '磁感应强度 B',         unit: 'T',       value: 0.3,     min: 0.01, max: 5,     step: 0.01,  default: 0.3,     description: '匀强磁场磁感应强度' },
      { name: 'angularSpeed',   label: '初始/目标角速度 ω₀', unit: 'rad/s',   value: 100,     min: 0,    max: 5000,  step: 10,    default: 100,     description: '初始 (阻尼) 或目标 (驱动) 角速度' },
      { name: 'conductivity',   label: '电导率 σ',         unit: 'S/m',     value: 5.8e7,   min: 1e3,  max: 1e8,   step: 1e5,   default: 5.8e7,   description: '导体电导率' },
      { name: 'inertia',        label: '转动惯量 J',            unit: 'kg·m²', value: 0.01,    min: 1e-9, max: 100,   step: 0.01,  default: 0.01,    description: '导体盘转动惯量' },
      { name: 'radius',         label: '导体盘半径 R',          unit: 'm',       value: 0.1,     min: 0.001, max: 10,    step: 0.01,  default: 0.1,     description: '导体盘半径' },
      { name: 'duration',       label: '模拟时长',               unit: 's',       value: 5,       min: 0.1,  max: 60,    step: 0.5,   default: 5,       description: '仿真总时长' },
    ],
    buildProblem: (params) => {
      const magneticField = params['magneticField'] ?? 0.3;
      const angularSpeed = params['angularSpeed'] ?? 100;
      const conductivity = params['conductivity'] ?? 5.8e7;
      const inertia = params['inertia'] ?? 0.01;
      const radius = params['radius'] ?? 0.1;
      const duration = params['duration'] ?? 5;
      return {
        id: `emd-${Date.now()}`,
        title: '电磁阻尼/驱动',
        model: 'em-damping',
        bodies: [{ id: 'disc', mass: { value: 0.5, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          emDamping: { mode: 'damping', magneticField, angularSpeed, conductivity, inertia, radius },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 500, sampleCount: 500 },
      };
    },
  },
  {
    id: 'mutual-inductance',
    name: '互感现象 (双线圈)',
    model: 'mutual-inductance' as const,
    parameters: [
      { name: 'L1',              label: '原线圈自感 L₁',   unit: 'H',   value: 0.1,   min: 1e-6, max: 1000, step: 0.01,  default: 0.1,   description: '原线圈自感 L1' },
      { name: 'L2',              label: '副线圈自感 L₂',   unit: 'H',   value: 0.05,  min: 1e-6, max: 1000, step: 0.01,  default: 0.05,  description: '副线圈自感 L2' },
      { name: 'coupling',        label: '耦合系数 k',           unit: '',    value: 0.6,   min: 0,     max: 1,    step: 0.01,  default: 0.6,   description: '耦合系数 (0=无耦合, 1=理想变压器)' },
      { name: 'frequency',       label: '交流频率 f',           unit: 'Hz',  value: 50,    min: 1,     max: 1e5,  step: 1,     default: 50,    description: '原边交流频率' },
      { name: 'primaryCurrent',  label: '原边电流峰值 I₀', unit: 'A',   value: 1,     min: 0,     max: 100,  step: 0.1,   default: 1,     description: '原边交流电流幅值 I0' },
      { name: 'duration',        label: '模拟时长',              unit: 's',   value: 0.2,   min: 0.05, max: 2,    step: 0.05,  default: 0.2,   description: '仿真总时长' },
    ],
    buildProblem: (params) => {
      const L1 = params['L1'] ?? 0.1;
      const L2 = params['L2'] ?? 0.05;
      const coupling = params['coupling'] ?? 0.6;
      const frequency = params['frequency'] ?? 50;
      const primaryCurrent = params['primaryCurrent'] ?? 1;
      const duration = params['duration'] ?? 0.2;
      return {
        id: `mutInd-${Date.now()}`,
        title: '互感现象 (双线圈)',
        model: 'mutual-inductance',
        bodies: [{ id: 'primary', mass: { value: 0.1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          mutualInductance: { L1, L2, coupling, frequency, primaryCurrent },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 1000, sampleCount: 1000 },
      };
    },
  },
  {
    id: 'self-inductance',
    name: '自感现象 (断电自感)',
    model: 'self-inductance' as const,
    parameters: [
      { name: 'inductance',   label: '自感 L',      unit: 'H',   value: 0.5, min: 1e-6, max: 1000, step: 0.01,  default: 0.5, description: '线圈自感 L' },
      { name: 'resistance',   label: '电阻 R',      unit: 'Ω',   value: 10,  min: 0.01, max: 1e6,  step: 1,     default: 10,  description: '电路电阻 R' },
      { name: 'emf',          label: '电源电动势 E', unit: 'V',   value: 12,  min: 0,     max: 1000, step: 0.5,   default: 12,  description: '直流电源电动势 E' },
      { name: 'duration',     label: '模拟时长',     unit: 's',   value: 0.5, min: 0.1,  max: 5,    step: 0.05,  default: 0.5, description: '仿真总时长 (含暂态过程)' },
    ],
    buildProblem: (params) => {
      const inductance = params['inductance'] ?? 0.5;
      const resistance = params['resistance'] ?? 10;
      const emf = params['emf'] ?? 12;
      const duration = params['duration'] ?? 0.5;
      return {
        id: `selfInd-${Date.now()}`,
        title: '自感现象 (断电自感)',
        model: 'self-inductance',
        bodies: [{ id: 'coil', mass: { value: 0.2, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          selfInductance: { inductance, resistance, emf, mode: 'turnOff' },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 500, sampleCount: 500 },
      };
    },
  },
  {
    id: 'em-wave-communication',
    name: '电磁波发射接收',
    model: 'em-wave-communication' as const,
    parameters: [
      { name: 'carrierFreq',       label: '载波频率 f_c', unit: 'MHz', value: 1,     min: 0.1,    max: 10000, step: 0.1,  default: 1,     description: '载波频率 fc (MHz)' },
      { name: 'audioFreq',         label: '音频频率 f_m', unit: 'kHz', value: 1,     min: 0.1,    max: 200,   step: 0.1,  default: 1,     description: '音频/基带信号频率 fm (kHz)' },
      { name: 'modulationIndex',   label: '调制指数 m/β', unit: '',     value: 0.8,   min: 0.01,   max: 5,     step: 0.01, default: 0.8,   description: '调制指数 (AM: m, FM: beta)' },
      { name: 'carrierAmplitude',  label: '载波峰值 V_c', unit: 'V',   value: 1,     min: 0.01,   max: 1000,  step: 0.1,  default: 1,     description: '载波峰值电压 Vc' },
      { name: 'distance',          label: '传输距离',     unit: 'km',   value: 10,    min: 0.001,  max: 1e5,   step: 1,    default: 10,    description: '发射-接收距离 (km)' },
      { name: 'duration',          label: '模拟时长',      unit: 'us',   value: 10,    min: 0.1,    max: 1000,  step: 0.1,  default: 10,    description: '仿真总时长 (用于显示多个周期)' },
    ],
    buildProblem: (params) => {
      const carrierFreqHz = (params['carrierFreq'] ?? 1) * 1e6;
      const audioFreqHz = (params['audioFreq'] ?? 1) * 1e3;
      const modulationIndex = params['modulationIndex'] ?? 0.8;
      const Vc = params['carrierAmplitude'] ?? 1;
      const distanceM = (params['distance'] ?? 10) * 1000;
      const duration = params['duration'] ?? 10;
      return {
        id: `emComm-${Date.now()}`,
        title: '电磁波发射接收',
        model: 'em-wave-communication',
        bodies: [{ id: 'antenna', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          emWaveComm: {
            carrierFreq: carrierFreqHz,
            audioFreq: audioFreqHz,
            modulationType: 'AM',
            modulationIndex,
            carrierAmplitude: Vc,
            distance: distanceM,
          },
        },
        environment: {},
        timeConfig: { duration: duration * 1e-6, dt: 1e-7, sampleCount: 800 },
      };
    },
  },
  {
    id: 'em-spectrum',
    name: '电磁波谱 (频段分布)',
    model: 'em-spectrum' as const,
    parameters: [
      { name: 'freqMinExp',  label: '频率下限 (10^n)', unit: '',   value: 1,  min: 0,    max: 15,  step: 1,  default: 1, description: '频率下限: 10^{n} Hz (n=1 → 10 Hz)' },
      { name: 'freqMaxExp',  label: '频率上限 (10^n)', unit: '',   value: 16, min: 3,    max: 22,  step: 1,  default: 16, description: '频率上限: 10^{n} Hz (n=16 → 10 PHz)' },
      { name: 'duration',    label: '模拟时长',         unit: 's',  value: 1,  min: 0.1,  max: 5,   step: 0.1, default: 1, description: '静态场景, 仅决定图表显示刷新' },
    ],
    buildProblem: (params) => {
      const freqMin = Math.pow(10, params['freqMinExp'] ?? 1);
      const freqMax = Math.pow(10, params['freqMaxExp'] ?? 16);
      const duration = params['duration'] ?? 1;
      return {
        id: `emSpec-${Date.now()}`,
        title: '电磁波谱 (频段分布)',
        model: 'em-spectrum',
        bodies: [{ id: 'probe', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          emSpectrum: { freqMin, freqMax, highlightBand: 'visible' },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 400 },
      };
    },
  },
  {
    id: 'hall-effect',
    name: '霍尔元件 (VH-IS)',
    model: 'hall-effect' as const,
    parameters: [
      { name: 'current',       label: '控制电流 I',      unit: 'A',   value: 1,     min: 0,     max: 100,     step: 0.1,   default: 1,     description: '霍尔元件控制电流 I' },
      { name: 'magneticField', label: '磁感应强度 B',    unit: 'T',   value: 0.3,   min: 0.001, max: 5,       step: 0.01,  default: 0.3,   description: '垂直于元件表面的磁场 B' },
      { name: 'chargeDensity', label: '载流子浓度 n',    unit: 'm^-3', value: 1e22,  min: 1e18,  max: 1e28,    step: 1e20,  default: 1e22,  description: '半导体载流子浓度 n' },
      { name: 'thickness',     label: '元件厚度 t',      unit: 'm',   value: 0.001, min: 1e-7,  max: 0.01,    step: 1e-4,  default: 0.001, description: '霍尔元件厚度 t (m)' },
      { name: 'duration',      label: '模拟时长',         unit: 's',   value: 1,     min: 0.1,   max: 5,       step: 0.1,   default: 1,     description: '静态场景显示时长' },
    ],
    buildProblem: (params) => {
      const current = params['current'] ?? 1;
      const magneticField = params['magneticField'] ?? 0.3;
      const chargeDensity = params['chargeDensity'] ?? 1e22;
      const thickness = params['thickness'] ?? 0.001;
      const duration = params['duration'] ?? 1;
      return {
        id: `hall-${Date.now()}`,
        title: '霍尔元件 (VH-IS)',
        model: 'hall-effect',
        bodies: [{ id: 'element', mass: { value: 0.01, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          hallEffect: { current, magneticField, chargeDensity, thickness, carrierType: 'electron' },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 200, sampleCount: 200 },
      };
    },
  },
  {
    id: 'reed-switch',
    name: '干簧管 (磁控开关)',
    model: 'reed-switch' as const,
    parameters: [
      { name: 'magnetDistance',    label: '磁铁到干簧管距离 d', unit: 'mm', value: 5,  min: 0.1, max: 100, step: 0.1, default: 5,  description: '磁体与干簧管间距 d' },
      { name: 'pullInThreshold',   label: '吸合阈值 H_pull',     unit: 'mT', value: 50, min: 5,   max: 200, step: 1,   default: 50, description: '吸合磁场阈值 (mT)' },
      { name: 'releaseThreshold',  label: '释放阈值 H_rel',      unit: 'mT', value: 30, min: 5,   max: 200, step: 1,   default: 30, description: '释放磁场阈值 (mT)' },
      { name: 'duration',          label: '模拟时长',             unit: 's',  value: 1,  min: 0.1, max: 5,   step: 0.1, default: 1,  description: '静态场景显示' },
    ],
    buildProblem: (params) => {
      const magnetDistance = params['magnetDistance'] ?? 5;
      const pullInThreshold = params['pullInThreshold'] ?? 50;
      const releaseThreshold = params['releaseThreshold'] ?? 30;
      const duration = params['duration'] ?? 1;
      return {
        id: `reed-${Date.now()}`,
        title: '干簧管 (磁控开关)',
        model: 'reed-switch',
        bodies: [{ id: 'reed', mass: { value: 0.001, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          reedSwitch: { mode: 'magnetic', magnetDistance, pullInThreshold, releaseThreshold },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  {
    id: 'photoresistor',
    name: '光敏电阻 (R-L特性)',
    model: 'photoresistor' as const,
    parameters: [
      { name: 'darkResistance',   label: '暗电阻 R_dark',     unit: 'Ohm', value: 1e6,   min: 1e3,  max: 1e9,  step: 1e5,  default: 1e6,   description: '无光照时的暗电阻 (Ω)' },
      { name: 'sensitivity',      label: '灵敏度 k',           unit: '1/lx', value: 2e-3,  min: 1e-5, max: 0.1,  step: 1e-4, default: 2e-3,  description: '指数灵敏度系数 k' },
      { name: 'lightIntensity',   label: '工作点光照度 E',    unit: 'lx',  value: 100,   min: 0.1,  max: 1e5,  step: 10,   default: 100,   description: '当前光照度 E (图亮度单位)' },
      { name: 'temperature',      label: '环境温度 T',         unit: '°C', value: 25,    min: -20,  max: 80,   step: 1,    default: 25,    description: '环境温度 (℃)' },
      { name: 'duration',         label: '模拟时长',            unit: 's',   value: 5,     min: 0.5,  max: 30,   step: 0.5,  default: 5,     description: '仿真总时长' },
    ],
    buildProblem: (params) => {
      const darkResistance = params['darkResistance'] ?? 1e6;
      const sensitivity = params['sensitivity'] ?? 2e-3;
      const lightIntensity = params['lightIntensity'] ?? 100;
      const temperatureCelsius = params['temperature'] ?? 25;
      const duration = params['duration'] ?? 5;
      return {
        id: `photo-${Date.now()}`,
        title: '光敏电阻 (R-L特性)',
        model: 'photoresistor',
        bodies: [{ id: 'ldr', mass: { value: 0.01, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          photoresistor: { darkResistance, sensitivity, lightIntensity, temperatureCelsius },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 300, sampleCount: 300 },
      };
    },
  },
  {
    id: 'thermistor',
    name: '热敏电阻 (R-T特性)',
    model: 'thermistor' as const,
    parameters: [
      { name: 'temperature',  label: '当前温度 T',   unit: 'K',   value: 300,  min: 200, max: 600, step: 1,   default: 300, description: '热敏电阻工作温度 (K)' },
      { name: 'R0',           label: '基准电阻 R₀', unit: 'Ω', value: 1e4, min: 1,   max: 1e6, step: 100, default: 1e4, description: 'T₀=298 K 时的基准电阻' },
      { name: 'BValue',       label: '材料常数 B',    unit: 'K',   value: 3950, min: 1000, max: 6000, step: 100, default: 3950, description: 'NTC B 常数' },
      { name: 'duration',     label: '模拟时长',       unit: 's',   value: 1,    min: 0.1, max: 5,   step: 0.1, default: 1,   description: '静态场景显示' },
    ],
    buildProblem: (params) => {
      const temperature = params['temperature'] ?? 300;
      const R0 = params['R0'] ?? 1e4;
      const BValue = params['BValue'] ?? 3950;
      const duration = params['duration'] ?? 1;
      return {
        id: `therm-${Date.now()}`,
        title: '热敏电阻 (R-T特性)',
        model: 'thermistor',
        bodies: [{ id: 'thermBody', mass: { value: 0.01, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          thermistor: { temperature, mode: 'NTC', R0, BValue },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 200, sampleCount: 200 },
      };
    },
  },
  {
    id: 'strain-gauge',
    name: '电阻应变片 (惠斯通电桥)',
    model: 'strain-gauge' as const,
    parameters: [
      { name: 'strain',         label: '应变 ε',     unit: 'με', value: 1000,   min: -5000,  max: 5000, step: 50,  default: 1000, description: '当前应变 (微应变单位)' },
      { name: 'gaugeFactor',    label: '灵敏系数 K',      unit: '',    value: 2.1,   min: 1,      max: 200,  step: 0.1, default: 2.1,  description: '应变片灵敏系数 K (金属~2, 半导体~100)' },
      { name: 'bridgeVoltage',  label: '桥路供电 U_K',   unit: 'V',    value: 5,     min: 0.5,    max: 30,   step: 0.5, default: 5,    description: '惠斯通电桥供电电压' },
      { name: 'duration',       label: '模拟时长',         unit: 's',    value: 1,     min: 0.1,    max: 5,    step: 0.1, default: 1,    description: '静态场景显示' },
    ],
    buildProblem: (params) => {
      const strain = params['strain'] ?? 1000;
      const gaugeFactor = params['gaugeFactor'] ?? 2.1;
      const bridgeVoltage = params['bridgeVoltage'] ?? 5;
      const duration = params['duration'] ?? 1;
      return {
        id: `strain-${Date.now()}`,
        title: '电阻应变片 (惠斯通电桥)',
        model: 'strain-gauge',
        bodies: [{ id: 'element', mass: { value: 0.1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          strainGauge: { strain, gaugeFactor, bridgeVoltage },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 200, sampleCount: 200 },
      };
    },
  },
  {
    id: 'security-alarm',
    name: '门窗防盗报警 (磁控)',
    model: 'security-alarm' as const,
    parameters: [
      { name: 'magnetDistance',    label: '磁体到干簧管距离 d', unit: 'mm', value: 5,  min: 0,   max: 300, step: 1, default: 5,  description: '磁体与干簧管的间距' },
      { name: 'operateDistance',   label: '吸合距离 d_operate',  unit: 'mm', value: 15, min: 1,   max: 50,  step: 1, default: 15, description: '吸合距离阈值' },
      { name: 'releaseDistance',   label: '释放距离 d_release',  unit: 'mm', value: 25, min: 5,   max: 50,  step: 1, default: 25, description: '释放距离阈值' },
      { name: 'duration',          label: '模拟时长',             unit: 's',  value: 1,  min: 0.1, max: 5,   step: 0.1, default: 1, description: '静态场景显示' },
    ],
    buildProblem: (params) => {
      const magnetDistance = params['magnetDistance'] ?? 5;
      const operateDistance = params['operateDistance'] ?? 15;
      const releaseDistance = params['releaseDistance'] ?? 25;
      const duration = params['duration'] ?? 1;
      const doorState: 'closed' | 'open' = magnetDistance <= operateDistance ? 'closed' : 'open';
      return {
        id: `sec-${Date.now()}`,
        title: '门窗防盗报警 (磁控)',
        model: 'security-alarm',
        bodies: [{ id: 'door', mass: { value: 10, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          securityAlarm: { doorState, magnetDistance, operateDistance, releaseDistance },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  {
    id: 'light-control-switch',
    name: '光控开关 (光敏+继电器)',
    model: 'light-control-switch' as const,
    parameters: [
      { name: 'lightIntensity',  label: '当前光照度 L',     unit: 'lx',  value: 0.5,     min: 0.01,  max: 1e5, step: 0.5,  default: 0.5,   description: '当前环境光照强度 (夜晚~0.5 lx, 白天~50000 lx)' },
      { name: 'threshold',       label: '触发阈值 L_th',   unit: 'lx',  value: 10,      min: 0.1,   max: 1e3, step: 1,    default: 10,    description: '路灯开关翻转阈值' },
      { name: 'Rfix',            label: '分压电阻 R_fix',  unit: 'Ω', value: 10000,   min: 100,   max: 1e6, step: 1000, default: 10000, description: '分压电路中固定电阻值' },
      { name: 'Esupply',         label: '电源电压 E',       unit: 'V',   value: 12,      min: 5,     max: 24,  step: 1,    default: 12,    description: '分压电路供电电压 E' },
      { name: 'duration',        label: '模拟时长',          unit: 'h',   value: 24,      min: 1,     max: 48,  step: 1,    default: 24,    description: '仿真总时长 (模拟 24h 光照变化)' },
    ],
    buildProblem: (params) => {
      const lightIntensity = params['lightIntensity'] ?? 0.5;
      const threshold = params['threshold'] ?? 10;
      const Rfix = params['Rfix'] ?? 10000;
      const Esupply = params['Esupply'] ?? 12;
      const durationH = params['duration'] ?? 24;
      return {
        id: `lcs-${Date.now()}`,
        title: '光控开关 (光敏+继电器)',
        model: 'light-control-switch',
        bodies: [{ id: 'lamp', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          lightControlSwitch: {
            lightIntensity,
            threshold,
            Rfix,
            Esupply,
            VbeOn: 0.7,
            Rdark: 1e6,
            Rbright: 5000,
            timeSpanH: durationH,
            sampleCount: 240,
          },
        },
        environment: {},
        timeConfig: { duration: durationH * 3600, dt: durationH * 3600 / 240, sampleCount: 240 },
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

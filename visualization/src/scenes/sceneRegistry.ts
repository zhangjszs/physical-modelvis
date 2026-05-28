import type { SceneConfig } from '../types/visualization';
import { PHYSICS_CONSTANTS } from 'physics-core';

/** 已注册的场景列表 */
export const SCENES: SceneConfig[] = [
  {
    id: 'projectile',
    name: '平抛/斜抛运动',
    model: 'uniform-accelerated',
    parameters: [
      { name: 'v0', label: '初速度 v₀', unit: 'm/s', value: 20, min: 1, max: 100, step: 1, default: 20, description: '物体开始运动时的速度大小' },
      { name: 'angle', label: '发射角 θ', unit: '°', value: 45, min: 0, max: 90, step: 1, default: 45, description: '初速度方向与水平面的夹角' },
      { name: 'g', label: '重力加速度 g', unit: 'm/s²', value: PHYSICS_CONSTANTS.g.value, min: 0.1, max: 30, step: 0.1, default: PHYSICS_CONSTANTS.g.value, description: '重力加速度大小' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 5, min: 0.5, max: 30, step: 0.5, default: 5, description: '仿真的总时长' },
    ],
    buildProblem: (params) => {
      const v0 = params['v0'] ?? 20;
      const angleDeg = params['angle'] ?? 45;
      const g = params['g'] ?? PHYSICS_CONSTANTS.g.value;
      const duration = params['duration'] ?? 5;
      const angleRad = (angleDeg * Math.PI) / 180;
      const v0x = v0 * Math.cos(angleRad);
      const v0y = v0 * Math.sin(angleRad);

      return {
        id: `projectile-${Date.now()}`,
        title: '平抛/斜抛运动',
        model: 'uniform-accelerated',
        bodies: [{
          id: 'ball',
          mass: { value: 1, unit: 'kg' },
          position: { x: 0, y: 0 },
          velocity: { x: v0x, y: v0y },
        }],
        environment: {
          gravity: { enabled: true, value: g },
          ground: { enabled: true, y: 0 },
        },
        timeConfig: { duration, dt: 0.01, sampleCount: 1000 },
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

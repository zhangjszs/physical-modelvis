import type { PhysicalBody, RenderHint, Quantity, Vector2D } from './common.js';

/** 支持的物理模型类型 */
export type ModelType =
  | 'uniform-linear'
  | 'uniform-accelerated'
  | 'projectile-horizontal'
  | 'projectile-angular'
  | 'inclined-plane'
  | 'spring-oscillator'
  | 'collision-elastic'
  | 'collision-inelastic'
  | 'point-charge-field'
  | 'uniform-electric-field'
  | 'uniform-magnetic-field'
  | 'em-combined-field';

/** 重力场配置 */
export interface GravityConfig {
  readonly enabled: boolean;
  readonly value?: number;   // m/s², 默认 9.8
  readonly unit?: 'm/s²';
}

/** 电场配置 */
export interface ElectricFieldConfig {
  readonly enabled: boolean;
  readonly fieldVector?: Vector2D;  // N/C
  readonly unit?: 'N/C';
}

/** 磁场配置 */
export interface MagneticFieldConfig {
  readonly enabled: boolean;
  readonly fieldStrength?: number;  // T
  readonly direction?: 'in' | 'out'; // 垂直于 xy 平面
  readonly unit?: 'T';
}

/** 地面配置 */
export interface GroundConfig {
  readonly enabled: boolean;
  readonly y?: number;             // 地面 y 坐标 (m)
  readonly friction?: number;      // 摩擦系数
}

/** 斜面约束 */
export interface InclinedPlaneConstraint {
  readonly angle: number;           // 度
  readonly frictionCoefficient?: number;
}

/** 弹簧约束 */
export interface SpringConstraint {
  readonly springConstant: number;  // N/m
  readonly naturalLength: number;   // m
  readonly anchorPoint: Vector2D;
}

/** 环境配置 */
export interface EnvironmentConfig {
  readonly gravity?: GravityConfig;
  readonly electricField?: ElectricFieldConfig;
  readonly magneticField?: MagneticFieldConfig;
  readonly ground?: GroundConfig;
  readonly airResistance?: { enabled: boolean; coefficient?: number };
}

/** 碰撞约束 */
export interface CollisionConstraint {
  readonly restitution?: number;
}

/** 约束配置 */
export interface ConstraintConfig {
  readonly inclinedPlane?: InclinedPlaneConstraint;
  readonly spring?: SpringConstraint;
  readonly collision?: CollisionConstraint;
}

/** 时间配置 */
export interface TimeConfig {
  readonly duration: number;       // 模拟时长 (s)
  readonly dt?: number;            // 时间步长 (s), 默认 0.01
  readonly sampleCount?: number;   // 输出采样点数, 默认 1000
}

/** 结构化物理问题 — 物理引擎的输入 */
export interface PhysicsProblem {
  readonly id: string;
  readonly title?: string;
  readonly model: ModelType;
  readonly bodies: PhysicalBody[];
  readonly environment?: EnvironmentConfig;
  readonly constraints?: ConstraintConfig;
  readonly timeConfig: TimeConfig;
  readonly renderHints?: RenderHint[];
  readonly originalText?: string;
}

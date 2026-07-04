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
  | 'em-combined-field'
  | 'uniform-circular-motion'
  // 必修一 第三章 相互作用——力
  | 'force-composition'      // 力的合成与分解 (平行四边形定则)
  | 'newton-third-law'       // 牛顿第三定律 (作用力与反作用力)
  | 'sliding-friction';      // 滑动摩擦力 (f = μN)

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

/** 圆周运动约束 */
export interface CircularMotionConstraint {
  readonly center: Vector2D;
  readonly radius: number;
  readonly angularVelocity: number;
  readonly initialAngle?: number;
  readonly showCentripetalForce?: boolean;
}

/** 力的合成约束 (平行四边形定则) — 必修一 §4 */
export interface ForceCompositionConstraint {
  /** 第一个分力 F1 的大小 (N) */
  readonly f1: number;
  /** 第二个分力 F2 的大小 (N) */
  readonly f2: number;
  /** F1 与 F2 之间的夹角 (度) */
  readonly angleDeg: number;
  /** F1 的方向角 (度，相对 x 轴)，默认 0 */
  readonly f1AngleDeg?: number;
}

/** 牛顿第三定律约束 — 必修一 §5 */
export interface NewtonThirdLawConstraint {
  /** A 对 B 施加的作用力大小 (N)，正=向右，负=向左 */
  readonly forceAB: number;
  /** 是否模拟运动 (true=两物体在光滑水平面上加速，false=固定) */
  readonly allowMotion?: boolean;
}

/** 滑动摩擦力约束 — 必修一 §3 */
export interface SlidingFrictionConstraint {
  /** 动摩擦因数 μ */
  readonly frictionCoefficient: number;
  /** 接触面材料 (用于显示) */
  readonly surfaceMaterial?: 'wood' | 'rubber' | 'metal' | 'glass';
  /** 是否匀速拉动 (true=外力等于摩擦力，false=外力大于摩擦力加速) */
  readonly uniformMotion?: boolean;
}

/** 约束配置 */
export interface ConstraintConfig {
  readonly inclinedPlane?: InclinedPlaneConstraint;
  readonly spring?: SpringConstraint;
  readonly collision?: CollisionConstraint;
  readonly circularMotion?: CircularMotionConstraint;
  readonly forceComposition?: ForceCompositionConstraint;
  readonly newtonThirdLaw?: NewtonThirdLawConstraint;
  readonly slidingFriction?: SlidingFrictionConstraint;
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

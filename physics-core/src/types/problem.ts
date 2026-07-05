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
  | 'sliding-friction'       // 滑动摩擦力 (f = μN)
  // 必修一 第四章 运动和力的关系
  | 'newton-second-law'      // 牛顿第二定律 (F = ma)
  // 必修二 第一章 抛体运动
  | 'projectile'             // 抛体运动 (平抛 + 斜抛)
  // 必修二 第三章 万有引力与航天
  | 'orbital'                // 万有引力轨道运动
  // 选必一 第一章 动量守恒定律
  | 'momentum'               // 动量定理 / 反冲
  // 选必一 第二章 机械振动
  | 'simple-pendulum'        // 单摆简谐运动
  // 选必一 第三章 机械波
  | 'mechanical-wave'        // 机械波 (横波/纵波/干涉)
  // 选必一 第四章 光
  | 'refraction'             // 折射定律 / 全反射
  | 'interference'           // 双缝干涉 / 薄膜干涉
  // 必修三 第十一章 电路及其应用
  | 'circuit'                // 直流电路 (串并联)
  // 选必三 气体/热学
  | 'gas-law'                // 理想气体状态方程
  // 选必三 §4 原子结构和波粒二象性
  | 'photoelectric'          // 光电效应
  | 'bohr-model'             // 玻尔氢原子模型 / 光谱
  // 选必三 §5 原子核
  | 'radioactive-decay'      // 放射性衰变
  // 选必二 §1 安培力与洛伦兹力
  | 'magnetic-force'         // 安培力 + 洛伦兹力
  // 选必二 §2 电磁感应
  | 'em-induction'           // 电磁感应
  // 选必二 §3 交变电流 + §4 LC 振荡
  | 'ac-current'             // 交变电流
  | 'lc-oscillator'          // LC 电磁振荡
  // 打点计时器实验 (必修一 第一章 实验)
  | 'ticker-timer'           // 打点计时器 — 匀变速直线运动实验研究
  // 必修一 第四章 牛顿第一定律 — 伽利略理想实验
  | 'galileo-incline'        // 伽利略斜面理想实验 (冲淡重力 / 对接斜面 / 水平外推)
  // 必修一 第四章 牛顿第一定律 — 惯性实验组合
  | 'inertia'                // 惯性 (棋子打击 / 鸡蛋落水 / 小车急停)
  // 选必一 §5 实验: 用光杠杆放大法演示桌面微小形变
  | 'micro-deformation'     // 桌面微小形变光杠杆放大法
  // 互动实验: 测反应时间 (自由落体法)
  | 'reaction-time'         // 测反应时间 — 自由落体位移公式 t = √(2h/g)
  // 必修一 第四章 运动和力的关系 (超重和失重)
  | 'overweight'            // 超重与失重 — 电梯加速度方向演示
  // 重心实验 (悬挂法)
  | 'center-of-gravity';    // 悬挂法确定均匀薄板重心

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
  /** 圆锥摆模式：细绳与竖直方向的夹角 (度) — 设置后由 L 和 θ 自动推导线速度 */
  readonly conicalAngleDeg?: number;
  /** 圆锥摆绳长 (m) — 仅当 conicalAngleDeg>0 时生效 */
  readonly ropeLength?: number;
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

/** 牛顿第二定律约束 — 必修一 §2 (F = ma) */
export interface NewtonSecondLawConstraint {
  /** 合外力 (N) — 支持一维标量 (沿 x 轴) 或二维向量 */
  readonly force: number | Vector2D;
  /** 是否考虑摩擦力 (使用 environment.ground.friction) */
  readonly includeFriction?: boolean;
}

/** 抛体运动约束 — 必修二 §1 */
export interface ProjectileConstraint {
  /** 发射角 (度, 0°=水平, 90°=竖直上抛) */
  readonly angleDeg: number;
  /** 初始高度 (m) */
  readonly initialHeight?: number;
}

/** 动量定理/反冲约束 — 选必一 §1 */
export interface MomentumConstraint {
  /** 模式：'impulse' (动量定理) 或 'recoil' (反冲) */
  readonly mode: 'impulse' | 'recoil';
  /** 冲量模式：恒力 F (N) */
  readonly force?: number;
}

/** 万有引力轨道约束 — 必修二 §3 */
export interface OrbitalConstraint {
  /** 中心天体引力参数 GM (m³/s²)，默认地球 3.986×10¹⁴ */
  readonly GM?: number;
  /** 中心天体半径 (m)，用于碰撞检测 */
  readonly centralRadius?: number;
  /** 是否显示椭圆轨道焦点 (地心) */
  readonly showCenter?: boolean;
}

/** 单摆约束 — 选必一 §2 */
export interface SimplePendulumConstraint {
  /** 摆长 (m) */
  readonly length: number;
  /** 重力加速度 (m/s²) */
  readonly g?: number;
  /** 初始摆角 (度) */
  readonly initialAngleDeg: number;
  /** 初始角速度 (rad/s) */
  readonly initialOmega?: number;
  /** 阻尼系数 */
  readonly damping?: number;
  /** 悬点坐标 */
  readonly pivot?: { x: number; y: number };
}

/** 机械波约束 — 选必一 §3 */
export interface WaveConstraint {
  /** 横波 transverse / 纵波 longitudinal / 干涉 interference */
  readonly mode: 'transverse' | 'longitudinal' | 'interference';
  /** 振幅 (m) */
  readonly amplitude: number;
  /** 频率 (Hz) */
  readonly frequency: number;
  /** 波长 (m) */
  readonly wavelength: number;
  /** 质点数量 */
  readonly particleCount?: number;
  /** 起点坐标 (m) */
  readonly xStart?: number;
  /** 终点坐标 (m) */
  readonly xEnd?: number;
  /** 干涉模式：第二列波振幅 */
  readonly amplitude2?: number;
  /** 第二列波相位差 (rad) */
  readonly phaseDiff?: number;
  /** 第二列波传播方向 (+1=右, -1=左) */
  readonly direction2?: number;
}

/** 折射/全反射约束 — 选必一 §4 (Snell 定律 n₁sinθ₁=n₂sinθ₂) */
export interface RefractionConstraint {
  /** 入射角 (度, 相对法线) */
  readonly incidentAngleDeg: number;
  /** 介质 1 折射率 (空气 ≈1.0, 水 ≈1.33, 玻璃 ≈1.5) */
  readonly n1: number;
  /** 介质 2 折射率 */
  readonly n2: number;
}

/** 双缝干涉约束 — 选必一 §4 */
export interface InterferenceConstraint {
  /** 光波长 (nm) */
  readonly wavelengthNm: number;
  /** 缝距 d (mm) */
  readonly slitSeparationMm: number;
  /** 缝到屏的距离 L (m) */
  readonly screenDistanceM: number;
  /** 薄膜干涉：膜厚 (μm) — 非薄膜模式忽略 */
  readonly filmThicknessUm?: number;
  /** 薄膜折射率 */
  readonly filmN?: number;
}

/** 直流电路约束 — 必修三 §3 (串并联、欧姆定律、电功率) */
export interface CircuitConstraint {
  /** 电源电动势 (V) */
  readonly emf: number;
  /** 电源内阻 (Ω) */
  readonly internalResistance?: number;
  /**
   * 电路拓扑：电阻值 (Ω) 与连接方式。
   * 第一个电阻总是与电源串联；后续电阻根据 connection 决定与前一个电阻串联或并联。
   * 例：[10(series), 10(series), 10(parallel)] → R1 串 R2 串 (并 R3)
   */
  readonly resistors: ReadonlyArray<{
    readonly resistance: number;
    /** 'series' (串联) 或 'parallel' (并联，对前一级) */
    readonly connection: 'series' | 'parallel';
  }>;
}

/** 理想气体状态方程约束 — 选必三 §2 (pV=nRT) */
export interface GasLawConstraint {
  /** 物质的量 (mol) */
  readonly moles: number;
  /** 模式：'isothermal' (等温)｜'isobaric' (等压)｜'isochoric' (等容) */
  readonly mode: 'isothermal' | 'isobaric' | 'isochoric';
  /** 初始压强 (Pa) */
  readonly initialPressure?: number;
  /** 初始体积 (m³) */
  readonly initialVolume?: number;
  /** 初始温度 (K) */
  readonly initialTemperature?: number;
}

/** 光电效应约束 — 选必三 §4 (hν = W₀ + e·U_c) */
export interface PhotoelectricConstraint {
  /** 金属逸出功 W₀ (eV) */
  readonly workFunction: number;
  /** 入射光频率范围 (THz) */
  readonly freqMinTHz?: number;
  readonly freqMaxTHz?: number;
}

/** 玻尔氢原子模型约束 — 选必三 §4 */
export interface BohrModelConstraint {
  /** 目标光谱线系：'Lyman'(n₁=1) / 'Balmer'(n₁=2) / 'Paschen'(n₁=3) */
  readonly series?: 'Lyman' | 'Balmer' | 'Paschen';
  /** 最大主量子数 */
  readonly maxN?: number;
}

/** 放射性衰变约束 — 选必三 §5 */
export interface RadioactiveDecayConstraint {
  /** 初始原子数 */
  readonly initialAtoms: number;
  /** 半衰期 T₁/₂ (s) */
  readonly halfLife: number;
  /** 模拟时长 (s) */
  readonly duration?: number;
  /** 射线类型 (影响径迹) */
  readonly radiationType?: 'alpha' | 'beta' | 'gamma';
}

/** 安培力/洛伦兹力约束 — 选必二 §1 */
export interface MagneticForceConstraint {
  /** 磁感应强度 B (T) */
  readonly magneticField: number;
  /** 安培力模式参数 */
  /** 电流 I (A) */
  readonly current?: number;
  /** 导线长度 L (m) */
  readonly wireLength?: number;
  /** 导线与磁场夹角 θ (度) */
  readonly wireAngleDeg?: number;
  /** 洛伦兹力模式参数 */
  /** 粒子电荷 q (C) */
  readonly charge?: number;
  /** 粒子速度 v (m/s) */
  readonly velocity?: number;
  /** 速度与磁场夹角 φ (度) */
  readonly velocityAngleDeg?: number;
  /** 粒子质量 (kg) — 圆周运动需要 */
  readonly particleMass?: number;
}

/** 电磁感应约束 — 选必二 §2 */
export interface EMInductionConstraint {
  /** 磁感应强度 B (T) */
  readonly magneticField: number;
  /** 线圈面积 A (m²) */
  readonly area: number;
  /** 线圈匝数 N */
  readonly turns?: number;
  /** 磁场与法线夹角 θ (度) */
  readonly angleDeg?: number;
  /** 切割模式：导线长度 L (m) 方向垂直 B */
  readonly cuttingLength?: number;
  /** 切割速度 (m/s) */
  readonly cuttingVelocity?: number;
}

/** 交变电流约束 — 选必二 §3 */
export interface ACCurrentConstraint {
  /** 峰值电动势 (V) */
  readonly peakEmf: number;
  /** 角频率 ω (rad/s) */
  readonly angularFreq: number;
  /** 变压器匝数比 n1:n2 */
  readonly turnsRatio?: number; // n2/n1 (降压 < 1, 升压 > 1)
}

/** LC 振荡约束 — 选必二 §4 */
export interface LCOscillatorConstraint {
  /** 电容 (F) */
  readonly capacitance: number;
  /** 电感 (H) */
  readonly inductance: number;
  /** 初始电荷 (C) */
  readonly initialCharge?: number;
}

/** 超重/失重演示模式 */
export type OverweightMode = 'upStart' | 'upStop' | 'downStart' | 'downStop';

/**
 * 超重与失重约束 — 必修一 第四章 运动和力的关系
 *
 * 电梯内物体受支持力 N = m·(g + a_y) (向上为正):
 * - 超重: a_y > 0 (向上加速或向下减速) → N > mg
 * - 失重: a_y < 0 (向下加速或向上减速) → N < mg
 * - 完全失重: a_y = −g → N = 0
 */
export interface OverweightConstraint {
  /** 物体质量 (kg)，默认 1 */
  readonly mass?: number;
  /** 加速度大小 (m/s²)，默认 2 */
  readonly accMagnitude?: number;
  /** 演示阶段: upStart (超重), upStop (失重), downStart (失重), downStop (超重) */
  readonly mode: OverweightMode;
  /** 重力加速度 (m/s²)，默认 9.8 */
  readonly gravity?: number;
}

/** 打点计时器约束 — 必修一 第一章 实验 (研究匀变速直线运动) */
export interface TickerTimerConstraint {
  /** 打点频率 (Hz)，默认 50 */
  readonly frequency?: number;
  /** 加速度 (m/s²)，默认 2 */
  readonly acceleration?: number;
  /** 摩擦系数 (无单位，可选) */
  readonly frictionCoefficient?: number;
  /** 初速度 (m/s)，默认 0 */
  readonly initialVelocity?: number;
}

/** 测反应时间约束 — 自由落体法 (互动实验) */
export interface ReactionTimeConstraint {
  /** 尺子下落距离 (m), 默认 0.2 */
  readonly distance: number;
  /** 重力加速度 (m/s²), 默认 9.8 */
  readonly gravity?: number;
}

/** 伽利略斜面理想实验演示模式 */
export type GalileoInclineMode = 'single' | 'docked' | 'horizontal' | 'all';

/**
 * 伽利略斜面理想实验约束 — 必修一 第四章 牛顿第一定律引入实验.
 *
 * 物理原理 ("冲淡重力" 理想实验):
 *   - 沿斜面分力: F∥ = mg·sinθ → a = g·sinθ
 *   - 斜面位移:   x(t) = ½·g·sinθ·t²
 *   - 外推逻辑:   θ→90° 时 a→g, 变为自由落体
 *
 * 三段推理:
 *   1. 冲淡重力 — 小 θ 延长运动时间, 便于测量
 *   2. 对接斜面 — 小球滚下后滚上对接斜面, 回到原来高度 (能量守恒)
 *   3. 水平面外推 — 无摩擦水平面, 永远匀速运动 (牛顿第一定律)
 */
export interface GalileoInclineConstraint {
  /** 斜面倾角 θ (度) */
  readonly angleDeg: number;
  /** 重力加速度 (m/s²), 默认 9.8 */
  readonly gravity?: number;
  /** 斜面长度 (m), 默认 2 */
  readonly inclineLength?: number;
  /** 演示模式: single / docked / horizontal / all */
  readonly mode?: GalileoInclineMode;
}

/** 光杠杆微小形变约束 — 选必一 §5 (演示桌面微小形变) */
export interface MicroDeformationConstraint {
  /** 激光到镜面距离 m，默认 1 */
  readonly laserDist?: number;
  /** 镜面到投影屏距离 m，默认 5 */
  readonly mirrorDist?: number;
  /** 桌面压力 N，默认 100 */
  readonly pressure?: number;
  /** 桌面杨氏模量 Pa，默认 1e10 (木材量级) */
  readonly youngModulus?: number;
  /** 桌面厚度 m，默认 0.05 */
  readonly thickness?: number;
  /** 桌面长度 m，默认 1 */
  readonly tableLength?: number;
}

/**
 * 悬挂法确定重心约束 — 二力平衡原理 (必修一 §3 拓展实验)
 *
 * 悬挂静止时, 重力作用线必过悬挂点; 两次不同悬挂点的悬挂线延长线交点 = 重心。
 * 重心 = 多边形形心 (均匀密度)。
 */
export interface CenterOfGravityConstraint {
  /** 多边形顶点 (均匀密度, 逆时针或顺时针顺序均可) */
  readonly vertices: ReadonlyArray<Vector2D>;
  /** 第一次悬挂点索引, 默认 0 */
  readonly suspensionIndex1?: number;
  /** 第二次悬挂点索引, 默认 vertices.length-1 */
  readonly suspensionIndex2?: number;
}

/** 惯性演示模式 */
export type InertiaMode = 'stroke' | 'stop' | 'smoothPull';

/** 惯性实验约束 — 必修一 第四章 牛顿第一定律 (牛顿第一定律 — 惯性) */
export interface InertiaConstraint {
  /** 质量比 m_top/m_bottom, 默认 0.1 */
  readonly massRatio?: number;
  /** 初速度 (m/s), 默认 2 */
  readonly initialSpeed?: number;
  /** 演示模式: stroke(棋子打击) / stop(小车急停) / smoothPull(纸板弹出) */
  readonly mode: InertiaMode;
  /** 摩擦系数, 默认 0.3 */
  readonly frictionCoeff?: number;
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
  readonly newtonSecondLaw?: NewtonSecondLawConstraint;
  readonly projectile?: ProjectileConstraint;
  readonly orbital?: OrbitalConstraint;
  readonly momentum?: MomentumConstraint;
  readonly simplePendulum?: SimplePendulumConstraint;
  readonly wave?: WaveConstraint;
  readonly refraction?: RefractionConstraint;
  readonly interference?: InterferenceConstraint;
  readonly circuit?: CircuitConstraint;
  readonly gasLaw?: GasLawConstraint;
  readonly photoelectric?: PhotoelectricConstraint;
  readonly bohr?: BohrModelConstraint;
  readonly radioactive?: RadioactiveDecayConstraint;
  readonly magneticForce?: MagneticForceConstraint;
  readonly emInduction?: EMInductionConstraint;
  readonly ac?: ACCurrentConstraint;
  readonly lc?: LCOscillatorConstraint;
  readonly tickerTimer?: TickerTimerConstraint;
  /** 必修一 第四章 伽利略斜面理想实验 */
  readonly galileoIncline?: GalileoInclineConstraint;
  readonly inertia?: InertiaConstraint;
  readonly microDeformation?: MicroDeformationConstraint;
  readonly reactionTime?: ReactionTimeConstraint;
  readonly overweight?: OverweightConstraint;
  /** 悬挂法确定重心 */
  readonly centerOfGravity?: CenterOfGravityConstraint;
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

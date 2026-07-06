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
  | 'curve-velocity-direction' // 曲线运动速度方向 (切线方向)
  | 'curve-condition'        // 曲线运动条件 (合力与速度共线/不共线)
  | 'motion-composition'     // 运动合成分解 (蜡块实验: 水平匀速 + 竖直匀加速)
  // 必修二 第二章 圆周运动
  | 'transmission-belt'      // 几种传动方式 (皮带/齿轮/摩擦轮/同轴)
  | 'vertical-circle'        // 竖直圆周最高点条件 (绳/杆/圆环)
  | 'centrifugal'            // 离心现象 (F_实 < m·ω²·r)
  // 必修二 第三章 万有引力与航天
  | 'orbital'                // 万有引力轨道运动
  | 'cavendish'              // 卡文迪什扭秤 (测 G)
  | 'moon-earth-test'        // 月地检验 (a_月 = g/3600)
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
  | 'capacitor-charge'       // 电容充放电 (RC 暂态电路)
  | 'parallel-plate-capacitor' // 平行板电容器因素 (C=εr·S/(4πkd))
  | 'resistance-law'         // 电阻定律 (R=ρ·L/S)
  | 'load-voltage'           // 路端电压与负载 (U=E−Ir)
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
  // 选必三 §1 分子动理论
  | 'diffusion'              // 扩散现象
  | 'brownian-motion'        // 布朗运动
  | 'molecular-force'       // 分子间作用力 (Lennard-Jones)
  | 'liquid-mixing'         // 酒精与水混合
  | 'oil-film'              // 油膜法测分子大小
  // 选必三 §2 气体/固体/液体
  | 'melting-curve'          // 晶体熔化
  | 'surface-tension'       // 表面张力
  | 'capillary'              // 毛细现象
  | 'wetting'               // 浸润与不浸润
  | 'liquid-crystal'         // 液晶
  // 选必三 §3 热力学定律
  | 'joule-mechanical'       // 焦耳热功当量 (机械法)
  | 'joule-electrical'       // 焦耳热功当量 (电学法)
  | 'adiabatic-compression'  // 压缩点火
  | 'heat-transfer'          // 热传递三方式
  | 'energy-transformation'  // 能量守恒与转化
  | 'perpetuum-mobile'       // 卡诺循环/第二定律
  // 选必三 §4 原子物理
  | 'black-body'             // 黑体辐射
  // 选必三 §5 原子核
  | 'radioactive-decay'      // 放射性衰变
  | 'heat-direction'         // 热传导方向性
  | 'alpha-scattering'       // α 粒子散射
  | 'electron-diffraction'   // 电子衍射
  | 'radiation-deflection'   // 放射线磁场偏转
  | 'decay-statistics'       // 衰变统计规律
  | 'cosmic-ray'             // 宇宙射线
  | 'neutron-discovery'      // 中子发现
  | 'fission-chain'          // 核裂变链式反应
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
  | 'center-of-gravity'    // 悬挂法确定均匀薄板重心
  // 必修三 实验: 测量仪器读数练习
  | 'vernier-caliper'          // 游标卡尺读数
  | 'micrometer'               // 螺旋测微器读数
  | 'multimeter'               // 多用电表使用
  // 必修三 第十二章 安培力因素实验
  | 'ampere-force'             // 安培力因素 (F = BIL·sinθ)
  // 必修三 第十三章 赫兹电磁波实验
  | 'em-wave-hertz'           // 赫兹电磁波实验
  // 必修三 第十二章 静电感应 / 验电器 / 电荷间作用力 / 静电屏蔽 / 法拉第圆筒
  | 'electrostatic-induction'    // 静电感应 (感应电荷分布 + 箔片张角)
  | 'electroscope'               // 验电器 (箔片张角 vs 电荷量)
  | 'coulomb-force-explore'      // 探究电荷间作用力 (F=k·|q₁q₂|/r²)
  | 'electrostatic-shielding'    // 静电屏蔽 (接地 vs 不接地 E=0)
  | 'faraday-cup'              // 法拉第圆筒 (内表面电荷=0)
  // 选必一 第一章 实验: 平抛验证动量守恒
  | 'projectile-collision'     // 平抛等时性 + 动量守恒 m1*OP = m1*OM + m2*ON
  // 选必一 第二章 振动: 双单摆步调 / 受迫振动 / 共振
  | 'double-pendulum'          // 两个单摆振动步调 (同相/反相)
  | 'forced-vibration'         // 受迫振动 (稳态频率 = 驱动频率)
  | 'resonance'                // 共振曲线 (A-f, 不同阻尼)
  // 选必一 第三章 波
  | 'sound-waveform'           // 声音时域波形
  | 'water-diffraction'        // 水波衍射
  | 'sound-interference'       // 声音干涉 (两相干声源)
  | 'doppler'                  // 多普勒效应
  // 选必一 第四章 光
  | 'thin-film'                // 薄膜干涉 (等厚/增透/增反)
  | 'hologram'                 // 全息照片
  | 'single-slit'              // 单缝衍射
  | 'diffraction-grating'      // 光栅衍射
  | 'polarization'             // 偏振光 (马吕斯定律)
  // 选必二 电路与电磁感应 (F1-F5)
  | 'current-balance'          // 电流天平 m*g=nBIl
  | 'eddy-current'             // 涡流现象
  | 'em-damping'               // 电磁阻尼/驱动
  | 'mutual-inductance'        // 互感现象
  | 'self-inductance'          // 自感现象
  // 选必二 电磁波与传感器 (F6-F14)
  | 'em-wave-communication'    // 电磁波发射接收
  | 'em-spectrum'              // 电磁波谱
  | 'hall-effect'              // 霍尔元件
  | 'reed-switch'              // 干簧管
  | 'thermistor'               // 热敏电阻
  | 'photoresistor'            // 光敏电阻
  | 'strain-gauge'             // 电阻应变片
  | 'security-alarm'           // 门窗防盗报警
  | 'light-control-switch'     // 光控开关
  ;

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

/** 曲线运动速度方向轨道形状 — 必修二 §1 (曲线运动速度方向沿切线) */
export type CurveTrackShape = 'circle' | 'parabola' | 'spiral';

/**
 * 曲线运动速度方向约束 — 必修二 §1
 *
 * 物理: 质点做曲线运动时, 在某点的速度方向沿曲线在该点的切线方向。
 * 模型从不同 "脱离点" (releaseIndex) 出发, 以切向速度脱离轨道做直线运动,
 * 用于对比展示 "切线方向即速度方向"。
 *
 *   - circle: x = R·cos(ω·t), y = R·sin(ω·t), v_切向 = ω·R
 *   - parabola: x = x₀ + v₀·t, y = k·(x₀ + v₀·t)², v 沿切线方向
 *   - spiral: r(t) = r₀ + b·ω·t, θ(t) = ω·t (阿基米德螺线)
 */
export interface CurveVelocityConstraint {
  /** 轨道形状 */
  readonly trackShape: CurveTrackShape;
  /** 角速度 ω (rad/s), 用于圆周/螺线缩放. 抛体时理解为 "切向速率"(m/s) */
  readonly angularSpeed: number;
  /** 采样点数量 (生成 3-5 条不同脱离点轨迹), 默认 5 */
  readonly sampleCount?: number;
  /** 默认释放时间段 [0,T] 内每个释放点所对应的时间长度 (s), 默认 2 */
  readonly releaseDuration?: number;
  /** 发射半径 R (m) (circle | spiral), 默认 2 */
  readonly radius?: number;
  /** 螺线增长系数 b (spiral), 每弧度增加半径 m, 默认 0.5 */
  readonly spiralGrowth?: number;
  /** 抛物线系数 k (1/m), 默认 0.5 */
  readonly parabolaK?: number;
  /** 基础切向速率 (m/s), 用于抛物线/螺线初始切向速度, 默认取 angularSpeed */
  readonly initialSpeed?: number;
}

/**
 * 曲线运动条件约束 — 必修二 §1
 *
 * 物理: 当合力 F 与速度 v 不共线时, 物体做曲线运动；
 *       共线时做直线运动 (同向匀加速 / 反向匀减速)；
 *       当 F ⊥ v 且 F 大小不变时, 物体做匀速圆周运动 (仅理论演示)。
 *
 * 默认: 质点从原点以 v₀ = (initialSpeed, 0) 出发,
 *       受恒力 F 沿 forceDirectionDeg 方向 (°, 相对 +x), 质量 m。
 *       x(t) = v₀·t + ½·(F/m)·cosθ·t²
 *       y(t) = ½·(F/m)·sinθ·t²
 *       vx(t) = v₀ + (F/m)·cosθ·t
 *       vy(t) = (F/m)·sinθ·t
 */
export interface CurveConditionConstraint {
  /** 合力方向角 (°, 相对 +x 轴), 0=右, 90=上 */
  readonly forceDirectionDeg: number;
  /** 初速度大小 (m/s), 沿 +x */
  readonly initialSpeed: number;
  /** 质量 (kg) */
  readonly mass: number;
  /** 合力大小 (N), 默认 10 */
  readonly forceMagnitude?: number;
}

/**
 * 运动合成分解约束 — 必修二 §1 (蜡块实验)
 *
 * 物理: (1) 水平方向匀速: x = vxConst · t
 *       (2) 竖直方向匀加速: y = ½ · vyAccel · t²
 *       (3) 合速度 v_合 = √(vx² + vy²),  tanθ = vy / vx
 *
 * 曲线运动轨迹 (抛物线): y = (vyAccel / (2·vxConst²)) · x²
 */
export interface MotionCompositionConstraint {
  /** 水平方向匀速速度 vx (m/s) */
  readonly vxConst: number;
  /** 竖直方向匀加速度 a_y (m/s²) */
  readonly vyAccel: number;
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

/**
 * 卡文迪什扭秤约束 — 必修二 §3 实验 (测 G)
 *
 * 三次"放大":
 *   1. 力矩放大: τ = F·L (L = 悬丝到小球距离，即半臂长)
 *   2. 扭转放大: θ = τ/k (k = 扭转常数)
 *   3. 光杠杆放大: Δspot = 2·D·θ (D = 镜面到投影屏距离)
 *
 * 引力: F = G·m₁·m₂/r²
 */
export interface CavendishConstraint {
  /** 大球质量 m₁ (kg), 默认 500 */
  readonly m1: number;
  /** 小球质量 m₂ (kg), 默认 1 */
  readonly m2: number;
  /** 大小球球心距离 r (m), 默认 0.1 */
  readonly distance: number;
  /** (可选) 悬丝到小球距离 (半臂长) L (m), 默认 1 — 用于力矩, 若不传按 m1>>m2 简化 */
  readonly armLength?: number;
  /** 扭转常数 k (N·m/rad), 默认 1e-8 */
  readonly torsionConst: number;
  /** 镜面到投影屏距离 D (m), 默认 5 */
  readonly mirrorDist: number;
}

/**
 * 月地检验约束 — 必修二 §3
 *
 * 牛顿猜想: 月球绕地球运动的加速度 a_月 = ω²·r_月 = 4π²·r/T²
 * 应与地面重力加速度 g 满足平方反比律:
 *   a_月 / g = (R_地 / r_月)² = (1/60)² = 1/3600 ≈ 2.78×10⁻⁴
 *
 * 理论: a_月 = g/3600 ≈ 2.72×10⁻³ m/s²
 */
export interface MoonEarthTestConstraint {
  /** 地球半径 R (m), 默认 6.371×10⁶ */
  readonly earthRadius: number;
  /** 地月距离 r (m), 默认 3.844×10⁸ */
  readonly moonDistance: number;
  /** 月球公转周期 T (s), 默认 27.3·86400 */
  readonly moonPeriod: number;
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

/**
 * RC 暂态 (电容充放电) 约束 — 必修三 第十一章
 *
 * 充电:
 *   U_c(t) = E·(1 − e^(−t/τ)),  I(t) = (E/R)·e^(−t/τ),  Q(t) = CE·(1−e^(−t/τ))
 * 放电 (U_c 从 E 开始):
 *   U_c(t) = E·e^(−t/τ),       I(t) = −(E/R)·e^(−t/τ),     ln U_c = ln E − t/τ
 * 时间常数 τ = RC
 */
export interface CapacitorConstraint {
  /** 电阻 (Ω) */
  readonly resistance: number;
  /** 电容 (F) */
  readonly capacitance: number;
  /** 电源电动势 (V) (充电) / 初始电压 (放电) */
  readonly emf: number;
  /** 'charge' (从 0 充电到 E) 或 'discharge' (从 E 放电到 0) */
  readonly mode: 'charge' | 'discharge';
  /** 采样点数, 默认 120 */
  readonly sampleCount?: number;
  /** 时间跨度上限 (单位 τ 的倍数), 默认 5 → 0~5τ */
  readonly timeSpanTau?: number;
}

/**
 * 平行板电容器因素约束 — 必修三 第十一章
 *
 * 电容决定式: C = εr·S / (4π·k·d) = εr·ε₀·S/d
 * 三个控制变量实验: C vs 1/d (线性), C vs S (线性), C vs εr (线性)
 */
export interface ParallelPlateConstraint {
  /** 极板面积 (m²) — 基准面积, 改变 d/εr 时固定 */
  readonly area: number;
  /** 极板距离 (m) — 基准距离, 改变 S/εr 时固定 */
  readonly distance: number;
  /** 相对介电常数 εr — 基准介电常数, 改变 S/d 时固定 */
  readonly epsilonR: number;
  /** 扫描采样点数 (每个维度), 默认 60 */
  readonly sampleCount?: number;
  /** 极板距离扫描范围 [d_min, d_max] (m), 默认 [1e-4, 8e-4] */
  readonly distanceRange?: [number, number];
  /** 极板面积扫描范围 [S_min, S_max] (m²), 默认 [1e-3, 5e-2] */
  readonly areaRange?: [number, number];
  /** 相对介电常数扫描范围 [εr_min, εr_max], 默认 [1, 10] */
  readonly epsilonRange?: [number, number];
}

/** 电阻材料类型 — 必修三 第十一章 */
export type ResistanceMaterial = 'Cu' | 'Fe' | 'Nichrome';

/**
 * 材料电阻率 (Ω·m) — 必修三 第十一章 (20°C 左右参考值)
 *   Cu ≈ 1.68×10⁻⁸ Ω·m     (铜)
 *   Fe ≈ 1.0×10⁻⁷ Ω·m      (铁)
 *   Nichrome ≈ 1.1×10⁻⁶ Ω·m (镍铬合金)
 */
export const RESISTIVITY: Record<ResistanceMaterial, number> = {
  Cu: 1.68e-8,
  Fe: 1.0e-7,
  Nichrome: 1.1e-6,
};

/**
 * 电阻定律约束 — 必修三 第十一章
 *
 * R = ρ·L/S, S = π·(d/2)²  (d 需换算为 m)
 * 三因素扫描: R-L (线性), R-1/S (线性), 材料比较 (Cu/Fe/Nichrome)
 */
export interface ResistanceLawConstraint {
  /** 导线长度 (m) — 基准长度 */
  readonly length: number;
  /** 导线直径 (mm) — 基准直径 (内部换算为 m) */
  readonly diameter: number;
  /** 材料 */
  readonly material: ResistanceMaterial;
  /** 长度扫描范围 [L_min, L_max] (m), 默认 [0.2, 5] */
  readonly lengthRange?: [number, number];
  /** 直径扫描范围 [d_min, d_max] (mm), 默认 [0.5, 5] */
  readonly diameterRange?: [number, number];
  /** 采样点数 (每个维度), 默认 60 */
  readonly sampleCount?: number;
}

/**
 * 路端电压与负载约束 — 必修三 第十一章 (闭合电路欧姆定律)
 *
 * U = E·R/(R+r)  (U-R 曲线):  R=0 → 0, R→∞ → E
 * U = E − I·r   (U-I 直线):  截距=E, 斜率=−r
 * 可由 U-I 数据线性拟合反推 E_exp, r_exp, 与输入参数比较验证
 */
export interface LoadVoltageConstraint {
  /** 电动势 (V) */
  readonly emf: number;
  /** 内阻 (Ω) */
  readonly internalResistance: number;
  /** 负载电阻扫描范围 (Ω) [R_min, R_max] */
  readonly loadRange: [number, number];
  /** 采样点数, 默认 60 */
  readonly sampleCount?: number;
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

/**
 * 传动约束 — 必修二 §2 (几种传动方式)
 *
 * 皮带/摩擦轮边缘: v = ω·r (两轮边缘线速度等大)
 * 齿轮: ω₁·r₁ = ω₂·r₂ (转向相反)
 * 同轴: ω 等大
 */
export interface TransmissionConstraint {
  /** 传动模式: belt 皮带 | gear 齿轮 | friction 摩擦轮 | coax 同轴 */
  readonly mode: 'belt' | 'gear' | 'friction' | 'coax';
  /** 主动轮半径 (m) */
  readonly r1: number;
  /** 从动轮半径 (m) */
  readonly r2: number;
  /** 主动轮角速度 (rad/s) */
  readonly omega1: number;
  /** 主动轮中心坐标 (用于静态演示) */
  readonly center1?: Vector2D;
  /** 从动轮中心坐标 (用于静态演示) */
  readonly center2?: Vector2D;
}

/**
 * 竖直圆周约束 — 必修二 §2 (竖直圆周最高点条件)
 *
 * 绳模型: 最高点 T=0 即 mg=mv²/r → v_min = √(gr) (只能提供拉力)
 * 杆模型: v_min = 0 (可提供拉力与支持力)
 * 圆环模型: 与绳类似 (内侧只能提供"指向圆心的单侧约束")
 */
export interface VerticalCircleConstraint {
  /** 绳/杆长 (即圆周半径 r) */
  readonly length: number;
  /** 物体质量 (kg) */
  readonly mass: number;
  /** 约束类型: rope 绳 | rod 杆 | ring 圆环 */
  readonly modelType: 'rope' | 'rod' | 'ring';
  /** 最低点初速度 (m/s) — 由此推导最高点速度 (机械能守恒) */
  readonly initialSpeed: number;
  /** 可覆盖默认重力加速度 (m/s²) */
  readonly gravity?: number;
  /** 圆心坐标 (用于静态演示) */
  readonly center?: Vector2D;
}

/**
 * 离心现象约束 — 必修二 §2 (离心运动)
 *
 * 物体在转盘上做圆周运动所需向心力: F_需 = m·ω²·r
 * 实际能提供的最大静摩擦力: F_实,max = μ·m·g
 * 当 F_需 > F_实,max 时物体做离心运动 (惯性驱使维持原速度方向)
 */
export interface CentrifugalConstraint {
  /** 物块质量 (kg) */
  readonly mass: number;
  /** 物块所在旋转半径 (m) */
  readonly radius: number;
  /** 转盘角速度 ω (rad/s) */
  readonly angularSpeed: number;
  /** 物块与转盘间静摩擦系数 */
  readonly frictionCoeff: number;
  /** 可覆盖默认重力加速度 (m/s²) */
  readonly gravity?: number;
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
  /** 曲线运动速度方向约束 — 必修二 §1 (沿切线方向) */
  readonly curveVelocity?: CurveVelocityConstraint;
  /** 曲线运动条件约束 — 必修二 §1 (合力与速度共线/不共线) */
  readonly curveCondition?: CurveConditionConstraint;
  /** 运动合成分解约束 — 必修二 §1 (蜡块实验) */
  readonly motionComposition?: MotionCompositionConstraint;
  readonly orbital?: OrbitalConstraint;
  readonly cavendish?: CavendishConstraint;
  readonly moonEarthTest?: MoonEarthTestConstraint;
  readonly momentum?: MomentumConstraint;
  readonly simplePendulum?: SimplePendulumConstraint;
  readonly wave?: WaveConstraint;
  readonly refraction?: RefractionConstraint;
  readonly interference?: InterferenceConstraint;
  readonly circuit?: CircuitConstraint;
  /** RC 暂态 (电容充放电) — 必修三 §11 */
  readonly capacitor?: CapacitorConstraint;
  /** 平行板电容器因素 — 必修三 §11 (C=εr·S/(4πkd)) */
  readonly parallelPlate?: ParallelPlateConstraint;
  /** 电阻定律 — 必修三 §11 (R=ρ·L/S) */
  readonly resistanceLaw?: ResistanceLawConstraint;
  /** 路端电压与负载 — 必修三 §11 (U=E−Ir) */
  readonly loadVoltage?: LoadVoltageConstraint;
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
  /** 传动约束 — 必修二 §2 (皮带/齿轮/摩擦轮/同轴) */
  readonly transmission?: TransmissionConstraint;
  /** 竖直圆周约束 — 必修二 §2 (绳/杆/圆环) */
  readonly verticalCircle?: VerticalCircleConstraint;
  /** 离心现象约束 — 必修二 §2 (F_实 < m·ω²·r) */
  readonly centrifugal?: CentrifugalConstraint;
  /** 游标卡尺读数约束 — 必修三 实验 */
  readonly vernierCaliper?: VernierCaliperConstraint;
  /** 螺旋测微器读数约束 — 必修三 实验 */
  readonly micrometer?: MicrometerConstraint;
  /** 多用电表使用约束 — 必修三 实验 */
  readonly multimeter?: MultimeterConstraint;
  /** 安培力因素约束 — 必修三 §12 (F = BIL·sinθ) */
  readonly ampereForce?: AmpereForceConstraint;
  /** 赫兹电磁波实验约束 — 必修三 §13 */
  readonly hertzExperiment?: HertzExperimentConstraint;
  /** 静电感应约束 — 必修三 第十二章 */
  readonly electrostaticInduction?: ElectrostaticInductionConstraint;
  /** 验电器约束 — 必修三 第十二章 */
  readonly electroscope?: ElectroscopeConstraint;
  /** 探究电荷间作用力约束 — 必修三 第十二章 */
  readonly coulombForce?: CoulombForceConstraint;
  /** 静电屏蔽约束 — 必修三 第十二章 */
  readonly electrostaticShielding?: ElectrostaticShieldingConstraint;
  /** 法拉第圆筒约束 — 必修三 第十二章 */
  readonly faradayCup?: FaradayCupConstraint;
  /** 平抛验证动量守恒约束 — 选必一 第一章 实验 */
  readonly projectileCollision?: ProjectileCollisionConstraint;
  /** 双单摆步调约束 — 选必一 第二章 */
  readonly doublePendulum?: DoublePendulumConstraint;
  /** 受迫振动约束 — 选必一 第二章 */
  readonly forcedVibration?: ForcedVibrationConstraint;
  /** 共振曲线约束 — 选必一 第二章 */
  readonly resonance?: ResonanceConstraint;
  /** 声音波形约束 — 选必一 第三章 */
  readonly soundWaveform?: SoundWaveformConstraint;
  /** 水波衍射约束 — 选必一 第三章 */
  readonly waterDiffraction?: WaterDiffractionConstraint;
  /** 声音干涉约束 — 选必一 第三章 */
  readonly soundInterference?: SoundInterferenceConstraint;
  /** 多普勒效应约束 — 选必一 第三章 */
  readonly doppler?: DopplerConstraint;
  /** 薄膜干涉约束 — 选必一 第四章 */
  readonly thinFilm?: ThinFilmConstraint;
  /** 全息照片约束 — 选必一 第四章 */
  readonly hologram?: HologramConstraint;
  /** 单缝衍射约束 — 选必一 第四章 */
  readonly singleSlit?: SingleSlitConstraint;
  /** 光栅衍射约束 — 选必一 第四章 */
  readonly diffractionGrating?: DiffractionGratingConstraint;
  /** 偏振光约束 — 选必一 第四章 */
  readonly polarization?: PolarizationConstraint;
  /** 电流天平约束 — 选必二 */
  readonly currentBalance?: CurrentBalanceConstraint;
  /** 涡流现象约束 — 选必二 */
  readonly eddyCurrent?: EddyCurrentConstraint;
  /** 电磁阻尼/驱动约束 — 选必二 */
  readonly emDamping?: EMDampingConstraint;
  /** 互感现象约束 — 选必二 */
  readonly mutualInductance?: MutualInductanceConstraint;
  /** 自感现象约束 — 选必二 */
  readonly selfInductance?: SelfInductanceConstraint;
  // === Constraints for F & G stage models (types defined in respective model files) ===
  readonly emWaveComm?: EMWaveCommConstraint;
  readonly emSpectrum?: EMSpectrumConstraint;
  readonly hallEffect?: HallEffectConstraint;
  readonly reedSwitch?: ReedSwitchConstraint;
  readonly photoresistor?: PhotoresistorConstraint;
  readonly thermistor?: ThermistorConstraint;
  readonly strainGauge?: StrainGaugeConstraint;
  readonly securityAlarm?: SecurityAlarmConstraint;
  readonly lightControlSwitch?: LightControlSwitchConstraint;
  readonly diffusion?: DiffusionConstraint;
  readonly brownianMotion?: BrownianMotionConstraint;
  readonly molecularForce?: MolecularForceConstraint;
  readonly liquidMixing?: LiquidMixingConstraint;
  readonly oilFilm?: OilFilmConstraint;
  readonly meltingCurve?: MeltingCurveConstraint;
  readonly surfaceTension?: SurfaceTensionConstraint;
  readonly capillary?: CapillaryConstraint;
  readonly wetting?: WettingConstraint;
  readonly liquidCrystal?: LiquidCrystalConstraint;
  readonly jouleMechanical?: JouleMechanicalConstraint;
  readonly jouleElectrical?: JouleElectricalConstraint;
  readonly adiabaticCompression?: AdiabaticCompressionConstraint;
  readonly heatTransfer?: HeatTransferConstraint;
  readonly energyTransformation?: EnergyTransformationConstraint;
  readonly perpetuumMobile?: PerpetuumMobileConstraint;
  readonly blackBody?: BlackBodyConstraint;
  readonly heatDirection?: HeatDirectionConstraint;
  readonly alphaScattering?: AlphaScatteringConstraint;
  readonly electronDiffraction?: ElectronDiffractionConstraint;
  readonly radiationDeflection?: RadiationDeflectionConstraint;
  readonly decayStatistics?: DecayStatisticsConstraint;
  readonly cosmicRay?: CosmicRayConstraint;
  readonly neutronDiscovery?: NeutronDiscoveryConstraint;
  readonly fissionChain?: FissionChainConstraint;
}

/** 电流天平约束 — 选必二 (m*g = n*BIl) */
export interface CurrentBalanceConstraint {
  readonly wireLen: number;
  readonly turns: number;
  readonly mass: number;
  readonly current: number;
  readonly magneticField: number;
  readonly armLen?: number;
  readonly gravity?: number;
}

/** 涡流现象约束 — 选必二 (P = pi^2*B^2*f^2*d^2*V/(6*rho)) */
export interface EddyCurrentConstraint {
  readonly magneticField: number;
  readonly frequency: number;
  readonly conductivity: number;
  readonly thickness: number;
  readonly area?: number;
  readonly muR?: number;
  readonly resistivity?: number;
}

/** 电磁阻尼/驱动约束 — 选必二 */
export interface EMDampingConstraint {
  readonly mode: 'damping' | 'drive';
  readonly magneticField: number;
  readonly angularSpeed: number;
  readonly conductivity: number;
  readonly inertia: number;
  readonly radius?: number;
  readonly thickness?: number;
}

/** 互感现象约束 — 选必二 (M = k*sqrt(L1*L2), E2 = -M*dI1/dt) */
export interface MutualInductanceConstraint {
  readonly L1: number;
  readonly L2: number;
  readonly coupling: number;
  readonly frequency: number;
  readonly primaryCurrent: number;
}

/** 自感现象约束 — 选必二 (E = -L*dI/dt) */
export interface SelfInductanceConstraint {
  readonly inductance: number;
  readonly resistance: number;
  readonly emf: number;
  readonly mode: 'turnOn' | 'turnOff';
}


/** 平抛验证动量守恒约束 — 选必一 第一章 实验 */
export interface ProjectileCollisionConstraint {
  /** 入射球质量 m1 (kg) */
  readonly m1: number;
  /** 被撞球质量 m2 (kg) */
  readonly m2: number;
  /** 入射球碰前速度 (m/s) */
  readonly v1Initial: number;
  /** 实验台高度 (m) */
  readonly tableHeight: number;
  /** 弹性系数 e (0=完全非弹性, 1=完全弹性), 默认 1 */
  readonly restitution?: number;
  /** 重力加速度 (m/s^2), 默认 9.8 */
  readonly gravity?: number;
}

/** 双单摆步调约束 — 选必一 第二章 */
export interface DoublePendulumConstraint {
  /** 摆1摆长 L1 (m) */
  readonly length1: number;
  /** 摆2摆长 L2 (m) */
  readonly length2: number;
  /** 摆1初始角 (度) */
  readonly initialAngle1: number;
  /** 摆2初始角 (度) */
  readonly initialAngle2: number;
  /** 两摆相位差 phi2-phi1 (度), 0=同相, 180=反相 */
  readonly phaseDiff: number;
  /** 重力加速度 (m/s^2), 默认 9.8 */
  readonly gravity?: number;
}

/** 受迫振动约束 — 选必一 第二章 */
export interface ForcedVibrationConstraint {
  /** 振子质量 m (kg) */
  readonly mass: number;
  /** 弹簧劲度系数 k (N/m) */
  readonly springConstant: number;
  /** 阻尼系数 beta = c/(2m) (1/s) */
  readonly dampingBeta: number;
  /** 驱动力幅值 F0 (N) */
  readonly forceAmplitude: number;
  /** 驱动频率 (Hz) */
  readonly drivingFreq: number;
}

/** 共振曲线约束 — 选必一 第二章 */
export interface ResonanceConstraint {
  /** 振子质量 m (kg) */
  readonly mass: number;
  /** 弹簧劲度系数 k (N/m) */
  readonly springConstant: number;
  /** 驱动力幅值 F0 (N) */
  readonly forceAmplitude: number;
  /** 阻尼系数数组 (1/s), 用于多曲线对比 */
  readonly dampingBetas: number[];
  /** 频率扫描下限 (Hz) */
  readonly freqMin: number;
  /** 频率扫描上限 (Hz) */
  readonly freqMax: number;
}

/** 声音波形约束 — 选必一 第三章 */
export interface SoundWaveformConstraint {
  /** 基频 (Hz) */
  readonly frequency: number;
  /** 振幅 (相对值 0-1) */
  readonly amplitude: number;
  /** 波形类型: pure(纯音)/complex(复合)/noise(噪声) */
  readonly waveType: 'pure' | 'complex' | 'noise';
  /** 谐波数组 (仅 complex 模式) */
  readonly harmonics?: number[];
}

/** 水波衍射约束 — 选必一 第三章 */
export interface WaterDiffractionConstraint {
  /** 水波波长 (cm) */
  readonly wavelength: number;
  /** 狭缝宽度 a (cm) */
  readonly slitWidth: number;
  /** 缝到挡板距离 L (cm) */
  readonly screenDist: number;
  /** 入射波振幅 (cm) */
  readonly waveAmplitude: number;
}

/** 声音干涉约束 — 选必一 第三章 */
export interface SoundInterferenceConstraint {
  /** 声波频率 (Hz) */
  readonly frequency: number;
  /** 两扬声器距离 d (m) */
  readonly speakerDist: number;
  /** 声速 v (m/s) */
  readonly soundSpeed: number;
  /** 单个声源振幅 A0 */
  readonly amplitude: number;
  /** 观察点 x 坐标 (m, 沿两扬声器连线方向), 可选 */
  readonly observationX?: number;
  /** 观察点 y 坐标 (m, 垂直于连线方向), 可选 */
  readonly observationY?: number;
}

/** 多普勒效应约束 — 选必一 第三章 */
export interface DopplerConstraint {
  /** 声速 v (m/s) */
  readonly soundSpeed: number;
  /** 声源频率 f (Hz) */
  readonly sourceFreq: number;
  /** 声源速度 v_s (m/s) */
  readonly sourceSpeed: number;
  /** 声源运动方向与观察者连线夹角 theta (度), 0=朝向, 180=远离 */
  readonly directionAngle: number;
}

/** 薄膜干涉约束 — 选必一 第四章 */
export interface ThinFilmConstraint {
  /** 薄膜厚度 d (nm) */
  readonly thickness: number;
  /** 薄膜折射率 n */
  readonly refIndex: number;
  /** 入射光波长 lambda (nm) */
  readonly wavelength: number;
  /** 入射角 (度, 相对法线) */
  readonly incidentAngle: number;
  /** 基片折射率, 默认 1.5 */
  readonly substrateIndex?: number;
}

/** 全息照片约束 — 选必一 第四章 */
export interface HologramConstraint {
  /** 参考光与光轴夹角 theta_r (度) */
  readonly referenceAngle: number;
  /** 物光与光轴夹角 theta_o (度) */
  readonly objectAngle: number;
  /** 激光波长 (nm) */
  readonly wavelength: number;
  /** 参考光振幅 A_r */
  readonly referenceAmp: number;
  /** 物光振幅 A_o */
  readonly objectAmp: number;
  /** 全息干板宽度 (mm) */
  readonly recordWidth: number;
}

/** 单缝衍射约束 — 选必一 第四章 */
export interface SingleSlitConstraint {
  /** 缝宽 a (mm) */
  readonly slitWidth: number;
  /** 光波长 lambda (nm) */
  readonly wavelength: number;
  /** 缝到屏距离 L (m) */
  readonly screenDist: number;
}

/** 光栅衍射约束 — 选必一 第四章 */
export interface DiffractionGratingConstraint {
  /** 光栅常数 d (um) */
  readonly gratingConstant: number;
  /** 缝宽 a (um) */
  readonly slitWidth: number;
  /** 光波长 lambda (nm) */
  readonly wavelength: number;
  /** 最大衍射级次 k */
  readonly orderMax: number;
  /** 光栅总缝数 N */
  readonly slitCount: number;
}

/** 偏振光约束 — 选必一 第四章 */
export interface PolarizationConstraint {
  /** 入射光强 I_0 (相对值 0-1) */
  readonly initialIntensity: number;
  /** 偏振片数量 n */
  readonly nPolarizers: number;
  /** 各偏振片透振方向角度数组 (度), 长度=nPolarizers */
  readonly polarizerAngles: number[];
  /** 入射光偏振方向 (度) */
  readonly incidentAngle?: number;
}


/** 游标卡尺读数约束 — 必修三 实验 (L = 主尺 + K×1/N mm) */
export interface VernierCaliperConstraint {
  /** 被测物体实际长度 (mm) */
  readonly objectSize: number;
  /** 分度: 10 | 20 | 50 */
  readonly nType: 10 | 20 | 50;
  /** 随机偏移 (mm), 模拟读物时游标尺位置的微小变化 */
  readonly randomOffset?: number;
}

/** 螺旋测微器读数约束 — 必修三 实验 (L = a + b + n×0.01 mm) */
export interface MicrometerConstraint {
  /** 被测物体厚度 (mm) */
  readonly thickness: number;
  /** 随机角度 (0~360°), 模拟可动刻度的随机位置 */
  readonly randomAngle?: number;
}

/** 电表档位 */
export type MultimeterMode = 'DCV' | 'ACV' | 'Ohm' | 'DCA';

/** 多用电表使用约束 — 必修三 实验 */
export interface MultimeterConstraint {
  /** 档位: DCV(直流电压) | ACV(交流电压) | Ohm(欧姆) | DCA(直流电流) */
  readonly mode: MultimeterMode;
  /** 量程 (对应单位: V, Ω, A 等) */
  readonly range: number;
  /** 被测量值 (与量程同单位) */
  readonly testValue: number;
}

/** 安培力因素约束 — 必修三 §12 (F = BIL·sinθ) */
export interface AmpereForceConstraint {
  /** 磁感应强度 B (T) */
  readonly B: number;
  /** 电流 I (A) */
  readonly I: number;
  /** 导线有效长度 L (m) */
  readonly L: number;
  /** 导线与磁场夹角 (度) */
  readonly angle: number;
}

/** 赫兹电磁波实验约束 — 必修三 §13 */
export interface HertzExperimentConstraint {
  /** LC 振荡频率 (Hz) */
  readonly frequency: number;
  /** 线圈匝数 */
  readonly turns: number;
  /** 振子火花间隙 (mm) */
  readonly sparkGap: number;
  /** 接收端距离 (m) */
  readonly distance: number;
}

/**
 * 静电感应约束 — 必修三 第十二章
 *
 * 导体 A 在带电体 C 的电场中发生静电感应:
 *   近端 (右侧) 感应异号电荷 q_A_right = −k_ind·Q_C/(d_AC+s)²
 *   远端 (左侧) 感应同号电荷 q_A_left = +k_ind·Q_C/d_AC²
 *   A 整体中性: q_A_left + q_A_right ≈ 0 (感应的中和近似)
 *   箔片张角 θ ∝ |q_net_near| (近端电荷越大, 斥力越大)
 */
export interface ElectrostaticInductionConstraint {
  /** 带电体 C 电量 (μC) */
  readonly chargeC: number;
  /** A/B 间隙 (cm) */
  readonly separation: number;
  /** A 左端到 C 的距离 (cm) */
  readonly distanceAC: number;
  /** 张角比例系数 (默认 50) */
  readonly thetaK?: number;
  /** 采样点数量 (扫描不同 distanceAC 取值), 默认 30 */
  readonly sampleCount?: number;
}

/**
 * 验电器约束 — 必修三 第十二章
 *
 * 简化公式: 箔片张角 θ 与电荷量 q 的关系
 *   sin(θ/2) ≈ ½·k·q²/(m·g·L)
 *   (近似, 表示斥力与张角的关系)
 */
export interface ElectroscopeConstraint {
  /** 验电器带电量 (μC) */
  readonly charge: number;
  /** 箔片长度 (cm), 默认 5 */
  readonly foilLength?: number;
  /** 箔片质量 (g), 默认 1 */
  readonly foilMass?: number;
  /** 采样点数量 (0~charge), 默认 30 */
  readonly sampleCount?: number;
}

/**
 * 库仑力探究模式 */
export type CoulombForceMode = 'varyQ' | 'varyR';

/**
 * 探究电荷间作用力约束 — 必修三 第十二章
 *
 * F = k·|q₁q₂|/r²  (k=8.99e9 N·m²/C²)
 * mode=varyQ: 固定 r, F-q 直线
 * mode=varyR: 固定 q, F-1/r² 直线
 */
export interface CoulombForceConstraint {
  /** 电荷 1 电量 (μC) */
  readonly q1: number;
  /** 电荷 2 电量 (μC) */
  readonly q2: number;
  /** 两电荷间距 (cm) */
  readonly distance: number;
  /** 探究模式: 'varyQ' (控制 r, 改变 q) 或 'varyR' (控制 q, 改变 r) */
  readonly mode: CoulombForceMode;
  /** 扫描采样点数, 默认 30 */
  readonly sampleCount?: number;
  /** 电荷扫描范围 [q_min, q_max] (μC), 默认 [0.5, 5] */
  readonly qRange?: [number, number];
  /** 距离扫描范围 [r_min, r_max] (cm), 默认 [2, 20] */
  readonly rRange?: [number, number];
}

/**
 * 静电屏蔽约束 — 必修三 第十二章
 *
 * - 空腔导体内 E=0 (无论是否接地)
 * - 接地: 外部电场不影响内部, 箔片张角≈0
 * - 不接地: 外部电场在导体外表面感应电荷, 箔片张角 ∝ externalField
 */
export interface ElectrostaticShieldingConstraint {
  /** 是否接地 */
  readonly isGrounded: boolean;
  /** 外部电场强度 (V/m) */
  readonly externalField: number;
  /** 空腔内电荷 (μC), 默认 0 */
  readonly cavityCharge?: number;
  /** 采样点数量 (扫描 externalField), 默认 30 */
  readonly sampleCount?: number;
}

/**
 * 法拉第圆筒约束 — 必修三 第十二章
 *
 * 内表面电荷=0 (法拉第圆筒定律)
 * 外表面电荷=totalCharge
 * innerProbe 测量值 → 接触内表面 (理论为 0)
 * outerProbe 测量值 → 接触外表面 (理论为 totalCharge)
 */
export interface FaradayCupConstraint {
  /** 内探针深度 (0-1, 0=刚好内壁, 1=内腔深处); 默认 0 */
  readonly innerProbeDepth?: number;
  /** 外探针接触面深度 (0-1, 外表面处); 默认 1 */
  readonly outerProbeDepth?: number;
  /** 外表面总电量 (μC) */
  readonly totalCharge: number;
  /** 采样点数 (沿深度方向 0→1), 默认 30 */
  readonly sampleCount?: number;
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

// ============================================================
// F & G stage constraint interfaces
// (minimal declarations — full implementations live in model files)
// ============================================================

export interface EMWaveCommConstraint { carrierFreq: number; modulationType: string; audioFreq: number; }
export interface EMSpectrumConstraint { freqMin?: number; freqMax?: number; highlightBand?: string; }
export interface HallEffectConstraint { current: number; magneticField: number; chargeDensity: number; thickness: number; }
export interface ReedSwitchConstraint { mode: string; magnetDistance?: number; pullInThreshold?: number; releaseThreshold?: number; sampleCount?: number; }
export interface PhotoresistorConstraint { lightIntensity: number; darkResistance: number; sensitivity: number; }
export interface ThermistorConstraint { temperature: number; mode: string; R0: number; BValue: number; curieTemp?: number; ptcCoeff?: number; tempMin?: number; tempMax?: number; sampleCount?: number; }
export interface StrainGaugeConstraint { strain: number; gaugeFactor: number; bridgeVoltage: number; }
export interface SecurityAlarmConstraint { doorState: string; magnetDistance?: number; releaseDistance?: number; operateDistance?: number; sampleCount?: number; }
export interface LightControlSwitchConstraint { lightIntensity: number; threshold?: number; Rfix?: number; VbeOn?: number; Rdark?: number; Rbright?: number; timeSpanH?: number; sampleCount?: number; Esupply?: number; }

export interface DiffusionConstraint { temperature: number; mode: string; particleCount: number; diffusionCoeff?: number; gridSize?: number; timeSteps?: number; sampleCount?: number; }
export interface BrownianMotionConstraint { particleRadius: number; liquidTemp: number; fluidViscosity: number; duration: number; dt?: number; nParticles?: number; sampleCount?: number; }
export interface MolecularForceConstraint { epsilon: number; sigma: number; rMin?: number; rMax?: number; sampleCount?: number; }
export interface LiquidMixingConstraint { volumeWater: number; volumeAlcohol: number; }
export interface OilFilmConstraint { oilConcentration: number; dropsPerMl: number; filmArea: number; sampleCount?: number; drops?: number; }
export interface MeltingCurveConstraint { mode: string; meltingPoint: number; heatingRate: number; sampleCount?: number; initialTemp?: number; durationMin?: number; latentHeat?: number; }
export interface SurfaceTensionConstraint { liquidMode: string; sliderLength: number; temperature: number; }
export interface CapillaryConstraint { tubeRadius: number; liquidMode: string; materialMode: string; sampleCount?: number; }
export interface WettingConstraint { liquidMode: string; surfaceMode: string; }
export interface LiquidCrystalConstraint { temperature: number; voltage: number; mode: string; sampleCount?: number; thresholdVoltage?: number; pitchUm?: number; clearingPoint?: number; }
export interface JouleMechanicalConstraint { mass: number; height: number; drops: number; waterMass: number; specificHeat?: number; gravity?: number; }
export interface JouleElectricalConstraint { voltage: number; resistance: number; time: number; waterMass: number; specificHeat?: number; sampleCount?: number; }
export interface AdiabaticCompressionConstraint { initialTemp: number; compressionRatio: number; gamma?: number; gasType?: string; sampleCount?: number; moles?: number; }
export interface HeatTransferConstraint { mode: string; materialType?: string; temperatureDiff?: number; sampleCount?: number; length?: number; area?: number; thickness?: number; initialTemp?: number; ambientTemp?: number; time?: number; }
export interface EnergyTransformationConstraint { mode: string; inputEnergy: number; efficiency?: number; }
export interface PerpetuumMobileConstraint { hotTemp: number; coldTemp: number; mode: string; inputHeat?: number; }
export interface BlackBodyConstraint { temperature: number; freqMin?: number; freqMax?: number; sampleCount?: number; }
export interface HeatDirectionConstraint { hotTemp: number; coldTemp: number; thermalConductivity: number; duration?: number; sampleCount?: number; }
export interface AlphaScatteringConstraint { alphaEnergy: number; targetZ: number; foilThickness: number; nParticles?: number; impactParamMax?: number; }
export interface ElectronDiffractionConstraint { accVoltage: number; crystalLattice: number; sampleCount?: number; }
export interface RadiationDeflectionConstraint { Bfield: number; particleType: string; particleEnergy: number; }
export interface DecayStatisticsConstraint { meanCount: number; nTrials: number; experimentTime?: number; sampleCount?: number; }
export interface CosmicRayConstraint { altitude: number; shieldingMode: string; shieldThickness?: number; }
export interface NeutronDiscoveryConstraint { alphaEnergy: number; targetMass: number; }
export interface FissionChainConstraint { multiplicationFactor: number; generations: number; initialNeutrons?: number; }


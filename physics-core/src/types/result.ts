import type { Vector2D, RenderHint } from './common.js';
import type { ModelType } from './problem.js';

/** 轨迹数据点 */
export interface TrajectoryPoint {
    readonly t: number;
    readonly position: Vector2D;
    readonly velocity: Vector2D;
    readonly acceleration?: Vector2D;
    readonly kineticEnergy?: number;
    readonly potentialEnergy?: number;
}

/** 关键帧 */
export interface Keyframe {
    readonly label: string;
    readonly t: number;
    readonly position: Vector2D;
    readonly velocity: Vector2D;
    readonly description: string;
}

/** 图表数据系列 */
export interface ChartSeries {
    readonly xLabel: string;
    readonly yLabel: string;
    readonly xUnit: string;
    readonly yUnit: string;
    readonly points: Array<{ x: number; y: number }>;
}

/** 受力分析图 */
export interface ForceDiagram {
    readonly bodyId: string;
    readonly forces: Array<{
        readonly name: string;
        readonly vector: Vector2D;
        readonly magnitude: number;
        readonly unit: string;
    }>;
    readonly netForce: Vector2D;
}

/** 解释步骤 */
export interface ExplanationStep {
    readonly order: number;
    readonly description: string;
    readonly formula?: string;
    readonly calculation?: string;
    readonly result?: string;
}

/** 公式使用记录 */
export interface FormulaUsage {
    readonly name: string;
    readonly formula: string;
    readonly variables: Record<string, { value: number; unit: string }>;
}

/** 守恒量校验结果 */
export interface ConservedQuantity {
    readonly name: string; // 如 "总动能", "总动量"
    readonly law: string; // 如 "动量守恒定律"
    readonly initialValue: number;
    readonly finalValue: number;
    readonly maxDeviation: number;
    readonly tolerance: number;
    readonly conserved: boolean;
}

/** 范围检查结果 */
export interface RangeCheckResult {
    readonly withinRange: boolean;
    readonly warnings: string[];
}

/** 模拟结果 — 物理引擎的输出 */
export interface SimulationResult {
    readonly meta: {
        readonly model: ModelType;
        readonly solver: 'analytical' | 'numerical';
        readonly computationTime: number;
        readonly timestamp: string;
        readonly version: string;
    };
    readonly trajectories: TrajectoryPoint[][];
    readonly keyframes: Keyframe[];
    readonly charts: {
        readonly x_t?: ChartSeries;
        readonly y_t?: ChartSeries;
        readonly v_t?: ChartSeries;
        readonly a_t?: ChartSeries;
        readonly a_y_t?: ChartSeries; // 竖直加速度-时间 (超重/失重)
        readonly FN_t?: ChartSeries; // 支持力-时间 (对比 mg 参考线)
        readonly mg_ref_t?: ChartSeries; // mg 参考线 (恒定)
        readonly FN_a_y?: ChartSeries; // 支持力-竖直加速度 (线性 N = m(g+a_y))
        readonly vx_t?: ChartSeries; // 抛体: 水平分速度
        readonly vy_t?: ChartSeries; // 抛体: 竖直分速度
        readonly theta_t?: ChartSeries;
        readonly energy_t?: ChartSeries;
        readonly p_t?: ChartSeries;
        readonly ke_t?: ChartSeries;
        readonly pe_t?: ChartSeries; // 势能
        readonly r_t?: ChartSeries; // 轨道半径
        readonly impulse_t?: ChartSeries; // 累积冲量
        readonly v1_t?: ChartSeries; // 物体1速度 (碰撞/反冲)
        readonly v2_t?: ChartSeries; // 物体2速度 (碰撞/反冲)
        readonly omega_t?: ChartSeries; // 角速度 (单摆)
        readonly wave_t?: ChartSeries; // 波形快照 (y-x)
        readonly F_t?: ChartSeries; // 第三章: 力随时间变化
        readonly F_theta?: ChartSeries; // 第三章: 合力随夹角变化 (力的合成)
        readonly f_N?: ChartSeries; // 第三章: 摩擦力随正压力变化
        readonly h_t?: ChartSeries; // 反应时间: h-t 曲线 (下落距离-时间 抛物线)
        readonly t_sqrt_h?: ChartSeries; // 反应时间: t-√h 直线 (验证 t ∝ √h 线性)
        readonly h_t_extra?: ChartSeries; // 附加: h-t 曲线 (部分模型)
        readonly force_diagram?: ForceDiagram;
        // 桌面微小形变光杠杆 (micro-deformation)
        readonly pressure_deltaS?: ChartSeries; // 压力-光点位移 (线性)
        readonly pressure_deltaH?: ChartSeries; // 压力-桌面形变 (线性，nm 级)
        // 伽利略斜面参数扫描图
        readonly theta_a?: ChartSeries; // θ-a: 不同 θ 对应的加速度 a = g·sinθ
        readonly sin_theta_t_end?: ChartSeries; // sinθ-t_end: 不同 θ 对应的斜面下落时间
        // 悬挂法重心 — 静态示意图 (多边形轮廓 + 两次悬挂线 + 重心标记)
        readonly 'static-diagram'?: ChartSeries;
        // 运动合成分解 (蜡块实验) — y vs x 抛物线轨迹
        readonly 'y-x'?: ChartSeries;
        // 传动皮带/齿轮 (必修二 §2 几种传动方式)
        readonly omega_comparison?: ChartSeries; // ω₁ vs ω₂ (随传动比变化)
        readonly gear_ratio?: ChartSeries; // 角速度比 vs 半径比
        readonly r_omega_inverse?: ChartSeries; // r-ω 反比关系图 (皮带)
        readonly v_surfaces?: ChartSeries; // 两轮边缘线速度对比
        // 竖直圆周 (必修二 §2 竖直圆周最高点条件)
        readonly vc_trajectory?: ChartSeries; // 圆周轨迹 (x-y) 静态示意
        readonly tension_angle?: ChartSeries; // 绳张力 vs 角度 (最高点最小)
        readonly vc_speed_angle?: ChartSeries; // 速率 vs 角度
        readonly vc_energy_angle?: ChartSeries; // 机械能/分量 vs 角度
        readonly vmin_markers?: ChartSeries; // 临界速度标记 (静态示意图)
        // 离心现象 (必修二 §2 离心运动)
        readonly omega_critical_curve?: ChartSeries; // 临界 ω-√r 曲线 F_fric = m·ω²·r
        readonly centrifugal_traj?: ChartSeries; // 物块相对地面轨迹 (x-y)
        readonly required_vs_provided?: ChartSeries; // F_需 与 F_实,max 对比 (随半径)
        readonly slip_diagnostics?: ChartSeries; // 是否滑动的判定边界
        // 卡文迪什扭秤 (必修二 §3)
        readonly displacement_sin?: ChartSeries; // 引力-扭转角 (τ-θ) 关系图
        readonly 'static-diagram-cavendish'?: ChartSeries; // 扭秤示意图 (大球-小球-镜面-光点)
        // 月地检验 (必修二 §3)
        readonly 'moon-earth-data'?: ChartSeries; // a_月 vs g/3600 数据对比表 (points)
        readonly ratio_R_r?: ChartSeries; // 比例 R/r 验证图
        // 必修三 第十一章 电路及其应用 — RC 暂态 (电容充放电)
        readonly Uc_t?: ChartSeries; // 电容电压-时间 (指数曲线)
        readonly I_t?: ChartSeries; // 电流-时间 (指数衰减)
        readonly Q_t?: ChartSeries; // 电荷-时间 (充电累积)
        readonly lnUc_t?: ChartSeries; // ln(U_c)-t (放电直线, 斜率=−1/τ)
        // 必修三 第十一章 — 平行板电容器因素
        readonly C_inv_d?: ChartSeries; // C vs 1/d (线性)
        readonly C_S?: ChartSeries; // C vs S (线性)
        readonly C_epsilonR?: ChartSeries; // C vs εr (线性)
        // 必修三 第十一章 — 电阻定律
        readonly R_L?: ChartSeries; // R-L (线性)
        readonly R_invS?: ChartSeries; // R-1/S (线性)
        readonly R_material?: ChartSeries; // 材料比较 (Cu/Fe/Nichrome)
        // 必修三 第十一章 — 路端电压与负载
        readonly U_R?: ChartSeries; // U-R 曲线 (E·R/(R+r))
        readonly U_I?: ChartSeries; // U-I 直线 (截距=E, 斜率=−r)
        readonly I_R?: ChartSeries; // I-R 曲线 (E/(R+r))
        // 必修三 第十二章 静电感应 / 验电器 / 电荷间作用力 / 静电屏蔽 / 法拉第圆筒
        readonly qC_theta?: ChartSeries; // 静电感应: C 电荷与箔片张角散点
        readonly q_theta?: ChartSeries; // 验电器: q-θ 关系曲线
        readonly F_q?: ChartSeries; // 库仑力探究: F-q 直线 (varyQ)
        readonly F_inv_r2?: ChartSeries; // 库仑力探究: F-1/r² 直线 (varyR)
        readonly grounding_effect?: ChartSeries; // 静电屏蔽: 接地vs不接地张角对比
        readonly field_section?: ChartSeries; // 静电屏蔽: 导体内外电场剖面
        readonly probe_position_charge?: ChartSeries; // 法拉第圆筒: 探针位置-测量电荷曲线
        // 选必一 第一章 实验: 平抛验证动量守恒
        readonly range_diagram?: ChartSeries; // 射程标记图 (OP/OM/ON)
        readonly velocity_ratio_scan?: ChartSeries; // 碰后速度 vs 质量比
        // 选必一 第二章 振动
        readonly A_f_drive?: ChartSeries; // 受迫振动/共振: A-f 曲线
        readonly multi_damping_curves?: ChartSeries; // 共振: 多阻尼曲线
        // 选必一 第三章 波
        readonly waveform_t?: ChartSeries; // 声音波形: 时域
        readonly envelope_t?: ChartSeries; // 包络
        readonly intensity_angle?: ChartSeries; // 水波/单缝: 强度-角度
        readonly slit_scan?: ChartSeries; // 水波: 缝宽扫描
        readonly scan_line?: ChartSeries; // 声音干涉: 沿线扫描
        readonly perpendicular_scan?: ChartSeries; // 声音干涉: 垂直扫描
        readonly fprime_vs_speed?: ChartSeries; // 多普勒: f'-v_s
        readonly fprime_vs_theta?: ChartSeries; // 多普勒: f'-theta
        // 选必一 第四章 光
        readonly thickness_scan?: ChartSeries; // 薄膜: 膜厚扫描
        readonly wavelength_scan?: ChartSeries; // 薄膜: 波长扫描
        readonly record_curve?: ChartSeries; // 全息: 记录光强
        readonly reconstruct_curve?: ChartSeries; // 全息: 再现衍射
        readonly width_scan?: ChartSeries; // 单缝: 缝宽扫描
        readonly grating_intensity?: ChartSeries; // 衍射光栅: 衍射图样
        readonly grating_spectrum?: ChartSeries; // 衍射光栅: 光谱波段
        readonly malus_curve?: ChartSeries; // 偏振: 马吕斯曲线
        readonly polar_curve?: ChartSeries; // 偏振: 极坐标
        readonly multi_scan?: ChartSeries; // 偏振: 多片扫描
        // 选必二 传感器/电磁
        readonly tilt_angle_vs_current?: ChartSeries; // 电流天平
        readonly mg_vs_t?: ChartSeries; // 电流天平: mg 对比线
        readonly eddy_heat_power_vs_freq?: ChartSeries; // 涡流: 热功率-频率
        readonly eddy_vs_depth?: ChartSeries; // 涡流: 趋肤深度
        readonly angular_velocity_vs_time?: ChartSeries; // 电磁阻尼/驱动
        readonly primary_current_vs_time?: ChartSeries; // 互感: 原边电流
        readonly secondary_emf_vs_time?: ChartSeries; // 互感: 副边电动势
        readonly current_vs_time?: ChartSeries; // 自感: 电流-时间
        readonly voltage_vs_time?: ChartSeries; // 自感: 电压-时间
        readonly spectrum_curve?: ChartSeries; // 电磁波谱
        readonly band_highlight?: ChartSeries; // 电磁波谱: 选中波段
    };
    readonly diagnostics: {
        readonly conservedQuantities: ConservedQuantity[];
        readonly maxValues: Record<string, number>;
        readonly flags?: Record<string, boolean>;
        readonly rangeCheck: RangeCheckResult;
    };
    readonly explanation: {
        readonly summary: string;
        readonly steps: ExplanationStep[];
        readonly formulas: FormulaUsage[];
    };
    readonly renderHints?: RenderHint[];
    readonly errors: Array<{ code: string; message: string }>;
    readonly warnings: string[];
}

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
  readonly name: string;          // 如 "总动能", "总动量"
  readonly law: string;           // 如 "动量守恒定律"
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
    readonly a_y_t?: ChartSeries;        // 竖直加速度-时间 (超重/失重)
    readonly FN_t?: ChartSeries;         // 支持力-时间 (对比 mg 参考线)
    readonly mg_ref_t?: ChartSeries;     // mg 参考线 (恒定)
    readonly FN_a_y?: ChartSeries;       // 支持力-竖直加速度 (线性 N = m(g+a_y))
    readonly vx_t?: ChartSeries;         // 抛体: 水平分速度
    readonly vy_t?: ChartSeries;         // 抛体: 竖直分速度
    readonly theta_t?: ChartSeries;
    readonly energy_t?: ChartSeries;
    readonly p_t?: ChartSeries;
    readonly ke_t?: ChartSeries;
    readonly pe_t?: ChartSeries;         // 势能
    readonly r_t?: ChartSeries;          // 轨道半径
    readonly impulse_t?: ChartSeries;    // 累积冲量
    readonly v1_t?: ChartSeries;         // 物体1速度 (碰撞/反冲)
    readonly v2_t?: ChartSeries;         // 物体2速度 (碰撞/反冲)
    readonly omega_t?: ChartSeries;      // 角速度 (单摆)
    readonly wave_t?: ChartSeries;       // 波形快照 (y-x)
    readonly F_t?: ChartSeries;          // 第三章: 力随时间变化
    readonly F_theta?: ChartSeries;      // 第三章: 合力随夹角变化 (力的合成)
    readonly f_N?: ChartSeries;          // 第三章: 摩擦力随正压力变化
    readonly h_t?: ChartSeries;          // 反应时间: h-t 曲线 (下落距离-时间 抛物线)
    readonly t_sqrt_h?: ChartSeries;     // 反应时间: t-√h 直线 (验证 t ∝ √h 线性)
    readonly h_t_extra?: ChartSeries;    // 附加: h-t 曲线 (部分模型)
    readonly force_diagram?: ForceDiagram;
    // 桌面微小形变光杠杆 (micro-deformation)
    readonly pressure_deltaS?: ChartSeries; // 压力-光点位移 (线性)
    readonly pressure_deltaH?: ChartSeries; // 压力-桌面形变 (线性，nm 级)
    // 伽利略斜面参数扫描图
    readonly theta_a?: ChartSeries;      // θ-a: 不同 θ 对应的加速度 a = g·sinθ
    readonly sin_theta_t_end?: ChartSeries; // sinθ-t_end: 不同 θ 对应的斜面下落时间
    // 悬挂法重心 — 静态示意图 (多边形轮廓 + 两次悬挂线 + 重心标记)
    readonly 'static-diagram'?: ChartSeries;
  };
  readonly diagnostics: {
    readonly conservedQuantities: ConservedQuantity[];
    readonly maxValues: Record<string, number>;
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

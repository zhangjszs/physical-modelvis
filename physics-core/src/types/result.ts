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
    readonly theta_t?: ChartSeries;
    readonly energy_t?: ChartSeries;
    readonly p_t?: ChartSeries;
    readonly ke_t?: ChartSeries;
    readonly force_diagram?: ForceDiagram;
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

import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 液体混合体积收缩约束 — 酒精+水混合 (选必三 分子运动)
 *
 * 物理: 酒精与水混合后体积收缩 (~3%)
 *   V_final ≈ V_water + 0.97 * V_alcohol (简化)
 *   更精确: V_final = V_water + V_alcohol * (1 - k * x_water)
 *   其中 k 为收缩系数, x_water 为水的摩尔分数
 */
export interface LiquidMixingConstraint {
  /** 水的体积 (mL) */
  readonly volumeWater: number;
  /** 酒精体积 (mL) */
  readonly volumeAlcohol: number;
}

/**
 * 液体混合体积收缩模型 — 酒精+水 (选必三 分子运动)
 *
 * 物理原理：
 *   酒精分子与水分子形成氢键, 分子间隙减小
 *   简化: V_final = V_water + V_alcohol * (1 - k)
 *   收缩系数: k ≈ 0.03 (酒精体积的 3% 收缩)
 *   精确模型: 收缩量正比于两组分接触面积 (摩尔分数)
 */
export class LiquidMixingModel extends PhysicsModelBase {
  readonly name = '液体混合体积收缩';
  readonly version = '1.0.0';
  readonly description = '酒精与水混合后体积收缩 (~3%), 分子间隙减小';
  readonly modelType = 'liquid-mixing' as const;
  readonly assumptions = [
    '恒温恒压条件',
    '分子间隙线性叠加近似',
    '忽略温度变化引起的热胀冷缩',
    '理想混合 (无化学反应)',
  ];
  readonly applicableRange = '酒精-水体系, 常温常压';
  readonly errorSources = [
    '收缩系数随组成非线性变化',
    '温度对氢键强度的影响',
    '微量杂质的影响',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'volumeWater', description: '水的体积 V_w (mL)', unit: 'mL', required: true, min: 0, max: 1000 },
    { name: 'volumeAlcohol', description: '酒精体积 V_a (mL)', unit: 'mL', required: true, min: 0, max: 1000 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const lc = problem.constraints?.liquidMixing;
    if (!lc) throw new Error('liquid-mixing 模型需要 liquidMixing 约束配置');

    const Vw = lc.volumeWater;
    const Va = lc.volumeAlcohol;
    const VTotal = Vw + Va;

    // 酒精密度 ~0.789 g/mL, 水密度 ~1.0 g/mL
    const rhoW = 1.0;
    const rhoA = 0.789;
    const massW = Vw * rhoW;
    const massA = Va * rhoA;

    // 酒精摩尔质量 46.07 g/mol, 水 18.015 g/mol
    const Mw = 18.015;
    const Ma = 46.07;
    const nW = massW / Mw;
    const nA = massA / Ma;
    const nTotal = nW + nA;
    const xW = nTotal > 0 ? nW / nTotal : 0;
    const xA = nTotal > 0 ? nA / nTotal : 0;

    // 收缩模型: V_final = Vw + Va * (1 - k * xW)
    // k 为收缩系数, 与水的摩尔分数成正比 (水越多, 酒精周围被水包围, 收缩越显著)
    const k = 0.06; // 总收缩参数 (~3% 总收缩)
    const contractionFactor = 1 - k * xW;
    const VFinal = Vw + Va * Math.max(contractionFactor, 0.9); // 防止过度收缩
    const deltaV = VFinal - VTotal;
    const contractionPercent = (Math.abs(deltaV) / VTotal) * 100;

    // 组成-收缩量曲线 (扫描不同酒精比例)
    const compositionCurve: ChartSeries = {
      xLabel: '酒精体积分数', yLabel: '体积收缩量 ΔV (mL)', xUnit: '', yUnit: 'mL',
      points: [],
    };
    const nScan = 50;
    for (let i = 0; i <= nScan; i++) {
      const fracAlcohol = i / nScan; // 0~1
      const vScan = 100; // 固定总体积 100 mL
      const vwScan = vScan * (1 - fracAlcohol);
      const vaScan = vScan * fracAlcohol;
      // 简化收缩: 仅与酒精比例相关
      const dvScan = -vaScan * k * (1 - fracAlcohol) * 0.5;
      compositionCurve.points.push({
        x: parseFloat(fracAlcohol.toFixed(3)),
        y: parseFloat((-dvScan).toFixed(4)),
      });
    }

    // 分子示意 (用点表示不同比例下的分子堆积)
    const schematicCurve: ChartSeries = {
      xLabel: '混合前体积 (mL)', yLabel: '混合后体积 (mL)', xUnit: 'mL', yUnit: 'mL',
      points: [
        { x: 0, y: 0 },
        { x: parseFloat(VTotal.toFixed(2)), y: parseFloat(VFinal.toFixed(2)) },
      ],
    };

    // 静态轨迹
    const trajectory: TrajectoryPoint[] = [
      {
        t: 0,
        position: { x: VTotal, y: VFinal },
        velocity: { x: 0, y: 0 },
        kineticEnergy: 0,
        potentialEnergy: 0,
      },
    ];

    const keyframes: Keyframe[] = [
      {
        label: '混合前',
        t: 0,
        position: { x: 0, y: VTotal },
        velocity: { x: 0, y: 0 },
        description: `V_水=${Vw}mL, V_酒精=${Va}mL, V_总=${VTotal}mL`,
      },
      {
        label: '混合后',
        t: 0,
        position: { x: VTotal, y: VFinal },
        velocity: { x: 0, y: 0 },
        description: `V_final=${VFinal.toFixed(3)}mL, ΔV=${deltaV.toFixed(3)}mL (收缩 ${contractionPercent.toFixed(2)}%)`,
      },
    ];

    const warnings: string[] = [];
    if (VTotal === 0) warnings.push('体积均为 0, 无法计算');
    if (Va > 0 && Vw === 0) warnings.push('纯酒精, 无收缩');
    if (Va === 0 && Vw > 0) warnings.push('纯水, 无收缩');

    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '初始总体积',
        formula: 'V_total = V_water + V_alcohol',
        calculation: `V_total = ${Vw} + ${Va} = ${VTotal} mL`,
      },
      {
        order: 2,
        description: '摩尔分数',
        formula: 'x_i = n_i / n_total',
        calculation: `n_水=${nW.toFixed(3)}mol, n_醇=${nA.toFixed(3)}mol, x_水=${xW.toFixed(3)}, x_醇=${xA.toFixed(3)}`,
      },
      {
        order: 3,
        description: '体积收缩',
        formula: 'V_final = V_w + V_a·(1 - k·x_w)',
        calculation: `V_final = ${VFinal.toFixed(3)} mL, ΔV = ${deltaV.toFixed(3)} mL, 收缩 ${contractionPercent.toFixed(2)}%`,
        result: '酒精分子与水分子形成氢键, 分子间隙减小',
      },
    ];

    return {
      meta: {
        model: 'liquid-mixing',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: { x_t: compositionCurve, y_t: schematicCurve },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          volumeWater: Vw,
          volumeAlcohol: Va,
          totalVolume: VTotal,
          finalVolume: VFinal,
          deltaV,
          contractionPercent,
          moleFractionWater: xW,
          moleFractionAlcohol: xA,
          massWater: massW,
          massAlcohol: massA,
        },
        rangeCheck: { withinRange: warnings.length === 0, warnings },
      },
      explanation: {
        summary: `酒精水混合: V_w=${Vw}mL + V_a=${Va}mL = ${VTotal}mL → ${VFinal.toFixed(3)}mL, 收缩 ${contractionPercent.toFixed(2)}%`,
        steps,
        formulas: [
          { name: '混合前体积', formula: 'V_total = V_w + V_a', variables: { V_w: { value: Vw, unit: 'mL' }, V_a: { value: Va, unit: 'mL' } } },
          { name: '体积收缩', formula: 'V_f = V_w + V_a·(1-k·x_w)', variables: { k: { value: k, unit: '' }, x_w: { value: xW, unit: '' } } },
        ],
      },
      errors: [],
      warnings,
    };
  }
}

import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ConservedQuantity, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

// 里德伯常量 (m⁻¹)
const R_inf = 1.097e7;
// 基态能量 (eV)
const E1_eV = -13.6;
// eV → J
const eV = 1.602e-19;

/**
 * 玻尔氢原子模型 — 能级 + 发射/吸收光谱 (选必三 第四章 §4)
 *
 * 能级公式：E_n = E₁ / n² = −13.6/n² eV   (n = 1, 2, 3...)
 *
 * 光子能量 (能级跃迁 n_high → n_low)：
 *   ΔE = E_n_high − E_n_low = 13.6·(1/n_low² − 1/n_high²)  (发射, 高能→低能)
 *   或吸收光子 ΔE > 0 (低能→高能)
 *
 * 波长公式 (巴尔末类)：
 *   1/λ = R∞·(1/n₁² − 1/n₂²)    (n₂ > n₁)
 *
 * 线系：
 *   Lyman 系 (紫外)：n₁ = 1  可见光区的 Balmer (n₁=2) 含 Hα Hβ Hγ Hδ
 *   Balmer 系 (可见)：n₁ = 2
 *   Paschen 系 (红外)：n₁ = 3
 */
export class BohrModel extends PhysicsModelBase {
  readonly name = '玻尔氢原子模型';
  readonly version = '1.0.0';
  readonly description = '氢原子能级、发射/吸收光谱 (巴尔末公式)';
  readonly modelType = 'bohr-model' as const;
  readonly assumptions = [
    '经典玻尔模型 (量子力学是更精确的图像)',
    '单电子氢原子',
    '电子轨道半径 r_n = n²·a₀',
  ];
  readonly applicableRange = '氢原子；可见光区 Balmer 系为主';
  readonly errorSources: string[] = [];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'series', description: '线系 (Lyman/Balmer/Paschen)', unit: '', required: true },
    { name: 'maxN', description: '最大主量子数', unit: '', required: true, min: 3, max: 10 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const bc = problem.constraints?.bohr;
    const series = bc?.series ?? 'Balmer';
    const maxN = bc?.maxN ?? 7;

    const nBase = series === 'Lyman' ? 1 : series === 'Balmer' ? 2 : 3;
    const seriesNameZh = series === 'Lyman' ? '赖曼系 (紫外)' : series === 'Balmer' ? '巴尔末系 (可见)' : '帕邢系 (红外)';

    // 能级数据
    const levels = [];
    for (let n = 1; n <= maxN; n++) {
      levels.push({ n, energy: E1_eV / (n * n) });
    }

    // 计算所有可能的发射跃迁 (n_high → n_low), 光子能量 = E_nHigh − E_nLow > 0
    // E_n = −13.6/n²: E_nHigher (n大) > E_nLower (n小, 更负)
    const transitions = [];
    for (let nLow = nBase; nLow <= maxN - 1; nLow++) {
      for (let nHigh = nLow + 1; nHigh <= maxN; nHigh++) {
        const E_nLow = E1_eV / (nLow * nLow);       // 较低能级 (更负)
        const E_nHigh = E1_eV / (nHigh * nHigh);   // 较高能级 (较不负)
        const dE = E_nHigh - E_nLow;               // 发射光子能量 > 0
        if (dE > 0) {
          const lambda = 1 / (R_inf * (1 / (nLow * nLow) - 1 / (nHigh * nHigh))); // m
          const lambdaNm = lambda * 1e9;
          let visible = false;
          let seriesLabel = '';
          if (nLow === 1) { seriesLabel = 'Lyman'; }
          else if (nLow === 2) { seriesLabel = 'Balmer'; visible = lambdaNm >= 380 && lambdaNm <= 780; }
          else if (nLow === 3) { seriesLabel = 'Paschen'; }
          transitions.push({ nLow, nHigh, dE, lambdaNm, visible, seriesLabel });
        }
      }
    }

    // 能级示意图数据
    const energyDiagram: ChartSeries = {
      xLabel: '主量子数 n', yLabel: '能量 E (eV)', xUnit: '', yUnit: 'eV',
      points: levels.map(l => ({ x: l.n, y: parseFloat(l.energy.toFixed(3)) })),
    };

    // 波长分布图 (本线系谱线)
    const seriesLines = transitions.filter(t => t.seriesLabel === series);
    const spectrumDiagram: ChartSeries = {
      xLabel: '跃迁', yLabel: '波长 λ (nm)', xUnit: 'nm', yUnit: 'nm',
      points: seriesLines.map((t, i) => ({ x: i, y: parseFloat(t.lambdaNm.toFixed(1)) })),
    };

    // 关键帧：巴尔末系前 4 条谱线 (Hα, Hβ, Hγ, Hδ)
    const keyframes: Keyframe[] = [];
    const visibleLines = transitions
      .filter(t => t.seriesLabel === 'Balmer')
      .sort((a, b) => a.lambdaNm - b.lambdaNm)
      .slice(0, 4);
    const lineNames = ['Hα', 'Hβ', 'Hγ', 'Hδ'];
    for (let i = 0; i < visibleLines.length && i < 4; i++) {
      const line = visibleLines[i]!;
      keyframes.push({
        label: lineNames[i]!, t: 0,
        position: { x: line.nHigh, y: line.dE },
        velocity: { x: 0, y: 0 },
        description: `${lineNames[i]}：n=${line.nHigh}→${line.nLow}，ΔE=${line.dE.toFixed(2)} eV，λ=${line.lambdaNm.toFixed(1)} nm`,
      });
    }

    // 模拟轨迹
    const trajectory: TrajectoryPoint[] = [
      { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 },
    ];

    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '能级公式',
        formula: 'E_n = E₁/n² = −13.6/n² eV',
        calculation: `E₁=${E1_eV} eV, E₂=${(E1_eV/4).toFixed(1)} eV, E₃=${(E1_eV/9).toFixed(2)} eV`,
      },
      {
        order: 2,
        description: '${nHigh}→${nLow} 发射光子',
        formula: 'ΔE = |E_{n_{low}} − E_{n_{high}}|',
        result: `${seriesNameZh} 包含 ${seriesLines.length} 条谱线`,
      },
      {
        order: 3,
        description: '波长 (巴尔末公式)',
        formula: '1/λ = R∞·(1/n₁² − 1/n₂²)',
        calculation: `R∞ = ${R_inf.toExponential(2)} m⁻¹`,
      },
    ];

    // visible balmer lines: H-α(656nm), H-β(486nm), H-γ(434nm), H-δ(410nm)
    const balmerSummary = transitions
      .filter(t => t.seriesLabel === 'Balmer' && t.visible)
      .map(t => `n=${t.nHigh}→${t.nLow} λ=${t.lambdaNm.toFixed(0)}nm`)
      .join(', ');

    return {
      meta: {
        model: 'bohr-model',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: { x_t: energyDiagram, y_t: spectrumDiagram },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          R_inf,
          E1_eV,
          baseN: nBase,
          seriesName: nBase, // 编码数值便于测试
          transitionCount: transitions.length,
          visibleLineCount: transitions.filter(t => t.seriesLabel === 'Balmer' && t.visible).length,
        },
        rangeCheck: { withinRange: true, warnings: [] },
      },
      explanation: {
        summary: `${seriesNameZh}：${transitions.length} 条谱线 (n=${nBase}→2..${maxN})，可见光区包含 ${balmerSummary || '无'}`,
        steps: steps.map(s => ({
          ...s,
          formula: (s.formula ?? '').includes('${') ? '能级跃迁' : (s.formula ?? ''),
        })),
        formulas: [
          { name: '能级公式', formula: 'E_n = −13.6/n² (eV)', variables: { 'E₁': { value: E1_eV, unit: 'eV' }, 'E∞': { value: 0, unit: 'eV' } } },
          { name: '波长公式', formula: '1/λ = R(1/n₁² − 1/n₂²)', variables: { R: { value: R_inf, unit: 'm⁻¹' } } },
        ],
      },
      errors: [],
      warnings: [],
    };
  }
}

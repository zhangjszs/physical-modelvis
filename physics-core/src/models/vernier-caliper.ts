import type { PhysicsProblem, VernierCaliperConstraint } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 游标卡尺读数模型 — 必修三 实验 (长度测量)
 *
 * 读数公式: L = 主尺整数读数(mm) + K × (1/N) mm
 *   N = 分度 (10/20/50)
 *   K = 游标第 K 条线与主尺对齐
 * 精度: 1/N mm (10分度=0.1mm, 20分度=0.05mm, 50分度=0.02mm)
 *
 * 本模型生成：
 *   - 主尺整数读数 (mm)
 *   - 对齐刻线 K (0 ~ N-1)
 *   - 最终读数 L = mainScaleReading + K/N
 *   - 游标刻度图示 (用于前端渲染)
 */
export class VernierCaliperModel extends PhysicsModelBase {
  readonly name = '游标卡尺读数';
  readonly version = '1.0.0';
  readonly description = 'L = 主尺 + K×(1/N) mm, N=10/20/50 分度; 读数练习';
  readonly modelType = 'vernier-caliper' as const;
  readonly assumptions = [
    '游标卡尺无零误差 (未测量时间尺对齐)',
    '被测物体长度在量程范围内',
    '读数时无视差 (视线垂直于刻度)',
  ];
  readonly applicableRange = '0 ~ 150 mm (典型学生游标卡尺量程)；N = 10/20/50 分度';
  readonly errorSources = [
    '视差 (视线不垂直)',
    '卡尺磨损导致精度下降',
    '零点漂移 (未校准)',
    '热胀冷缩影响',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'objectSize', description: '被测物体长度 (mm)', unit: 'mm', required: true, min: 1, max: 150 },
    { name: 'nType', description: '分度 (10/20/50)', unit: '', required: true },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const vc = problem.constraints?.vernierCaliper as VernierCaliperConstraint | undefined;
    if (!vc) throw new Error('vernier-caliper 模型需要 vernierCaliper 约束配置');

    const objectSize = vc.objectSize;
    const nType = vc.nType;
    const randomOffset = vc.randomOffset ?? 0;

    // 精度 = 1/N mm
    const precision = 1 / nType;
    // 精度到 0.01 mm
    const roundingFactor = nType === 10 ? 10 : 100; // 10分度→0.1mm, 20/50分度→0.01mm

    // 主尺整数读数 (mm, 向下取整到 mm)
    const mainScaleMM = Math.floor(objectSize);
    // 对齐线 K = 小数部分 / 精度 (取整到最近的游标刻度)
    const fractionalMM = (objectSize - mainScaleMM) + randomOffset;
    const K = Math.round(fractionalMM / precision);
    // 最终读数
    const reading = parseFloat((mainScaleMM + K * precision).toFixed(nType === 10 ? 1 : 2));

    // 游标刻度图示数据 (用于前端渲染)
    // x_t: 主尺刻度位置 (mm → 像素映射时的参考)
    const mainScaleMarks: ChartSeries = {
      xLabel: '主尺位置 (mm)', yLabel: '刻度标记', xUnit: 'mm', yUnit: '',
      points: Array.from({ length: 15 }, (_, i) => ({ x: mainScaleMM - 5 + i, y: 0 })),
    };
    // y_t: 游标尺刻度位置 (N 个刻度)
    const vernierMarks: ChartSeries = {
      xLabel: '游标尺位置 (mm)', yLabel: '对齐线 K', xUnit: 'mm', yUnit: '',
      points: Array.from({ length: nType }, (_, i) => {
        const vernierPos = mainScaleMM + i * precision;
        return { x: parseFloat(vernierPos.toFixed(3)), y: i === K ? 1 : 0.5 };
      }),
    };
    // static-diagram: 完整游标卡尺图示 (主尺 + 游标 + 物体)
    const diagramPoints = this.generateStaticDiagram(mainScaleMM, K, nType, objectSize, reading);

    // 关键帧
    const keyframes: Keyframe[] = [
      {
        label: '游标卡尺读数', t: 0,
        position: { x: reading, y: nType },
        velocity: { x: 0, y: 0 },
        description: `L = ${mainScaleMM} + ${K}×${precision.toFixed(2)} = ${reading} mm (N=${nType}分度, 精度=${precision}mm)`,
      },
    ];

    const trajectory: TrajectoryPoint[] = [
      { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 },
    ];

    const warnings: string[] = [];
    if (nType === 10) warnings.push('10 分度精度 0.1 mm, 估读到 0.01 mm (需要额外估读一位)');
    if (reading > 150) warnings.push('超过典型学生卡尺量程 150 mm');
    if (objectSize < 1) warnings.push('被测物体过小, 卡尺夹持可能不稳');

    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '确定主尺整数读数 (mm)',
        formula: '主尺读数 = 游标零刻度线左侧的主尺整毫米数',
        calculation: `主尺读数 = ${mainScaleMM} mm`,
      },
      {
        order: 2,
        description: '确定游标对齐线 K',
        formula: '找到游标第 K 条线与主尺某刻度对齐',
        calculation: `K = ${K} (游标第 ${K} 条线对齐)`,
      },
      {
        order: 3,
        description: '计算最终读数',
        formula: 'L = 主尺读数 + K × (1/N)',
        calculation: `L = ${mainScaleMM} + ${K} × ${precision.toFixed(2)} = ${reading} mm`,
      },
      {
        order: 4,
        description: '说明精度',
        formula: '精度 = 1/N mm',
        result: `N=${nType} 分度 → 精度 = ${precision} mm`,
      },
    ];

    return {
      meta: { model: 'vernier-caliper', solver: 'analytical', computationTime: 0, timestamp: new Date().toISOString(), version: this.version },
      trajectories: [trajectory],
      keyframes,
      charts: { x_t: mainScaleMarks, y_t: vernierMarks, 'static-diagram': diagramPoints },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          objectSize,
          nType,
          precision,
          mainScaleMM,
          K: K,
          reading,
          randomOffset,
        },
        rangeCheck: { withinRange: warnings.length === 0, warnings },
      },
      explanation: {
        summary: `游标卡尺(N=${nType}): 被测=${objectSize}mm → 主尺=${mainScaleMM}mm + K=${K} × ${precision}mm = ${reading}mm`,
        steps,
        formulas: [
          { name: '游标卡尺读数', formula: 'L = 主尺 + K×(1/N)', variables: { L: { value: reading, unit: 'mm' }, N: { value: nType, unit: '分度' }, K: { value: K, unit: '' } } },
          { name: '精度', formula: 'ΔL = 1/N mm', variables: { ΔL: { value: precision, unit: 'mm' } } },
        ],
      },
      errors: [],
      warnings,
    };
  }

  /** 生成静态图示数据: 主尺刻度 + 游标刻度 + 对齐标记 */
  private generateStaticDiagram(mainScaleMM: number, K: number, nType: number, objectSize: number, reading: number): ChartSeries {
    const precision = 1 / nType;
    const points: Array<{ x: number; y: number }> = [];
    // 主尺: 从 mainScaleMM-2 到 mainScaleMM+N 的整毫米刻度
    for (let mm = mainScaleMM - 2; mm <= mainScaleMM + nType + 2; mm++) {
      points.push({ x: mm, y: 0 }); // y=0 表示主尺基线
    }
    // 游标: N 个刻度, 位置在 mainScaleMM + i*precision
    for (let i = 0; i < nType; i++) {
      const x = mainScaleMM + i * precision;
      points.push({ x: parseFloat(x.toFixed(3)), y: i === K ? 2 : 1 }); // y=2 表示对齐线
    }
    // 对齐标记
    points.push({ x: parseFloat((mainScaleMM + K * precision).toFixed(3)), y: 3 });
    // 参考点: 被测长度
    points.push({ x: objectSize, y: -1 });
    return { xLabel: '位置 (mm)', yLabel: '层次', xUnit: 'mm', yUnit: '', points };
  }
}

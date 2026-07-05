import type { PhysicsProblem, MultimeterConstraint, MultimeterMode } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 多用电表使用模型 — 必修三 实验
 *
 * 物理:
 *   - DCV (直流电压档): 指针偏转角 ∝ 被测电压
 *   - ACV (交流电压档): 整流后偏转 ∝ 被测电压有效值
 *   - DCA (直流电流档): 指针偏转角 ∝ 被测电流
 *   - Ohm (欧姆档): I = E/(R_int + R_x), 中值电阻 R_mid = R_int
 *     (反向刻度: 被测电阻越大, 电流越小, 偏转角越小)
 *
 * 本模型生成刻度盘 + 指针偏转, 计算读数结果
 */
export class MultimeterModel extends PhysicsModelBase {
  readonly name = '多用电表使用';
  readonly version = '1.0.0';
  readonly description = '切换档位 DCV/ACV/Ohm/DCA; 指针读数; 欧姆档中值电阻';
  readonly modelType = 'multimeter' as const;
  readonly assumptions = [
    '表头满偏电流 I_g 恒定',
    '欧姆档内部电源 E = 1.5 V (典型干电池)',
    '欧姆档调零已进行 (短接时指针满偏)',
    '测量时电路处于稳态',
  ];
  readonly applicableRange = 'DCV: 0~250V; ACV: 0~250V; DCA: 0~2.5A; Ohm: 0~100kΩ';
  readonly errorSources = [
    '表头线性度误差',
    '电池电压下降导致欧姆档中值漂移',
    '整流二极管非理想 (ACV 档)',
    '视差 (模拟表)',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'mode', description: '档位 (DCV/ACV/Ohm/DCA)', unit: '', required: true },
    { name: 'range', description: '量程', unit: '', required: true, min: 0.001, max: 1e6 },
    { name: 'testValue', description: '被测量值', unit: '', required: true, min: 0, max: 1e6 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const mc = problem.constraints?.multimeter as MultimeterConstraint | undefined;
    if (!mc) throw new Error('multimeter 模型需要 multimeter 约束配置');

    const mode: MultimeterMode = mc.mode;
    const range = mc.range;
    const testValue = mc.testValue;

    // 计算指针偏转角 (0~1, 1 = 满偏)
    let deflection = 0;
    let reading = 0;
    let unit = '';
    let midResistance = 0; // 欧姆档中值电阻
    let internalResistance = 0; // 等效内阻

    switch (mode) {
      case 'DCV':
      case 'ACV':
      case 'DCA':
        // 线性刻度: deflection = testValue / range
        deflection = Math.min(1, Math.max(0, testValue / range));
        reading = testValue;
        unit = mode === 'DCA' ? 'A' : 'V';
        break;
      case 'Ohm': {
        // 反向非线性刻度: I = E/(R_int + R_x)
        // 设 R_int = midResistance = range (通常欧姆档中值 = 刻度中心)
        midResistance = range; // 简化: 中值电阻等于量程设置
        internalResistance = midResistance;
        const E = 1.5; // V
        if (testValue === 0) {
          deflection = 1; // 满偏 (Rx = 0 时电流最大)
        } else if (testValue >= 1e9) {
          deflection = 0; // ∞ (Rx → ∞)
        } else {
          const current = E / (internalResistance + testValue);
          const I_full = E / internalResistance; // Rx=0 时满偏电流
          deflection = current / I_full; // 0~1
        }
        reading = testValue;
        unit = 'Ω';
        break;
      }
    }

    // 刻度盘数据: 0~100 格 (多用电表通常有 100 格)
    const scaleCount = 100;
    // 线性刻度点 (DCV / DCA)
    let scalePoints: Array<{ x: number; y: number }> = Array.from({ length: 11 }, (_, i) => ({
      x: i * 10,
      y: parseFloat((range * i / 10).toFixed(3)),
    }));

    // ACV 档使用非线性刻度 (低压段密)
    if (mode === 'ACV') {
      scalePoints = Array.from({ length: 11 }, (_, i) => {
        const linearFraction = i / 10;
        // ACV 刻度近似: 低压段压缩 (用于整流效率)
        const displayFraction = linearFraction * linearFraction * 0.3 + linearFraction * 0.7;
        return {
          x: i * 10,
          y: parseFloat((range * displayFraction).toFixed(3)),
        };
      });
    }

    // 欧姆档反向刻度
    if (mode === 'Ohm') {
      scalePoints = Array.from({ length: 11 }, (_, i) => {
        const linearFraction = i / 10;
        // 反向: x=0 → Rx=∞, x=100 → Rx=0
        // Rx = R_mid * (1 - d) / d, d ∈ (0, 1]
        const d = 1 - linearFraction; // 1 → 0
        let rx: number;
        if (d < 0.001) {
          rx = 1e9;
        } else {
          rx = midResistance * (1 - d) / d;
        }
        return {
          x: i * 10,
          y: parseFloat(rx.toFixed(1)),
        };
      });
    }

    const scalePositions: ChartSeries = {
      xLabel: '刻度格', yLabel: '示值', xUnit: '格', yUnit: unit,
      points: scalePoints,
    };

    // 指针标记 (pointer tip)
    const pointerX = deflection * scaleCount;

    // 关键帧
    const keyframes: Keyframe[] = [
      {
        label: `${mode} 档读数`, t: 0,
        position: { x: pointerX, y: reading },
        velocity: { x: 0, y: 0 },
        description: `${mode} × ${range}${unit}: 被测=${testValue}${unit} → 偏转=${(deflection * 100).toFixed(1)}% → 读数=${reading}${unit}`,
      },
    ];

    const trajectory: TrajectoryPoint[] = [
      { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 },
    ];

    const warnings: string[] = [];
    if (deflection > 0.95) warnings.push('指针接近满偏, 建议换用更大量程');
    if (deflection < 0.1) warnings.push('指针偏转很小, 读数不精确, 建议换用更小量程');
    if (mode === 'Ohm' && (testValue === 0 || testValue > midResistance * 100)) {
      warnings.push('欧姆档测量时, 被测电阻接近 0 或 ∞ 时刻度非线性严重, 误差大');
    }
    if (mode === 'ACV' && testValue > range * 0.8) {
      warnings.push('ACV 档低压端刻度密集, 高压段线性较好');
    }

    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '选择合适量程',
        formula: `量程 ${range}${unit} 应略大于被测值 ${testValue}${unit}`,
        result: `量程选择${testValue <= range ? '合适' : '过大或过小, 需更换'}`,
      },
      {
        order: 2,
        description: '读取指针偏转',
        formula: '偏转角 ∝ 被测量/量程',
        calculation: `偏转 = ${testValue}/${range} = ${(deflection * 100).toFixed(1)}%`,
      },
    ];

    if (mode === 'Ohm') {
      steps.push({
        order: 3,
        description: '欧姆档原理',
        formula: 'I = E/(R_int + R_x)',
        calculation: `中值电阻 R_mid = R_int = ${midResistance}Ω, 满偏 I_g = ${(1.5 / midResistance * 1000).toFixed(2)}mA`,
      });
      steps.push({
        order: 4,
        description: '欧姆档读数特点',
        formula: '反向非线性刻度: R_x = R_mid × (1-d)/d',
        result: `R_x = ${reading}Ω (d=${(deflection * 100).toFixed(1)}%)`,
      });
    } else {
      steps.push({
        order: 3,
        description: '线性刻度读数',
        formula: `读数 = 偏转 × 量程`,
        calculation: `读数 = ${(deflection * 100).toFixed(1)}% × ${range}${unit} = ${reading}${unit}`,
      });
    }

    return {
      meta: { model: 'multimeter', solver: 'analytical', computationTime: 0, timestamp: new Date().toISOString(), version: this.version },
      trajectories: [trajectory],
      keyframes,
      charts: {
        x_t: scalePositions,
        y_t: {
          xLabel: '指针位置 (格)', yLabel: '偏转角 (%)', xUnit: '格', yUnit: '%',
          points: [{ x: pointerX, y: parseFloat((deflection * 100).toFixed(1)) }],
        },
        'static-diagram': {
          xLabel: '刻度盘', yLabel: '布局', xUnit: '', yUnit: '',
          points: [
            ...scalePositions.points.map((p, i) => ({ x: p.x, y: 0 })),
            { x: pointerX, y: 1 }, // 指针位置标记
            ...Array.from({ length: 21 }, (_, i) => ({ x: i * 5, y: -0.5 })), // 刻度线
          ],
        },
      },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          mode_DC: mode === 'DCV' ? 1 : 0,
          mode_AC: mode === 'ACV' ? 1 : 0,
          mode_Ohm: mode === 'Ohm' ? 1 : 0,
          mode_DCA: mode === 'DCA' ? 1 : 0,
          range,
          testValue,
          reading,
          deflection,
          midResistance,
          internalResistance,
          pointerX,
          scaleCount,
        },
        rangeCheck: { withinRange: warnings.length === 0, warnings },
      },
      explanation: {
        summary: `${mode} × ${range}${unit}: 被测=${testValue}${unit} → 偏转=${(deflection * 100).toFixed(1)}% → 读数=${reading}${unit}`,
        steps,
        formulas: mode === 'Ohm'
          ? [
              { name: '欧姆档原理', formula: 'I = E/(R_int+R_x)', variables: { E: { value: 1.5, unit: 'V' }, R_int: { value: midResistance, unit: 'Ω' }, R_x: { value: reading, unit: 'Ω' } } },
              { name: '中值电阻', formula: 'R_mid = R_int', variables: { R_mid: { value: midResistance, unit: 'Ω' } } },
            ]
          : [
              { name: '线性读数', formula: '读数 = 偏转 × 量程', variables: { '读数': { value: reading, unit } } },
            ],
      },
      errors: [],
      warnings,
    };
  }
}

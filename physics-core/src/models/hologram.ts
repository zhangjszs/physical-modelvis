import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 全息照片模型 — 选必一 第四章 (全息照相)
 *
 * 全息照相: 记录物光与参考光的干涉条纹 (振幅+相位信息).
 *   参考光: E_r = A_r * cos(omega*t - k*x*sin(theta_r))
 *   物光:   E_o = A_o * cos(omega*t - phi_o(x,y))   (含相位 phi_o)
 *   干强:   I(x) = A_r^2 + A_o^2 + 2*A_r*A_o*cos(k*x*sin(theta_r) - phi_o)
 *
 * 再现: 用参考光照射全息图, 衍射光场:
 *   U(x) ~ I(x) * exp(i*k*x*sin(theta_r))
 *   包含: 0 级 (直射光) + +1 级 (虚像, 原物光) + -1 级 (实像, 共轭光)
 *
 * 简化演示: 参考光正入射 (theta_r=0), 物光产生正弦型条纹.
 *   条纹间距: Delta_x = lambda / sin(theta_o) ~ lambda/theta_o (小角度)
 */
export class HologramModel extends PhysicsModelBase {
  readonly name = '全息照片';
  readonly version = '1.0.0';
  readonly description = '全息记录与再现: 物光与参考光的干涉条纹';
  readonly modelType = 'hologram' as const;
  readonly assumptions = [
    '单色光 (激光)',
    '相干光程差远小于相干长度',
    '全息干板分辨率足够记录细条纹 (1000线/mm以上)',
    '物光/参考光为正弦波',
  ];
  readonly applicableRange = 'referenceAngle: 0--60 deg; wavelength: 400--700 nm; objectDepth: 0--50 mm';
  readonly errorSources = [
    '实际干板非线性响应',
    '全息图乳胶收缩',
    '再现像共轭光干扰',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'referenceAngle', description: '参考光与光轴夹角 theta_r (度)', unit: 'deg', required: true, min: 0, max: 70 },
    { name: 'objectAngle', description: '物光与光轴夹角 theta_o (度) — 决定条纹间距', unit: 'deg', required: true, min: -30, max: 30 },
    { name: 'wavelength', description: '激光波长 (nm)', unit: 'nm', required: true, min: 380, max: 780 },
    { name: 'referenceAmp', description: '参考光振幅 A_r (相对值 0-10)', unit: '', required: true, min: 0.1, max: 10 },
    { name: 'objectAmp', description: '物光振幅 A_o (相对值 0-10)', unit: '', required: true, min: 0.1, max: 10 },
    { name: 'recordWidth', description: '全息干板宽度 (mm)', unit: 'mm', required: true, min: 1, max: 100 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const c = problem.constraints?.hologram;
    if (!c) throw new Error('hologram 模型需要 hologram 约束配置');

    const thetaR = c.referenceAngle * Math.PI / 180;
    const thetaO = c.objectAngle * Math.PI / 180;
    const lambda = c.wavelength;
    const Ar = c.referenceAmp;
    const Ao = c.objectAmp;
    const W = c.recordWidth; // mm

    // 条纹间距 (mm)
    //   I(x) = A_r^2 + A_o^2 + 2*A_r*A_o*cos(k*x*(sin(theta_r) - sin(theta_o)))
    //   或 2*A_r*A_o*cos(k*x*sin(theta_r) - phi_o)
    //   简化: 条纹间距 = lambda / |sin(theta_r) - sin(theta_o)| (nm)
    const deltaSin = Math.abs(Math.sin(thetaR) - Math.sin(thetaO));
    const fringeSpacing_nm = deltaSin > 1e-6 ? lambda / deltaSin : 1e9; // nm
    const fringeSpacing_um = fringeSpacing_nm * 1e-3;
    const fringeDensity = fringeSpacing_um > 0 ? 1000 / fringeSpacing_um : 0; // 线/mm

    // 全息干板上的干涉条纹强度
    const N = 500;
    const recordCurve: ChartSeries = {
      xLabel: '干板位置 x (mm)',
      yLabel: '相对光强',
      xUnit: 'mm',
      yUnit: '',
      points: [],
    };
    const k = 2 * Math.PI / lambda;
    for (let i = 0; i <= N; i++) {
      const x = -W / 2 + (W * i) / N; // mm
      const x_nm = x * 1e6;
      const phi = k * x_nm * (Math.sin(thetaR) - Math.sin(thetaO));
      const I = Ar * Ar + Ao * Ao + 2 * Ar * Ao * Math.cos(phi);
      recordCurve.points.push({ x: parseFloat(x.toFixed(3)), y: parseFloat(I.toFixed(4)) });
    }

    // 再现衍射场 (强度分布)
    const reconstructCurve: ChartSeries = {
      xLabel: '衍射角 (度)',
      yLabel: '相对衍射强度',
      xUnit: 'deg',
      yUnit: '',
      points: [],
    };
    const thetaMax = 30;
    for (let i = 0; i <= N; i++) {
      const ti = -thetaMax + (2 * thetaMax * i) / N;
      const tiRad = ti * Math.PI / 180;
      // -1 级 (实像), 0 级 (直射), +1 级 (虚像)
      const orderMinus = Math.abs(tiRad + thetaO) < 0.02 ? 1 : Math.abs(tiRad + thetaO) / (Math.PI / 4);
      const orderZero = Math.abs(tiRad) < 0.02 ? 1 : Math.abs(tiRad) / (Math.PI / 4);
      const orderPlus = Math.abs(tiRad - thetaO) < 0.02 ? 1 : Math.abs(tiRad - thetaO) / (Math.PI / 4);
      const I_total = Ao * Ao / (orderPlus + 0.1) + Ar * Ar / (orderZero + 0.1) + Ao * Ao / (orderMinus + 0.1);
      reconstructCurve.points.push({ x: parseFloat(ti.toFixed(3)), y: parseFloat(I_total.toFixed(3)) });
    }

    const trajectory: TrajectoryPoint[] = [];
    for (let i = 0; i <= 50; i++) {
      const t = (i / 50) * 10;
      trajectory.push({
        t,
        position: { x: 0, y: i },
        velocity: { x: 0, y: 0 },
        kineticEnergy: 0,
        potentialEnergy: 0,
      });
    }

    const keyframes: Keyframe[] = [
      {
        label: '记录阶段',
        t: 0,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        description: `参考光 theta_r=${c.referenceAngle}deg, 物光 theta_o=${c.objectAngle}deg, lambda=${lambda}nm`,
      },
      {
        label: '条纹参数',
        t: 0,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        description: `条纹间距=${fringeSpacing_um.toFixed(3)}um, 密度=${fringeDensity.toFixed(1)}线/mm`,
      },
      {
        label: '再现',
        t: 0,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        description: `0级直射, +1级虚像(原物光), -1级实像(共轭), A_r=${Ar}, A_o=${Ao}`,
      },
    ];

    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '记录光强',
        formula: 'I(x) = A_r^2 + A_o^2 + 2*A_r*A_o*cos(k*x*(sin(theta_r)-sin(theta_o)))',
        result: '干涉条纹记录在全息干板上',
      },
      {
        order: 2,
        description: '条纹间距',
        formula: 'fringe_spacing = lambda / |sin(theta_r) - sin(theta_o)|',
        calculation: `fringe_spacing = ${lambda}/${deltaSin.toFixed(4)} = ${fringeSpacing_nm.toFixed(1)}nm = ${fringeSpacing_um.toFixed(4)}um`,
      },
      {
        order: 3,
        description: '条纹密度',
        formula: 'density = 1 / fringe_spacing',
        calculation: `density = ${fringeDensity.toFixed(1)} 线/mm`,
      },
      {
        order: 4,
        description: '再现衍射',
        formula: 'U(x) ~ I(x) * exp(i*k*x*sin(theta_r)) => 0/-1/+1 级',
        result: '+1级: 原物光虚像; -1级: 共轭实像',
      },
    ];

    const warnings: string[] = [];
    if (fringeDensity > 3000) warnings.push('条纹密度过高, 普通干板无法记录');
    if (Math.abs(thetaO) > Math.abs(thetaR)) warnings.push('物光角度大于参考光, 高级次衍射可能超出干板');
    if (deltaSin < 0.01) warnings.push('两光角度差极小, 条纹间距大但信息量低');

    return {
      meta: {
        model: 'hologram',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: {
        record_curve: recordCurve,
        reconstruct_curve: reconstructCurve,
      },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          fringeSpacing_um,
          fringeDensity,
          Ar, Ao,
          lambda,
          deltaSin,
          maxRecordI: Ar * Ar + Ao * Ao + 2 * Ar * Ao,
        },
        flags: {
          canRecord: fringeDensity <= 3000,
          isCoherent: deltaSin < 1,
        },
        rangeCheck: { withinRange: warnings.length === 0, warnings },
      },
      explanation: {
        summary: `全息: theta_r=${c.referenceAngle}deg, theta_o=${c.objectAngle}deg, lambda=${lambda}nm; 条纹=${fringeSpacing_um.toFixed(3)}um, 密度=${fringeDensity.toFixed(1)}线/mm`,
        steps,
        formulas: [
          { name: '记录光强', formula: 'I = A_r^2 + A_o^2 + 2*A_r*A_o*cos(delta_phi)', variables: { Ar: { value: Ar, unit: '' }, Ao: { value: Ao, unit: '' } } },
          { name: '条纹间距', formula: 'Delta_x = lambda/|sin(theta_r)-sin(theta_o)|', variables: { Delta_x: { value: fringeSpacing_um, unit: 'um' } } },
        ],
      },
      errors: [],
      warnings,
    };
  }
}

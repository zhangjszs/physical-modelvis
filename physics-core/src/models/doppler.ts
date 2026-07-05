import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 多普勒效应模型 — 选必一 第三章 (多普勒效应)
 *
 * 当声源 S 以速度 v_s 相对于介质运动, 观察者静止时:
 *   f' = f * v / (v - v_s*cos(theta))
 *   其中:
 *     v_s > 0 表示声源朝向观察者运动
 *     cos(theta) = (r_obs - r_src) / |r_obs - r_src| (方向余弦)
 *
 * 常见公式:
 *   靠近: f' = f * v / (v - v_s)      (频率升高)
 *   远离: f' = f * v / (v + v_s)      (频率降低)
 *
 * 拍频: f_beat = |f' - f|
 *
 * 本模型: 计算不同速度 v_s 下的接收频率 f' 和拍频.
 */
export class DopplerModel extends PhysicsModelBase {
  readonly name = '多普勒效应';
  readonly version = '1.0.0';
  readonly description = '运动声源的频率偏移: 靠近频率升高, 远离频率降低';
  readonly modelType = 'doppler' as const;
  readonly assumptions = [
    '观察者静止',
    '声波在均匀空气中传播 (v=const)',
    '声源速度 v_s < v (亚音速)',
    '直达波 (忽略反射/衍射)',
  ];
  readonly applicableRange = 'sourceFreq: 100--5000 Hz; sourceSpeed: 0--300 m/s; soundSpeed: 300--400 m/s';
  readonly errorSources = [
    '实际声源/观察者可能同时运动',
    '风速影响等效声速',
    '当 v_s 接近 v 时形成冲击波',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'soundSpeed', description: '声速 v (m/s)', unit: 'm/s', required: true, min: 300, max: 400 },
    { name: 'sourceFreq', description: '声源频率 f (Hz)', unit: 'Hz', required: true, min: 50, max: 10000 },
    { name: 'sourceSpeed', description: '声源速度 v_s (m/s)', unit: 'm/s', required: true, min: 0, max: 330 },
    { name: 'directionAngle', description: '声源运动方向与观察者连线的夹角 theta (度) — 0=朝向, 180=远离', unit: 'deg', required: true },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const c = problem.constraints?.doppler;
    if (!c) throw new Error('doppler 模型需要 doppler 约束配置');

    const v = c.soundSpeed;
    const f0 = c.sourceFreq;
    const vs = c.sourceSpeed;
    const thetaDeg = c.directionAngle;
    const thetaRad = thetaDeg * Math.PI / 180;
    const cosTheta = Math.cos(thetaRad);

    // 观察者静止, 通用公式: f' = f * v / (v - v_s*cos(theta))
    const denom = v - vs * cosTheta;
    if (Math.abs(denom) < 1e-6) {
      throw new Error('v - v_s*cos(theta) 接近 0, 无法计算接收频率 (接近声速)');
    }
    const fObserved = f0 * v / denom;
    const fBeat = Math.abs(fObserved - f0);
    const semitoneRatio = 12 * Math.log2(fObserved / f0); // 偏移的半音数

    // 扫描: f' 随 v_s 变化 (不同方向角)
    const vScan: ChartSeries = {
      xLabel: '声源速度 v_s (m/s)',
      yLabel: "接收频率 f' (Hz)",
      xUnit: 'm/s',
      yUnit: 'Hz',
      points: [],
    };
    const vMax = Math.min(vs * 1.5, v * 0.95);
    const N = 100;
    for (let i = 0; i <= N; i++) {
      const vi = (vMax * i) / N;
      const di = v - vi * cosTheta;
      const fi = Math.abs(di) > 1e-6 ? f0 * v / di : f0;
      vScan.points.push({ x: parseFloat(vi.toFixed(3)), y: parseFloat(fi.toFixed(3)) });
    }

    // 扫描: f' 随方向角 theta 变化 (固定 v_s)
    const thetaScan: ChartSeries = {
      xLabel: '方向角 theta (度)',
      yLabel: "接收频率 f' (Hz)",
      xUnit: 'deg',
      yUnit: 'Hz',
      points: [],
    };
    for (let i = 0; i <= N; i++) {
      const ti = (2 * Math.PI * i) / N;
      const ci = Math.cos(ti);
      const di = v - vs * ci;
      const fi = Math.abs(di) > 1e-6 ? f0 * v / di : f0;
      thetaScan.points.push({
        x: parseFloat((ti * 180 / Math.PI).toFixed(2)),
        y: parseFloat(fi.toFixed(3)),
      });
    }

    const trajectory: TrajectoryPoint[] = [];
    for (let i = 0; i <= 50; i++) {
      const t = (i / 50) * 10;
      trajectory.push({
        t,
        position: { x: vs * t * cosTheta, y: vs * t * Math.sin(thetaRad) },
        velocity: { x: vs * cosTheta, y: vs * Math.sin(thetaRad) },
        kineticEnergy: 0,
        potentialEnergy: 0,
      });
    }

    const keyframes: Keyframe[] = [
      {
        label: '朝向运动 (v_s 靠近)',
        t: 0,
        position: { x: -10, y: 0 },
        velocity: { x: vs, y: 0 },
        description: `cos(theta)=1: f' = f*v/(v-v_s) = ${(f0 * v / (Math.max(1e-6, v - vs))).toFixed(2)} Hz (频率升高)`,
      },
      {
        label: '垂直运动 (掠过时)',
        t: 0,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        description: `cos(theta)=0: f' = f = ${f0} Hz`,
      },
      {
        label: '远离运动 (v_s 远离)',
        t: 0,
        position: { x: 10, y: 0 },
        velocity: { x: -vs, y: 0 },
        description: `cos(theta)=-1: f' = f*v/(v+v_s) = ${(f0 * v / (v + vs)).toFixed(2)} Hz (频率降低)`,
      },
    ];

    const lambdaVal = (v / f0).toFixed(4);

    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '波长',
        formula: 'lambda = v/f',
        calculation: lambdaVal,
      },
      {
        order: 2,
        description: '多普勒公式',
        formula: "f' = f * v / (v - v_s * cos(theta))",
        calculation: `f' = ${f0} * ${v} / (${v} - ${vs} * ${cosTheta.toFixed(3)}) = ${fObserved.toFixed(2)} Hz`,
      },
      {
        order: 3,
        description: '拍频',
        formula: 'f_beat = |f_prime - f|',
        calculation: `f_beat = ${fBeat.toFixed(2)} Hz`,
      },
      {
        order: 4,
        description: '半音偏移',
        formula: 'semitones = 12 * log2(f_prime / f)',
        calculation: `偏移 = ${semitoneRatio.toFixed(2)} 半音`,
      },
    ];

    const lambda = v / f0;
    const warnings: string[] = [];
    if (vs > v * 0.8) warnings.push('声源速度接近声速, 公式不够精确');
    if (fBeat > 1000) warnings.push('拍频较大, 实际听觉难以分辨');

    return {
      meta: {
        model: 'doppler',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [trajectory],
      keyframes,
      charts: {
        fprime_vs_speed: vScan,
        fprime_vs_theta: thetaScan,
      },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          f0, fObserved, fBeat,
          lambda, v, vs,
          cosTheta, semitoneRatio,
        },
        flags: {
          isApproaching: fObserved > f0,
          isReceding: fObserved < f0,
        },
        rangeCheck: { withinRange: warnings.length === 0, warnings },
      },
      explanation: {
        summary: `多普勒: f=${f0}Hz, v=${v}m/s, v_s=${vs}m/s, theta=${thetaDeg} deg; f'=${fObserved.toFixed(2)}Hz, beat=${fBeat.toFixed(2)}Hz, ${(fObserved > f0 ? '频率升高 (蓝移)' : fObserved < f0 ? '频率降低 (红移)' : '频率不变')}`,
        steps,
        formulas: [
          { name: '多普勒公式', formula: "f' = f*v/(v - v_s*cos(theta))", variables: { v: { value: v, unit: 'm/s' }, v_s: { value: vs, unit: 'm/s' }, cosTheta: { value: cosTheta, unit: '' }, f_prime: { value: fObserved, unit: 'Hz' } } },
          { name: '拍频', formula: 'f_beat = |f_prime - f|', variables: { f_beat: { value: fBeat, unit: 'Hz' } } },
        ],
      },
      errors: [],
      warnings,
    };
  }
}

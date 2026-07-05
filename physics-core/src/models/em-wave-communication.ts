import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 电磁波发射接收约束 — 选必二 第五章 (电磁振荡与电磁波)
 *
 * 载波:    V_c(t) = Vc * sin(2*pi*fc*t)
 * AM 调制: V_AM(t) = Vc * [1 + m * sin(2*pi*fm*t)] * sin(2*pi*fc*t)
 * FM 调制: V_FM(t) = Vc * sin(2*pi*fc*t + beta * sin(2*pi*fm*t))
 */
export interface EMWaveCommConstraint {
  /** 载波频率 fc (Hz) */
  readonly carrierFreq: number;
  /** 调制类型: AM (幅度调制) 或 FM (频率调制) */
  readonly modulationType: 'AM' | 'FM';
  /** 音频(基带)信号频率 fm (Hz) */
  readonly audioFreq: number;
  /** 调制指数 m (AM: 0~1; FM: 调频指数 beta) */
  readonly modulationIndex?: number;
  /** 载波峰值电压 Vc (V) */
  readonly carrierAmplitude?: number;
  /** 传输距离 (m), 用于计算传播时延 */
  readonly distance?: number;
}

/**
 * 电磁波发射接收模型 — 选必二 第五章 (电磁振荡与电磁波)
 *
 * 展示载波、AM/FM 调制波形、包络(解调)信号以及波的传播过程。
 *
 * 高中物理教学重点:
 *   - 为什么要调制 (音频频率低, 天线尺寸需与波长可比拟)
 *   - AM: 载波振幅随音频变化, 包络即音频
 *   - FM: 载波频率随音频变化, 振幅恒定, 抗干扰能力强
 *   - 解调: 从已调波中恢复基带信号
 *
 * 公式:
 *   V_AM(t) = Vc * (1 + m * sin(2*pi*fm*t)) * sin(2*pi*fc*t)
 *   V_FM(t) = Vc * sin(2*pi*fc*t + beta * sin(2*pi*fm*t))
 *   光速传播: t_prop = d / c
 */
export class EMWaveCommunicationModel extends PhysicsModelBase {
  readonly name = '电磁波发射接收';
  readonly version = '1.0.0';
  readonly description = '电磁波载波、AM/FM 调制、传播与解调的可视化';
  readonly modelType = 'em-wave-communication' as const;
  readonly assumptions = [
    '理想正弦载波, 无谐波失真',
    '基带音频为单频正弦信号',
    '传输介质无衰减、无色散 (简化)',
    '解调器理想同步 (包络检波 / 鉴频器)',
  ];
  readonly applicableRange = '音频 20 ~ 20000 Hz; 载波 1 kHz ~ 1 GHz';
  readonly errorSources = [
    '实际信道存在噪声和多径干扰',
    'AM 调制指数 m>1 时出现过调幅失真',
    'FM 最大频偏受限于信道带宽',
    '长距离传输存在衰减和失真',
  ];
  readonly requiredParameters: ParameterSpec[] = [
    { name: 'carrierFreq', description: '载波频率 fc (Hz)', unit: 'Hz', required: true, min: 1e3, max: 1e10 },
    { name: 'audioFreq', description: '音频频率 fm (Hz)', unit: 'Hz', required: true, min: 20, max: 20000 },
    { name: 'modulationIndex', description: '调制指数 m / beta', unit: '', required: false, min: 0.01, max: 5 },
    { name: 'carrierAmplitude', description: '载波峰值电压 Vc (V)', unit: 'V', required: false, min: 0.01, max: 1000 },
    { name: 'distance', description: '传输距离 (m)', unit: 'm', required: false, min: 0, max: 1e8 },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);

    const raw = problem.constraints as unknown as { readonly emWaveComm?: EMWaveCommConstraint } | undefined;
    const c = raw?.emWaveComm;
    if (!c) throw new Error('em-wave-communication 模型需要 emWaveComm 约束配置');

    const fc = c.carrierFreq;
    const fm = c.audioFreq;
    const beta = c.modulationIndex ?? 0.5;
    const Vc = c.carrierAmplitude ?? 1.0;
    const dist = c.distance ?? 1000;
    const isAM = c.modulationType === 'AM';
    const isFM = c.modulationType === 'FM';

    // 光速
    const SPEED_OF_LIGHT = 299792458; // m/s
    const travelTime = dist / SPEED_OF_LIGHT; // s

    // ===== 载波波形 (显示 fcCyclesShown 个周期) =====
    const fcCyclesShown = 4;
    const tCarrierMax = fcCyclesShown / fc;
    const Ncarrier = 800;
    const carrierWave: ChartSeries = {
      xLabel: '时间 t (us)',
      yLabel: '载波电压 (V)',
      xUnit: 'us',
      yUnit: 'V',
      points: [],
    };
    for (let i = 0; i <= Ncarrier; i++) {
      const t = (tCarrierMax * i) / Ncarrier;
      const v = Vc * Math.sin(2 * Math.PI * fc * t);
      carrierWave.points.push({
        x: parseFloat((t * 1e6).toFixed(3)),
        y: parseFloat(v.toFixed(4)),
      });
    }

    // ===== 已调制波形 (显示 fmCyclesShown 个音频周期) =====
    const fmCyclesShown = 3;
    const tModMax = fmCyclesShown / fm;
    const Nmod = 800;
    const modTitle = isAM ? 'AM 调制信号' : 'FM 调制信号';
    const modulatedSignal: ChartSeries = {
      xLabel: '时间 t (ms)',
      yLabel: modTitle + ' (V)',
      xUnit: 'ms',
      yUnit: 'V',
      points: [],
    };
    for (let i = 0; i <= Nmod; i++) {
      const t = (tModMax * i) / Nmod;
      let v: number;
      if (isAM) {
        // AM: V(t) = Vc * (1 + m * sin(2*pi*fm*t)) * sin(2*pi*fc*t)
        v = Vc * (1 + beta * Math.sin(2 * Math.PI * fm * t)) * Math.sin(2 * Math.PI * fc * t);
      } else {
        // FM: V(t) = Vc * sin(2*pi*fc*t + beta * sin(2*pi*fm*t))
        v = Vc * Math.sin(2 * Math.PI * fc * t + beta * Math.sin(2 * Math.PI * fm * t));
      }
      modulatedSignal.points.push({
        x: parseFloat((t * 1e3).toFixed(4)),
        y: parseFloat(v.toFixed(4)),
      });
    }

    // ===== 解调信号 (包络 / 鉴频输出) =====
    const Ndemod = 400;
    const demodulatedSignal: ChartSeries = {
      xLabel: '时间 t (ms)',
      yLabel: '解调信号 (V)',
      xUnit: 'ms',
      yUnit: 'V',
      points: [],
    };
    for (let i = 0; i <= Ndemod; i++) {
      const t = (tModMax * i) / Ndemod;
      let v: number;
      if (isAM) {
        // AM 包络检波: 输出 = Vc * |1 + m * sin(2*pi*fm*t)|
        v = Vc * Math.abs(1 + beta * Math.sin(2 * Math.PI * fm * t));
      } else {
        // FM 鉴频: 输出比例于瞬时频率变化 = beta * fm * cos(2*pi*fm*t)
        v = Vc * beta * Math.cos(2 * Math.PI * fm * t);
      }
      demodulatedSignal.points.push({
        x: parseFloat((t * 1e3).toFixed(4)),
        y: parseFloat(v.toFixed(4)),
      });
    }

    // ===== 瞬时频率曲线 (仅 FM 有意义, 但 AM 也给出恒频参考) =====
    const Nfreq = 200;
    const instFreqCurve: ChartSeries = {
      xLabel: '时间 t (ms)',
      yLabel: '瞬时频率 (Hz)',
      xUnit: 'ms',
      yUnit: 'Hz',
      points: [],
    };
    for (let i = 0; i <= Nfreq; i++) {
      const t = (tModMax * i) / Nfreq;
      // 载波角频率 omega(t) = d(phase)/dt
      // AM phase = 2*pi*fc*t -> f_inst = fc
      // FM phase = 2*pi*fc*t + beta*sin(2*pi*fm*t)
      //    -> omega = 2*pi*fc + beta*2*pi*fm*cos(2*pi*fm*t)
      //    -> f_inst = fc + beta*fm*cos(2*pi*fm*t)
      const fInst = isFM
        ? fc + beta * fm * Math.cos(2 * Math.PI * fm * t)
        : fc;
      instFreqCurve.points.push({
        x: parseFloat((t * 1e3).toFixed(4)),
        y: parseFloat(fInst.toFixed(3)),
      });
    }

    // ===== 关键帧 =====
    const keyframes: Keyframe[] = [
      {
        label: '载波 (正弦)',
        t: 0,
        position: { x: 0, y: 0 },
        velocity: { x: fc, y: 0 },
        description: `载波: fc=${fc} Hz, Vc=${Vc} V, 波长 lambda=${(SPEED_OF_LIGHT / fc).toFixed(3)} m`,
      },
      {
        label: `已调波 (${isAM ? 'AM' : 'FM'})`,
        t: 0,
        position: { x: 0, y: Vc * (isAM ? 1 + beta : 1) },
        velocity: { x: fm, y: 0 },
        description: `${modTitle}: 音频 fm=${fm} Hz, 调制指数=${beta}`,
      },
      {
        label: '信号接收 (传播)',
        t: travelTime,
        position: { x: dist, y: 0 },
        velocity: { x: SPEED_OF_LIGHT, y: 0 },
        description: `距离=${dist} m, 传播时延=${(travelTime * 1e6).toFixed(3)} us`,
      },
    ];

    // ===== 传播轨迹 =====
    const propagationTraj: TrajectoryPoint[] = [];
    const Nprop = 100;
    for (let i = 0; i <= Nprop; i++) {
      const ratio = i / Nprop;
      const x = ratio * dist;
      const t = x / SPEED_OF_LIGHT;
      // 空间某点的场分量 (以 FM 为例, 简化)
      const phase = 2 * Math.PI * fc * t + (isFM ? beta * Math.sin(2 * Math.PI * fm * t) : 0);
      const y = Vc * Math.sin(phase);
      propagationTraj.push({
        t,
        position: { x, y },
        velocity: { x: SPEED_OF_LIGHT, y: 0 },
        kineticEnergy: 0,
        potentialEnergy: 0,
      });
    }

    // ===== 警告 =====
    const warnings: string[] = [];
    if (fc <= 10 * fm) {
      warnings.push('载波频率应远大于音频频率 (建议 fc > 10*fm), 否则波形难以分辨');
    }
    if (isAM && beta > 1) {
      warnings.push('AM 调制指数 m>1 导致过调幅失真, 建议 0<m<=1');
    }
    if (fm < 20 || fm > 20000) {
      warnings.push('音频频率超出人耳可听范围 (20~20000 Hz)');
    }
    if (dist > 1e6) {
      warnings.push('传输距离超过 1000 km, 实际应用需中继或考虑衰减');
    }

    // ===== 解释步骤 =====
    const steps: ExplanationStep[] = [
      {
        order: 1,
        description: '载波信号',
        formula: 'V_carrier(t) = Vc * sin(2*pi*fc*t)',
        calculation: `fc=${fc} Hz, Vc=${Vc} V, 周期 Tc=${(1 / fc * 1e6).toFixed(3)} us`,
      },
      {
        order: 2,
        description: isAM ? 'AM 幅度调制' : 'FM 频率调制',
        formula: isAM
          ? 'V_AM(t) = Vc * [1 + m*sin(2*pi*fm*t)] * sin(2*pi*fc*t)'
          : 'V_FM(t) = Vc * sin(2*pi*fc*t + beta*sin(2*pi*fm*t))',
        result: isAM
          ? `包络 = Vc*(1+m*sin(2*pi*fm*t)), 调制指数 m=${beta}`
          : `调频指数 beta=${beta}, 瞬时频率 f=fc+beta*fm*cos(2*pi*fm*t)`,
      },
      {
        order: 3,
        description: '信号传播 (光速)',
        formula: 't_prop = d / c',
        calculation: `d=${dist} m, c=3e8 m/s -> t=${(travelTime * 1e6).toFixed(3)} us`,
      },
      {
        order: 4,
        description: '解调 (恢复基带)',
        formula: isAM ? '包络检波 (整流+低通)' : '鉴频器 (相位微分)',
        result: isAM ? `恢复音频 sin(2*pi*fm*t), fm=${fm} Hz` : `恢复音频 beta*cos(2*pi*fm*t)`,
      },
    ];

    return {
      meta: {
        model: 'em-wave-communication',
        solver: 'analytical',
        computationTime: 0,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      trajectories: [propagationTraj],
      keyframes,
      charts: {
        wave_t: carrierWave,
        envelope_t: modulatedSignal,
        ke_t: demodulatedSignal,
        v_t: instFreqCurve,
      },
      diagnostics: {
        conservedQuantities: [],
        maxValues: {
          carrierFreq_Hz: fc,
          audioFreq_Hz: fm,
          modulationIndex: beta,
          carrierAmplitude_V: Vc,
          distance_m: dist,
          travelTime_us: parseFloat((travelTime * 1e6).toFixed(3)),
          waveLength_m: parseFloat((SPEED_OF_LIGHT / fc).toFixed(3)),
          modTypeFlag: isAM ? 1 : (isFM ? 2 : 0),
        },
        rangeCheck: { withinRange: warnings.length === 0, warnings },
      },
      explanation: {
        summary: `${isAM ? 'AM' : 'FM'} 调制电磁波: 载波 fc=${fc} Hz, 音频 fm=${fm} Hz, 调制指数=${beta}, 距离=${dist} m, 传播时延=${(travelTime * 1e6).toFixed(3)} us`,
        steps,
        formulas: [
          {
            name: '载波',
            formula: 'Vc * sin(2*pi*fc*t)',
            variables: {
              Vc: { value: Vc, unit: 'V' },
              fc: { value: fc, unit: 'Hz' },
            },
          },
          {
            name: isAM ? 'AM 调制' : 'FM 调制',
            formula: isAM
              ? 'Vc * [1 + m*sin(2*pi*fm*t)] * sin(2*pi*fc*t)'
              : 'Vc * sin(2*pi*fc*t + beta*sin(2*pi*fm*t))',
            variables: {
              beta_or_m: { value: beta, unit: '' },
              fm: { value: fm, unit: 'Hz' },
            },
          },
        ],
      },
      errors: [],
      warnings,
    };
  }
}

import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 电磁波谱约束 — 选必二 第五章 (电磁振荡与电磁波)
 *
 * 电磁波谱按频率/波长划分:
 *  无线电波: ~3 Hz    - 3e11 Hz  (波长 > 1 mm)
 *  红外线:   3e11     - 4e14 Hz  (700 nm - 1 mm)
 *  可见光:   4e14     - 7.9e14 Hz (380 - 700 nm)
 *  紫外线:   7.9e14   - 3e16 Hz  (10 - 380 nm)
 *  X 射线:   3e16     - 3e19 Hz  (0.01 - 10 nm)
 *  gamma 射线: > 3e19 Hz          (< 0.01 nm)
 */
/** 电磁波谱波段名称 */
export type SpectrumBandName = 'radio' | 'infrared' | 'visible' | 'ultraviolet' | 'xray' | 'gamma';

/** 电磁波谱波段定义 */
interface SpectrumBand {
    readonly name: SpectrumBandName;
    readonly label: string;
    readonly freqLo: number;
    readonly freqHi: number;
    readonly waveLo: number;
    readonly waveHi: number;
    readonly color: string;
    readonly description: string;
}

/**
 * 电磁波谱模型 — 选必二 第五章 (电磁振荡与电磁波)
 *
 * 展示电磁波的完整频谱分布, 按频率(波长)划分波段:
 *   无线电波 -> 红外线 -> 可见光 -> 紫外线 -> X 射线 -> gamma 射线
 *
 * 关键公式:
 *   c = lambda * f (光速 = 波长 * 频率)
 *   E = h * f (光子能量 = 普朗克常数 * 频率)
 *
 * 教学意义:
 *   - 可见光在电磁波谱中只占极窄频段 (4e14 ~ 7.9e14 Hz)
 *   - 频率越高光子能量越大 (gamma 射线穿透力最强)
 *   - 不同波段的产生机制不同 (振荡电路 / 分子振动 / 原子外层电子 / 原子内层电子 / 原子核)
 */
export class EMSpectrumModel extends PhysicsModelBase {
    readonly name = '电磁波谱';
    readonly version = '1.0.0';
    readonly description = '电磁波频谱分布、各波段特征与光子能量可视化';
    readonly modelType = 'em-spectrum' as const;
    readonly assumptions = [
        '真空光速 c = 3.0 * 10^8 m/s',
        '普朗克常数 h = 6.626e-34 J*s',
        '频段边界采用教材常用近似值'
    ];
    readonly applicableRange = '频率 1 Hz ~ 1e22 Hz (宇宙最全电磁波谱)';
    readonly errorSources = [
        '实际频段边界模糊, 存在交叉区',
        '各波段产生机制划分并非绝对',
        '超高频端 (gamma) 光子能量极高, 量子引力效应不可忽略'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'freqMin', description: '扫描频率下限 (Hz)', unit: 'Hz', required: true, min: 1, max: 1e22 },
        { name: 'freqMax', description: '扫描频率上限 (Hz)', unit: 'Hz', required: true, min: 1, max: 1e22 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.emSpectrum;
        if (!c) throw new Error('em-spectrum 模型需要 emSpectrum 约束配置');

        const freqMin = c.freqMin;
        const freqMax = c.freqMax;
        const highlightBand = c.highlightBand ?? 'visible';

        if (freqMin >= freqMax) {
            throw new Error('freqMin 必须小于 freqMax');
        }

        // 物理常数
        const SPEED_OF_LIGHT = 299792458; // m/s
        const PLANCK_H = 6.62607015e-34; // J*s

        // ===== 标准波段表 =====
        const bands: SpectrumBand[] = [
            {
                name: 'radio',
                label: '无线电波',
                freqLo: 3,
                freqHi: 3e11,
                waveLo: 1e5,
                waveHi: 1e-3,
                color: '#8B0000',
                description: '无线电通信、广播、雷达、微波炉'
            },
            {
                name: 'infrared',
                label: '红外线',
                freqLo: 3e11,
                freqHi: 4e14,
                waveLo: 1e-3,
                waveHi: 7e-7,
                color: '#FF4500',
                description: '热成像、夜视、红外遥控'
            },
            {
                name: 'visible',
                label: '可见光',
                freqLo: 4e14,
                freqHi: 7.9e14,
                waveLo: 7e-7,
                waveHi: 3.8e-7,
                color: '#FFD700',
                description: '人眼可感知: 红橙黄绿蓝靛紫'
            },
            {
                name: 'ultraviolet',
                label: '紫外线',
                freqLo: 7.9e14,
                freqHi: 3e16,
                waveLo: 3.8e-7,
                waveHi: 1e-8,
                color: '#8A2BE2',
                description: '杀菌消毒、荧光效应、过量致癌'
            },
            {
                name: 'xray',
                label: 'X 射线',
                freqLo: 3e16,
                freqHi: 3e19,
                waveLo: 1e-8,
                waveHi: 1e-11,
                color: '#4169E1',
                description: '医学成像、晶体衍射、安检透视'
            },
            {
                name: 'gamma',
                label: 'gamma 射线',
                freqLo: 3e19,
                freqHi: 1e23,
                waveLo: 1e-11,
                waveHi: 1e-15,
                color: '#2F4F4F',
                description: '核反应、伽马刀、天体物理'
            }
        ];

        // ===== 频谱分布图 (对数坐标: log10(freq) vs 归一化能量密度示意) =====
        const N = 400;
        const logFreqMin = Math.log10(freqMin);
        const logFreqMax = Math.log10(freqMax);
        const spectrumChart: ChartSeries = {
            xLabel: '频率 f (Hz, 对数)',
            yLabel: '归一化相对强度',
            xUnit: 'Hz',
            yUnit: '',
            points: []
        };
        // 简单示意: 不同频段用不同包络
        // 无线电/红外区高 (热辐射), 可见光区峰值, UV/X/gamma 递减
        for (let i = 0; i <= N; i++) {
            const logF = logFreqMin + (logFreqMax - logFreqMin) * (i / N);
            const f = Math.pow(10, logF);
            // 归一化示意强度 (维恩位移简化): ~ f^3 / (exp(f/f0)-1) 形式
            // 这里用分段简化: 峰值在可见光区
            const fPeak = 6e14; // 可见光中心
            const x = f / fPeak;
            let intensity: number;
            if (x < 1) {
                // 低频: ~ x^3
                intensity = Math.pow(x, 3);
            } else {
                // 高频: ~ x^-2 衰减
                intensity = Math.pow(x, -2);
            }
            // 限幅
            intensity = Math.min(Math.max(intensity, 0), 1.5);
            spectrumChart.points.push({
                x: f,
                y: parseFloat(intensity.toFixed(5))
            });
        }

        // ===== 波段高亮图 (柱状示意: 每个波段一个柱, 高亮 band 为特殊颜色) =====
        const bandHighlight: ChartSeries = {
            xLabel: '波段序号 (0-5)',
            yLabel: '波段宽度 (decades)',
            xUnit: '',
            yUnit: 'decades',
            points: []
        };
        for (let i = 0; i < bands.length; i++) {
            const band = bands[i];
            const loIn = Math.max(band.freqLo, freqMin);
            const hiIn = Math.min(band.freqHi, freqMax);
            if (hiIn <= loIn) continue;
            const wDecades = Math.log10(hiIn) - Math.log10(loIn);
            // 高亮波段给更大的 y 值以区分
            const yVal = band.name === highlightBand ? wDecades * 1.5 : wDecades;
            bandHighlight.points.push({
                x: i,
                y: parseFloat(yVal.toFixed(3))
            });
        }

        // ===== 波段特征表 (用作 TrajectoryPoint 表格) =====
        const bandTable: TrajectoryPoint[] = bands.map((b, idx) => {
            const centerFreq = Math.sqrt(b.freqLo * b.freqHi); // 几何平均
            const centerWave = SPEED_OF_LIGHT / centerFreq;
            const photonEnergy = PLANCK_H * centerFreq; // J
            const photonEnergyEv = photonEnergy / 1.602176634e-19;
            return {
                t: idx,
                position: { x: b.freqLo, y: centerFreq },
                velocity: { x: centerWave, y: photonEnergyEv },
                kineticEnergy: 0,
                potentialEnergy: 0
            };
        });

        // ===== 关键帧 =====
        const visibleBand = bands.find(b => b.name === 'visible')!;
        const highlightInfo = bands.find(b => b.name === highlightBand) ?? visibleBand;
        const centerFreqHL = Math.sqrt(highlightInfo.freqLo * highlightInfo.freqHi);
        const centerWaveHL = SPEED_OF_LIGHT / centerFreqHL;
        const photonEvHL = (PLANCK_H * centerFreqHL) / 1.602176634e-19;

        const keyframes: Keyframe[] = [
            {
                label: '可见光窗口',
                t: 0,
                position: { x: visibleBand.freqLo, y: visibleBand.freqHi },
                velocity: { x: centerWaveHL * 1e9, y: photonEvHL },
                description: `可见光: ${(visibleBand.freqLo / 1e14).toFixed(1)}~${(visibleBand.freqHi / 1e14).toFixed(1)} PHz, 波长 ${(visibleBand.waveHi * 1e9).toFixed(0)}~${(visibleBand.waveLo * 1e9).toFixed(0)} nm`
            },
            {
                label: `高亮: ${highlightInfo.label}`,
                t: 0,
                position: { x: highlightInfo.freqLo, y: highlightInfo.freqHi },
                velocity: { x: 0, y: 0 },
                description: `${highlightInfo.label}: 中心频率 ${centerFreqHL.toExponential(2)} Hz, 波长 ${centerWaveHL.toExponential(2)} m, 光子能量 ${photonEvHL.toExponential(2)} eV. ${highlightInfo.description}`
            }
        ];

        // ===== 警告 =====
        const warnings: string[] = [];
        if (freqMin < 1) warnings.push('频率下限过低, 实际电路难以产生 <1 Hz 电磁波');
        if (freqMax > 1e22) warnings.push('频率上限极高, 进入康普顿散射/量子引力领域');

        // ===== 解释步骤 =====
        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '电磁波基本关系',
                formula: 'c = lambda * f,  E = h * f',
                calculation: `c=${SPEED_OF_LIGHT.toExponential(2)} m/s, h=${PLANCK_H.toExponential(2)} J*s`
            },
            {
                order: 2,
                description: '可见光在频谱中的位置',
                formula: `可见光频率范围: ~4e14 ~ 8e14 Hz`,
                result: `占整个电磁波谱极窄区间, 是人眼敏感的波段`
            },
            {
                order: 3,
                description: `${highlightInfo.label}的特征`,
                formula: `中心频率 = sqrt(f_lo * f_hi), lambda = c/f, E = h*f`,
                calculation: `f=${centerFreqHL.toExponential(2)} Hz, lambda=${centerWaveHL.toExponential(2)} m, E=${photonEvHL.toExponential(2)} eV`
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [bandTable],
            keyframes,
            charts: {
                spectrum_curve: spectrumChart,
                ke_t: bandHighlight
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    freqMin_Hz: freqMin,
                    freqMax_Hz: freqMax,
                    centerFreqHighlight_Hz: centerFreqHL,
                    waveLengthHighlight_m: centerWaveHL,
                    photonEnergyHighlight_eV: photonEvHL,
                    visibleWidthDecades: Math.log10(visibleBand.freqHi) - Math.log10(visibleBand.freqLo),
                    highlightBandIdx: bands.findIndex(b => b.name === highlightBand)
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `电磁波谱: ${freqMin.toExponential(1)} ~ ${freqMax.toExponential(1)} Hz, 共 ${bands.length} 个波段, 高亮显示: ${highlightInfo.label}`,
                steps,
                formulas: [
                    {
                        name: '波频关系',
                        formula: 'c = lambda * f',
                        variables: {
                            c: { value: SPEED_OF_LIGHT, unit: 'm/s' },
                            f: { value: centerFreqHL, unit: 'Hz' },
                            lambda: { value: centerWaveHL, unit: 'm' }
                        }
                    },
                    {
                        name: '光子能量',
                        formula: 'E = h * f',
                        variables: {
                            h: { value: PLANCK_H, unit: 'J*s' },
                            E_eV: { value: photonEvHL, unit: 'eV' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

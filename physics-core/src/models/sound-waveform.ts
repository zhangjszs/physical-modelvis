import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 声音波形模型 — 选必一 第三章 (声波显示)
 *
 * 演示声音在时域上的三种波形:
 *   - 乐音 (正弦/多谐波): A*sin(2*pi*f*t) + sum(A_n*sin(2*pi*n*f*t))
 *   - 复合音 (基频+泛音): 多个谐波叠加
 *   - 噪声 (无规则): 随机近似 (带平滑滤波)
 *
 * 压缩空气分子在平衡位置附近的位移随时间变化图.
 */
export class SoundWaveformModel extends PhysicsModelBase {
    readonly name = '声音波形';
    readonly version = '1.0.0';
    readonly description = '声音时域波形: 乐音/复合音/噪声';
    readonly modelType = 'sound-waveform' as const;
    readonly assumptions = ['理想声波 (简谐 / 窄带噪声)', '介质均匀, 无衰减', '只显示时域 (不显示频谱)'];
    readonly applicableRange = 'frequency: 20--20000 Hz; duration: 0.001--0.1 s';
    readonly errorSources = ['真实声波有谐波失真', '噪声并非真正随机 (伪随机)', '实际声音涉及三维空间分布'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'frequency', description: '基频 (Hz)', unit: 'Hz', required: true, min: 20, max: 5000 },
        { name: 'amplitude', description: '振幅 (相对值 0-1)', unit: '', required: true, min: 0, max: 1 },
        { name: 'waveType', description: '波形类型: pure(纯音)/complex(复合)/noise(噪声)', unit: '', required: true },
        {
            name: 'harmonics',
            description: '谐波数组 (仅 complex 模式), 例 [0.5, 0.3, 0.2] 表示2倍频0.5, 3倍频0.3...',
            unit: '',
            required: false
        },
        { name: 'duration', description: '模拟时长 (s)', unit: 's', required: true, min: 0.001, max: 0.5 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.soundWaveform;
        if (!c) throw new Error('sound-waveform 模型需要 soundWaveform 约束配置');

        const f = c.frequency;
        const A = c.amplitude;
        const waveType = c.waveType;
        const harmonics: number[] = c.harmonics ?? [];
        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 500;

        const waveform: ChartSeries = {
            xLabel: '时间 (ms)',
            yLabel: '相对位移',
            xUnit: 'ms',
            yUnit: '',
            points: []
        };

        // 确定性伪随机 (基于种子, 不引入非确定性)
        const seed = 42;
        let state = seed;
        const pseudoRandom = (): number => {
            state = (state * 1103515245 + 12345) & 0x7fffffff;
            return state / 0x7fffffff;
        };

        for (let i = 0; i <= sampleCount; i++) {
            const t = (i / sampleCount) * duration; // s
            const tMs = t * 1000;
            let y: number;

            if (waveType === 'pure') {
                y = A * Math.sin(2 * Math.PI * f * t);
            } else if (waveType === 'complex') {
                // 复合音: 基频 + 谐波
                y = A * Math.sin(2 * Math.PI * f * t);
                harmonics.forEach((amp, idx) => {
                    const harmonicIdx = idx + 2; // 2倍频, 3倍频, ...
                    y += A * amp * Math.sin(2 * Math.PI * f * harmonicIdx * t);
                });
                // 归一化到 [-A, A]
                const totalAmp = A * (1 + harmonics.reduce((s, v) => s + v, 0));
                if (totalAmp > A) y = (y * A) / totalAmp;
            } else if (waveType === 'noise') {
                // 噪声 (带简单移动平均平滑)
                y = (pseudoRandom() * 2 - 1) * A;
            } else {
                y = 0;
            }

            waveform.points.push({ x: parseFloat(tMs.toFixed(3)), y: parseFloat(y.toFixed(4)) });
        }

        // also produce a time-domain envelope chart
        const envelope: ChartSeries = {
            xLabel: '时间 (ms)',
            yLabel: '包络',
            xUnit: 'ms',
            yUnit: '',
            points: waveform.points.map(p => ({ x: p.x, y: Math.abs(p.y) }))
        };

        const trajectory: TrajectoryPoint[] = [];
        for (let i = 0; i <= sampleCount; i += 10) {
            const t = (i / sampleCount) * duration;
            trajectory.push({
                t,
                position: { x: t, y: waveform.points[i]?.y ?? 0 },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            });
        }

        const T_ms = (1 / f) * 1000;

        const keyframes: Keyframe[] = [
            {
                label: '基频周期起点',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `f=${f}Hz, T=${T_ms.toFixed(2)}ms, type=${waveType}`
            },
            {
                label: 'T/4 (峰值)',
                t: T_ms / 4000,
                position: { x: T_ms / 4, y: A },
                velocity: { x: 0, y: 0 },
                description: '四分之一周期, 达到最大位移'
            },
            {
                label: 'T/2 (过零)',
                t: T_ms / 2000,
                position: { x: T_ms / 2, y: 0 },
                velocity: { x: 0, y: 0 },
                description: '半周期, 从正向负过零'
            }
        ];

        const waveLabel = waveType === 'pure' ? '纯音 (简谐)' : waveType === 'complex' ? '复合音 (基频+谐波)' : '噪声';

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '波形类型',
                formula:
                    waveType === 'pure'
                        ? 'x(t) = A*sin(2*pi*f*t)'
                        : waveType === 'complex'
                          ? 'x(t) = A*sin(2*pi*f*t) + sum(A_n*sin(2*pi*n*f*t))'
                          : 'x(t) = random (伪随机)',
                result: waveLabel
            },
            {
                order: 2,
                description: '频率/周期',
                formula: 'f = 1/T',
                calculation: `f=${f}Hz, T=${T_ms.toFixed(3)}ms`
            },
            {
                order: 3,
                description: '人耳听感',
                result: f < 200 ? '低频' : f < 1000 ? '中频' : '高频'
            }
        ];

        const warnings: string[] = [];
        if (f < 20) warnings.push('频率在人耳听阈以下 (<20 Hz)');
        if (f > 20000) warnings.push('频率超出人耳听阈 (>20 kHz)');
        if (waveType === 'complex' && harmonics.length === 0) warnings.push('复合音模式但 harmonics 为空');

        return {
            meta: {
                model: 'sound-waveform',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: {
                waveform_t: waveform,
                envelope_t: envelope
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    frequency: f,
                    periodMs: T_ms,
                    amplitude: A,
                    maxDisp: Math.max(...waveform.points.map(p => Math.abs(p.y))),
                    harmonicCount: harmonics.length
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `声音波形: f=${f}Hz, T=${T_ms.toFixed(2)}ms, A=${A}, type=${waveLabel}`,
                steps,
                formulas: [
                    {
                        name: '简谐',
                        formula: 'x(t) = A*sin(2*pi*f*t)',
                        variables: { A: { value: A, unit: '' }, f: { value: f, unit: 'Hz' } }
                    },
                    { name: '周期频率', formula: 'T = 1/f', variables: { T: { value: T_ms, unit: 'ms' } } }
                ]
            },
            errors: [],
            warnings
        };
    }
}

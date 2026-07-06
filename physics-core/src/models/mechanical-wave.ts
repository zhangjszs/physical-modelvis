import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 机械波模型 — 横波 / 纵波 / 干涉 (选必一 第三章)
 *
 * 把介质离散为 N 个质点沿 x 轴排列，相邻质点相位差 Δφ = 2π·dx/λ
 *   横波: 质点沿 y 轴振    yᵢ(t) = A·sin(ω·t − k·xᵢ)
 *   纵波: 质点沿 x 轴振    xᵢ(t) = x₀ + A·sin(ω·t − k·xᵢ)
 *   干涉: 两列波叠加 y = y₁ + y₂
 *
 * 质点数量: 沿 x 方向 N = 81 个 (典型绳长 ~2m)
 */
export class MechanicalWaveModel extends PhysicsModelBase {
    readonly name = '机械波';
    readonly version = '1.0.0';
    readonly description = '横波 / 纵波传播、波的叠加 (干涉)';
    readonly modelType = 'mechanical-wave' as const;
    readonly assumptions = [
        '介质为线性、均匀、连续',
        '小振幅近似 (回复力与位移成正比)',
        '无能量损耗',
        '质点仅在平衡位置附近振动，不随波迁移'
    ];
    readonly applicableRange = '简谐横波/纵波的传播演示、波的叠加 (干涉相长/相消)';
    readonly errorSources = ['实际有阻尼 → 波幅随距离衰减', '离散质点数有限 → 波动近似误差'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'amplitude', description: '振幅 A (m)', unit: 'm', required: true, min: 0 },
        { name: 'frequency', description: '频率 f (Hz)', unit: 'Hz', required: true, min: 0 },
        { name: 'wavelength', description: '波长 λ (m)', unit: 'm', required: true, min: 0 },
        { name: 'duration', description: '模拟时长 (s)', unit: 's', required: true, min: 0 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const wc = problem.constraints?.wave;
        if (!wc) throw new Error('mechanical-wave 模型需要 wave 约束配置');

        const A = wc.amplitude;
        const f = wc.frequency;
        const lambda = wc.wavelength;
        const mode = wc.mode ?? 'transverse'; // 'transverse' | 'longitudinal' | 'interference'
        const N = wc.particleCount ?? 81;
        const xStart = wc.xStart ?? -1;
        const xEnd = wc.xEnd ?? 3;
        const waveSpeed = f * lambda;
        const omega = 2 * Math.PI * f;
        const k = (2 * Math.PI) / lambda;
        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 300;
        const dt = duration / sampleCount;

        // 第二列波参数 (干涉模式)
        const A2 = wc.amplitude2 ?? A;
        const phi2 = wc.phaseDiff ?? Math.PI; // 波2 相对波1 的相位差
        const dir2 = wc.direction2 ?? -1; // +1 = 同向传播; -1 = 反向 (对向干涉)

        // 质点平衡位置
        const dx = (xEnd - xStart) / (N - 1);
        const x0: number[] = [];
        for (let i = 0; i < N; i++) x0.push(xStart + i * dx);

        // 选取 9 个等间距代表质点记录振动轨迹 (y-t 图)
        const tracked = [
            0,
            Math.floor(N / 8),
            Math.floor(N / 4),
            Math.floor((3 * N) / 8),
            Math.floor(N / 2),
            Math.floor((5 * N) / 8),
            Math.floor((3 * N) / 4),
            Math.floor((7 * N) / 8),
            N - 1
        ];
        const trajs: TrajectoryPoint[][] = tracked.map(() => []);

        // 波形快照: 把某一时刻的所有 N 个质点位置打包成一条「轨迹」放入 trajectories 末尾
        // 注意：waveSnapshot 中的 TrajectoryPoint.t 字段存的是该质点的 x 坐标 (暂存技巧)
        //       图表 x 坐标使用 position.x, t 字段仅在渲染端标记用
        const waveSnapshot: TrajectoryPoint[] = [];

        for (let s = 0; s <= sampleCount; s++) {
            const t = s * dt;
            const allPoints: TrajectoryPoint[] = [];
            for (let i = 0; i < N; i++) {
                const xEq = x0[i]!;
                const phase1 = omega * t - k * xEq;
                const y1 = A * Math.sin(phase1);
                const y2 = mode === 'interference' ? A2 * Math.sin(omega * t + dir2 * k * xEq + phi2) : 0;
                const y = y1 + y2;

                const pos = mode === 'longitudinal' ? { x: xEq + y, y: 0 } : { x: xEq, y: -y }; // 屏幕 y 向下, 物理位移 y 为正则屏幕 y 减小
                // 速度 (解析微分)
                const vPhase1 = A * omega * Math.cos(phase1);
                const vPhase2 = mode === 'interference' ? A2 * omega * Math.cos(omega * t + dir2 * k * xEq + phi2) : 0;
                const vTotal = vPhase1 + vPhase2;
                const vel = mode === 'longitudinal' ? { x: vTotal, y: 0 } : { x: 0, y: -vTotal };

                const speed = Math.abs(vTotal);
                const ke = 0.5 * (problem.bodies[0]?.mass.value ?? 1) * speed * speed;
                const pt: TrajectoryPoint = { t, position: pos, velocity: vel, kineticEnergy: ke, potentialEnergy: 0 };
                allPoints.push(pt);
            }

            // 存储被追踪质点
            for (let ti = 0; ti < tracked.length; ti++) {
                const idx = tracked[ti]!;
                trajs[ti]!.push(allPoints[idx]!);
            }
        }

        // 最后一个采样点作为典型波形存入 waveSnapshot
        {
            const t = duration;
            for (let i = 0; i < N; i++) {
                const xEq = x0[i]!;
                const phase1 = omega * t - k * xEq;
                const y1 = A * Math.sin(phase1);
                const y2 = mode === 'interference' ? A2 * Math.sin(omega * t + dir2 * k * xEq + phi2) : 0;
                const y = y1 + y2;
                waveSnapshot.push({
                    t: xEq, // 用 t 字段暂存 x 坐标 (展示时直接读取 position)
                    position: { x: xEq, y: mode === 'longitudinal' ? y : -y },
                    velocity: { x: 0, y: 0 },
                    kineticEnergy: 0,
                    potentialEnergy: 0
                });
            }
        }

        const keyframes: Keyframe[] = [];
        keyframes.push({
            label: 't = 0',
            t: 0,
            position: trajs[0]![0]!.position,
            velocity: trajs[0]![0]!.velocity,
            description: `${mode === 'transverse' ? '横波' : mode === 'longitudinal' ? '纵波' : '干涉'}: A=${A.toFixed(2)}m, f=${f.toFixed(1)}Hz, λ=${lambda.toFixed(2)}m`
        });

        // 图谱: 波形快照 (y vs x 在特定时刻)
        const wave_t: ChartSeries = {
            xLabel: '位置 x',
            yLabel: '位移 y',
            xUnit: 'm',
            yUnit: 'm',
            points: waveSnapshot.map(p => ({ x: p.position.x, y: p.position.y }))
        };
        // 特定质点的 y-t 振动图 (取中间质点)
        const midIdx = Math.floor(trajs.length / 2);
        const y_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '质点位移',
            xUnit: 's',
            yUnit: 'm',
            points: trajs[midIdx]!.map(p => ({ x: p.t, y: p.position.y }))
        };
        // 波速-波长-频率关系 (常量)
        const v_t: ChartSeries = {
            xLabel: '时间',
            yLabel: '波速 v',
            xUnit: 's',
            yUnit: 'm/s',
            points: trajs[0]!.map(p => ({ x: p.t, y: waveSpeed }))
        };

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '波速公式',
                formula: 'v = f·λ',
                calculation: `v = ${f.toFixed(2)} × ${lambda.toFixed(2)} = ${waveSpeed.toFixed(2)} m/s`
            },
            {
                order: 2,
                description: '波数 k',
                formula: 'k = 2π/λ',
                calculation: `k = 2π/${lambda.toFixed(2)} = ${k.toFixed(2)} rad/m`
            },
            {
                order: 3,
                description: '角频率 ω',
                formula: 'ω = 2πf',
                calculation: `ω = 2π×${f.toFixed(2)} = ${omega.toFixed(2)} rad/s`
            },
            {
                order: 4,
                description:
                    mode === 'interference'
                        ? '干涉叠加'
                        : mode === 'longitudinal'
                          ? '纵波: 振动方向与传播方向平行'
                          : '横波: 振动方向与传播方向垂直',
                formula: mode === 'interference' ? 'y = y₁ + y₂ = A₁sin(ωt−kx) + A₂sin(ωt+kx+φ)' : 'y = A·sin(ωt − kx)'
            }
        ];

        return {
            meta: {
                model: 'mechanical-wave',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [...trajs, waveSnapshot],
            keyframes,
            charts: { wave_t, y_t, v_t },
            diagnostics: {
                conservedQuantities: [],
                maxValues: { waveSpeed, wavelength: lambda, frequency: f, wavenumber: k, angularFreq: omega },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `${mode === 'transverse' ? '横波' : mode === 'longitudinal' ? '纵波' : '波的干涉'}: v=${waveSpeed.toFixed(2)}m/s, f=${f.toFixed(1)}Hz, λ=${lambda.toFixed(2)}m, A=${A.toFixed(2)}m`,
                steps,
                formulas: [
                    {
                        name: '波速公式',
                        formula: 'v = f·λ',
                        variables: {
                            v: { value: waveSpeed, unit: 'm/s' },
                            f: { value: f, unit: 'Hz' },
                            λ: { value: lambda, unit: 'm' }
                        }
                    },
                    {
                        name: '波形方程',
                        formula: 'y = A·sin(ωt − kx)',
                        variables: {
                            A: { value: A, unit: 'm' },
                            ω: { value: omega, unit: 'rad/s' },
                            k: { value: k, unit: 'rad/m' }
                        }
                    }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

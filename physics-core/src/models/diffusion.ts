import type { PhysicsProblem , DiffusionConstraint} from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 分子扩散约束 — 菲克定律 (选必三 热学/物质状态)
 *
 * 一维扩散: MSD = 2·D·t
 * 高斯浓度分布: C(x,t) = (N / sqrt(4*pi*D*t)) * exp(-x^2 / (4*D*t))
 */
/**
 * 分子扩散模型 — 菲克定律 (选必三 热学/物质状态)
 *
 * 物理原理：
 *   一维扩散均方位移: MSD = 2·D·t
 *   高斯浓度分布: C(x,t) = (N / sqrt(4·pi·D·t)) · exp(-x² / (4·D·t))
 *   扩散系数温度依赖: D ∝ T^(3/2) (气体), D ∝ T (液体, Stokes-Einstein)
 */
export class DiffusionModel extends PhysicsModelBase {
    readonly name = '分子扩散';
    readonly version = '1.0.0';
    readonly description = '菲克定律: MSD=2Dt, 高斯浓度分布';
    readonly modelType = 'diffusion' as const;
    readonly assumptions = [
        '一维扩散 (简化)',
        '均匀介质, 各向同性',
        '粒子间无相互作用 (稀释近似)',
        '扩散系数在模拟过程中恒定'
    ];
    readonly applicableRange = '常温常压下的气体/液体扩散';
    readonly errorSources = ['实际扩散可能受对流影响', '边界效应 (有限区域)', '温度梯度引起的热扩散'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'temperature', description: '温度 T (K)', unit: 'K', required: true, min: 200, max: 1000 },
        { name: 'mode', description: '扩散介质 (gas/liquid)', unit: '', required: true },
        { name: 'particleCount', description: '粒子数 N', unit: '', required: true, min: 10, max: 10000 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const dc = problem.constraints?.diffusion;
        if (!dc) throw new Error('diffusion 模型需要 diffusion 约束配置');

        const T = dc.temperature;
        const mode = dc.mode;
        const N = dc.particleCount;
        const gridSize = dc.gridSize ?? 1e-6;
        const timeSteps = dc.timeSteps ?? 100;

        // 扩散系数 (m^2/s): 气体 ~1e-5, 液体 ~1e-9, 按 T^(3/2) 估算
        const D = dc.diffusionCoeff ?? (mode === 'gas' ? 1e-5 * Math.pow(T / 300, 1.5) : 1e-9 * Math.pow(T / 300, 1.5));

        // 特征扩散时间 (扩散到 gridSize 的时间量级)
        const tSample = (gridSize * gridSize) / (6 * D);

        // 浓度分布 (高斯): C(x,t) 在 t = tSample 时
        const concentrationProfile: ChartSeries = {
            xLabel: '位置 x (μm)',
            yLabel: '浓度 C (a.u.)',
            xUnit: 'μm',
            yUnit: 'a.u.',
            points: []
        };
        const Nx = 100;
        for (let i = 0; i <= Nx; i++) {
            const x = -gridSize + (2 * gridSize * i) / Nx;
            const C = (N / Math.sqrt(4 * Math.PI * D * tSample)) * Math.exp((-x * x) / (4 * D * tSample));
            concentrationProfile.points.push({
                x: parseFloat((x * 1e6).toFixed(4)),
                y: parseFloat(C.toFixed(4))
            });
        }

        // MSD vs t: MSD = 2*D*t (1D)
        const msdCurve: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: '均方位移 MSD (μm²)',
            xUnit: 's',
            yUnit: 'μm²',
            points: []
        };
        for (let i = 0; i <= timeSteps; i++) {
            const t = (tSample * i) / timeSteps;
            const MSD = 2 * D * t;
            msdCurve.points.push({
                x: parseFloat(t.toFixed(6)),
                y: parseFloat((MSD * 1e12).toFixed(6))
            });
        }

        // 静态轨迹 (单帧)
        const trajectory: TrajectoryPoint[] = [
            {
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            }
        ];

        const keyframes: Keyframe[] = [
            {
                label: '初始时刻',
                t: 0,
                position: { x: 0, y: N },
                velocity: { x: 0, y: 0 },
                description: `t=0: 所有粒子集中在 x=0, C(0,0)→∞ (δ函数)`
            },
            {
                label: '扩散进行中',
                t: tSample,
                position: {
                    x: parseFloat((gridSize * 1e6).toFixed(3)),
                    y: parseFloat((N / Math.sqrt(4 * Math.PI * D * tSample)).toFixed(1))
                },
                velocity: { x: 0, y: 0 },
                description: `t=${tSample.toExponential(2)}s: 高斯展宽, MSD=${(2 * D * tSample * 1e12).toFixed(3)} μm²`
            }
        ];

        const warnings: string[] = [];
        if (T > 800) warnings.push('高温下扩散系数估算偏差增大');
        if (N < 100) warnings.push('粒子数较少, 统计涨落显著');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '扩散系数',
                formula: 'D = D₀·(T/T₀)^(3/2)',
                calculation: `D = ${D.toExponential(3)} m²/s (${mode === 'gas' ? '气体' : '液体'}, T=${T}K)`
            },
            {
                order: 2,
                description: '均方位移 (1D 扩散)',
                formula: 'MSD = 2·D·t',
                calculation: `t=${tSample.toExponential(2)}s → MSD=${(2 * D * tSample * 1e12).toFixed(3)} μm²`
            },
            {
                order: 3,
                description: '高斯浓度分布',
                formula: 'C(x,t) = (N / sqrt(4πDt)) · exp(-x²/(4Dt))',
                result: `峰值 C(0,t) = ${(N / Math.sqrt(4 * Math.PI * D * tSample)).toFixed(1)} a.u.`
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t: concentrationProfile, y_t: msdCurve },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    temperature: T,
                    diffusionCoeff: D,
                    particleCount: N,
                    gridSize,
                    tSample,
                    peakConcentration: N / Math.sqrt(4 * Math.PI * D * tSample),
                    finalMSD: 2 * D * tSample
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `分子扩散: T=${T}K, mode=${mode}, D=${D.toExponential(2)} m²/s, N=${N}, MSD(t=${tSample.toExponential(1)}s)=${(2 * D * tSample * 1e12).toFixed(2)} μm²`,
                steps,
                formulas: [
                    {
                        name: '均方位移',
                        formula: 'MSD = 2Dt',
                        variables: {
                            D: { value: D, unit: 'm²/s' },
                            t: { value: tSample, unit: 's' },
                            MSD: { value: 2 * D * tSample, unit: 'm²' }
                        }
                    },
                    {
                        name: '高斯分布',
                        formula: 'C(x,t) = (N/√(4πDt))·exp(-x²/(4Dt))',
                        variables: {
                            N: { value: N, unit: '个' },
                            D: { value: D, unit: 'm²/s' },
                            t: { value: tSample, unit: 's' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

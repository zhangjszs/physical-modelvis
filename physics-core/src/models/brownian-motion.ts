import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 布朗运动约束 — 选必三 分子运动
 *
 * 随机游走: x(t+dt) = x(t) + sqrt(2D·dt) · randn
 * Stokes-Einstein: D = kT / (6·pi·eta·r)
 */
/**
 * 布朗运动模型 — 选必三 分子运动
 *
 * 物理原理：
 *   Stokes-Einstein 扩散系数: D = kT / (6·pi·eta·r)
 *   随机游走: x(t+dt) = x(t) + sqrt(2D·dt) · xi (xi ~ N(0,1))
 *   均方位移: MSD = 2·D·t (1D), 4·D·t (2D)
 *
 * 使用伪随机 (sin 函数技巧) 保证 Vitest 可重现
 */
export class BrownianMotionModel extends PhysicsModelBase {
    readonly name = '布朗运动';
    readonly version = '1.0.0';
    readonly description = 'Stokes-Einstein 扩散 + 随机游走轨迹';
    readonly modelType = 'brownian-motion' as const;
    readonly assumptions = ['液体不可压缩且均匀', '粒子为刚性小球', '低雷诺数 (Stokes 阻力适用)', '粒子间无相互作用'];
    readonly applicableRange = '胶体粒子 (r ~ 0.1–10 μm), 液体温度 250–350 K';
    readonly errorSources = ['液体对流扰动', '粒子非球形', '壁效应 (边界附近)'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'particleRadius', description: '粒子半径 r (m)', unit: 'm', required: true, min: 1e-8, max: 1e-3 },
        { name: 'liquidTemp', description: '液体温度 T (K)', unit: 'K', required: true, min: 250, max: 350 },
        { name: 'fluidViscosity', description: '液体粘度 eta (Pa·s)', unit: 'Pa·s', required: true, min: 1e-4, max: 1 },
        { name: 'duration', description: '模拟时长 (s)', unit: 's', required: true, min: 0.1, max: 100 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const bc = problem.constraints?.brownianMotion;
        if (!bc) throw new Error('brownian-motion 模型需要 brownianMotion 约束配置');

        const r = bc.particleRadius;
        const T = bc.liquidTemp;
        const eta = bc.fluidViscosity;
        const duration = bc.duration;
        const dt = bc.dt ?? 0.01;
        const nParticles = bc.nParticles ?? 1;

        const kB = 1.381e-23; // J/K
        // Stokes-Einstein 扩散系数
        const D = (kB * T) / (6 * Math.PI * eta * r);

        const nSteps = Math.floor(duration / dt);
        const step = Math.max(1, Math.floor(nSteps / 500)); // 最多 500 个轨迹点

        // 生成多条粒子轨迹 (伪随机, 可重现)
        const trajectories: TrajectoryPoint[][] = [];
        for (let p = 0; p < nParticles; p++) {
            const seed = (p + 1) * 7;
            const traj: TrajectoryPoint[] = [];
            let x = 0,
                y = 0;
            traj.push({
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            });
            for (let i = 1; i <= nSteps; i += step) {
                const t = i * dt;
                // 伪随机高斯近似 (Box-Muller 简化: 用 sin 技巧)
                const u1 = Math.abs(Math.sin(seed * i * 12.9898) * 43758.5453) % 1;
                const u2 = Math.abs(Math.sin(seed * i * 78.233) * 43758.5453) % 1;
                const u3 = Math.abs(Math.sin(seed * i * 45.164) * 43758.5453) % 1;
                const u4 = Math.abs(Math.sin(seed * i * 91.725) * 43758.5453) % 1;
                // 避免 u1/u3 = 0
                const safeU1 = u1 < 1e-10 ? 1e-10 : u1;
                const safeU3 = u3 < 1e-10 ? 1e-10 : u3;
                const xiX = Math.sqrt(-2 * Math.log(safeU1)) * Math.cos(2 * Math.PI * u2);
                const xiY = Math.sqrt(-2 * Math.log(safeU3)) * Math.cos(2 * Math.PI * u4);
                const sigma = Math.sqrt(2 * D * dt * step);
                x += sigma * xiX;
                y += sigma * xiY;
                traj.push({
                    t: parseFloat(t.toFixed(4)),
                    position: { x: parseFloat(x.toFixed(8)), y: parseFloat(y.toFixed(8)) },
                    velocity: {
                        x: parseFloat(((sigma * xiX) / (dt * step)).toFixed(6)),
                        y: parseFloat(((sigma * xiY) / (dt * step)).toFixed(6))
                    },
                    kineticEnergy: 0,
                    potentialEnergy: 0
                });
            }
            trajectories.push(traj);
        }

        // 图表: x 位置 vs 时间 (第一条粒子)
        const xSeries: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: 'x 位置 (μm)',
            xUnit: 's',
            yUnit: 'μm',
            points: trajectories[0].map(p => ({
                x: parseFloat(p.t.toFixed(4)),
                y: parseFloat((p.position.x * 1e6).toFixed(4))
            }))
        };
        const ySeries: ChartSeries = {
            xLabel: '时间 t (s)',
            yLabel: 'y 位置 (μm)',
            xUnit: 's',
            yUnit: 'μm',
            points: trajectories[0].map(p => ({
                x: parseFloat(p.t.toFixed(4)),
                y: parseFloat((p.position.y * 1e6).toFixed(4))
            }))
        };

        const finalPos = trajectories[0][trajectories[0].length - 1].position;
        const finalR2 = finalPos.x * finalPos.x + finalPos.y * finalPos.y;
        const theoreticalMSD = 4 * D * duration;

        const keyframes: Keyframe[] = [
            {
                label: '起点',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: '粒子从原点释放'
            },
            {
                label: '终点',
                t: duration,
                position: {
                    x: parseFloat((finalPos.x * 1e6).toFixed(3)),
                    y: parseFloat((finalPos.y * 1e6).toFixed(3))
                },
                velocity: { x: 0, y: 0 },
                description: `t=${duration}s: r²=${(finalR2 * 1e12).toFixed(3)} μm², 理论 4Dt=${(theoreticalMSD * 1e12).toFixed(3)} μm²`
            }
        ];

        const warnings: string[] = [];
        if (r < 1e-7) warnings.push('粒子过小, 连续介质假设可能失效');
        if (T > 340) warnings.push('温度较高, 液体粘度可能显著变化');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: 'Stokes-Einstein 扩散系数',
                formula: 'D = kT / (6·π·η·r)',
                calculation: `D = ${kB.toExponential(2)}×${T} / (6π×${eta}×${r.toExponential(2)}) = ${D.toExponential(3)} m²/s`
            },
            {
                order: 2,
                description: '随机游走步长',
                formula: 'σ = sqrt(2·D·Δt)',
                calculation: `σ = sqrt(2×${D.toExponential(2)}×${dt}) = ${Math.sqrt(2 * D * dt).toExponential(3)} m`
            },
            {
                order: 3,
                description: '均方位移 (2D)',
                formula: 'MSD = 4·D·t',
                calculation: `t=${duration}s → MSD = ${(4 * D * duration * 1e12).toFixed(3)} μm²`
            }
        ];

        return {
            meta: this.makeMeta('numerical'),
            trajectories,
            keyframes,
            charts: { x_t: xSeries, y_t: ySeries },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    particleRadius: r,
                    liquidTemp: T,
                    fluidViscosity: eta,
                    diffusionCoeff: D,
                    duration,
                    dt,
                    nParticles,
                    nSteps,
                    finalR2,
                    theoreticalMSD
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `布朗运动: r=${r.toExponential(1)}m, T=${T}K, η=${eta}Pa·s, D=${D.toExponential(2)}m²/s, ${duration}s 后 r²=${(finalR2 * 1e12).toFixed(2)}μm²`,
                steps,
                formulas: [
                    {
                        name: 'Stokes-Einstein',
                        formula: 'D = kT/(6πηr)',
                        variables: {
                            k: { value: kB, unit: 'J/K' },
                            T: { value: T, unit: 'K' },
                            eta: { value: eta, unit: 'Pa·s' },
                            r: { value: r, unit: 'm' }
                        }
                    },
                    {
                        name: '均方位移 2D',
                        formula: 'MSD = 4Dt',
                        variables: { D: { value: D, unit: 'm²/s' }, t: { value: duration, unit: 's' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

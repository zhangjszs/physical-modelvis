import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 分子间作用力约束 — Lennard-Jones 势 (选必三 分子运动)
 *
 * U(r) = 4·eps·[(sigma/r)^12 - (sigma/r)^6]
 * F(r) = -dU/dr = 4·eps·[12·sigma^12/r^13 - 6·sigma^6/r^7]
 *      = (24·eps/r)·[2·(sigma/r)^12 - (sigma/r)^6]
 */
/**
 * 分子间作用力模型 — Lennard-Jones 势 (选必三 分子运动)
 *
 * 物理原理：
 *   势函数: U(r) = 4·eps·[(sigma/r)^12 - (sigma/r)^6]
 *   力函数: F(r) = (24·eps/r)·[2·(sigma/r)^12 - (sigma/r)^6]
 *   平衡位置: r_eq = 2^(1/6)·sigma ≈ 1.122·sigma (F=0, U=-eps)
 *   截断距离: r > 3·sigma 时 U ≈ 0
 */
export class MolecularForceModel extends PhysicsModelBase {
    readonly name = '分子间作用力';
    readonly version = '1.0.0';
    readonly description = 'Lennard-Jones 势: U(r)=4ε[(σ/r)^12-(σ/r)^6]';
    readonly modelType = 'molecular-force' as const;
    readonly assumptions = [
        '分子对心碰撞 (一维径向运动)',
        '分子为球形对称',
        'Lennard-Jones 势描述范德瓦耳斯作用',
        '不考虑取向依赖性'
    ];
    readonly applicableRange = '惰性气体分子 (sigma ~ 0.3–0.5 nm, eps ~ 10^-21–10^-20 J)';
    readonly errorSources = ['实际分子势不完全符合 LJ 形式', '多体效应被忽略', '温度对势参数的影响'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'epsilon', description: '势阱深度 eps (J)', unit: 'J', required: true, min: 1e-22, max: 1e-18 },
        { name: 'sigma', description: '分子直径 sigma (m)', unit: 'm', required: true, min: 1e-10, max: 1e-8 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const mc = problem.constraints?.molecularForce;
        if (!mc) throw new Error('molecular-force 模型需要 molecularForce 约束配置');

        const eps = mc.epsilon;
        const sigma = mc.sigma;
        const rMin = mc.rMin ?? 0.8 * sigma;
        const rMax = mc.rMax ?? 4 * sigma;
        const N = mc.sampleCount ?? 200;

        // 势函数 U(r)
        const potentialCurve: ChartSeries = {
            xLabel: '分子间距 r (nm)',
            yLabel: '势能 U (10^-21 J)',
            xUnit: 'nm',
            yUnit: '10^-21 J',
            points: []
        };
        // 力函数 F(r) (正=斥力, 负=引力)
        const forceCurve: ChartSeries = {
            xLabel: '分子间距 r (nm)',
            yLabel: '作用力 F (10^-12 N)',
            xUnit: 'nm',
            yUnit: '10^-12 N',
            points: []
        };

        const rEq = Math.pow(2, 1 / 6) * sigma; // 平衡位置
        const UAtEq = -eps; // 平衡位置势能

        for (let i = 0; i <= N; i++) {
            const r = rMin + ((rMax - rMin) * i) / N;
            const sr6 = Math.pow(sigma / r, 6);
            const sr12 = sr6 * sr6;
            const U = 4 * eps * (sr12 - sr6);
            const F = ((24 * eps) / r) * (2 * sr12 - sr6); // 正=斥力
            potentialCurve.points.push({
                x: parseFloat((r * 1e9).toFixed(4)),
                y: parseFloat((U * 1e21).toFixed(4))
            });
            forceCurve.points.push({
                x: parseFloat((r * 1e9).toFixed(4)),
                y: parseFloat((F * 1e12).toFixed(4))
            });
        }

        // 静态轨迹 (单帧)
        const trajectory: TrajectoryPoint[] = [
            {
                t: 0,
                position: { x: rEq * 1e9, y: UAtEq * 1e21 },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: UAtEq
            }
        ];

        const keyframes: Keyframe[] = [
            {
                label: '平衡位置',
                t: 0,
                position: { x: parseFloat((rEq * 1e9).toFixed(3)), y: parseFloat((UAtEq * 1e21).toFixed(3)) },
                velocity: { x: 0, y: 0 },
                description: `r_eq=2^(1/6)·sigma=${(rEq * 1e9).toFixed(3)}nm, F=0, U=-eps=${(UAtEq * 1e21).toFixed(3)}×10⁻²¹J`
            },
            {
                label: '势阱深度',
                t: 0,
                position: { x: parseFloat((sigma * 1e9).toFixed(3)), y: 0 },
                velocity: { x: 0, y: 0 },
                description: `r=sigma: U=0 (势阱边缘), eps=${(eps * 1e21).toFixed(3)}×10⁻²¹J`
            }
        ];

        const warnings: string[] = [];
        if (rMin < 0.9 * sigma) warnings.push('r_min 过小, 斥力极大, 实际分子会被压缩');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: 'Lennard-Jones 势',
                formula: 'U(r) = 4ε[(σ/r)^12 - (σ/r)^6]',
                calculation: `eps=${(eps * 1e21).toFixed(2)}×10⁻²¹J, sigma=${(sigma * 1e9).toFixed(3)}nm`
            },
            {
                order: 2,
                description: '平衡位置',
                formula: 'r_eq = 2^(1/6)·σ ≈ 1.122·σ',
                calculation: `r_eq = ${(rEq * 1e9).toFixed(3)} nm, U(r_eq) = -eps = ${(UAtEq * 1e21).toFixed(3)}×10⁻²¹J`
            },
            {
                order: 3,
                description: '分子力',
                formula: 'F(r) = (24ε/r)·[2(σ/r)^12 - (σ/r)^6]',
                result: 'F>0 斥力 (r<r_eq), F<0 引力 (r>r_eq)'
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t: potentialCurve, y_t: forceCurve },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    epsilon: eps,
                    sigma,
                    rEq,
                    UAtEq,
                    rMin,
                    rMax,
                    sampleCount: N
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `Lennard-Jones 势: eps=${(eps * 1e21).toFixed(2)}×10⁻²¹J, sigma=${(sigma * 1e9).toFixed(3)}nm, r_eq=${(rEq * 1e9).toFixed(3)}nm`,
                steps,
                formulas: [
                    {
                        name: 'LJ 势',
                        formula: 'U(r)=4ε[(σ/r)^12-(σ/r)^6]',
                        variables: { epsilon: { value: eps, unit: 'J' }, sigma: { value: sigma, unit: 'm' } }
                    },
                    {
                        name: '平衡位置',
                        formula: 'r_eq=2^(1/6)·σ',
                        variables: { sigma: { value: sigma, unit: 'm' }, rEq: { value: rEq, unit: 'm' } }
                    },
                    {
                        name: '分子力',
                        formula: 'F(r)=(24ε/r)·[2(σ/r)^12-(σ/r)^6]',
                        variables: { epsilon: { value: eps, unit: 'J' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

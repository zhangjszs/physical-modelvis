import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 电磁感应模型 — 选必二 第二章
 *
 * 法拉第电磁感应定律: ε = −N·dΦ/dt
 * 磁通量 Φ = B·A·cosθ
 *
 * 切割情景: ε = B·L·v (导线垂直切割磁感线)
 *
 * 本模型计算静态参数：
 *   给定 B, A, N, θ → Φ
 *   给定 B, L, v, θ → ε_cutting
 *   θ 变化时 → 交变磁通量
 */

export class EMInductionModel extends PhysicsModelBase {
    readonly name = '电磁感应';
    readonly version = '1.0.0';
    readonly description = '法拉第定律 ε=−NdΦ/dt、磁通量 Φ=BAcosθ、切割 ε=BLv';
    readonly modelType = 'em-induction' as const;
    readonly assumptions = [
        '匀强磁场',
        '平面线圈法线方向 n 与 B 的夹角 θ = ωt (匀速转动)',
        '导线与速度、磁场三者两两垂直 (切割模式)'
    ];
    readonly applicableRange = '经典电磁学; 非相对论速度';
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'magneticField', description: '磁感应强度 B (T)', unit: 'T', required: true, min: 0.001, max: 10 },
        { name: 'area', description: '面积 A (m²)', unit: 'm²', required: true, min: 0.0001, max: 10 }
    ];
    readonly errorSources: string[] = [];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const ec = problem.constraints?.emInduction;
        if (!ec) throw new Error('em-induction 模型需要 emInduction 约束配置');

        const B = ec.magneticField;
        const A = ec.area;
        const N = ec.turns ?? 1;
        const thetaDeg = ec.angleDeg ?? 0;
        const thetaRad = (thetaDeg * Math.PI) / 180;

        // 静态磁通量
        const flux = B * A * Math.cos(thetaRad); // Wb
        const fluxTotal = N * flux; // N 匝

        // 切割电动势 (若提供切割参数)
        const hasCutting = (ec.cuttingLength ?? 0) > 0 && (ec.cuttingVelocity ?? 0) > 0;
        const emfCutting = hasCutting ? B * ec.cuttingLength! * ec.cuttingVelocity! : 0;

        // 交变磁通量 Φ-t 曲线: θ = ωt, 假设角频率 ω=2π·50Hz
        const omega = 2 * Math.PI * 50;
        const flux_t: ChartSeries = {
            xLabel: '时间 t (ms)',
            yLabel: '磁通量 Φ (mWb)',
            xUnit: 'ms',
            yUnit: 'mWb',
            points: []
        };
        const T = 1 / 50;
        const steps = 200;
        for (let i = 0; i <= steps; i++) {
            const t = (T * i) / steps;
            const theta = omega * t;
            const phi = B * A * Math.cos(theta);
            flux_t.points.push({ x: parseFloat((t * 1e3).toFixed(3)), y: parseFloat((phi * 1e3).toFixed(4)) });
        }

        // 感应电动势 ε = −N·dΦ/dt = N·B·A·ω·sin(ωt)
        const emf_t: ChartSeries = {
            xLabel: '时间 t (ms)',
            yLabel: '感应电动势 ε (mV)',
            xUnit: 'ms',
            yUnit: 'mV',
            points: []
        };
        for (let i = 0; i <= steps; i++) {
            const t = (T * i) / steps;
            const theta = omega * t;
            const epsilon = N * B * A * omega * Math.sin(theta);
            emf_t.points.push({ x: parseFloat((t * 1e3).toFixed(3)), y: parseFloat((epsilon * 1e3).toFixed(4)) });
        }

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '静态磁通量',
                t: 0,
                position: { x: thetaDeg, y: fluxTotal * 1e3 }, // mWb
                velocity: { x: 0, y: 0 },
                description: `Φ = N·B·A·cosθ = ${N}×${B}×${A}×cos${thetaDeg}° = ${(fluxTotal * 1e3).toFixed(3)} mWb`
            }
        ];
        if (hasCutting) {
            keyframes.push({
                label: '切割电动势',
                t: 0,
                position: { x: ec.cuttingVelocity!, y: emfCutting },
                velocity: { x: 0, y: 0 },
                description: `ε = B·L·v = ${B}×${ec.cuttingLength}×${ec.cuttingVelocity} = ${emfCutting.toFixed(3)} V`
            });
        }

        const trajectory: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }
        ];

        const warnings: string[] = [];
        if (Math.abs(emfCutting) > 1000) warnings.push('高电压, 实际电器应用才达此值');

        const stepsExpl: ExplanationStep[] = [
            {
                order: 1,
                description: '磁通量',
                formula: 'Φ = B·A·cosθ',
                calculation: `Φ = ${B} × ${A} × cos${thetaDeg}° = ${(flux * 1e3).toFixed(4)} mWb`
            },
            {
                order: 2,
                description: '法拉第电磁感应定律',
                formula: 'ε = −N·dΦ/dt',
                result: `N=${N} 匝时 ε = ${(N * B * A * omega).toFixed(2)}·sin(ωt) V`
            }
        ];
        if (hasCutting) {
            stepsExpl.push({
                order: 3,
                description: '切割情景',
                formula: 'ε = B·L·v',
                calculation: `ε = ${B}×${ec.cuttingLength}×${ec.cuttingVelocity} = ${emfCutting.toFixed(3)} V`
            });
        }

        return {
            meta: {
                model: 'em-induction',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: { x_t: flux_t, y_t: emf_t },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    magneticField: B,
                    area: A,
                    turns: N,
                    flux: flux,
                    fluxTotal,
                    hasCutting: hasCutting ? 1 : 0,
                    emfCutting,
                    emfPeak: N * B * A * omega,
                    angularFreq: omega
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: hasCutting
                    ? `电磁感应: Φ=${(fluxTotal * 1e3).toFixed(2)}mWb, 切割 ε=${emfCutting.toFixed(3)}V`
                    : `电磁感应: Φ=${(fluxTotal * 1e3).toFixed(2)}mWb, 交变 ε_peak=${(N * B * A * omega).toFixed(2)}V`,
                steps: stepsExpl,
                formulas: [
                    {
                        name: '法拉第定律',
                        formula: 'ε=−NdΦ/dt',
                        variables: {
                            N: { value: N, unit: '匝' },
                            B: { value: B, unit: 'T' },
                            A: { value: A, unit: 'm²' }
                        }
                    },
                    { name: '磁通量', formula: 'Φ=BAcosθ', variables: { Φ: { value: flux, unit: 'Wb' } } }
                ]
            },
            errors: [],
            warnings
        };
    }
}

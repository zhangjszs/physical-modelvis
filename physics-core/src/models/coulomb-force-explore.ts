import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { PHYSICS_CONSTANTS } from '../units/constants.js';

const K_COULOMB = PHYSICS_CONSTANTS.k.value; // 8.9875517923e9 N·m²/C²

/**
 * 探究电荷间作用力模型 — 必修三 第十二章
 *
 * 控制变量实验: 库仑定律 F = k·|q₁q₂|/r²
 *   模式 varyQ: 固定 r, F vs q (直线), 斜率 = k·q₂/r²
 *   模式 varyR: 固定 q, F vs 1/r² (直线), 斜率 = k·|q₁q₂|
 */
export class CoulombForceExploreModel extends PhysicsModelBase {
    readonly name = '探究电荷间作用力';
    readonly version = '1.0.0';
    readonly description = '库仑定律 F=k|q₁q₂|/r² 控制变量实验: F-q 直线 / F-1/r² 直线';
    readonly modelType = 'coulomb-force-explore' as const;
    readonly assumptions = ['点电荷模型', '电荷分布均匀，电量稳定', '真空介电常数 k 恒定', '控制变量: 一次只变一个量'];
    readonly applicableRange = 'q: 0.01–100 μC; r: 1–100 cm';
    readonly errorSources = ['实际电荷非点模型 (距离很小时失效)', '电荷漏电导致电量漂移', '静电力测量受空气湿度影响'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'q1', description: '电荷 1 (μC)', unit: 'μC', required: true, min: 0.01, max: 100 },
        { name: 'q2', description: '电荷 2 (μC)', unit: 'μC', required: true, min: 0.01, max: 100 },
        { name: 'distance', description: '间距 (cm)', unit: 'cm', required: true, min: 0.1, max: 200 },
        { name: 'mode', description: 'varyQ / varyR', unit: '', required: true }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.coulombForce;
        if (!c) {
            throw new Error('coulomb-force-explore 模型需要 coulombForce 约束配置');
        }

        const q1MuC = c.q1;
        const q2MuC = c.q2;
        const rCm = c.distance;
        const mode: 'varyQ' | 'varyR' = c.mode;
        const sampleCount = c.sampleCount ?? 30;
        const qRange: [number, number] = c.qRange ?? [0.5, 5];
        const rRange: [number, number] = c.rRange ?? [2, 20];

        const q1C = q1MuC * 1e-6;
        const q2C = q2MuC * 1e-6;
        const rM = rCm / 100; // m

        // 基准库仑力 (给定参数)
        const F0 = (K_COULOMB * q1C * q2C) / (rM * rM); // N

        //===== 两种扫描 =====
        const duration = problem.timeConfig.duration;
        const dt = duration / sampleCount;

        let F_q_points: Array<{ x: number; y: number }> = [];
        const F_inv_r2_points: Array<{ x: number; y: number }> = [];
        const trajectory: TrajectoryPoint[] = [];
        const keyframes: Keyframe[] = [];

        if (mode === 'varyQ') {
            // 固定 r, F vs q: q 从 qMin -> qMax (q2 固定为 q2C, q1 从 qRange 扫描)
            // F(q) = k·q·q2/r² → 直线, 斜率 = k·q2/r²
            const qMin = qRange[0]!;
            const qMax = qRange[1]!;
            for (let i = 0; i <= sampleCount; i++) {
                const t = i * dt;
                const q_i = qMin + (qMax - qMin) * (i / sampleCount);
                const q_i_C = q_i * 1e-6;
                const F_i = (K_COULOMB * q_i_C * q2C) / (rM * rM);
                F_q_points = F_q_points || [];
                F_q_points.push({ x: parseFloat(q_i.toFixed(4)), y: parseFloat(F_i.toFixed(6)) });
                trajectory.push({
                    t,
                    position: { x: q_i, y: F_i },
                    velocity: { x: 0, y: 0 },
                    acceleration: { x: q_i_C, y: F_i },
                    kineticEnergy: F_i,
                    potentialEnergy: q_i_C
                });
            }
            // 同时给 F-1/r² 静态图 (固定 q1,q2, 扫描 r)
            const rMin = rRange[0]!;
            const rMax = rRange[1]!;
            for (let i = 0; i <= sampleCount; i++) {
                const r_i = rMin + (rMax - rMin) * (i / sampleCount);
                const r_i_M = r_i / 100;
                const F_i = (K_COULOMB * q1C * q2C) / (r_i_M * r_i_M);
                F_inv_r2_points.push({
                    x: parseFloat((1 / (r_i_M * r_i_M)).toFixed(2)),
                    y: parseFloat(F_i.toFixed(6))
                });
            }

            // 关键帧
            const qMid = (qMin + qMax) / 2;
            const FMid = (K_COULOMB * qMid * 1e-6 * q2C) / (rM * rM);
            const fPoints = F_q_points;
            const pMin = fPoints[0]!;
            const pMax = fPoints[fPoints.length - 1]!;
            keyframes.push(
                {
                    label: 'q 最小',
                    t: 0,
                    position: { x: pMin.x, y: pMin.y },
                    velocity: { x: 0, y: 0 },
                    description: `q₁=${pMin.x}μC → F=${pMin.y.toExponential(3)}N`
                },
                {
                    label: 'q 中值',
                    t: duration / 2,
                    position: { x: qMid, y: FMid },
                    velocity: { x: 0, y: 0 },
                    description: `q₁=${qMid}μC (均值), F≈${FMid.toExponential(3)}N`
                },
                {
                    label: 'q 最大',
                    t: duration,
                    position: { x: pMax.x, y: pMax.y },
                    velocity: { x: 0, y: 0 },
                    description: `q₁=${pMax.x}μC → F=${pMax.y.toExponential(3)}N`
                }
            );
        } else {
            // 模式 varyR: 固定 q1,q2, 扫描 r → F vs 1/r² (直线)
            const rMin = rRange[0]!;
            const rMax = rRange[1]!;
            const slope = K_COULOMB * q1C * q2C; // N·m²
            for (let i = 0; i <= sampleCount; i++) {
                const t = i * dt;
                const r_i = rMin + (rMax - rMin) * (i / sampleCount);
                const r_i_M = r_i / 100;
                const inv_r2 = 1 / (r_i_M * r_i_M);
                const F_i = K_COULOMB * q1C * q2C * inv_r2;
                F_inv_r2_points.push({ x: parseFloat(inv_r2.toFixed(2)), y: parseFloat(F_i.toFixed(6)) });
                trajectory.push({
                    t,
                    position: { x: r_i, y: F_i },
                    velocity: { x: 0, y: 0 },
                    acceleration: { x: inv_r2, y: F_i },
                    kineticEnergy: F_i,
                    potentialEnergy: inv_r2
                });
            }
            // 同时给 F-q 静态图 (固定 r, 扫描 q1)
            const qMin = qRange[0]!;
            const qMax = qRange[1]!;
            for (let i = 0; i <= sampleCount; i++) {
                const q_i = qMin + (qMax - qMin) * (i / sampleCount);
                const F_i = (K_COULOMB * (q_i * 1e-6) * q2C) / (rM * rM);
                F_q_points.push({ x: parseFloat(q_i.toFixed(4)), y: parseFloat(F_i.toFixed(6)) });
            }

            // 关键帧
            const invR2Min = (100 / rMin) * (100 / rMin);
            const invR2Max = (100 / rMax) * (100 / rMax);
            keyframes.push(
                {
                    label: 'r 最小',
                    t: 0,
                    position: { x: rMin, y: F_inv_r2_points[0]!.y },
                    velocity: { x: 0, y: 0 },
                    description: `r=${rMin}cm → F=${F_inv_r2_points[0]!.y.toExponential(3)}N`
                },
                {
                    label: '1/r² 斜率',
                    t: duration / 2,
                    position: { x: 0, y: slope },
                    velocity: {
                        x: invR2Max - invR2Min,
                        y: F_inv_r2_points[F_inv_r2_points.length - 1]!.y - F_inv_r2_points[0]!.y
                    },
                    description: `F-1/r² 斜率 = k·q₁·q₂ = ${slope.toExponential(3)} N·m²`
                },
                {
                    label: 'r 最大',
                    t: duration,
                    position: { x: rMax, y: F_inv_r2_points[F_inv_r2_points.length - 1]!.y },
                    velocity: { x: 0, y: 0 },
                    description: `r=${rMax}cm → F=${F_inv_r2_points[F_inv_r2_points.length - 1]!.y.toExponential(3)}N`
                }
            );
        }

        // ===== 图表 =====
        const F_q: ChartSeries = {
            xLabel: '电荷 q (μC)',
            yLabel: '静电力 F (N)',
            xUnit: 'μC',
            yUnit: 'N',
            points: F_q_points
        };
        const F_inv_r2: ChartSeries = {
            xLabel: '1/r² (m⁻²)',
            yLabel: '静电力 F (N)',
            xUnit: 'm⁻²',
            yUnit: 'N',
            points: F_inv_r2_points
        };

        // 静态示意 diagram: 两点电荷连线 + 库仑力标量 (中心横线 + 红色圆点)
        const scaleLen = 100;
        const staticDiagram: ChartSeries = {
            xLabel: '位置 (相对)',
            yLabel: 'y',
            xUnit: 'px',
            yUnit: 'px',
            points: [
                { x: 0, y: 0 }, // q1 位置 (-r/2 处)
                { x: (rCm * scaleLen) / 100, y: 0 }, // q2 位置
                { x: (rCm * scaleLen) / 200, y: 8 }, // 中点: F 标量点
                { x: 0, y: -8 }, // q1 力矢量 (指向 +x 斥力)
                { x: (rCm * scaleLen) / 100, y: 8 } // q2 力矢量
            ]
        };

        // 实验拟合 k_exp: 由直线 F vs q (varyQ) 或 F vs 1/r² (varyR) 斜率反推
        let k_exp: number;
        if (mode === 'varyQ') {
            const p0 = F_q_points[0]!;
            const p1 = F_q_points[F_q_points.length - 1]!;
            const slope_Fq = (p1.y - p0.y) / (1e-6 * (p1.x - p0.x));
            k_exp = (slope_Fq * (rM * rM)) / q2C;
        } else {
            const p0 = F_inv_r2_points[0]!;
            const p1 = F_inv_r2_points[F_inv_r2_points.length - 1]!;
            const slope_FinvR2 = (p1.y - p0.y) / (p1.x - p0.x);
            k_exp = slope_FinvR2 / (q1C * q2C);
        }

        const slope_Fq =
            mode === 'varyQ'
                ? (F_q_points[F_q_points.length - 1]!.y - F_q_points[0]!.y) /
                  (1e-6 * (F_q_points[F_q_points.length - 1]!.x - F_q_points[0]!.x))
                : (K_COULOMB * q2C) / (rM * rM);
        const slope_FinvR2 =
            mode === 'varyR'
                ? (F_inv_r2_points[F_inv_r2_points.length - 1]!.y - F_inv_r2_points[0]!.y) /
                  (F_inv_r2_points[F_inv_r2_points.length - 1]!.x - F_inv_r2_points[0]!.x)
                : K_COULOMB * q1C * q2C;

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '库仑定律 (基本)',
                formula: 'F = k·|q₁q₂|/r²',
                calculation: `F = ${K_COULOMB.toExponential(3)} × ${q1C.toExponential(3)} × ${q2C.toExponential(3)} / ${rM}² = ${F0.toExponential(3)} N`,
                result: `基准力 F₀ = ${F0.toExponential(3)} N`
            },
            {
                order: 2,
                description: '控制变量 — 控制 r, 改变 q',
                formula: 'F = (k·q₂/r²)·q₁ → 直线, 斜率 = k·q₂/r²',
                calculation: `斜率 = ${K_COULOMB.toExponential(3)} × ${q2C.toExponential(3)} / ${rM}² = ${slope_Fq.toExponential(3)} N/C`,
                result: 'F ∝ q₁'
            },
            {
                order: 3,
                description: '控制变量 — 控制 q, 改变 r',
                formula: 'F = (k·q₁q₂)·(1/r²) → 直线, 斜率 = k·q₁q₂',
                calculation: `斜率 = ${K_COULOMB.toExponential(3)} × ${q1C.toExponential(3)} × ${q2C.toExponential(3)} = ${slope_FinvR2.toExponential(3)} N·m²`,
                result: 'F ∝ 1/r²'
            },
            {
                order: 4,
                description: '实验拟合 k 值',
                formula: 'k_exp = slope / (已知因子)',
                calculation: `k_exp = ${k_exp.toExponential(3)} (由 ${mode} 模式拟合)`,
                result: `相对误差: ${Math.abs((k_exp - K_COULOMB) / K_COULOMB).toFixed(4)}%`
            }
        ];

        const warnings: string[] = [];
        if (rCm < 1) warnings.push('间距过小 (<1cm), 点电荷模型可能失效');
        if (q1MuC > 10 || q2MuC > 10) warnings.push('电量过大 (>10μC), 实际很难保持电荷');
        if (Math.abs((k_exp - K_COULOMB) / K_COULOMB) > 0.01) warnings.push('拟合 k 值误差异常 (>1%)');

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { F_q, F_inv_r2, 'static-diagram': staticDiagram },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    q1_muC: q1MuC,
                    q2_muC: q2MuC,
                    distance_cm: rCm,
                    F0_N: F0,
                    slope_Fq: slope_Fq,
                    slope_FinvR2,
                    k_exp,
                    k_theory: K_COULOMB,
                    k_relative_error_pct: Math.abs((k_exp - K_COULOMB) / K_COULOMB) * 100
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `库仑力 (${mode}): q₁=${q1MuC}μC, q₂=${q2MuC}μC, r=${rCm}cm → F₀=${F0.toExponential(3)}N, k_exp=${k_exp.toExponential(3)}`,
                steps,
                formulas: [
                    {
                        name: '库仑定律',
                        formula: 'F = k·|q₁q₂|/r²',
                        variables: {
                            k: { value: K_COULOMB, unit: 'N·m²/C²' },
                            'q₁': { value: q1C, unit: 'C' },
                            'q₂': { value: q2C, unit: 'C' },
                            r: { value: rM, unit: 'm' }
                        }
                    },
                    {
                        name: 'F-q 斜率',
                        formula: 'slope = k·q₂/r²',
                        variables: { slope: { value: slope_Fq, unit: 'N/C' } }
                    },
                    {
                        name: 'F-1/r² 斜率',
                        formula: 'slope = k·q₁q₂',
                        variables: { slope: { value: slope_FinvR2, unit: 'N·m²' } }
                    }
                ]
            },
            renderHints: [
                { bodyId: 'q1', renderColor: '#4a90d9', renderLabel: '电荷 q₁' },
                { bodyId: 'q2', renderColor: '#d94a4a', renderLabel: '电荷 q₂' },
                { bodyId: 'forceArrow', renderColor: '#f5a623', renderLabel: '库仑力' }
            ],
            errors: [],
            warnings
        };
    }
}

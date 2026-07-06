import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/** 静电感应教学简化比例系数 (张角 vs) */
const INDUCTION_K = 1e9; // μC / cm² → 力等效单位换算为力的比例

/**
 * 静电感应模型 — 必修三 第十二章
 *
 * 导体 A 在带电体 C 的电场中发生静电感应:
 *   近端 (右侧, 靠近 C) 感应异号电荷: q_near = −k_ind·Q_C/(d_AC+s)²
 *   远端 (左侧) 感应同号电荷:        q_far  = +k_ind·Q_C/d_AC²
 *   A 整体中性: q_near + q_far = 0 (近似)
 *   箔片张角 θ ∝ |q_near| (近端电荷越大, 斥力越大)
 *
 * 扫描 distanceAC (当 A 远离 C), 给出 q_C vs θ 关系曲线
 * 并给出 A, B, C 静态示意图
 */
export class ElectrostaticInductionModel extends PhysicsModelBase {
    readonly name = '静电感应';
    readonly version = '1.0.0';
    readonly description = '导体近端/远端感应电荷分布, 箔片张角 vs 带电体间距 (静电感应)';
    readonly modelType = 'electrostatic-induction' as const;
    readonly assumptions = [
        '导体 A/B 为良导体且接地断开 (孤立中性)',
        '带电体 C 电量不变且距离足够远',
        '感应电荷大小与 C 到场点的库仑力成正比',
        '箔片张角与张端电荷成正比 (小角近似)'
    ];
    readonly applicableRange = '电荷: 0.01–20 μC; 间距: 1–50 cm';
    readonly errorSources = [
        '忽略导体 A 的形状 (理想化直棒)',
        '实际感应电荷分布与 C 的具体几何相关',
        '箔片张角与张端电荷的关系非线性'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'chargeC', description: '带电体 C 电量 (μC)', unit: 'μC', required: true, min: 0.01, max: 100 },
        { name: 'separation', description: 'A/B 间隙 (cm)', unit: 'cm', required: true, min: 0.1, max: 30 },
        { name: 'distanceAC', description: 'A 左端到 C 的距离 (cm)', unit: 'cm', required: true, min: 0.5, max: 100 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.electrostaticInduction;
        if (!c) {
            throw new Error('electrostatic-induction 模型需要 electrostaticInduction 约束配置');
        }

        const chargeC = c.chargeC;
        const separation = c.separation;
        const distanceAC = c.distanceAC;
        const thetaK = c.thetaK ?? 50;
        const sampleCount = c.sampleCount ?? 30;

        // ===== 基准点计算 (当前 distanceAC) =====
        const qNearBase = (-INDUCTION_K * chargeC) / ((distanceAC + separation) * (distanceAC + separation));
        const qFarBase = (INDUCTION_K * chargeC) / (distanceAC * distanceAC);
        const thetaBase = thetaK * Math.abs(qNearBase);
        const nearestChargeRatio = qFarBase > 0 ? Math.abs(qNearBase / qFarBase) : 0;

        // ===== 扫描 distanceAC 生成 q_C vs θ 散点图 =====
        const qC_theta_points: Array<{ x: number; y: number }> = [];
        const trajectory: TrajectoryPoint[] = [];
        const duration = problem.timeConfig.duration;
        const sampleCountTraj = problem.timeConfig.sampleCount ?? sampleCount;
        const dt = duration / sampleCountTraj;

        // distanceAC 范围: distanceAC/2 ~ distanceAC*2
        const minD = Math.max(0.5, distanceAC * 0.5);
        const maxD = distanceAC * 2;

        for (let i = 0; i <= sampleCount; i++) {
            const d = minD + (maxD - minD) * (i / sampleCount);
            const qNear = (-INDUCTION_K * chargeC) / ((d + separation) * (d + separation));
            const qFar = (INDUCTION_K * chargeC) / (d * d);
            const theta = thetaK * Math.abs(qNear);
            qC_theta_points.push({ x: parseFloat(d.toFixed(2)), y: parseFloat(theta.toFixed(4)) });
            const t = i * dt;
            trajectory.push({
                t,
                position: { x: qNear, y: qFar },
                velocity: { x: theta, y: chargeC },
                acceleration: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            });
        }

        const qC_theta: ChartSeries = {
            xLabel: '距离 d_AC (cm)',
            yLabel: '箔片张角 θ (度)',
            xUnit: 'cm',
            yUnit: '°',
            points: qC_theta_points
        };

        // ===== 静态示意图 (A/B/C 三导体) =====
        // C 在右侧 (右上), A 在中间, B 在左侧 (箔片分开)
        // 近端 (右侧) +q_near, 远端 (左侧) -q_far (比例显示)
        const maxQInd = Math.max(Math.abs(qFarBase), Math.abs(qNearBase));
        const indicatorLen = 50;
        const staticDiagram: ChartSeries = {
            xLabel: '导体位置 (相对坐标)',
            yLabel: 'y (px)',
            xUnit: 'px',
            yUnit: 'px',
            points: [
                // A 导体的左端 (远端) — 标记 q_far
                { x: 0, y: 0 },
                // A 导体的右端 (近端) — 标记 q_near
                { x: 100, y: 0 },
                // B 导体的右端 (与 A 分隔)
                { x: 100 + separation * 4, y: 0 },
                // B 导体的左端
                { x: 100 + separation * 4 + 100, y: 0 },
                // 带电体 C (在 A 右侧, 距离 distanceAC)
                { x: 100 + distanceAC * 4, y: 40 },
                // 近端感应电荷 + 指示方向
                { x: 100, y: -indicatorLen * (qNearBase / maxQInd) },
                // 远端感应电荷 - 指示方向
                { x: 0, y: indicatorLen * (qFarBase / maxQInd) }
            ]
        };

        const keyframes: Keyframe[] = [
            {
                label: '基准 (近端)',
                t: 0,
                position: { x: qNearBase, y: thetaBase },
                velocity: { x: 0, y: 0 },
                description: `距离 d=${distanceAC}cm, 近端感应 q_near=${qNearBase.toExponential(3)} (相对单位)`
            },
            {
                label: '基准 (远端)',
                t: duration / 2,
                position: { x: qFarBase, y: thetaBase },
                velocity: { x: 0, y: 0 },
                description: `距离 d=${distanceAC}cm, 远端感应 q_far=${qFarBase.toExponential(3)} (相对单位)`
            },
            {
                label: '当前张角',
                t: duration,
                position: { x: thetaBase, y: nearestChargeRatio },
                velocity: { x: 0, y: 0 },
                description: `箔片张角 θ≈${thetaBase.toFixed(2)}°, 近远端电荷比=${nearestChargeRatio.toFixed(3)}`
            }
        ];

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '近端感应电荷 (异号, 靠近 C)',
                formula: 'q_near = −k_ind·Q_C/(d_AC+s)²',
                calculation: `q_near = −${INDUCTION_K}×${chargeC}/(${distanceAC}+${separation})² = ${qNearBase.toExponential(3)}`,
                result: `绝对值: ${Math.abs(qNearBase).toExponential(3)}`
            },
            {
                order: 2,
                description: '远端感应电荷 (同号, 远离 C)',
                formula: 'q_far = +k_ind·Q_C/d_AC²',
                calculation: `q_far = +${INDUCTION_K}×${chargeC}/${distanceAC}² = ${qFarBase.toExponential(3)}`,
                result: `绝对值: ${qFarBase.toExponential(3)}`
            },
            {
                order: 3,
                description: 'A 整体电中性 (近似守恒)',
                formula: 'q_near + q_far = 0 (理想)',
                calculation: `${qNearBase.toExponential(3)} + ${qFarBase.toExponential(3)} = ${(qNearBase + qFarBase).toExponential(3)}`,
                result: '近似为零'
            },
            {
                order: 4,
                description: '箔片张角 ∝ |q_near|',
                formula: 'θ = θ_k·|q_near|',
                calculation: `θ = ${thetaK}×|${qNearBase.toExponential(3)}| = ${thetaBase.toFixed(2)}°`,
                result: '近端电荷越大, 张角越大'
            },
            {
                order: 5,
                description: '距离越远, 近远端电荷比趋近 1',
                formula: 'ratio = (d_AC+s)²/d_AC²',
                calculation: `(${distanceAC}+${separation})²/${distanceAC}² = ${nearestChargeRatio.toFixed(3)}`,
                result: '远 → 趋近 1'
            }
        ];

        const warnings: string[] = [];
        if (separation <= 0.5) warnings.push('极小间距下简化模型精度有限');
        if (distanceAC <= 0.5) warnings.push('极小距离 AC 与实际不符 (C 不能再近)');
        if (thetaBase > 90) warnings.push('张角过大 (>90°), 已超出小角近似范围');

        return {
            meta: {
                model: 'electrostatic-induction',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: {
                qC_theta,
                'static-diagram': staticDiagram
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    chargeC,
                    separation_cm: separation,
                    distanceAC_cm: distanceAC,
                    qNear: Math.abs(qNearBase),
                    qFar: qFarBase,
                    nearestChargeRatio,
                    theta_deg: thetaBase
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `静电感应: Q_C=${chargeC}μC, d_AC=${distanceAC}cm, s=${separation}cm → q_near=${qNearBase.toExponential(3)}, θ≈${thetaBase.toFixed(1)}°`,
                steps,
                formulas: [
                    {
                        name: '近端电荷',
                        formula: 'q_near = −k_ind·Q_C/(d_AC+s)²',
                        variables: {
                            k_ind: { value: INDUCTION_K, unit: 'μC/cm²' },
                            Q_C: { value: chargeC, unit: 'μC' },
                            d: { value: distanceAC + separation, unit: 'cm' }
                        }
                    },
                    {
                        name: '远端电荷',
                        formula: 'q_far = +k_ind·Q_C/d_AC²',
                        variables: { d: { value: distanceAC, unit: 'cm' } }
                    },
                    { name: '箔片张角', formula: 'θ = θ_k·|q_near|', variables: { θ_k: { value: thetaK, unit: '' } } }
                ]
            },
            renderHints: [
                { bodyId: 'electrodeA', renderColor: '#4a90d9', renderLabel: '导体 A' },
                { bodyId: 'electrodeB', renderColor: '#d94a4a', renderLabel: '导体 B' },
                { bodyId: 'chargeC', renderColor: '#f5a623', renderLabel: '带电体 C' }
            ],
            errors: [],
            warnings
        };
    }
}

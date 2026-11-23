import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/** 导体特征极化尺度 D_scale (cm): 用于计算有界无量纲感应系数 η ∈ (0, 1) */
const INDUCTION_D_SCALE_CM = 10;
/** 默认箔片张角饱和灵敏度 k_foil (μC⁻¹): 使默认 Q=1μC, d=10cm, s=2cm 落于 ~28.5° (15°–45°) */
const DEFAULT_FOIL_K = 1.2;

/**
 * 计算孤立导体无量纲感应系数 η ∈ (0, 1)
 *
 * 物理含义: 带电体 C 越近 (d_AC 越小)、A/B 间隙 s 越小，外电场在导体上引起的电荷分离越强，
 * 但孤立导体上的分离感应电荷量严格不超过施感电量: |q_near| = |q_far| = |Q_C| · η < |Q_C|。
 */
export function computeInductionRatio(distanceAC: number, separation: number): number {
    const dEff = Math.max(0, distanceAC) + 0.5 * Math.max(0, separation);
    const scale2 = INDUCTION_D_SCALE_CM * INDUCTION_D_SCALE_CM;
    return scale2 / (scale2 + dEff * dEff);
}

/**
 * 计算有界单调箔片张角 θ (°) ∈ [0°, 90°)
 *
 * 采用饱和反正切模型 θ = (180/π) · arctan(k_foil · |q_ind|)，避免线性外推产生上亿度伪数值。
 */
export function computeFoilAngleDeg(qMagUc: number, kFoil = DEFAULT_FOIL_K): number {
    const safeQ = Math.max(0, qMagUc);
    const safeK = Math.max(0, kFoil);
    return (180 / Math.PI) * Math.atan(safeK * safeQ);
}

/**
 * 静电感应模型 — 必修三 第十二章
 *
 * 孤立中性导体 A/B 在带电体 C 的电场中发生电荷重分布:
 *   感应系数: η = D₀² / (D₀² + (d_AC + s/2)²) ∈ (0, 1)
 *   近端 (靠近 C) 感应异号电荷: q_near = −sgn(Q_C) · |Q_C| · η  (μC)
 *   远端 (远离 C) 感应同号电荷: q_far  = −q_near                (μC)
 *   硬守恒不变量: q_near + q_far === 0 (孤立中性导体总净电荷严格守恒)
 *   近/远端场强衰减比: fieldRatio = (d_AC / (d_AC + s))² (与电荷比分离)
 *   箔片张角: θ = (180/π) · arctan(k_foil · |q_near|) ∈ [0°, 90°)
 */
export class ElectrostaticInductionModel extends PhysicsModelBase {
    readonly name = '静电感应';
    readonly version = '1.1.0';
    readonly description = '孤立中性导体近端/远端等量异号感应电荷分布与有界箔片张角 (静电感应)';
    readonly modelType = 'electrostatic-induction' as const;
    readonly assumptions = [
        '导体 A/B 为孤立中性良导体 (未接地)，总感应净电荷严格满足 q_near + q_far = 0',
        '带电体 C 电量 Q_C 恒定，分离感应电荷量满足 |q_near| = |q_far| = |Q_C|·η ≤ |Q_C|',
        '无量纲感应系数 η = D₀² / (D₀² + (d_AC + s/2)²) 随距离单调递减且恒小于 1',
        '箔片张角采用有界单调饱和模型 θ = (180/π)·arctan(k_foil·|q_near|) ∈ [0°, 90°)'
    ];
    readonly applicableRange = '电荷: −100~100 μC; 间隙: 0.1~30 cm; 间距: 0.5~100 cm';
    readonly errorSources = [
        '忽略导体实际三维曲率与边缘尖端效应 (理想化直棒)',
        '实际感应电荷分布与 C 的具体几何形状相关',
        '箔片转动惯量与空气阻尼未计入稳态张角'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        {
            name: 'chargeC',
            description: '带电体 C 电量 (μC，支持正/负/零)',
            unit: 'μC',
            required: true,
            min: -100,
            max: 100
        },
        { name: 'separation', description: 'A/B 间隙 (cm)', unit: 'cm', required: true, min: 0.1, max: 30 },
        { name: 'distanceAC', description: 'A 左端到 C 的距离 (cm)', unit: 'cm', required: true, min: 0.5, max: 100 }
    ];

    /**
     * 纯场 / 传感器 / 仪器建模: 本文件不读 `problem.bodies`, 结果只由 constraints 与参数决定,
     * 故取消基类「至少需要一个物理物体」这一项要求 (保留参数范围与 NaN/Inf 守卫)。
     * 若将来改成用 bodies 建模, 必须同时删掉本 override 让校验重新生效。
     */
    protected requiresBodies(): boolean {
        return false;
    }

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.electrostaticInduction;
        if (!c) {
            throw new Error('electrostatic-induction 模型需要 electrostaticInduction 约束配置');
        }

        const chargeC = c.chargeC;
        const separation = c.separation;
        const distanceAC = c.distanceAC;
        const kFoil = c.thetaK !== undefined ? Math.max(0, c.thetaK) : DEFAULT_FOIL_K;
        const sampleCount = c.sampleCount ?? 30;

        // ===== 基准点计算 (当前 distanceAC): 孤立中性导体电荷重分布 =====
        const etaBase = computeInductionRatio(distanceAC, separation);
        const qSign = chargeC === 0 ? 0 : Math.sign(chargeC);
        const qMagBase = Math.abs(chargeC) * etaBase;
        const qNearBase = qSign === 0 ? 0 : -qSign * qMagBase;
        const qFarBase = qNearBase === 0 ? 0 : -qNearBase;
        const netChargeBase = qNearBase + qFarBase;
        const thetaBase = computeFoilAngleDeg(qMagBase, kFoil);
        const fieldRatio = Math.pow(distanceAC / (distanceAC + separation), 2);

        // ===== 扫描 distanceAC 生成 d_AC vs θ 曲线 =====
        const qC_theta_points: Array<{ x: number; y: number }> = [];
        const trajectory: TrajectoryPoint[] = [];
        const duration = problem.timeConfig.duration;
        const sampleCountTraj = problem.timeConfig.sampleCount ?? sampleCount;
        const dt = duration / Math.max(1, sampleCountTraj);

        const minD = Math.max(0.5, distanceAC * 0.5);
        const maxD = distanceAC * 2;
        let maxNetDeviation = Math.abs(netChargeBase);

        for (let i = 0; i <= sampleCount; i++) {
            const d = minD + (maxD - minD) * (i / sampleCount);
            const eta = computeInductionRatio(d, separation);
            const qMag = Math.abs(chargeC) * eta;
            const qNear = qSign === 0 ? 0 : -qSign * qMag;
            const qFar = qNear === 0 ? 0 : -qNear;
            maxNetDeviation = Math.max(maxNetDeviation, Math.abs(qNear + qFar));
            const theta = computeFoilAngleDeg(qMag, kFoil);
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
            yLabel: '箔片张角 θ (°)',
            xUnit: 'cm',
            yUnit: '°',
            points: qC_theta_points
        };

        // ===== 静态示意图 (A/B/C 三导体) =====
        const maxQInd = Math.max(Math.abs(qFarBase), Math.abs(qNearBase));
        const indicatorLen = 50;
        const nearIndicator = maxQInd > 0 ? -indicatorLen * (qNearBase / maxQInd) : 0;
        const farIndicator = maxQInd > 0 ? indicatorLen * (qFarBase / maxQInd) : 0;
        const staticDiagram: ChartSeries = {
            xLabel: '导体位置 (相对坐标)',
            yLabel: 'y (px)',
            xUnit: 'px',
            yUnit: 'px',
            points: [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                { x: 100 + separation * 4, y: 0 },
                { x: 100 + separation * 4 + 100, y: 0 },
                { x: 100 + distanceAC * 4, y: 40 },
                { x: 100, y: nearIndicator },
                { x: 0, y: farIndicator }
            ]
        };

        const fmtSignedUc = (v: number): string => `${v > 0 ? '+' : ''}${v.toFixed(4)} μC`;

        const keyframes: Keyframe[] = [
            {
                label: '基准 (近端)',
                t: 0,
                position: { x: qNearBase, y: thetaBase },
                velocity: { x: 0, y: 0 },
                description: `距离 d=${distanceAC}cm, 近端感应 q_near=${fmtSignedUc(qNearBase)} (感应系数 η=${(etaBase * 100).toFixed(1)}%)`
            },
            {
                label: '基准 (远端)',
                t: duration / 2,
                position: { x: qFarBase, y: thetaBase },
                velocity: { x: 0, y: 0 },
                description: `距离 d=${distanceAC}cm, 远端感应 q_far=${fmtSignedUc(qFarBase)} (满足 q_near + q_far = 0)`
            },
            {
                label: '当前张角',
                t: duration,
                position: { x: thetaBase, y: fieldRatio },
                velocity: { x: 0, y: 0 },
                description: `箔片张角 θ=${thetaBase.toFixed(2)}° (<90°), 近/远端场强衰减比=${fieldRatio.toFixed(3)}`
            }
        ];

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '有界无量纲感应系数 η ∈ (0, 1)',
                formula: 'η = D₀² / (D₀² + (d_AC + s/2)²),  D₀ = 10 cm',
                calculation: `η = 10² / (10² + (${distanceAC} + ${separation}/2)²) = ${etaBase.toFixed(4)}`,
                result: `感应比例 ${(etaBase * 100).toFixed(1)}% (距离越近感应越强且始终 η < 1)`
            },
            {
                order: 2,
                description: '近端与远端等量异号感应电荷 (μC)',
                formula: 'q_near = −sgn(Q_C)·|Q_C|·η,  q_far = −q_near',
                calculation: `q_near = ${fmtSignedUc(qNearBase)},  q_far = ${fmtSignedUc(qFarBase)}`,
                result: `|q_near| = |q_far| = ${qMagBase.toFixed(4)} μC ≤ |Q_C| = ${Math.abs(chargeC).toFixed(4)} μC`
            },
            {
                order: 3,
                description: '孤立中性导体总感应净电荷严格守恒',
                formula: 'q_near + q_far = 0',
                calculation: `${fmtSignedUc(qNearBase)} + ${fmtSignedUc(qFarBase)} = ${netChargeBase.toFixed(4)} μC`,
                result: '严格为零 (硬不变量，误差 < 1e-12)'
            },
            {
                order: 4,
                description: '箔片有界饱和张角 θ ∈ [0°, 90°)',
                formula: 'θ = (180/π)·arctan(k_foil·|q_near|)',
                calculation: `θ = (180/π)·arctan(${kFoil}×${qMagBase.toFixed(4)}) = ${thetaBase.toFixed(2)}°`,
                result: '感应电荷越大张角越大，且严格受限于 90° 以内'
            },
            {
                order: 5,
                description: '近/远端外电场强衰减比 (与电荷比分离)',
                formula: 'E_far / E_near = (d_AC / (d_AC + s))²',
                calculation: `(${distanceAC} / (${distanceAC} + ${separation}))² = ${fieldRatio.toFixed(4)}`,
                result: '距离越远，近远端外场强比越趋近 1 (但孤立导体近远端电荷量始终等量异号)'
            }
        ];

        const warnings: string[] = [];
        if (separation <= 0.5) warnings.push('极小间距下简化模型精度有限');
        if (distanceAC <= 0.5) warnings.push('极小距离 AC 接近接触边界，简化点电荷模型精度有限');

        const chargeTolerance = 1e-12;

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                qC_theta,
                'static-diagram': staticDiagram
            },
            diagnostics: {
                conservedQuantities: [
                    {
                        name: '孤立导体总感应净电荷守恒',
                        law: '电荷守恒定律 (q_near + q_far = 0)',
                        initialValue: 0,
                        finalValue: netChargeBase,
                        maxDeviation: maxNetDeviation,
                        tolerance: chargeTolerance,
                        conserved: maxNetDeviation < chargeTolerance
                    }
                ],
                maxValues: {
                    chargeC,
                    separation_cm: separation,
                    distanceAC_cm: distanceAC,
                    qNear: qNearBase,
                    qFar: qFarBase,
                    qNear_uC: qNearBase,
                    qFar_uC: qFarBase,
                    netCharge_uC: netChargeBase,
                    inductionRatio: etaBase,
                    fieldRatio,
                    nearestChargeRatio: fieldRatio,
                    theta_deg: thetaBase
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `静电感应: Q_C=${chargeC}μC, d_AC=${distanceAC}cm, s=${separation}cm → q_near=${fmtSignedUc(qNearBase)}, q_far=${fmtSignedUc(qFarBase)} (净电荷 0), θ=${thetaBase.toFixed(1)}°`,
                steps,
                formulas: [
                    {
                        name: '无量纲感应系数',
                        formula: 'η = D₀² / (D₀² + (d_AC + s/2)²)',
                        variables: {
                            D_0: { value: INDUCTION_D_SCALE_CM, unit: 'cm' },
                            d_AC: { value: distanceAC, unit: 'cm' },
                            s: { value: separation, unit: 'cm' },
                            η: { value: parseFloat(etaBase.toFixed(4)), unit: '' }
                        }
                    },
                    {
                        name: '孤立导体等量异号感应电荷',
                        formula: 'q_near = −sgn(Q_C)·|Q_C|·η, q_far = −q_near',
                        variables: {
                            Q_C: { value: chargeC, unit: 'μC' },
                            q_near: { value: parseFloat(qNearBase.toFixed(4)), unit: 'μC' },
                            q_far: { value: parseFloat(qFarBase.toFixed(4)), unit: 'μC' },
                            q_net: { value: netChargeBase, unit: 'μC' }
                        }
                    },
                    {
                        name: '箔片饱和张角',
                        formula: 'θ = (180/π)·arctan(k_foil·|q_near|)',
                        variables: {
                            k_foil: { value: kFoil, unit: 'μC⁻¹' },
                            θ: { value: parseFloat(thetaBase.toFixed(2)), unit: '°' }
                        }
                    }
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

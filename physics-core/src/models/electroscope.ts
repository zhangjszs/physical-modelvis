import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/** 验电器箔片比例常数: 对应 k_e·ve/(m·g) 的归一化比例 */
const K_FOIL = 8.9875517923e9; // 直接使用库仑常数
const DEG_PER_RAD = 180 / Math.PI;

/**
 * 验电器模型 — 必修三 第十二章
 *
 * 箔片张角 θ 与带电量 q 的关系 (简化):
 *   每一箔片受到斥力 F_k = k·q/2·q/2/L² = k·q²/(4L²) (箔片为点电荷近似)
 *   与重力分力 mg·sin(θ/2) 平衡 (小角):
 *     θ ≈ arcsin( k·q² / (4·m·g·L) )
 *
 * 扫描 q: 0 → charge 得到 q-θ 曲线
 */
export class ElectroscopeModel extends PhysicsModelBase {
    readonly name = '验电器';
    readonly version = '1.0.0';
    readonly description = '箔片张角 θ 与带电量 q 的定量关系 (θ = arcsin(k·q²/(4mgL)))';
    readonly modelType = 'electroscope' as const;
    readonly assumptions = [
        '两箔片各带 q/2 的电量 (对称分布)',
        '箔片为点电荷近似 (距离近似为 L)',
        '小角度近似下 sin(θ)≈θ (大角改用 arcsin)',
        '重力与静电力平衡',
        '箔片长度远大于宽度'
    ];
    readonly applicableRange = 'q: 0.01–10 μC; L: 2–10 cm; m: 0.1–5 g';
    readonly errorSources = [
        '箔片形状非点电荷',
        '电荷在箔片表面分布不均',
        '忽略边缘效应 (相邻箔片)',
        '大角度下简化模型出现偏差'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'charge', description: '带电量 (μC)', unit: 'μC', required: true, min: 0.01, max: 50 },
        { name: 'foilLength', description: '箔片长度 (cm)', unit: 'cm', required: true, min: 1, max: 20 },
        { name: 'foilMass', description: '箔片质量 (g)', unit: 'g', required: true, min: 0.01, max: 10 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.electroscope;
        if (!c) {
            throw new Error('electroscope 模型需要 electroscope 约束配置');
        }

        const chargeMuC = c.charge;
        const foilLength_cm = c.foilLength ?? 5;
        const foilMass_g = c.foilMass ?? 1;
        const sampleCount = c.sampleCount ?? 30;

        // 换算为 SI 单位
        const L_m = foilLength_cm / 100; // m
        const m_kg = foilMass_g / 1000; // kg
        const q_C = chargeMuC * 1e-6; // C
        const g = 9.8;

        // 箔片简化平衡方程:
        // F_k = k * (q/2)² / L² = k·q²/(4L²)  (斥力: 两箔片各带 q/2, 相距 ~ L)
        // 与重力分力平衡:  2·T·sin(θ/2) = F_k;  T_balance ≈ mg·cos(θ/2)
        // 小角近似:  mg·sin(θ/2) ≈ F_k/2
        // 最终:  sin(θ) = 2·sin(θ/2)·cos(θ/2) ≈ k·q²/(4·m·g·L)
        const k = K_FOIL;
        const foilChargeFactor = (k * q_C * q_C) / (4 * m_kg * g * L_m); // 这是 sin(θ) 的值
        const thetaRad = Math.asin(Math.min(1, Math.max(-1, foilChargeFactor)));
        const thetaDeg = thetaRad * DEG_PER_RAD;

        // ===== 扫描: 0 → charge 得到 q-θ 曲线 =====
        const duration = problem.timeConfig.duration;
        const dt = duration / sampleCount;

        const q_theta_points: Array<{ x: number; y: number }> = [];
        const trajectory: TrajectoryPoint[] = [];
        const keyframes: Keyframe[] = [];

        for (let i = 0; i <= sampleCount; i++) {
            const t = i * dt;
            const q_i = (chargeMuC * i) / sampleCount;
            const q_i_C = q_i * 1e-6;
            const factor_i = (k * q_i_C * q_i_C) / (4 * m_kg * g * L_m);
            const theta_i = Math.asin(Math.min(1, Math.max(-1, factor_i))) * DEG_PER_RAD;
            q_theta_points.push({ x: parseFloat(q_i.toFixed(4)), y: parseFloat(theta_i.toFixed(4)) });
            trajectory.push({
                t,
                position: { x: q_i, y: theta_i },
                velocity: { x: 0, y: 0 },
                acceleration: { x: factor_i, y: theta_i },
                kineticEnergy: q_i * q_i,
                potentialEnergy: theta_i
            });
        }

        // 给出几个关键帧
        const sampleIndices = [
            0,
            Math.floor(sampleCount * 0.25),
            Math.floor(sampleCount * 0.5),
            Math.floor(sampleCount * 0.75),
            sampleCount
        ];
        sampleIndices.forEach(idx => {
            const p = q_theta_points[idx]!;
            keyframes.push({
                label: `q=${p.x}μC`,
                t: idx * dt,
                position: { x: p.x, y: p.y },
                velocity: { x: 0, y: 0 },
                description: `q=${p.x}μC → θ=${p.y.toFixed(2)}° (factor=${((k * (p.x * 1e-6) ** 2) / (4 * m_kg * g * L_m)).toFixed(3)})`
            });
        });

        const q_theta: ChartSeries = {
            xLabel: '带电量 q (μC)',
            yLabel: '箔片张角 θ (度)',
            xUnit: 'μC',
            yUnit: '°',
            points: q_theta_points
        };

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '箔片所受库仑斥力',
                formula: 'F_k = k·(q/2)²/L² = k·q²/(4L²)',
                calculation: `F_k = ${k.toExponential(3)} × (${q_C.toExponential(3)}/2)² / ${L_m}² = ${((k * (q_C / 2) ** 2) / (L_m * L_m)).toExponential(3)} N`,
                result: '两箔片斥力'
            },
            {
                order: 2,
                description: '重力沿箔片方向分力',
                formula: 'G_comp = ½·m·g·sin(θ/2) (每片)',
                calculation: `m=${m_kg}kg, g=${9.8}m/s², L=${L_m}m`,
                result: '提供力矩平衡'
            },
            {
                order: 3,
                description: '张角公式 (简化)',
                formula: 'sin(θ) = k·q²/(4·m·g·L)',
                calculation: `sin(θ) = ${k.toExponential(3)}×(${q_C.toExponential(3)})² / (4×${m_kg}×${g}×${L_m}) = ${foilChargeFactor.toFixed(4)}`,
                result: `θ = asin(${foilChargeFactor.toFixed(4)}) = ${thetaDeg.toFixed(2)}°`
            },
            {
                order: 4,
                description: '张角与带电量的定性关系',
                formula: 'θ ∝ q² (小角)',
                calculation: '小角下 asin(x)≈x → θ ∝ q²',
                result: 'q 越大, θ 增长越快'
            }
        ];

        const warnings: string[] = [];
        if (foilChargeFactor > 0.9) warnings.push('factor 接近 1, 大角度范围, 简化模型精度有限');
        if (foilChargeFactor > 1) warnings.push('factor > 1, 模型失效 (q 超出可用范围)');
        if (thetaDeg > 90) warnings.push('张角超过 90°, 物理上不合理');

        return {
            meta: {
                model: 'electroscope',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: { q_theta },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    charge_muC: chargeMuC,
                    foilLength_cm: foilLength_cm,
                    foilMass_g: foilMass_g,
                    theta_deg: thetaDeg,
                    theta_rad: thetaRad,
                    foilFactor: foilChargeFactor,
                    maxThetaAtCharge: q_theta_points[q_theta_points.length - 1]!.y
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `验电器: q=${chargeMuC}μC, L=${foilLength_cm}cm, m=${foilMass_g}g → θ=${thetaDeg.toFixed(2)}°`,
                steps,
                formulas: [
                    {
                        name: '库仑斥力',
                        formula: 'F_k = k·q²/(4L²)',
                        variables: {
                            k: { value: K_FOIL, unit: 'N·m²/C²' },
                            q: { value: q_C, unit: 'C' },
                            L: { value: L_m, unit: 'm' }
                        }
                    },
                    {
                        name: '张角公式',
                        formula: 'sin(θ) = k·q²/(4mgL)',
                        variables: { q: { value: q_C, unit: 'C' }, m: { value: m_kg, unit: 'kg' } }
                    }
                ]
            },
            renderHints: [
                { bodyId: 'foilA', renderColor: '#4a90d9', renderLabel: '箔片 A' },
                { bodyId: 'foilB', renderColor: '#d94a4a', renderLabel: '箔片 B' },
                { bodyId: 'frame', renderColor: '#555', renderLabel: '金属框架' }
            ],
            errors: [],
            warnings
        };
    }
}

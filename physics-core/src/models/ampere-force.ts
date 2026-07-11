import type { PhysicsProblem, AmpereForceConstraint } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 安培力因素模型 — 必修三 §12 (探究实验)
 *
 * 物理: F = B·I·L·sinθ (B⊥I 时 F = BIL)
 *
 * 控制变量法探究:
 *   - F-I 关系: 固定 B, L, θ → F ∝ I (直线)
 *   - F-L 关系: 固定 B, I, θ → F ∝ L (直线)
 *   - F-sinθ 关系: 固定 B, I, L → F ∝ sinθ (直线)
 *
 * 本模型生成 F-I, F-L, F-sinθ 三条直线图
 */
export class AmpereForceModel extends PhysicsModelBase {
    readonly name = '安培力因素';
    readonly version = '1.0.0';
    readonly description = 'F = BIL·sinθ; 控制变量法: F-I, F-L, F-sinθ 直线';
    readonly modelType = 'ampere-force' as const;
    readonly assumptions = [
        '匀强磁场 (B 恒定)',
        '导线与磁场方向不平行时有力分量',
        'θ 为电流方向与磁场方向的夹角',
        '忽略重力影响 (水平导线或使用力传感器)'
    ];
    readonly applicableRange = 'B: 0.01 ~ 5 T; I: 0 ~ 20 A; L: 0.01 ~ 2 m; θ: 0° ~ 90°';
    readonly errorSources = ['磁场边缘不均匀', '导线发热导致电阻变化', '弹簧/力传感器零点漂移', '接触电阻影响电流测量'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'B', description: '磁感应强度 B (T)', unit: 'T', required: true, min: 0.01, max: 5 },
        { name: 'I', description: '电流 I (A)', unit: 'A', required: true, min: 0, max: 20 },
        { name: 'L', description: '导线有效长度 L (m)', unit: 'm', required: true, min: 0.01, max: 2 },
        { name: 'angle', description: '导线与磁场夹角 (度)', unit: '°', required: true, min: 0, max: 90 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const ac = problem.constraints?.ampereForce as AmpereForceConstraint | undefined;
        if (!ac) throw new Error('ampere-force 模型需要 ampereForce 约束配置');

        const B = ac.B;
        const I = ac.I;
        const L = ac.L;
        const angleDeg = ac.angle;
        const angleRad = (angleDeg * Math.PI) / 180;

        // 实际安培力
        const F = B * I * L * Math.sin(angleRad);

        // F-I 图: 固定 B, L, θ; I 变化 (0 ~ 2I)
        const F_I_curve: ChartSeries = {
            xLabel: '电流 I (A)',
            yLabel: '安培力 F (N)',
            xUnit: 'A',
            yUnit: 'N',
            points: Array.from({ length: 100 }, (_, i) => {
                const current = (2 * I * i) / 99; // 0 ~ 2I
                const f = B * current * L * Math.sin(angleRad);
                return { x: parseFloat(current.toFixed(3)), y: parseFloat(f.toFixed(5)) };
            })
        };

        // F-L 图: 固定 B, I, θ; L 变化 (0 ~ 2L)
        const F_L_curve: ChartSeries = {
            xLabel: '导线长度 L (m)',
            yLabel: '安培力 F (N)',
            xUnit: 'm',
            yUnit: 'N',
            points: Array.from({ length: 100 }, (_, i) => {
                const len = (2 * L * i) / 99; // 0 ~ 2L
                const f = B * I * len * Math.sin(angleRad);
                return { x: parseFloat(len.toFixed(4)), y: parseFloat(f.toFixed(5)) };
            })
        };

        // F-sinθ 图: 固定 B, I, L; θ 变化 (0° ~ 90°)
        const F_sinTheta_curve: ChartSeries = {
            xLabel: 'sinθ',
            yLabel: '安培力 F (N)',
            xUnit: '',
            yUnit: 'N',
            points: Array.from({ length: 90 }, (_, i) => {
                const deg = (90 * i) / 89; // 0° ~ 90°
                const rad = (deg * Math.PI) / 180;
                const f = B * I * L * Math.sin(rad);
                return { x: parseFloat(Math.sin(rad).toFixed(4)), y: parseFloat(f.toFixed(5)) };
            })
        };

        // 关键帧: 当前工作点
        const keyframes: Keyframe[] = [
            {
                label: '当前工作点',
                t: 0,
                position: { x: angleDeg, y: F },
                velocity: { x: 0, y: 0 },
                description: `F = BIL·sin${angleDeg}° = ${B}×${I}×${L}×${Math.sin(angleRad).toFixed(2)} = ${F.toFixed(4)} N`
            }
        ];

        const trajectory: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }
        ];

        const warnings: string[] = [];
        if (angleDeg === 0) warnings.push('导线与磁场平行 (θ=0°), 安培力为 0');
        if (angleDeg === 90) warnings.push('导线与磁场垂直, 安培力最大');
        if (I > 10) warnings.push('电流较大 (>10A), 注意导线散热和电源功率');
        if (B > 2) warnings.push('强磁场 (>2T), 需使用电磁铁或超导磁铁');
        if (F < 1e-4) warnings.push('安培力过小 (<0.1mN), 可能需要更灵敏的测力计');

        const sinVal = Math.sin(angleRad).toFixed(3);

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '安培力公式',
                formula: 'F = B·I·L·sinθ',
                calculation: `F = ${B} × ${I} × ${L} × sin${angleDeg}° = ${B} × ${I} × ${L} × ${sinVal} = ${F.toFixed(4)} N`
            },
            {
                order: 2,
                description: '控制变量法: F-I 关系',
                formula: 'F ∝ I (B, L, θ 固定)',
                result: `斜率 = B·L·sinθ = ${B}×${L}×${sinVal} = ${(B * L * Math.sin(angleRad)).toFixed(4)} N/A`
            },
            {
                order: 3,
                description: '控制变量法: F-L 关系',
                formula: 'F ∝ L (B, I, θ 固定)',
                result: `斜率 = B·I·sinθ = ${B}×${I}×${sinVal} = ${(B * I * Math.sin(angleRad)).toFixed(4)} N/m`
            },
            {
                order: 4,
                description: '控制变量法: F-sinθ 关系',
                formula: 'F ∝ sinθ (B, I, L 固定)',
                result: `斜率 = B·I·L = ${(B * I * L).toFixed(4)} N`
            },
            {
                order: 5,
                description: '方向 (左手定则)',
                formula: '磁感线穿掌心, 四指 = 电流方向, 拇指 = F 方向',
                result: 'F 垂直于 B 和 I 所确定的平面'
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t: F_I_curve, y_t: F_L_curve, vx_t: F_sinTheta_curve },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    B,
                    I,
                    L,
                    angleDeg,
                    sinTheta: Math.sin(angleRad),
                    F,
                    slope_F_I: B * L * Math.sin(angleRad),
                    slope_F_L: B * I * Math.sin(angleRad),
                    slope_F_sinTheta: B * I * L
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `安培力: B=${B}T, I=${I}A, L=${L}m, θ=${angleDeg}° → F=${F.toFixed(4)}N`,
                steps,
                formulas: [
                    {
                        name: '安培力',
                        formula: 'F=BIL·sinθ',
                        variables: {
                            F: { value: F, unit: 'N' },
                            B: { value: B, unit: 'T' },
                            I: { value: I, unit: 'A' },
                            L: { value: L, unit: 'm' },
                            sinθ: { value: Math.sin(angleRad), unit: '' }
                        }
                    },
                    {
                        name: 'F-I 斜率',
                        formula: 'dF/dI = BL·sinθ',
                        variables: { 斜率: { value: B * L * Math.sin(angleRad), unit: 'N/A' } }
                    },
                    {
                        name: 'F-L 斜率',
                        formula: 'dF/dL = BI·sinθ',
                        variables: { 斜率: { value: B * I * Math.sin(angleRad), unit: 'N/m' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

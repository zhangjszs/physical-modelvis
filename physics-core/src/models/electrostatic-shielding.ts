import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 静电屏蔽模型 — 必修三 第十二章
 *
 * 导体内电场强度处处为零 (静电平衡条件).
 *   接地: 外部电场不影响内部, 箔片张角 = 0
 *   不接地: 外部电场在导体外表面感应电荷, 箔片张角 ∝ externalField
 *
 * 扫描 externalField: 0 → E_max 得到 E-θ 曲线 (接地 vs 不接地对比)
 */
export class ElectrostaticShieldingModel extends PhysicsModelBase {
    readonly name = '静电屏蔽';
    readonly version = '1.0.0';
    readonly description = '导体内 E=0; 接地 vs 不接地的屏蔽效果对比';
    readonly modelType = 'electrostatic-shielding' as const;
    readonly assumptions = [
        '导体处于静电平衡状态',
        '导体内部电场严格为零',
        '接地时导体电势为零 (大地为电荷库)',
        '箔片张角正比于净电荷量'
    ];
    readonly applicableRange = 'externalField: 0 – 1000 V/m; cavityCharge: 0 – 10 μC';
    readonly errorSources = ['实际导体有电阻, 静电平衡需要时间', '边缘效应导致局部电场非零', '接地电阻不理想'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'isGrounded', description: '是否接地 (0=不接地, 1=接地)', unit: '', required: true, min: 0, max: 1 },
        { name: 'externalField', description: '外部电场强度 (V/m)', unit: 'V/m', required: true, min: 0, max: 1000 },
        { name: 'cavityCharge', description: '空腔内部电荷 (μC)', unit: 'μC', required: false, min: 0, max: 10 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.electrostaticShielding;
        if (!c) throw new Error('electrostatic-shielding 模型需要 electrostaticShielding 约束配置');

        const isGrounded: boolean = c.isGrounded;
        const E = c.externalField;
        const cavityChargeMuC = c.cavityCharge ?? 0;
        const sampleCount = problem.timeConfig.sampleCount ?? 50;

        // 不接地: 箔片张角 ∝ E (外表面感应电荷)
        // 接地: 箔片张角 = 0 (外部电场被屏蔽)
        const thetaUngrounded = Math.min(80, E * 0.08); // 80° 封顶
        const thetaGrounded = 0;

        // 扫描 E: 0 → E_max
        const E_max = E;
        const grounding_effect: ChartSeries = {
            xLabel: '外部电场 E (V/m)',
            yLabel: '箔片张角 θ (°)',
            xUnit: 'V/m',
            yUnit: '°',
            points: Array.from({ length: sampleCount + 1 }, (_, i) => {
                const Ei = (i / sampleCount) * E_max;
                return { x: Ei, y: isGrounded ? 0 : Math.min(80, Ei * 0.08) };
            })
        };

        // 导体内外电场剖面 (沿 x 轴)
        const field_section: ChartSeries = {
            xLabel: '位置 x (cm)',
            yLabel: '电场强度 E (V/m)',
            xUnit: 'cm',
            yUnit: 'V/m',
            points: Array.from({ length: sampleCount + 1 }, (_, i) => {
                const x = (i / sampleCount) * 10 - 2; // -2 ~ 8 cm, 导体在 0-5 cm
                let E_eff: number;
                if (x >= 0 && x <= 5) {
                    // 导体内部: E = 0
                    E_eff = 0;
                } else if (x < 0) {
                    // 导体左侧: 外部电场 (不接地时外表面有感应电荷)
                    E_eff = isGrounded ? 0 : E * (1 + 0.3 * Math.exp(x));
                } else {
                    // 导体右侧
                    E_eff = isGrounded ? 0 : E * (1 - 0.2 * Math.exp(-(x - 5)));
                }
                return { x, y: Math.max(0, E_eff) };
            })
        };

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
                label: isGrounded ? '接地屏蔽 (E_in = 0)' : '未接地 (外表面感应)',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: isGrounded
                    ? `导体接地, 内部 E=0, 箔片张角=0°`
                    : `导体未接地, 外表面感应电荷, 箔片张角=${thetaUngrounded.toFixed(1)}°`
            }
        ];

        const steps: ExplanationStep[] = [
            { order: 1, description: '静电平衡条件', formula: 'E_内 = 0', result: '导体内部电场为零' },
            {
                order: 2,
                description: '接地屏蔽',
                formula: '接地 → 外表面电荷入地 → 内部无感应',
                result: isGrounded ? '已接地: 完全屏蔽' : '未接地: 部分屏蔽'
            },
            {
                order: 3,
                description: '箔片张角',
                formula: 'θ ∝ q_净',
                calculation: `θ_未接地=${thetaUngrounded.toFixed(1)}°, θ_接地=${thetaGrounded}°`
            },
            {
                order: 4,
                description: '空腔内部电荷影响',
                formula: '空腔内电荷会在外表面感应等量电荷',
                result: `cavityCharge=${cavityChargeMuC} μC`
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { grounding_effect: grounding_effect, field_section: field_section },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    thetaUngrounded,
                    thetaGrounded,
                    E,
                    isGrounded: isGrounded ? 1 : 0,
                    cavityChargeMuC
                },
                rangeCheck: { withinRange: E <= 1000, warnings: E > 800 ? ['外部电场强度较大, 空气可能击穿'] : [] }
            },
            explanation: {
                summary: `静电屏蔽: E=${E}V/m, ${isGrounded ? '已接地 (完全屏蔽)' : '未接地 (部分屏蔽)'}, θ=${isGrounded ? 0 : thetaUngrounded.toFixed(1)}°`,
                steps,
                formulas: [
                    { name: '静电平衡', formula: 'E_内 = 0', variables: { E: { value: E, unit: 'V/m' } } },
                    { name: '接地屏蔽', formula: '接地 → φ=0, 外表面电荷入地', variables: {} }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

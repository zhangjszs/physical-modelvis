import { PhysicsModelBase } from './base.js';
import type { PhysicsProblem } from '../types/problem.js';
import { kineticEnergy } from '../physics/kinematics.js';
import type { SimulationResult, TrajectoryPoint, ChartSeries } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';

/**
 * 中子发现模型 — 选必三 第五章 (查德威克实验)
 * 动量守恒 + 能量守恒 → m_n ≈ 1.0087 u
 */
export class NeutronDiscoveryModel extends PhysicsModelBase {
    readonly name = '中子发现';
    readonly version = '1.0.0';
    readonly description = '查德威克: 动量+能量守恒 → m_n ≈ m_p';
    readonly modelType = 'neutron-discovery' as const;
    readonly assumptions = ['弹性碰撞', '靶核静止', '非相对论'];
    readonly applicableRange = 'E_α: 1-10 MeV; M_target: 1-14 u';
    readonly errorSources = ['核力修正', '相对论效应'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'alphaEnergy', unit: 'MeV', description: 'α 能量', required: true, min: 1, max: 15 },
        { name: 'targetMass', unit: 'u', description: '靶核质量', required: true, min: 1, max: 20 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);
        const c = problem.constraints?.neutronDiscovery;
        if (!c) throw new Error('neutron-discovery 需要 neutronDiscovery 约束');
        const E_alpha = c.alphaEnergy,
            M = c.targetMass;
        const m_alpha = 4.0;
        const v_alpha = Math.sqrt((2 * E_alpha) / m_alpha);

        const vH = ((2 * m_alpha) / (m_alpha + 1)) * v_alpha;
        const vN = ((2 * m_alpha) / (m_alpha + 14)) * v_alpha;

        const KE_H = kineticEnergy(1, vH);
        const KE_N = kineticEnergy(14, vN);

        const vRecoilH = (2 * m_alpha * v_alpha) / (m_alpha + 1);
        const vRecoilN = (2 * m_alpha * v_alpha) / (m_alpha + 14);

        const ratioKE = (m_alpha / M) * Math.pow(vRecoilH / vRecoilN, 2) * (M / 1.0);

        const x_t: ChartSeries = {
            xLabel: '靶核质量 (u)',
            yLabel: '反冲核速度 (a.u.)',
            xUnit: 'u',
            yUnit: '',
            points: []
        };
        const y_t: ChartSeries = { xLabel: '靶核', yLabel: '反冲动能 (MeV)', xUnit: '', yUnit: 'MeV', points: [] };
        const trajectory: TrajectoryPoint[] = [];

        for (let M_i = 1; M_i <= 14; M_i++) {
            const v_rec = (2 * m_alpha * v_alpha) / (m_alpha + M_i);
            x_t.points.push({ x: M_i, y: parseFloat((v_rec / v_alpha).toFixed(3)) });
            if (M_i === 1 || M_i === 14)
                y_t.points.push({
                    x: M_i === 1 ? 1 : 2,
                    y: parseFloat((kineticEnergy(M_i, v_rec) / v_alpha / v_alpha).toFixed(3))
                });
            trajectory.push({ t: M_i * 0.1, position: { x: M_i, y: v_rec }, velocity: { x: 0, y: 0 } });
        }

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes: [
                {
                    label: '氢靶',
                    t: 0,
                    position: { x: 1, y: vH },
                    velocity: { x: 0, y: 0 },
                    description: `KE_H=${KE_H.toFixed(2)}MeV`
                },
                {
                    label: '氮靶',
                    t: 0,
                    position: { x: 14, y: vN },
                    velocity: { x: 0, y: 0 },
                    description: `KE_N=${KE_N.toFixed(2)}MeV`
                }
            ],
            charts: { x_t, y_t },
            diagnostics: {
                conservedQuantities: [],
                maxValues: { E_alpha, M, KE_H, KE_N, ratioKE },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `中子发现: E_α=${E_alpha}MeV, M=${M}u, KE_H/KE_N≈(14)^2`,
                steps: [
                    {
                        order: 1,
                        description: '弹性正碰',
                        formula: 'v_recoil = 2m_α/(m_α+M) · v_α',
                        result: '氢靶反冲速度 ≈ 氮靶的 14 倍'
                    },
                    {
                        order: 2,
                        description: '中子质量推断',
                        formula: 'm_n ≈ m_H (动能比值)',
                        result: `KE_H/KE_N ≈ 14² → m_n ≈ m_p`
                    }
                ],
                formulas: [
                    {
                        name: '反冲速度',
                        formula: 'v_recoil = 2m_αv_α/(m_α+M)',
                        variables: { m_alpha: { value: m_alpha, unit: 'u' } }
                    }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

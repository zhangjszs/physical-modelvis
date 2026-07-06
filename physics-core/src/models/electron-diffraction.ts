import { PhysicsModelBase } from './base.js';
import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, ChartSeries } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';

/**
 * 电子衍射模型 — 选必三 第四章 (德布罗意 λ=h/√(2meU), 多晶衍射环)
 */
export interface ElectronDiffractionConstraint {
    readonly accVoltage: number; // V
    readonly crystalLattice?: number; // d (nm)
    readonly sampleCount?: number;
}

export class ElectronDiffractionModel extends PhysicsModelBase {
    readonly name = '电子衍射';
    readonly version = '1.0.0';
    readonly description = '德布罗意波长 + 多晶衍射环 (验证物质波)';
    readonly modelType = 'electron-diffraction' as const;
    readonly assumptions = ['弹性散射', '薄样品', '远场(Fraunhofer)'];
    readonly applicableRange = 'U: 10-50000 V';
    readonly errorSources = ['相对论效应(>100 kV)', '样品厚度'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'accVoltage', unit: 'V', description: '加速电压', required: true, min: 10, max: 50000 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);
        const c = problem.constraints?.electronDiffraction;
        if (!c) throw new Error('electron-diffraction 需要 electronDiffraction 约束');
        const U = c.accVoltage;
        const d = (c.crystalLattice ?? 0.213) * 1e-9;
        const h = 6.626e-34,
            m = 9.109e-31,
            e = 1.602e-19;
        const lam = h / Math.sqrt(2 * m * e * U);
        const N = c.sampleCount ?? 50;

        const x_t: ChartSeries = {
            xLabel: '加速电压 U (V)',
            yLabel: '波长 λ (nm)',
            xUnit: 'V',
            yUnit: 'nm',
            points: []
        };
        const y_t: ChartSeries = { xLabel: '级次 n', yLabel: '衍射环半径 (cm)', xUnit: '', yUnit: 'cm', points: [] };
        const trajectory: TrajectoryPoint[] = [];

        for (let i = 1; i <= N; i++) {
            const Ui = 10 + (i / N) * (50000 - 10);
            const li = h / Math.sqrt(2 * m * e * Ui);
            x_t.points.push({ x: Ui, y: li * 1e9 });
        }

        for (let n = 1; n <= 4; n++) {
            const sinT = (n * lam) / (2 * d);
            let r = 0.5;
            if (Math.abs(sinT) < 1) {
                const theta = Math.asin(Math.min(1, Math.abs(sinT)));
                r = 50 * Math.tan(2 * theta);
                y_t.points.push({ x: n, y: parseFloat(r.toFixed(3)) });
            }
            trajectory.push({ t: n * 0.1, position: { x: r, y: 0 }, velocity: { x: 0, y: 0 } });
        }

        return {
            meta: {
                model: 'electron-diffraction',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes: [
                {
                    label: '第一衍射环',
                    t: 0,
                    position: { x: 1, y: y_t.points[0]?.y ?? 0.1 },
                    velocity: { x: 0, y: 0 },
                    description: `U=${U}V, λ=${(lam * 1e9).toFixed(3)}nm`
                }
            ],
            charts: { x_t, y_t },
            diagnostics: {
                conservedQuantities: [],
                maxValues: { U, lambdaNm: lam * 1e9, d_nm: d * 1e9 },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary: `电子衍射: U=${U}V, λ=${(lam * 1e9).toFixed(3)}nm, d=${(d * 1e9).toFixed(3)}nm`,
                steps: [
                    {
                        order: 1,
                        description: '德布罗意波长',
                        formula: 'λ = h/√(2meU)',
                        result: `λ = ${(lam * 1e9).toFixed(3)} nm`
                    },
                    {
                        order: 2,
                        description: '布拉格条件',
                        formula: '2d·sinθ = nλ',
                        result: '衍射环位置由布拉格条件决定'
                    }
                ],
                formulas: [
                    {
                        name: '德布罗意',
                        formula: 'λ = h/√(2meU)',
                        variables: { U: { value: U, unit: 'V' }, lambda: { value: lam * 1e9, unit: 'nm' } }
                    }
                ]
            },
            errors: [],
            warnings: []
        };
    }
}

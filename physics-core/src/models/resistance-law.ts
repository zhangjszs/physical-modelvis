import type { PhysicsProblem, ResistanceMaterial } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { RESISTIVITY } from '../types/problem.js';
import { PhysicsModelBase } from './base.js';

/**
 * 电阻定律模型 — 必修三 第十一章
 *
 * R = ρ·L / S
 *   L: 导线长度 (m)
 *   S: 横截面积 = π·(d/2)²  (d 需换算为 m)
 *   ρ: 材料电阻率 (Ω·m)
 *
 * 三因素扫描 (控制变量):
 *   (1) 固定 d, material → R-L 直线, 斜率 = ρ/S
 *   (2) 固定 L, material → R-1/S 直线, 斜率 = ρ·L
 *   (3) 材料比较 → ρ 大→R 大
 */
export class ResistanceLawModel extends PhysicsModelBase {
    readonly name = '电阻定律';
    readonly version = '1.0.0';
    readonly description = 'R=ρ·L/S 控制变量实验: R-L, R-1/S, 材料电阻率比较';
    readonly modelType = 'resistance-law' as const;
    readonly assumptions = [
        '导线横截面积均匀',
        '材料电阻率恒定 (温度不变)',
        '接触电阻忽略不计',
        '趋肤效应在直流下不存在'
    ];
    readonly applicableRange = 'L: 0.01 – 100 m; d: 0.1 – 10 mm';
    readonly errorSources = [
        '温度升高时 ρ 增大 (铜 α ≈ 3.9×10⁻³ /°C)',
        '小直径导线实际直径与标称值有公差',
        '接触电阻在小电阻时不可忽略'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'length', description: '导线长度 (m)', unit: 'm', required: true, min: 0.01, max: 100 },
        { name: 'diameter', description: '导线直径 (mm)', unit: 'mm', required: true, min: 0.1, max: 10 },
        { name: 'material', description: '材料', unit: '', required: true }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const cc = problem.constraints?.resistanceLaw;
        if (!cc) throw new Error('resistance-law 模型需要 resistanceLaw 约束配置');

        const L0 = cc.length;
        const d0Mm = cc.diameter;
        const material0 = cc.material;
        const sampleCount = cc.sampleCount ?? 60;
        const lRange = cc.lengthRange ?? [0.2, 5];
        const dRange = cc.diameterRange ?? [0.5, 5];

        if (L0 <= 0) throw new Error('导线长度必须为正');
        if (d0Mm <= 0) throw new Error('导线直径必须为正');
        if (!(material0 in RESISTIVITY)) throw new Error(`未知材料: ${material0}, 可选: Cu/Fe/Nichrome`);

        const rho = RESISTIVITY[material0];
        const d0 = d0Mm / 1000; // mm → m
        const S0 = Math.PI * (d0 / 2) ** 2;
        const R0 = (rho * L0) / S0;

        // 图表 1: R-L (固定 d, material)
        const R_L: ChartSeries = {
            xLabel: '长度 L (m)',
            yLabel: '电阻 R (Ω)',
            xUnit: 'm',
            yUnit: 'Ω',
            points: []
        };
        const lMin = lRange[0]!;
        const lMax = lRange[1]!;
        for (let i = 0; i <= sampleCount; i++) {
            const L = lMin + (lMax - lMin) * (i / sampleCount);
            const R = (rho * L) / S0;
            R_L.points.push({ x: parseFloat(L.toFixed(4)), y: parseFloat(R.toFixed(6)) });
        }

        // 图表 2: R-1/S (固定 L, material)
        const R_invS: ChartSeries = {
            xLabel: '1/S (m⁻²)',
            yLabel: '电阻 R (Ω)',
            xUnit: 'm⁻²',
            yUnit: 'Ω',
            points: []
        };
        const dMinMm = dRange[0]!;
        const dMaxMm = dRange[1]!;
        for (let i = 0; i <= sampleCount; i++) {
            const dMm = dMinMm + (dMaxMm - dMinMm) * (i / sampleCount);
            const d = dMm / 1000;
            const S = Math.PI * (d / 2) ** 2;
            const R = (rho * L0) / S;
            R_invS.points.push({ x: parseFloat((1 / S).toFixed(2)), y: parseFloat(R.toFixed(6)) });
        }

        // 图表 3: 材料比较 (固定 L0, d0)
        const R_material: ChartSeries = {
            xLabel: '材料',
            yLabel: '电阻 R (Ω)',
            xUnit: '',
            yUnit: 'Ω',
            points: []
        };
        const materials: ResistanceMaterial[] = ['Cu', 'Fe', 'Nichrome'];
        for (const m of materials) {
            const r = RESISTIVITY[m];
            const R = (r * L0) / S0;
            R_material.points.push({ x: materials.indexOf(m) + 1, y: parseFloat(R.toFixed(6)) });
        }

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '基准电阻',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `${material0}: L=${L0}m, d=${d0Mm}mm → R₀=${R0.toExponential(3)}Ω`
            },
            {
                label: 'R-L 斜率',
                t: 1,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `R-L 斜率 = ρ/S = ${(rho / S0).toExponential(3)} Ω/m`
            },
            {
                label: 'R-1/S 斜率',
                t: 2,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `R-1/S 斜率 = ρ·L = ${(rho * L0).toExponential(3)} Ω·m²`
            }
        ];

        const trajectory: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }
        ];

        const warnings: string[] = [];
        if (R0 < 0.001) warnings.push('电阻过小, 接触电阻不可忽略');
        if (R0 > 1e6) warnings.push('电阻过大, 绝缘电阻可能影响测量');

        const materialName: Record<ResistanceMaterial, string> = { Cu: '铜', Fe: '铁', Nichrome: '镍铬合金' };

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '电阻定律',
                formula: 'R = ρ·L / S',
                calculation: `ρ(${materialName[material0]}) = ${rho.toExponential(3)} Ω·m, S = π·(${d0}²/4) = ${S0.toExponential(3)} m²`
            },
            {
                order: 2,
                description: '基准电阻',
                formula: 'R₀ = ρ·L₀/S₀',
                calculation: `R₀ = ${rho.toExponential(3)}×${L0} / ${S0.toExponential(3)} = ${R0.toExponential(3)} Ω`
            },
            {
                order: 3,
                description: 'R-L 直线',
                formula: 'R = (ρ/S) · L',
                calculation: `斜率 = ρ/S = ${(rho / S0).toExponential(3)} Ω/m`
            },
            {
                order: 4,
                description: 'R-1/S 直线',
                formula: 'R = (ρ·L) · (1/S)',
                calculation: `斜率 = ρ·L = ${(rho * L0).toExponential(3)} Ω·m²`
            },
            {
                order: 5,
                description: '材料电阻率比较',
                formula: 'ρ_Cu=1.68e-8 < ρ_Fe=1e-7 < ρ_Nichrome=1.1e-6',
                calculation: `R_Cu=${((RESISTIVITY.Cu * L0) / S0).toExponential(2)}Ω, R_Fe=${((RESISTIVITY.Fe * L0) / S0).toExponential(2)}Ω, R_Nichrome=${((RESISTIVITY.Nichrome * L0) / S0).toExponential(2)}Ω`
            }
        ];

        return {
            meta: {
                model: 'resistance-law',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: {
                x_t: R_L,
                y_t: R_invS,
                vx_t: R_material,
                R_L,
                R_invS,
                R_material
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    length: L0,
                    diameter: d0Mm,
                    material: material0 === 'Cu' ? 1 : material0 === 'Fe' ? 2 : 3,
                    resistivity: rho,
                    crossSection: S0,
                    baseResistance: R0,
                    slope_R_L: rho / S0,
                    slope_R_invS: rho * L0,
                    rCu: (RESISTIVITY.Cu * L0) / S0,
                    rFe: (RESISTIVITY.Fe * L0) / S0,
                    rNichrome: (RESISTIVITY.Nichrome * L0) / S0
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `电阻定律: L=${L0}m, d=${d0Mm}mm, ${materialName[material0]}(ρ=${rho.toExponential(2)}) → R₀=${R0.toExponential(3)}Ω`,
                steps,
                formulas: [
                    {
                        name: '电阻定律',
                        formula: 'R = ρ·L/S',
                        variables: {
                            ρ: { value: rho, unit: 'Ω·m' },
                            L: { value: L0, unit: 'm' },
                            S: { value: S0, unit: 'm²' },
                            R: { value: R0, unit: 'Ω' }
                        }
                    },
                    {
                        name: '横截面积',
                        formula: 'S = πd²/4',
                        variables: { d: { value: d0, unit: 'm' }, S: { value: S0, unit: 'm²' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { PHYSICS_CONSTANTS } from '../units/constants.js';

/**
 * 平行板电容器因素模型 — 必修三 第十一章
 *
 * 电容决定式: C = εr·S / (4π·k·d) = εr·ε₀·S/d
 *   其中 k = 1/(4π·ε₀) = 8.9875517923×10⁹ N·m²/C²
 *        ε₀ = 8.8541878128×10⁻¹² F/m
 *
 * 三个控制变量实验:
 *   (1) 固定 S, εr → C vs 1/d 为直线 (斜率 = εr·ε₀·S)
 *   (2) 固定 d, εr → C vs S 为直线 (斜率 = εr·ε₀/d)
 *   (3) 固定 S, d → C vs εr 为直线 (斜率 = ε₀·S/d)
 *
 * 介电常数参考: 空气≈1, 纸≈3.5, 云母≈5.4, 陶瓷≈4~100, 聚乙烯≈2.3
 */
export class ParallelPlateCapacitorModel extends PhysicsModelBase {
    readonly name = '平行板电容器因素';
    readonly version = '1.0.0';
    readonly description = 'C=εr·S/(4πkd) 控制变量实验: C-1/d, C-S, C-εr 三条直线';
    readonly modelType = 'parallel-plate-capacitor' as const;
    readonly assumptions = [
        '平行板为理想无限大均匀带电板 (忽略边缘效应)',
        '介质均匀且各向同性',
        '真空介电常数 ε₀ 恒定',
        '温度恒定 (εr 不随温度变化)'
    ];
    readonly applicableRange = 'S: 10⁻⁴ – 1 m²; d: 10⁻⁵ – 10⁻² m; εr: 1 – 1000';
    readonly errorSources = ['边缘效应导致实际电容略大于理论值', '大极板间距时介质击穿', 'εr 随频率和温度变化'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'area', description: '极板面积 (m²)', unit: 'm²', required: true, min: 1e-4, max: 1 },
        { name: 'distance', description: '极板距离 (m)', unit: 'm', required: true, min: 1e-5, max: 1e-2 },
        { name: 'epsilonR', description: '相对介电常数 εr', unit: '', required: true, min: 1, max: 1000 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const cc = problem.constraints?.parallelPlate;
        if (!cc) throw new Error('parallel-plate-capacitor 模型需要 parallelPlate 约束配置');

        const S0 = cc.area;
        const d0 = cc.distance;
        const er0 = cc.epsilonR;
        const sampleCount = cc.sampleCount ?? 60;
        const epsRange = cc.epsilonRange ?? [1, 10];
        const dRange = cc.distanceRange ?? [1e-4, 8e-4];
        const sRange = cc.areaRange ?? [1e-3, 5e-2];

        if (S0 <= 0) throw new Error('极板面积必须为正');
        if (d0 <= 0) throw new Error('极板距离必须为正');
        if (er0 <= 0) throw new Error('相对介电常数必须为正');

        const eps0 = PHYSICS_CONSTANTS.epsilon0.value;
        const k = PHYSICS_CONSTANTS.k.value;

        // 基准电容 (使用输入参数)
        const C0 = (er0 * S0) / (4 * Math.PI * k * d0);

        // 图表 1: C vs 1/d (固定 S=S0, εr=er0)
        const C_inv_d: ChartSeries = {
            xLabel: '1/d (m⁻¹)',
            yLabel: '电容 C (F)',
            xUnit: 'm⁻¹',
            yUnit: 'F',
            points: []
        };
        const dMin = dRange[0]!;
        const dMax = dRange[1]!;
        for (let i = 0; i <= sampleCount; i++) {
            const d = dMin + (dMax - dMin) * (i / sampleCount);
            const C = (er0 * S0) / (4 * Math.PI * k * d);
            C_inv_d.points.push({ x: parseFloat((1 / d).toFixed(2)), y: parseFloat(C.toExponential(6)) });
        }

        // 图表 2: C vs S (固定 d=d0, εr=er0)
        const C_S: ChartSeries = {
            xLabel: '面积 S (m²)',
            yLabel: '电容 C (F)',
            xUnit: 'm²',
            yUnit: 'F',
            points: []
        };
        const sMin = sRange[0]!;
        const sMax = sRange[1]!;
        for (let i = 0; i <= sampleCount; i++) {
            const S = sMin + (sMax - sMin) * (i / sampleCount);
            const C = (er0 * S) / (4 * Math.PI * k * d0);
            C_S.points.push({ x: parseFloat(S.toFixed(5)), y: parseFloat(C.toExponential(6)) });
        }

        // 图表 3: C vs εr (固定 S=S0, d=d0)
        const C_epsilonR: ChartSeries = {
            xLabel: '相对介电常数 εr',
            yLabel: '电容 C (F)',
            xUnit: '',
            yUnit: 'F',
            points: []
        };
        const epsMin = epsRange[0]!;
        const epsMax = epsRange[1]!;
        for (let i = 0; i <= sampleCount; i++) {
            const er = epsMin + (epsMax - epsMin) * (i / sampleCount);
            const C = (er * S0) / (4 * Math.PI * k * d0);
            C_epsilonR.points.push({ x: parseFloat(er.toFixed(3)), y: parseFloat(C.toExponential(6)) });
        }

        // 关键帧 (基准点 + 三个维度的极值)
        const keyframes: Keyframe[] = [
            {
                label: '基准电容',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `S=${S0}m², d=${d0}m, εr=${er0} → C₀=${C0.toExponential(3)}F`
            },
            {
                label: 'C-1/d 斜率',
                t: 1,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `C-1/d 直线斜率 = εr·ε₀·S = ${(er0 * eps0 * S0).toExponential(3)} F·m`
            },
            {
                label: 'C-S 斜率',
                t: 2,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `C-S 直线斜率 = εr·ε₀/d = ${((er0 * eps0) / d0).toExponential(3)} F/m`
            },
            {
                label: 'C-εr 斜率',
                t: 3,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `C-εr 直线斜率 = ε₀·S/d = ${((eps0 * S0) / d0).toExponential(3)} F`
            }
        ];

        const trajectory: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }
        ];

        const warnings: string[] = [];
        if (d0 < 1e-4) warnings.push('极板距离过小, 介质可能击穿');
        if (d0 / Math.sqrt(S0) > 10) warnings.push('d/√S 较大, 边缘效应不可忽略');
        if (er0 > 100) warnings.push('高介电常数材料实际 εr 随电场强度变化');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '电容决定式',
                formula: 'C = εr·S / (4π·k·d) = εr·ε₀·S/d',
                calculation: `C₀ = ${er0}×${S0} / (4π×${k.toExponential(3)}×${d0}) = ${C0.toExponential(3)} F`
            },
            {
                order: 2,
                description: '控制变量 — 改变 d',
                formula: 'C = (εr·ε₀·S) · (1/d)  → C ∝ 1/d',
                calculation: `斜率 = εr·ε₀·S = ${(er0 * eps0 * S0).toExponential(3)} F·m`
            },
            {
                order: 3,
                description: '控制变量 — 改变 S',
                formula: 'C = (εr·ε₀/d) · S  → C ∝ S',
                calculation: `斜率 = εr·ε₀/d = ${((er0 * eps0) / d0).toExponential(3)} F/m`
            },
            {
                order: 4,
                description: '控制变量 — 改变 εr',
                formula: 'C = (ε₀·S/d) · εr  → C ∝ εr',
                calculation: `斜率 = ε₀·S/d = ${((eps0 * S0) / d0).toExponential(3)} F`
            }
        ];

        return {
            meta: {
                model: 'parallel-plate-capacitor',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: {
                x_t: C_inv_d,
                y_t: C_S,
                vx_t: C_epsilonR,
                C_inv_d,
                C_S,
                C_epsilonR
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    area: S0,
                    distance: d0,
                    epsilonR: er0,
                    baseCapacitance: C0,
                    slope_C_inv_d: er0 * eps0 * S0,
                    slope_C_S: (er0 * eps0) / d0,
                    slope_C_epsilonR: (eps0 * S0) / d0,
                    epsilon0: eps0,
                    kCoulomb: k
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `平行板电容: S=${S0}m², d=${d0}m, εr=${er0} → C₀=${C0.toExponential(3)}F`,
                steps,
                formulas: [
                    {
                        name: '电容决定式',
                        formula: 'C = εr·S/(4πkd)',
                        variables: {
                            εr: { value: er0, unit: '' },
                            S: { value: S0, unit: 'm²' },
                            d: { value: d0, unit: 'm' },
                            C: { value: C0, unit: 'F' }
                        }
                    },
                    {
                        name: '真空介电常数',
                        formula: 'ε₀ = 1/(4πk)',
                        variables: { epsilon0: { value: eps0, unit: 'F/m' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

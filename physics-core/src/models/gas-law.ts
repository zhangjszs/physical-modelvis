import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 理想气体状态方程模型 — 气体实验定律 (选必三 第二章)
 *
 * 状态方程: pV = nRT   (R = 8.314 J/(mol·K))
 *
 * 三种等值过程：
 *   等温 (T 恒定):  pV = const            → p-V 图: 等轴双曲线
 *   等压 (p 恒定):  V/T = const (盖-吕萨克定律)
 *   等容 (V 恒定):  p/T = const (查理定律)
 *
 * 本模型为静态分析解：给定 n, 过程模式, 初始状态, 计算过程曲线和终态
 */

const R = 8.314; // J/(mol·K)

export class GasLawModel extends PhysicsModelBase {
    readonly name = '理想气体状态方程';
    readonly version = '1.0.0';
    readonly description = 'pV=nRT、等温/等压/等容 p-V-T 过程曲线';
    readonly modelType = 'gas-law' as const;
    readonly assumptions = [
        '理想气体假设 (分子间无相互作用, 分子体积忽略)',
        '准静态过程 (始终处于平衡态)',
        '气体质量恒定 (n 不变)'
    ];
    readonly applicableRange = '常温常压下的近似；极高压/极低温实际气体有偏差';
    readonly errorSources = ['实际气体在高压下 pV≠nRT (范德瓦耳斯修正)', '非准静态过程 (快速压缩) 偏离平衡'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'moles', description: '物质的量 n (mol)', unit: 'mol', required: true, min: 0.01, max: 100 },
        { name: 'mode', description: '过程模式 (0=等温 1=等压 2=等容)', unit: '', required: true }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const gc = problem.constraints?.gasLaw;
        if (!gc) throw new Error('gas-law 模型需要 gasLaw 约束配置');

        const n = gc.moles;
        const mode = gc.mode;
        const p0 = gc.initialPressure ?? 1.013e5; // Pa
        const V0 = gc.initialVolume ?? (n * R * 273.15) / p0; // m³ (从 p0V0=nRT0 反推 V0)
        const T0 = gc.initialTemperature ?? (p0 * V0) / (n * R); // K

        // 终态偏移 (模拟过程后的状态：体积减半或加倍, 具体取决于模式)
        const factor = 0.5; // 体积变化因子
        let pFinal: number, VFinal: number, TFinal: number;
        let processCurve: ChartSeries;

        if (mode === 'isothermal') {
            // 等温: T 恒定, pV = const
            VFinal = V0 * factor;
            pFinal = (p0 * V0) / VFinal;
            TFinal = T0;
            // p-V 曲线: p = nRT0/V
            processCurve = {
                xLabel: '体积 V (L)',
                yLabel: '压强 p (kPa)',
                xUnit: 'L',
                yUnit: 'kPa',
                points: this.generateIsoCurve(V0 * 0.3, V0 * 2, 100, V => (n * R * T0) / V / 1e3)
            };
        } else if (mode === 'isobaric') {
            // 等压: p 恒定, V/T = const
            pFinal = p0;
            VFinal = V0 * factor;
            TFinal = T0 * factor;
            // p-V 曲线: p = const
            processCurve = {
                xLabel: '体积 V (L)',
                yLabel: '压强 p (kPa)',
                xUnit: 'L',
                yUnit: 'kPa',
                points: this.generateIsoCurve(V0 * 0.3, V0 * 2, 100, () => p0 / 1e3)
            };
        } else {
            // 等容: V 恒定, p/T = const
            VFinal = V0;
            TFinal = T0 * factor;
            pFinal = p0 * factor;
            // p-T 曲线 (等容过程用 p-T 坐标更直观).
            // 注意: x 轴是温度 (K), 不可复用 generateIsoCurve — 它内置了 m³→L 的 ×1e3 缩放,
            // 套用会把温度放大 1000 倍 (273 K → 273000 K). 此处内联采样, 温度不缩放.
            const tMin = T0 * 0.3;
            const tMax = T0 * 2;
            const N = 100;
            const isoPoints: Array<{ x: number; y: number }> = [];
            for (let i = 0; i <= N; i++) {
                const T = tMin + ((tMax - tMin) * i) / N;
                const p = (n * R * T) / V0 / 1e3;
                isoPoints.push({ x: parseFloat(T.toFixed(3)), y: parseFloat(p.toFixed(3)) });
            }
            processCurve = {
                xLabel: '温度 T (K)',
                yLabel: '压强 p (kPa)',
                xUnit: 'K',
                yUnit: 'kPa',
                points: isoPoints
            };
        }

        // 关键帧
        const keyframes: Keyframe[] = [
            {
                label: '初态',
                t: 0,
                position: { x: V0 * 1e3, y: p0 / 1e3 },
                velocity: { x: 0, y: 0 },
                description: `p₀=${(p0 / 1e3).toFixed(1)}kPa, V₀=${(V0 * 1e3).toFixed(2)}L, T₀=${T0.toFixed(1)}K, n=${n}mol`
            },
            {
                label: '终态',
                t: 0,
                position: { x: VFinal * 1e3, y: pFinal / 1e3 },
                velocity: { x: 0, y: 0 },
                description: `p=${(pFinal / 1e3).toFixed(1)}kPa, V=${(VFinal * 1e3).toFixed(2)}L, T=${TFinal.toFixed(1)}K`
            }
        ];

        // 构造示意轨迹 (两个关键帧点)
        const trajectory: TrajectoryPoint[] = [
            {
                t: 0,
                position: { x: V0 * 1e3, y: p0 / 1e3 },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            },
            {
                t: 0,
                position: { x: VFinal * 1e3, y: pFinal / 1e3 },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            }
        ];

        const modeNameZh = mode === 'isothermal' ? '等温过程' : mode === 'isobaric' ? '等压过程' : '等容过程';
        const warnings: string[] = [];
        if (p0 > 500e3) warnings.push('高压下实际气体偏离理想气体定律');
        if (T0 < 200) warnings.push('低温下分子间作用力不可忽略');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '理想气体状态方程',
                formula: 'pV = nRT',
                calculation: `${(p0 / 1e3).toFixed(1)}kPa × ${(V0 * 1e3).toFixed(2)}L = ${n} × 8.314 × ${T0.toFixed(1)}K`
            },
            {
                order: 2,
                description:
                    mode === 'isothermal'
                        ? '玻意耳定律: pV=const (等温)'
                        : mode === 'isobaric'
                          ? '盖-吕萨克定律: V/T=const (等压)'
                          : '查理定律: p/T=const (等容)',
                formula:
                    mode === 'isothermal' ? 'p₁V₁ = p₂V₂' : mode === 'isobaric' ? 'V₁/T₁ = V₂/T₂' : 'p₁/T₁ = p₂/T₂',
                calculation:
                    mode === 'isothermal'
                        ? `${(p0 / 1e3).toFixed(1)} × ${(V0 * 1e3).toFixed(2)} = ${(pFinal / 1e3).toFixed(1)} × ${(VFinal * 1e3).toFixed(2)}`
                        : mode === 'isobaric'
                          ? `${(V0 * 1e3).toFixed(2)}/${T0.toFixed(1)} = ${(VFinal * 1e3).toFixed(2)}/${TFinal.toFixed(1)}`
                          : `${(p0 / 1e3).toFixed(1)}/${T0.toFixed(1)} = ${(pFinal / 1e3).toFixed(1)}/${TFinal.toFixed(1)}`
            },
            {
                order: 3,
                description: '过程曲线',
                formula:
                    mode === 'isothermal'
                        ? 'p = nRT₀/V (等轴双曲线)'
                        : mode === 'isobaric'
                          ? 'p = const (水平线)'
                          : 'p = nRT/V₀ (过原点直线)',
                result: `${modeNameZh} p-V 曲线`
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t: processCurve },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    R,
                    moles: n,
                    initialPressurePa: p0,
                    initialVolumeM3: V0,
                    initialTemperatureK: T0,
                    finalPressurePa: pFinal,
                    finalVolumeM3: VFinal,
                    finalTemperatureK: TFinal,
                    modeCode: mode === 'isothermal' ? 0 : mode === 'isobaric' ? 1 : 2
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `${modeNameZh}: p₀=${(p0 / 1e3).toFixed(1)}kPa → ${(pFinal / 1e3).toFixed(1)}kPa, V₀=${(V0 * 1e3).toFixed(2)}L → ${(VFinal * 1e3).toFixed(2)}L, T₀=${T0.toFixed(1)}K → ${TFinal.toFixed(1)}K, n=${n}mol`,
                steps,
                formulas: [
                    {
                        name: '理想气体状态方程',
                        formula: 'pV=nRT',
                        variables: {
                            p: { value: p0, unit: 'Pa' },
                            V: { value: V0, unit: 'm³' },
                            n: { value: n, unit: 'mol' },
                            T: { value: T0, unit: 'K' },
                            R: { value: R, unit: 'J/(mol·K)' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }

    /** 生成曲线采样 */
    private generateIsoCurve(
        xMin: number,
        xMax: number,
        N: number,
        fn: (x: number) => number
    ): Array<{ x: number; y: number }> {
        const points: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= N; i++) {
            const x = xMin + ((xMax - xMin) * i) / N;
            const y = fn(x);
            points.push({ x: parseFloat((x * 1e3).toFixed(3)), y: parseFloat(y.toFixed(3)) });
        }
        return points;
    }
}

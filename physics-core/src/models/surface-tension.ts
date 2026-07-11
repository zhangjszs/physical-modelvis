import type { PhysicsProblem , SurfaceTensionConstraint} from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 表面张力约束 — 选必三 液体表面性质
 *
 * F_sigma = 2 * sigma * L (两个表面)
 * sigma(T) = sigma_0 - beta * (T - T_0)
 */
/**
 * 表面张力模型 — 选必三 液体表面性质
 *
 * 物理原理：
 *   表面张力: F_sigma = 2 * sigma * L (液膜有两个表面)
 *   温度依赖: sigma(T) = sigma_0 - beta * (T - T_0) (线性降低)
 *   水: sigma_0 ≈ 0.072 N/m (20°C), beta ≈ 1.5e-4 N/(m·K)
 *   水银: sigma_0 ≈ 0.487 N/m (20°C), beta ≈ 2.0e-4 N/(m·K)
 */
export class SurfaceTensionModel extends PhysicsModelBase {
    readonly name = '表面张力';
    readonly version = '1.0.0';
    readonly description = 'F_sigma = 2·sigma·L, sigma 随温度线性降低';
    readonly modelType = 'surface-tension' as const;
    readonly assumptions = ['液膜为理想薄膜 (两个表面)', '滑块长度恒定', '温度均匀分布', '忽略重力对液膜的影响'];
    readonly applicableRange = '水 (sigma ~0.05–0.08 N/m), 水银 (sigma ~0.4–0.5 N/m)';
    readonly errorSources = [
        '液体纯度影响表面张力',
        '温度梯度导致 Marangoni 对流',
        '滑块表面粗糙度',
        '拉膜速度影响动态表面张力'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'liquidMode', description: '液体类型 (water/mercury)', unit: '', required: true },
        { name: 'sliderLength', description: '滑块长度 L (m)', unit: 'm', required: true, min: 0.001, max: 1 },
        { name: 'temperature', description: '温度 T (°C)', unit: '°C', required: true, min: 0, max: 100 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const sc = problem.constraints?.surfaceTension;
        if (!sc) throw new Error('surface-tension 模型需要 surfaceTension 约束配置');

        const liquidMode = sc.liquidMode;
        const L = sc.sliderLength;
        const T = sc.temperature;

        // 表面张力参数
        const sigma0 = liquidMode === 'water' ? 0.072 : 0.487; // N/m at 20°C
        const beta = liquidMode === 'water' ? 1.5e-4 : 2.0e-4; // N/(m·K)
        const T0 = 20; // °C

        // 当前温度下的表面张力
        const sigma = Math.max(0, sigma0 - beta * (T - T0));
        // 表面张力 (两个表面)
        const Fsigma = 2 * sigma * L;

        // 力 vs 滑块长度 (扫描)
        const forceCurve: ChartSeries = {
            xLabel: '滑块长度 L (cm)',
            yLabel: '表面张力 F_sigma (mN)',
            xUnit: 'cm',
            yUnit: 'mN',
            points: []
        };
        const nScan = 50;
        for (let i = 0; i <= nScan; i++) {
            const lScan = 0.001 + ((0.1 - 0.001) * i) / nScan; // 0.1 mm to 10 cm
            const fScan = 2 * sigma * lScan;
            forceCurve.points.push({
                x: parseFloat((lScan * 100).toFixed(3)),
                y: parseFloat((fScan * 1000).toFixed(4))
            });
        }

        // 表面张力 vs 温度 (扫描)
        const sigmaCurve: ChartSeries = {
            xLabel: '温度 T (°C)',
            yLabel: '表面张力系数 sigma (N/m)',
            xUnit: '°C',
            yUnit: 'N/m',
            points: []
        };
        const nT = 50;
        for (let i = 0; i <= nT; i++) {
            const tScan = 0 + (100 * i) / nT;
            const sScan = Math.max(0, sigma0 - beta * (tScan - T0));
            sigmaCurve.points.push({
                x: parseFloat(tScan.toFixed(2)),
                y: parseFloat(sScan.toFixed(5))
            });
        }

        // 静态轨迹 (单帧)
        const trajectory: TrajectoryPoint[] = [
            {
                t: 0,
                position: { x: L * 100, y: Fsigma * 1000 },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            }
        ];

        const keyframes: Keyframe[] = [
            {
                label: '参考温度',
                t: 0,
                position: { x: 20, y: sigma0 },
                velocity: { x: 0, y: 0 },
                description: `T₀=20°C: sigma₀=${sigma0} N/m (${liquidMode === 'water' ? '水' : '水银'})`
            },
            {
                label: '当前状态',
                t: 0,
                position: { x: T, y: sigma },
                velocity: { x: 0, y: 0 },
                description: `T=${T}°C: sigma=${sigma.toFixed(4)} N/m, F_sigma=${(Fsigma * 1000).toFixed(3)} mN (L=${(L * 100).toFixed(2)}cm)`
            }
        ];

        const warnings: string[] = [];
        if (T > 90) warnings.push('接近沸点, 表面张力急剧下降');
        if (L > 0.05) warnings.push('滑块较长, 液膜重力影响不可忽略');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '表面张力系数',
                formula: 'sigma(T) = sigma_0 - beta·(T - T_0)',
                calculation: `sigma = ${sigma0} - ${beta}×(${T}-20) = ${sigma.toFixed(4)} N/m`
            },
            {
                order: 2,
                description: '表面张力 (两个表面)',
                formula: 'F_sigma = 2·sigma·L',
                calculation: `F_sigma = 2×${sigma.toFixed(4)}×${L} = ${(Fsigma * 1000).toFixed(4)} mN`
            },
            {
                order: 3,
                description: '物理意义',
                formula: 'F_sigma = 2·sigma·L',
                result: '液膜有两个表面 (内表面和外表面), 每个表面贡献 sigma·L'
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t: forceCurve, y_t: sigmaCurve },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    liquidModeCode: liquidMode === 'water' ? 1 : 2,
                    sliderLength: L,
                    temperature: T,
                    sigma0,
                    beta,
                    sigma,
                    Fsigma
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `表面张力: ${liquidMode === 'water' ? '水' : '水银'}, T=${T}°C, sigma=${sigma.toFixed(4)}N/m, L=${(L * 100).toFixed(2)}cm, F_sigma=${(Fsigma * 1000).toFixed(3)}mN`,
                steps,
                formulas: [
                    {
                        name: '温度依赖',
                        formula: 'sigma(T)=sigma_0-beta(T-T_0)',
                        variables: {
                            sigma_0: { value: sigma0, unit: 'N/m' },
                            beta: { value: beta, unit: 'N/(m·K)' },
                            T: { value: T, unit: '°C' }
                        }
                    },
                    {
                        name: '表面张力',
                        formula: 'F_sigma=2·sigma·L',
                        variables: { sigma: { value: sigma, unit: 'N/m' }, L: { value: L, unit: 'm' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

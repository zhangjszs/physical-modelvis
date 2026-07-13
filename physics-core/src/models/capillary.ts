import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 毛细现象约束 — 选必三 液体表面性质
 *
 * h = 2·sigma·cos(theta) / (rho·g·r)
 * 水+玻璃: theta ≈ 0° (浸润, h > 0)
 * 水+石蜡: theta ≈ 105° (不浸润, h < 0, 下降)
 * 水银+玻璃: theta ≈ 140° (不浸润, h < 0)
 */
/**
 * 毛细现象模型 — 选必三 液体表面性质
 *
 * 物理原理：
 *   毛细上升高度: h = 2·sigma·cos(theta) / (rho·g·r)
 *   浸润 (theta < 90°): h > 0, 液面上升
 *   不浸润 (theta > 90°): h < 0, 液面下降
 *   水+玻璃: theta ≈ 0°, cos(theta) ≈ 1
 *   水+石蜡: theta ≈ 105°, cos(theta) ≈ -0.26
 *   水银+玻璃: theta ≈ 140°, cos(theta) ≈ -0.77
 */
export class CapillaryModel extends PhysicsModelBase {
    readonly name = '毛细现象';
    readonly version = '1.0.0';
    readonly description = '毛细上升 h=2σcosθ/(ρgr), 浸润/不浸润';
    readonly modelType = 'capillary' as const;
    readonly assumptions = ['毛细管为理想圆柱形', '接触角恒定 (与管径无关)', '液体密度恒定', '忽略毛细管末端效应'];
    readonly applicableRange = '毛细管半径 0.01–1 mm, 常见液体';
    readonly errorSources = [
        '实际接触角与管壁粗糙度有关',
        '温度影响表面张力和密度',
        '毛细管非理想圆柱形',
        '液体纯度影响接触角'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'tubeRadius', description: '毛细管半径 r (m)', unit: 'm', required: true, min: 1e-5, max: 1e-2 },
        { name: 'liquidMode', description: '液体类型 (water/mercury)', unit: '', required: true },
        { name: 'materialMode', description: '管壁材料 (glass/paraffin)', unit: '', required: true }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const cc = problem.constraints?.capillary;
        if (!cc) throw new Error('capillary 模型需要 capillary 约束配置');

        const r = cc.tubeRadius;
        const liquidMode = cc.liquidMode;
        const materialMode = cc.materialMode;

        const g = 9.8;

        // 液体参数
        const rho = liquidMode === 'water' ? 1000 : 13534; // kg/m³
        const sigma = liquidMode === 'water' ? 0.072 : 0.487; // N/m

        // 接触角 (度)
        let thetaDeg: number;
        if (liquidMode === 'water') {
            thetaDeg = materialMode === 'glass' ? 0 : 105;
        } else {
            thetaDeg = materialMode === 'glass' ? 140 : 150;
        }
        const theta = (thetaDeg * Math.PI) / 180;
        const cosTheta = Math.cos(theta);

        // 毛细上升高度
        const h = (2 * sigma * cosTheta) / (rho * g * r); // m
        const hMm = h * 1000; // mm

        // h vs 1/r 曲线 (线性)
        const hCurve: ChartSeries = {
            xLabel: '1/r (1/mm)',
            yLabel: '毛细高度 h (mm)',
            xUnit: '1/mm',
            yUnit: 'mm',
            points: []
        };
        const nScan = 50;
        for (let i = 1; i <= nScan; i++) {
            const rScan = 0.01e-3 + ((1e-3 - 0.01e-3) * i) / nScan; // 0.01 mm to 1 mm
            const hScan = (2 * sigma * cosTheta) / (rho * g * rScan);
            hCurve.points.push({
                x: parseFloat((1 / rScan / 1000).toFixed(3)),
                y: parseFloat((hScan * 1000).toFixed(4))
            });
        }

        // 弯月面形状 (y vs x 截面)
        // 简化: 球形弯月面, y = h * (1 - x²/(2·R²)), R = r/cos(theta)
        const meniscusCurve: ChartSeries = {
            xLabel: '水平位置 x (mm)',
            yLabel: '液面高度 y (mm)',
            xUnit: 'mm',
            yUnit: 'mm',
            points: []
        };
        const nMeniscus = 50;
        const R = r / Math.abs(cosTheta); // 弯月面曲率半径
        for (let i = 0; i <= nMeniscus; i++) {
            const x = -r + (2 * r * i) / nMeniscus;
            // 球形弯月面: y = h - (R - sqrt(R² - x²)) (上升) 或 y = -(R - sqrt(R² - x²)) (下降)
            const insideRoot = R * R - x * x;
            const y =
                insideRoot > 0
                    ? cosTheta > 0
                        ? h - (R - Math.sqrt(insideRoot))
                        : -(R - Math.sqrt(insideRoot))
                    : cosTheta > 0
                      ? h
                      : 0;
            meniscusCurve.points.push({
                x: parseFloat((x * 1000).toFixed(4)),
                y: parseFloat((y * 1000).toFixed(4))
            });
        }

        // 静态轨迹 (单帧)
        const trajectory: TrajectoryPoint[] = [
            {
                t: 0,
                position: { x: r * 1000, y: hMm },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            }
        ];

        const wettingLabel = cosTheta > 0 ? '浸润 (上升)' : cosTheta < 0 ? '不浸润 (下降)' : '中性';
        const keyframes: Keyframe[] = [
            {
                label: '接触角',
                t: 0,
                position: { x: 0, y: thetaDeg },
                velocity: { x: 0, y: 0 },
                description: `theta=${thetaDeg}°, cos(theta)=${cosTheta.toFixed(3)} (${wettingLabel})`
            },
            {
                label: '毛细高度',
                t: 0,
                position: { x: r * 1000, y: hMm },
                velocity: { x: 0, y: 0 },
                description: `r=${(r * 1000).toFixed(3)}mm, h=${hMm.toFixed(3)}mm (${cosTheta > 0 ? '上升' : '下降'})`
            }
        ];

        const warnings: string[] = [];
        if (r > 5e-3) warnings.push('管径较大, 毛细效应不明显');
        if (r < 5e-5) warnings.push('管径过小, 可能堵塞');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '接触角',
                formula: 'theta (由液体和管壁材料决定)',
                calculation: `${liquidMode === 'water' ? '水' : '水银'} + ${materialMode === 'glass' ? '玻璃' : '石蜡'}: theta=${thetaDeg}°, cos(theta)=${cosTheta.toFixed(3)}`
            },
            {
                order: 2,
                description: '毛细上升高度',
                formula: 'h = 2·sigma·cos(theta) / (rho·g·r)',
                calculation: `h = 2×${sigma}×${cosTheta.toFixed(3)} / (${rho}×${g}×${r.toExponential(2)}) = ${hMm.toFixed(4)} mm`
            },
            {
                order: 3,
                description: '浸润性判断',
                formula: 'cos(theta) > 0: 浸润 (上升); cos(theta) < 0: 不浸润 (下降)',
                result: wettingLabel
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { x_t: hCurve, y_t: meniscusCurve },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    tubeRadius: r,
                    liquidModeCode: liquidMode === 'water' ? 1 : 2,
                    materialModeCode: materialMode === 'glass' ? 1 : 2,
                    density: rho,
                    sigma,
                    thetaDeg,
                    cosTheta,
                    h,
                    hMm,
                    R
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `毛细现象: ${liquidMode === 'water' ? '水' : '水银'}+${materialMode === 'glass' ? '玻璃' : '石蜡'}, r=${(r * 1000).toFixed(3)}mm, theta=${thetaDeg}°, h=${hMm.toFixed(3)}mm`,
                steps,
                formulas: [
                    {
                        name: '毛细高度',
                        formula: 'h=2σcosθ/(ρgr)',
                        variables: {
                            sigma: { value: sigma, unit: 'N/m' },
                            cosTheta: { value: cosTheta, unit: '' },
                            rho: { value: rho, unit: 'kg/m³' },
                            g: { value: g, unit: 'm/s²' },
                            r: { value: r, unit: 'm' }
                        }
                    },
                    {
                        name: '接触角',
                        formula: 'theta (材料决定)',
                        variables: { theta: { value: thetaDeg, unit: '°' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 单缝衍射模型 — 选必一 第四章 (单缝衍射)
 *
 * 光通过单缝后远场衍射图样 (Fraunhofer):
 *   I(theta) = I_0 * (sin(alpha) / alpha)^2
 *   alpha = pi * a * sin(theta) / lambda
 *   其中 a = 缝宽, lambda = 波长, theta = 衍射角
 *
 * 关键特征:
 *   中央主极大宽度: sin(theta_min) = +-lambda / a (第 1 极小值)
 *   次级明纹位置: sin(theta) = +- (m + 1/2) * lambda / a (m = 1, 2, ...)
 *   条纹间距 (近似等间距): Delta_theta ~ lambda / a
 */
export class SingleSlitModel extends PhysicsModelBase {
    readonly name = '单缝衍射';
    readonly version = '1.0.0';
    readonly description = '单缝远场衍射图样: 中央主极大宽度 2*lambda/a';
    readonly modelType = 'single-slit' as const;
    readonly assumptions = [
        '远场条件 (缝到屏距离 >> 缝宽)',
        '垂直入射, 单色光',
        '缝长远大于缝宽 (二维问题)',
        '无限窄的平行光照明'
    ];
    readonly applicableRange = 'slitWidth: 0.01--1 mm; wavelength: 380--780 nm; screenDist: 0.1--10 m';
    readonly errorSources = ['近场时菲涅耳衍射公式不同', '缝边不是理想刀口 (有厚度)', '光源非完全单色'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'slitWidth', description: '缝宽 a (mm)', unit: 'mm', required: true, min: 0.005, max: 2 },
        { name: 'wavelength', description: '光波长 (nm)', unit: 'nm', required: true, min: 380, max: 780 },
        { name: 'screenDist', description: '缝到屏距离 L (m)', unit: 'm', required: true, min: 0.1, max: 20 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.singleSlit;
        if (!c) throw new Error('single-slit 模型需要 singleSlit 约束配置');

        const aMm = c.slitWidth;
        const a = aMm * 1e-3; // m
        const lambda = c.wavelength * 1e-9; // m
        const L = c.screenDist;

        // 中央主极大半宽度 (第 1 极小值位置)
        const sinTheta1 = lambda / a;
        const theta1 = Math.asin(Math.min(1, Math.abs(sinTheta1)));
        const x1 = L * Math.tan(theta1); // 第 1 极小位置 (m)

        // 衍射图样 I(theta) = (sin(alpha)/alpha)^2
        const N = 400;
        const thetaMax = 5 * theta1;
        const intensityCurve: ChartSeries = {
            xLabel: '衍射角 theta (度)',
            yLabel: '相对光强 I/I0',
            xUnit: 'deg',
            yUnit: '',
            points: []
        };

        let maxI = 0;
        const secondaryPeaks: Array<{ theta: number; intensity: number }> = [];
        const minimaPositions: number[] = [];

        for (let i = 0; i <= N; i++) {
            const theta = -thetaMax + (2 * thetaMax * i) / N;
            const alpha = (Math.PI * a * Math.sin(theta)) / lambda;
            let I: number;
            if (Math.abs(alpha) < 1e-12) {
                I = 1;
            } else {
                const s = Math.sin(alpha) / alpha;
                I = s * s;
            }
            intensityCurve.points.push({
                x: parseFloat(((theta * 180) / Math.PI).toFixed(5)),
                y: parseFloat(I.toFixed(6))
            });

            if (I > maxI) {
                maxI = I;
            }
            // 检测次峰
            if (i > 1) {
                const prev = intensityCurve.points[i - 1]!.y;
                const prev2 = intensityCurve.points[i - 2]!.y;
                if (prev > prev2 && prev > I && prev > 0.01 && prev < 0.99) {
                    secondaryPeaks.push({ theta: intensityCurve.points[i - 1]!.x, intensity: prev });
                }
                if (prev < prev2 && prev < I && prev < 0.05) {
                    minimaPositions.push(intensityCurve.points[i - 1]!.x);
                }
            }
        }

        // 扫描不同缝宽时的中央主极大宽度
        const slitScan: ChartSeries = {
            xLabel: '缝宽 a (mm)',
            yLabel: '中央主极大半宽 x1 (mm)',
            xUnit: 'mm',
            yUnit: 'mm',
            points: []
        };
        for (let ai = 0.01; ai <= 1.0; ai += 0.02) {
            const aiM = ai * 1e-3;
            const sinT = lambda / aiM;
            if (sinT >= 1) {
                slitScan.points.push({ x: parseFloat(ai.toFixed(3)), y: 999 });
            } else {
                const x1i = L * Math.tan(Math.asin(sinT)) * 1000; // mm
                slitScan.points.push({ x: parseFloat(ai.toFixed(3)), y: parseFloat(x1i.toFixed(3)) });
            }
        }

        const trajectory: TrajectoryPoint[] = [];
        trajectory.push({
            t: 0,
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            kineticEnergy: 0,
            potentialEnergy: 0
        });

        const keyframes: Keyframe[] = [
            {
                label: '中央主极大',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `theta=0, I/I0=1, 全亮`
            },
            {
                label: '第 1 极小',
                t: 0,
                position: { x: x1 * 1000, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `sin(theta)=lambda/a=${sinTheta1.toFixed(4)}, x1=${(x1 * 1000).toFixed(3)}mm`
            },
            {
                label: '第 1 次极大',
                t: 0,
                position: {
                    x: secondaryPeaks.length > 0 ? secondaryPeaks[0]!.theta : 0,
                    y: secondaryPeaks.length > 0 ? secondaryPeaks[0]!.intensity : 0
                },
                velocity: { x: 0, y: 0 },
                description: `I/I0=${secondaryPeaks.length > 0 ? (secondaryPeaks[0]!.intensity * 100).toFixed(2) : 0}%`
            }
        ];

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '衍射强度公式',
                formula: 'I(theta) = I_0 * (sin(alpha)/alpha)^2, alpha = pi*a*sin(theta)/lambda',
                result: '中央主极大 + 两侧次级明纹'
            },
            {
                order: 2,
                description: '第 1 极小位置',
                formula: 'sin(theta_1) = +-lambda / a',
                calculation: `theta_1 = arcsin(${lambda.toExponential(2)}/${a.toExponential(2)}) = ${((theta1 * 180) / Math.PI).toFixed(3)} deg`
            },
            {
                order: 3,
                description: '中央主极大宽度 (近轴)',
                formula: 'Delta_x = 2 * lambda * L / a',
                calculation: `Delta_x = 2 * ${c.wavelength}nm * ${L}m / ${aMm}mm = ${(2 * x1 * 1000).toFixed(3)} mm`
            },
            {
                order: 4,
                description: '次级明纹相对强度',
                result:
                    secondaryPeaks.length >= 1
                        ? `1st: ${(secondaryPeaks[0]!.intensity * 100).toFixed(2)}%`
                        : 'none visible'
            }
        ];

        const warnings: string[] = [];
        if (aMm > lambda * 1e6) warnings.push('缝宽过大, 衍射现象不明显');
        if (L < 1) warnings.push('屏幕距离过小, 远场条件不充分');

        return {
            meta: {
                model: 'single-slit',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: {
                intensity_angle: intensityCurve,
                width_scan: slitScan
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    aMm,
                    lambdaNm: c.wavelength,
                    L,
                    sinTheta1,
                    theta1Deg: parseFloat(((theta1 * 180) / Math.PI).toFixed(3)),
                    x1mm: parseFloat((x1 * 1000).toFixed(3)),
                    centralWidthMm: parseFloat((2 * x1 * 1000).toFixed(3)),
                    secondaryPeakCount: secondaryPeaks.length
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `单缝衍射: a=${aMm}mm, lambda=${c.wavelength}nm, L=${L}m; 半宽=${(x1 * 1000).toFixed(3)}mm, 中央宽度=${(2 * x1 * 1000).toFixed(3)}mm, ${secondaryPeaks.length}个次级明纹`,
                steps,
                formulas: [
                    {
                        name: '强度公式',
                        formula: 'I = I_0*(sin(alpha)/alpha)^2, alpha=pi*a*sin(theta)/lambda',
                        variables: { a: { value: aMm, unit: 'mm' }, lambda: { value: c.wavelength, unit: 'nm' } }
                    },
                    {
                        name: '极小位置',
                        formula: 'sin(theta_m) = +-m*lambda/a',
                        variables: { theta_1: { value: (theta1 * 180) / Math.PI, unit: 'deg' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

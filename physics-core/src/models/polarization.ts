import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 偏振光模型 — 选必一 第四章 (光的偏振)
 *
 * 马吕斯定律: 线偏振光通过偏振片后
 *   I = I_0 * cos^2(theta)
 *   其中 theta = 入射偏振方向与偏振片透振方向夹角
 *
 * 多偏振片系统:
 *   第 i 个偏振片后: I_i = I_{i-1} * cos^2(theta_i - theta_{i-1})
 *
 * 起偏: 自然光通过偏振片后 I = I_0 / 2 (强度减半)
 * 检偏: 旋转偏振片, 观察透射光强变化
 */
export class PolarizationModel extends PhysicsModelBase {
    readonly name = '偏振光';
    readonly version = '1.0.0';
    readonly description = '马吕斯定律: I = I_0*cos^2(theta); 起偏/检偏';
    readonly modelType = 'polarization' as const;
    readonly assumptions = [
        '偏振片理想 (完全线偏振化)',
        '入射光为线偏振光或自然光',
        '偏振片无吸收损耗 (除马吕斯定律)',
        '光垂直于偏振片表面入射'
    ];
    readonly applicableRange = 'initialIntensity: 0--1; polarizerAngles: 0--360 deg';
    readonly errorSources = ['实际偏振片有吸收 (约 5--20%)', '偏振片消光比有限 (10^-3 ~ 10^-5)', '大角度时反射损失'];
    readonly requiredParameters: ParameterSpec[] = [
        {
            name: 'initialIntensity',
            description: '入射光强 I_0 (相对值 0-1)',
            unit: '',
            required: true,
            min: 0,
            max: 1
        },
        { name: 'nPolarizers', description: '偏振片数量', unit: '', required: true, min: 1, max: 5 },
        {
            name: 'polarizerAngles',
            description: '各偏振片透振方向角度数组 (度), 长度=nPolarizers',
            unit: 'deg',
            required: true
        },
        {
            name: 'incidentAngle',
            description: '入射光偏振方向 (度, 仅 nPolarizers>=1 时有效)',
            unit: 'deg',
            required: false,
            min: 0,
            max: 360
        }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.polarization;
        if (!c) throw new Error('polarization 模型需要 polarization 约束配置');

        const I0 = c.initialIntensity;
        const n = c.nPolarizers;
        const angles: number[] = c.polarizerAngles;
        const incidentAngle = ((c.incidentAngle ?? 0) * Math.PI) / 180;

        if (!Array.isArray(angles) || angles.length < n) {
            throw new Error(`polarizerAngles 数组长度应 >= nPolarizers=${n}`);
        }

        // 计算每片后的光强
        const intensities: number[] = [];
        const anglesRad = angles.map(a => (a * Math.PI) / 180);
        let I = I0;
        let prevAngle = incidentAngle;

        for (let i = 0; i < n; i++) {
            const theta = anglesRad[i]! - prevAngle;
            I = I * Math.pow(Math.cos(theta), 2);
            intensities.push(I);
            prevAngle = anglesRad[i]!;
        }

        const Ifinal = I;
        const transmission = I0 > 0 ? Ifinal / I0 : 0;

        // 马吕斯曲线: I vs theta (单偏振片旋转)
        const malusCurve: ChartSeries = {
            xLabel: '偏振片角度 (度)',
            yLabel: '透射光强 I/I0',
            xUnit: 'deg',
            yUnit: '',
            points: []
        };
        for (let deg = 0; deg <= 360; deg++) {
            const theta = (deg * Math.PI) / 180;
            const Ii = Math.pow(Math.cos(theta - incidentAngle), 2);
            malusCurve.points.push({ x: deg, y: parseFloat(Ii.toFixed(4)) });
        }

        // 极坐标图 (I vs theta)
        const polarCurve: ChartSeries = {
            xLabel: '角度 (度)',
            yLabel: '透射光强 (极径)',
            xUnit: 'deg',
            yUnit: '',
            points: malusCurve.points.map(p => ({ x: p.x, y: p.y }))
        };

        // 多偏振片扫描: 固定第 1 片, 旋转第 2 片
        const multiScan: ChartSeries = {
            xLabel: '第 2 片角度 (度)',
            yLabel: '透射光强',
            xUnit: 'deg',
            yUnit: '',
            points: []
        };
        if (n >= 2) {
            const a0 = anglesRad[0]!;
            for (let deg = 0; deg <= 360; deg++) {
                const a1 = (deg * Math.PI) / 180;
                const I1 = I0 * Math.pow(Math.cos(a0 - incidentAngle), 2);
                const I2 = I1 * Math.pow(Math.cos(a1 - a0), 2);
                multiScan.points.push({ x: deg, y: parseFloat(I2.toFixed(4)) });
            }
        }

        const trajectory: TrajectoryPoint[] = [];
        for (let i = 0; i <= 50; i++) {
            const t = (i / 50) * 10;
            trajectory.push({
                t,
                position: { x: 0, y: i },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            });
        }

        const keyframes: Keyframe[] = [
            {
                label: '入射光',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `I_0=${I0}, 偏振方向=${c.incidentAngle ?? 0}deg`
            },
            {
                label: '第 1 片后',
                t: 0,
                position: { x: 1, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `角度=${angles[0]}deg, I_1=${intensities.length > 0 ? intensities[0]!.toFixed(4) : I0}`
            },
            {
                label: '最终出射',
                t: 0,
                position: { x: n, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `I_final=${Ifinal.toFixed(4)}, 透射率=${(transmission * 100).toFixed(2)}%`
            }
        ];

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '马吕斯定律',
                formula: 'I = I_0 * cos^2(theta)',
                result: '线偏振光通过偏振片后强度按 cos^2 衰减'
            },
            {
                order: 2,
                description: '多偏振片系统',
                formula: 'I_i = I_{i-1} * cos^2(theta_i - theta_{i-1})',
                result: `n=${n} 片, 最终 I=${Ifinal.toFixed(4)}`
            },
            {
                order: 3,
                description: '透射率',
                formula: 'T = I_final / I_0',
                calculation: `T = ${Ifinal.toFixed(4)} / ${I0} = ${(transmission * 100).toFixed(2)}%`
            }
        ];

        const warnings: string[] = [];
        if (transmission < 0.01) warnings.push('透射率极低, 接近消光');
        if (n > 3) warnings.push('偏振片数量较多, 累积吸收损失大');

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                malus_curve: malusCurve,
                polar_curve: polarCurve,
                multi_scan: multiScan
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    I0,
                    Ifinal,
                    transmission,
                    nPolarizers: n,
                    maxIntensity: Math.max(...intensities, I0),
                    minIntensity: Math.min(...intensities, I0)
                },
                flags: {
                    isExtinct: transmission < 0.01,
                    isFull: transmission > 0.99
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `偏振: I0=${I0}, n=${n}片, 角度=[${angles.join(', ')}]deg; I_final=${Ifinal.toFixed(4)}, T=${(transmission * 100).toFixed(2)}%`,
                steps,
                formulas: [
                    {
                        name: '马吕斯定律',
                        formula: 'I = I_0*cos^2(theta)',
                        variables: { I0: { value: I0, unit: '' }, I: { value: Ifinal, unit: '' } }
                    },
                    {
                        name: '多片系统',
                        formula: 'I_n = I_0 * prod(cos^2(delta_theta_i))',
                        variables: { n: { value: n, unit: '' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

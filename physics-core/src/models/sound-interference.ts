import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 操场声音干涉模型 — 选必一 第三章 (声音的干涉)
 *
 * 两个相干声源 S1 和 S2 相距 d, 发出同频同相波.
 * 观察点 P 到 S1 和 S2 的距离分别为 r1, r2.
 * 波程差 delta_r = r2 - r1 决定:
 *   - delta_r = k*lambda (k=0, +-1,...) => 加强 (相长干涉)
 *   - delta_r = (k + 1/2)*lambda => 减弱 (相消干涉)
 * 叠加振幅: A = 2*A0 * |cos(pi * delta_r / lambda)|
 * 声强: I = 4 * I0 * cos^2(pi * delta_r / lambda)
 *
 * 演示操场两扬声器同频播放时, 走走听听听到的声音强弱变化.
 */
export class SoundInterferenceModel extends PhysicsModelBase {
    readonly name = '声音干涉';
    readonly version = '1.0.0';
    readonly description = '两相干声源的干涉: 波程差决定加强/减弱';
    readonly modelType = 'sound-interference' as const;
    readonly assumptions = [
        '两声源同频同相 (相干波源)',
        '声波振幅不随距离衰减',
        '空气均匀, 无风',
        '远场近似 (距离 >> d)'
    ];
    readonly applicableRange = 'frequency: 100--5000 Hz; speakerDist: 1--20 m';
    readonly errorSources = ['实际声源并非理想点声源', '声波振幅随距离衰减', '反射/衍射效应'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'frequency', description: '声波频率 (Hz)', unit: 'Hz', required: true, min: 50, max: 10000 },
        { name: 'speakerDist', description: '两扬声器距离 d (m)', unit: 'm', required: true, min: 0.5, max: 30 },
        { name: 'soundSpeed', description: '声速 v (m/s)', unit: 'm/s', required: true, min: 300, max: 400 },
        { name: 'observationX', description: '观察点 x 坐标 (m, 沿两扬声器连线方向)', unit: 'm', required: false },
        { name: 'observationY', description: '观察点 y 坐标 (m, 垂直于连线方向)', unit: 'm', required: false },
        { name: 'amplitude', description: '单个声源振幅 A0', unit: '', required: true, min: 0.1, max: 1 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.soundInterference;
        if (!c) throw new Error('sound-interference 模型需要 soundInterference 约束配置');

        const f = c.frequency;
        const d = c.speakerDist;
        const v = c.soundSpeed;
        const lambda = v / f;
        const A0 = c.amplitude;
        const obsX = c.observationX ?? d;
        const obsY = c.observationY ?? 10;

        // 声源坐标
        const s1x = -d / 2;
        const s2x = d / 2;

        // 观察点信息
        const r1 = Math.sqrt((obsX - s1x) ** 2 + obsY ** 2);
        const r2 = Math.sqrt((obsX - s2x) ** 2 + obsY ** 2);
        const deltaR = r2 - r1;
        const phaseDiff = (2 * Math.PI * deltaR) / lambda;
        const I_obs = 4 * A0 * A0 * Math.pow(Math.cos(phaseDiff / 2), 2);
        const Imax = 4 * A0 * A0;
        const I_ratio = I_obs / Imax;
        const isConstructive = Math.abs(Math.cos(phaseDiff / 2)) > 0.9;
        const isDestructive = Math.abs(Math.cos(phaseDiff / 2)) < 0.1;

        // 沿 y=const 直线扫描声强分布
        const scanLine: ChartSeries = {
            xLabel: '观察点 x 坐标 (m)',
            yLabel: '相对声强 I/Imax',
            xUnit: 'm',
            yUnit: '',
            points: []
        };

        const xMin = -30;
        const xMax = 30;
        const N = 400;
        for (let i = 0; i <= N; i++) {
            const xi = xMin + ((xMax - xMin) * i) / N;
            const ri1 = Math.sqrt((xi - s1x) ** 2 + obsY ** 2);
            const ri2 = Math.sqrt((xi - s2x) ** 2 + obsY ** 2);
            const dr = ri2 - ri1;
            const phi = (2 * Math.PI * dr) / lambda;
            const Ii = 4 * A0 * A0 * Math.pow(Math.cos(phi / 2), 2);
            scanLine.points.push({
                x: parseFloat(xi.toFixed(3)),
                y: parseFloat((Ii / Imax).toFixed(4))
            });
        }

        // 垂直于平分线的直线 (沿 y 方向)
        const perpendicularScan: ChartSeries = {
            xLabel: '观察点 y 坐标 (m)',
            yLabel: '相对声强 I/Imax',
            xUnit: 'm',
            yUnit: '',
            points: []
        };
        const yMax = 30;
        for (let i = 0; i <= N; i++) {
            const yi = 0.5 + ((yMax - 0.5) * i) / N;
            const ri1 = Math.sqrt(s1x ** 2 + yi ** 2);
            const ri2 = Math.sqrt(s2x ** 2 + yi ** 2);
            const dr = ri2 - ri1;
            const phi = (2 * Math.PI * dr) / lambda;
            const Ii = 4 * A0 * A0 * Math.pow(Math.cos(phi / 2), 2);
            perpendicularScan.points.push({
                x: parseFloat(yi.toFixed(3)),
                y: parseFloat((Ii / Imax).toFixed(4))
            });
        }

        const trajectory: TrajectoryPoint[] = [];
        for (let i = 0; i <= 50; i++) {
            const t = (i / 50) * 10;
            trajectory.push({
                t,
                position: { x: obsX, y: obsY },
                velocity: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            });
        }

        const keyframes: Keyframe[] = [
            {
                label: '声源 S1',
                t: 0,
                position: { x: s1x, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `S1 at x=${s1x}m, f=${f}Hz, lambda=${lambda.toFixed(3)}m`
            },
            {
                label: '声源 S2',
                t: 0,
                position: { x: s2x, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `S2 at x=${s2x}m, d=${d}m`
            },
            {
                label: '观察点 P',
                t: 0,
                position: { x: obsX, y: obsY },
                velocity: { x: 0, y: 0 },
                description: `P(${obsX},${obsY}): delta_r=${deltaR.toFixed(3)}m, I/Imax=${I_ratio.toFixed(3)}, ${isConstructive ? '加强' : isDestructive ? '减弱' : '介于两者之间'}`
            }
        ];

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '波长',
                formula: 'lambda = v / f',
                calculation: `lambda = ${v}/${f} = ${lambda.toFixed(4)}m`
            },
            {
                order: 2,
                description: '波程差',
                formula: 'delta_r = r2 - r1',
                calculation: `delta_r = ${r2.toFixed(3)} - ${r1.toFixed(3)} = ${deltaR.toFixed(4)}m`
            },
            {
                order: 3,
                description: '干涉条件',
                formula: 'delta_r = k*lambda 加强; delta_r = (k+1/2)*lambda 减弱',
                result: isConstructive ? '加强 (相长干涉)' : isDestructive ? '减弱 (相消干涉)' : '介于两者之间'
            },
            {
                order: 4,
                description: '声强比',
                formula: 'I/Imax = cos^2(pi*delta_r/lambda)',
                calculation: `I/Imax = ${I_ratio.toFixed(4)}`
            }
        ];

        const warnings: string[] = [];
        if (lambda > d * 2) warnings.push('波长大于两源间距, 干涉条纹间距大');
        if (obsY < d) warnings.push('观察点距离过近, 远场近似不成立');

        return {
            meta: {
                model: 'sound-interference',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: {
                scan_line: scanLine,
                perpendicular_scan: perpendicularScan
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    lambda,
                    d,
                    f,
                    v,
                    deltaR,
                    I_obs,
                    Imax,
                    I_ratio,
                    r1,
                    r2
                },
                flags: {
                    isConstructive,
                    isDestructive
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `声音干涉: f=${f}Hz, lambda=${lambda.toFixed(3)}m, d=${d}m; delta_r=${deltaR.toFixed(3)}m, I/Imax=${I_ratio.toFixed(3)}, ${isConstructive ? '加强' : isDestructive ? '减弱' : '介于两者之间'}`,
                steps,
                formulas: [
                    {
                        name: '波长',
                        formula: 'lambda = v/f',
                        variables: {
                            v: { value: v, unit: 'm/s' },
                            f: { value: f, unit: 'Hz' },
                            lambda: { value: lambda, unit: 'm' }
                        }
                    },
                    {
                        name: '干涉强度',
                        formula: 'I = 4*I0*cos^2(pi*delta_r/lambda)',
                        variables: { I_ratio: { value: I_ratio, unit: '' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

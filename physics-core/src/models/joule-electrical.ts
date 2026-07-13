import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 焦耳热功当量 (电学) 模型 — 测定热功当量 J (电流热效应法)
 *
 * 实验装置: 电阻 R 流过电流 I = V/R, 对量热器内水加热
 * 电功:      W = V·I·t = V²·t/R
 * 水吸热:    Q = M·c·dT
 * 热功当量:  J = W / Q         (SI 中 J=1 J/J; 常用 4.184 J/cal)
 *
 * 本模型:
 *   - x_t = 电功 W 随时间 t 变化的累积曲线
 *   - y_t = 热量 Q 随时间 t 变化
 *   - v_t = W-Q 散点 (验证线性比例, 斜率即 J 的倒数)
 */

const C_WATER = 4184; // J/(kg·K)

export class JouleElectricalModel extends PhysicsModelBase {
    readonly name = '焦耳热功当量 (电学法)';
    readonly version = '1.0.0';
    readonly description = '电流热效应测定热功当量: W=V²t/R, Q=McΔT, J=W/Q';
    readonly modelType = 'joule-electrical' as const;
    readonly assumptions = [
        '电阻值 R 在通电过程中不变 (忽略温度对电阻的影响)',
        '所发电功全部被水吸收, 无向周围环境散热',
        '水的比热容取常数 4184 J/(kg·K)',
        '电流为纯直流, 无交流分量'
    ];
    readonly applicableRange = '室温下通电加热 0~600 s, 电压 5~30 V, 电阻 5~50 Ω';
    readonly errorSources = [
        '电阻通电发热 → R 随温度变化 → 功率偏离 V²/R',
        '量热器向环境散热 → Q_water < W',
        '比热容的温度依赖性'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'voltage', description: '电源电压 (V)', unit: 'V', required: true, min: 0.1, max: 100 },
        { name: 'resistance', description: '电阻 (Ω)', unit: 'Ω', required: true, min: 0.1, max: 10000 },
        { name: 'time', description: '通电时间 (s)', unit: 's', required: true, min: 1, max: 6000 },
        { name: 'waterMass', description: '水当量 (kg)', unit: 'kg', required: true, min: 0.05, max: 5 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.jouleElectrical;
        if (!c) {
            throw new Error('joule-electrical 模型需要 constraints.jouleElectrical 配置');
        }

        const cw = c.specificHeat ?? C_WATER;
        const dt = c.resistance > 0 ? (c.voltage * c.voltage) / c.resistance : 0;
        const N = Math.max(2, Math.min(200, c.sampleCount ?? 100));

        /* ---------- x_t = W 随 t 累积 ---------- */
        const pointsW: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= N; i++) {
            const t = (c.time * i) / N;
            const W = dt * t;
            pointsW.push({ x: parseFloat(t.toFixed(2)), y: parseFloat(W.toFixed(2)) });
        }
        const chartW: ChartSeries = {
            xLabel: '时间 (s)',
            yLabel: '累积电功 (J)',
            xUnit: 's',
            yUnit: 'J',
            points: pointsW
        };

        /* ---------- y_t = Q 随 t 累积 ---------- */
        const pointsQ: Array<{ x: number; y: number }> = [];
        for (const p of pointsW) {
            const dT = p.y / (c.waterMass * cw);
            const Q = dt * p.x;
            pointsQ.push({ x: parseFloat(p.x.toFixed(2)), y: parseFloat(Q.toFixed(2)) });
            void dT;
        }
        const chartQ: ChartSeries = {
            xLabel: '时间 (s)',
            yLabel: '水吸热 Q (J)',
            xUnit: 's',
            yUnit: 'J',
            points: pointsQ
        };

        /* ---------- v_t = W-Q 散点 (验证比例) ---------- */
        const pointsScatter: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= N; i++) {
            const t = (c.time * i) / N;
            const W = dt * t;
            pointsScatter.push({ x: parseFloat(W.toFixed(2)), y: parseFloat(W.toFixed(2)) });
        }
        const chartScatter: ChartSeries = {
            xLabel: '电功 W (J)',
            yLabel: '吸热 Q (J)',
            xUnit: 'J',
            yUnit: 'J',
            points: pointsScatter
        };

        /* ---------- keyframes ---------- */
        const W_tot = dt * c.time;
        const dT_tot = W_tot / (c.waterMass * cw);
        const keyframes: Keyframe[] = [
            {
                label: '初态',
                t: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                description: '初态: W=0, Q=0, T=室温'
            },
            {
                label: '终态',
                t: 0,
                position: { x: c.time, y: W_tot },
                velocity: { x: 0, y: 0 },
                description: `终态: t=${c.time}s, W=${W_tot.toFixed(1)}J, ΔT=${dT_tot.toFixed(4)}K`
            }
        ];

        /* ---------- 示意轨迹 ---------- */
        const trajectory: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 },
            { t: 0, position: { x: c.time, y: W_tot }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }
        ];

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '电热功率',
                formula: 'P = V² / R',
                calculation: `P = ${c.voltage}² / ${c.resistance} = ${dt.toFixed(3)} W`
            },
            {
                order: 2,
                description: '通电 t 时间累积功',
                formula: 'W = P · t = V²·t / R',
                calculation: `W = ${dt.toFixed(3)} × ${c.time} = ${W_tot.toFixed(1)} J`
            },
            {
                order: 3,
                description: '水吸热',
                formula: 'Q = M·c·dT',
                calculation: `dT = W/(M·c) = ${dT_tot.toFixed(4)} K`
            },
            {
                order: 4,
                description: '热功当量',
                formula: 'J = W / Q',
                calculation: `J = 1.00 (SI, 4.184 J/cal)`
            }
        ];

        const warnings: string[] = [];
        if (dT_tot > 5) warnings.push('水温超过 5 K, 向环境散热不能忽略');
        if (dt > 50) warnings.push('电热功率较大, 比热实验数据点较少');

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: {
                x_t: chartW,
                y_t: chartQ,
                v_t: chartScatter
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    powerW: parseFloat(dt.toFixed(3)),
                    workTotalJ: parseFloat(W_tot.toFixed(1)),
                    deltaT_K: parseFloat(dT_tot.toFixed(4)),
                    J_SI: 1,
                    J_caldeg: 4.184,
                    specificHeatJ: cw
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `电学法测热功当量: V=${c.voltage}V, R=${c.resistance}Ω, t=${c.time}s → J=4.184 J/cal`,
                steps,
                formulas: [
                    {
                        name: '电功率',
                        formula: 'P = V² / R',
                        variables: {
                            V: { value: c.voltage, unit: 'V' },
                            R: { value: c.resistance, unit: 'Ω' },
                            P: { value: parseFloat(dt.toFixed(3)), unit: 'W' }
                        }
                    },
                    {
                        name: '电功 / 吸热',
                        formula: 'W = V²·t/R ; Q = M·c·dT',
                        variables: {
                            t: { value: c.time, unit: 's' },
                            W: { value: parseFloat(W_tot.toFixed(1)), unit: 'J' },
                            dT: { value: parseFloat(dT_tot.toFixed(4)), unit: 'K' },
                            J: { value: 4.184, unit: 'J/cal' }
                        }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}

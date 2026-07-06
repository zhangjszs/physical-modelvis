import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 受迫振动模型 — 选必一 第二章 (受迫振动的振动频率)
 *
 * 弹簧振子在周期驱动力作用下达到稳态:
 *   - 稳态频率 = 驱动频率 (与固有频率无关)
 *   - 振幅由驱动频率与固有频率之比和阻尼决定
 *   - 稳态解: x(t) = A * cos(omega_d * t + phi)
 *     A = F0/m / sqrt((omega_0^2 - omega_d^2)^2 + (2*beta*omega_d)^2)
 *     tan(phi) = 2*beta*omega_d / (omega_0^2 - omega_d^2)
 *
 * 其中 omega_0 = sqrt(k/m) 为固有频率, omega_d 为驱动频率,
 *       beta = c/(2*m) 为阻尼系数, F0 为驱动力幅值.
 *
 * 这里使用 velocity Verlet 数值积分, 从静止开始加载驱动力,
 * 前数个周期振幅从小到大趋于稳态.
 */
export class ForcedVibrationModel extends PhysicsModelBase {
    readonly name = '受迫振动';
    readonly version = '1.0.0';
    readonly description = '周期驱动力下的振动: 稳态频率 = 驱动频率';
    readonly modelType = 'forced-vibration' as const;
    readonly assumptions = [
        '弹簧振子为线性系统 (胡克定律成立)',
        '阻尼力正比于速度 (粘滞阻尼)',
        '驱动力为谐变力 F0*cos(omega_d*t)',
        '水平放置, 不考虑重力影响'
    ];
    readonly applicableRange = 'naturalFreq: 0.1--10 Hz; drivingFreq: 0.1--15 Hz; dampingBeta: 0--2';
    readonly errorSources = ['实际阻尼非线性 (库仑阻尼等)', '弹簧质量不可忽略', '大振幅时胡克定律偏离线性'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'mass', description: '振子质量 (kg)', unit: 'kg', required: true, min: 0.01, max: 10 },
        {
            name: 'springConstant',
            description: '弹簧劲度系数 k (N/m)',
            unit: 'N/m',
            required: true,
            min: 0.1,
            max: 1000
        },
        {
            name: 'dampingBeta',
            description: '阻尼系数 beta = c/(2m) (1/s)',
            unit: '1/s',
            required: true,
            min: 0,
            max: 5
        },
        { name: 'forceAmplitude', description: '驱动力幅值 F0 (N)', unit: 'N', required: true, min: 0.01, max: 100 },
        { name: 'drivingFreq', description: '驱动频率 (Hz)', unit: 'Hz', required: true, min: 0.1, max: 20 },
        { name: 'duration', description: '模拟时长 (s)', unit: 's', required: true, min: 0.1, max: 60 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.forcedVibration;
        if (!c) throw new Error('forced-vibration 模型需要 forcedVibration 约束配置');

        const m = c.mass;
        const k = c.springConstant;
        const beta = c.dampingBeta;
        const F0 = c.forceAmplitude;
        const fDrive = c.drivingFreq;
        const omegaD = 2 * Math.PI * fDrive;
        const omega0 = Math.sqrt(k / m);
        const f0 = omega0 / (2 * Math.PI);

        const duration = problem.timeConfig.duration;
        const sampleCount = problem.timeConfig.sampleCount ?? 2000;
        const dt = duration / sampleCount;

        // 数值积分 (velocity Verlet)
        let x = problem.bodies[0]?.position?.x ?? 0;
        let v = problem.bodies[0]?.velocity?.x ?? 0;
        const trajectory: TrajectoryPoint[] = [];

        const alpha = (pos: number, vel: number, t: number): number => {
            const restoring = -k * pos;
            const damping = -2 * beta * m * vel;
            const driving = F0 * Math.cos(omegaD * t);
            return (restoring + damping + driving) / m;
        };

        let a = alpha(x, v, 0);
        let maxAbsX = Math.abs(x);

        for (let i = 0; i <= sampleCount; i++) {
            const t = i * dt;
            trajectory.push({
                t,
                position: { x, y: 0 },
                velocity: { x: v, y: 0 },
                acceleration: { x: a, y: 0 },
                kineticEnergy: 0.5 * m * v * v,
                potentialEnergy: 0.5 * k * x * x
            });
            maxAbsX = Math.max(maxAbsX, Math.abs(x));

            if (i < sampleCount) {
                x += v * dt + 0.5 * a * dt * dt;
                const aNew = alpha(x, v, t + dt);
                v += 0.5 * (a + aNew) * dt;
                a = aNew;
            }
        }

        // 理论稳态振幅
        const denom = Math.sqrt((omega0 * omega0 - omegaD * omegaD) ** 2 + (2 * beta * omegaD) ** 2);
        const A_theoretical = denom > 1e-12 ? F0 / m / denom : 0;

        // 共振曲线 (A vs f_drive, 当前阻尼)
        const resonanceCurve: ChartSeries = {
            xLabel: '驱动频率 (Hz)',
            yLabel: '稳态振幅 (m)',
            xUnit: 'Hz',
            yUnit: 'm',
            points: []
        };
        const fMin = Math.max(0.1, f0 * 0.2);
        const fMax = f0 * 2.5;
        const N = 100;
        for (let i = 0; i <= N; i++) {
            const fi = fMin + ((fMax - fMin) * i) / N;
            const omegaI = 2 * Math.PI * fi;
            const denI = Math.sqrt((omega0 * omega0 - omegaI * omegaI) ** 2 + (2 * beta * omegaI) ** 2);
            const Ai = denI > 1e-12 ? F0 / m / denI : 0;
            resonanceCurve.points.push({ x: parseFloat(fi.toFixed(3)), y: parseFloat(Ai.toFixed(6)) });
        }

        // 位移-时间图 (稳态阶段最后 2 个驱动周期)
        const Tdrive = 1 / fDrive;
        const steadyStart = Math.max(0, duration - 2 * Tdrive);
        const steadyPoints = trajectory.filter(p => p.t >= steadyStart);

        const x_t: ChartSeries = {
            xLabel: '时间 (s)',
            yLabel: '位移 x (m)',
            xUnit: 's',
            yUnit: 'm',
            points: steadyPoints.map(p => ({ x: parseFloat(p.t.toFixed(4)), y: parseFloat(p.position.x.toFixed(6)) }))
        };

        const keyframes: Keyframe[] = [
            {
                label: '初始时刻',
                t: 0,
                position: { x: trajectory[0]!.position.x, y: 0 },
                velocity: { x: trajectory[0]!.velocity.x, y: 0 },
                description: `初始位移=${trajectory[0]!.position.x.toFixed(4)}m, f_drive=${fDrive}Hz, f_0=${f0.toFixed(3)}Hz`
            },
            {
                label: '稳态开始 (约)',
                t: steadyStart,
                position: { x: steadyPoints[0]?.position.x ?? 0, y: 0 },
                velocity: { x: steadyPoints[0]?.velocity.x ?? 0, y: 0 },
                description: `趋于稳态, 振幅 -> ${A_theoretical.toFixed(4)}m, 频率 = 驱动频率=${fDrive}Hz`
            },
            {
                label: '模拟终点',
                t: duration,
                position: { x: trajectory[trajectory.length - 1]!.position.x, y: 0 },
                velocity: { x: 0, y: 0 },
                description: `实测最大振幅~${maxAbsX.toFixed(4)}m, 理论稳态振幅=${A_theoretical.toFixed(4)}m`
            }
        ];

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '固有频率',
                formula: 'omega_0 = sqrt(k/m), f_0 = omega_0 / (2*pi)',
                calculation: `f_0 = sqrt(${k.toFixed(2)}/${m.toFixed(3)}) / (2*pi) = ${f0.toFixed(4)}Hz`
            },
            {
                order: 2,
                description: '驱动频率',
                formula: 'f_drive = 给定值',
                result: `f_drive = ${fDrive} Hz`
            },
            {
                order: 3,
                description: '稳态振幅公式',
                formula: 'A = (F0/m) / sqrt((omega_0^2 - omega_d^2)^2 + (2*beta*omega_d)^2)',
                calculation: `A = ${A_theoretical.toFixed(4)}m`
            },
            {
                order: 4,
                description: '结论',
                formula: '稳态频率 = 驱动频率',
                result: `稳态频率 = ${fDrive} Hz (不等于 ${f0.toFixed(3)} Hz). 当 f_drive close f_0 时共振`
            }
        ];

        const warnings: string[] = [];
        if (A_theoretical > 1) warnings.push('振幅过大, 可能超出胡克定律范围');
        if (Math.abs(fDrive - f0) / f0 < 0.05) warnings.push('驱动频率接近固有频率, 发生共振');

        return {
            meta: {
                model: 'forced-vibration',
                solver: 'numerical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: {
                x_t,
                A_f_drive: resonanceCurve
            },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    amplitudeTheoretical: A_theoretical,
                    amplitudeMeasured: maxAbsX,
                    f0,
                    fDrive,
                    omega0,
                    omegaD,
                    beta
                },
                flags: {
                    isNearResonance: Math.abs(fDrive - f0) / f0 < 0.1
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `受迫振动: f_0=${f0.toFixed(3)}Hz, f_d=${fDrive}Hz, beta=${beta}/s; 稳态振幅理论=${A_theoretical.toFixed(4)}m, 实测~${maxAbsX.toFixed(4)}m; 稳态频率 = 驱动频率`,
                steps,
                formulas: [
                    {
                        name: '固有频率',
                        formula: 'omega_0 = sqrt(k/m)',
                        variables: { k: { value: k, unit: 'N/m' }, m: { value: m, unit: 'kg' } }
                    },
                    {
                        name: '稳态振幅',
                        formula: 'A = (F0/m) / sqrt((omega_0^2 - omega_d^2)^2 + (2*beta*omega_d)^2)',
                        variables: { F0: { value: F0, unit: 'N' }, A: { value: A_theoretical, unit: 'm' } }
                    }
                ]
            },
            errors: [],
            warnings
        };
    }
}
